import { createColourRecord } from "./reference-record.mjs";
import { requireCataloguedOutputProfile } from "./icc-catalog-guard.mjs";
import { captureLittleCmsRoundTrip } from "./lcms-roundtrip-bridge.mjs";
import { compareRoundTripSrgb } from "./colour-metrics.mjs";

/** Browser integration: uses the existing print-preview-worker.js, unchanged.
 * Supply catalog metadata and the actual bytes loaded locally by the user.
 * A matching hash is mandatory; the worker performs the LittleCMS transform.
 */
export async function runIccBrowserIntegration({
  workerUrl, catalog, profileId, profileBytes, sourceRgb,
  hlcAddress, substrate, intent = "Relative colorimetric", bpc = false,
  independentExpectedRgb = null, toleranceChannels = 1
}) {
  if (typeof Worker !== "function" || !globalThis.crypto?.subtle) throw Error("Secure browser with Worker and SubtleCrypto required");
  if (!(profileBytes instanceof Uint8Array)) throw TypeError("ICC bytes required");
  if (!Array.isArray(sourceRgb) || sourceRgb.length !== 3 ||
      !sourceRgb.every(x => Number.isInteger(x) && x >= 0 && x <= 255)) throw TypeError("sRGB8 source required");
  const digest = await crypto.subtle.digest("SHA-256", profileBytes);
  const hash = Array.from(new Uint8Array(digest), b=>b.toString(16).padStart(2,"0")).join("");
  const verified = requireCataloguedOutputProfile(catalog, profileId, hash, profileBytes.length);
  if (verified.outputPath !== "4C") throw TypeError("Current integration supports CMYK output profiles only");
  const record = createColourRecord({hlcAddress,sourceRgb});
  const resolvedWorkerUrl = workerUrl || createEmbeddedIccWorkerUrl();
  const worker = new Worker(resolvedWorkerUrl);
  let result;
  try {
    result = await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(Error("LittleCMS worker timed out")),30000);
      worker.onmessage=({data})=>{
        if(data?.type==="result"){clearTimeout(timeout);resolve(data.result);}
        else if(data?.type==="error"){clearTimeout(timeout);reject(Error(data.message));}
      };
      worker.onerror=e=>{clearTimeout(timeout);reject(Error(e.message || "Worker failed"));};
      worker.postMessage({
        path:"4C",width:1,height:1,pixels:new Uint8Array([...sourceRgb,255]),
        profile:profileBytes,intent,bpc
      });
    });
  } finally {worker.terminate(); if (!workerUrl) URL.revokeObjectURL(resolvedWorkerUrl);}
  const output=captureLittleCmsRoundTrip(record,result,{
    profileId,profileSha256:hash,substrate,intent,bpc
  });
  const comparison=compareRoundTripSrgb(output);
  let independentCheck={status:"NOT_PROVIDED"};
  if(independentExpectedRgb !== null){
    if(!Array.isArray(independentExpectedRgb) || independentExpectedRgb.length!==3 ||
       !independentExpectedRgb.every(v=>Number.isInteger(v)&&v>=0&&v<=255) ||
       !Number.isInteger(toleranceChannels)||toleranceChannels<0) throw TypeError("Invalid independent reference");
    const errors=output.output.returnedRgb8.map((v,i)=>Math.abs(v-independentExpectedRgb[i]));
    independentCheck={status:errors.every(v=>v<=toleranceChannels)?"PASS":"FAIL",
      expectedRgb8:[...independentExpectedRgb],channelAbsoluteErrors:errors,toleranceChannels};
  }
  return {record:output,comparison,independentCheck};
}

/** Matches the established offline Browser Edition embedded-worker packaging. */
export function createEmbeddedIccWorkerUrl() {
 const element=globalThis.document?.querySelector("#atlas-print-worker-source");
 if(!element)throw Error("Embedded ICC worker not found in this Browser Edition bundle");
 const source=JSON.parse(element.textContent);
 if(typeof source!=="string" || !source.includes("ATLAS_LOAD_LCMS"))throw Error("Invalid embedded LittleCMS worker source");
 return URL.createObjectURL(new Blob([source],{type:"text/javascript"}));
}
