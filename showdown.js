const { randomBytes, randomUUID } = require('node:crypto');
const QR = require('qrcode');
const { existsSync, readdirSync } = require('node:fs');
const bank = require('./showdown-bank');
const originalAvatarCount = require('./avatars');
const avatarDirectory = __dirname + '/showdown/portraits';
const extraAvatars = existsSync(avatarDirectory) ? readdirSync(avatarDirectory) : [];
const portraits = extraAvatars.filter(name => /^[a-z0-9-]+\.(?:png|jpe?g|webp)$/i.test(name)).sort().slice(0,50-originalAvatarCount);
const avatarCount = originalAvatarCount + portraits.length;

const shuffle = array => {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

function makePlan() {
  const categories = new Map();
  const reserve = new Set();
  const names = [...new Set(bank.map(q => q.category))];
  for (const name of names) {
    const byLevel = [1,2,3].map(level => shuffle(bank.filter(q => q.category === name && q.difficulty === level)).slice(0, 6));
    if (byLevel.every(rows => rows.length === 6)) {
      categories.set(name, byLevel);
      byLevel.flat().forEach(q => reserve.add(q));
    }
  }
  if (categories.size < 6) throw Error('Il faut six catégories complètes pour la manche 3.');
  const pool = shuffle(bank.filter(q => !reserve.has(q)));
  const quotas = [[15,10],[8,12]];
  const mixedPool = pool.filter(q => q.difficulty < 3 && q.question.length <= 135);
  for (const level of [1,2]) {
    if (mixedPool.filter(q => q.difficulty === level).length < quotas[0][level-1] + quotas[1][level-1]) {
      throw Error('Questions collectives insuffisantes.');
    }
  }
  const themes = shuffle(names);
  const counts = new Map(themes.map(name => [name,[1,2].map(level =>
    mixedPool.filter(q => q.category === name && q.difficulty === level).length)]));
  const failed = new Set();
  function assign(index, remaining) {
    if (index === themes.length) return [];
    const key = [index,...remaining.flat()].join(',');
    if (failed.has(key)) return null;
    const available = counts.get(themes[index]);
    for (const [first,second] of shuffle([[0,0],[0,1],[1,0],[1,1]])) {
      if (!remaining[0][first] || !remaining[1][second] || !available[first]
        || available[second] < (first === second ? 2 : 1)) continue;
      const next = remaining.map(row => [...row]);
      next[0][first]--;
      next[1][second]--;
      const tail = assign(index + 1,next);
      if (tail) return [[first+1,second+1],...tail];
    }
    failed.add(key);
    return null;
  }
  const assignments = assign(0,quotas);
  if (!assignments) throw Error('Chaque catégorie doit fournir une question distincte à chacune des deux manches.');
  const take = (level,name) => {
    const index = pool.findIndex(q => q.difficulty === level && (!name || q.category === name) && q.question.length <= 135);
    return pool.splice(index,1)[0];
  };
  const collective = quotas.map((_,round) => themes.map((name,index) => take(assignments[index][round],name)));
  for (const [round,rows] of collective.entries()) {
    for (const level of [1,2]) {
      const remaining = quotas[round][level-1] - rows.filter(q => q.difficulty === level).length;
      for (let i = 0; i < remaining; i++) rows.push(take(level));
    }
    collective[round] = shuffle(rows);
  }
  const pairs = [];
  for (const name of names) {
    for (const level of [2,3]) {
      const group = pool.filter(q => q.category === name && q.difficulty === level && q.question.length <= 92
        && q.options.every(o => o.length <= 35)).sort((a,b) => a.question.length - b.question.length);
      while (group.length >= 2) pairs.push(group.splice(0,2));
    }
  }
  const finals = shuffle(pairs);
  if (finals.length < 8) throw Error('Questions de finale insuffisantes.');
  const paired = new Set(finals.flat());
  const spare = [...pool.filter(q => !paired.has(q)), ...shuffle(finals.slice(22).flat())];
  return { categories, collective, finals: finals.slice(0,22), spare };
}

function installShowdown(app, io) {
  const namespace = io.of('/showdown');
  const rooms = new Map();
  // Faster feedback only for local automated tests. Competitive timings remain fixed in normal use.
  const speed = process.env.NODE_ENV === 'test' ? Number(process.env.SHOWDOWN_CLOCK) || 1 : 1;
  const duration = ms => Math.max(50, Math.round(ms * speed));
  const ms = { answer: duration(15000), ready: duration(3000), joker: duration(5000),
    correction: duration(3800), ranking: duration(5500), final: duration(90000) };

  app.get('/showdown/', (_req,res) => res.sendFile('index.html', {root: __dirname + '/showdown'}));
  for (const file of ['showdown.css','showdown-client.js','fred-bleu.jpg','fred-or.png','accueil-diamant.png','accueil.mp3']) {
    app.get('/showdown/' + file, (_req,res) => res.sendFile(file, {root: __dirname + '/showdown'}));
  }
  app.get('/showdown/portrait/:id', (req,res) => {
    const id = Number(req.params.id);
    const file = Number.isInteger(id) && portraits[id - originalAvatarCount - 1];
    if (!file) return res.sendStatus(404);
    res.sendFile(file, {root:avatarDirectory});
  });
  app.get('/showdown/qr/:code', async (req,res) => {
    if (!rooms.has(req.params.code)) return res.sendStatus(404);
    const origin = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    res.type('image/svg+xml').send(await QR.toString(`${origin}/showdown/?r=${encodeURIComponent(req.params.code)}`, {type:'svg', margin:4}));
  });

  const players = r => [...r.players.values()];
  const rank = list => [...list].sort((a,b) => b.score - a.score || a.seed - b.seed);
  const competitive = r => players(r).filter(p => r.active.includes(p.id));
  const summary = p => ({id:p.id, name:p.name, avatar:p.avatar, score:p.score, online:!!p.socket});
  const publicQuestion = (r, host, player) => {
    if (!r.q || !['question','correction','barrage','finalRun'].includes(r.phase)) return null;
    if (r.phase === 'finalRun') {
      if (host) return { text:r.q.question };
      return player?.id === r.turn ? { options:r.q.options } : null;
    }
    if ((r.round === 3 && !host && player?.id !== r.turn)
      || (r.phase === 'barrage' && !host && !r.tie?.ids.includes(player?.id))) return null;
    return {text:r.q.question, options:r.q.options, correct:r.phase === 'correction' ? r.q.correct : undefined};
  };

  function snapshot(r, host, player) {
    const reveal = r.phase !== 'lobby' || (r.players.size > 0 && players(r).every(p => p.avatar));
    return {
      code:r.code, phase:r.phase, round:r.round, ends:r.ends, serverNow:Date.now(), ticket:r.ticket,
      count:r.players.size, capacity:r.capacity, closed:r.closed, avatars:avatarCount,
      taken:players(r).filter(p => p.avatar && p !== player).map(p => p.avatar),
      lobby: r.phase === 'lobby' ? players(r).map(p => ({
        id:host ? p.id : undefined, ready:!!p.avatar, online:!!p.socket, ...(reveal ? summary(p) : {}),
      })) : [],
      allReady: r.players.size >= 3 && players(r).every(p => p.avatar && p.socket),
      me:player ? {...summary(player), active:r.active.includes(player.id), powers:player.powers, pick:r.answers.get(player.id),
        rank: r.active.includes(player.id) ? 1 + competitive(r).filter(p => p.score > player.score).length : null,
        selected:r.powersByPlayer.get(player.id)?.power, blocked:r.blocked.has(player.id)} : null,
      q:publicQuestion(r,host,player), number:r.index + 1, total:r.sequence.length,
      category:r.category, difficulty:r.round === 3 ? r.q?.difficulty : undefined,
      ranking:['ranking','qualification'].includes(r.phase) ? rank(competitive(r)).map(summary) : [],
      qualifiers:r.phase === 'qualification' ? r.qualified : [],
      targets:r.phase === 'joker' && player && r.active.includes(player.id) ? competitive(r).filter(p => p !== player).map(summary) : [],
      results:r.phase === 'correction' ? (host ? r.results : r.results.filter(item => item.id === player?.id)) : [],
      turn:r.turn ? summary(r.players.get(r.turn)) : null,
      categories:host && r.phase === 'pick' ? [...r.plan.categories.keys()].filter(name => !r.used.has(name)) : [],
      tie:r.phase === 'barrage' ? r.tie.slots : null,
      oral:host && r.phase === 'tieWait' ? r.tie.ids.map(id => summary(r.players.get(id))) : [],
      finalScore:r.round === 4 && r.turn ? r.players.get(r.turn).score : null,
      target:r.round === 4 && r.finalIndex === 1 ? r.players.get(r.finalists[0]).score : null,
      feedback:r.phase === 'finalRun' ? r.feedback : null,
      finalists:r.finalists.map(id => summary(r.players.get(id))),
      winner:r.winner ? summary(r.players.get(r.winner)) : null,
    };
  }

  function push(r) {
    if (r.hostSocket) namespace.to(r.hostSocket).emit('showdown:state', snapshot(r,true));
    for (const p of players(r)) {
      if (p.socket) namespace.to(p.socket).emit('showdown:state', snapshot(r,false,p));
    }
  }

  function phase(r, next, delay, callback) {
    clearTimeout(r.timer);
    r.phase = next;
    r.ticket++;
    r.ends = delay ? Date.now() + delay : 0;
    if (delay) r.timer = setTimeout(callback, delay);
    push(r);
  }

  function prepareQuestion(r, source) {
    const options = shuffle(source.options);
    r.q = {...source, options, correct:options.indexOf(source.options[0])};
    r.answers = new Map();
  }

  function nextQuestion(r) {
    r.index++;
    r.blocked.clear();
    r.powersByPlayer.clear();
    r.q = null;
    const begin = () => {
      prepareQuestion(r,r.sequence[r.index]);
      phase(r,'question',ms.answer,() => correct(r));
    };
    if (r.round === 2) phase(r,'joker',ms.joker,begin);
    else phase(r,'countdown',ms.ready,begin);
  }

  function eligible(r) {
    return (r.round === 3 ? [r.turn] : r.active).filter(id => !r.blocked.has(id));
  }

  function correct(r) {
    const counted = eligible(r);
    const earliest = counted.filter(id => r.answers.get(id)?.choice === r.q.correct)
      .sort((a,b) => r.answers.get(a).order - r.answers.get(b).order)[0];
    const base = new Map();
    for (const id of counted) {
      if (r.answers.get(id)?.choice === r.q.correct) base.set(id,r.round === 3 ? r.q.difficulty : id === earliest ? 2 : 1);
    }
    const gains = new Map(base);
    const transfers = new Map();
    for (const [id, action] of r.powersByPlayer) {
      if (action.power === 'double') gains.set(id,(gains.get(id) || 0) + (base.get(id) || 0));
      if (action.power === 'steal') {
        const points = base.get(action.target) || 0;
        gains.set(action.target,(gains.get(action.target) || 0) - points);
        gains.set(id,(gains.get(id) || 0) + points);
        transfers.set(action.target,{to:id, name:r.players.get(id).name, points});
      }
    }
    const participants = r.round === 3 ? [r.players.get(r.turn)] : players(r);
    r.results = participants.map(p => {
      const pick = r.answers.get(p.id);
      const gain = gains.get(p.id) || 0;
      p.score += gain;
      return {...summary(p), gain, answer:pick?.choice ?? null, correct:pick?.choice === r.q.correct,
        blocked:r.blocked.has(p.id), transfer:transfers.get(p.id), ranked:r.active.includes(p.id)};
    });
    phase(r,'correction',ms.correction,() => afterQuestion(r));
  }

  function afterQuestion(r) {
    if (r.index + 1 < r.sequence.length) {
      if (r.round < 3 && (r.index + 1) % 10 === 0) return phase(r,'ranking',ms.ranking,() => nextQuestion(r));
      return nextQuestion(r);
    }
    if (r.round === 1) return qualify(r,Math.min(r.active.length,Math.max(4,Math.ceil(r.active.length / 2))));
    if (r.round === 2) return qualify(r,Math.min(6,Math.max(3,Math.ceil(r.active.length / 2))));
    if (r.turnIndex + 1 < r.order.length) return phase(r,'turnDone');
    r.turn = null;
    qualify(r,2);
  }

  function qualify(r, count) {
    const ordered = rank(competitive(r));
    const cutoff = ordered[count - 1].score;
    const certain = ordered.filter(p => p.score > cutoff).map(p => p.id);
    const tied = ordered.filter(p => p.score === cutoff).map(p => p.id);
    const slots = count - certain.length;
    const done = winners => {
      r.qualified = [...certain, ...winners];
      phase(r,'qualification');
    };
    if (slots === tied.length) done(tied);
    else startTie(r,tied,slots,done);
  }

  function startTie(r, ids, slots, done) {
    r.tie = {ids, slots, done, winners:[]};
    tieQuestion(r);
  }

  function tieQuestion(r) {
    const q = r.plan.spare.shift();
    if (!q) {
      r.q = null;
      return phase(r,'tieWait');
    }
    prepareQuestion(r,q);
    phase(r,'barrage',ms.answer,() => tieQuestion(r));
  }

  function tieWinner(r,id) {
    const tie = r.tie;
    tie.winners.push(id);
    tie.ids = tie.ids.filter(other => other !== id);
    tie.slots--;
    if (tie.ids.length === tie.slots) tie.winners.push(...tie.ids);
    else if (tie.slots) return tieQuestion(r);
    r.tie = null;
    tie.done(tie.winners);
  }

  function roundStart(r,round) {
    r.round = round;
    r.index = -1;
    r.q = null;
    r.blocked.clear();
    r.powersByPlayer.clear();
    for (const p of players(r)) {
      p.score = 0;
      p.powers = {double:true,block:true,steal:true};
    }
    if (round < 3) {
      r.sequence = r.plan.collective[round - 1];
      r.category = 'Mixte';
    }
    phase(r,'roundReady');
  }

  function pick(r,index) {
    r.turnIndex = index;
    r.turn = r.order[index];
    r.q = null;
    r.index = -1;
    r.category = null;
    phase(r,'pick');
  }

  function finalSetup(r) {
    r.round = 4;
    r.finalists = [...r.qualified].reverse();
    r.active = [...r.finalists];
    for (const p of competitive(r)) p.score = 0;
    r.finalIndex = 0;
    r.turn = r.finalists[0];
    r.feedback = null;
    r.q = null;
    phase(r,'finalReady');
  }

  function finalStart(r) {
    r.index = 0;
    r.sequence = r.plan.finals.map(pair => pair[r.finalIndex]);
    r.feedback = null;
    prepareQuestion(r,r.sequence[0]);
    phase(r,'finalRun',ms.final,() => finalEnd(r));
  }

  function finalEnd(r) {
    if (r.finalIndex === 0) {
      r.finalIndex = 1;
      r.turn = r.finalists[1];
      r.q = null;
      r.feedback = null;
      return phase(r,'finalReady');
    }
    const [a,b] = rank(competitive(r));
    r.turn = null;
    const finish = ([id]) => { r.winner = id; phase(r,'winner'); };
    if (a.score === b.score) startTie(r,[a.id,b.id],1,finish);
    else finish([a.id]);
  }

  function answer(r,p,{choice,ticket} = {}) {
    if (ticket !== r.ticket || !r.q || Date.now() >= r.ends || !Number.isInteger(choice) || choice < -1 || choice > 3) return;
    if (r.phase === 'finalRun') {
      if (r.turn !== p.id) return;
      const ok = choice === r.q.correct;
      if (ok) p.score++;
      r.feedback = {type:choice === -1 ? 'pass' : ok ? 'bell' : 'buzz', serial:r.ticket};
      r.q = null;
      r.index++;
      if (r.sequence[r.index]) prepareQuestion(r,r.sequence[r.index]);
      r.ticket++;
      return push(r);
    }
    if (choice < 0) return;
    if (r.phase === 'barrage') {
      if (!r.tie.ids.includes(p.id) || r.answers.has(p.id)) return;
      r.answers.set(p.id,{choice});
      if (choice === r.q.correct) return tieWinner(r,p.id);
      if (r.tie.ids.every(id => r.answers.has(id))) tieQuestion(r);
      return;
    }
    if (r.phase !== 'question') return;
    const counted = eligible(r);
    if (!counted.includes(p.id) && !(r.round === 2 && !r.active.includes(p.id))) return;
    const pick = r.answers.get(p.id);
    if (pick && (pick.changed || r.round === 3 || pick.choice === choice)) return;
    r.answers.set(p.id,{choice,changed:!!pick,order:++r.answerOrder});
    if (counted.every(id => r.answers.has(id))) correct(r);
    else push(r);
  }

  function usePower(r,p,{power,target,ticket} = {}) {
    if (ticket !== r.ticket || r.phase !== 'joker' || Date.now() >= r.ends || !r.active.includes(p.id)
      || !['double','block','steal'].includes(power) || !p.powers[power] || r.powersByPlayer.has(p.id)) return 'Joker indisponible.';
    if (power !== 'double') {
      if (target === p.id || !r.active.includes(target)) return 'Cible indisponible.';
      if ([...r.powersByPlayer.values()].some(action => action.target === target)) return 'Cette cible a déjà été choisie. Ton joker est conservé.';
    }
    if (power === 'block' && r.blocked.size >= r.active.length - 1) return 'Il doit rester au moins un joueur autorisé.';
    r.powersByPlayer.set(p.id,{power,target:power === 'double' ? null : target});
    if (power === 'block') r.blocked.add(target);
    p.powers[power] = false;
    push(r);
  }

  namespace.on('connection',s => {
    const current = () => rooms.get(s.data.code);
    const player = r => {
      const p = r?.players.get(s.data.playerId);
      return p?.socket === s.id ? p : null;
    };
    const host = r => r?.hostSocket === s.id;
    s.on('showdown:host',({code,key} = {},reply = () => {}) => {
      if (s.data.code) return reply({error:'Recharge la page pour changer de salon.'});
      let r = rooms.get(code);
      if (!r || !key || r.key !== key) {
        do { code = randomBytes(3).toString('hex').toUpperCase(); } while (rooms.has(code));
        r = {code, key:randomUUID(), players:new Map(), nextSeed:0, capacity:Math.min(35,avatarCount), closed:false,
          phase:'lobby', round:0, ticket:0, ends:0, index:-1, sequence:[], active:[], finalists:[],
          qualified:[], used:new Set(), answers:new Map(), powersByPlayer:new Map(), blocked:new Set(), answerOrder:0};
        rooms.set(code,r);
      }
      r.hostSocket = s.id;
      s.data.code = r.code;
      reply({code:r.code,key:r.key});
      push(r);
    });
    s.on('showdown:join',({code,token,name} = {},reply = () => {}) => {
      const r = rooms.get(code);
      if (!r || (s.data.code && s.data.code !== code) || host(r)) return reply({error:'Salon introuvable.'});
      let p = player(r) || (token && players(r).find(candidate => candidate.token === token));
      if (!p) {
        if (!name) return reply({error:token ? 'Reconnexion impossible. Saisis ton pseudo.' : 'Choisis ton pseudo.'});
        if (r.phase !== 'lobby' || r.closed || r.players.size >= r.capacity) return reply({error:'Inscriptions closes ou salon complet.'});
        const clean = typeof name === 'string' ? name.trim().slice(0,24) : '';
        if (!clean) return reply({error:'Choisis ton pseudo.'});
        p = { id:randomUUID(), token:randomUUID(), name:clean, score:0, avatar:null, seed:r.nextSeed++};
        r.players.set(p.id,p);
      }
      p.socket = s.id;
      s.data = {code,playerId:p.id};
      reply({token:p.token});
      push(r);
    });
    s.on('showdown:ready',(avatar,reply = () => {}) => {
      const r = current(), p = player(r);
      if (!p || r.phase !== 'lobby' || p.avatar || !Number.isInteger(avatar) || avatar < 1 || avatar > avatarCount) return reply({error:'Choix indisponible.'});
      if (players(r).some(other => other.avatar === avatar)) return reply({error:'Cet avatar vient d’être choisi. Essaie-en un autre.'});
      p.avatar = avatar;
      reply({});
      push(r);
    });
    s.on('showdown:answer', data => { const r = current(), p = player(r); if (p) answer(r,p,data); });
    s.on('showdown:power',(data,reply = () => {}) => {
      const r = current(), p = player(r);
      if (p) reply({error:usePower(r,p,data)});
    });
    s.on('showdown:control',({action,value,ticket} = {}, reply = () => {}) => {
      const r = current();
      if (!host(r) || ticket !== r.ticket) return;
      if (r.phase === 'lobby') {
        if (action === 'close') r.closed = !r.closed;
        if (action === 'cap' && Number.isInteger(value) && value >= Math.max(3,r.players.size)) r.capacity = Math.min(50,avatarCount,value);
        if (action === 'remove' && r.players.has(value)) {
          const removed = r.players.get(value);
          if (removed.socket) namespace.to(removed.socket).emit('showdown:removed');
          r.players.delete(value);
        }
        if (action === 'start' && snapshot(r,true).allReady) {
          try { r.plan = makePlan(); } catch(error) { return reply({error:error.message}); }
          r.closed = true;
          r.active = players(r).map(p => p.id);
          roundStart(r,1);
        } else push(r);
      }
      else if (action === 'next' && r.phase === 'roundReady') {
        if (r.round === 3) pick(r,0); else nextQuestion(r);
      }
      else if (action === 'next' && r.phase === 'qualification') {
        if (r.round === 1) { r.active = r.qualified; roundStart(r,2); }
        else if (r.round === 2) { r.active = r.qualified; r.order = [...r.qualified]; roundStart(r,3); }
        else finalSetup(r);
      }
      else if (action === 'select' && r.phase === 'pick') {
        const { category, levels } = value || {};
        if (!r.plan.categories.has(category) || r.used.has(category) || !Array.isArray(levels) || levels.length !== 6
          || !levels.every(level => [1,2,3].includes(level))) return reply({error:'Choisis une catégorie et six niveaux.'});
        const choices = r.plan.categories.get(category).map(rows => [...rows]);
        r.used.add(category);
        r.category = category;
        r.sequence = levels.map(level => choices[level - 1].shift());
        nextQuestion(r);
      }
      else if (action === 'next' && r.phase === 'turnDone') pick(r,r.turnIndex + 1);
      else if (action === 'next' && r.phase === 'finalReady') finalStart(r);
      else if (action === 'decide' && r.phase === 'tieWait' && r.tie.ids.includes(value)) tieWinner(r,value);
      reply({});
    });
    s.on('disconnect',() => {
      const r = current(), p = player(r);
      if (p) { p.socket = null; push(r); }
      if (host(r)) r.hostSocket = null;
    });
  });
}

module.exports = {installShowdown,makePlan};
