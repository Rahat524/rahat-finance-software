const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/hc_ledger.js','utf8');
const code=source.slice(source.indexOf('async function deleteEntries('),source.indexOf("$('deleteSelected').onclick="));
(async()=>{
 const payloads=[],ctx={busy:false,can:()=>true,selectedRows:new Set([1,3,5]),confirm:()=>true,change:async p=>payloads.push(p),render:()=>{},error:e=>{throw Error(e)},activeCell:null};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 await ctx.deleteEntries(3);assert.equal(JSON.stringify(payloads[0]),JSON.stringify({action:'delete_many',rows:[1,3,5]}));assert.equal(ctx.selectedRows.size,0);
 ctx.selectedRows=new Set([2,4]);await ctx.deleteEntries();assert.equal(String(payloads[1].rows),'2,4');
 ctx.selectedRows=new Set([6,7]);ctx.confirm=()=>false;await ctx.deleteEntries();assert.equal(payloads.length,2);assert.equal(ctx.selectedRows.size,2);
 console.log('Selected-entry delete checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
