import {scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt);
export function validateCredentials(c){
  if(c?.version!==1||typeof c.username!=='string'||!/^[A-Za-z0-9_-]{1,40}$/.test(c.username)||typeof c.salt!=='string'||Buffer.from(c.salt,'base64').length!==16||typeof c.hash!=='string'||Buffer.from(c.hash,'base64').length!==32)throw new Error('Invalid owner credentials. Run scripts/configure.py.');
  return c;
}
export function makeAuth(credentials){
  validateCredentials(credentials);let failures=0,windowStart=Date.now();
  return async(req,res)=>{
    if(Date.now()-windowStart>600_000){failures=0;windowStart=Date.now();}
    if(failures>=20){res.writeHead(429,{'Content-Type':'text/plain; charset=utf-8','Retry-After':'600'});res.end('Demasiados intentos. Espera diez minutos.');return false;}
    const header=req.headers.authorization||'';
    const deny=()=>{res.writeHead(401,{'WWW-Authenticate':'Basic realm="Mesa / Stol", charset="UTF-8"','Content-Type':'text/plain; charset=utf-8'});res.end('Acceso privado. Introduce tu usuario y contraseña.');return false;};
    if(!header.startsWith('Basic ')||header.length>2048)return deny();
    const raw=Buffer.from(header.slice(6),'base64').toString('utf8'),colon=raw.indexOf(':');
    if(colon<0){failures++;return deny();}
    const username=raw.slice(0,colon),password=raw.slice(colon+1);
    const actual=await derive(password,Buffer.from(credentials.salt,'base64'),32,{N:16384,r:8,p:1,maxmem:64*1024*1024});
    if(!timingSafeEqual(actual,Buffer.from(credentials.hash,'base64'))||username!==credentials.username){failures++;return deny();}
    failures=0;return true;
  };
}
