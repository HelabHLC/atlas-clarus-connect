'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
require('../src/image-project-codecs.js');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const target=path.resolve(process.env.PICKER_HTML||'android-test-app/app/src/main/assets/bundle/index.html');
  await page.goto(pathToFileURL(target).href+'#picker');
  const rgba=new Uint8Array(20*20*4);for(let i=0;i<400;i++)rgba.set([61,123,25,255],i*4);
  await page.locator('#picker-file').setInputFiles({name:'touch.png',mimeType:'image/png',buffer:Buffer.from(ATLAS_IMAGE_CODECS.png(20,20,rgba))});
  await page.waitForFunction(()=>document.getElementById('picker-result').textContent.startsWith('Image ready.'));
  await page.locator('#picker-canvas').scrollIntoViewIfNeeded();
  const bounds=await page.locator('#picker-canvas').boundingBox();
  const x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
  const cdp=await context.newCDPSession(page),before=await page.evaluate(()=>scrollY);
  const send=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  await send('touchStart',[{x,y,id:1}]);assert(await page.locator('#picker-loupe').isVisible());
  await send('touchMove',[{x:x+20,y:y+35,id:1}]);assert(await page.locator('#picker-loupe').isVisible());
  await send('touchEnd',[]);assert(await page.locator('#picker-loupe').isVisible());
  assert.match(await page.locator('#picker-result').innerText(),/61 \/ 123 \/ 25/);
  assert.equal(await page.evaluate(()=>scrollY),before);
  for(const size of ['5','11','21']){
   await page.locator('#picker-sample-size').selectOption(size);
   await page.locator('#picker-canvas').scrollIntoViewIfNeeded();
   const b=await page.locator('#picker-canvas').boundingBox();
   await send('touchStart',[{x:b.x+b.width/2,y:b.y+b.height/2,id:1}]);await send('touchEnd',[]);
   assert.match(await page.locator('#picker-result').innerText(),/61 \/ 123 \/ 25/);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS real Chromium mobile touch drag/release, persistent loupe, no scroll and all sampling modes; physical Android NOT_TESTED');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
