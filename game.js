/* ============================================================
   DICE & SLICE — Dungeon Pizzeria
   A silly homage to Slice & Dice + tavern management sims.
   Roll your staff's dice, fill monster orders before patience
   runs out, hire weirdos, upgrade faces, survive the dungeon.
   ============================================================ */
'use strict';

/* ---------------- helpers ---------------- */
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const R  = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
const firstName = c => c.name.split(' ')[0];

window.__errs = [];
window.addEventListener('error', e => window.__errs.push(String(e.message)));

/* ---------------- data ---------------- */
const ICON = { dough:'🫓', sauce:'🍅', cheese:'🧀', topp:'🍖', bake:'🔥', knife:'🔪', soak:'🥖', snack:'💰', espresso:'☕', reroll:'🎲' };
const UPGRADABLE = ['dough','sauce','cheese','topp','bake','knife','soak','snack'];

// what every face actually DOES — shown in the 📖 SPECIALS drawer and on long-press
const FACEINFO = {
  prep:   { ic:'🫓🍅🧀🍖', n:'Ingredients', d:'Fill matching slots of a waiting order — any order works.' },
  knife:  { ic:'🔪', n:'Knife', d:'Chops ANY ingredient: fills any one undone prep slot.' },
  bake:   { ic:'🔥', n:'Bake', d:'Serves a fully prepped pizza. More ● = bonus gold per serve.' },
  soak:   { ic:'🥖', n:'Breadsticks', d:'+● patience to EVERY waiting customer. Buys time.' },
  snack:  { ic:'💰', n:'Skim the Till', d:'Instant gold (2 × ●), no order needed.' },
  espresso:{ ic:'☕', n:'Espresso', d:'The NEXT face you use counts DOUBLE.' },
  reroll: { ic:'🎲', n:'Chaos Toss', d:'Rerolls ALL your other unused dice.' },
};

const STAFF = [
  { id:'gino',    n:'Gino the Gofer',        e:'🧑‍🍳', c:'#d96a4a', d:'Underpaid. Over-caffeinated.',            faces:['dough','sauce','cheese','topp','bake','knife'] },
  { id:'blorp',   n:'Blorp the Dish Slime',  e:'🟢',   c:'#6fae5c', d:'Technically 40% cheese.',                 faces:['cheese','topp','soak','soak','snack','bake'] },
  { id:'baron',   n:'Baron von Pepperoni',   e:'🎩',   c:'#b45a3c', d:'Aristocrat of cured meats.',              faces:['topp','topp','knife','bake','snack','topp'] },
  { id:'ember',   n:'Ember the Fire Spirit', e:'🔥',   c:'#e07b3a', d:'Bakes with feelings. Mostly rage.',       faces:['bake','bake','bake','dough','sauce','espresso'] },
  { id:'greg',    n:'Greg the Skeleton',     e:'💀',   c:'#9b93b8', d:'No stomach. Endless passion.',            faces:['dough','dough','sauce','soak','bake','knife'] },
  { id:'mimic',   n:'The Mimic',             e:'🧰',   c:'#c2a04e', d:'It ate the last cash register.',          faces:['snack','snack','snack','knife','soak','topp'] },
  { id:'wendy',   n:'Wendy the Wendigo',     e:'🦌',   c:'#8a6b45', d:'Prefers her toppings free-range.',        faces:['topp','topp','topp','knife','knife','bake'] },
  { id:'sandra',  n:'Sandra the Sauceress',  e:'🧙‍♀️', c:'#8a6fc0', d:'Sauces conjured, never stirred.',         faces:['sauce','sauce','cheese','cheese','reroll','bake'] },
  { id:'roberto', n:'Roberto the Raccoon',   e:'🦝',   c:'#7d8f55', d:'Five-finger discount on toppings.',       faces:['topp','snack','snack','knife','soak','reroll'] },
  { id:'moldy',   n:'Lord Moldy',            e:'🫕',   c:'#d9a13f', d:'A cheese golem. Aged past perfection.',   faces:['cheese','cheese','cheese','dough','bake','soak'] },
  { id:'crumb',   n:'Captain Crumb',         e:'🏴‍☠️', c:'#8a7a4a', d:'A mouse. A pirate. A mouse pirate.',       faces:['topp','snack','knife','snack','soak','reroll'], locked:true },
  { id:'nonna',   n:'Nonna',                 e:'👵',   c:'#b06a8f', d:'Your grandmother. Also a ghost. Also right.', faces:['dough','sauce','cheese','bake','bake','knife'], locked:true },
];
const DEFS = Object.fromEntries(STAFF.map(s => [s.id, s]));

/* ---------------- meta progression (survives death) ---------------- */
const META_KEY = 'dice-slice-meta-v1';
let meta = { fame:0, perks:{}, staff:[], runs:0, bestDay:0, totPizzas:0 };
function loadMeta(){
  try{
    const j = JSON.parse(localStorage.getItem(META_KEY));
    if(j) meta = { ...meta, ...j, perks:{ ...(j.perks || {}) }, staff:[ ...(j.staff || []) ] };
  }catch(e){}
}
function saveMeta(){ try{ localStorage.setItem(META_KEY, JSON.stringify(meta)); }catch(e){} }
function perkLvl(id){ return meta.perks[id] || 0; }

const PERKS = [
  { id:'gold',     e:'🪙', n:'Recipe Fund',        d:'+8 starting gold per level.',            costs:[8, 16, 28] },
  { id:'hearts',   e:'❤️', n:'Sturdy Reputation',  d:'+1 starting heart per level.',           costs:[15, 40] },
  { id:'patience', e:'🛋️', n:'Comfy Chairs',       d:'+1 patience for every customer.',        costs:[12, 30] },
  { id:'reroll',   e:'☕', n:'Barista Contract',   d:'+1 free reroll every turn.',             costs:[20, 45] },
  { id:'faces',    e:'🎓', n:'Staff Training',     d:'each starting staff gets one ●● face.',  costs:[25] },
  { id:'hearth',   e:'🪵', n:'Stone Hearth HQ',    d:'start every run with the Hearth (+1 gold per serve).', costs:[18] },
  { id:'viptip',   e:'🐉', n:'Dragon Loyalty',     d:'VIP customers pay +50%.',                costs:[22] },
];
const META_STAFF = [
  { id:'crumb', cost:30, d:'A tiny terror with a knife and no manners.' },
  { id:'nonna', cost:35, d:'Slaps dough. Slaps harder in death.' },
];

const ITEMS = [
  { id:'bell',    e:'🔔', n:'Service Bell',                 d:'Customers arrive with +1 patience.',        c:14 },
  { id:'hearth',  e:'🪵', n:'Stone Hearth',                 d:'+1 gold per pizza served.',                c:16 },
  { id:'insure',  e:'📋', n:'Thieves\' Guild "Insurance"',  d:'The first angry customer each day is free.', c:22 },
  { id:'menu',    e:'📜', n:'Illustrated Menu',             d:'Orders need one fewer ingredient.',        c:26 },
];

const CUSTT = [
  { e:'🧟', n:'Zombie' }, { e:'🧝', n:'Elf' }, { e:'🐀', n:'Ratkin' }, { e:'🐺', n:'Werewolf' },
  { e:'🧌', n:'Troll' }, { e:'🧙', n:'Wizard' }, { e:'🦇', n:'Bat' }, { e:'👹', n:'Oni' },
  { e:'🐸', n:'Blobkin' }, { e:'🕵️', n:'Cloaked Figure' }, { e:'🦝', n:'Raccoon' }, { e:'🧚', n:'Fairy' },
  { e:'👻', n:'Ghost' }, { e:'🧟‍♂️', n:'Adventurer, Barely' },
];
const FIRSTN = ['Grimble','Snorf','Brenda','Kevin','Xx_Darklord_xx','Sir Reginald','Mothra','Steve','Glorp Jr.','Miss Fizzwick','Bartholomew','Quib','Duchess Marge','Rattles','Fenwick','Old Tobbs','Yolanda','Skrimp'];
const EPITHET = ['the Unbread','of the Abyss','Esq.','the Mostly Harmless','III','the Peckish','the Newly Divorced','Knee-Crusher','the Fragrant','who Dines at Midnight','the Punctual','of the Wet Caves'];

const ARRIVE_Q = [
  'One large. No questions.', "I've been looting for 6 hours. STARVING.",
  'Is the chef... on fire? Good.', 'Gluten-free? Just kidding. Haunt me.',
  'Table for one. And my imp.', 'I smelled this from the third floor.',
  'No anchovies. I AM the anchovies.', 'Make it snappy. Literally.',
  'The prophecy spoke of this pizza.', "My horoscope said 'eat'.",
  "I'll pay in gold, teeth, or secrets.", "Last pizzeria closed after 'the incident'.",
];
const ANGRY_Q = [
  'I WILL LEAVE A SCATHING SCROLL REVIEW!', 'This is why the dungeon economy collapsed!',
  "I'm telling my guild about this!", '*static screaming*',
  'Your crust is a crime against crust.', 'I cursed your tip jar. FOREVER.',
  'Five stars? ZERO. STARS.', "FINE. I'll eat the adventurer instead.",
];
const SERVE_Q = [
  "It's... beautiful.", '5 stars. Would be haunted again.', 'The prophecy was TRUE!',
  'nom nom nom nom', 'I will remember this kindness. Fondly.',
  "Chef's kiss (the chef is a ghost).", 'Best dungeon slice in the realm!',
  "I'm crying. It's the chili. Probably.",
];

const EVENTS = [
  { id:'lich', e:'💀', t:'The Health Inspector Is A Lich', x:'A lich floats through the door, clipboard glowing faintly. “I sense… violations.”',
    o:[
      { l:'Bribe him (−8 gold)', fx:{ gold:-8 }, out:'He pockets the coins. “I saw nothing. I am blind. And dead.”' },
      { l:'Show him the kitchen', fx:{ gold:5, hearts:-1 }, out:'He fines you 5 gold for “unauthorized slime in the cheese zone”… but buys a slice on the way out.' },
    ]},
  { id:'ratkin', e:'🐀', t:'The Ratkin Union Is Picketing', x:'“BREADSTICKS FOR ALL WORKERS,” squeaks the shop steward, waving a tiny sign.',
    o:[
      { l:'Meet their demands (−6 gold)', fx:{ gold:-6, upRandom:1 }, out:'The rats sharpen your knives out of respect. A random face levels up!' },
      { l:'Refuse', fx:{ hearts:-1 }, out:'The picket line is four inches tall and completely effective. Nobody can get in.' },
    ]},
  { id:'gnome', e:'📱', t:'A Gnomefluencer Wants A Review', x:'“I have twelve followers,” she says, adjusting her tiny hat. “This could break you.”',
    o:[
      { l:'Comp her pizza (−5 gold)', fx:{ gold:-5, hearts:1 }, out:'“BEST PIZZA IN A DUNGEON” — all twelve followers now know. Reputation restored! (+1 ❤️)' },
      { l:'Charge her double (+8 gold)', fx:{ gold:8 }, out:'She pays. She also cries a little. It’s fine. Business is business.' },
    ]},
  { id:'mimic', e:'🧰', t:'A Mimic Applied For Register Duty', x:'Its résumé is just teeth. So many teeth.',
    o:[
      { l:'Hire it (−10 gold)', fx:{ gold:-10, hireMimic:1 }, out:'It grins — everywhere, somehow. The Mimic joins your staff!',
        cond:() => !S.staff.some(s => s.id === 'mimic') && S.staff.length < 6 },
      { l:'Decline politely', fx:{ gold:-4 }, out:'It eats 4 gold from the tip jar on the way out. Off to a competitor, presumably.' },
    ]},
  { id:'frat', e:'🥤', t:'The Gamma Kappa Goblins Want A Booking', x:'“We promise no property damage,” they lie, in unison.',
    o:[
      { l:'Take the booking (+12 gold)', fx:{ gold:12, crowd:1 }, out:'WORD. The basement will never be the same. (+1 extra customer per wave tomorrow!)' },
      { l:'Decline', fx:{}, out:'They leave quietly. Somehow, something is already on fire.' },
    ]},
  { id:'witch', e:'🧹', t:'The Janitor Witch Cursed The Oven', x:'“Grease fire in your future,” she cackles, pointing at the hearth with a mop.',
    o:[
      { l:'Pay her to lift it (−7 gold)', fx:{ gold:-7, upBake:1 }, out:'She scrubs the oven to a blinding shine. A bake face levels up! (Or +5 gold if nothing can bake.)' },
      { l:'Ignore her', fx:{ hearts:-1 }, out:'Grease fire. It spreads directly to your reputation.' },
    ]},
  { id:'bard', e:'🎻', t:'A Bard Wants To Play Live', x:'He tunes his lute. The lute screams a little. “I work for exposure,” he offers.',
    o:[
      { l:'Let him play', fx:{ patience:1 }, out:'Customers wait longer when there’s a soundtrack. (+1 patience for tomorrow.)' },
      { l:'Refuse', fx:{ gold:-3 }, out:'He writes a diss track about your crust on the spot. Tips suffer slightly.' },
    ]},
  { id:'dragon', e:'🐉', t:'A Dragon Reserved A Table For Two', x:'“It’s our 300th anniversary,” she rumbles. “We’ll take the corner booth. And the corner.”',
    o:[
      { l:'Accept the reservation', fx:{ vip:1 }, out:'Tomorrow: one VERY important customer. Huge order. Huge tip. Huge everything.' },
      { l:'Politely decline', fx:{}, out:'“Understandable. We’ll torch— visit elsewhere.”' },
    ]},
];

/* ---------------- state ---------------- */
const SAVE_KEY = 'dice-slice-save-v2'; // v2: rebalanced starts (3 dice, smaller orders) — old saves skipped
const MUTE_KEY = 'dice-slice-muted';
let S = null;
let CID = 0;
let muted = localStorage.getItem(MUTE_KEY) === '1';

function mk(id){ return { id, faces: DEFS[id].faces.map(t => ({ t, lvl:1 })) }; }

function freshState(){
  const staff = [mk('gino'), mk('blorp'), mk('greg')];
  if(perkLvl('faces')) staff.forEach(st => {
    const cands = st.faces.filter(f => UPGRADABLE.includes(f.t) && f.lvl < 3);
    if(cands.length) pick(cands).lvl = 2;
  });
  return {
    day:1, gold:10 + 8 * perkLvl('gold'),
    hearts:5 + perkLvl('hearts'), maxHearts:5 + perkLvl('hearts'),
    staff, items:perkLvl('hearth') ? { hearth:true } : {}, seenEvents:[], totServed:0,
    wave:1, waves:4, customers:[], dice:[], phase:'roll', double:false, selId:null, rerollsLeft:1,
    dayStats:{ served:0, earned:0, angry:0 }, insUsed:false, vipDue:false, pending:null,
    nextPatience:0, nextVIP:false, nextCrowd:false,
    hireOffers:[], curEvent:null, busy:false,
  };
}

/* ---------------- audio & haptics ---------------- */
let AC = null;
function ac(){
  try{
    if(!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if(AC.state === 'suspended') AC.resume();
  }catch(e){ AC = null; }
  return AC;
}
function tone(f, delay, dur, type='square', vol=.1){
  const ctx = ac(); if(!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + dur + .02);
}
function sfx(name){
  if(muted) return;
  switch(name){
    case 'tap':   tone(620, 0, .05, 'square', .05); break;
    case 'nope':  tone(150, 0, .12, 'sawtooth', .07); break;
    case 'roll':  for(let i=0;i<5;i++) tone(280 + Math.random()*520, i*.055, .045, 'triangle', .05); break;
    case 'serve': [523,659,784].forEach((f,i)=>tone(f, i*.09, .15, 'triangle', .12)); break;
    case 'angry': [220,160].forEach((f,i)=>tone(f, i*.13, .2, 'sawtooth', .09)); break;
    case 'coin':  [880,1318].forEach((f,i)=>tone(f, i*.07, .09, 'square', .07)); break;
  }
}
function buzz(v){ try{ navigator.vibrate && navigator.vibrate(v); }catch(e){} }

/* ---------------- ui bits ---------------- */
function showScreen(id){
  $$('.screen').forEach(s => s.classList.remove('active'));
  $('#' + id).classList.add('active');
}
function showModal(html){ $('#modal').innerHTML = html; $('#overlay').classList.remove('hidden'); }
function hideModal(){ $('#overlay').classList.add('hidden'); $('#modal').innerHTML = ''; }
function toast(txt, cls=''){
  const t = document.createElement('div');
  t.className = 'toast ' + cls;
  t.textContent = txt;
  const box = $('#toasts');
  while(box.children.length >= 3) box.firstChild.remove();
  box.appendChild(t);
  setTimeout(() => { t.classList.add('fadeout'); setTimeout(() => t.remove(), 400); }, 2600);
}
function floaty(el, txt){
  if(!el) return;
  const r = el.getBoundingClientRect(), a = $('#app').getBoundingClientRect();
  const d = document.createElement('div');
  d.className = 'floaty'; d.textContent = txt;
  d.style.left = (r.left - a.left + r.width/2 - 30) + 'px';
  d.style.top  = (r.top  - a.top) + 'px';
  $('#fx').appendChild(d);
  setTimeout(() => d.remove(), 1000);
}
const custEl = id => document.querySelector(`[data-act="cust"][data-id="${id}"]`);
const diceEl = i   => document.querySelector(`[data-act="die"][data-i="${i}"]`);

/* ---------------- day flow ---------------- */
function startDay(){
  S.wave = 1; S.customers = []; S.selId = null;
  S.dayStats = { served:0, earned:0, angry:0 };
  S.insUsed = false;
  S.waves = 3 + Math.min(3, Math.floor((S.day - 1) / 3));
  S.vipDue = (S.day % 5 === 0) || S.nextVIP;
  showScreen('scr-day');
  startWave();
}

function startWave(){
  arrivals();
  S.phase = 'roll'; S.double = false; S.busy = false;
  S.rerollsLeft = (S.day <= 2 ? 2 : 1) + perkLvl('reroll'); // training wheels + Barista Contract
  S.dice = S.staff.map(() => ({ i:-1, used:false }));
  autoSelect();
  renderDay();
  save();
  if(S.day === 1 && S.wave === 1) toast('🍽️ Morning! Tap ROLL to wake the staff.');
}

function arrivals(){
  // final wave is "last call" — no new arrivals, just finish what's on the table
  if(S.wave >= S.waves) return;
  const cap = 4;
  const present = () => S.customers.filter(c => !c.leaving).length;
  if(S.vipDue && S.wave >= Math.ceil(S.waves / 2)){
    S.vipDue = false;
    if(present() < cap){
      const v = genCust(true);
      S.customers.push(v);
      toast(`👑 ${v.name} arrives. The door frame survives. Barely.`);
    }
  }
  let n = 1 + (Math.random() < Math.min(.55, .06 * (S.day - 1)) ? 1 : 0) + (S.nextCrowd ? 1 : 0);
  const came = [];
  while(n-- > 0 && present() < cap){
    const c = genCust(false);
    S.customers.push(c);
    came.push(firstName(c));
  }
  if(came.length) toast(`🚪 ${came.join(' & ')} ${came.length > 1 ? 'wander' : 'wanders'} in.`);
}

function genCust(vip){
  const t = pick(CUSTT);
  // small orders early: day 1 = 1 ingredient, ramping to 5; VIPs are big but worth it
  let pts = vip ? Math.min(6, 2 + Math.floor(S.day / 2))
                : Math.min(5, 1 + Math.floor(S.day / 2));
  if(S.items.menu) pts = Math.max(1, pts - 1);
  // early orders use DISTINCT ingredients so any staff can cover them; repeats only in big orders
  const base = shuffle(['dough','sauce','cheese','topp']);
  const ings = pts <= 4 ? base.slice(0, pts) : base.concat(['topp','cheese']).slice(0, pts);
  const slots = ings.map(t => ({ t, done:false }));
  slots.push({ t:'bake', done:false });
  if(vip) slots.push({ t:'bake', done:false });
  // patience comfortably covers the order size; pressure only creeps in late
  let patience = 6 + pts + (vip ? 2 : 0) + (S.items.bell ? 1 : 0) + perkLvl('patience')
               + S.nextPatience - Math.min(3, Math.floor(S.day / 6));
  patience = Math.max(5, patience);
  return { id:++CID, ava:t.e, type:t.n, name:`${pick(FIRSTN)} ${pick(EPITHET)}`,
           quote:pick(ARRIVE_Q), order:slots, patience, maxPatience:patience, vip, leaving:null };
}

/* ---------------- rendering ---------------- */
function renderDay(){ renderTop(); renderCustomers(); renderDice(); renderActions(); }

function renderTop(){
  const hearts = '❤️'.repeat(Math.max(0, S.hearts)) + '🖤'.repeat(Math.max(0, S.maxHearts - S.hearts));
  $('#topbar').innerHTML =
    `<span class="stat">📅 Day ${S.day}</span>
     <span class="stat gold">🪙 ${S.gold}</span>
     <span class="stat">${hearts}</span>
     <span class="wave-ind">Wave ${Math.min(S.wave, S.waves)}/${S.waves}</span>`;
}

function custCard(c){
  // show what's still NEEDED first, finished slots last, bakes always at the end
  const sorted = [...c.order].sort((a, b) =>
    (a.done - b.done) || ((a.t === 'bake') - (b.t === 'bake')));
  const slots = sorted.map(s =>
    `<span class="slot ${s.done ? 'filled' : ''} ${s.t === 'bake' ? 'bakeslot' : ''}">${ICON[s.t]}</span>`).join('');
  const pct = clamp(c.patience / c.maxPatience * 100, 0, 100);
  const cls = pct > 50 ? '' : pct > 25 ? 'mid' : 'low';
  const extra = c.leaving === 'served' ? 'served' : c.leaving === 'angry' ? 'angry' : c.leaving === 'closed' ? 'closed' : '';
  return `<div class="cust ${c.vip ? 'vip' : ''} ${S.selId === c.id ? 'sel' : ''} ${extra}"
    data-act="cust" data-id="${c.id}">
    <div class="cust-head">
      <span class="cust-ava">${c.ava}</span>
      <div><div class="cust-name">${c.name}</div>
      <div class="cust-sub">${c.vip ? '👑 ' : ''}${c.quote}</div></div>
      ${c.vip ? '<span class="vipbadge">VIP 👑</span>' : ''}
    </div>
    <div class="order">${slots}</div>
    <div class="patience"><div class="pbar"><div class="pfill ${cls}" style="width:${pct}%"></div></div>
    <span class="pnum">🕐${Math.max(0, c.patience)}</span></div>
  </div>`;
}

function renderCustomers(){
  const list = S.customers;
  $('#custlist').innerHTML = list.length
    ? list.map(custCard).join('')
    : '<div class="empty-day">A quiet moment. Enjoy it. It never lasts.</div>';
}

function renderDice(){
  $('#dicegrid').innerHTML = S.dice.map((d, i) => {
    const st = S.staff[i], def = DEFS[st.id];
    const rolling = S.phase === 'roll';
    const f = rolling ? null : (st.faces[d.i] || st.faces[0]);
    const pickable = S.phase === 'reroll' && !d.used ? 'pickable' : '';
    const dim = S.phase === 'reroll' && d.used ? 'dim' : '';
    return `<button class="die ${d.used ? 'used' : ''} ${pickable} ${dim}" style="background:${def.c}"
      data-act="die" data-i="${i}" aria-label="${def.n} die">
      <span class="face-icon">${rolling ? '❓' : ICON[f.t]}</span>
      ${rolling ? '' : `<span class="pips">${'●'.repeat(f.lvl)}</span>`}
      <span class="owner">${def.e}</span>
    </button>`;
  }).join('');
}

function renderActions(){
  const a = $('#actions');
  if(S.phase === 'roll'){
    a.innerHTML = `<button class="btn primary big pulse" data-act="roll">🎲 ROLL THE STAFF</button>`;
  } else if(S.phase === 'resolve'){
    a.innerHTML = `<button class="btn primary big" disabled>…</button>`;
  } else {
    const allUsed = S.dice.every(d => d.used);
    const canReroll = S.rerollsLeft > 0 && !allUsed;
    a.innerHTML = `${canReroll ? `<button class="btn ghost" data-act="reroll-unused" style="flex:0 0 auto;font-size:15px;padding:14px 12px">🎲<br>Reroll${S.rerollsLeft > 1 ? ' ×' + S.rerollsLeft : ''}</button>` : ''}
      <button class="btn primary big ${allUsed ? 'pulse' : ''}" data-act="endturn">⏭️ End Turn</button>`;
  }
  $('#trayhint').innerHTML =
    S.phase === 'roll'  ? 'Tap ROLL to roll the staff!' :
    S.phase === 'resolve' ? 'Customers are deciding how they feel…' :
    (S.double ? '<span class="x2">☕ Next face ×2!</span> ' : '') +
    'Tap dice — they go to whoever needs them. Full order? 🔥 BAKE!';
}

/* ---------------- core actions ---------------- */
const undoneCount = c => c.order.filter(s => !s.done).length;

function autoSelect(){
  const waiting = S.customers.filter(c => !c.leaving);
  if(!waiting.length){ S.selId = null; return; }
  // focus-fire: the customer closest to finishing (tiebreak: least patient)
  const best = [...waiting].sort((a, b) => undoneCount(a) - undoneCount(b) || a.patience - b.patience)[0];
  S.selId = best.id;
}
function getSel(){
  let c = S.customers.find(c => c.id === S.selId && !c.leaving);
  if(!c){ autoSelect(); c = S.customers.find(c => c.id === S.selId && !c.leaving); }
  return c || null;
}
// faces go where they're needed: selected customer first, else whoever wants it most urgently
function pickTarget(needs){
  const waiting = S.customers.filter(c => !c.leaving);
  if(!waiting.length) return null;
  const sel = waiting.find(c => c.id === S.selId);
  if(sel && needs(sel)) return sel;
  return waiting.filter(needs).sort((a, b) => a.patience - b.patience)[0] || null;
}

function doRoll(){
  if(S.phase !== 'roll' || S.busy) return;
  S.busy = true;
  sfx('roll'); buzz(15);
  $$('#dicegrid .die').forEach(d => d.classList.add('rolling'));
  setTimeout(() => {
    S.dice.forEach(d => { d.i = R(0, 5); d.used = false; });
    S.phase = 'act'; S.busy = false;
    renderDay();
    save();
    if(S.day === 1 && S.wave === 1) toast('Fill ingredients in ANY order — then tap a 🔥 die to bake & serve!');
  }, 420);
}

function fillSlots(cust, t, n){
  let filled = 0;
  for(const s of cust.order){
    if(filled >= n) break;
    if(!s.done && s.t === t){ s.done = true; filled++; }
  }
  return filled;
}
function fillAny(cust, n){
  let filled = 0;
  for(const s of cust.order){
    if(filled >= n) break;
    if(!s.done && s.t !== 'bake'){ s.done = true; filled++; }
  }
  return filled;
}

function useDie(i){
  if(S.busy) return;
  const d = S.dice[i];
  if(!d) return;
  if(S.phase !== 'act' || d.used) return;

  const st = S.staff[i], f = st.faces[d.i];
  const mult = S.double ? 2 : 1;
  let consumed = false;

  switch(f.t){
    case 'dough': case 'sauce': case 'cheese': case 'topp': {
      const tgt = pickTarget(c => c.order.some(s => !s.done && s.t === f.t));
      if(!tgt){ toast(`Nobody needs ${ICON[f.t]} right now.`, 'bad'); sfx('nope'); return; }
      fillSlots(tgt, f.t, f.lvl * mult);
      if(tgt.id !== S.selId){ S.selId = tgt.id; toast(`${firstName(tgt)} takes the ${ICON[f.t]}.`); }
      consumed = true; break;
    }
    case 'knife': {
      const tgt = pickTarget(c => c.order.some(s => !s.done && s.t !== 'bake'));
      if(!tgt){ toast('Nothing left to chop — only baking remains!', 'bad'); sfx('nope'); return; }
      fillAny(tgt, f.lvl * mult);
      if(tgt.id !== S.selId){ S.selId = tgt.id; toast(`🔪 ${firstName(tgt)} takes the chopped goods.`); }
      consumed = true; break;
    }
    case 'bake': {
      const tgt = pickTarget(c => !c.order.some(s => !s.done && s.t !== 'bake') && c.order.some(s => !s.done));
      if(!tgt){ toast('No pizza is ready to bake!', 'bad'); sfx('nope'); return; }
      if(!tryBake(tgt, f.lvl * mult, f.lvl)) return;
      consumed = true; break;
    }
    case 'soak': {
      const waiting = S.customers.filter(c => !c.leaving);
      if(!waiting.length){ toast('Nobody to calm down.', 'bad'); return; }
      waiting.forEach(c => c.patience = Math.min(c.maxPatience + 3, c.patience + f.lvl * mult));
      toast(`🥖 Complimentary breadsticks! (+${f.lvl * mult} patience all around)`, 'good');
      consumed = true; break;
    }
    case 'snack': {
      const g = 2 * f.lvl * mult;
      S.gold += g; S.dayStats.earned += g;
      sfx('coin'); floaty(diceEl(i), `+${g}🪙`);
      toast("💰 Skimmed the till. Don't tell the guild.", 'gold');
      consumed = true; break;
    }
    case 'espresso': {
      S.double = true;
      toast('☕ Espresso shot! Next face is DOUBLED.', 'gold');
      consumed = true; break;
    }
    case 'reroll': {
      d.used = true;
      let n = 0;
      S.dice.forEach((od, j) => { if(j !== i && !od.used){ od.i = R(0, 5); n++; } });
      sfx('roll'); buzz(10);
      toast(n ? `🎲 Chaos toss! Rerolled ${n} dice.` : '🎲 Dramatic reroll of nothing.');
      renderDay();
      return;
    }
  }

  if(consumed){
    d.used = true;
    if(f.t !== 'espresso') S.double = false;
    sfx('tap'); buzz(8);
    autoSelectIfGone();
    renderDay();
    save();
    if(S.dice.every(x => x.used)) toast('All dice used — End Turn!');
  }
}
function autoSelectIfGone(){
  if(S.selId && !S.customers.some(c => c.id === S.selId && !c.leaving)) autoSelect();
}

function tryBake(cust, n, bakeLvl){
  if(cust.order.some(s => !s.done && s.t !== 'bake')){
    toast('Finish the toppings before baking!', 'bad');
    sfx('nope'); return false;
  }
  const undone = cust.order.filter(s => !s.done);
  if(!undone.length){ toast('That one is already served!', 'bad'); return false; }
  undone.slice(0, n).forEach(s => { s.done = true; });
  if(cust.order.every(s => s.done)){
    serve(cust, bakeLvl);
  } else {
    toast('🔥 Party platter — it needs ANOTHER bake!', 'gold');
  }
  return true;
}

function serve(cust, bakeLvl){
  const pts = cust.order.filter(s => s.t !== 'bake').length;
  let pay = 4 + pts * 2 + Math.max(0, cust.patience) + bakeLvl + (S.items.hearth ? 1 : 0);
  if(cust.vip) pay = Math.round(pay * (perkLvl('viptip') ? 3.75 : 2.5));
  S.gold += pay;
  S.dayStats.served++; S.dayStats.earned += pay; S.totServed++;
  floaty(custEl(cust.id), `+${pay}🪙`);
  toast(`“${pick(SERVE_Q)}” — ${firstName(cust)} (+${pay} gold)`, 'good');
  sfx('serve'); buzz(25);
  cust.leaving = 'served';
  autoSelectIfGone();
  renderDay();
  setTimeout(() => {
    S.customers = S.customers.filter(c => c.id !== cust.id);
    renderCustomers();
  }, 620);
}

function endTurn(){
  if(S.phase !== 'act' && S.phase !== 'reroll') return;
  S.phase = 'resolve';
  const waiting = S.customers.filter(c => !c.leaving);
  waiting.forEach(c => c.patience--);
  renderDay();
  const rage = waiting.filter(c => c.patience <= 0);
  if(rage.length){
    rage.forEach((c, i) => setTimeout(() => angryLeave(c), 350 + i * 480));
    setTimeout(afterRage, 350 + rage.length * 480 + 750);
  } else {
    setTimeout(afterRage, 480);
  }
}

function angryLeave(c){
  if(c.leaving) return;
  const loss = c.vip ? 2 : 1;
  let free = false;
  if(S.items.insure && !S.insUsed){ S.insUsed = true; free = true; }
  else S.hearts = Math.max(0, S.hearts - loss);
  S.dayStats.angry++;
  toast(`“${pick(ANGRY_Q)}” — ${firstName(c)} storms out${free ? ' (insurance covered it!)' : ` (−${loss} ❤️)`}!`, 'bad');
  sfx('angry'); buzz(60);
  c.leaving = 'angry';
  autoSelectIfGone();
  renderDay();
  setTimeout(() => {
    S.customers = S.customers.filter(x => x.id !== c.id);
    renderCustomers();
  }, 950);
}

function afterRage(){
  if(S.hearts <= 0){ gameOver(); return; }
  S.wave++;
  if(S.wave > S.waves) closingTime();
  else startWave();
}

function closingTime(){
  const left = S.customers.filter(c => !c.leaving);
  if(left.length){
    toast(`🌙 Closing time! ${left.map(firstName).join(', ')} shuffle${left.length > 1 ? '' : 's'} out, pizzas unfinished.`);
    left.forEach(c => c.leaving = 'closed');
    renderCustomers();
  }
  setTimeout(dayEnd, 550);
}

/* ---------------- day end / events / shop ---------------- */
function dayEnd(){
  S.nextPatience = 0; S.nextVIP = false; S.nextCrowd = false;
  S.hireOffers = makeOffers();
  S.pending = 'summary';
  save();
  showModal(`<div class="m-emoji">🌙</div><h3>Day ${S.day} closed!</h3>
    <div class="sumgrid">
      <div><div class="v">${S.dayStats.served}🍕</div><div class="l">served</div></div>
      <div><div class="v">+${S.dayStats.earned}🪙</div><div class="l">earned</div></div>
      <div><div class="v">${S.dayStats.angry}😡</div><div class="l">walked out</div></div>
    </div>
    <p class="m-text">Reputation: ${'❤️'.repeat(Math.max(0, S.hearts))}${'🖤'.repeat(Math.max(0, S.maxHearts - S.hearts))}</p>
    <button class="btn primary" data-act="sum-ok">Onward →</button>`);
}

// hire pool: everyone already on the payroll is out; locked staff only if unlocked in the Franchise
function poolStaff(){
  return Object.keys(DEFS).filter(id =>
    (!DEFS[id].locked || meta.staff.includes(id)) && !S.staff.some(s => s.id === id));
}
function makeOffers(){
  return shuffle(poolStaff()).slice(0, 3);
}

function showEvent(ev){
  showModal(`<div class="m-emoji">${ev.e}</div><h3>${ev.t}</h3><p class="m-text">${ev.x}</p>
    <div class="m-opts">${ev.o.map((o, i) => {
      const ok = (o.cond ? o.cond() : true) && !(o.fx.gold < 0 && S.gold < -o.fx.gold);
      return `<button class="btn ${i === 0 ? 'primary' : ''} ${ok ? '' : 'cant'}" data-act="evopt" data-i="${i}" ${ok ? '' : 'disabled'}>${o.l}</button>`;
    }).join('')}</div>`);
}

function maybeEvent(){
  const pool = EVENTS.filter(ev => !S.seenEvents.includes(ev.id));
  if(pool.length && Math.random() < .75){
    const ev = pick(pool);
    S.seenEvents.push(ev.id);
    S.curEvent = ev;
    S.pending = 'event';
    save();
    showEvent(ev);
  } else {
    openShop();
  }
}

function candidates(t){
  const out = [];
  S.staff.forEach(st => st.faces.forEach(f => {
    if(UPGRADABLE.includes(f.t) && f.lvl < 3 && (!t || f.t === t)) out.push(f);
  }));
  return out;
}

function applyFx(fx){
  fx = fx || {};
  if(fx.gold){
    S.gold = Math.max(0, S.gold + fx.gold);
    if(fx.gold > 0){ S.dayStats.earned += fx.gold; sfx('coin'); }
  }
  if(fx.hearts) S.hearts = clamp(S.hearts + fx.hearts, 0, S.maxHearts);
  if(fx.patience) S.nextPatience += fx.patience;
  if(fx.crowd) S.nextCrowd = true;
  if(fx.vip) S.nextVIP = true;
  if(fx.upRandom){ const c = candidates(); if(c.length) pick(c).lvl++; }
  if(fx.upBake){ const c = candidates('bake'); if(c.length) pick(c).lvl++; else S.gold += 5; }
  if(fx.hireMimic && !S.staff.some(s => s.id === 'mimic') && S.staff.length < 6) S.staff.push(mk('mimic'));
}

function costFor(lvl){ return lvl === 1 ? 10 + 2 * S.day : lvl === 2 ? 22 + 4 * S.day : null; }

function openShop(){ S.pending = 'shop'; save(); showScreen('scr-shop'); renderShop(); }

function renderShop(){
  $('#shopbar').innerHTML =
    `<span class="stat">🛒 Between Days</span>
     <span class="stat gold">🪙 ${S.gold}</span>
     <span class="stat">❤️ ${S.hearts}/${S.maxHearts}</span>`;

  let h = '';
  h += `<div class="shop-h">🔪 Hire Staff</div>`;
  if(S.staff.length >= 6){
    h += `<div class="shop-card"><div class="ds">Kitchen's full. Six dice is plenty of chaos.</div></div>`;
  } else if(!S.hireOffers.length){
    h += `<div class="shop-card"><div class="ds">Everyone in the realm is employed. Miraculous.</div></div>`;
  } else {
    S.hireOffers.forEach((id, i) => {
      const d = DEFS[id], cost = 15 + 2 * S.day + i * 4;
      const ok = S.gold >= cost;
      h += `<div class="shop-card"><div class="row">
        <span class="ava">${d.e}</span>
        <div><div class="nm">${d.n}</div><div class="ds">${d.d}</div></div>
        <button class="btn buy ${ok ? '' : 'cant'}" data-act="hire" data-id="${id}" ${ok ? '' : 'disabled'}>${cost}🪙</button>
      </div></div>`;
    });
  }

  h += `<div class="shop-h">⬆️ Upgrade Faces</div>`;
  S.staff.forEach((st, di) => {
    const def = DEFS[st.id];
    h += `<div class="shop-card"><div class="row"><span class="ava">${def.e}</span><div class="nm">${def.n}</div></div>
      <div class="faces-row">`;
    st.faces.forEach((f, fi) => {
      if(!UPGRADABLE.includes(f.t)){
        h += `<button class="facebtn max" disabled>${ICON[f.t]} —</button>`;
      } else {
        const cost = costFor(f.lvl);
        if(cost == null){
          h += `<button class="facebtn max" disabled>${ICON[f.t]} ${'●'.repeat(f.lvl)} MAX</button>`;
        } else {
          const ok = S.gold >= cost;
          h += `<button class="facebtn ${ok ? '' : 'cant'}" data-act="upg" data-d="${di}" data-f="${fi}" ${ok ? '' : 'disabled'}>
            ${ICON[f.t]} ${'●'.repeat(f.lvl)} <span class="fc">${cost}🪙</span></button>`;
        }
      }
    });
    h += `</div></div>`;
  });

  h += `<div class="shop-h">🛠️ Equipment</div>`;
  let any = false;
  ITEMS.forEach(it => {
    if(S.items[it.id]) return;
    any = true;
    const ok = S.gold >= it.c;
    h += `<div class="shop-card"><div class="row">
      <span class="ava">${it.e}</span>
      <div><div class="nm">${it.n}</div><div class="ds">${it.d}</div></div>
      <button class="btn buy ${ok ? '' : 'cant'}" data-act="item" data-id="${it.id}" ${ok ? '' : 'disabled'}>${it.c}🪙</button>
    </div></div>`;
  });
  if(!any) h += `<div class="shop-card"><div class="ds">You own everything. Capitalism complete.</div></div>`;

  $('#shopbody').innerHTML = h;
  $('#shopfoot').innerHTML = `<button class="btn primary pulse" data-act="openday">🌅 Open for Day ${S.day + 1}</button>`;
}

/* ---------------- save / load / game over ---------------- */
function save(){
  // snapshot the WHOLE run — refresh mid-wave resumes exactly here
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch(e){}
}
function load(){
  try{
    const j = JSON.parse(localStorage.getItem(SAVE_KEY));
    if(!j || !j.staff || !j.staff.length) return false;
    S = { ...freshState(), ...j };
    return true;
  }catch(e){ return false; }
}
function resumeRun(){
  if(S.pending === 'shop'){ openShop(); return; }
  if(S.phase === 'resolve') S.phase = 'act'; // refreshed mid-animation: fall back to a safe phase
  showScreen('scr-day');
  renderDay();
  if(S.pending === 'summary') dayEnd();
  else if(S.pending === 'event' && S.curEvent){
    const ev = EVENTS.find(e => e.id === S.curEvent.id); // re-find to restore option conditions
    if(ev) showEvent(ev);
  }
}
function refreshTitle(){
  const has = !!localStorage.getItem(SAVE_KEY);
  $('#btn-continue').classList.toggle('hidden', !has);
  $('#btn-franchise').textContent = meta.fame > 0 ? `🏛️ Franchise ⭐${meta.fame}` : '🏛️ Franchise';
}

function gameOver(){
  const fameGain = S.day * 2 + S.totServed + (S.day >= 10 ? 10 : 0);
  meta.fame += fameGain;
  meta.runs++;
  meta.bestDay = Math.max(meta.bestDay, S.day);
  meta.totPizzas += S.totServed;
  saveMeta();
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
  const days = S.day, pz = S.totServed;
  const rank = days < 3 ? 'Dish Pit Casualty'
             : days < 6 ? 'Apprentice of Appetites'
             : days < 10 ? 'Certified Dungeon Caterer'
             : days < 15 ? 'Legend of the Deep Dish'
             : 'The Crust That Cannot Be Contained';
  $('#scr-over').innerHTML = `
    <div class="big3">🪦</div>
    <h2>Shut Down!</h2>
    <p class="epitaph">The Guild of Dungeon Hospitality revokes your license. Your last customers were heard muttering about “the wait times” and “the literal fire elemental on payroll”.</p>
    <p class="stats">You survived <b>${days}</b> day${days > 1 ? 's' : ''} and served <b>${pz}</b> pizza${pz === 1 ? '' : 's'}.<br>Final rank: <b>${rank}</b><br>
    <span class="fame-line">⭐ +${fameGain} Fame banked (total ⭐${meta.fame})</span></p>
    <button class="btn primary big" data-act="restart">🔄 New Run</button>
    <button class="btn big ghost" data-act="franchise">🏛️ Franchise Ledger</button>`;
  showScreen('scr-over');
  sfx('angry');
}

/* ---------------- franchise ledger (meta shop) ---------------- */
function showFranchise(){
  const rows = PERKS.map(p => {
    const lvl = perkLvl(p.id), max = p.costs.length;
    const cost = lvl < max ? p.costs[lvl] : null;
    const can = cost != null && meta.fame >= cost;
    return `<div class="shop-card"><div class="row">
      <span class="ava">${p.e}</span>
      <div><div class="nm">${p.n} <span class="fame-lv">${'★'.repeat(lvl)}${'☆'.repeat(max - lvl)}</span></div>
      <div class="ds">${p.d}</div></div>
      ${cost == null ? '<span class="maxed">MAX</span>'
        : `<button class="btn buy ${can ? '' : 'cant'}" data-act="perk-buy" data-id="${p.id}" ${can ? '' : 'disabled'}>⭐${cost}</button>`}
    </div></div>`;
  }).join('');
  const stf = META_STAFF.map(ms => {
    const owned = meta.staff.includes(ms.id);
    const can = meta.fame >= ms.cost;
    return `<div class="shop-card"><div class="row">
      <span class="ava">${DEFS[ms.id].e}</span>
      <div><div class="nm">${DEFS[ms.id].n}</div><div class="ds">${ms.d}</div></div>
      ${owned ? '<span class="maxed">IN POOL ✔</span>'
        : `<button class="btn buy ${can ? '' : 'cant'}" data-act="meta-staff" data-id="${ms.id}" ${can ? '' : 'disabled'}>⭐${ms.cost}</button>`}
    </div></div>`;
  }).join('');
  showModal(`<h3>🏛️ The Franchise Ledger</h3>
    <p class="m-text">Fame ⭐<b>${meta.fame}</b> — earned every run, kept forever.<br>
    Runs: ${meta.runs} · Best: day ${meta.bestDay} · Lifetime pizzas: ${meta.totPizzas}</p>
    <div class="shop-h" style="text-align:left">⭐ Permanent Perks</div>${rows}
    <div class="shop-h" style="text-align:left">👻 Unlock Staff (join the hire pool)</div>${stf}
    <button class="btn primary" data-act="closemodal">Back</button>`);
}

/* ---------------- help ---------------- */
function showHelp(){
  showModal(`<div class="m-emoji">🎲🍕</div><h3>How To Play</h3>
  <div class="help">
    <p><b>Goal:</b> run the only pizzeria in a dungeon. Don't go broke. Don't die of embarrassment.</p>
    <p><b>1.</b> Each turn, <b>🎲 ROLL</b> your staff. Every die shows one face.</p>
    <p><b>2.</b> <b>Tap dice</b> to fill orders: they automatically go to whoever needs them
      (tap a customer to focus them first). Ingredients — <span class="ic">🫓</span> <span class="ic">🍅</span>
      <span class="ic">🧀</span> <span class="ic">🍖</span> — work in <b>any order</b>, then
      <span class="ic">🔥</span> <b>bake</b> to serve.</p>
    <p><b>3.</b> 🕐 patience drops every turn. Angry customers cost <b>❤️ hearts</b>. Zero hearts = shut down.</p>
    <p><b>Bad roll?</b> Use the free <b>🎲 Reroll</b> on unused dice — twice a turn on days 1–2.</p>
    <p><b>Special faces:</b> <span class="ic">🔪</span> any ingredient · <span class="ic">🥖</span> +patience all ·
      <span class="ic">💰</span> instant gold · <span class="ic">☕</span> next face ×2 · <span class="ic">🎲</span> reroll all other dice.</p>
    <p><b>📖 SPECIALS tab</b> on the right edge lists every face effect — and you can
      <b>long-press any die</b> to see what its current face does.</p>
    <p><b>Between days:</b> hire weirdos, upgrade faces (<b>●●●</b> = stronger), buy equipment, survive random nonsense.</p>
    <p><b>Died?</b> The run ends, but ⭐ <b>Fame</b> is forever — spend it in the 🏛️ <b>Franchise Ledger</b>
      (title screen) on permanent perks and ghost staff.</p>
  </div>
  <button class="btn primary" data-act="closemodal">Got it 🍕</button>`);
}

/* ---------------- specials legend & face tips ---------------- */
function renderSpecials(){
  const rows = Object.values(FACEINFO).map(f =>
    `<div class="sp-row"><span class="sp-ic">${f.ic}</span>
     <div><div class="sp-nm">${f.n}</div><div class="sp-ds">${f.d}</div></div></div>`).join('');
  $('#specials-body').innerHTML =
    `<div class="sp-head"><h3 class="sp-h2">📖 Special Faces</h3>
     <button class="sp-close" data-act="closespecials">✖</button></div>
    <div class="sp-note">● pips = face level — more pips, stronger effect. Upgrade faces in the shop between days.</div>
    ${rows}
    <div class="sp-note">Dice automatically go to whichever customer needs them (tap a customer to focus them first).
    The 🎲 Reroll button rerolls unused dice free — twice a turn on days 1–2.
    <b>Long-press any die</b> to see what its current face does.</div>`;
}
function showFaceTip(i){
  const d = S.dice[i], box = $('#facetip');
  if(!d || !box) return;
  if(S.phase === 'roll'){
    box.innerHTML = `<span class="ft-icon">❓</span><b>Unrolled</b><span>Tap ROLL to wake the staff.</span>`;
  } else {
    const f = S.staff[i].faces[d.i], info = FACEINFO[f.t] || { n: f.t, d: '' };
    box.innerHTML = `<span class="ft-icon">${ICON[f.t]}</span>
      <b>${info.n} ${'●'.repeat(f.lvl)}${d.used ? ' (used)' : ''}</b>
      <span>${info.d || 'Fills a matching slot.'}</span>`;
  }
  box.classList.add('show');
}
function hideFaceTip(){ const b = $('#facetip'); if(b) b.classList.remove('show'); }

let lpTimer = null, lpFired = false, lpX = 0, lpY = 0;
document.addEventListener('pointerdown', e => {
  hideFaceTip();
  const el = e.target.closest('.die');
  if(!el || el.disabled) return;
  lpFired = false;
  lpX = e.clientX; lpY = e.clientY;
  const i = Number(el.dataset.i);
  lpTimer = setTimeout(() => { lpFired = true; showFaceTip(i); buzz(25); }, 430);
}, { passive: true });
['pointerup', 'pointercancel'].forEach(ev =>
  document.addEventListener(ev, () => clearTimeout(lpTimer), { passive: true }));
document.addEventListener('pointermove', e => {
  if(lpTimer && Math.hypot(e.clientX - lpX, e.clientY - lpY) > 8) clearTimeout(lpTimer);
}, { passive: true });
document.addEventListener('contextmenu', e => { if(e.target.closest('.die')) e.preventDefault(); });

/* ---------------- event delegation ---------------- */
function updateMuteBtn(){ $('#btn-mute').textContent = muted ? '🔇 Sound: Off' : '🔊 Sound: On'; }

function onAction(e){
  const el = e.target.closest('[data-act]');
  if(!el) return;
  const act = el.dataset.act;
  switch(act){
    case 'newgame':
      S = freshState();
      showScreen('scr-day'); startDay();
      toast('🍕 Welcome to the dungeon pizzeria. Good luck.');
      break;
    case 'continue':
      if(load()) resumeRun();
      else toast('No save found — start a New Game!', 'bad');
      break;
    case 'help': showHelp(); break;
    case 'closemodal': hideModal(); break;
    case 'franchise': showFranchise(); sfx('tap'); break;
    case 'perk-buy': {
      const p = PERKS.find(x => x.id === el.dataset.id);
      if(!p) return;
      const lvl = perkLvl(p.id);
      if(lvl >= p.costs.length || meta.fame < p.costs[lvl]) return;
      meta.fame -= p.costs[lvl];
      meta.perks[p.id] = lvl + 1;
      saveMeta();
      sfx('coin'); toast(`${p.e} ${p.n} → ${'★'.repeat(lvl + 1)}! Applies to every new run.`, 'gold');
      showFranchise(); refreshTitle();
      break;
    }
    case 'meta-staff': {
      const ms = META_STAFF.find(x => x.id === el.dataset.id);
      if(!ms || meta.staff.includes(ms.id) || meta.fame < ms.cost) return;
      meta.fame -= ms.cost;
      meta.staff.push(ms.id);
      saveMeta();
      sfx('coin'); toast(`${DEFS[ms.id].e} ${DEFS[ms.id].n} haunts the hire pool forever!`, 'gold');
      showFranchise(); refreshTitle();
      break;
    }
    case 'mute':
      muted = !muted;
      try{ localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); }catch(err){}
      updateMuteBtn(); if(!muted) sfx('tap');
      break;
    case 'roll': doRoll(); break;
    case 'endturn': sfx('tap'); endTurn(); break;
    case 'die':
      if(lpFired){ lpFired = false; return; } // long-press showed a tip; don't spend the die
      useDie(Number(el.dataset.i));
      break;
    case 'specials': $('#specials-panel').classList.toggle('open'); sfx('tap'); buzz(6); break;
    case 'closespecials': $('#specials-panel').classList.remove('open'); sfx('tap'); break;
    case 'reroll-unused': {
      if(S.phase !== 'act' || S.rerollsLeft <= 0) return;
      S.rerollsLeft--;
      S.dice.forEach(d => { if(!d.used) d.i = R(0, 5); });
      sfx('roll'); buzz(10);
      toast(S.rerollsLeft > 0 ? '🎲 Reroll! (one more left)' : '🎲 Free reroll used!');
      renderDay();
      save();
      break;
    }
    case 'cust':
      S.selId = Number(el.dataset.id);
      sfx('tap'); buzz(6);
      renderCustomers();
      break;
    case 'sum-ok': hideModal(); maybeEvent(); break;
    case 'evopt': {
      const o = S.curEvent.o[Number(el.dataset.i)];
      applyFx(o.fx);
      showModal(`<div class="m-emoji">${S.curEvent.e}</div><h3>${S.curEvent.t}</h3>
        <p class="m-out">${o.out}</p>
        <button class="btn primary" data-act="ev-done">Onward →</button>`);
      break;
    }
    case 'ev-done':
      hideModal();
      if(S.hearts <= 0) gameOver(); else openShop();
      break;
    case 'hire': {
      const id = el.dataset.id, i = S.hireOffers.indexOf(id);
      const cost = 15 + 2 * S.day + i * 4;
      if(i < 0 || S.gold < cost || S.staff.length >= 6) return;
      S.gold -= cost;
      S.staff.push(mk(id));
      S.hireOffers.splice(i, 1);
      sfx('coin'); toast(`${DEFS[id].e} ${DEFS[id].n} joins the kitchen!`, 'good');
      renderShop(); save();
      break;
    }
    case 'upg': {
      const d = Number(el.dataset.d), f = Number(el.dataset.f);
      const face = S.staff[d].faces[f];
      const cost = costFor(face.lvl);
      if(cost == null || S.gold < cost) return;
      S.gold -= cost; face.lvl++;
      sfx('coin'); toast(`⬆️ ${DEFS[S.staff[d].id].n}'s ${ICON[face.t]} face is now ${'●'.repeat(face.lvl)}!`, 'good');
      renderShop(); save();
      break;
    }
    case 'item': {
      const it = ITEMS.find(x => x.id === el.dataset.id);
      if(!it || S.items[it.id] || S.gold < it.c) return;
      S.gold -= it.c; S.items[it.id] = true;
      sfx('coin'); toast(`${it.e} ${it.n} installed!`, 'good');
      renderShop(); save();
      break;
    }
    case 'openday':
      S.day++;
      S.pending = null;
      save();
      hideModal();
      showScreen('scr-day');
      startDay();
      break;
    case 'restart':
      S = freshState();
      showScreen('scr-day'); startDay();
      break;
  }
}

/* ---------------- init ---------------- */
document.body.addEventListener('click', onAction);
updateMuteBtn();
loadMeta();
renderSpecials();
refreshTitle();
if('serviceWorker' in navigator && location.protocol !== 'file:'){
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
