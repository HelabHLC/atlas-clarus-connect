/* RC36 staging: local profile-bound CMYK calculation, no print approval.
 * CIEDE2000 implementation reused from the public Research Beta 0.6.0-beta.2.
 */
(function(root){
'use strict';
function de00(x,y){let[L1,a1,b1]=x,[L2,a2,b2]=y,C1=Math.hypot(a1,b1),C2=Math.hypot(a2,b2),barC=(C1+C2)/2,G=.5*(1-Math.sqrt(barC**7/(barC**7+25**7))),ap1=(1+G)*a1,ap2=(1+G)*a2,c1=Math.hypot(ap1,b1),c2=Math.hypot(ap2,b2);let hue=(aa,bb)=>{let h=Math.atan2(bb,aa)*180/Math.PI;return h<0?h+360:h};let h1=hue(ap1,b1),h2=hue(ap2,b2),dL=L2-L1,dC=c2-c1,dh=0;if(c1*c2!==0){dh=h2-h1;if(dh>180)dh-=360;if(dh< -180)dh+=360}let dH=2*Math.sqrt(c1*c2)*Math.sin(dh*Math.PI/360),Lbar=(L1+L2)/2,Cbar=(c1+c2)/2,Hbar;if(c1*c2===0)Hbar=h1+h2;else if(Math.abs(h1-h2)<=180)Hbar=(h1+h2)/2;else Hbar=(h1+h2+360*(h1+h2<360?1:-1))/2;let T=1-.17*Math.cos((Hbar-30)*Math.PI/180)+.24*Math.cos(2*Hbar*Math.PI/180)+.32*Math.cos((3*Hbar+6)*Math.PI/180)-.20*Math.cos((4*Hbar-63)*Math.PI/180);let sl=1+.015*(Lbar-50)**2/Math.sqrt(20+(Lbar-50)**2),sc=1+.045*Cbar,sh=1+.015*Cbar*T,dt=30*Math.exp(-(((Hbar-275)/25)**2)),rc=2*Math.sqrt(Cbar**7/(Cbar**7+25**7)),rt=-rc*Math.sin(2*dt*Math.PI/180);let vl=dL/sl,vc=dC/sc,vh=dH/sh;return Math.sqrt(Math.max(0,vl*vl+vc*vc+vh*vh+rt*vc*vh))}
function run(job){
  return new Promise((resolve,reject)=>{
    const encoded=document.querySelector('#atlas-print-worker-source')?.textContent;
    const extra=document.querySelector('#rc36-lab-worker-source')?.textContent;
    if(!encoded||!extra)return reject(Error('Local ICC worker source unavailable'));
    let worker,url,timer;
    const finish=(err,value)=>{clearTimeout(timer);worker?.terminate();if(url)URL.revokeObjectURL(url);err?reject(err):resolve(value)};
    try{
      url=URL.createObjectURL(new Blob([JSON.parse(encoded),'\n',JSON.parse(extra)],{type:'text/javascript'}));
      worker=new Worker(url);
      timer=setTimeout(()=>finish(Error('Local ICC calculation timed out')),30000);
      worker.onmessage=e=>e.data.type==='rc36-lab-result'?finish(null,e.data.result):finish(Error(e.data.message||'Unexpected worker response'));
      worker.onerror=e=>finish(Error(e.message||'Local worker failed'));
      worker.postMessage(job,[job.profile.buffer]);
    }catch(e){finish(e)}
  });
}
async function calculate(record,intent,substrate){
  const selected=root.ATLAS_RC36_BYOS.selected();
  if(!selected||selected.deviceSpace!=='CMYK')throw Error('Select a local CMYK output profile first');
  if(typeof substrate!=='string'||!substrate.trim())throw Error('Enter the actual intended substrate');
  const lab=record.reference.master_lab;
  const bytes=root.ATLAS_RC36_BYOS.copyForEngine(selected.sha256);
  const y=await run({operation:'rc36-lab-roundtrip',lab,profile:bytes,intent,bpc:false});
  if(y.method!=='LAB_D50_TO_CMYK16_TO_LAB_D50'||JSON.stringify(y.target_lab)!==JSON.stringify(lab)||y.forward_intent!==intent||y.return_intent!==intent||y.forward_bpc!==false||y.return_bpc!==false||y.production_approval!==false||!Array.isArray(y.device_values_16bit)||y.device_values_16bit.length!==4||!y.device_values_16bit.every(v=>Number.isInteger(v)&&v>=0&&v<=65535)||!Array.isArray(y.returned_lab)||y.returned_lab.length!==3||!y.returned_lab.every(Number.isFinite))throw Error('Invalid calculation response');
  if(root.ATLAS_RC36_BYOS.selected()?.sha256!==selected.sha256)throw Error('Profile selection changed; calculate again');
  const result=JSON.parse(JSON.stringify(record));
  result.output={iccProfile:selected,renderingIntent:intent,substrate:substrate.trim(),deviceValues:y.device_values_16bit,simulatedLab:y.returned_lab,deltaE00:de00(lab,y.returned_lab),status:'icc-calculated',method:y.method,engine:y.engine,returnIntent:y.return_intent,bpc:false,physicalProof:'NOT_MEASURED',productionApproval:false};
  result.evidence.iccCalculated=true;
  return result;
}
function mount(target,record,download){
  const doc=target.document,box=doc.createElement('section'),title=doc.createElement('h2');title.textContent='Local ICC calculation · Test / keine Druckfreigabe';box.append(title);
  const intent=doc.createElement('select');intent.setAttribute('aria-label','Rendering intent');for(const s of ['Relative colorimetric','Absolute colorimetric']){const o=doc.createElement('option');o.value=s;o.textContent=s;intent.append(o)}box.append(intent);
  const material=doc.createElement('input');material.placeholder='Material / substrate';material.setAttribute('aria-label','Substrate');box.append(material);
  const button=doc.createElement('button');button.textContent='Calculate locally';box.append(button);
  const status=doc.createElement('pre');status.style.whiteSpace='pre-wrap';status.setAttribute('role','status');box.append(status);
  const save=doc.createElement('button');save.textContent='Calculated JSON';save.disabled=true;box.append(save);
  let calculated=null,revision=0;
  function reset(){revision++;calculated=null;save.disabled=true;status.textContent='Not calculated'}
  intent.addEventListener('change',reset);material.addEventListener('input',reset);reset();
  button.onclick=async()=>{reset();const version=revision;button.disabled=true;try{const x=await calculate(record,intent.value,material.value);if(version!==revision)return;calculated=x;const o=x.output;status.textContent='Profile: '+o.iccProfile.name+'\nSHA-256: '+o.iccProfile.sha256+'\nIntent: '+o.renderingIntent+' · BPC off\nSubstrate: '+o.substrate+'\nTarget Lab D50: '+x.reference.master_lab.join(' / ')+'\nCMYK16: '+o.deviceValues.join(' / ')+'\nReturned Lab: '+o.simulatedLab.map(v=>v.toFixed(4)).join(' / ')+'\nDelta E00: '+o.deltaE00.toFixed(4)+'\nICC simulation only · physical proof NOT MEASURED';save.disabled=false}catch(e){if(version===revision)status.textContent='Calculation blocked: '+e.message}finally{button.disabled=false}};
  save.onclick=()=>{if(calculated)download('ATLAS_Open_DCM_'+record.reference.hlc_address+'_ICC.json',JSON.stringify(calculated,null,2),'application/json')};
  doc.querySelector('main').append(box);
}
root.ATLAS_RC36_LAB_CARD=Object.freeze({de00,calculate,mount});
})(globalThis);
