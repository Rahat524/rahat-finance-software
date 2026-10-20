"use strict";
const $=id=>document.getElementById(id);
let data=null, busy=false, user=null, editor=null, activeCell=null;
const selectedRows=new Set();
const editable=new Set([0,1,2,3,4,5,6,9,10,11,12,13,14,15,16]);
const numeric=new Set([5,6,7,9,10,11,12,13,14,15,16,17,18,19]);
const money=new Intl.NumberFormat("en-PK",{minimumFractionDigits:2,maximumFractionDigits:2});
const can=name=>Boolean(user&&(user.role_name==="Super Admin"||user.permissions.includes(name)));
function error(message){$("error").textContent=message;$("error").hidden=!message;}
async function api(url,options={}){
 const response=await fetch(url,{...options,headers:{...(options.body instanceof FormData?{}:{"Content-Type":"application/json"}),...(data?{"X-HC-CSRF":data.csrf}:{}),...options.headers}});
 const result=await response.json().catch(()=>({error:"Server returned an unexpected response"}));
 if(!response.ok)throw new Error(result.error||"Request failed");
 return result;
}
function display(value,col){
 if(value===""||value===null||value===undefined)return "";
 if(col===0||col===1){const [y,m,d]=value.split("-");return d+"-"+["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m-1]+"-"+y.slice(-2);}
 if(col===6&&typeof value==="number")return value===0?money.format(0):"-"+money.format(Math.abs(value));
 if(numeric.has(col)&&typeof value==="number")return col===19?String(value):money.format(value);
 return String(value);
}
function filtered(){
 const q=$("search").value.trim().toLowerCase(),from=$("from").value,to=$("to").value;
 return data.rows.map((row,index)=>({row,index})).filter(({row})=>row.slice(0,7).some(v=>v!==""&&v!==null)&&(!q||row.some(v=>String(v).toLowerCase().includes(q)))&&(!from||row[1]>=from)&&(!to||row[1]<=to)).sort((a,b)=>(a.row[1]||a.row[0]||"").localeCompare(b.row[1]||b.row[0]||"")||a.index-b.index);
}
function render(printAll=false){
 if(!data)return;
 const t=data.template;
 document.documentElement.style.setProperty("--last",t.last_row_color); document.documentElement.style.setProperty("--last-text",t.last_row_text||"#fff");
 $("title").textContent=t.title;
 const pairs=[["Approved Limit",data.summary.limit],["Total Receipts",data.summary.receipts],["Total Payments",data.summary.payments],["Opening Balance",data.summary.opening],["Theft Cash",data.summary.theft],["LOST & FOUND.",data.summary.lost],["Closing Balance",data.summary.closing],["Deposit - Alfalah 66",data.summary.alfalah66],["Remaining Amount",data.summary.remaining],["Unclaimed Salary Received",data.summary.unclaimed_received],["Unclaimed Salary Deposited",data.summary.unclaimed_deposited],["Unclaimed Salary Remaining",data.summary.unclaimed_remaining]];
 $("summary").replaceChildren(...pairs.map(([label,value])=>{const el=document.createElement("div");el.className="summary-item";const a=document.createElement("span"),b=document.createElement("strong");a.textContent=label;b.textContent=money.format(value);el.append(a,b);return el;}));
 const show=$("collections").checked,cols=t.headers.map((_,i)=>i).filter(i=>show||!t.hidden.includes(i));
 $("colgroup").replaceChildren();
 let width=76;const ncol=document.createElement("col");ncol.style.width="76px";$("colgroup").append(ncol);
 cols.forEach(i=>{let c=document.createElement("col");let w=Math.max(t.widths[i],i===8?115:85)*Number($("zoom").value);c.style.width=w+"px";width+=w;$("colgroup").append(c);});
 $("ledger").style.width=width+"px";
 const letters=document.createElement("tr"),heads=document.createElement("tr");letters.className="letters";
 const blank=document.createElement("th");blank.textContent="";letters.append(blank);const numberHead=document.createElement("th");numberHead.textContent="#";heads.append(numberHead);
 cols.forEach(i=>{let a=document.createElement("th"),b=document.createElement("th");a.textContent=String.fromCharCode(65+i);b.textContent=t.headers[i];b.scope="col";letters.append(a);heads.append(b);});
 $("thead").replaceChildren(letters,heads);
 const all=filtered();
 const visible=all,last=new Set(data.last_rows);
 if(can('cash_import')&&!printAll){
  const choices=all.filter(x=>x.index>0),check=document.createElement('input');check.type='checkbox';check.title='Select all visible entries';check.setAttribute('aria-label','Select all visible entries');
  check.checked=choices.length>0&&choices.every(x=>selectedRows.has(x.index));check.indeterminate=!check.checked&&choices.some(x=>selectedRows.has(x.index));check.disabled=busy||!choices.length;
  check.onchange=()=>{choices.forEach(x=>check.checked?selectedRows.add(x.index):selectedRows.delete(x.index));render();};numberHead.replaceChildren(check);
 }
 const frag=document.createDocumentFragment();
 visible.forEach(({row,index})=>{
  const tr=document.createElement("tr");if(last.has(index))tr.className="last-date";
  const n=document.createElement("td");n.className="row-number";n.textContent=index+6;
  if(index>0&&can('cash_import')&&!printAll){const check=document.createElement('input');check.type='checkbox';check.checked=selectedRows.has(index);check.disabled=busy;check.setAttribute('aria-label','Select entry '+(index+6));check.onchange=()=>{check.checked?selectedRows.add(index):selectedRows.delete(index);render();};n.prepend(check);}
  if(selectedRows.has(index))tr.classList.add('selected-entry');
  if(index>0&&can("cash_import")){n.title="Delete this row (previous version kept)";n.ondblclick=async e=>{if(e.target instanceof HTMLInputElement)return;if(confirm("Delete this ledger entry? Its previous version is kept in history.")){try{await change({action:"delete",row:index});}catch(e){error(e.message);}}};}tr.append(n);
  cols.forEach(col=>{
   const td=document.createElement("td");td.textContent=display(row[col],col);td.dataset.row=index;td.dataset.col=col;td.tabIndex=0;td.addEventListener("focus",()=>{activeCell={index,col};});td.addEventListener("keydown",e=>cellKey(e,index,col));
   if(numeric.has(col))td.classList.add("num");if(col<2)td.classList.add("date");
   if(editable.has(col)&&can("cash_import")){td.classList.add("editable");td.title="Double-click or press F2 to edit";td.addEventListener("dblclick",()=>edit(td,index,col));}
   else{td.classList.add("computed");td.title=editable.has(col)?"View only":"Calculated automatically";}
   if(col===8){td.classList.add(row[col]==="Limit Exceed"?"limit-exceed":row[col]==="Limit Match"?"limit-match":"below-limit");}
   tr.append(td);
  });frag.append(tr);
 });
 if(!visible.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=cols.length+1;td.className="empty";td.textContent=data.rows.length?"No entries match these filters.":"Import your HC Ledger Excel file to load the original entries, opening balance and offset accounts.";tr.append(td);frag.append(tr);}
 if(can('cash_import')&&!printAll){
  const tr=document.createElement('tr');tr.className='append-row';
  const label=document.createElement('td');label.className='row-number';label.textContent='+';tr.append(label);
  cols.forEach(col=>{
   const td=document.createElement('td');td.dataset.row=data.rows.length;td.dataset.col=col;td.tabIndex=0;
   if(editable.has(col)){td.className='editable';td.title='Paste Excel rows here to add new entries';td.ondblclick=entry;}
   else td.className='computed';
   td.addEventListener('focus',()=>{activeCell={index:data.rows.length,col};});
   td.addEventListener('keydown',e=>cellKey(e,data.rows.length,col));tr.append(td);
  });frag.append(tr);
 }
 $("tbody").replaceChildren(frag);
 $("rowCount").textContent=all.length+" of "+data.rows.length+" entries · balances use the complete ledger";
 $('deleteSelected').textContent='Delete selected ('+selectedRows.size+')';$('deleteSelected').disabled=!can('cash_import')||busy||!selectedRows.size;
 $("file").disabled=!can("cash_import")||busy;$("add").disabled=!can("cash_import")||busy;$("settings").disabled=!can("cash_import")||busy;
}
async function load(){
 const top=$("gridWrap").scrollTop,left=$("gridWrap").scrollLeft;
 data=await api("/api/hc-workbook");for(const index of selectedRows){if(!data.rows[index]||!data.rows[index].slice(0,7).some(v=>v!==''&&v!==null))selectedRows.delete(index);}render();$("gridWrap").scrollTop=top;$("gridWrap").scrollLeft=left;
 $("saveState").textContent="Saved on server · revision "+data.revision;
}
async function change(payload){
 if(busy)throw new Error("Wait for the current save to finish");
 busy=true;$("saveState").textContent="Saving…";
 try{await api("/api/hc-workbook",{method:"PATCH",body:JSON.stringify({...payload,revision:data.revision})});await load();error("");}
 catch(e){$("saveState").textContent="Not saved";throw e;}
 finally{busy=false;render();}
}
function offsetList(id,type){
 const list=$(id);list.replaceChildren(...(data.offsets[type]||[]).map(name=>{const o=document.createElement("option");o.value=name;return o;}));
}
function edit(td,index,col){
 if(busy||editor)return;
 let input;
 if(col===3){input=document.createElement("select");["","Payment","Receipt"].forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v||"Select type";input.append(o);});}
 else{input=document.createElement("input");input.type=col<2?"date":"text";if(numeric.has(col))input.inputMode="decimal";}
 input.className="cell-editor";input.value=data.rows[index][col]??"";
 if(col===4){input.setAttribute("list","offsets");offsetList("offsets",data.rows[index][3]);}
 td.replaceChildren(input);editor=input;input.focus();if(input.select&&col>=2)input.select();
 let done=false;input.cancelEdit=()=>{done=true;editor=null;};
 async function finish(save,move=null){if(done)return;done=true;editor=null;if(!save){render();focusCell(index,col);return;}const value=input.value;
  if(String(value)===String(data.rows[index][col]??"")){render();if(move)navigate(index,col,...move);else focusCell(index,col);return;}
  try{await change({action:"cell",row:index,col,value});if(move)navigate(index,col,...move);else focusCell(index,col);}catch(e){error(e.message);render();}
 }
 input.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key==="Tab"){e.preventDefault();e.stopPropagation();finish(true,e.key==="Tab"?[0,e.shiftKey?-1:1]:[e.shiftKey?-1:1,0]);}else if(e.key==="Escape"){e.preventDefault();finish(false);}});
 input.addEventListener("blur",()=>finish(true));
}
function entry(){
 const fields=$("entryFields");fields.replaceChildren();
 const defaults={0:new Date().toLocaleDateString("en-CA"),1:new Date().toLocaleDateString("en-CA"),3:"Receipt",2:data.rows.length?"":"Opening balance"};
 [...editable].forEach(col=>{
  if(data.template.hidden.includes(col)&&!$("collections").checked)return;
  let label=document.createElement("label");label.textContent=data.template.headers[col];if(col===2||col===4)label.className="wide";
  let input;
  if(col===3){input=document.createElement("select");["Receipt","Payment"].forEach(v=>{let o=document.createElement("option");o.value=v;o.textContent=v;input.append(o);});}
  else{input=document.createElement("input");input.type=col<2?"date":"text";if(numeric.has(col))input.inputMode="decimal";}
  input.name="c"+col;input.dataset.col=col;input.value=defaults[col]||"";
  if(col===4)input.setAttribute("list","entryOffsets");
  if(col<2)input.required=true;
  label.append(input);fields.append(label);
 });
 const type=fields.querySelector('[name="c3"]');type.addEventListener("change",()=>offsetList("entryOffsets",type.value));offsetList("entryOffsets",type.value);
 $("entryError").textContent="";$("entryDialog").showModal();
}
$("entryForm").addEventListener("submit",async e=>{
 e.preventDefault();const values=Array(20).fill("");new FormData(e.target).forEach((v,k)=>values[Number(k.slice(1))]=v);
 try{await change({action:"append",values});$("entryDialog").close();render();$("gridWrap").scrollTop=$("gridWrap").scrollHeight;}
 catch(err){$("entryError").textContent=err.message;}
});
$("settingsForm").addEventListener("submit",async e=>{e.preventDefault();try{await change({action:"settings",opening:$("opening").value,limit:$("limit").value});$("settingsDialog").close();}catch(err){$("settingsError").textContent=err.message;}});
$("file").addEventListener("change",async e=>{
 const file=e.target.files[0];if(!file)return;
 if(data.rows.length&&!confirm("Replace the online HC Ledger with this Excel file? The current version will be kept in database history.")){e.target.value="";return;}
 const form=new FormData();form.append("file",file);form.append("revision",data.revision);
 busy=true;$("saveState").textContent="Importing Excel…";render();
 try{await api("/api/hc-workbook/import",{method:"POST",body:form});selectedRows.clear();await load();error("");}
 catch(err){error(err.message);$("saveState").textContent="Import failed";}
 finally{busy=false;e.target.value="";render();}
});
$("history").onclick=async()=>{try{const h=await api('/api/hc-workbook/history');if(!h.entries.length){alert('No previous revisions yet.');return;}const choice=prompt('Available revisions:\n'+h.entries.map(r=>r.revision+' - '+r.created_at).join('\n')+'\nEnter the revision number to restore:');if(choice===null)return;const revision=Number(choice);if(!h.entries.some(r=>r.revision===revision))throw Error('Choose a listed revision');if(confirm('Restore revision '+revision+'? The current version will also be kept.'))await change({action:'restore',restore_revision:revision});}catch(e){error(e.message);}};
$("add").onclick=entry;
$("settings").onclick=()=>{$("opening").value=data.opening;$("limit").value=data.limit;$("settingsError").textContent="";$("settingsDialog").showModal();};
$("cancelSettings").onclick=()=>$("settingsDialog").close();
$("closeEntry").onclick=$("cancelEntry").onclick=()=>$("entryDialog").close();
["search","from","to"].forEach(id=>$(id).addEventListener("input",()=>{render();}));
$("collections").onchange=()=>render();
$("zoom").onchange=()=>{document.documentElement.style.setProperty("--zoom",$("zoom").value);render();};
$("refresh").onclick=()=>{if(!busy)load().catch(e=>error(e.message));};
$("full").onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(e){error("Full screen is unavailable in this browser.");}};
$("print").onclick=()=>{render(true);window.print();};
window.addEventListener("afterprint",()=>render());
(async()=>{try{user=await api("/api/me");await load();}catch(e){error(e.message+" — open the Finance dashboard and sign in.");$("saveState").textContent="Unable to load";$("add").disabled=$("settings").disabled=true;}})();

function visibleColumns(){return data.template.headers.map((_,i)=>i).filter(i=>$('collections').checked||!data.template.hidden.includes(i));}
function focusCell(index,col){
 const all=filtered(),pos=all.findIndex(x=>x.index===index);if(pos<0&&index!==data.rows.length)return;
 const td=$('tbody').querySelector('[data-row="'+index+'"][data-col="'+col+'"]');if(td){td.focus({preventScroll:true});td.scrollIntoView({block:'nearest',inline:'nearest'});}
}
function navigate(index,col,dy,dx){
 const all=[...filtered(),...(can('cash_import')?[{index:data.rows.length}]:[])],cols=visibleColumns();let r=all.findIndex(x=>x.index===index)+dy,c=cols.indexOf(col)+dx;
 if(c>=cols.length){c=0;r++;}if(c<0){c=cols.length-1;r--;}
 if(r>=0&&r<all.length)focusCell(all[r].index,cols[c]);
}
function cellKey(e,index,col){
 if(editor||busy)return;
 const moves={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0],Tab:[0,e.shiftKey?-1:1],Enter:[e.shiftKey?-1:1,0]};
 if(moves[e.key]){e.preventDefault();navigate(index,col,...moves[e.key]);}
 else if(e.key==='F2'&&editable.has(col)&&can('cash_import')){e.preventDefault();if(index===data.rows.length)entry();else edit(e.currentTarget,index,col);}
}
function clipboardRows(text){
 const rows=[[]];let value='',quoted=false;
 for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'&&(quoted||value==='')){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}
 else if(!quoted&&(ch==='\t'||ch==='\n'||ch==='\r')){rows[rows.length-1].push(value);value='';if(ch!=='\t'){if(ch==='\r'&&text[i+1]==='\n')i++;rows.push([]);}}
 else value+=ch;}
 rows[rows.length-1].push(value);while(rows.length&&rows[rows.length-1].every(v=>v===''))rows.pop();return rows;
}
$('ledger').addEventListener('paste',async e=>{
 if(!can('cash_import')||busy||!activeCell)return;
 const text=e.clipboardData.getData('text/plain');if(editor&&!/[\t\r\n]/.test(text))return;
 e.preventDefault();e.stopPropagation();
 try{
 let rows=clipboardRows(text);if(!rows.length)return;
 let {index,col}=activeCell;const appending=index===data.rows.length;
 // A copied row-number column is a label, never ledger data.
 if(col===0&&rows.every(r=>r.length>=8&&/^\d+$/.test(r[0].trim())&&/[-/]/.test(r[1])))rows=rows.map(r=>r.slice(1));
 const width=rows[0].length;if(rows.some(r=>r.length!==width))throw Error('Each pasted row must have the same columns');
 const cols=Array.from({length:width},(_,n)=>col+n);if(cols.at(-1)>19)throw Error('Pasted data extends beyond the last column');
 const all=filtered(),start=all.findIndex(x=>x.index===index);let append=data.rows.length;
 if(start<0&&index!==data.rows.length)throw Error('Select a ledger cell before pasting');
 const targets=rows.map((_,i)=>index===data.rows.length?append++:(all[start+i]?.index??append++));
 if(editor){editor.cancelEdit();}await change({action:'paste',rows,cols,targets});focusCell(appending?data.rows.length:index,col);
 }catch(err){error(err.message);}
});

$('deleteSelected').onclick=async()=>{
 if(busy||!selectedRows.size)return;
 const rows=[...selectedRows];if(!confirm('Delete '+rows.length+' selected entries? The previous revision will be kept in History.'))return;
 try{await change({action:'delete_many',rows});selectedRows.clear();activeCell=null;render();}catch(e){error(e.message);}
};
