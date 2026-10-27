'use strict';
(() => {
 const banner=document.createElement('p');
 banner.className='connection-notice';banner.setAttribute('role','status');
 document.querySelector('main')?.prepend(banner);
 function connectivity(){banner.hidden=navigator.onLine;banner.textContent='当前离线，可以浏览和选择；请联网后再确认预约 💌';}
 window.addEventListener('online',connectivity);window.addEventListener('offline',connectivity);connectivity();
 let installPrompt=null;
 const installButton=document.querySelector('#install-app');
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;if(installButton)installButton.hidden=false;});
 installButton?.addEventListener('click',async()=>{
  if(!installPrompt)return;
  installButton.disabled=true;
  try {await installPrompt.prompt();await installPrompt.userChoice;} finally {installPrompt=null;installButton.hidden=true;installButton.disabled=false;}
 });
 window.addEventListener('appinstalled',()=>{installPrompt=null;if(installButton)installButton.hidden=true;});
 if(!('serviceWorker' in navigator))return;
 window.addEventListener('load',async()=>{
  try {
   const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
   let offered=false;
   function offerUpdate(){
    if(!registration.waiting || !navigator.serviceWorker.controller || offered)return;
    offered=true;
    const button=document.createElement('button');button.className='text-button';button.textContent='有新版本，点击更新（会清除未提交的选择）';
    button.addEventListener('click',()=>{
     button.disabled=true;
     navigator.serviceWorker.addEventListener('controllerchange',()=>window.location.reload(),{once:true});
     registration.waiting?.postMessage({type:'ACTIVATE_UPDATE'});
    });
    document.querySelector('main')?.append(button);
   }
   offerUpdate();registration.addEventListener('updatefound',()=>{
    registration.installing?.addEventListener('statechange',offerUpdate);
   });
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)registration.update().catch(()=>{});});
  } catch (_) {
   // The online website remains usable even if offline installation is unavailable.
   console.warn('Offline setup is unavailable. The online invitation still works.');
  }
 });
})();
