import {translate} from './model.mjs';
process.on('message',async message=>{
  try{const result=await translate(message.text,message.source);process.send?.({ok:true,result});}
  catch(e){console.error('Translation failed:',e.name);process.send?.({ok:false,error:'No se pudo ejecutar el traductor. Ejecuta la preparación del modelo y comprueba memoria y espacio en el servidor.'});}
});
