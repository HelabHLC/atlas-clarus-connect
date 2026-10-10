'use strict';
// Trusted host adapter for Node tests; uses the real shared browser decoder.
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
module.exports=async function(){
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
  try{
    const page=await browser.newPage();
    for(const name of ['image-project-codecs','image-projects'])await page.addScriptTag({path:path.join(__dirname,'../src',name+'.js')});
    return {close:()=>browser.close(),decodeSource:async bytes=>{
      const d=await page.evaluate(async encoded=>{
        const I=window.ATLAS_IMAGE_PROJECTS,d=await I.decodeSource(I.unbase64(encoded,I.MAX_SOURCE));
        return {width:d.width,height:d.height,rgba:I.base64(d.rgba)};
      },Buffer.from(bytes).toString('base64'));
      return {...d,rgba:new Uint8Array(Buffer.from(d.rgba,'base64'))};
    }};
  }catch(e){await browser.close();throw e;}
};
