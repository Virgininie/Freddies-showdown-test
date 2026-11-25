const app = document.querySelector('#app');
const welcome = document.querySelector('#welcome');
const room = new URLSearchParams(location.search).get('r')?.trim().toUpperCase();
const host = !room;
document.body.classList.toggle('phone', !host);
const socket = io('/showdown');
const escaped = value => String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tokenKey = 'showdown:player:' + room;
const rules = [
  '',
  '25 questions · 15 secondes par question. La première bonne réponse rapporte 2 points, les suivantes 1 point. Tu peux changer une fois avant la fermeture.',
  '20 questions · 5 secondes avant chaque question pour jouer un joker. Les joueurs éliminés peuvent répondre hors classement.',
  'Choisis une catégorie et six difficultés. Une bonne réponse vaut de 1 à 3 points. Les deux meilleurs passent en finale.',
];
const roundNames = ['','Mixte','Jokers','Catégories','Top chrono'];
const powerNames = {double:'×2 Double',block:'⛔ Blocage',steal:'↗ Vol'};
let state, audio, selected, targetPower, nickname = '', message = '', category = '', levels = [], deadline = 0;
let sound = false;
let lastFeedback = null;
let readyNotified = false;
let formBusy = false;
let answerPending = false;

function tone(frequency, duration = .14, start = 0, type = 'sine') {
  if (!audio || !sound) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const at = audio.currentTime + start;
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(.09,at);
  gain.gain.exponentialRampToValueAtTime(.002,at + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(at);
  osc.stop(at + duration);
}

function setMessage(text) {
  message = text || '';
  const status = document.querySelector('#status');
  if (status) status.textContent = message;
}

function join(name, after) {
  if (formBusy) return;
  formBusy = true;
  socket.emit('showdown:join',{code:room,token:localStorage.getItem(tokenKey),name}, reply => {
    formBusy = false;
    if (reply.error) {
      localStorage.removeItem(tokenKey);
      setMessage(reply.error);
    } else {
      localStorage.setItem(tokenKey,reply.token);
      after?.();
    }
  });
}

socket.on('connect',() => {
  formBusy = false;
  if (host) {
    const session = JSON.parse(sessionStorage.getItem('showdown:host') || '{}');
    socket.emit('showdown:host',session, reply => sessionStorage.setItem('showdown:host',JSON.stringify(reply)));
  } else if (localStorage.getItem(tokenKey)) join();
  else render();
});
socket.on('disconnect',() => setMessage('Connexion interrompue. Reconnexion en cours…'));
socket.on('showdown:removed',() => {
  localStorage.removeItem(tokenKey);
  state = null;
  selected = null;
  message = 'La game master a retiré ton inscription.';
  render();
});
socket.on('showdown:state',next => {
  const previous = state;
  const transition = !previous || previous.ticket !== next.ticket;
  state = next;
  deadline = next.ends ? Date.now() + (next.ends - next.serverNow) : 0;
  if (transition) {
    answerPending = false;
    setMessage('');
    targetPower = null;
    if (next.phase === 'pick') { category = ''; levels = []; }
  }
  if (host) {
    if (next.phase !== 'lobby') welcome.pause();
    if (next.allReady && next.phase === 'lobby' && !readyNotified) tone(660,.2);
    readyNotified = next.allReady && next.phase === 'lobby';
    if (next.feedback && lastFeedback !== next.feedback.serial) {
      lastFeedback = next.feedback.serial;
      if (next.feedback.type === 'bell') { tone(880); tone(1320,.18,.045); }
      if (next.feedback.type === 'buzz') tone(160,.24,0,'triangle');
    }
    if (transition && next.phase === 'countdown') tone(440,.1);
    if (transition && next.phase === 'qualification') { tone(523); tone(784,.22,.09); }
    if (transition && next.phase === 'winner') [523,659,784,1047].forEach((note,i) => tone(note,.27,i * .1));
  }
  if (!host && next.taken.includes(selected) && !next.me.avatar) selected = null;
  const localChange = !host && (next.me?.pick?.choice !== previous?.me?.pick?.choice || next.me?.selected !== previous?.me?.selected);
  if (transition || localChange || next.phase === 'lobby' || (host && next.phase === 'finalRun')) render();
});

const button = (label,action,disabled = false) => `<button data-action="${action}" ${disabled ? 'disabled' : ''}>${label}</button>`;
const portrait = id => id <= avatarFrames.length ? avatarPortrait(id)
  : `<img class="avatar-image" src="/showdown/portrait/${id}" alt="">`;
const avatar = p => p?.avatar ? `<span class="avatar">${portrait(p.avatar)}</span>` : '';
const person = p => `${avatar(p)}<span>${escaped(p?.name)}</span>`;
const clock = () => state?.ends ? '<span class="clock" data-clock></span>' : '';
function hud() {
  const me = state.me;
  const info = me && state.round ? `<span class="person">${person(me)}${me.active ? ` · ${me.score} pt · ${me.rank}ᵉ` : ' · Hors classement'}</span>` : '';
  return `<header class="hud"><span>${state.round ? `${state.round} / 4 · ${roundNames[state.round]}` : 'The Great Freddies Showdown'}</span>${info}${clock()}</header>`;
}

function hostLobby(v) {
  const link = new URL('?r=' + v.code, location.href).href;
  return `<section class="welcome-art" aria-label="The Great Freddies Showdown">
    <img class="welcome-poster" src="/showdown/accueil-diamant.png" width="1672" height="941"
      alt="FRED · The Great Freddies Showdown · Scannez pour jouer">
    <a class="welcome-qr" href="${escaped(link)}" target="_blank" rel="noopener">
      <img src="/showdown/qr/${v.code}" alt="Scanner le QR code ou ouvrir le lien joueur">
    </a>
    </section>
    <div class="controls welcome-controls">${button(sound ? 'Couper le son' : 'Activer le son','sound')}
      <a href="${escaped(link)}" target="_blank" rel="noopener">Ouvrir le lien joueur</a>
      <span>Code <strong>${v.code}</strong></span></div>
    <section class="panel"><h2>Joueurs prêts · ${v.lobby.filter(p=>p.ready).length}/${v.count}</h2>
    <div class="people">${v.lobby.map((p,i) => `<span class="person">${p.name ? person(p) : 'Joueur ' + (i+1)} ${p.online ? p.ready ? '✓' : '…' : '· Déconnecté'} <button class="secondary" data-remove="${p.id}" aria-label="Retirer ce joueur">×</button></span>`).join('')}</div>
    <div class="controls"><label>Places <input id="capacity" type="number" min="3" max="${Math.min(v.avatars,50)}" value="${v.capacity}"></label>
    ${button('Appliquer','cap')}${button(v.closed ? 'Rouvrir les inscriptions' : 'Fermer les inscriptions','close')}
    ${button(v.allReady ? 'Tout le monde est prêt · Lancer' : 'Lancer la partie','start',!v.allReady)}</div></section>`;
}

function playerLobby(v) {
  if (!v?.me) return `<h1>The Great Freddies Showdown</h1><form id="join" class="controls">
    <input aria-label="Ton pseudo" required maxlength="24" placeholder="Ton pseudo" value="${escaped(nickname)}"><button>Rejoindre</button></form>`;
  if (v.me.avatar) return `<div class="panel"><h2>${person(v.me)}</h2><p>En attente des autres joueurs</p></div>`;
  return `<h2>Choisis ton avatar</h2><p>${escaped(v.me.name)}</p>
    <div class="pick-list">${Array.from({length:v.avatars},(_,index) => {
      const id = index + 1;
      return `<button data-avatar="${id}" aria-label="Avatar ${id}${v.taken.includes(id) ? ' réservé' : ''}"
        aria-pressed="${selected === id}" ${v.taken.includes(id) ? 'disabled' : ''}>${portrait(id)}</button>`;
    }).join('')}</div>${button('Prêt','ready',!selected)}`;
}

function choices(v,final = false) {
  const pick = v.me?.pick;
  return `<div class="options">${v.q.options.map((option,i) => {
    const chosen = pick?.choice === i;
    const mark = v.phase === 'correction' ? i === v.q.correct ? ' correct' : chosen ? ' wrong' : '' : '';
    const classes = 'option' + mark + (chosen ? ' chosen' : '');
    if (host || v.phase === 'correction') return `<div class="${classes}">${escaped(option)}</div>`;
    const disabled = chosen || pick?.changed || (pick && (v.round === 3 || v.phase === 'barrage'));
    return `<button class="${classes}" data-answer="${i}" ${disabled ? 'disabled' : ''}>${escaped(option)}</button>`;
  }).join('')}</div>${final && !host ? '<button class="secondary" data-answer="-1">Passe</button>' : ''}`;
}

function correction(v) {
  if (!v.q) return '<p>Regarde la correction sur le grand écran.</p>';
  if (!host) {
    const own = v.results[0];
    return `<h2 class="question">${escaped(v.q.text)}</h2>${choices(v)}
      <p class="gain">${own?.blocked ? '⛔ Bloqué' : own?.transfer?.points ? `−${own.transfer.points} pt → ${escaped(own.transfer.name)}`
        : own?.ranked ? `+${own.gain} pt` : own?.correct ? '✓ Bonne réponse' : '0 pt'}</p>`;
  }
  const list = (rows,showGains = true) => rows.map(p => `<span class="person">${person(p)}${showGains && p.ranked ? ` <b class="gain">+${p.gain}</b>` : ''}</span>`).join('');
  const absent = v.results.filter(p => p.answer === null);
  const stolen = v.results.filter(p => p.transfer?.points);
  return `<h2 class="question">${escaped(v.q.text)}</h2><div class="answer-groups">${v.q.options.map((answer,i) => {
    const group = v.results.filter(p => p.answer === i);
    return `<div class="option${i === v.q.correct ? ' correct' : ''}"><p>${i === v.q.correct ? '✓ ' : ''}${escaped(answer)} · ${group.length}</p>
      <div class="people">${list(group)}</div></div>`;
  }).join('')}</div>${absent.length ? `<p>Sans réponse ou bloqués · ${absent.length}</p><div class="people">${list(absent,false)}</div>` : ''}
  ${stolen.map(p => `<p class="gain">${escaped(p.name)} → ${escaped(p.transfer.name)} · ${p.transfer.points} pt volé(s)</p>`).join('')}`;
}

function ranking(v) {
  return `<h2>${v.phase === 'qualification' ? 'Qualifications' : 'Classement'}</h2>
    <div class="ranking">${v.ranking.map(p => `<span class="person ${v.qualifiers.includes(p.id) ? 'qualified' : ''}">
      ${person(p)} <b>${p.score} pt ${v.qualifiers.includes(p.id) ? '✓' : ''}</b></span>`).join('')}</div>
    ${v.phase === 'qualification' ? button('Continuer','next') : ''}`;
}

function question(v) {
  if (v.phase === 'question' && v.me?.blocked) return '<h2>⛔ Bloqué pour cette question</h2>';
  if (!v.q) return '<p>Regarde le grand écran.</p>';
  const position = v.phase === 'barrage' ? 'Barrage' : `Question ${v.number} / ${v.total}${v.difficulty ? ` · ${v.difficulty} pt` : ''}`;
  return `<p class="gold">${position}</p><h2 class="question">${escaped(v.q.text)}</h2>${choices(v)}`;
}

function jokers(v) {
  if (host || !v.me.active) return '<h2>Fenêtre des jokers</h2><p>Prochaine question dans quelques secondes.</p>';
  const powers = Object.entries(powerNames).map(([key,label]) => button(label,'power-' + key,!v.me.powers[key] || !!v.me.selected)).join(' ');
  const targets = targetPower && !v.me.selected ? `<div class="pick-list">${v.targets.map(p => `<button data-target="${p.id}">${portrait(p.avatar)}<span>${escaped(p.name)}</span></button>`).join('')}</div>` : '';
  return `<h2>Jokers</h2><div class="controls">${powers}</div>${targets}
    ${v.me.selected ? `<p>${powerNames[v.me.selected]} activé</p>` : ''}`;
}

function pickForm(v) {
  return `<h2>Au tour de ${person(v.turn)}</h2>
    <label>Catégorie <select id="category"><option value="">Choisir</option>
    ${v.categories.map(name=>`<option ${name === category ? 'selected' : ''}>${escaped(name)}</option>`).join('')}</select></label>
    <div class="controls">${['Facile','Intermédiaire','Difficile'].map((name,i)=>button(name + ' · ' + (i+1) + ' pt','level-' + (i+1),levels.length === 6)).join('')}</div>
    <div class="controls">${levels.map((level,i)=>button(level+' pt ×','delete-' + i)).join('')}</div>
    <p>${levels.length}/6 questions · ${levels.reduce((a,b)=>a+b,0)} points possibles</p>
    ${button('Valider et jouer','select',!category || levels.length !== 6)}`;
}

function final(v) {
  if (v.phase === 'finalReady') return `<h2>Au tour de ${person(v.turn)}</h2>
    ${v.target !== null ? `<p>Score à battre · ${v.target} pt</p>` : ''}${host ? button('Lancer les 90 secondes','next') : '<p>En attente du départ</p>'}`;
  if (host) return `<div class="hud"><strong>${person(v.turn)} · ${v.finalScore} pt</strong>${v.target !== null ? `<span>À battre · ${v.target} pt</span>` : ''}</div>
    <h2 class="question">${v.q ? escaped(v.q.text) : 'Série terminée · En attente du gong'}</h2>
    ${v.feedback?.type === 'bell' ? '<p class="gain">+1</p>' : v.feedback?.type === 'buzz' ? '<p>Réponse incorrecte</p>' : ''}`;
  return v.q ? choices(v,true) : '<p>Regarde le grand écran.</p>';
}

function winner(v) {
  const sparks = host ? `<div class="fireworks" aria-hidden="true">${Array.from({length:42},(_,i) => {
    const angle = i * 2.4;
    return `<i class="spark" style="--x:${20 + i % 3 * 30}%;--y:50%;--dx:${Math.cos(angle)*105}px;--dy:${Math.sin(angle)*60}px;--delay:${i % 3 * .18}s"></i>`;
  }).join('')}</div>` : '';
  return `<h1>Victoire !</h1><h2>${person(v.winner)} · ${v.winner.score} pt</h2>${sparks}`;
}

function game(v) {
  switch (v.phase) {
    case 'lobby': return host ? hostLobby(v) : playerLobby(v);
    case 'roundReady': return `<h2>Manche ${v.round} · ${roundNames[v.round]}</h2><p>${rules[v.round]}</p>${host ? button('Commencer','next') : ''}`;
    case 'question': case 'barrage': return question(v);
    case 'correction': return correction(v);
    case 'joker': return jokers(v);
    case 'ranking': case 'qualification': return host ? ranking(v) : `<h2>${v.phase === 'qualification' ? 'Qualifications' : 'Classement'}</h2><p>${v.phase === 'qualification' ? v.qualifiers.includes(v.me.id) ? 'Tu es qualifié !' : 'Regarde le grand écran.' : 'Regarde le grand écran.'}</p>`;
    case 'countdown': return '<p class="countdown" data-clock></p>';
    case 'pick': return host ? pickForm(v) : `<h2>${person(v.turn)}</h2><p>Choix de la catégorie et des difficultés.</p>`;
    case 'turnDone': return `<h2>${person(v.turn)} · ${v.turn.score} pt</h2>${host ? button('Joueur suivant prêt','next') : ''}`;
    case 'finalReady': case 'finalRun': return final(v);
    case 'tieWait': return '<h2>Barrage</h2><p>La réserve est épuisée. La game master pose une question à l’oral.</p>'
      + v.oral.map(p => `<button data-decide="${p.id}">${escaped(p.name)} a trouvé</button>`).join(' ');
    case 'winner': return winner(v);
    default: return '<p>Prépare-toi…</p>';
  }
}

function render() {
  const oldCapacity = document.querySelector('#capacity');
  const restoreCapacity = document.activeElement === oldCapacity ? oldCapacity?.value : null;
  const nameFocused = document.activeElement?.matches('#join input');
  app.innerHTML = (state ? (state.phase === 'lobby' ? '' : hud()) + game(state)
    : host ? '<p>Création du salon…</p>' : playerLobby()) + `<p id="status" class="status" role="status">${escaped(message)}</p>`;
  if (restoreCapacity !== null) {
    const nextCapacity = document.querySelector('#capacity');
    if (nextCapacity) { nextCapacity.value = restoreCapacity; nextCapacity.focus(); }
  }
  if (nameFocused) document.querySelector('#join input')?.focus();
  tick();
}

function control(action,value) {
  socket.emit('showdown:control',{action,value,ticket:state.ticket},reply => setMessage(reply.error));
}

function power(action,target) {
  socket.emit('showdown:power',{power:action,target,ticket:state.ticket},reply => setMessage(reply.error));
}

app.addEventListener('input',event => {
  if (event.target.matches('#join input')) nickname = event.target.value;
  if (event.target.id === 'category') {
    category = event.target.value;
    document.querySelector('[data-action="select"]').disabled = !category || levels.length !== 6;
  }
});
app.addEventListener('submit',event => {
  if (event.target.id !== 'join') return;
  event.preventDefault();
  join(nickname.trim());
});
app.addEventListener('click',event => {
  const el = event.target.closest('button');
  if (!el || el.disabled) return;
  const {action,avatar:avatarId,answer,target,remove,decide} = el.dataset;
  if (avatarId !== undefined) { selected = Number(avatarId); return render(); }
  if (answer !== undefined && !answerPending) {
    answerPending = state.phase === 'finalRun';
    return socket.emit('showdown:answer',{choice:Number(answer),ticket:state.ticket});
  }
  if (target) return power(targetPower,target);
  if (remove) return control('remove',remove);
  if (decide) return control('decide',decide);
  if (action === 'sound') {
    sound = !sound;
    if (sound) {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume().catch(() => {});
      tone(660);
      welcome.play().catch(() => setMessage('Jingles activés. Fichier d’accueil absent ou indisponible.'));
    } else welcome.pause();
    return render();
  }
  if (action === 'ready') return socket.emit('showdown:ready',selected,reply => { if (reply.error) setMessage(reply.error); });
  if (action === 'cap') return control('cap',Number(document.querySelector('#capacity').value));
  if (action === 'select') return control('select',{category,levels});
  if (action?.startsWith('level-')) {
    if (levels.length < 6) levels.push(Number(action.slice(6)));
    return render();
  }
  if (action?.startsWith('delete-')) { levels.splice(Number(action.slice(7)),1); return render(); }
  if (action?.startsWith('power-')) {
    targetPower = action.slice(6);
    return targetPower === 'double' ? power('double') : render();
  }
  if (action) control(action);
});

function tick() {
  if (!deadline) return;
  const secs = Math.max(0,Math.ceil((deadline-Date.now())/1000));
  document.querySelectorAll('[data-clock]').forEach(el => {
    const text = String(secs);
    if (el.textContent !== text) el.textContent = text;
  });
}
setInterval(tick,100);
