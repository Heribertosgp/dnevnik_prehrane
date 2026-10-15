import {loadModel,translate} from '../server/model.mjs';
console.log('Downloading/loading the translation model. The first run can take several minutes.');
try{
  await loadModel();
  for(const [source,text] of [['es','Bebí 250 ml de agua. No tomé café.'],['hr','Pojeo sam jabuku i popio vodu.']]){
    const result=await translate(text,source);console.log(JSON.stringify({source,...result}));
  }
  console.log('Model ready. Review the two sample translations before regular use.');
}catch(e){console.error('Model preparation failed:',e.message);process.exitCode=1;}
