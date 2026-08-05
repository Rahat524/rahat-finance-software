let currentUser=null,editingVendorId=null,editingUserId=null;const ALL_PERMISSIONS=["dashboard_view","customer_view","customer_import","customer_delete","duplicate_view","duplicate_delete","vendor_view","vendor_add","vendor_edit","vendor_delete","ledger_view","ledger_add","ledger_delete","cash_view","cash_import","cash_delete","cashier_view","cashier_import","cashier_delete","export_data","backup_restore","user_manage","audit_view"];

const PAGE_SHORTCUTS={
  DS:"dashboard",
  CC:"corporate",
  VL:"vendorLedger",
  HC:"headCash",
  PC:"pettyCash",
  DD:"duplicates",
  SV:"vendors",
  DE:"deletedCash",
  UR:"users",
  AL:"audit",
  SB:"settings",
  CD:"cashierDashboard",
  CL:"cashierClosing",
  CS:"cashierShortage",
  CN:"cashierNotes"
};
function openPageById(pageId){
  const btn=[...document.querySelectorAll(".nav")].find(b=>b.dataset.page===pageId);
  if(!btn||btn.classList.contains("hidden")||btn.style.display==="none"){
    alert("You do not have permission to open this page.");
    return false;
  }
  btn.click();
  btn.scrollIntoView({block:"nearest"});
  window.scrollTo({top:0,left:0,behavior:"smooth"});
  return true;
}
function handleGlobalShortcut(event){
  if(event.key!=="Enter")return;
  const input=event.target;
  const code=(input.value||"").trim().toUpperCase();
  const pageId=PAGE_SHORTCUTS[code];
  if(!pageId)return;
  event.preventDefault();
  if(openPageById(pageId)){
    input.value="";
    filterCurrentPage();
  }
}
function can(p){return currentUser&&currentUser.permissions.includes(p)}
function applyPermissions(){document.querySelectorAll("[data-permission]").forEach(el=>el.classList.toggle("hidden",!can(el.dataset.permission)));}
const $=id=>document.getElementById(id);const money=n=>"Rs. "+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});async function api(url,opt={}){const r=await fetch(url,opt);const j=await r.json();if(!r.ok)throw new Error(j.error||"Request failed");return j}async function login(){try{const r=await api("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:$("loginUser").value,password:$("loginPass").value})});if(r.ok){$("loginPass").value="";$("loginScreen").classList.add("hidden");$("app").classList.remove("hidden");await init()}else $("loginMsg").textContent="Incorrect username or password"}catch(e){$("loginMsg").textContent=e.message}}async function logout(){await api("/api/logout",{method:"POST"});location.reload()}document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(b.dataset.page).classList.add("active");if($("pageTitle"))$("pageTitle").textContent=b.textContent});async function init(){currentUser=await api("/api/me");applyPermissions();if($("welcomeUser"))$("welcomeUser").textContent=`Welcome ${currentUser.full_name} — ${currentUser.role_name}`;const jobs=[loadNetwork()];if(can("dashboard_view"))jobs.push(loadDashboard());if(can("customer_view"))jobs.push(loadCustomers(),loadCorporate());if(can("duplicate_view"))jobs.push(loadDuplicates());if(can("vendor_view"))jobs.push(loadVendors());if(can("ledger_view"))jobs.push(loadVendorLedger());if(can("cash_view"))jobs.push(loadCash("Head Cash"),loadCash("Petty Cash"),loadDeletedCash());if(can("cashier_view"))jobs.push(loadCashierDashboard(),loadCashierClosing(),loadCashierShortage(),loadCashierNotes(),loadCashierEmployees());if(can("user_manage"))jobs.push(loadUsers());if(can("audit_view"))jobs.push(loadAudit());await Promise.all(jobs);$("txDate").value=new Date().toISOString().slice(0,10);renderPermissionGrid();setupBulkEntry()}async function loadDashboard(){const d=await api("/api/dashboard");const set=(id,v)=>{const el=$(id);if(el)el.textContent=v};set("dCustomers",d.customer_count);set("dBalance",money(d.customer_balance));set("dDuplicates",d.duplicate_documents);set("dVendors",d.vendor_count);set("dVendorPending",money(d.vendor_pending));set("dHeadCash",money(d.head_cash_balance));set("dPettyCash",money(d.petty_cash_balance))}async function loadCustomers(){const rows=await api("/api/customers");const options='<option value="">All Customers</option>'+rows.map(r=>`<option value="${r.code}">${r.code} - ${r.name}</option>`).join("");$("corpCustomer").innerHTML=options}
async function updateLedgerSummary(prefix,module,params={}){
 const p=new URLSearchParams({module,...params});
 const d=await api('/api/ledger-summary?'+p);
 const set=(id,val)=>{const el=$(id);if(el)el.textContent=money(val)};
 set(prefix+'TotalDebit',d.debit);set(prefix+'TotalCredit',d.credit);set(prefix+'TotalBalance',d.balance);
}
async function loadCorporate(){
 const p=new URLSearchParams({q:$("corpSearch").value,code:$("corpCustomer").value,from:$("corpFrom").value,to:$("corpTo").value});
 const rows=await api("/api/customer-ledger?"+p);
 await updateLedgerSummary("corp","corporate",{q:$("corpSearch").value,code:$("corpCustomer").value,from:$("corpFrom").value,to:$("corpTo").value});
 let balances={};
 $("corpBody").innerHTML=rows.map(r=>{
   const code=r.customer_code||"";
   balances[code]=(balances[code]||0)+Number(r.debit||0)-Number(r.credit||0);
   return `<tr><td><input class="corpRow" type="checkbox" value="${r.id}"></td>
   <td>${r.customer_code||""}</td><td>${r.customer_name||""}</td>
   <td>${r.document_number||""}</td><td>${r.posting_date||""}</td><td>${r.text||""}</td>
   <td>${money(r.debit)}</td><td>${money(r.credit)}</td><td>${money(balances[code])}</td></tr>`;
 }).join("")||'<tr><td colspan="9">No records found</td></tr>';
}
async function loadDuplicates(){
 const rows=await api("/api/duplicates?q="+encodeURIComponent($("dupSearch").value));
 await updateLedgerSummary("dup","duplicates",{q:$("dupSearch").value});
 let balance=0;
 $("dupBody").innerHTML=rows.map(r=>{
   balance+=Number(r.debit||0)-Number(r.credit||0);
   return `<tr><td><input class="dupRow" type="checkbox" value="${r.id}"></td>
   <td>${r.document_number||""}</td><td>${r.posting_date||""}</td><td>${r.text||""}</td>
   <td>${money(r.debit)}</td><td>${money(r.credit)}</td><td>${money(balance)}</td><td>${r.duplicate_occurrences}</td></tr>`;
 }).join("")||'<tr><td colspan="8">No duplicate records</td></tr>';
}
$("corpUpload").onchange=async e=>{const f=e.target.files[0];if(!f)return;const fd=new FormData();fd.append("file",f);const r=await api("/api/import-corporate",{method:"POST",body:fd});alert(`Imported: ${r.imported}, Duplicate rows: ${r.duplicate_rows}, Non-customer rows skipped: ${r.skipped_non_customer_rows||0}`);await Promise.all([loadDashboard(),loadCorporate(),loadDuplicates()]);e.target.value=""};function downloadExport(m){location.href="/api/export/"+m}function downloadPdf(m){location.href="/api/pdf/"+m}async function loadVendors(){const rows=await api("/api/vendors");window.vendorRows=rows;$("vendorBody").innerHTML=rows.map(r=>`<tr><td>${r.vendor_code}</td><td>${r.vendor_name}</td><td>${money(r.security_deposit)}</td><td>${money(r.advance)}</td><td>${r.phone||""}</td><td>${r.status}</td><td>${can("vendor_edit")?`<button onclick="editVendor(${r.id})">Edit</button>`:""} ${can("vendor_delete")?`<button class="danger" onclick="deleteVendor(${r.id})">Delete</button>`:""}</td></tr>`).join("")||'<tr><td colspan="7">No vendors yet</td></tr>';const options='<option value="">Select Vendor</option>'+rows.filter(r=>r.status!=="Inactive").map(r=>`<option value="${r.vendor_code}|${r.vendor_name}">${r.vendor_code} - ${r.vendor_name}</option>`).join("");$("txVendor").innerHTML=options;$("ledgerVendor").innerHTML='<option value="">All Vendors</option>'+options.replace('<option value="">Select Vendor</option>','')}
function vendorPayload(){return {vendor_code:$("vCode").value.trim(),vendor_name:$("vName").value.trim(),security_deposit:$("vSecurity").value,advance:$("vAdvance").value,phone:$("vPhone").value,description:$("vDesc").value,status:$("vStatus").value}}
async function saveVendor(){if(!$("vCode").value.trim()||!$("vName").value.trim())return alert("Vendor code and name are required.");const url=editingVendorId?"/api/vendors/"+editingVendorId:"/api/vendors";await api(url,{method:editingVendorId?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(vendorPayload())});cancelVendorEdit();await Promise.all([loadVendors(),loadDashboard()])}
function editVendor(id){const r=window.vendorRows.find(x=>x.id===id);if(!r)return;editingVendorId=id;$("vCode").value=r.vendor_code;$("vName").value=r.vendor_name;$("vSecurity").value=r.security_deposit;$("vAdvance").value=r.advance;$("vPhone").value=r.phone||"";$("vDesc").value=r.description||"";$("vStatus").value=r.status;$("vendorSaveBtn").textContent="Update Vendor";$("vendorCancelBtn").classList.remove("hidden")}
function cancelVendorEdit(){editingVendorId=null;["vCode","vName","vSecurity","vAdvance","vPhone","vDesc"].forEach(id=>$(id).value="");$("vStatus").value="Active";$("vendorSaveBtn").textContent="Save Vendor";$("vendorCancelBtn").classList.add("hidden")}
async function deleteVendor(id){if(!confirm("Delete this vendor? If ledger entries exist, vendor will be marked Inactive to protect history."))return;const r=await api("/api/vendors/"+id,{method:"DELETE"});alert(r.mode==="inactivated"?"Vendor has ledger entries, so it was marked Inactive.":"Vendor deleted successfully.");await Promise.all([loadVendors(),loadDashboard()])}async function addVendorTx(){const [code,name]=($("txVendor").value||"|").split("|");if(!code)return alert("Select vendor");await api("/api/vendor-ledger",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({vendor_code:code,vendor_name:name,tx_date:$("txDate").value,tx_type:$("txType").value,description:$("txDesc").value,debit:$("txDebit").value,credit:$("txCredit").value,payment_status:$("txStatus").value})});["txDesc","txDebit","txCredit"].forEach(id=>$(id).value="");await Promise.all([loadVendorLedger(),loadDashboard()])}async function loadVendorLedger(){
 const code=($("ledgerVendor").value||"|").split("|")[0];
 const rows=await api("/api/vendor-ledger?code="+encodeURIComponent(code)+"&q="+encodeURIComponent($("vendorSearch").value));
 await updateLedgerSummary("vendorLedger","vendor",{code,q:$("vendorSearch").value});
 let balances={};
 $("vendorLedgerBody").innerHTML=rows.map(r=>{
   const vc=r.vendor_code||"";
   balances[vc]=(balances[vc]||0)+Number(r.debit||0)-Number(r.credit||0);
   return `<tr><td><input class="vendorLedgerRow" type="checkbox" value="${r.id}"></td>
   <td>${r.tx_date||""}</td><td>${r.vendor_code} - ${r.vendor_name}</td><td>${r.document_number||""}</td><td>${r.description||""}</td>
   <td>${money(r.debit)}</td><td>${money(r.credit)}</td><td>${money(balances[vc])}</td><td>${r.payment_status}</td></tr>`;
 }).join("")||'<tr><td colspan="9">No vendor entries</td></tr>';
}
async function deleteVendorTx(id){if(!confirm("Delete entry?"))return;await api("/api/vendor-ledger/"+id,{method:"DELETE"});await Promise.all([loadVendorLedger(),loadDashboard()])}$("ledgerVendor").onchange=loadVendorLedger;
function toggleAll(className,checked){document.querySelectorAll("."+className).forEach(x=>x.checked=checked)}
function selectedIds(className){return [...document.querySelectorAll("."+className+":checked")].map(x=>Number(x.value))}
async function deleteSelectedCorporate(){
 const ids=selectedIds("corpRow");if(!ids.length)return alert("Please select records.");
 if(!confirm(`Delete ${ids.length} selected customer ledger records?`))return;
 await api("/api/customer-ledger/delete-selected",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids})});
 await Promise.all([loadCorporate(),loadDashboard()]);
}
async function deleteAllCorporate(){
 if(!confirm("Delete ALL corporate ledger records? This cannot be undone."))return;
 await api("/api/customer-ledger/delete-all",{method:"DELETE"});await Promise.all([loadCorporate(),loadDashboard()]);
}
async function deleteSelectedDuplicates(){
 const ids=selectedIds("dupRow");if(!ids.length)return alert("Please select duplicate records.");
 if(!confirm(`Delete ${ids.length} selected duplicate rows?`))return;
 await api("/api/duplicates/delete-selected",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids})});
 await Promise.all([loadDuplicates(),loadDashboard()]);
}
async function deleteAllDuplicates(){
 if(!confirm("Delete ALL duplicate document records?"))return;
 await api("/api/duplicates/delete-all",{method:"DELETE"});await Promise.all([loadDuplicates(),loadDashboard()]);
}
async function deleteSelectedVendorLedger(){
 const ids=selectedIds("vendorLedgerRow");if(!ids.length)return alert("Please select vendor ledger records.");
 if(!confirm(`Delete ${ids.length} selected vendor ledger records?`))return;
 await api("/api/vendor-ledger/delete-selected",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids})});
 await Promise.all([loadVendorLedger(),loadDashboard()]);
}
async function deleteAllVendorLedger(){
 if(!confirm("Delete ALL vendor ledger records?"))return;
 await api("/api/vendor-ledger/delete-all",{method:"DELETE"});await Promise.all([loadVendorLedger(),loadDashboard()]);
}
$("restoreFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;if(!confirm("Restore this backup? Current data will be saved automatically before restore.")){e.target.value="";return}const fd=new FormData();fd.append("file",f);const r=await api("/api/restore",{method:"POST",body:fd});alert(r.message||"Backup restored successfully.");location.reload();};
async function loadNetwork(){const r=await api("/api/network");$("mobileUrl").textContent=r.url}
async function loadBackupStatus(){if(!$("backupStatus"))return;try{const r=await api("/api/backup-status");$("backupStatus").innerHTML=`<b>Permanent Database:</b> ${esc(r.database_location)}<br><b>Latest Backup:</b> ${esc(r.latest_backup)} ${r.latest_backup_time?`(${esc(r.latest_backup_time)})`:""}<br><b>Total Saved Backups:</b> ${r.backup_count}`;}catch(e){$("backupStatus").textContent="Backup status is available to authorized users only."}}
function renderPermissionGrid(){if(!$("permissionGrid"))return;$("permissionGrid").innerHTML=ALL_PERMISSIONS.map(p=>`<label><input type="checkbox" class="permCheck" value="${p}"> ${p.replaceAll("_"," ")}</label>`).join("")}
function userPayload(){return {full_name:$("uFullName").value.trim(),username:$("uUsername").value.trim(),password:$("uPassword").value,role_name:$("uRole").value,user_type:$("uType").value,store_access:$("uStore").value.trim()||"ALL",status:$("uStatus").value,permissions:[...document.querySelectorAll(".permCheck:checked")].map(x=>x.value)}}
async function loadUsers(){const rows=await api("/api/users");window.userRows=rows;$("usersBody").innerHTML=rows.map(r=>`<tr><td>${r.full_name}</td><td>${r.username}</td><td>${r.role_name}</td><td>${r.user_type}</td><td>${r.store_access}</td><td>${r.status}</td><td>${r.last_login||"Never"}</td><td><button onclick="editUser(${r.id})">Edit</button> ${r.role_name!=="Super Admin"?`<button class="danger" onclick="deleteUser(${r.id})">Delete</button>`:""}</td></tr>`).join("")}
async function saveUser(){const d=userPayload();if(!d.full_name||!d.username||(!editingUserId&&!d.password))return alert("Full name, username and password are required.");await api(editingUserId?"/api/users/"+editingUserId:"/api/users",{method:editingUserId?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});cancelUserEdit();await loadUsers();await loadAudit()}
function editUser(id){const r=window.userRows.find(x=>x.id===id);editingUserId=id;$("uFullName").value=r.full_name;$("uUsername").value=r.username;$("uPassword").value="";$("uRole").value=r.role_name;$("uType").value=r.user_type;$("uStore").value=r.store_access;$("uStatus").value=r.status;document.querySelectorAll(".permCheck").forEach(x=>x.checked=r.permissions.includes(x.value));$("userSaveBtn").textContent="Update User";$("userCancelBtn").classList.remove("hidden")}
function cancelUserEdit(){editingUserId=null;["uFullName","uUsername","uPassword","uStore"].forEach(id=>$(id).value="");$("uStore").value="ALL";$("uRole").value="Local User";$("uType").value="Local";$("uStatus").value="Active";document.querySelectorAll(".permCheck").forEach(x=>x.checked=false);$("userSaveBtn").textContent="Create User";$("userCancelBtn").classList.add("hidden")}
async function deleteUser(id){if(!confirm("Delete this user?"))return;await api("/api/users/"+id,{method:"DELETE"});await loadUsers();await loadAudit()}
async function loadAudit(){const rows=await api("/api/audit-log");$("auditBody").innerHTML=rows.map(r=>`<tr><td>${r.created_at}</td><td>${r.username}</td><td>${r.action}</td><td>${r.module}</td><td>${r.details||""}</td><td>${r.ip_address||""}</td></tr>`).join("")||'<tr><td colspan="6">No activity yet</td></tr>'}


// Unlimited bulk entry grids (supports direct Excel tab-separated paste)
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function bulkRow(type,data={}){
 const tr=document.createElement("tr");tr.className="bulk-input-row";tr.dataset.type=type;
 tr.innerHTML=`<td class="bulk-index"></td><td><input class="b-code" value="${esc(data.code||"")}" placeholder="Code"></td>
 <td><input class="b-name" value="${esc(data.name||"")}" placeholder="Name" ${type==="corp"?'readonly':''}></td>
 ${type==="vendor"?`<td><input class="b-doc" value="${esc(data.document_number||"")}" placeholder="Document No."></td><td><input class="b-date" type="date" value="${esc(data.date||new Date().toISOString().slice(0,10))}"></td>`:""}
 <td><input class="b-desc" value="${esc(data.description||"")}" placeholder="Description"></td>
 <td><input class="b-debit" type="number" step="0.01" value="${esc(data.debit||"")}" placeholder="0.00"></td>
 <td><input class="b-credit" type="number" step="0.01" value="${esc(data.credit||"")}" placeholder="0.00"></td>
 <td class="b-balance">${money(0)}</td><td><button class="danger" onclick="this.closest('tr').remove();refreshBulk('${type}')">×</button></td>`;
 tr.querySelectorAll("input").forEach(x=>x.addEventListener("input",()=>{if(x.classList.contains("b-code"))resolveBulkName(tr,type);refreshBulk(type)}));
 return tr;
}
function addBulkRows(bodyId,count,type,dataRows=[]){const body=$(bodyId);const rows=dataRows.length?dataRows:Array.from({length:count},()=>({}));rows.forEach(r=>body.appendChild(bulkRow(type,r)));refreshBulk(type)}
function resolveBulkName(tr,type){const code=tr.querySelector(".b-code").value.trim();if(type==="corp"){const opt=[...$("corpCustomer").options].find(o=>o.value===code);tr.querySelector(".b-name").value=opt?opt.textContent.split(" - ").slice(1).join(" - "):""}else{const r=(window.vendorRows||[]).find(v=>String(v.vendor_code)===code);if(r)tr.querySelector(".b-name").value=r.vendor_name}}
function refreshBulk(type){const body=$(type==="corp"?"corpBulkBody":"vendorBulkBody");let balances={};let ready=0;[...body.rows].forEach((tr,i)=>{tr.querySelector(".bulk-index").textContent=i+1;resolveBulkName(tr,type);const code=tr.querySelector(".b-code").value.trim();const d=Number(tr.querySelector(".b-debit").value||0),c=Number(tr.querySelector(".b-credit").value||0);if(code&&(tr.querySelector(".b-desc").value.trim()||d||c))ready++;balances[code]=(balances[code]||0)+d-c;tr.querySelector(".b-balance").textContent=money(balances[code])});$(type==="corp"?"corpBulkCount":"vendorBulkCount").textContent=`${ready} ready rows`}
function clearBulk(bodyId,type){if(confirm("Clear all entered rows?")){ $(bodyId).innerHTML="";addBulkRows(bodyId,5,type)}}
function parseBulkPaste(text,type="corp"){return text.split(/\r?\n/).filter(x=>x.trim()).map(line=>{const c=line.split("\t");if(type==="vendor")return {code:(c[0]||"").trim(),name:(c[1]||"").trim(),document_number:(c[2]||"").trim(),date:(c[3]||"").trim(),description:(c[4]||"").trim(),debit:(c[5]||"").replaceAll(",",""),credit:(c[6]||"").replaceAll(",","")};return {code:(c[0]||"").trim(),name:(c[1]||"").trim(),description:(c[2]||"").trim(),debit:(c[3]||"").replaceAll(",",""),credit:(c[4]||"").replaceAll(",","")}})}
function bulkPayload(type){const body=$(type==="corp"?"corpBulkBody":"vendorBulkBody");return [...body.rows].map(tr=>({code:tr.querySelector(".b-code").value.trim(),name:tr.querySelector(".b-name").value.trim(),document_number:tr.querySelector(".b-doc")?.value.trim()||"",description:tr.querySelector(".b-desc").value.trim(),debit:tr.querySelector(".b-debit").value,credit:tr.querySelector(".b-credit").value,date:tr.querySelector(".b-date")?.value||new Date().toISOString().slice(0,10)})).filter(r=>r.code&&(r.document_number||r.description||Number(r.debit)||Number(r.credit)))}
async function saveCorporateBulk(){const entries=bulkPayload("corp");if(!entries.length)return alert("Please enter at least one corporate entry.");const r=await api("/api/customer-ledger/bulk",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({entries})});alert(`Saved: ${r.inserted}. Skipped: ${r.skipped.length}`);if(r.inserted){$("corpBulkBody").innerHTML="";addBulkRows("corpBulkBody",5,"corp")}await Promise.all([loadCorporate(),loadDashboard()])}
async function saveVendorBulk(){const entries=bulkPayload("vendor");if(!entries.length)return alert("Please enter at least one vendor entry.");const r=await api("/api/vendor-ledger/bulk",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({entries})});alert(`Saved: ${r.inserted}. Skipped: ${r.skipped.length}`);if(r.inserted){$("vendorBulkBody").innerHTML="";addBulkRows("vendorBulkBody",5,"vendor")}await Promise.all([loadVendors(),loadVendorLedger(),loadDashboard()])}
async function uploadVendorLargeFile(){const f=$("vendorLargeFile").files[0];if(!f)return alert("Please select Excel or CSV file.");if(!confirm(`Import ${f.name}? Maximum 50,000 data rows will be posted.`))return;const fd=new FormData();fd.append("file",f);$("vendorImportStatus").textContent="Importing... please wait";try{const r=await api("/api/vendor-ledger/import-large",{method:"POST",body:fd});$("vendorImportStatus").textContent=`Imported ${r.inserted}; skipped ${r.skipped}`;alert(`Vendor import completed. Imported: ${r.inserted}. Skipped: ${r.skipped}.`);$("vendorLargeFile").value="";await Promise.all([loadVendors(),loadVendorLedger(),loadDashboard()])}catch(e){$("vendorImportStatus").textContent=e.message;alert(e.message)}}
function setupBulkEntry(){if($("corpBulkBody")&&!$("corpBulkBody").rows.length)addBulkRows("corpBulkBody",5,"corp");if($("vendorBulkBody")&&!$("vendorBulkBody").rows.length)addBulkRows("vendorBulkBody",5,"vendor");[["corpPaste","corpBulkBody","corp"],["vendorPaste","vendorBulkBody","vendor"]].forEach(([ta,body,type])=>{const el=$(ta);if(!el)return;el.addEventListener("paste",e=>{e.preventDefault();const rows=parseBulkPaste(e.clipboardData.getData("text"),type);if(rows.length){$(body).innerHTML="";addBulkRows(body,0,type,rows);el.value=""}})})}


function cashIds(type){return type==="Head Cash"?{body:"headCashBody",search:"headCashSearch",from:"headCashFrom",to:"headCashTo",row:"headCashRow",upload:"headCashUpload"}:{body:"pettyCashBody",search:"pettyCashSearch",from:"pettyCashFrom",to:"pettyCashTo",row:"pettyCashRow",upload:"pettyCashUpload"}}
function cashLimit(type){return type==='Head Cash'?5700000:900000}function limitState(balance,limit){const b=Math.round(Number(balance)*100)/100;const l=Math.round(Number(limit)*100)/100;if(b===l)return {text:'LIMIT MATCH',cls:'limit-match'};if(b>l)return {text:'LIMIT EXCEEDED',cls:'limit-exceeded'};return {text:'BELOW LIMIT',cls:'limit-below'}}async function loadCash(type){const x=cashIds(type);if(!$(x.body))return;const p=new URLSearchParams({type,q:$(x.search).value,from:$(x.from).value,to:$(x.to).value});const rows=await api('/api/cash-ledger?'+p);await updateLedgerSummary(type==='Head Cash'?'headCash':'pettyCash',type,{q:$(x.search).value,from:$(x.from).value,to:$(x.to).value});let bal=0,limit=cashLimit(type);$(x.body).innerHTML=rows.map(r=>{bal+=type==='Head Cash'?(Number(r.credit||0)-Number(r.debit||0)):(Number(r.debit||0)-Number(r.credit||0));const st=limitState(bal,limit);return `<tr><td><input class="${x.row}" type="checkbox" value="${r.id}"></td><td>${esc(r.document_number)}</td><td>${esc(r.document_date)}</td><td>${esc(r.posting_date)}</td><td>${esc(r.description)}</td><td>${money(r.debit)}</td><td>${money(r.credit)}</td><td>${money(bal)}</td><td><span class="limit-status ${st.cls}">${st.text}</span></td></tr>`}).join('')||'<tr><td colspan="9">No records found</td></tr>';const overall=limitState(bal,limit),el=$(type==='Head Cash'?'headCashOverallStatus':'pettyCashOverallStatus');if(el){el.textContent=overall.text;el.className=overall.cls}}
async function loadDeletedCash(){if(!$('deletedCashBody'))return;const rows=await api('/api/deleted-cash?q='+encodeURIComponent($('deletedCashSearch').value));await updateLedgerSummary('deletedCash','Deleted Entries',{q:$('deletedCashSearch').value});$('deletedCashBody').innerHTML=rows.map(r=>`<tr><td>${esc(r.cash_type)}</td><td>${esc(r.document_number)}</td><td>${esc(r.document_date)}</td><td>${esc(r.posting_date)}</td><td>${esc(r.description)}</td><td>${money(r.debit)}</td><td>${money(r.credit)}</td><td>${esc(r.deleted_by)}</td><td>${esc(r.deleted_at)}</td><td><button onclick="restoreCash(${r.id})">Restore</button></td></tr>`).join('')||'<tr><td colspan="10">No deleted entries</td></tr>'}
async function deleteSelectedCash(type){const x=cashIds(type),ids=selectedIds(x.row);if(!ids.length)return alert('Please select records.');if(!confirm(`Delete ${ids.length} selected ${type} entries? They will move to Deleted Entries.`))return;await api('/api/cash-ledger/delete-selected',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})});await Promise.all([loadCash(type),loadDeletedCash(),loadDashboard()])}
async function restoreCash(id){await api('/api/deleted-cash/restore/'+id,{method:'POST'});await Promise.all([loadCash('Head Cash'),loadCash('Petty Cash'),loadDeletedCash(),loadDashboard()])}
async function showCashEntry(type){const document_number=prompt('Document No.');if(document_number===null)return;const document_date=prompt('Document Date (YYYY-MM-DD)',new Date().toISOString().slice(0,10));const posting_date=prompt('Posting Date (YYYY-MM-DD)',document_date||'');const description=prompt('Description','')||'';const debit=prompt('Debit Amount','0')||0;const credit=prompt('Credit Amount','0')||0;await api('/api/cash-ledger',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cash_type:type,document_number,document_date,posting_date,description,debit,credit})});await Promise.all([loadCash(type),loadDashboard()])}
async function uploadCash(type){const x=cashIds(type),f=$(x.upload).files[0];if(!f)return;const fd=new FormData();fd.append('file',f);fd.append('cash_type',type);const r=await api('/api/cash-ledger/import',{method:'POST',body:fd});alert(`Imported ${r.inserted} ${type} entries.`);$(x.upload).value='';await Promise.all([loadCash(type),loadDashboard()])}
if($('headCashUpload'))$('headCashUpload').onchange=()=>uploadCash('Head Cash');if($('pettyCashUpload'))$('pettyCashUpload').onchange=()=>uploadCash('Petty Cash');


function filterCurrentPage(){const q=($('globalSearch')?.value||'').trim().toLowerCase();const page=document.querySelector('.page.active');if(!page)return;page.querySelectorAll('tbody tr').forEach(tr=>{tr.style.display=!q||tr.textContent.toLowerCase().includes(q)?'':'none'})}

function updateSapClock(){const n=new Date();const d=document.getElementById('sapDate'),t=document.getElementById('sapTime');if(d)d.textContent='Date: '+n.toLocaleDateString('en-GB');if(t)t.textContent='Time: '+n.toLocaleTimeString('en-GB');}setInterval(updateSapClock,1000);updateSapClock();

// V17 SAP menu actions and corrected navigation behavior
const SAP_MENU_ITEMS={
 menu:[['Dashboard','nav:dashboard'],['Corporate Customers','nav:corporate'],['Vendor Ledger','nav:vendorLedger'],['Head Cash','nav:headCash'],['Petty Cash','nav:pettyCash'],['Logout','logout']],
 edit:[['Search Current Page','focus-search'],['Select All Rows','select-all'],['Clear Search','clear-search']],
 favorites:[['Dashboard (DS)','shortcut:DS'],['Corporate Customers (CC)','shortcut:CC'],['Vendor Ledger (VL)','shortcut:VL'],['Head Cash (HC)','shortcut:HC'],['Petty Cash (PC)','shortcut:PC']],
 extras:[['Duplicate Documents','nav:duplicates'],['Deleted Entries','nav:deletedCash'],['Activity Log','nav:audit']],
 system:[['Users & Rights','nav:users'],['Settings & Backup','nav:settings'],['Refresh Data','refresh'],['System Information','system-info']],
 help:[['Shortcut Codes','shortcuts-help'],['About Software','about']]
};
function openSapMenu(key,anchor){
 const box=document.getElementById('sapMenuDropdown'); if(!box)return;
 document.querySelectorAll('.sap-menu-button').forEach(x=>x.classList.toggle('active',x===anchor));
 box.innerHTML=(SAP_MENU_ITEMS[key]||[]).map(([label,action])=>`<button type="button" data-action="${action}">${label}</button>`).join('');
 box.style.left=Math.max(8,anchor.offsetLeft)+'px'; box.classList.remove('hidden');
}
function runSapAction(action){
 const box=document.getElementById('sapMenuDropdown'); box?.classList.add('hidden'); document.querySelectorAll('.sap-menu-button').forEach(x=>x.classList.remove('active'));
 if(action.startsWith('nav:')){document.querySelector(`[data-page="${action.slice(4)}"]`)?.click();return}
 if(action.startsWith('shortcut:')){const el=document.getElementById('globalSearch');el.value=action.slice(9);handleGlobalShortcut({key:'Enter',preventDefault(){}});return}
 if(action==='focus-search'){document.getElementById('globalSearch')?.focus();return}
 if(action==='clear-search'){const el=document.getElementById('globalSearch');if(el){el.value='';filterCurrentPage()}return}
 if(action==='select-all'){document.querySelectorAll('.page.active tbody input[type="checkbox"]').forEach(x=>x.checked=true);return}
 if(action==='refresh'){location.reload();return}
 if(action==='logout'){logout();return}
 if(action==='system-info'){alert('Corporate Finance Management System\nUser: Rahat Ullah (20031)\nDatabase: Connected\nSAP S/4HANA Style Interface');return}
 if(action==='shortcuts-help'){alert('DS Dashboard\nCC Corporate Customers\nVL Vendor Ledger\nHC Head Cash\nPC Petty Cash\nDD Duplicate Documents\nSV Scrap Vendors\nDE Deleted Entries\nUR Users & Rights\nAL Activity Log\nSB Settings & Backup\nCD Cashier Closing Dashboard\nCL Cashier Closing Entry');return}
 if(action==='about'){alert('Imtiaz Group Pvt. Ltd.\nCorporate Finance Management System\nSAP Easy Access Style');return}
}
document.addEventListener('click',e=>{
 const mb=e.target.closest('.sap-menu-button'); if(mb){e.stopPropagation();openSapMenu(mb.dataset.menu,mb);return}
 const act=e.target.closest('#sapMenuDropdown [data-action]'); if(act){runSapAction(act.dataset.action);return}
 if(!e.target.closest('#sapMenuDropdown')){document.getElementById('sapMenuDropdown')?.classList.add('hidden');document.querySelectorAll('.sap-menu-button').forEach(x=>x.classList.remove('active'))}
});

// V18: drag the divider to adjust left navigation and workspace widths.
(function setupSapSidebarResize(){
  const resizer = document.getElementById('sidebarResizer');
  if (!resizer) return;
  let dragging = false;
  const setWidth = (clientX) => {
    const min = 235;
    const max = Math.min(520, window.innerWidth * 0.45);
    const width = Math.max(min, Math.min(max, clientX));
    document.documentElement.style.setProperty('--sap-sidebar-width', `${width}px`);
    try { localStorage.setItem('sapSidebarWidth', String(width)); } catch (_) {}
  };
  try {
    const saved = Number(localStorage.getItem('sapSidebarWidth'));
    if (saved >= 235 && saved <= 520) setWidth(saved);
  } catch (_) {}
  resizer.addEventListener('pointerdown', (event) => {
    dragging = true;
    resizer.classList.add('dragging');
    resizer.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  resizer.addEventListener('pointermove', (event) => {
    if (dragging) setWidth(event.clientX);
  });
  const stop = (event) => {
    if (!dragging) return;
    dragging = false;
    resizer.classList.remove('dragging');
    try { resizer.releasePointerCapture(event.pointerId); } catch (_) {}
  };
  resizer.addEventListener('pointerup', stop);
  resizer.addEventListener('pointercancel', stop);
})();

// V20: folder-only navigation. Folders expand first; pages open only after a leaf is clicked.
(function setupFolderTreeNavigation(){
  const folders=[...document.querySelectorAll('.sap-folder')];
  const closeFolder=(folder)=>{
    const trigger=folder.querySelector(':scope > .sap-tree-group');
    const children=folder.querySelector(':scope > .sap-folder-children');
    if(trigger) trigger.setAttribute('aria-expanded','false');
    if(children) children.hidden=true;
  };
  const openFolder=(folder)=>{
    const trigger=folder.querySelector(':scope > .sap-tree-group');
    const children=folder.querySelector(':scope > .sap-folder-children');
    if(trigger) trigger.setAttribute('aria-expanded','true');
    if(children) children.hidden=false;
  };
  folders.forEach(folder=>{
    closeFolder(folder);
    const trigger=folder.querySelector(':scope > .sap-tree-group');
    trigger?.addEventListener('click',()=>{
      const expanded=trigger.getAttribute('aria-expanded')==='true';
      if(expanded) closeFolder(folder); else openFolder(folder);
    });
  });
  // Override legacy page handlers so missing old headings cannot interrupt navigation.
  document.querySelectorAll('.nav').forEach(btn=>{
    btn.onclick=()=>{
      const target=document.getElementById(btn.dataset.page);
      if(!target) return;
      document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
      target.classList.add('active');
      document.querySelector('.content')?.scrollTo({top:0,left:0,behavior:'auto'});
    };
  });
  // Shortcut navigation automatically expands the parent folder.
  const originalOpenPageById=window.openPageById;
  window.openPageById=function(pageId){
    const btn=[...document.querySelectorAll('.nav')].find(b=>b.dataset.page===pageId);
    if(!btn||btn.classList.contains('hidden')||btn.style.display==='none'){
      alert('You do not have permission to open this page.');
      return false;
    }
    const folder=btn.closest('.sap-folder');
    if(folder) openFolder(folder);
    btn.click();
    btn.scrollIntoView({block:'nearest'});
    return true;
  };
})();


// Cashier Closing Module
let cashierEmployees={};
const cashierCols=[
 ['closing_date','Date','date'],['employee_id','Emp ID','text'],['employee_name','Employee Name','text'],
 ['first_5000','1st 5000','number'],['first_1000','1st 1000','number'],['first_500','1st 500','number'],['first_total','1st Total','number'],
 ['second_5000','2nd 5000','number'],['second_1000','2nd 1000','number'],['second_500','2nd 500','number'],['second_total','2nd Total','number'],
 ['third_5000','3rd 5000','number'],['third_1000','3rd 1000','number'],['third_500','3rd 500','number'],['third_total','3rd Total','number'],
 ['fourth_5000','4th 5000','number'],['fourth_1000','4th 1000','number'],['fourth_500','4th 500','number'],['fourth_total','4th Total','number'],
 ['close_5000','Close 5000','number'],['close_1000','Close 1000','number'],['close_500','Close 500','number'],['close_100','Close 100','number'],['close_75','Close 75','number'],['close_50','Close 50','number'],['close_20','Close 20','number'],['close_10','Close 10','number'],['close_5','Close 5','number'],['close_2','Close 2','number'],['close_1','Close 1','number'],
 ['total_closing_cash','Total Closing Cash','number'],['system_total_sale','System Total Sale','number'],['collection_difference','Cash Difference','number'],['audit_status','Audit Status','text'],['remarks','Remarks','text'],['ivend_pos','iVend POS','number'],['settlement_bank','Settlement Bank','number'],['card_difference','Card Difference','number'],['card_status','Card Status','text'],['card_remarks','Card Remarks','text']
];
async function loadCashierEmployees(){try{const rows=await api('/api/cashier-employees');cashierEmployees=Object.fromEntries(rows.map(r=>[String(r.employee_id),r.employee_name]));}catch(e){}}
function buildCashierEntryGrid(){const head=$('cashierEntryHead'),body=$('cashierEntryBody');if(!head||!body)return;head.innerHTML='<tr><th>#</th>'+cashierCols.map(c=>`<th>${c[1]}</th>`).join('')+'</tr>';body.innerHTML='';for(let i=1;i<=50;i++){const tr=document.createElement('tr');tr.innerHTML=`<td>${i}</td>`+cashierCols.map(c=>`<td><input data-key="${c[0]}" type="${c[2]}" ${c[2]==='number'?'step="any" value="0"':''}></td>`).join('');const emp=tr.querySelector('[data-key="employee_id"]'),name=tr.querySelector('[data-key="employee_name"]');emp.addEventListener('change',()=>{if(cashierEmployees[emp.value])name.value=cashierEmployees[emp.value]});tr.querySelectorAll('input').forEach(x=>x.addEventListener('change',()=>calcCashierRow(tr)));body.appendChild(tr)}}
function calcCashierRow(tr){const v=k=>Number(tr.querySelector(`[data-key="${k}"]`)?.value||0),set=(k,n)=>{const e=tr.querySelector(`[data-key="${k}"]`);if(e)e.value=(Math.round(n*100)/100)};set('first_total',v('first_5000')*5000+v('first_1000')*1000+v('first_500')*500);set('second_total',v('second_5000')*5000+v('second_1000')*1000+v('second_500')*500);set('third_total',v('third_5000')*5000+v('third_1000')*1000+v('third_500')*500);set('fourth_total',v('fourth_5000')*5000+v('fourth_1000')*1000+v('fourth_500')*500);const close=v('close_5000')*5000+v('close_1000')*1000+v('close_500')*500+v('close_100')*100+v('close_75')*75+v('close_50')*50+v('close_20')*20+v('close_10')*10+v('close_5')*5+v('close_2')*2+v('close_1');set('total_closing_cash',close);const totalCash=v('first_total')+v('second_total')+v('third_total')+v('fourth_total')+close;const diff=totalCash-v('system_total_sale');set('collection_difference',diff);const status=diff<0?'Short':diff>0?'Excess':'Matched';tr.querySelector('[data-key="audit_status"]').value=status;const remarks=tr.querySelector('[data-key="remarks"]');if(remarks&&!remarks.dataset.userEdited)remarks.value=diff<0?`Cash shortage Rs. ${Math.abs(diff).toFixed(2)}`:diff>0?`Cash excess Rs. ${diff.toFixed(2)}`:'Cash matched';const cd=v('ivend_pos')-v('settlement_bank');set('card_difference',cd);const cardStatus=Math.abs(cd)<.01?'Matched':cd>0?'POS Excess':'POS Short';tr.querySelector('[data-key="card_status"]').value=cardStatus;const cardRemarks=tr.querySelector('[data-key="card_remarks"]');if(cardRemarks&&!cardRemarks.dataset.userEdited)cardRemarks.value=Math.abs(cd)<.01?'POS settlement matched':cd>0?`POS excess Rs. ${cd.toFixed(2)}`:`POS short Rs. ${Math.abs(cd).toFixed(2)}`}
async function saveCashierClosingRows(){const rows=[...document.querySelectorAll('#cashierEntryBody tr')].map(tr=>Object.fromEntries(cashierCols.map(c=>[c[0],tr.querySelector(`[data-key="${c[0]}"]`).value]))).filter(r=>String(r.employee_id||'').trim());if(!rows.length)return alert('At least one entry fill karein.');if(rows.length>50)return alert('Maximum 50 entries allowed.');try{const r=await api('/api/cashier-closing/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entries:rows})});alert(`${r.inserted} inserted, ${r.updated} updated`);clearCashierClosingRows();await Promise.all([loadCashierClosing(),loadCashierDashboard()])}catch(e){alert(e.message)}}
function clearCashierClosingRows(){buildCashierEntryGrid()}
function cashierPeriodUI(kind){
 const p=$(`cc${kind}Period`)?.value||'all';
 ['Date','Week','Month','Year'].forEach(x=>{const e=$(`cc${kind}${x}`);if(e)e.style.display=(x.toLowerCase()===p?'inline-block':'none')});
}
function cashierParams(kind){const p=new URLSearchParams();const period=$(`cc${kind}Period`)?.value||'all';p.set('period',period);const map={day:'Date',week:'Week',month:'Month',year:'Year'};if(map[period]){const v=$(`cc${kind}${map[period]}`)?.value;if(v)p.set(period,v)};const f=$(`cc${kind}From`)?.value,t=$(`cc${kind}To`)?.value;if(f)p.set('from',f);if(t)p.set('to',t);return p}
function resetCashierFilters(kind){const p=$(`cc${kind}Period`);if(p)p.value='all';['Date','Week','Month','Year','From','To'].forEach(x=>{const e=$(`cc${kind}${x}`);if(e)e.value=''});if(kind==='List'&&$('cashierClosingSearch'))$('cashierClosingSearch').value='';cashierPeriodUI(kind);kind==='Dash'?loadCashierDashboard():kind==='List'?loadCashierClosing():kind==='Shortage'?loadCashierShortage():loadCashierNotes()}
async function loadCashierClosing(){if(!$('cashierClosingBody'))return;const p=cashierParams('List');p.set('q',$('cashierClosingSearch')?.value||'');const rows=await api('/api/cashier-closing?'+p);if($('cashierRecordCount'))$('cashierRecordCount').textContent=`${rows.length.toLocaleString()} records`;let lastDate='';const html=[];for(const r of rows){if(r.closing_date!==lastDate){lastDate=r.closing_date;html.push(`<tr class="cashier-date-group"><td colspan="19">Closing Date: ${esc(lastDate)}</td></tr>`)}const first=Number(r.first_total||0),second=Number(r.second_total||0),third=Number(r.third_total||0),fourth=Number(r.fourth_total||0),close=Number(r.total_closing_cash||0),total=first+second+third+fourth+close,diff=Number(r.collection_difference||0),shortage=diff<0?Math.abs(diff):0,excess=diff>0?diff:0;html.push(`<tr><td>${esc(r.closing_date)}</td><td>${esc(r.employee_id)}</td><td>${esc(r.employee_name)}</td><td>${money(first)}</td><td>${money(second)}</td><td>${money(third)}</td><td>${money(fourth)}</td><td>${money(close)}</td><td><b>${money(total)}</b></td><td>${money(r.system_total_sale)}</td><td class="amount-short">${money(shortage)}</td><td class="amount-excess">${money(excess)}</td><td><span class="status-chip ${String(r.audit_status||'').toLowerCase()}">${esc(r.audit_status)}</span></td><td class="remarks-cell">${esc(r.remarks||'')}</td><td>${money(r.ivend_pos)}</td><td>${money(r.settlement_bank)}</td><td>${money(r.card_difference)}</td><td>${esc(r.card_status)}</td><td class="remarks-cell">${esc(r.card_remarks||'')}</td></tr>`)}$('cashierClosingBody').innerHTML=html.join('')||'<tr><td colspan="19">No records found</td></tr>'}
async function loadCashierDashboard(){if(!$('cashierSummaryBody'))return;const d=await api('/api/cashier-closing/dashboard?'+cashierParams('Dash')),t=d.totals;const sv=(id,v)=>{if($(id))$(id).textContent=v};sv('ccTotalClosingCash',money(t.total_closing_cash));sv('ccSystemSales',money(t.system_sales));sv('ccCashDifference',money(t.cash_difference));sv('ccCardDifference',money(t.card_difference));sv('ccShortAmount',money(t.short_amount));sv('ccExcessAmount',money(t.excess_amount));$('cashierSummaryBody').innerHTML=d.summary.map(r=>`<tr><td>${esc(r.period_label)}</td><td>${esc(r.period_start)}</td><td>${esc(r.period_end)}</td><td>${money(r.total_closing_cash)}</td><td>${money(r.system_sales)}</td><td>${money(r.cash_difference)}</td><td>${money(r.ivend_pos)}</td><td>${money(r.settlement_bank)}</td><td>${money(r.card_difference)}</td><td>${money(r.short_amount)}</td><td>${money(r.excess_amount)}</td></tr>`).join('')||'<tr><td colspan="11">No summary found</td></tr>'}
function downloadCashierExcel(kind='Dash'){const p=cashierParams(kind);if(kind==='List')p.set('q',$('cashierClosingSearch')?.value||'');if(kind==='Shortage'){p.set('status','Short');p.set('q',$('cashierShortageSearch')?.value||'')}if(kind==='Notes'){p.set('note_summary','1');p.set('q',$('cashierNotesSearch')?.value||'')}location.href='/api/export-cashier-closing?'+p.toString()}
function downloadCashierPdf(kind='Dash'){const p=cashierParams(kind);if(kind==='List')p.set('q',$('cashierClosingSearch')?.value||'');if(kind==='Shortage'){p.set('status','Short');p.set('q',$('cashierShortageSearch')?.value||'')}location.href='/api/pdf-cashier-closing?'+p.toString()}
if($('cashierClosingUpload'))$('cashierClosingUpload').onchange=async()=>{const f=$('cashierClosingUpload').files[0];if(!f)return;const fd=new FormData();fd.append('file',f);try{const r=await api('/api/cashier-closing/import',{method:'POST',body:fd});alert(`${r.inserted} inserted, ${r.updated} updated. Dashboard auto-updated.`);await Promise.all([loadCashierClosing(),loadCashierDashboard(),loadCashierEmployees()])}catch(e){alert(e.message)}finally{$('cashierClosingUpload').value=''}};
document.addEventListener('DOMContentLoaded',()=>{applySavedTheme();setupThemePicker();buildCashierEntryGrid();['Dash','List','Shortage','Notes'].forEach(cashierPeriodUI)});

// Preserve manually typed cashier remarks while auto-calculating amounts.
document.addEventListener('input',e=>{if(e.target?.dataset?.key==='remarks'||e.target?.dataset?.key==='card_remarks')e.target.dataset.userEdited='1'});


// V26 Cashier Shortage, note-wise reports and saved themes
function cashierCashTotal(r){return Number(r.first_total||0)+Number(r.second_total||0)+Number(r.third_total||0)+Number(r.fourth_total||0)+Number(r.total_closing_cash||0)}
async function loadCashierShortage(){if(!$('cashierShortageBody'))return;const p=cashierParams('Shortage');p.set('status','Short');p.set('q',$('cashierShortageSearch')?.value||'');const rows=await api('/api/cashier-closing?'+p);let total=0;const people=new Set();$('cashierShortageBody').innerHTML=rows.map(r=>{const diff=Number(r.collection_difference||0),shortage=diff<0?Math.abs(diff):0;total+=shortage;people.add(String(r.employee_id));return `<tr><td>${esc(r.closing_date)}</td><td>${esc(r.employee_id)}</td><td>${esc(r.employee_name)}</td><td>${money(r.first_total)}</td><td>${money(r.second_total)}</td><td>${money(r.third_total)}</td><td>${money(r.fourth_total)}</td><td>${money(r.total_closing_cash)}</td><td><b>${money(cashierCashTotal(r))}</b></td><td>${money(r.system_total_sale)}</td><td class="amount-short"><b>${money(shortage)}</b></td><td class="remarks-cell">${esc(r.remarks||'Cash shortage')}</td><td>${esc(r.card_status||'')}</td></tr>`}).join('')||'<tr><td colspan="13">No shortage records found</td></tr>';$('cashierShortageTotal').textContent=money(total);$('cashierShortageCount').textContent=rows.length.toLocaleString();$('cashierShortageCashiers').textContent=people.size.toLocaleString()}
let cashierNoteRows=[];
async function loadCashierNotes(){if(!$('cashierNotesBody'))return;const p=cashierParams('Notes');p.set('q',$('cashierNotesSearch')?.value||'');const d=await api('/api/cashier-closing/note-summary?'+p);cashierNoteRows=d.details||[];window.cashierNoteSummary=d.summary||[];$('cashierNotesBody').innerHTML=window.cashierNoteSummary.map((r,i)=>`<tr class="clickable-note" onclick="showCashierNoteDetails(${i})"><td class="remarks-cell">${esc(r.note)}</td><td>${Number(r.records).toLocaleString()}</td><td>${Number(r.cashiers).toLocaleString()}</td><td class="amount-short">${money(r.short_amount)}</td><td class="amount-excess">${money(r.excess_amount)}</td><td>${esc(r.first_date)}</td><td>${esc(r.last_date)}</td></tr>`).join('')||'<tr><td colspan="7">No note-wise records found</td></tr>';if(window.cashierNoteSummary.length)showCashierNoteDetails(0);else $('cashierNoteDetailBody').innerHTML='<tr><td colspan="8">No details found</td></tr>'}
function cashierDenominationCells(r,prefix,isClosing=false){const keys=isClosing?['5000','1000','500','100','75','50','20','10','5','2','1']:['5000','1000','500'];return keys.map(k=>`<td class="denom-cell">${Number(r[`${prefix}_${k}`]||0).toLocaleString()}</td>`).join('')}
function showCashierNoteDetails(index){const s=(window.cashierNoteSummary||[])[index];if(!s)return;const rows=cashierNoteRows.filter(r=>((r.remarks||'').trim()||'No Note / Remark')===s.note);$('cashierNoteDetailTitle').textContent=s.note;$('cashierNoteDetailCount').textContent=`${rows.length} records`;$('cashierNoteDetailBody').innerHTML=rows.map(r=>{const diff=Number(r.collection_difference||0);return `<tr><td>${esc(r.closing_date)}</td><td>${esc(r.employee_id)}</td><td>${esc(r.employee_name)}</td>${cashierDenominationCells(r,'first')}<td class="collection-total">${money(r.first_total)}</td>${cashierDenominationCells(r,'second')}<td class="collection-total">${money(r.second_total)}</td>${cashierDenominationCells(r,'third')}<td class="collection-total">${money(r.third_total)}</td>${cashierDenominationCells(r,'fourth')}<td class="collection-total">${money(r.fourth_total)}</td>${cashierDenominationCells(r,'close',true)}<td class="collection-total">${money(r.total_closing_cash)}</td><td><b>${money(cashierCashTotal(r))}</b></td><td>${money(r.system_total_sale)}</td><td class="amount-short">${money(diff<0?Math.abs(diff):0)}</td><td class="amount-excess">${money(diff>0?diff:0)}</td><td class="remarks-cell">${esc((r.remarks||'').trim()||'No Note / Remark')}</td></tr>`}).join('')||'<tr><td colspan="36">No details found</td></tr>'}
const THEMES=['sap-blue','imtiaz-green','graphite','light','dark'];
function setTheme(theme){if(!THEMES.includes(theme))theme='sap-blue';document.documentElement.dataset.theme=theme;localStorage.setItem('rahatTheme',theme);document.querySelectorAll('[data-theme-choice]').forEach(b=>b.classList.toggle('active',b.dataset.themeChoice===theme));if($('themeStatus'))$('themeStatus').textContent='Current theme: '+({'sap-blue':'SAP Blue','imtiaz-green':'Imtiaz Green','graphite':'Graphite','light':'Clean Light','dark':'Dark Mode'}[theme])}
function applySavedTheme(){setTheme(localStorage.getItem('rahatTheme')||'sap-blue')}
function setupThemePicker(){document.querySelectorAll('[data-theme-choice]').forEach(b=>b.addEventListener('click',()=>setTheme(b.dataset.themeChoice)))}
