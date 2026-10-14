import {unzipSync} from 'fflate';
import {FacetCreator} from './vendor/src/facetCreator.ts';
import {Uint8Array2D} from './vendor/src/structs/typedarrays.ts';
import '../browser-bundle/src/pkl-image-binding.js';
import '../browser-bundle/src/colour-reduction.js';
import master from '../hover-library/data/colors.json';
const decoder=new TextDecoder(), fail=m=>{throw Error(m);};
const sha=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export async function readPackage(bytes){
 if(bytes.length>32*1024*1024)fail('ZIP exceeds 32 MiB.');
 let total=0;
 const files=unzipSync(bytes,{filter:e=>{total+=e.originalSize;if(total>64*1024*1024)fail('Expanded ZIP exceeds 64 MiB.');return true;}});
 const json=n=>{if(!files[n])fail('Missing '+n);return JSON.parse(decoder.decode(files[n]));};
 const manifest=json('reduction-package-manifest.json'),r=json('reduction.json');
 if(manifest.schema!=='atlas-clarus-colour-reduction-package/1.0'||r.schema!=='atlas-clarus-colour-reduction/1.0')fail('Unsupported package.');
 for(const [name,hash] of Object.entries(manifest.files)){if(!files[name]||await sha(files[name])!==hash)fail('Checksum mismatch: '+name);}
 for(const name of ['reduction.json','input-rgba.bin','input-atlas-row-id.u16le','output-palette-index.u16le'])if(!manifest.files[name])fail('Unlisted required file: '+name);
 if(!Number.isInteger(r.width)||!Number.isInteger(r.height)||r.width<1||r.height<1||r.width*r.height>1048576)fail('Preview supports at most 1,048,576 pixels; no automatic resizing.');
 const rgba=files['input-rgba.bin'];
 if(rgba.length!==r.width*r.height*4)fail('Invalid input dimensions.');
 for(let i=3;i<rgba.length;i+=4)if(rgba[i]!==255)fail('This first preview requires an opaque image. Alpha is never flattened automatically.');
 if(r.master_sha256!==master.master_sha256||await sha(rgba)!==r.source.input_rgba_sha256)fail('Source/master binding mismatch.');
 const root=typeof window==='undefined'?globalThis:window;
 const calculated=root.ATLAS_COLOUR_REDUCTION.reduce({rgba,width:r.width,height:r.height,colors:master.colors,master:master.master_sha256,k:r.requested_colours,lockedIds:r.protected_ids});
 for(const field of ['method','palette','reference_mapping','selected_references','protected_ids'])if(!same(calculated.report[field],r[field]))fail('Reduction mismatch: '+field);
 for(const [name,ids] of [['input-atlas-row-id.u16le',calculated.assignments],['output-palette-index.u16le',calculated.indices]]){
 const actual=files[name],expected=root.ATLAS_COLOUR_REDUCTION.assignmentBytes(ids);
 if(actual.length!==expected.length||actual.some((v,i)=>v!==expected[i]))fail('Pixel assignment mismatch: '+name);
 }
 if(await sha(calculated.pixels)!==r.output_rgba_sha256)fail('Output RGB mismatch.');
 return {report:r,indices:calculated.indices};
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export async function generate({report:r,indices}){
 const {width:w,height:h,palette}=r;
 const map=new Uint8Array2D(w,h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)map.set(x,y,indices[y*w+x]);
 const facets=await FacetCreator.getFacets(w,h,map);
 // Exact pixel-edge outlines: no smoothing, cleanup, resize or facet deletion.
 const edges=[],labels=[],centres=new Map();
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 const id=facets.facetMap.get(x,y),f=facets.facets[id],cx=(f.bbox.minX+f.bbox.maxX)/2,cy=(f.bbox.minY+f.bbox.maxY)/2,d=(x-cx)**2+(y-cy)**2;
 if(!centres.has(id)||d<centres.get(id).d)centres.set(id,{x,y,d});
 if(x===0||map.get(x-1,y)!==map.get(x,y))edges.push(`M${x} ${y}v1`);
 if(y===0||map.get(x,y-1)!==map.get(x,y))edges.push(`M${x} ${y}h1`);
 }
 edges.push(`M${w} 0v${h}`,`M0 ${h}h${w}`);
 const regions=[];
 for(const f of facets.facets){const c=centres.get(f.id),number=f.color+1,tiny=f.pointCount<9;
 regions.push({region:f.id,number,pixels:f.pointCount,label:{x:c.x+.5,y:c.y+.5},tiny});
 labels.push(`<text x="${c.x+.5}" y="${c.y+.5}" font-size="${tiny?.45:.7}" text-anchor="middle" dominant-baseline="central">${number}</text>`);
 }
 const header=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w*4}" height="${h*4}"><title>ATLAS Paint by Numbers</title>`;
 const worksheet=header+`<rect width="${w}" height="${h}" fill="white"/><path d="${edges.join('')}" fill="none" stroke="black" stroke-width="0.08"/><g fill="black" font-family="sans-serif">${labels.join('')}</g></svg>`;
 const runs=[];
 for(let y=0;y<h;y++){let x=0;while(x<w){const start=x,index=indices[y*w+x];while(x<w&&indices[y*w+x]===index)x++;runs.push(`<rect x="${start}" y="${y}" width="${x-start}" height="1" fill="${palette[index].hex}"/>`);}}
 const coloured=header+`<g shape-rendering="crispEdges">${runs.join('')}</g></svg>`;
 const legend='<!doctype html><meta charset="utf-8"><title>ATLAS colour legend</title><h1>ATLAS Malnummern</h1><p>Referenz-RGB; keine Farbrezeptur. Kleine Flächen: '+regions.filter(f=>f.tiny).length+'. SVG bei Bedarf vergrößern. Unbenutzte geschützte Referenzen bleiben in der Palette.</p><table><tr><th>Nummer</th><th>Farbe</th><th>Atlas</th><th>RGB</th><th>Pixel</th><th>Geschützt</th></tr>'+palette.map(p=>`<tr><td>${p.index+1}</td><td style="background:${p.hex};width:50px"></td><td>${escape(p.reference)}</td><td>${p.rgb.join(', ')}</td><td>${p.pixel_count}</td><td>${p.protected?'Ja':''}</td></tr>`).join('')+'</table>';
 return {worksheet,coloured,legend,mapping:{schema:'atlas-paint-by-numbers/0.1',upstream_commit:'8c717508798525cca25548f1fb52e73025f0661a',master_sha256:r.master_sha256,source:r.source,output_rgba_sha256:r.output_rgba_sha256,width:w,height:h,palette:palette.map(p=>({...p,number:p.index+1})),regions,policy:'EXACT_PIXEL_EDGES_NO_REQUANTIZATION_NO_FACET_REMOVAL'}};
}
