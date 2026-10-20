"use strict";
(()=>{
 const idleMs=5*60*1000,key='hc-last-activity',logoutKey='hc-logout';
 let last=Date.now(),lastPing=0,leaving=false;
 try{localStorage.setItem(key,String(last));}catch(_){}
 async function logout(){
  if(leaving)return;leaving=true;
  try{localStorage.setItem(logoutKey,String(Date.now()));}catch(_){}
  try{await fetch('/api/logout',{method:'POST',credentials:'same-origin',keepalive:true});}finally{location.replace('/');}
 }
 function sharedActivity(){try{return Math.max(last,Number(localStorage.getItem(key))||0);}catch(_){return last;}}
 function activity(){
  if(leaving)return;
  const now=Date.now();if(now-sharedActivity()>=idleMs){logout();return;}
  last=now;try{localStorage.setItem(key,String(now));}catch(_){}
  if(now-lastPing>=15000){lastPing=now;fetch('/api/hc-session/activity',{method:'POST',credentials:'same-origin'}).then(r=>{if(r.status===401)logout();}).catch(()=>{});}
 }
 ['pointerdown','pointermove','keydown','input','wheel','touchstart'].forEach(name=>document.addEventListener(name,activity,{passive:true}));
 setInterval(()=>{if(Date.now()-sharedActivity()>=idleMs)logout();},1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-sharedActivity()>=idleMs)logout();});
 window.addEventListener('storage',e=>{if(e.key===logoutKey){leaving=true;location.replace('/');}});
 document.getElementById('logout').addEventListener('click',logout);
})();
