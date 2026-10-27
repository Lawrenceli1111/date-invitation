'use strict';
// Bump this version whenever publishing app shell changes.
const VERSION = 'v2-week';
const PREFIX = `date-pwa:${self.registration.scope}:`;
const CACHE = `${PREFIX}${VERSION}`;
const FILES = [
 './index.html','./meal_page.html','./yes_page.html','./confirmation.html',
 './offline.html','./styles.css','./yes_style.css','./config.js','./script.js',
 './meals.js','./booking.js','./pwa.js','./manifest.webmanifest',
 './icon-192.png','./icon-512.png','./icon-maskable.png','./apple-touch-icon.png',
 './assets/invite.gif','./assets/celebrate.gif'
];
const ALLOWED = new Set(FILES.map(file => new URL(file, self.registration.scope).href));
self.addEventListener('install', event => {
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(FILES.map(file => new Request(new URL(file,self.registration.scope),{cache:'reload'})));
 })());
});
self.addEventListener('activate', event => {
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener('message', event => {
 if(event.data?.type==='ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', event => {
 const request=event.request, url=new URL(request.url);
 // Never intercept FormSubmit, POSTs, test pages or other GitHub Pages projects.
 if(request.method!=='GET' || url.origin!==self.location.origin) return;
 const canonical=new URL(url.pathname,self.location.origin);
 if(canonical.href===self.registration.scope) canonical.pathname+='index.html';
 if(!ALLOWED.has(canonical.href)) {
  if(request.mode==='navigate' && url.href.startsWith(self.registration.scope)) {
   event.respondWith(fetch(request).catch(()=>caches.match(new URL('./offline.html',self.registration.scope))));
  }
  return;
 }
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try {
   const response=await fetch(request);
   if(response.ok) {await cache.put(canonical.href,response.clone());return response;}
   // Online 404s remain visible rather than concealing an incomplete upload.
   return response;
  } catch (_) {
   const cached=await cache.match(canonical.href);
   if(cached) return cached;
   if(request.mode==='navigate') return cache.match(new URL('./offline.html',self.registration.scope));
   return Response.error();
  }
 })());
});
