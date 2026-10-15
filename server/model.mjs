import {pipeline,env} from '@huggingface/transformers';
import {LANGS,splitText} from '../public/core.mjs';
import {resolve} from 'node:path';
env.cacheDir=resolve(process.env.MODEL_CACHE||'models');
env.allowLocalModels=process.env.MODEL_OFFLINE==='1';
env.allowRemoteModels=true;
let model;
export async function loadModel(){
  if(!model)model=pipeline('translation','Xenova/m2m100_418M',{
    revision:'9c374f0b7aca709787cea97b047bfbbd1559d177',device:'cpu',dtype:'q8',local_files_only:process.env.MODEL_OFFLINE==='1',
    session_options:{intra_op_num_threads:Number(process.env.MODEL_THREADS||2),inter_op_num_threads:1}
  }).catch(e=>{model=null;throw e;});
  return model;
}
export async function translate(text,source){
  if(!Object.hasOwn(LANGS,source)||typeof text!=='string'||!text.trim()||text.length>2400)throw new Error('Invalid translation request');
  const translator=await loadModel(),result={};
  for(const target of ['es','hr']){
    if(target===source){result[target]=text;continue;}
    const parts=[];
    for(const chunk of splitText(text)){
      const output=await translator(chunk,{src_lang:LANGS[source],tgt_lang:LANGS[target],max_new_tokens:256,num_beams:1,do_sample:false});
      const value=output?.[0]?.translation_text?.trim();if(!value)throw new Error('Empty model output');parts.push(value);
    }
    result[target]=parts.join('\n');if(result[target].length>6000)throw new Error('Translation too long');
  }
  return result;
}
