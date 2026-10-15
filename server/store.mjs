import {mkdir,readFile,writeFile,open,rename,readdir,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {validateBackup} from '../public/core.mjs';

export class ConflictError extends Error {}
export class DiaryStore {
  constructor(directory){this.directory=directory;this.file=join(directory,'diary.json');this.queue=Promise.resolve();}
  async init(){
    await mkdir(join(this.directory,'history'),{recursive:true,mode:0o700});
    try{await readFile(this.file);}catch(e){if(e.code!=='ENOENT')throw e;await this.atomicWrite({format:'mesa-stol',version:1,revision:0,entries:[]});}
    await this.read(); // Fail closed on corrupt storage, never replace it with an empty diary.
  }
  async read(){const data=JSON.parse(await readFile(this.file,'utf8'));validateBackup(data);if(!Number.isSafeInteger(data.revision)||data.revision<0)throw new Error('Invalid diary revision');return data;}
  async atomicWrite(data){
    const temp=join(this.directory,`.diary-${randomUUID()}.tmp`);
    try{
      const fd=await open(temp,'wx',0o600);
      try{await fd.writeFile(JSON.stringify(data,null,2));await fd.sync();}finally{await fd.close();}
      await rename(temp,this.file);
      const dir=await open(this.directory,'r');try{await dir.sync();}finally{await dir.close();}
    }finally{await unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});}
  }
  replace(expectedRevision,entries){
    const operation=this.queue.then(async()=>{
      const current=await this.read();
      if(expectedRevision!==current.revision)throw new ConflictError('El diario cambió desde que lo abriste. Recarga las entradas antes de guardar.');
      const clean=validateBackup({format:'mesa-stol',version:1,entries});
      const history=join(this.directory,'history');
      // Write a complete prior version before replacing the live file.
      const snapshot=join(history,`${String(current.revision).padStart(12,'0')}-${randomUUID()}.json`);
      const fd=await open(snapshot,'wx',0o600);
      try{await fd.writeFile(JSON.stringify(current,null,2));await fd.sync();}finally{await fd.close();}
      const next={format:'mesa-stol',version:1,revision:current.revision+1,updatedAt:new Date().toISOString(),entries:clean};
      await this.atomicWrite(next);
      // Cleanup failures must not report a successfully saved diary as failed.
      try{const snapshots=(await readdir(history)).filter(f=>f.endsWith('.json')).sort();for(const f of snapshots.slice(0,-50))await unlink(join(history,f));}catch{console.error('History cleanup failed; live save succeeded.');}
      return next;
    });
    this.queue=operation.catch(()=>{});return operation;
  }
}
