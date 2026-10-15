import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';
import {DiaryStore,ConflictError} from './store.mjs';
import {makeAuth} from './auth.mjs';
import {Translator} from './translator.mjs';
import {LANGS} from '../public/core.mjs';
const publicDir=fileURLToPath(new URL('../public/',import.meta.url));
const FILES={'/':['index.html','text/html; charset=utf-8'],'/index.html':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/core.mjs':['core.mjs','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8']};
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
async function body(req){
  if(!(req.headers['content-type']||'').startsWith('application/json'))throw Object.assign(new Error('Se requiere JSON.'),{status:415});
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>20*1024*1024)throw Object.assign(new Error('El contenido supera 20 MB.'),{status:413});chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(new Error('JSON inválido.'),{status:400});}
}
export async function createApp({directory,credentials,origin,translator=new Translator()}){
  const expected=new URL(origin);if(expected.origin!==origin)throw new Error('APP_ORIGIN must be an origin without path or trailing slash.');
  if(expected.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(expected.hostname))throw new Error('Use HTTPS for remote access.');
  const store=new DiaryStore(directory);await store.init();const auth=makeAuth(credentials);
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
    try{
      const url=new URL(req.url,'http://internal');
      if(url.pathname==='/healthz'&&req.method==='GET'){json(res,200,{status:'ok'});return;}
      if(!await auth(req,res))return;
      if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==origin){json(res,403,{error:'Origen no autorizado.'});return;}
      if(url.pathname==='/api/diary'){
        if(req.method==='GET'){json(res,200,await store.read());return;}
        if(req.method==='PUT'){
          const input=await body(req);if(!input||!Number.isSafeInteger(input.revision)||!Array.isArray(input.entries)){json(res,400,{error:'Datos inválidos.'});return;}
          let value;try{value=await store.replace(input.revision,input.entries);}catch(e){if(e instanceof ConflictError)throw e;if(e.code)throw e;json(res,400,{error:'El diario contiene una entrada inválida. No se guardó.'});return;}
          json(res,200,value);return;
        }
      }
      if(url.pathname==='/api/translate'&&req.method==='POST'){
        const input=await body(req);
        if(!input||typeof input.text!=='string'||!input.text.trim()||input.text.length>2400||!Object.hasOwn(LANGS,input.source)){json(res,400,{error:'Texto o idioma inválido.'});return;}
        const abort=new AbortController();const onClose=()=>{if(!res.writableEnded)abort.abort();};res.on('close',onClose);
        try{const result=await translator.translate(input.text.trim(),input.source,abort.signal);if(!res.destroyed)json(res,200,result);}finally{res.removeListener('close',onClose);}return;
      }
      if((req.method==='GET'||req.method==='HEAD')&&Object.hasOwn(FILES,url.pathname)){
        const [file,type]=FILES[url.pathname];const data=await readFile(join(publicDir,file));res.writeHead(200,{'Content-Type':type});res.end(req.method==='HEAD'?undefined:data);return;
      }
      json(res,404,{error:'No encontrado.'});
    }catch(e){if(res.destroyed)return;const status=e instanceof ConflictError?409:(e.status||500);if(status===500)console.error('Request failed:',e.code||e.name);json(res,status,{error:status===500?'El servidor no pudo completar la operación. No cierres el formulario; revisa los registros del servidor.':e.message});}
  });
  server.requestTimeout=660_000;server.headersTimeout=30_000;
  server.on('close',()=>translator.close?.());return {server,store};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const credentials=JSON.parse(await readFile(process.env.OWNER_FILE||'secrets/owner.json','utf8'));
    const {server}=await createApp({directory:process.env.DATA_DIR||'data',credentials,origin:process.env.APP_ORIGIN||'http://127.0.0.1:3000'});
    server.listen(Number(process.env.PORT||3000),process.env.LISTEN_HOST||'127.0.0.1',()=>console.log('Mesa / Stol is listening.'));
    const shutdown=()=>{server.close();server.closeIdleConnections();setTimeout(()=>process.exit(0),5000).unref();};process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
  }catch(e){console.error('Startup failed:',e.message);process.exit(1);}
}
