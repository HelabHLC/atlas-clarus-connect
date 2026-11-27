/* SPDX-License-Identifier: MIT — local WebGL renderer; no network dependencies. */
(function(root){'use strict';
class Renderer {
 constructor(canvas){
  this.canvas=canvas;this.gl=canvas.getContext('webgl',{alpha:false,antialias:true,preserveDrawingBuffer:true});
  if(!this.gl)return new CanvasRenderer(canvas);
  const gl=this.gl;
  const vs=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUV;uniform mat4 uMatrix;uniform mat4 uRotation;varying vec2 vUV;varying vec3 vNormal;void main(){gl_Position=uMatrix*vec4(aPosition,1.);vUV=aUV;vNormal=mat3(uRotation)*aNormal;}`;
  const fs=`precision mediump float;varying vec2 vUV;varying vec3 vNormal;uniform sampler2D uTexture;uniform float uLit;void main(){vec4 t=texture2D(uTexture,vUV);vec3 c=mix(vec3(.94,.92,.85),t.rgb,t.a);vec3 n=normalize(vNormal);float shade=.45+.55*abs(dot(n,normalize(vec3(-.4,.5,1.))));gl_FragColor=vec4(c*mix(1.,shade,uLit),1.);}`;
  const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  this.program=gl.createProgram();gl.attachShader(this.program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(this.program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));gl.useProgram(this.program);
  this.buffers={};for(const name of ['aPosition','aNormal','aUV']){this.buffers[name]=gl.createBuffer();const loc=gl.getAttribLocation(this.program,name);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffers[name]);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,name==='aUV'?2:3,gl.FLOAT,false,0,0);}
  this.indexBuffer=gl.createBuffer();this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.enable(gl.DEPTH_TEST);this.yaw=-.2;this.pitch=.06;this.zoom=1;
  let pointer=null;
  canvas.addEventListener('pointerdown',e=>{pointer=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!pointer)return;this.yaw+=(e.clientX-pointer[0])*.007;this.pitch=Math.max(-.8,Math.min(.8,this.pitch+(e.clientY-pointer[1])*.005));pointer=[e.clientX,e.clientY];});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>pointer=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.65,Math.min(1.8,this.zoom*Math.exp(-e.deltaY*.001)));},{passive:false});
 }
 setImage(image){const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);}
 render(cloth,lit=true){
  const gl=this.gl,c=this.canvas,dpr=Math.min(devicePixelRatio||1,2),w=Math.round(c.clientWidth*dpr),h=Math.round(c.clientHeight*dpr);
  if(c.width!==w||c.height!==h){c.width=w;c.height=h;}gl.viewport(0,0,w,h);gl.clearColor(.071,.13,.13,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);
  const p=new Float32Array(cloth.position),normals=new Float32Array(p.length),ids=cloth.indices;
  for(let i=0;i<ids.length;i+=3){const a=ids[i]*3,b=ids[i+1]*3,d=ids[i+2]*3;const x1=p[b]-p[a],y1=p[b+1]-p[a+1],z1=p[b+2]-p[a+2],x2=p[d]-p[a],y2=p[d+1]-p[a+1],z2=p[d+2]-p[a+2];const n=[y1*z2-z1*y2,z1*x2-x1*z2,x1*y2-y1*x2];for(const k of [a,b,d])for(let j=0;j<3;j++)normals[k+j]+=n[j];}
  for(let i=0;i<normals.length;i+=3){const l=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;for(let j=0;j<3;j++)normals[i+j]/=l;}
  for(const [name,data] of [['aPosition',p],['aNormal',normals],['aUV',cloth.uv]]){gl.bindBuffer(gl.ARRAY_BUFFER,this.buffers[name]);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);}
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,ids,gl.STATIC_DRAW);
  const cy=Math.cos(this.yaw),sy=Math.sin(this.yaw),cx=Math.cos(this.pitch),sx=Math.sin(this.pitch);
  const r=new Float32Array([cy,sx*sy,-cx*sy,0,0,cx,sx,0,sy,-sx*cy,cx*cy,0,0,0,0,1]);
  const aspect=w/h,scale=1.35*this.zoom/Math.max(cloth.width,cloth.height),matrix=new Float32Array(r);
  for(let col=0;col<4;col++){matrix[col*4]*=scale/aspect;matrix[col*4+1]*=scale;matrix[col*4+2]*=-.3;}
  matrix[13]=.07;
  gl.uniformMatrix4fv(gl.getUniformLocation(this.program,'uMatrix'),false,matrix);gl.uniformMatrix4fv(gl.getUniformLocation(this.program,'uRotation'),false,r);gl.uniform1f(gl.getUniformLocation(this.program,'uLit'),lit?1:0);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.uniform1i(gl.getUniformLocation(this.program,'uTexture'),0);gl.drawElements(gl.TRIANGLES,ids.length,gl.UNSIGNED_SHORT,0);
 }
}
class CanvasRenderer {
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.kind='Canvas-Projektion';
  if(!this.ctx)throw Error('Dieser Browser stellt keine Grafikfläche bereit.');
  this.yaw=-.22;this.pitch=.05;this.zoom=1;let pointer=null;
  canvas.addEventListener('pointerdown',e=>{pointer=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!pointer)return;this.yaw+=(e.clientX-pointer[0])*.007;this.pitch=Math.max(-.8,Math.min(.8,this.pitch+(e.clientY-pointer[1])*.005));pointer=[e.clientX,e.clientY];});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>pointer=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.65,Math.min(1.8,this.zoom*Math.exp(-e.deltaY*.001)));},{passive:false});
 }
 setImage(image){
  this.texture=document.createElement('canvas');const ratio=Math.min(1,480/Math.max(image.width,image.height));this.texture.width=Math.round(image.width*ratio);this.texture.height=Math.round(image.height*ratio);
  const ctx=this.texture.getContext('2d');ctx.fillStyle='#f0ebd9';ctx.fillRect(0,0,this.texture.width,this.texture.height);ctx.drawImage(image,0,0,this.texture.width,this.texture.height);
 }
 render(cloth,lit=true){
  if(!this.texture)return;const c=this.canvas,ctx=this.ctx,dpr=Math.min(devicePixelRatio||1,1.5),w=Math.round(c.clientWidth*dpr),h=Math.round(c.clientHeight*dpr);
  if(c.width!==w||c.height!==h){c.width=w;c.height=h;}ctx.fillStyle='#122121';ctx.fillRect(0,0,w,h);
  const cy=Math.cos(this.yaw),sy=Math.sin(this.yaw),cx=Math.cos(this.pitch),sx=Math.sin(this.pitch),scale=Math.min(w,h)*.78*this.zoom/Math.max(cloth.width,cloth.height),points=[],p=cloth.position;
  for(let n=0;n<cloth.count;n++){const x=p[n*3],y=p[n*3+1],z=p[n*3+2],rx=cy*x+sy*z,ry=sx*sy*x+cx*y-sx*cy*z,rz=-cx*sy*x+sx*y+cx*cy*z;points.push([w*.5+rx*scale,h*.46-ry*scale,rz]);}
  const triangles=[];for(let i=0;i<cloth.indices.length;i+=3){const ids=Array.from(cloth.indices.slice(i,i+3));triangles.push({ids,z:ids.reduce((s,n)=>s+points[n][2],0)});}triangles.sort((a,b)=>a.z-b.z);
  for(const {ids} of triangles){
   const [a,b,d]=ids.map(n=>points[n]),uv=ids.map(n=>[cloth.uv[n*2]*this.texture.width,(1-cloth.uv[n*2+1])*this.texture.height]);
   const [u0,v0]=uv[0],[u1,v1]=uv[1],[u2,v2]=uv[2],den=u0*(v1-v2)+u1*(v2-v0)+u2*(v0-v1);if(Math.abs(den)<1e-9)continue;
   const affine=axis=>[(a[axis]*(v1-v2)+b[axis]*(v2-v0)+d[axis]*(v0-v1))/den,(a[axis]*(u2-u1)+b[axis]*(u0-u2)+d[axis]*(u1-u0))/den,(a[axis]*(u1*v2-u2*v1)+b[axis]*(u2*v0-u0*v2)+d[axis]*(u0*v1-u1*v0))/den];
   const tx=affine(0),ty=affine(1),center=[(a[0]+b[0]+d[0])/3,(a[1]+b[1]+d[1])/3],expanded=[a,b,d].map(q=>{const dx=q[0]-center[0],dy=q[1]-center[1],len=Math.hypot(dx,dy)||1;return [q[0]+dx/len*.55,q[1]+dy/len*.55];});ctx.save();ctx.beginPath();ctx.moveTo(...expanded[0]);ctx.lineTo(...expanded[1]);ctx.lineTo(...expanded[2]);ctx.closePath();ctx.clip();ctx.transform(tx[0],ty[0],tx[1],ty[1],tx[2],ty[2]);ctx.drawImage(this.texture,0,0);ctx.restore();
   if(lit){const ab=[b[0]-a[0],b[1]-a[1],(b[2]-a[2])*scale],ac=[d[0]-a[0],d[1]-a[1],(d[2]-a[2])*scale],normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],l=Math.hypot(...normal)||1;
    const shade=.45+.55*Math.abs((-.4*normal[0]-.5*normal[1]+normal[2])/(l*Math.sqrt(1.41)));
    ctx.fillStyle=`rgba(0,0,0,${1-shade})`;ctx.beginPath();ctx.moveTo(...expanded[0]);ctx.lineTo(...expanded[1]);ctx.lineTo(...expanded[2]);ctx.closePath();ctx.fill();
   }
  }
 }
}
root.AtlasClothRenderer=Renderer;
})(globalThis);
