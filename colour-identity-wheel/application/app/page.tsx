"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { validateIdentityHandoff } from "./identity-handoff";
import "./profile-input.css";
import "./multi-profile.css";
import "./production-view.css";
import "./palette-packages.css";
import "./master-insights.css";
import "./measured-validation.css";
import "./ionos-embed.css";
import "./plane-status.css";
import "./wheel-view.css";
import "./identity-handoff.css";

type AtlasIndex = {
  id: number; sample: string; h: number; l: number; c: number;
  lab: [number, number, number]; lambda: number;
  rgb: [number, number, number]; hex: string;
  icc: { rgb: [number, number, number]; hex: string; deltaE00: number; status: "within-tolerance" | "profile-mapped" };
};
type IlluminationScenario = { condition:string; lambda:number; shift:number; deltaE00:number };
type AtlasRecord = AtlasIndex & { spectrum: number[]; illumination?: { coreLambda:number; scenarios:IlluminationScenario[]; worst:IlluminationScenario; sigmaNm:number; skewness:number; qualityTier:number; riskScore:number; failRate:number; spectrumExactMatch:boolean; measureDate:string; sourceCxf:string } };
type ProfileMeta = { name:string; iccVersion:string; profileClass:string; deviceSpace:string; pcs:string; renderingIntent:string; sha256:string; roundTripToleranceDeltaE00:number; withinTolerance:number; profileMapped:number; method:string };
type CustomerProfile = { name:string; size:number; sha256:string; version:string; profileClass:string; deviceSpace:string; pcs:string; headerIntent:string };
type ProfileScope = "selected" | "palette";
type ComparisonResult = { name:string; role:string; values:string; css:string; deltaE00:number|null; inGamut:boolean|null; note:string };
type MeasurementResult = { target:{id:number;sample:string;lab:[number,number,number];lambda:number}; measuredLab:[number,number,number]; deltaE00:number; tolerance:number; status:"PASS"|"REVIEW"|"FAIL"; instrument:string; note:string; boundAt:string; outputProfile:{name:string|null;sha256:string|null;intent:string|null}; customerProfile:{name:string;sha256:string;intent:string}|null };
type Harmony = "none" | "complementary" | "analogous" | "triadic" | "split";
type WheelView = "master" | "icc";
type IdentityHandoff = { state:"none"|"verifying"|"verified"|"blocked"; message:string; requestedId?:number; source?:string };

const LEVELS = Array.from({ length: 19 }, (_, i) => (i + 1) * 5);
const MASTER_SHA256 = "8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4";
const SIZE = 860, CENTER = SIZE / 2, INNER = 94, OUTER = 386;
const HARMONIES: Array<{ value: Harmony; label: string }> = [
  { value: "none", label: "Free selection" },
  { value: "complementary", label: "Complementary" },
  { value: "analogous", label: "Analogous" },
  { value: "triadic", label: "Triadic" },
  { value: "split", label: "Split complementary" },
];

function polar(radius: number, degrees: number) {
  const angle = ((degrees - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(angle), CENTER + radius * Math.sin(angle)];
}
function segmentPath(hue: number, chroma: number, maxChroma: number) {
  const step = (OUTER - INNER) / (maxChroma / 5);
  const r0 = INNER + (chroma / 5 - 1) * step;
  const r1 = r0 + step - 1.25;
  const a0 = hue - 2.34, a1 = hue + 2.34;
  const [x1, y1] = polar(r0, a0), [x2, y2] = polar(r1, a0);
  const [x3, y3] = polar(r1, a1), [x4, y4] = polar(r0, a1);
  return `M${x1},${y1}L${x2},${y2}A${r1},${r1} 0 0 1 ${x3},${y3}L${x4},${y4}A${r0},${r0} 0 0 0 ${x1},${y1}Z`;
}
function hueDistance(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}
function targetAngles(harmony: Harmony) {
  if (harmony === "complementary") return [180];
  if (harmony === "analogous") return [-30, 30];
  if (harmony === "triadic") return [120, 240];
  if (harmony === "split") return [150, 210];
  return [];
}
function luminance([r, g, b]: [number, number, number]) {
  const values = [r, g, b].map((v) => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
  return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
}
function contrast(rgb: [number, number, number], againstWhite: boolean) {
  const a = luminance(rgb), b = againstWhite ? 1 : 0;
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
const CVD_MATRICES = {
  protanopia: [[.152286,1.052583,-.204868],[.114503,.786281,.099216],[-.003882,-.048116,1.051998]],
  deuteranopia: [[.367322,.860646,-.227968],[.280085,.672501,.047413],[-.01182,.04294,.968881]],
  tritanopia: [[1.255528,-.076749,-.178779],[-.078411,.930809,.147602],[.004733,.691367,.3039]],
} as const;
function simulateCvd(rgb: [number, number, number], type: keyof typeof CVD_MATRICES): [number, number, number] {
  const linear = rgb.map((value) => { const n=value/255; return n<=.04045?n/12.92:((n+.055)/1.055)**2.4; });
  const mapped = CVD_MATRICES[type].map((row) => Math.max(0,Math.min(1,row[0]*linear[0]+row[1]*linear[1]+row[2]*linear[2])));
  return mapped.map((value) => Math.round(255*(value<=.0031308?12.92*value:1.055*value**(1/2.4)-.055))) as [number,number,number];
}
function rgbHex(rgb: [number,number,number]) { return `#${rgb.map((value)=>value.toString(16).padStart(2,"0")).join("")}`; }
function iccAscii(bytes: Uint8Array, start: number, length: number) { return String.fromCharCode(...bytes.slice(start,start+length)).trim(); }
function iccVersion(bytes: Uint8Array) { return `${bytes[8]}.${bytes[9]>>4}.${bytes[9]&15}`; }
const ICC_CLASSES: Record<string,string> = { scnr:"Input device", mntr:"Display device", prtr:"Output device", link:"Device link", spac:"Colour space", abst:"Abstract", nmcl:"Named colour" };
const ICC_INTENTS = ["Perceptual","Media-relative colorimetric","Saturation","ICC-absolute colorimetric"];
const MATRICES = {
  p3:{toRgb:[[2.493497,-.931384,-.402711],[-.829489,1.762664,.023625],[.035846,-.076172,.956885]],toXyz:[[.486571,.265668,.198217],[.228975,.691739,.079287],[0,.045113,1.043944]],gamma:"srgb"},
  adobe:{toRgb:[[2.041369,-.564946,-.344694],[-.969266,1.876011,.041556],[.013447,-.11839,1.01541]],toXyz:[[.576731,.185554,.188185],[.297377,.627349,.075274],[.027034,.070687,.991109]],gamma:"adobe"},
} as const;
const D50_TO_D65=[[.955577,-.023039,.063164],[-.02829,1.009942,.021008],[.012298,-.020483,1.32991]];
const D65_TO_D50=[[1.047811,.022887,-.050127],[.029542,.990484,-.017049],[-.009234,.015044,.752132]];
function mul(matrix:readonly (readonly number[])[],vector:number[]){return matrix.map((row)=>row.reduce((sum,value,index)=>sum+value*vector[index],0));}
function labToXyzD50([l,a,b]:[number,number,number]){const f=(value:number)=>value**3>.008856?value**3:(value-16/116)/7.787;return [f((l+16)/116+a/500)*.96422,f((l+16)/116),f((l+16)/116-b/200)*.82521];}
function xyzD50ToLab([x,y,z]:number[]):[number,number,number]{const f=(value:number)=>value>.008856?Math.cbrt(value):7.787*value+16/116;const fx=f(x/.96422),fy=f(y),fz=f(z/.82521);return [116*fy-16,500*(fx-fy),200*(fy-fz)];}
function encode(value:number,gamma:"srgb"|"adobe"){return gamma==="srgb"?(value<=.0031308?12.92*value:1.055*value**(1/2.4)-.055):Math.sign(value)*Math.abs(value)**(256/563);}
function deltaE00(lab1:[number,number,number],lab2:[number,number,number]){const [l1,a1,b1]=lab1,[l2,a2,b2]=lab2,c1=Math.hypot(a1,b1),c2=Math.hypot(a2,b2),cBar=(c1+c2)/2,g=.5*(1-Math.sqrt(cBar**7/(cBar**7+25**7))),ap1=(1+g)*a1,ap2=(1+g)*a2,cp1=Math.hypot(ap1,b1),cp2=Math.hypot(ap2,b2);const hp=(a:number,b:number)=>{const h=Math.atan2(b,a)*180/Math.PI;return h<0?h+360:h},h1=hp(ap1,b1),h2=hp(ap2,b2),dl=l2-l1,dc=cp2-cp1,dh=Math.abs(h2-h1)<=180?h2-h1:h2<=h1?h2-h1+360:h2-h1-360,dhp=2*Math.sqrt(cp1*cp2)*Math.sin(dh*Math.PI/360),lb=(l1+l2)/2,cb=(cp1+cp2)/2,hb=Math.abs(h1-h2)<=180?(h1+h2)/2:(h1+h2<360?(h1+h2+360)/2:(h1+h2-360)/2),t=1-.17*Math.cos((hb-30)*Math.PI/180)+.24*Math.cos(2*hb*Math.PI/180)+.32*Math.cos((3*hb+6)*Math.PI/180)-.2*Math.cos((4*hb-63)*Math.PI/180),sl=1+.015*(lb-50)**2/Math.sqrt(20+(lb-50)**2),sc=1+.045*cb,sh=1+.015*cb*t,rt=-2*Math.sqrt(cb**7/(cb**7+25**7))*Math.sin(60*Math.exp(-(((hb-275)/25)**2))*Math.PI/180);return Math.sqrt((dl/sl)**2+(dc/sc)**2+(dhp/sh)**2+rt*(dc/sc)*(dhp/sh));}
function compareRgbProfile(lab:[number,number,number],space:"p3"|"adobe"){const spec=MATRICES[space],xyz65=mul(D50_TO_D65,labToXyzD50(lab)),linear=mul(spec.toRgb,xyz65),inGamut=linear.every((value)=>value>=0&&value<=1),clipped=linear.map((value)=>Math.max(0,Math.min(1,value))),encoded=clipped.map((value)=>encode(value,spec.gamma)),roundTrip=xyzD50ToLab(mul(D65_TO_D50,mul(spec.toXyz,clipped)));return {encoded,inGamut,deltaE00:deltaE00(lab,roundTrip)};}

function Spectrum({ record }: { record: AtlasRecord }) {
  const width = 520, height = 150, pad = 26;
  const path = record.spectrum.map((value, index) => {
    const x = pad + index / (record.spectrum.length - 1) * (width - pad * 2);
    const y = height - pad - Math.min(1, Math.max(0, value)) * (height - pad * 2);
    return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return <svg className="spectrum" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Spectral reflectance for ${record.sample}`}>
    <title>Spectral reflectance from 380 to 730 nanometres</title>
    {[0, .5, 1].map((v) => { const y = height - pad - v * (height - pad * 2); return <line key={v} x1={pad} x2={width - pad} y1={y} y2={y} className="chart-grid" />; })}
    <path d={path} className="spectrum-line" />
    <text x={pad} y={height - 5} className="axis-label">380 nm</text>
    <text x={width - pad} y={height - 5} textAnchor="end" className="axis-label">730 nm</text>
    <text x={pad} y={15} className="axis-label">Reflectance</text>
  </svg>;
}

export default function Home() {
  const [lightness, setLightness] = useState(65);
  const [records, setRecords] = useState<AtlasRecord[]>([]);
  const [index, setIndex] = useState<AtlasIndex[]>([]);
  const [selected, setSelected] = useState<AtlasRecord | null>(null);
  const [palette, setPalette] = useState<AtlasRecord[]>([]);
  const [harmony, setHarmony] = useState<Harmony>("none");
  const [query, setQuery] = useState("");
  const [showGuides, setShowGuides] = useState(true);
  const [showGamut, setShowGamut] = useState(true);
  const [wheelView, setWheelView] = useState<WheelView>("master");
  const [profile, setProfile] = useState<ProfileMeta | null>(null);
  const [arbeReference, setArbeReference] = useState<AtlasRecord | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [profileError, setProfileError] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [customerIntent, setCustomerIntent] = useState("Perceptual");
  const [customerTolerance, setCustomerTolerance] = useState(2);
  const [profileScope, setProfileScope] = useState<ProfileScope>("selected");
  const [packageName, setPackageName] = useState("Atlas Production Palette");
  const [measurementLab, setMeasurementLab] = useState<[string,string,string]>(["65","0","0"]);
  const [measurementTolerance, setMeasurementTolerance] = useState(2);
  const [measurementInstrument, setMeasurementInstrument] = useState("");
  const [measurementNote, setMeasurementNote] = useState("");
  const [measurementResult, setMeasurementResult] = useState<MeasurementResult|null>(null);
  const [loading, setLoading] = useState(true);
  const [handoff, setHandoff] = useState<IdentityHandoff>({state:"none",message:""});
  const pendingSelection = useRef<number | null>(null);
  const handoffTarget = useRef<{id:number;source:string}|null>(null);

  useEffect(() => {
    fetch("/atlas/search-index.json").then((r) => r.json()).then((data:AtlasIndex[]) => {
      setIndex(data);
      const params = new URLSearchParams(window.location.search);
      if (!params.has("atlas_row_id") && !params.has("master_sha256")) return;
      const validation = validateIdentityHandoff(params, data, MASTER_SHA256);
      if (!validation.ok) {
        setHandoff({state:"blocked",source:validation.source,requestedId:validation.requestedId,message:validation.message});
        return;
      }
      const { item, requestedId, source } = validation;
      handoffTarget.current={id:requestedId,source};
      pendingSelection.current=requestedId;
      setHandoff({state:"verifying",source,requestedId,message:"IDENTITY_HANDOFF = VERIFYING"});
      setLoading(true);
      setRecords([]);
      setSelected(null);
      setLightness(item.l);
      if (item.l === 65) {
        fetch("/atlas/l065.json").then((r)=>r.json()).then((plane:AtlasRecord[])=>{
          const resolved=plane.find((entry)=>entry.id===requestedId)??null;
          setRecords(plane); setSelected(resolved); pendingSelection.current=null; setLoading(false);
          if(resolved)setHandoff({state:"verified",source,requestedId,message:"IDENTITY_HANDOFF = VERIFIED"});
        });
      }
    });
    fetch("/profiles/sRGB-profile.json").then((r) => r.json()).then(setProfile);
  }, []);
  useEffect(() => {
    let active = true;
    fetch(`/atlas/l${String(lightness).padStart(3, "0")}.json`).then((r) => r.json()).then((data: AtlasRecord[]) => {
      if (!active) return;
      setRecords(data);
      const resolved=data.find((i) => i.id === pendingSelection.current) ?? data.find((i) => i.h === 40 && i.c === 50) ?? data[0] ?? null;
      setSelected(resolved);
      const target=handoffTarget.current;
      if(target&&resolved?.id===target.id)setHandoff({state:"verified",source:target.source,requestedId:target.id,message:"IDENTITY_HANDOFF = VERIFIED"});
      pendingSelection.current = null;
      setLoading(false);
    });
    return () => { active = false; };
  }, [lightness]);

  const chromatic = useMemo(() => records.filter((i) => i.h < 360 && i.c > 0), [records]);
  const maxChroma = useMemo(() => Math.max(5, ...chromatic.map((i) => i.c)), [chromatic]);
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return index.filter((item) => item.sample.toLowerCase().includes(q) || item.hex.toLowerCase() === q || String(item.id) === q).slice(0, 7);
  }, [index, query]);
  const harmonyRecords = useMemo(() => {
    if (!selected) return [];
    return targetAngles(harmony).map((offset) => {
      const target = (selected.h + offset + 360) % 360;
      return chromatic.reduce((best, item) => {
        const score = hueDistance(item.h, target) * 12 + Math.abs(item.c - selected.c);
        const bestScore = hueDistance(best.h, target) * 12 + Math.abs(best.c - selected.c);
        return score < bestScore ? item : best;
      }, chromatic[0]);
    }).filter(Boolean);
  }, [chromatic, harmony, selected]);
  const tonalVariants = useMemo(() => {
    if (!selected) return [];
    return index.filter((item) => item.h === selected.h && item.c === selected.c).sort((a, b) => a.l - b.l);
  }, [index, selected]);
  const harmonyIds = new Set(harmonyRecords.map((item) => item.id));
  const mappedCount = useMemo(() => chromatic.filter((item) => item.icc.status === "profile-mapped").length, [chromatic]);
  const withinToleranceCount = chromatic.length - mappedCount;
  const customerMatchesOutput = Boolean(customerProfile && profile && customerProfile.sha256 === profile.sha256);
  const scopedReferences = profileScope === "selected" ? (selected ? [selected] : []) : palette;

  async function readCustomerProfile(file?: File) {
    if (!file) return;
    setProfileBusy(true); setProfileError(""); setCustomerProfile(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes.length < 128 || iccAscii(bytes,36,4) !== "acsp") throw new Error("Die Datei besitzt keinen gültigen ICC-Profilkopf.");
      const declaredSize = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(0,false);
      if (declaredSize > bytes.length || declaredSize < 128) throw new Error("Die im ICC-Profil angegebene Dateigröße ist ungültig.");
      const digest = await crypto.subtle.digest("SHA-256",bytes);
      const sha256 = Array.from(new Uint8Array(digest)).map((value)=>value.toString(16).padStart(2,"0")).join("");
      const classCode=iccAscii(bytes,12,4), headerIntentValue=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(64,false);
      setCustomerProfile({ name:file.name,size:bytes.length,sha256,version:iccVersion(bytes),profileClass:ICC_CLASSES[classCode]??classCode,deviceSpace:iccAscii(bytes,16,4),pcs:iccAscii(bytes,20,4),headerIntent:ICC_INTENTS[headerIntentValue]??`Unknown (${headerIntentValue})` });
      setCustomerIntent(ICC_INTENTS[headerIntentValue]??"Perceptual");
    } catch (error) { setProfileError(error instanceof Error ? error.message : "Das Profil konnte nicht gelesen werden."); }
    finally { setProfileBusy(false); }
  }

  function selectLightness(level: number) {
    if (level === lightness) return;
    setLoading(true);
    setRecords([]);
    setSelected(null);
    setLightness(level);
  }

  function chooseIndex(item: AtlasIndex) {
    pendingSelection.current = item.id;
    setQuery("");
    if (item.l === lightness) {
      const full = records.find((record) => record.id === item.id);
      if (full) setSelected(full);
    } else selectLightness(item.l);
  }
  function addToPalette(items: AtlasRecord[] = selected ? [selected] : []) {
    setPalette((current) => {
      const merged = [...current];
      items.forEach((item) => { if (!merged.some((entry) => entry.id === item.id)) merged.push(item); });
      return merged.slice(-8);
    });
  }
  function exportPalette() {
    const payload = { packageName, packageFormat:"ATLAS Clarus palette manifest", master: "arbe-lambda-masterPKL-v1.0.1", outputProfile: profile, customerProfileContext:customerProfile?{...customerProfile,intent:customerIntent,toleranceDeltaE00:customerTolerance,scope:profileScope,calculationStatus:customerMatchesOutput?"calculated-from-bound-output":"validated-awaiting-transform-engine"}:null, measuredSampleValidation:measurementResult, exportedAt: new Date().toISOString(), arbeReference: arbeReference ? { id:arbeReference.id, sample:arbeReference.sample, lambda:arbeReference.lambda } : null, references: palette.map((item)=>({...item,arbeDeltaLambda:arbeReference?item.lambda-arbeReference.lambda:null})) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "atlas-clarus-palette.json"; anchor.click(); URL.revokeObjectURL(url);
  }
  function exportCss() {
    const colours = palette.length ? palette : selected ? [selected] : [];
    if (!colours.length) return;
    const variables = colours.map((item) => `  /* ${item.sample} · Atlas row ${item.id} */\n  --atlas-${item.sample.toLowerCase().replaceAll("_","-")}: ${item.icc.hex};`).join("\n");
    const content = `/* ${packageName} · ATLAS Clarus\n   Output: ${profile?.name ?? "ICC output"}\n   Profile SHA-256: ${profile?.sha256 ?? "not loaded"}\n   Master: arbe-lambda-masterPKL-v1.0.1\n*/\n:root {\n${variables}\n}\n`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/css" }));
    const anchor = document.createElement("a"); anchor.href=url; anchor.download="atlas-clarus-palette.css"; anchor.click(); URL.revokeObjectURL(url);
  }
  function seedMeasurement() { if(selected){setMeasurementLab(selected.lab.map((value)=>value.toFixed(2)) as [string,string,string]);setMeasurementResult(null);} }
  function bindMeasurement() {
    if(!selected)return;
    const measured=measurementLab.map(Number) as [number,number,number];
    if(measured.some((value)=>!Number.isFinite(value)))return;
    const difference=deltaE00(selected.lab,measured),status=difference<=measurementTolerance?"PASS":difference<=measurementTolerance*1.5?"REVIEW":"FAIL";
    setMeasurementResult({target:{id:selected.id,sample:selected.sample,lab:selected.lab,lambda:selected.lambda},measuredLab:measured,deltaE00:difference,tolerance:measurementTolerance,status,instrument:measurementInstrument.trim()||"Not specified",note:measurementNote.trim(),boundAt:new Date().toISOString(),outputProfile:{name:profile?.name??null,sha256:profile?.sha256??null,intent:profile?.renderingIntent??null},customerProfile:customerProfile?{name:customerProfile.name,sha256:customerProfile.sha256,intent:customerIntent}:null});
  }
  const outputRgb: [number, number, number] = selected ? selected.icc.rgb : [0,0,0];
  const outputHex = selected?.icc.hex ?? selected?.hex ?? "#000000";
  const selectedDisplayHex = selected ? (wheelView === "master" ? selected.hex : selected.icc.hex) : "#000000";
  const whiteContrast = selected ? contrast(outputRgb, true) : 0;
  const blackContrast = selected ? contrast(outputRgb, false) : 0;
  const previewInk = whiteContrast >= blackContrast ? "#ffffff" : "#05090c";
  const cvdPreviews = selected ? (["protanopia","deuteranopia","tritanopia"] as const).map((type)=>({type,rgb:simulateCvd(outputRgb,type)})) : [];
  const arbeDelta = selected && arbeReference ? {
    lambda: selected.lambda - arbeReference.lambda,
    lightness: selected.lab[0] - arbeReference.lab[0],
    chroma: selected.c - arbeReference.c,
  } : null;
  const masterInsight = useMemo(()=>{
    if(!selected)return null;
    const wavelengths=selected.spectrum.map((_,index)=>380+index*10),sum=selected.spectrum.reduce((total,value)=>total+value,0),min=Math.min(...selected.spectrum),max=Math.max(...selected.spectrum),peakIndex=selected.spectrum.indexOf(max),centroid=selected.spectrum.reduce((total,value,index)=>total+value*wavelengths[index],0)/sum;
    const nearest=records.filter((item)=>item.id!==selected.id).map((item)=>({item,distance:deltaE00(selected.lab,item.lab)})).sort((a,b)=>a.distance-b.distance)[0]??null;
    const sameHue=index.filter((item)=>item.h===selected.h&&item.c===selected.c).sort((a,b)=>a.l-b.l);
    return {min,max,peak:wavelengths[peakIndex],centroid,range:max-min,nearest,tonalCount:sameHue.length,tonalMin:sameHue[0]?.l??selected.l,tonalMax:sameHue.at(-1)?.l??selected.l,illumination:selected.illumination};
  },[selected,records,index]);
  const profileComparisons: ComparisonResult[] = useMemo(()=>{
    if(!selected)return [];
    const p3=compareRgbProfile(selected.lab,"p3"),adobe=compareRgbProfile(selected.lab,"adobe");
    return [
      {name:"sRGB",role:"VERBINDLICHES AUSGABEPROFIL",values:`RGB ${selected.icc.rgb.join(" / ")} · ${selected.icc.hex}`,css:selected.icc.hex,deltaE00:selected.icc.deltaE00,inGamut:selected.icc.status==="within-tolerance",note:"ICC v4 · bereit für Export"},
      {name:"Display P3",role:"REFERENZ-TRANSFORMATION",values:`P3 ${p3.encoded.map((v)=>Math.round(v*255)).join(" / ")}`,css:`color(display-p3 ${p3.encoded.map((v)=>v.toFixed(4)).join(" ")})`,deltaE00:p3.deltaE00,inGamut:p3.inGamut,note:"D50→D65 Bradford · Matrix/TRC"},
      {name:"Adobe RGB (1998)",role:"REFERENZ-TRANSFORMATION",values:`RGB ${adobe.encoded.map((v)=>Math.round(v*255)).join(" / ")}`,css:selected.icc.hex,deltaE00:adobe.deltaE00,inGamut:adobe.inGamut,note:"D50→D65 Bradford · Matrix/TRC"},
      {name:"FOGRA55 CMYKOGV",role:"STANDARD ECG FEASIBILITY REFERENCE",values:"7-colour ECG · CMYK + Orange, Green, Violet",css:"linear-gradient(135deg,#00a9ce 0 18%,#ec008c 18% 35%,#fff200 35% 52%,#171717 52% 66%,#f58220 66% 78%,#39b54a 78% 89%,#6f2c91 89%)",deltaE00:null,inGamut:null,note:"Parallel from the fixed Atlas master · profile transform not yet bound in this web build"},
      customerProfile?{name:customerProfile.name,role:"KUNDEN-ICC-PROFIL",values:customerMatchesOutput?`RGB ${selected.icc.rgb.join(" / ")} · ${selected.icc.hex}`:`${customerProfile.deviceSpace} → ${customerProfile.pcs} · ${customerIntent}`,css:customerMatchesOutput?selected.icc.hex:"linear-gradient(135deg,#17323b,#0b171e)",deltaE00:customerMatchesOutput?selected.icc.deltaE00:null,inGamut:customerMatchesOutput?selected.icc.deltaE00<=customerTolerance:null,note:`SHA-256 ${customerProfile.sha256.slice(0,12)}… · ΔE00 ≤ ${customerTolerance}`}
      :{name:"Customer ICC profile",role:"UPLOAD-KANAL",values:"Press, monitor or printer profile",css:"linear-gradient(135deg,#17323b,#0b171e)",deltaE00:null,inGamut:null,note:"Upload below · hash, intent and tolerance retained"},
      {name:"Device CMYK output",role:"LATER OUTPUT CONDITION",values:"Press- and substrate-dependent device values",css:"linear-gradient(135deg,#00a9ce,#ec008c 34%,#fff200 67%,#171717)",deltaE00:null,inGamut:null,note:"Actual press profile required · physical QC remains NOT_MEASURED"},
    ];
  },[selected,customerProfile,customerMatchesOutput,customerIntent,customerTolerance]);

  return <main>
    <header className="site-header">
      <div><p className="eyebrow">ATLAS CLARUS · PROFESSIONAL REFERENCE TOOL</p><h1>Colour Identity Wheel</h1><p className="lede">Choose relationships visually. Keep every selected colour bound to a documented Atlas identity.</p></div>
      <div className="master-note"><span>MASTER</span><strong>PKL v1.0.1</strong><small>13,283 references · 19 L* planes</small></div>
    </header>

    {handoff.state !== "none" && <section className={`identity-handoff ${handoff.state}`} role="status" aria-live="polite"><div><span>REFERENCE TRANSFER</span><strong>{handoff.message}</strong></div><dl><div><dt>Source</dt><dd>{handoff.source}</dd></div><div><dt>atlas_row_id</dt><dd>{handoff.requestedId ?? "—"}</dd></div><div><dt>Master SHA-256</dt><dd>{MASTER_SHA256.slice(0,16)}…</dd></div></dl>{handoff.source === "hover-library" && <a className="handoff-return" href="https://arbe-lambda-star.com/atlas-clarus-hover-library/">← Back to Hover Library</a>}</section>}

    <section className="pro-toolbar" aria-label="Professional colour controls">
      <div className="search-wrap">
        <label htmlFor="atlas-search">Find Atlas reference</label>
        <input id="atlas-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="H120_L065_C040, #hex or row ID" autoComplete="off" />
        {searchResults.length > 0 && <div className="search-results">{searchResults.map((item) => <button key={item.id} onClick={() => chooseIndex(item)}><span style={{ background: item.hex }} /><strong>{item.sample}</strong><small>row {item.id} · {item.hex}</small></button>)}</div>}
      </div>
      <div><label htmlFor="harmony">Harmony rule</label><select id="harmony" value={harmony} onChange={(e) => setHarmony(e.target.value as Harmony)}>{HARMONIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
      <div className="toggle-stack"><label className="guide-toggle"><input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} /> H/C guides</label><label className="guide-toggle"><input type="checkbox" checked={showGamut} onChange={(e) => setShowGamut(e.target.checked)} /> ICC gamut overlay</label></div>
    </section>

    {profile && <section className="profile-bar"><div><span>ACTIVE OUTPUT PROFILE</span><strong>{profile.name}</strong></div><dl><div><dt>ICC</dt><dd>v{profile.iccVersion} · {profile.profileClass}</dd></div><div><dt>Space / PCS</dt><dd>{profile.deviceSpace} / {profile.pcs}</dd></div><div><dt>Intent</dt><dd>{profile.renderingIntent}</dd></div><div><dt>SHA-256</dt><dd title={profile.sha256}>{profile.sha256.slice(0,12)}…</dd></div></dl></section>}
    <section className="wheel-view-control" aria-label="Wheel colour source">
      <div><span>WHEEL DISPLAY</span><strong>{wheelView === "master" ? "Master PKL colours" : "ICC sRGB output"}</strong><small>{wheelView === "master" ? "Stored PKL RGB/HEX values. The Atlas identity remains unchanged." : "Profile-bound screen output derived from master Lab."}</small></div>
      <div className="wheel-view-buttons"><button type="button" aria-pressed={wheelView === "master"} onClick={() => setWheelView("master")}>Master PKL</button><button type="button" aria-pressed={wheelView === "icc"} onClick={() => setWheelView("icc")}>ICC sRGB output</button></div>
    </section>

    <section className="lightness-control" aria-label="Lightness plane">
      <div><span>LIGHTNESS PLANE</span><strong>L* {lightness}</strong><small aria-live="polite">{loading?`Loading documented L* ${lightness} plane…`:`${chromatic.length.toLocaleString("en-US")} chromatic references · C* up to ${maxChroma}`}</small></div>
      <input aria-label="Lightness plane" type="range" min="5" max="95" step="5" value={lightness} onChange={(e) => selectLightness(Number(e.target.value))} />
      <div className="level-buttons">{LEVELS.map((level) => <button key={level} className={level === lightness ? "active" : ""} onClick={() => selectLightness(level)} aria-pressed={level === lightness}>{level}</button>)}</div>
    </section>

    <div className="workspace">
      <section className="wheel-panel" aria-busy={loading}>
        <div className="wheel-status"><span>H → angle</span><span>C → radius</span><span>L* → plane</span>{loading?<span className="plane-updating" role="status">Updating L* {lightness}…</span>:<><span className="gamut-legend"><i/>within ΔE00 ≤ 2: {withinToleranceCount}</span><span className="gamut-legend mapped"><i/>profile-mapped: {mappedCount}</span></>}<span className="preview-badge">{wheelView === "master" ? "MASTER PKL COLOURS" : "ICC-BOUND sRGB OUTPUT"}</span></div>
        <svg className="wheel" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`ATLAS colour identity wheel at L star ${lightness}`}>
          <title>{["ATLAS Colour Identity Wheel at L* ", lightness].join("")}</title>
          <circle cx={CENTER} cy={CENTER} r={OUTER + 9} className="wheel-boundary" />
          {showGuides && <g className="guides">
            {[30,60,90,120,150,180,210,240,270,300,330,360].map((h) => { const [x1,y1]=polar(INNER-5,h),[x2,y2]=polar(OUTER+5,h),[tx,ty]=polar(OUTER+28,h); return <g key={h}><line x1={x1} y1={y1} x2={x2} y2={y2}/><text x={tx} y={ty+4} textAnchor="middle">{h===360?"H000":`H${String(h).padStart(3,"0")}`}</text></g>; })}
            {[20,40,60,80,100].filter((c)=>c<=maxChroma).map((c)=>{const r=INNER+(c/5)*(OUTER-INNER)/(maxChroma/5);return <g key={c}><circle cx={CENTER} cy={CENTER} r={r}/><text x={CENTER+5} y={CENTER-r+13}>C{c}</text></g>})}
          </g>}
          {chromatic.map((record) => <path key={record.id} d={segmentPath(record.h, record.c, maxChroma)} fill={wheelView === "master" ? record.hex : record.icc.hex} className={`${selected?.id === record.id ? "swatch selected" : "swatch"}${arbeReference?.id===record.id?" arbe-reference":""}${harmonyIds.has(record.id) ? " harmony" : ""}${showGamut&&record.icc.status==="profile-mapped"?" profile-mapped":""}`} onClick={() => setSelected(record)}><title>{record.sample} · λ* {record.lambda.toFixed(3)} nm · PKL {record.hex} · ICC {record.icc.hex} · ΔE00 {record.icc.deltaE00}</title></path>)}
          {harmonyRecords.map((record) => { const step=(OUTER-INNER)/(maxChroma/5),r=INNER+(record.c/5-.5)*step,[x,y]=polar(r,record.h); return <circle key={`marker-${record.id}`} cx={x} cy={y} r="8" className="harmony-marker"/>; })}
          <circle cx={CENTER} cy={CENTER} r={INNER - 8} className="wheel-center" />
          <text x={CENTER} y={CENTER - 18} textAnchor="middle" className="center-title">ATLAS CLARUS</text><text x={CENTER} y={CENTER + 12} textAnchor="middle" className="center-subtitle">L* {lightness}</text><text x={CENTER} y={CENTER + 35} textAnchor="middle" className="center-caption">{wheelView === "master" ? "MASTER PKL" : "ICC sRGB OUTPUT"}</text>
        </svg>
        <p className="wheel-caption">The irregular edge is the documented Atlas gamut at this lightness. Empty positions remain empty; no synthetic colours are inserted.</p>
      </section>

      <aside className="detail-panel" aria-live="polite">{selected ? <>
        <div className="selection-heading"><span className="selected-chip" style={{ backgroundColor: selectedDisplayHex }} /><div><p>SELECTED IDENTITY</p><h2>{selected.sample}</h2><small>Atlas row {selected.id.toLocaleString("en-US")}</small></div></div>
        <div className="identity-strip"><span>H {selected.h}</span><span>L* {selected.l}</span><span>C* {selected.c}</span><span>{selected.hex}</span></div>
        <dl className="facts"><div><dt>Master CIELAB</dt><dd>{selected.lab.map((v) => v.toFixed(2)).join(" · ")}</dd></div><div><dt>Master RGB</dt><dd>{selected.rgb.join(" · ")}</dd></div><div><dt>Master HEX</dt><dd>{selected.hex}</dd></div><div><dt>ICC sRGB</dt><dd>{selected.icc.rgb.join(" · ")}</dd></div><div><dt>ICC HEX</dt><dd>{selected.icc.hex}</dd></div><div><dt>Round-trip ΔE00</dt><dd>{selected.icc.deltaE00.toFixed(3)}</dd></div><div><dt>λ*</dt><dd>{selected.lambda.toFixed(3)} nm</dd></div><div><dt>Gamut status</dt><dd className={selected.icc.status}>{selected.icc.status === "within-tolerance" ? "Within tolerance" : "Profile-mapped"}</dd></div></dl>
        <Spectrum record={selected} />
        <div className="contrast-row"><div style={{background:outputHex,color:"#fff"}}>Aa <small>{whiteContrast.toFixed(2)}:1</small></div><div style={{background:outputHex,color:"#05090c"}}>Aa <small>{blackContrast.toFixed(2)}:1</small></div></div>
        <section className="accessibility-check" aria-labelledby="accessibility-title">
          <div className="accessibility-title"><div><p>ACCESSIBILITY PREVIEW</p><h3 id="accessibility-title">Screen perception checks</h3></div><span>PHASE 1 · LIVE</span></div>
          <div className="wcag-row"><span>White text <strong>{whiteContrast>=7?"AAA":whiteContrast>=4.5?"AA":"Fail"}</strong></span><span>Dark text <strong>{blackContrast>=7?"AAA":blackContrast>=4.5?"AA":"Fail"}</strong></span></div>
          <div className="cvd-grid">{cvdPreviews.map((item)=><div key={item.type} style={{backgroundColor:rgbHex(item.rgb),color:contrast(item.rgb,true)>=contrast(item.rgb,false)?"#fff":"#05090c"}}><strong>{item.type[0].toUpperCase()+item.type.slice(1)}</strong><small>{rgbHex(item.rgb)}</small></div>)}</div>
          <p>Approximate sRGB simulation for design review. It is not a medical test and does not certify that a complete palette is conflict-free.</p>
        </section>
        <div className="app-preview" style={{background:outputHex,color:previewInk}}><small>ICC OUTPUT PREVIEW</small><strong>Colour identity in context</strong><span>{profile?.name}</span></div>
        <button className="primary-action" onClick={() => addToPalette()}>Add identity to palette</button>
      </> : <p>Select a reference on the wheel.</p>}</aside>
    </div>

    {selected && <section className="designer-tools">
      <div className="tool-section"><div className="section-heading"><div><p className="eyebrow">HARMONY</p><h2>{HARMONIES.find((item)=>item.value===harmony)?.label}</h2></div>{harmonyRecords.length>0&&<button onClick={()=>addToPalette([selected,...harmonyRecords])}>Add set to palette</button>}</div>{harmonyRecords.length ? <div className="harmony-cards">{[selected,...harmonyRecords].map((item,index)=><button key={item.id} onClick={()=>setSelected(item)}><span style={{background:item.hex}}/><strong>{index===0?"Base":item.sample}</strong><small>{item.sample} · C* {item.c}</small></button>)}</div>:<p className="empty-state">Choose a harmony rule to map geometric targets to the nearest available references on the active L* plane.</p>}</div>
      <div className="tool-section"><div className="section-heading"><div><p className="eyebrow">TONAL FAMILY</p><h2>Same H and C across L*</h2></div></div><div className="tone-ramp">{tonalVariants.map((item)=><button key={item.id} onClick={()=>chooseIndex(item)} aria-label={`${item.sample}, L star ${item.l}`}><span style={{background:item.hex}}/><small>{item.l}</small></button>)}</div></div>
    </section>}

    {selected&&<section className="measurement-validation" aria-labelledby="measurement-title">
      <div className="measurement-heading"><div><p className="eyebrow">03 · PROVE THE WORKFLOW</p><h2 id="measurement-title">Measured sample validation</h2></div><p>Bind physical measurements to the production result while preserving the original Atlas identity and the complete profile history.</p></div>
      <div className="measurement-workspace"><div className="measurement-target"><span>ORIGINAL ATLAS IDENTITY</span><strong>{selected.sample}</strong><small>Row {selected.id} · Master Lab {selected.lab.map((value)=>value.toFixed(2)).join(" / ")} · λ* {selected.lambda.toFixed(3)} nm</small><button onClick={seedMeasurement}>Use target as starting values</button></div><div className="measurement-form"><div className="lab-inputs">{(["L*","a*","b*"] as const).map((label,index)=><label key={label}>{label}<input type="number" step="0.01" value={measurementLab[index]} onChange={(event)=>setMeasurementLab((current)=>current.map((value,i)=>i===index?event.target.value:value) as [string,string,string])}/></label>)}</div><label>Instrument / measurement source<input value={measurementInstrument} onChange={(event)=>setMeasurementInstrument(event.target.value)} placeholder="e.g. spectrophotometer and geometry"/></label><label>QC note<input value={measurementNote} onChange={(event)=>setMeasurementNote(event.target.value)} placeholder="Batch, substrate or sample reference"/></label><label>Pass tolerance ΔE00<input type="number" min="0.1" max="20" step="0.1" value={measurementTolerance} onChange={(event)=>setMeasurementTolerance(Number(event.target.value))}/></label><button className="bind-measurement" onClick={bindMeasurement}>Bind measurement to identity</button></div></div>
      {measurementResult?<div className={`measurement-result ${measurementResult.status.toLowerCase()}`}><div><span>BOUND QC RESULT</span><strong>{measurementResult.status}</strong><em>ΔE00 {measurementResult.deltaE00.toFixed(3)} · tolerance ≤ {measurementResult.tolerance.toFixed(2)}</em></div><dl><div><dt>Target</dt><dd>{measurementResult.target.sample}</dd></div><div><dt>Measured Lab</dt><dd>{measurementResult.measuredLab.map((value)=>value.toFixed(2)).join(" / ")}</dd></div><div><dt>Instrument</dt><dd>{measurementResult.instrument}</dd></div><div><dt>Output profile</dt><dd>{measurementResult.outputProfile.name??"None"}</dd></div><div><dt>Profile hash</dt><dd>{measurementResult.outputProfile.sha256?`${measurementResult.outputProfile.sha256.slice(0,16)}…`:"None"}</dd></div><div><dt>Bound</dt><dd>{new Date(measurementResult.boundAt).toLocaleString("de-DE")}</dd></div></dl></div>:<p className="measurement-empty">No measurement is bound yet. The selected Atlas identity remains the immutable target.</p>}
      <div className="measurement-outcome"><strong>Outcome</strong><p>Bridge from design decision to quality control. The measured result is appended to the package manifest; it never overwrites the Atlas master or its profile history.</p></div>
    </section>}

    {selected&&masterInsight&&<section className="master-insights" aria-labelledby="master-insights-title">
      <div className="master-insights-heading"><div><p className="eyebrow">MASTER PKL v2 · ILLUMEXT</p><h2 id="master-insights-title">Illumination resilience</h2></div><p>The active identity is tested across documented D50, D65, tungsten, LED and stress spectra. Master Lab, Atlas row and spectral curve remain unchanged.</p></div>
      <div className="illumination-strip">{masterInsight.illumination?.scenarios.map((scenario)=><div key={scenario.condition} className={scenario.deltaE00<=2?"stable":scenario.deltaE00<=5?"review":"risk"}><span>{scenario.condition}</span><strong>ΔE00 {scenario.deltaE00.toFixed(2)}</strong><small>λ* {scenario.lambda.toFixed(1)} · Δλ {scenario.shift>=0?"+":""}{scenario.shift.toFixed(1)} nm</small></div>)}</div>
      <div className="master-insight-grid"><article><span>SPECTRAL FINGERPRINT</span><strong>{masterInsight.peak} nm peak</strong><p>Reflectance centroid {masterInsight.centroid.toFixed(1)} nm · range {(masterInsight.range*100).toFixed(1)} percentage points.</p><dl><div><dt>σ*</dt><dd>{masterInsight.illumination?.sigmaNm.toFixed(2)??"—"} nm</dd></div><div><dt>Skewness</dt><dd>{masterInsight.illumination?.skewness.toFixed(3)??"—"}</dd></div></dl></article><article><span>WORST DOCUMENTED CONDITION</span><strong>{masterInsight.illumination?.worst.condition??"—"}</strong><p>Highest D50-relative colour difference in the v2 illumination extension.</p><dl><div><dt>ΔE00</dt><dd>{masterInsight.illumination?.worst.deltaE00.toFixed(3)??"—"}</dd></div><div><dt>Δλ*</dt><dd>{masterInsight.illumination?`${masterInsight.illumination.worst.shift>=0?"+":""}${masterInsight.illumination.worst.shift.toFixed(2)} nm`:"—"}</dd></div></dl></article><article><span>REFERENCE NEIGHBOUR</span><strong>{masterInsight.nearest?.item.sample??"—"}</strong><p>Closest documented identity on the active L* plane for collision and separation review.</p><dl><div><dt>ΔE00</dt><dd>{masterInsight.nearest?.distance.toFixed(3)??"—"}</dd></div><div><dt>Tonal levels</dt><dd>{masterInsight.tonalCount}</dd></div></dl></article></div>
      <div className="master-provenance"><span>Exact CXF spectrum: <strong>{masterInsight.illumination?.spectrumExactMatch?"YES":"NO"}</strong></span><span>Quality tier: <strong>{masterInsight.illumination?.qualityTier??"—"}</strong></span><span>Risk score: <strong>{masterInsight.illumination?.riskScore.toFixed(3)??"—"}</strong></span><span>Measurement: <strong>{masterInsight.illumination?.measureDate?.slice(0,10)??"—"}</strong></span></div>
      <p className="master-insights-note">The v2 extension adds genuine illumination behaviour to the wheel. These values describe the stored master spectrum; they do not replace ICC output proof or a physical production measurement.</p>
    </section>}

    {selected && <section className="arbe-analysis" aria-labelledby="arbe-title">
      <div className="arbe-heading"><div><p className="eyebrow">ARBE λ* REFERENCE ANALYSIS</p><h2 id="arbe-title">Lock one identity. Compare the next.</h2></div><button onClick={()=>setArbeReference(selected)}>{arbeReference?"Set selected as new reference":"Lock selected as reference"}</button></div>
      {arbeReference ? <>
        <div className="arbe-comparison">
          <div className="arbe-identity"><span style={{backgroundColor:arbeReference.hex}}/><div><small>LOCKED REFERENCE</small><strong>{arbeReference.sample}</strong><em>λ* {arbeReference.lambda.toFixed(3)} nm · row {arbeReference.id}</em></div></div>
          <div className="arbe-arrow" aria-hidden="true">→</div>
          <div className="arbe-identity current"><span style={{backgroundColor:selected.hex}}/><div><small>CURRENT SELECTION</small><strong>{selected.sample}</strong><em>λ* {selected.lambda.toFixed(3)} nm · row {selected.id}</em></div></div>
          <dl className="arbe-deltas"><div><dt>Δλ*</dt><dd>{arbeDelta&&`${arbeDelta.lambda>=0?"+":""}${arbeDelta.lambda.toFixed(3)} nm`}</dd></div><div><dt>|Δλ*|</dt><dd>{arbeDelta&&Math.abs(arbeDelta.lambda).toFixed(3)} nm</dd></div><div><dt>ΔL*</dt><dd>{arbeDelta&&`${arbeDelta.lightness>=0?"+":""}${arbeDelta.lightness.toFixed(2)}`}</dd></div><div><dt>ΔC*</dt><dd>{arbeDelta&&`${arbeDelta.chroma>=0?"+":""}${arbeDelta.chroma.toFixed(2)}`}</dd></div></dl>
        </div>
        <p className="arbe-note">Δλ* is reported as a deterministic descriptor difference between two documented Atlas references. It is not used to overwrite either identity, and no pass/fail threshold is implied.</p>
      </> : <p className="empty-state">Lock the selected Atlas identity as the ARBE reference. Every subsequent wheel selection will then be compared against it.</p>}
    </section>}

    <section className="palette-section package-section" aria-labelledby="package-title"><div className="section-heading package-heading"><div><p className="eyebrow">IN PROGRESS</p><h2 id="package-title">Professional palette packages</h2><p>Export named identities with master Lab, ICC output and profile provenance for design and production handoff.</p></div><div className="palette-actions"><button onClick={exportCss}>Export CSS</button><button onClick={exportPalette} disabled={!palette.length}>Export JSON</button>{palette.length>0&&<button onClick={()=>setPalette([])}>Clear</button>}</div></div><div className="package-controls"><label htmlFor="package-name">Package name<input id="package-name" value={packageName} onChange={(event)=>setPackageName(event.target.value)} maxLength={80}/></label><dl><div><dt>Identities</dt><dd>{palette.length}</dd></div><div><dt>Master</dt><dd>PKL v1.0.1</dd></div><div><dt>Output profile</dt><dd>{profile?.name??"Loading"}</dd></div><div><dt>Provenance</dt><dd>{profile?.sha256?`${profile.sha256.slice(0,12)}…`:"Pending"}</dd></div></dl></div>{palette.length?<div className="palette-list">{palette.map((item)=><button key={item.id} className="palette-item" onClick={()=>chooseIndex(item)}><span style={{background:item.hex}}/><strong>{item.sample}</strong><small>Lab {item.lab.map((value)=>value.toFixed(1)).join("/")} · {item.icc.hex}</small></button>)}</div>:<p className="empty-state">Add identities from the wheel to assemble a documented production package.</p>}<div className="format-roadmap"><div className="live"><span>LIVE</span><strong>JSON</strong><small>Full identity and provenance manifest</small></div><div className="live"><span>LIVE</span><strong>CSS</strong><small>Named custom properties with profile header</small></div><div><span>NEXT</span><strong>ASE</strong><small>Creative application swatch exchange</small></div><div><span>NEXT</span><strong>PDF</strong><small>Human-readable production handoff sheet</small></div></div><p className="package-status">JSON and CSS live · ASE and PDF next</p></section>
    <section className="profile-input-section" aria-labelledby="profile-input-title">
      <div className="profile-input-heading"><div><p className="eyebrow">PROFILEINGABE</p><h2 id="profile-input-title">Kunden-ICC-Profile</h2></div><p>Laden Sie ein Druckmaschinen-, Monitor- oder Druckerprofil und berechnen Sie profilgebundene Ausgabewerte für die ausgewählte Identität oder die gesamte Palette.</p></div>
      <div className="profile-input-grid">
        <div className="profile-drop"><label htmlFor="customer-icc"><span>{profileBusy?"PROFIL WIRD GEPRÜFT":"ICC / ICM AUSWÄHLEN"}</span><strong>{customerProfile?.name??"Kundenprofil lokal öffnen"}</strong><small>.icc oder .icm · Datei verlässt den Browser nicht</small></label><input id="customer-icc" type="file" accept=".icc,.icm,application/vnd.iccprofile" onChange={(event)=>readCustomerProfile(event.target.files?.[0])}/>{profileError&&<p className="profile-error" role="alert">{profileError}</p>}</div>
        <div className="profile-controls"><label>Berechnungsabsicht<select value={customerIntent} onChange={(event)=>setCustomerIntent(event.target.value)}>{ICC_INTENTS.map((intent)=><option key={intent}>{intent}</option>)}</select></label><label>ΔE00-Toleranz<input type="number" min="0.1" max="20" step="0.1" value={customerTolerance} onChange={(event)=>setCustomerTolerance(Number(event.target.value))}/></label><fieldset><legend>Umfang</legend><label><input type="radio" name="profile-scope" checked={profileScope==="selected"} onChange={()=>setProfileScope("selected")}/> Ausgewählte Identität</label><label><input type="radio" name="profile-scope" checked={profileScope==="palette"} onChange={()=>setProfileScope("palette")}/> Gesamte Palette ({palette.length})</label></fieldset></div>
      </div>
      {customerProfile?<div className="profile-result"><div className="profile-result-status"><span className={customerMatchesOutput?"calculated":"validated"}>{customerMatchesOutput?"BERECHNET":"LOKAL VALIDIERT"}</span><strong>{customerMatchesOutput?`${scopedReferences.length} profilgebundene ${scopedReferences.length===1?"Ausgabe":"Ausgaben"}`:"Profil erkannt · Transformationskern erforderlich"}</strong><p>{customerMatchesOutput?"Der Hash entspricht dem verbindlichen sRGB-Ausgabeprofil. Die vorhandenen Atlas-ICC-Werte gelten für den gewählten Umfang.":"Hash, Absicht, Toleranz und Umfang sind gebunden. Für fremde Kundenprofile werden keine Werte simuliert; die Farbtransformation bleibt bis zur Anbindung eines ICC/LittleCMS-Kerns gesperrt."}</p></div><dl><div><dt>Profil</dt><dd>{customerProfile.name} · {(customerProfile.size/1024).toFixed(1)} KB</dd></div><div><dt>ICC / Klasse</dt><dd>v{customerProfile.version} · {customerProfile.profileClass}</dd></div><div><dt>Raum / PCS</dt><dd>{customerProfile.deviceSpace} / {customerProfile.pcs}</dd></div><div><dt>Header-Intent</dt><dd>{customerProfile.headerIntent}</dd></div><div className="profile-hash"><dt>SHA-256</dt><dd>{customerProfile.sha256}</dd></div></dl>{customerMatchesOutput&&scopedReferences.length>0&&<div className="profile-output-list">{scopedReferences.map((item)=><div key={item.id}><i style={{background:item.icc.hex}}/><span><strong>{item.sample}</strong><small>{item.icc.hex} · RGB {item.icc.rgb.join("/")} · ΔE00 {item.icc.deltaE00.toFixed(3)}</small></span><em>{item.icc.deltaE00<=customerTolerance?"PASS":"REVIEW"}</em></div>)}</div>}</div>:<p className="profile-preserve">Profil-Hash, Absicht und Toleranz beibehalten.</p>}
    </section>
    {selected&&<section className="multi-profile-section" aria-labelledby="multi-profile-title">
      <div className="multi-profile-heading"><div><p className="eyebrow">02 · EXTEND THE LEAD</p><h2 id="multi-profile-title">Multi-profile production view</h2></div><p>Compare one fixed Atlas identity across sRGB, Display P3, Adobe RGB, FOGRA55 CMYKOGV and customer ICC profiles with transparent status and provenance.</p></div>
      <div className="master-anchor"><div><span>FIXED MASTER REFERENCE</span><strong>{selected.sample}</strong><small>Atlas row {selected.id} · Lab {selected.lab.map((value)=>value.toFixed(2)).join(" / ")} · λ* {selected.lambda.toFixed(3)} nm</small></div><em>Identity locked across every output</em></div>
      <div className="profile-comparison-grid">{profileComparisons.map((item)=><article key={item.name} className={item.deltaE00===null?"planned":""}><div className="profile-preview" style={{background:item.css}}/><div className="profile-card-title"><span>{item.role}</span><h3>{item.name}</h3></div><p>{item.values}</p><dl><div><dt>Gamut</dt><dd className={item.inGamut===true?"pass":item.inGamut===false?"review":"pending"}>{item.inGamut===true?"IN GAMUT":item.inGamut===false?"MAPPED":"PROFILE NEEDED"}</dd></div><div><dt>Round-trip ΔE00</dt><dd>{item.deltaE00===null?"—":item.deltaE00.toFixed(3)}</dd></div></dl><small>{item.note}</small></article>)}</div>
      <div className="comparison-assessment"><strong>Outcome</strong><p>FOGRA55 is listed as the standard ECG feasibility reference and remains parallel to the fixed Atlas identity. No ECG device values are claimed until its profile transform is bound; production sign-off still requires an actual ICC profile, intent, hash and physical QC.</p></div>
    </section>}
    <section className="extensions-section" aria-labelledby="extensions-title">
      <div className="extensions-intro">
        <div><p className="eyebrow">PROFESSIONAL EXPANSION PATH</p><h2 id="extensions-title">What else can the wheel offer?</h2></div>
        <p>The Atlas identity remains fixed. Each extension adds a documented design or production decision around it.</p>
      </div>
      <div className="extension-grid">
        <article><span className="extension-tag next">SECOND WAVE · LIVE</span><h3>Multi-profile comparison</h3><p>Compare the same Atlas identity in sRGB, Display P3 and Adobe RGB, with FOGRA55 CMYKOGV documented as the standard ECG feasibility layer.</p><small>FOGRA55 listed · profile-bound ECG calculation next</small></article>
        <article><span className="extension-tag next">LIVE · PROFILE INPUT</span><h3>Customer ICC profiles</h3><p>Validate press, monitor or printer profiles locally, bind their hash, intent and tolerance, and calculate values when the profile matches an available transform.</p><small>sRGB calculation live · arbitrary ICC transform engine next</small></article>
        <article><span className="extension-tag next">IN PROGRESS</span><h3>Professional palette packages</h3><p>Export named identities with master Lab, ICC output and profile provenance for design and production handoff.</p><small>JSON and CSS live · ASE and PDF next</small></article>
        <article><span className="extension-tag">QUALITY CONTROL</span><h3>Measured sample check</h3><p>Compare a physical sample measurement with its selected Atlas target and keep measured QC separate from the original identity.</p><small>Pass, review or fail against an agreed ΔE00</small></article>
        <article><span className="extension-tag next">IN PROGRESS</span><h3>Contrast-aware palettes</h3><p>Evaluate white and dark text and preview the selected output for three common colour-vision deficiencies.</p><small>Single-colour checks live · palette conflicts next</small></article>
        <article><span className="extension-tag">TRACEABILITY</span><h3>Audit-ready colour passport</h3><p>Create a compact manifest containing Atlas row, master version, profile hash, rendering intent, timestamp and production result.</p><small>One identity · documented production history</small></article>
      </div>
      <p className="extensions-note"><strong>Recommended sequence:</strong> accessibility and ASE/CSS handoff → multi-profile comparison → customer ICC import → measured sample validation.</p>
    </section>
    <section className="ionos-embed-section" aria-labelledby="ionos-embed-title">
      <div className="ionos-embed-heading">
        <div><p className="eyebrow">WEBSITE INTEGRATION</p><h2 id="ionos-embed-title">Kann ich die Seite in IONOS einbinden?</h2></div>
        <p><strong>Ja.</strong> Die aktuelle Bereitstellung kann als responsiver iFrame in ein HTML-Element Ihrer IONOS-Seite eingebettet werden.</p>
      </div>
      <div className="ionos-embed-grid">
        <div className="ionos-embed-steps"><span>EMPFOHLENER WEG</span><ol><li>In IONOS einen möglichst breiten Seitenabschnitt anlegen.</li><li>Ein HTML- oder Code-Element einfügen.</li><li>Den Einbettungscode einsetzen und veröffentlichen.</li></ol><p>Für den vollständigen Farbkreis empfehlen wir mindestens 1.100 px Höhe. Auf kleinen Bildschirmen bleibt die Anwendung innerhalb des Rahmens responsiv.</p></div>
        <div className="ionos-code"><span>EINBETTUNGSCODE</span><code>{'<iframe\n  src="https://atlas-clarus-reference-wheel.arbe-lambda-star.chatgpt.site"\n  title="ATLAS Clarus Reference Wheel"\n  width="100%"\n  height="1100"\n  loading="lazy"\n  style="border:0; max-width:100%;"\n></iframe>'}</code></div>
      </div>
      <div className="ionos-embed-note"><strong>Wichtig</strong><p>ICC-Dateien werden weiterhin nur lokal im Browser verarbeitet. Falls Ihr IONOS-Tarif kein eigenes HTML zulässt oder iFrames filtert, verlinken Sie stattdessen direkt auf die Anwendung.</p><a href="https://atlas-clarus-reference-wheel.arbe-lambda-star.chatgpt.site" target="_blank" rel="noreferrer">Farbkreis in eigenem Fenster öffnen ↗</a></div>
    </section>
    <footer><span>Reference source: arbe-lambda-masterPKL-v1.0.1</span><span>Output profile: {profile?.name} · round-trip threshold ΔE00 ≤ {profile?.roundTripToleranceDeltaE00}</span></footer>
  </main>;
}
