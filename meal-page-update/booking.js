'use strict';
(() => {
 const config = window.DATE_CONFIG;
 const $ = s => document.querySelector(s);
 const meal = window.DATE_MEALS.selected();
 const storageKey = 'date-invite:receipt:v1';
 let busy = false, selectedDate = '', volatileReceipt = null;
 const formatter = new Intl.DateTimeFormat('en-CA', {timeZone: config.timeZone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 function clock() {
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map(p => [p.type,p.value]));
  return {date:`${parts.year}-${parts.month}-${parts.day}`, time:`${parts.hour}:${parts.minute}`};
 }
 function readReceipt() { try { return JSON.parse(sessionStorage.getItem(storageKey)) || volatileReceipt; } catch (_) { return volatileReceipt; } }
 function tell(message, error=false) { if ($('#status')) { $('#status').textContent=message; $('#status').dataset.error=String(error); } }
 function renderTimes() {
  if (!$('#time-options') || busy) return;
  const now=clock(), previous=$('input[name="time"]:checked')?.value;
  const changed=selectedDate && selectedDate!==now.date;
  selectedDate=now.date;
  $('#date-label').textContent=`Today · ${now.date} · ${config.timeZone}`;
  $('#time-options').replaceChildren();
  const times=[...new Set(config.times)].filter(t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t) || t==='24:00').sort();
  let available=0;
  for (const time of times) {
   const label=document.createElement('label'), input=document.createElement('input'), span=document.createElement('span');
   input.type='radio';input.name='time';input.value=time;input.required=true;input.disabled=time<=now.time;
   input.checked=!changed && previous===time && !input.disabled;
   span.textContent=time==='24:00' ? '24:00 (midnight)' : time;label.append(input,span);$('#time-options').append(label);
   if(!input.disabled) available++;
  }
  $('#confirm').disabled=!available;
  $('#availability').textContent=available ? (changed ? 'A new day! Please choose a time again.' : 'Past times are unavailable. Pick your favorite 💕') : 'No times left today. Please come back another day 💗';
 }
 async function submit(accepted, time='') {
  if (busy) return;
  const now=clock(), receipt=readReceipt();
  if(receipt?.date===now.date) { tell('Your answer has already been received 💌');return; }
  if(accepted && !meal) {window.location.assign('meal_page.html');return;}
  if(accepted && (selectedDate!==now.date || !config.times.includes(time) || time<=now.time)) {renderTimes();tell('Please choose an available time for today.',true);return;}
  if(!/^https:\/\/formsubmit\.co\/ajax\/[^/?#\s]+$/.test(config.formEndpoint)) {tell('This invitation is not connected yet. Please ask the sender to configure FormSubmit. 💌',true);return;}
  busy=true;
  const controls=[...document.querySelectorAll('button,input')];
  const original=controls.map(el=>el.disabled);controls.forEach(el=>el.disabled=true);
  tell('Sending your answer… 💌');
  const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),25000);
  const submittedAt=new Date().toISOString();
  const record={accepted:accepted?'yes':'no',appointment_date:now.date,appointment_time:time,meal:accepted ? meal.name : '',submitted_at:submittedAt,time_zone:config.timeZone,submission_id:window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`};
  try {
   const response=await fetch(config.formEndpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({...record, _subject: accepted ? 'Date invitation: accepted 💕' : 'Date invitation: declined 💌', _template: 'table'}),signal:controller.signal});
   const result=await response.json();
   if(!response.ok || ![true, 'true'].includes(result.success)) throw new Error('rejected');
   if(!config.emailActivated) {
    tell('Please check the recipient mailbox and activate FormSubmit first. This is a setup submission, not a confirmed booking. Then ask the sender to finish setup and try again. 💌');
    return;
   }
   const saved={date:now.date,time,accepted,submittedAt,meal:accepted ? meal.name : ''};volatileReceipt=saved;
   let persisted=false;
   try {sessionStorage.setItem(storageKey,JSON.stringify(saved));persisted=true;} catch (_) {}
   if(persisted) window.location.assign('confirmation.html');
   else {tell(accepted?`It's a date! 💕 See you on ${now.date} at ${time}${time==='24:00' ? ' (midnight, end of day)' : ''}! 今天一起吃：${meal.name} 💗`:'Your answer has been received. Maybe another day 💗');}
  } catch(error) {
   tell(error.name==='AbortError' ? 'The connection timed out; your answer may have arrived. Please check with the sender before retrying.' : 'We could not confirm receipt. Check your connection and try again. If unsure, check with the sender first.',true);
  } finally {clearTimeout(timeout);busy=false;controls.forEach((el,i)=>el.disabled=original[i]);renderTimes();}
 }
 if($('#booking-form')) {
  if(!meal) {window.location.replace('meal_page.html');return;}
  if($('#meal-summary')) $('#meal-summary').textContent=`今天一起吃：${meal.name} ${meal.emoji}`;
  if($('#change-meal')) $('#change-meal').href=`meal_page.html?meal=${encodeURIComponent(meal.id)}`;
  renderTimes();setInterval(renderTimes,15000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderTimes();});
  $('#booking-form').addEventListener('submit',e=>{e.preventDefault();submit(true,$('input[name="time"]:checked')?.value || '');});
 }
 if($('#decline')) {
  $('#decline').addEventListener('click',()=>{$('#decline-panel').hidden=false;});
  $('#cancel-decline').addEventListener('click',()=>{$('#decline-panel').hidden=true;});
  $('#send-decline').addEventListener('click',()=>submit(false));
 }
 if($('#result-title')) {
  const receipt=readReceipt();
  if(receipt) {
   $('#result-title').textContent=receipt.accepted?"It's a date! 💕":"Maybe another day 💗";
   $('#result-message').textContent=receipt.accepted ? (receipt.date===clock().date ? `See you today at ${receipt.time}${receipt.time==='24:00' ? ' (midnight, end of day)' : ''}!` : `See you on ${receipt.date} at ${receipt.time}${receipt.time==='24:00' ? ' (midnight, end of day)' : ''}!`) : 'Your answer has been sent. Thank you for being honest 💌';
  if(receipt.accepted && receipt.meal) $('#result-message').textContent+=` 今天一起吃：${receipt.meal} 💗`;
  } else {$('#result-title').textContent='A little date invitation 💗';$('#result-message').textContent='Please open the invitation and send your answer first.';}
 }
})();
