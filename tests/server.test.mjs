import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,readdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes,scryptSync} from 'node:crypto';
import {once} from 'node:events';
import {createApp} from '../server/index.mjs';
import {DiaryStore} from '../server/store.mjs';
const password='test-only-password-12345',salt=randomBytes(16);
const credentials={version:1,username:'diario',salt:salt.toString('base64'),hash:scryptSync(password,salt,32).toString('base64')};
const auth='Basic '+Buffer.from('diario:'+password).toString('base64');
const origin='https://diario.example.com';
const entry={id:'sample-1',date:'2026-10-15',time:'08:00',meal:'breakfast',source:'es',original:'Manzana y agua.',es:'Manzana y agua.',hr:'Jabuka i voda.',hunger:'2',reviewed:true,updatedAt:'2026-10-15T06:00:00Z'};
async function start(directory,translator={translate:async()=>({es:'Agua.',hr:'Voda.'}),close(){}}){
  const {server,store}=await createApp({directory,credentials,origin,translator});server.listen(0,'127.0.0.1');await once(server,'listening');
  return {server,store,url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(r=>{server.close(r);server.closeAllConnections();})};
}
function request(app,path,{method='GET',data,headers={}}={}){return fetch(app.url+path,{method,headers:{Authorization:auth,...(data?{'Content-Type':'application/json',Origin:origin}:{}),...headers},body:data?JSON.stringify(data):undefined});}
test('HTTP auth, CSRF, persistent storage, conflicts and read-only static boundary',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'mesa-test-'));let app;
  try{
    app=await start(directory);
    for(const path of ['/','/app.js','/api/diary'])assert.equal((await fetch(app.url+path)).status,401);
    assert.equal((await request(app,'/api/diary',{headers:{Authorization:'Basic '+Buffer.from('diario:wrong').toString('base64')}})).status,401);
    assert.equal((await request(app,'/data/diary.json')).status,404);
    assert.equal((await request(app,'/../secrets/owner.json')).status,404);
    assert.equal((await request(app,'/api/diary',{method:'PUT',data:{revision:0,entries:[entry]},headers:{Origin:'https://other.example'}})).status,403);
    assert.equal((await request(app,'/api/diary',{method:'PUT',data:{revision:0,entries:[{...entry,time:'99:99'}]}})).status,400);
    const first=await request(app,'/api/diary',{method:'PUT',data:{revision:0,entries:[entry]}});assert.equal(first.status,200);assert.equal((await first.json()).revision,1);
    assert.equal((await request(app,'/api/diary',{method:'PUT',data:{revision:0,entries:[]}})).status,409);
    assert.equal((await request(app,'/api/translate',{method:'POST',data:{text:'Agua.',source:'es'}})).status,200);
    await app.close();app=await start(directory);
    const persisted=await (await request(app,'/api/diary')).json();assert.equal(persisted.entries[0].hr,'Jabuka i voda.');assert.equal(persisted.revision,1);
    const concurrent=await Promise.all([request(app,'/api/diary',{method:'PUT',data:{revision:1,entries:[]}}),request(app,'/api/diary',{method:'PUT',data:{revision:1,entries:[entry]}})]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
    const files=await readdir(join(directory,'history'));assert.equal(files.length,2);assert.ok(files.every(f=>f.endsWith('.json')));
  }finally{if(app)await app.close();await rm(directory,{recursive:true,force:true});}
});
test('a translation failure does not prevent saving a draft',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'mesa-test-'));const app=await start(directory,{translate:async()=>{throw Object.assign(new Error('Model unavailable'),{status:503});},close(){}});
  try{
    assert.equal((await request(app,'/api/translate',{method:'POST',data:{text:'Agua.',source:'es'}})).status,503);
    assert.equal((await request(app,'/api/diary',{method:'PUT',data:{revision:0,entries:[{...entry,hr:'',reviewed:false}]}})).status,200);
    assert.equal((await (await request(app,'/api/diary')).json()).entries[0].original,entry.original);
  }finally{await app.close();await rm(directory,{recursive:true,force:true});}
});
test('corrupt data fails closed without replacement',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'mesa-test-'));const path=join(directory,'diary.json');
  try{await writeFile(path,'damaged-data');const store=new DiaryStore(directory);await assert.rejects(()=>store.init());assert.equal(await readFile(path,'utf8'),'damaged-data');}finally{await rm(directory,{recursive:true,force:true});}
});
