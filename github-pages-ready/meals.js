'use strict';
(() => {
 const choices = Object.freeze([
  {id:'hotpot', name:'火锅', emoji:'🍲'},
  {id:'feidachu', name:'费大厨', emoji:'🌶️'},
  {id:'bco', name:'BCO豆库', emoji:'☕'},
  {id:'malatang', name:'麻辣烫', emoji:'🍜'},
  {id:'barbecue', name:'烤肉', emoji:'🥩'},
  {id:'fish', name:'耗儿鱼', emoji:'🐟'}
 ]);
 const selected = () => choices.find(item => item.id === new URLSearchParams(window.location.search).get('meal')) || null;
 window.DATE_MEALS = Object.freeze({choices, selected});
 const form = document.querySelector('#meal-form');
 if (!form) return;
 const previous = selected();
 for (const item of choices) {
  const label=document.createElement('label'), input=document.createElement('input');
  const card=document.createElement('span'), name=document.createElement('span'), emoji=document.createElement('span');
  input.type='radio';input.name='meal';input.value=item.id;input.required=true;input.checked=previous?.id===item.id;
  card.className='meal-card';name.className='meal-name';emoji.className='meal-emoji';
  name.textContent=item.name;emoji.textContent=item.emoji;emoji.setAttribute('aria-hidden','true');
  card.append(name,emoji);label.append(input,card);document.querySelector('#meal-options').append(label);
 }
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const input=form.querySelector('input[name="meal"]:checked');
  if (input && choices.some(item=>item.id===input.value)) window.location.assign(`yes_page.html?meal=${encodeURIComponent(input.value)}`);
 });
})();
