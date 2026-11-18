/** sRGB D65/2° reference conversion and CIEDE2000 (kL=kC=kH=1).
 * Not a substitute for ICC PCS D50, substrate simulation or measured proof.
 */
const rad = x => x * Math.PI / 180;
const deg = x => x * 180 / Math.PI;
export function srgb8ToLabD65(rgb) {
 if (!Array.isArray(rgb) || rgb.length !== 3 || !rgb.every(x=>Number.isInteger(x)&&x>=0&&x<=255)) throw new TypeError("Expected sRGB8 triplet");
 const [r,g,b]=rgb.map(x=>{const c=x/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;});
 const x=(0.4124564*r+0.3575761*g+0.1804375*b)/0.95047;
 const y=0.2126729*r+0.7151522*g+0.0721750*b;
 const z=(0.0193339*r+0.1191920*g+0.9503041*b)/1.08883;
 const f=t=>t>216/24389?Math.cbrt(t):(24389/27*t+16)/116;
 const [fx,fy,fz]=[f(x),f(y),f(z)];
 return [116*fy-16,500*(fx-fy),200*(fy-fz)];
}
export function deltaE00(a,b) {
 if (![a,b].every(v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite))) throw new TypeError("Expected two Lab triplets");
 const [L1,A1,B1]=a,[L2,A2,B2]=b;
 const C1=Math.hypot(A1,B1),C2=Math.hypot(A2,B2),avgC=(C1+C2)/2;
 const G=0.5*(1-Math.sqrt(avgC**7/(avgC**7+25**7)));
 const a1=(1+G)*A1,a2=(1+G)*A2,c1=Math.hypot(a1,B1),c2=Math.hypot(a2,B2);
 const h=(x,y)=>{const d=deg(Math.atan2(y,x));return d>=0?d:d+360;};
 const h1=c1===0?0:h(a1,B1),h2=c2===0?0:h(a2,B2);
 const dL=L2-L1,dC=c2-c1;
 let dh=0;
 if(c1*c2!==0){dh=h2-h1;if(dh>180)dh-=360;else if(dh< -180)dh+=360;}
 const dH=2*Math.sqrt(c1*c2)*Math.sin(rad(dh/2));
 const l=(L1+L2)/2,c=(c1+c2)/2;
 let hh=h1+h2;
 if(c1*c2===0)hh=h1+h2;
 else if(Math.abs(h1-h2)<=180)hh=(h1+h2)/2;
 else hh=(h1+h2<360?(h1+h2+360)/2:(h1+h2-360)/2);
 const T=1-0.17*Math.cos(rad(hh-30))+0.24*Math.cos(rad(2*hh))+0.32*Math.cos(rad(3*hh+6))-0.20*Math.cos(rad(4*hh-63));
 const dTheta=30*Math.exp(-(((hh-275)/25)**2));
 const Rc=2*Math.sqrt(c**7/(c**7+25**7));
 const Sl=1+0.015*(l-50)**2/Math.sqrt(20+(l-50)**2);
 const Sc=1+0.045*c,Sh=1+0.015*c*T;
 const Rt=-Math.sin(rad(2*dTheta))*Rc;
 const x=dL/Sl,y=dC/Sc,z=dH/Sh;
 return Math.sqrt(Math.max(0,x*x+y*y+z*z+Rt*y*z));
}
/** Explicitly labels the RGB roundtrip comparison as screen-space diagnostic. */
export function compareRoundTripSrgb(record) {
 if(record?.output?.status!=="icc-roundtrip-rgb-calculated") throw new TypeError("LittleCMS roundtrip required");
 if(record.source.space!=="sRGB") throw new TypeError("D65 sRGB diagnostic requires sRGB source");
 const sourceLab=srgb8ToLabD65(record.source.rgb8);
 const returnedLab=srgb8ToLabD65(record.output.returnedRgb8);
 return {sourceLabD65:sourceLab,returnedLabD65:returnedLab,deltaE00SrgbRoundtrip:deltaE00(sourceLab,returnedLab),
  basis:"sRGB8_D65_2DEG_ROUNDTRIP_DIAGNOSTIC",iccPcsLabD50:null,substrateLab:null,
  physicalProofMeasured:false,productionApproval:false};
}
