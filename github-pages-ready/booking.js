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
 function datesFrom(today) {
  return Array.from({length:7},(_,offset)=>{
   const date=new Date(`${today}T00:00:00Z`);
   date.setUTCDate(date.getUTCDate()+offset);
   return date.toISOString().slice(0,10);
  });
 }
 function validTime(time) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) || time==='24:00'; }
 function renderTimes() {
  if (!$('#time-options') || busy) return;
  const now=clock(), previous=$('input[name="time"]:checked')?.value;
  const dates=datesFrom(now.date);
  const changed=selectedDate && !dates.includes(selectedDate);
  if(!selectedDate || changed) selectedDate=now.date;
  if($('#date-options')) {
   $('#date-options').replaceChildren();
   dates.forEach((date,index)=>{
    const label=document.createElement('label'),input=document.createElement('input'),span=document.createElement('span');
    input.type='radio';input.name='date';input.value=date;input.required=true;input.checked=date===selectedDate;
    span.textContent=`${index===0?'今天':index===1?'明天':date.slice(5).replace('-','月')+'日'} · ${date}`;
    label.append(input,span);$('#date-options').append(label);
   });
  }
  $('#date-label').textContent=`${selectedDate===now.date?'Today':'Selected date'} · ${selectedDate} · ${config.timeZone}`;
  $('#time-options').replaceChildren();
  const times=[...new Set(config.times)].filter(validTime).sort();
  let available=0;
  for (const time of times) {
   const label=document.createElement('label'), input=document.createElement('input'), span=document.createElement('span');
   input.type='radio';input.name='time';input.value=time;input.required=true;input.disabled=selectedDate===now.date && time<=now.time;
   input.checked=!changed && previous===time && !input.disabled;
   span.textContent=time==='24:00' ? '24:00 (midnight)' : time;label.append(input,span);$('#time-options').append(label);
   if(!input.disabled) available++;
  }
  $('#confirm').disabled=!available;
  $('#availability').textContent=available ? (changed ? 'The selected day has passed. Please choose a date and time again.' : '选好日期，再选一个时间吧 💕 今天已过的时间不可选。') : '今天已没有可预约时间，请选择接下来几天 💗';
 }
 async function submit(accepted, time='') {
  if (busy) return;
  if(typeof navigator!=='undefined' && navigator.onLine===false) {tell('You are offline. Please reconnect before confirming your date. 💌',true);return;}
  const now=clock(), receipt=readReceipt();
  if((receipt?.submittedOn || receipt?.date)===now.date) { tell('Your answer has already been received 💌');return; }
  if(accepted && !meal) {window.location.assign('meal_page.html');return;}
  if(accepted && (!datesFrom(now.date).includes(selectedDate) || !validTime(time) || !config.times.includes(time) || (selectedDate===now.date && time<=now.time))) {renderTimes();tell('Please choose an available date and time within the next 7 days.',true);return;}
  if(!/^https:\/\/formsubmit\.co\/ajax\/[^/?#\s]+$/.test(config.formEndpoint)) {tell('This invitation is not connected yet. Please ask the sender to configure FormSubmit. 💌',true);return;}
  const appointmentDate=accepted ? selectedDate : now.date;
  busy=true;
  const controls=[...document.querySelectorAll('button,input')];
  const original=controls.map(el=>el.disabled);controls.forEach(el=>el.disabled=true);
  tell('Sending your answer… 💌');
  const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),25000);
  const submittedAt=new Date().toISOString();
  const record={accepted:accepted?'yes':'no',appointment_date:appointmentDate,appointment_time:time,meal:accepted ? meal.name : '',submitted_at:submittedAt,time_zone:config.timeZone,submission_id:window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`};
  try {
   const response=await fetch(config.formEndpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({...record, _subject: accepted ? 'Date invitation: accepted 💕' : 'Date invitation: declined 💌', _template: 'table'}),signal:controller.signal});
   const result=await response.json();
   if(!response.ok || ![true, 'true'].includes(result.success)) throw new Error('rejected');
   if(!config.emailActivated) {
    tell('Please check the recipient mailbox and activate FormSubmit first. This is a setup submission, not a confirmed booking. Then ask the sender to finish setup and try again. 💌');
    return;
   }
   const saved={date:appointmentDate,submittedOn:now.date,time,accepted,submittedAt,meal:accepted ? meal.name : ''};volatileReceipt=saved;
   let persisted=false;
   try {sessionStorage.setItem(storageKey,JSON.stringify(saved));persisted=true;} catch (_) {}
   if(persisted) window.location.assign('confirmation.html');
   else {tell(accepted?`It's a date! 💕 See you on ${appointmentDate} at ${time}${time==='24:00' ? ' (midnight, end of day)' : ''}! 一起吃：${meal.name} 💗`:'Your answer has been received. Maybe another day 💗');}
  } catch(error) {
   tell(error.name==='AbortError' ? 'The connection timed out; your answer may have arrived. Please check with the sender before retrying.' : 'We could not confirm receipt. Check your connection and try again. If unsure, check with the sender first.',true);
  } finally {clearTimeout(timeout);busy=false;controls.forEach((el,i)=>el.disabled=original[i]);renderTimes();}
 }
 if($('#booking-form')) {
  if(!meal) {window.location.replace('meal_page.html');return;}
  if($('#meal-summary')) $('#meal-summary').textContent=`一起吃：${meal.name} ${meal.emoji}`;
  if($('#change-meal')) $('#change-meal').href=`meal_page.html?meal=${encodeURIComponent(meal.id)}`;
  renderTimes();
  $('#date-options')?.addEventListener('change',event=>{
   if(busy || !datesFrom(clock().date).includes(event.target.value))return;
   selectedDate=event.target.value;
   const previous=$('input[name="time"]:checked');if(previous)previous.checked=false;
   renderTimes();
  });
  setInterval(renderTimes,15000);
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
  if(receipt.accepted && receipt.meal) $('#result-message').textContent+=` 一起吃：${receipt.meal} 💗`;
  } else {$('#result-title').textContent='A little date invitation 💗';$('#result-message').textContent='Please open the invitation and send your answer first.';}
 }
})();
