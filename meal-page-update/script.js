// Adapted from ivysone's original Yes / No interaction (MIT).
const messages = ["Are you sure? 🥺", "One tiny date? 💗", "It's okay to say no 💌"];
let messageIndex = 0;
function handleNoClick() {
 document.querySelector('#no-message').textContent = messages[Math.min(messageIndex++, messages.length - 1)];
 document.querySelector('.yes-button').style.fontSize = `${Math.min(1.15 + messageIndex * .1, 1.45)}rem`;
 document.querySelector('#decline').hidden = false;
}
function handleYesClick() { window.location.href = 'meal_page.html'; }
