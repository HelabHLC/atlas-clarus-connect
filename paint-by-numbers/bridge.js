import {unzipSync} from 'fflate';
import {FacetBorderTracer} from './vendor/src/facetBorderTracer.ts';
import {FacetBorderSegmenter} from './vendor/src/facetBorderSegmenter.ts';
import {FacetLabelPlacer} from './vendor/src/facetLabelPlacer.ts';
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
 // Continue the upstream pipeline after its k-means entry point.
 // No pixel cleanup/facet deletion: those operations would change protected assignments.
 const before=indices.slice();
 await FacetBorderTracer.buildFacetBorderPaths(facets);
 await FacetBorderSegmenter.buildFacetBorderSegments(facets,0);
 await FacetLabelPlacer.buildFacetLabelBounds(facets);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(map.get(x,y)!==before[y*w+x])fail('Generator changed a colour assignment.');
 const regions=[],labels=[],paths=[];
 const ordered=facets.facets.filter(Boolean).sort((a,b)=>b.pointCount-a.pointCount||a.id-b.id);
 for(const f of ordered){
 const points=f.getFullPathFromBorderSegments(true);
 if(points.length<3||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))fail('Invalid generator contour in region '+f.id);
 // Upstream wall coordinates are centred on source pixels; SVG pixels start at corners.
 const d=points.map((p,i)=>`${i?'L':'M'}${p.x+.5} ${p.y+.5}`).join('')+'Z';
 const number=f.color+1,tiny=f.pointCount<9;
 let x=(f.labelBounds.minX+f.labelBounds.maxX)/2+.5,y=(f.labelBounds.minY+f.labelBounds.maxY)/2+.5;
 let labelEngine='DRAKARAH_POLYLABEL';
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=w||y>=h||facets.facetMap.get(Math.floor(x),Math.floor(y))!==f.id){
 // Never put a number into a neighbouring protected island if upstream geometry is degenerate.
 let best=Infinity;const cx=(f.bbox.minX+f.bbox.maxX)/2,cy=(f.bbox.minY+f.bbox.maxY)/2;
 for(let py=f.bbox.minY;py<=f.bbox.maxY;py++)for(let px=f.bbox.minX;px<=f.bbox.maxX;px++)if(facets.facetMap.get(px,py)===f.id){const distance=(px-cx)**2+(py-cy)**2;if(distance<best){best=distance;x=px+.5;y=py+.5;}}
 labelEngine='SOURCE_REGION_PIXEL_FALLBACK';
 }
 const span=Math.min(f.labelBounds.width,f.labelBounds.height),font=Math.max(.18,Math.min(tiny?.45:3,Number.isFinite(span)?span/(String(number).length*2):.45));
 regions.push({region:f.id,number,pixels:f.pointCount,label:{x,y,engine:labelEngine},tiny,contour_points:points.length});
 labels.push(`<text x="${x}" y="${y}" font-size="${font}" text-anchor="middle" dominant-baseline="central">${number}</text>`);
 paths.push({d,color:palette[f.color].hex,id:f.id});
 }
 const header=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w*4}" height="${h*4}"><title>ATLAS × drakarah Paint by Numbers</title>`;
 const worksheet=header+`<rect width="${w}" height="${h}" fill="white"/><g stroke="black" stroke-width="0.08" stroke-linejoin="round">${paths.map(p=>`<path data-region="${p.id}" d="${p.d}" fill="white"/>`).join('')}</g><g fill="black" font-family="sans-serif">${labels.join('')}</g></svg>`;
 const coloured=header+paths.map(p=>`<path data-region="${p.id}" d="${p.d}" fill="${p.color}" stroke="${p.color}" stroke-width="0.02"/>`).join('')+'</svg>';
 const legend='<!doctype html><meta charset="utf-8"><title>ATLAS colour legend</title><h1>ATLAS Malnummern</h1><p>Referenz-RGB; keine Farbrezeptur. Kleine Flächen: '+regions.filter(f=>f.tiny).length+'. SVG bei Bedarf vergrößern. Unbenutzte geschützte Referenzen bleiben in der Palette.</p><table><tr><th>Nummer</th><th>Farbe</th><th>Atlas</th><th>RGB</th><th>Pixel</th><th>Geschützt</th></tr>'+palette.map(p=>`<tr><td>${p.index+1}</td><td style="background:${p.hex};width:50px"></td><td>${escape(p.reference)}</td><td>${p.rgb.join(', ')}</td><td>${p.pixel_count}</td><td>${p.protected?'Ja':''}</td></tr>`).join('')+'</table>';
 return {worksheet,coloured,legend,mapping:{schema:'atlas-paint-by-numbers/0.3',upstream_commit:'8c717508798525cca25548f1fb52e73025f0661a',master_sha256:r.master_sha256,source:r.source,output_rgba_sha256:r.output_rgba_sha256,width:w,height:h,palette:palette.map(p=>({...p,number:p.index+1})),regions,pipeline:['ATLAS_RGB_WEIGHTED_MEDOIDS_V1','DRAKARAH_FACET_CREATOR','DRAKARAH_BORDER_TRACER','DRAKARAH_BORDER_SEGMENTER','DRAKARAH_LABEL_PLACER'],policy:'NO_REQUANTIZATION_NO_PIXEL_CLEANUP_NO_FACET_REMOVAL',border_segment_halving:0}};
}

export async function reduceImage({rgba,width,height,k,lockedIds=[],sourceBytes,sourceName='image'}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>1048576)fail('Bild zu groß: maximal 1.048.576 Pixel. Bitte vorher verkleinern.');
 if(!(rgba instanceof Uint8Array)||rgba.length!==width*height*4)fail('Ungültige Bilddaten.');
 for(let i=3;i<rgba.length;i+=4)if(rgba[i]!==255)fail('Diese Testversion benötigt ein vollständig deckendes Bild. Transparenz wird nicht automatisch verändert.');
 const root=typeof window==='undefined'?globalThis:window;
 const result=root.ATLAS_COLOUR_REDUCTION.reduce({rgba,width,height,k,lockedIds,colors:master.colors,master:master.master_sha256});
 return {pixels:result.pixels,indices:result.indices,report:{...result.report,source:{name:sourceName,file_sha256:await sha(sourceBytes),input_rgba_sha256:await sha(rgba)},output_rgba_sha256:await sha(result.pixels)}};
}
const binding=(typeof window==='undefined'?globalThis:window).ATLAS_CLARUS_PKL_IMAGE.create(master.colors,master.master_sha256);
export function imageReference(rgb){const row=binding.nearest(rgb).row;return {id:row.id,reference:row.ref,rgb:row.rgb.slice()};}
