const fs=require('fs'),path=require('path'),vm=require('vm');
const runtime=path.resolve(process.argv[2]),out=path.join(runtime,'digital/libraries'),box={window:{}};
for(const name of ['assets/atlas-data.js','digital/libraries.js'])vm.runInNewContext(fs.readFileSync(path.join(runtime,name),'utf8'),box);
const C=require('./core.js'),ctx=C.context(box.window.ATLAS_CLARUS_DATA,box.window.ATLAS_DIGITAL_LIBRARY_DATA),summary={};fs.mkdirSync(out,{recursive:true});
for(const space of ['display-p3','prophoto-rgb']){
  const library=ctx.exportLibrary(space);
  fs.writeFileSync(path.join(out,space+'.json'),JSON.stringify(library)+'\n');
  summary[space]={source_total:library.total,master:library.master_count,additional_digital:library.additional_digital_count,computed_inside:library.computed_inside,computed_outside:library.total-library.computed_inside};
}
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
