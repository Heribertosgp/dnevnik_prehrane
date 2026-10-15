import {fork} from 'node:child_process';
export class Translator {
  constructor(){this.child=null;this.pending=null;}
  translate(text,source,signal){
    if(this.pending)return Promise.reject(Object.assign(new Error('Ya hay una traducción en curso. Vuelve a intentarlo en unos momentos.'),{status:429}));
    if(signal?.aborted)return Promise.reject(new Error('Translation cancelled'));
    return new Promise((resolve,reject)=>{
      const finish=(err,result)=>{
        if(!this.pending)return;clearTimeout(this.pending.timer);signal?.removeEventListener('abort',cancel);this.pending=null;err?reject(err):resolve(result);
      };
      const cancel=()=>{finish(Object.assign(new Error('Traducción cancelada.'),{status:499}));this.stop();};
      const timer=setTimeout(()=>{finish(Object.assign(new Error('La traducción tardó demasiado. Comprueba el modelo y la memoria del servidor.'),{status:504}));this.stop();},600_000);
      this.pending={finish,timer};signal?.addEventListener('abort',cancel,{once:true});
      if(!this.child){
        const child=fork(new URL('./translation-child.mjs',import.meta.url),[],{stdio:['ignore','ignore','inherit','ipc']});this.child=child;
        child.on('message',m=>{if(this.child===child)this.pending?.finish(m.ok?null:Object.assign(new Error(m.error),{status:503}),m.result);});
        const failed=()=>{if(this.child===child){this.child=null;this.pending?.finish(Object.assign(new Error('El motor de traducción se detuvo. Comprueba la memoria del servidor y vuelve a intentarlo.'),{status:503}));}};
        child.on('error',failed);child.on('exit',failed);
      }
      this.child.send({text,source},err=>{if(err)finish(Object.assign(new Error('No se pudo iniciar el traductor.'),{status:503}));});
    });
  }
  stop(){if(this.child){const child=this.child;this.child=null;child.kill('SIGKILL');}}
  close(){this.pending?.finish(new Error('Server stopping'));this.stop();}
}
