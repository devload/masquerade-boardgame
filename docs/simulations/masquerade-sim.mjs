#!/usr/bin/env node
/**
 * MASQUERADE · Shared Court simulator
 *
 * Standalone Node.js script — no dependencies.
 * Runs full games with two bots, prints per-round narrative + end-of-game
 * scoring, and aggregates across many games to check balance / duel
 * frequency / exile distribution / rule edge cases.
 *
 *   node masquerade-sim.mjs                 # 1 detailed game
 *   node masquerade-sim.mjs --games 200     # 200 games, aggregate stats
 *   node masquerade-sim.mjs --games 200 --verbose 3   # aggregate + 3 narratives
 */

// ─── Configuration ──────────────────────────────────────────────────
const IDENTITIES = ['Royalty', 'Thief', 'Scholar', 'Hunter', 'Mystic'];
const IDENTITY_KR = {
  Royalty: '👑 왕족',
  Thief:   '🗡 도둑',
  Scholar: '📚 학자',
  Hunter:  '🏹 사냥꾼',
  Mystic:  '🔮 신비주의자',
};

// RPS-5: each identity beats 2 and loses to 2
const BEATS = {
  Royalty: ['Thief', 'Mystic'],
  Thief:   ['Scholar', 'Hunter'],
  Scholar: ['Royalty', 'Mystic'],
  Hunter:  ['Royalty', 'Scholar'],
  Mystic:  ['Thief', 'Hunter'],
};

const ICONS = ['moon', 'day', 'shell', 'feather', 'forest'];
const TOTAL_ROUNDS = 8;
const COURT_SIZE = 8;
const EXILE_LIMIT = 5; // instant defeat threshold

// ─── Card generation ────────────────────────────────────────────────
function generateDeck() {
  const cards = [];
  let id = 1;
  for (const identity of IDENTITIES) {
    for (let i = 0; i < 6; i++) { // 6 per identity = 30 cards
      cards.push({
        id: id++,
        name: `${identity[0]}${i+1}`,
        surface: 1 + Math.floor(Math.random() * 4), // 1-4
        number: id, // 1-30 range
        identity,
        icon: ICONS[Math.floor(Math.random() * ICONS.length)],
      });
    }
  }
  return shuffle(cards);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Game state ─────────────────────────────────────────────────────
function initGame() {
  const deck = generateDeck();
  const me = { hand: deck.splice(0, 3), exile: [], id: 'me' };
  const opp = { hand: deck.splice(0, 3), exile: [], id: 'opponent' };
  const market = deck.splice(0, 3);
  const court = Array.from({ length: COURT_SIZE }, () => ({
    owner: null,
    card: null,
    pending: null, // { me: card, opponent: card } if deferred duel
  }));
  return {
    deck,
    me,
    opponent: opp,
    market,
    court,
    round: 1,
    log: [],
    stats: { duels: 0, deferred: 0, exiles: 0, peaceful: 0 },
  };
}

// ─── AI: bot decisions ──────────────────────────────────────────────
function pickMove(state, player, revealed) {
  const p = state[player];
  const identitiesKnown = state.round > 5;

  // Available slots: empty AND not pending (unless we want to challenge — not allowed in current rules)
  const availableSlots = state.court
    .map((s, i) => (s.owner === null && !s.pending ? i : -1))
    .filter(i => i >= 0);

  if (availableSlots.length === 0) {
    // No slots — return null (skip)
    return null;
  }

  // Simple heuristic scoring
  let bestScore = -Infinity;
  let bestChoice = null;

  for (const card of p.hand) {
    for (const slot of availableSlots) {
      let score = card.surface; // base

      if (identitiesKnown || revealed) {
        // Identity strategy
        if (card.identity === 'Royalty') {
          const roys = state.court.filter(s => s.card?.identity === 'Royalty').length;
          score += roys * 3;
        }
        if (card.identity === 'Scholar') {
          const cardMod = ((card.number - 1) % 8) + 1;
          if (cardMod === slot + 1) score += 8;
        }
        if (card.identity === 'Hunter') {
          const adj = [slot - 1, slot + 1].filter(i => i >= 0 && i < COURT_SIZE);
          for (const a of adj) {
            if (state.court[a].card?.icon === card.icon) score += 5;
          }
        }
        if (card.identity === 'Mystic') {
          const distinct = new Set(state.court.filter(s => s.card).map(s => s.card.identity)).size;
          score += distinct * 2;
        }
      }

      // Small randomness so bots don't always pick identical
      score += Math.random() * 2;

      if (score > bestScore) {
        bestScore = score;
        bestChoice = { card, slot };
      }
    }
  }

  return bestChoice;
}

// ─── Duel resolution ────────────────────────────────────────────────
function duel(cardA, cardB) {
  if (cardA.identity === cardB.identity) return 'draw';
  if (BEATS[cardA.identity].includes(cardB.identity)) return 'a';
  return 'b';
}

function resolveDuel(state, slot, myCard, oppCard, log) {
  state.stats.duels++;
  const outcome = duel(myCard, oppCard);

  if (outcome === 'a') {
    state.court[slot].owner = 'me';
    state.court[slot].card = myCard;
    state.opponent.exile.push(oppCard);
    state.stats.exiles++;
    log.push(`  ⚔ S${slot+1}: 나 ${IDENTITY_KR[myCard.identity]} → 이김 · 상대 ${IDENTITY_KR[oppCard.identity]} 추방`);
  } else if (outcome === 'b') {
    state.court[slot].owner = 'opponent';
    state.court[slot].card = oppCard;
    state.me.exile.push(myCard);
    state.stats.exiles++;
    log.push(`  ⚔ S${slot+1}: 상대 ${IDENTITY_KR[oppCard.identity]} → 이김 · 나 ${IDENTITY_KR[myCard.identity]} 추방`);
  } else {
    // Draw: coin flip who gets slot (in real game: 동맹 alliance mechanic)
    if (Math.random() < 0.5) {
      state.court[slot].owner = 'me';
      state.court[slot].card = myCard;
      state.opponent.exile.push(oppCard);
    } else {
      state.court[slot].owner = 'opponent';
      state.court[slot].card = oppCard;
      state.me.exile.push(myCard);
    }
    state.stats.exiles++;
    log.push(`  ⚔ S${slot+1}: 동점 ${IDENTITY_KR[myCard.identity]} (동맹 미구현, 랜덤)`);
  }
}

// ─── Round execution ────────────────────────────────────────────────
function playRound(state, log) {
  const myMove = pickMove(state, 'me', false);
  const oppMove = pickMove(state, 'opponent', false);

  if (!myMove || !oppMove) {
    log.push(`R${state.round}: 자리 없음, 라운드 스킵`);
    state.round++;
    return;
  }

  log.push(`R${state.round}: 나 → S${myMove.slot+1} (${myMove.card.name} ${IDENTITY_KR[myMove.card.identity]}) · 상대 → S${oppMove.slot+1} (${oppMove.card.name} ${IDENTITY_KR[oppMove.card.identity]})`);

  // Remove from hands
  state.me.hand = state.me.hand.filter(c => c.id !== myMove.card.id);
  state.opponent.hand = state.opponent.hand.filter(c => c.id !== oppMove.card.id);

  if (myMove.slot !== oppMove.slot) {
    // Peaceful
    state.court[myMove.slot].owner = 'me';
    state.court[myMove.slot].card = myMove.card;
    state.court[oppMove.slot].owner = 'opponent';
    state.court[oppMove.slot].card = oppMove.card;
    state.stats.peaceful++;
    log.push(`  ✌️ 평화 · 서로 다른 자리`);
  } else {
    // Same slot!
    if (state.round <= 4) {
      // Defer duel until UNMASKING
      state.court[myMove.slot].pending = { me: myMove.card, opponent: oppMove.card };
      state.stats.deferred++;
      log.push(`  ⏸ 결투 유예 (전반부 · UNMASKING 때 정산)`);
    } else {
      // Immediate
      resolveDuel(state, myMove.slot, myMove.card, oppMove.card, log);
    }
  }

  // Draw: refill hands to 3 from deck (simplified market)
  while (state.me.hand.length < 3 && state.deck.length > 0) state.me.hand.push(state.deck.shift());
  while (state.opponent.hand.length < 3 && state.deck.length > 0) state.opponent.hand.push(state.deck.shift());

  state.round++;
}

function grandUnmasking(state, log) {
  log.push('');
  log.push('═════════ R5 · GRAND UNMASKING ═════════');
  log.push('정체 리빌 완료. 유예 결투 정산 중...');

  const pendingSlots = state.court
    .map((s, i) => (s.pending ? i : -1))
    .filter(i => i >= 0);

  for (const slot of pendingSlots) {
    const p = state.court[slot].pending;
    resolveDuel(state, slot, p.me, p.opponent, log);
    state.court[slot].pending = null;
  }

  log.push('');
}

// ─── Scoring ────────────────────────────────────────────────────────
function score(state) {
  const s = { me: { surface: 0, identity: 0, exile: 0, combo: 0 },
              opponent: { surface: 0, identity: 0, exile: 0, combo: 0 } };

  for (let i = 0; i < COURT_SIZE; i++) {
    const slot = state.court[i];
    if (!slot.card || !slot.owner) continue;
    const target = s[slot.owner];
    target.surface += slot.card.surface;

    switch (slot.card.identity) {
      case 'Royalty': {
        const roys = state.court.filter(sl => sl.card?.identity === 'Royalty').length;
        target.identity += roys * 3;
        break;
      }
      case 'Thief': {
        for (const adj of [i - 1, i + 1]) {
          if (adj >= 0 && adj < COURT_SIZE) {
            const a = state.court[adj];
            if (a.card && a.owner && a.owner !== slot.owner) {
              target.identity += Math.floor(a.card.surface / 2);
            }
          }
        }
        break;
      }
      case 'Scholar': {
        const slotNum = i + 1;
        const cardMod = ((slot.card.number - 1) % 8) + 1;
        if (slotNum === cardMod) target.identity += 8;
        break;
      }
      case 'Hunter': {
        for (const adj of [i - 1, i + 1]) {
          if (adj >= 0 && adj < COURT_SIZE) {
            const a = state.court[adj];
            if (a.card?.icon === slot.card.icon) target.identity += 5;
          }
        }
        break;
      }
      case 'Mystic': {
        const distinct = new Set(state.court.filter(sl => sl.card).map(sl => sl.card.identity)).size;
        target.identity += distinct * 2;
        break;
      }
    }
  }

  s.me.exile = state.me.exile.length * -3;
  s.opponent.exile = state.opponent.exile.length * -3;

  // Combos
  const mySlots = state.court.filter(sl => sl.owner === 'me').length;
  const oppSlots = state.court.filter(sl => sl.owner === 'opponent').length;
  if (mySlots >= 6) s.me.combo += 15;
  if (oppSlots >= 6) s.opponent.combo += 15;

  const myIdentityCounts = {};
  const oppIdentityCounts = {};
  for (const sl of state.court) {
    if (!sl.card || !sl.owner) continue;
    const counts = sl.owner === 'me' ? myIdentityCounts : oppIdentityCounts;
    counts[sl.card.identity] = (counts[sl.card.identity] || 0) + 1;
  }
  if (Object.values(myIdentityCounts).some(n => n >= 4)) s.me.combo += 15;
  if (Object.values(oppIdentityCounts).some(n => n >= 4)) s.opponent.combo += 15;

  // Perfect masquerade — all 5 identities present in court
  const distinct = new Set(state.court.filter(sl => sl.card).map(sl => sl.card.identity)).size;
  if (distinct === 5) { s.me.combo += 10; s.opponent.combo += 10; }

  // Peaceful (no duels)
  if (state.stats.duels === 0) { s.me.combo += 20; s.opponent.combo += 20; }

  const myTotal = s.me.surface + s.me.identity + s.me.exile + s.me.combo;
  const oppTotal = s.opponent.surface + s.opponent.identity + s.opponent.exile + s.opponent.combo;
  return { detail: s, myTotal, oppTotal };
}

// ─── Full game ──────────────────────────────────────────────────────
function runGame(narrative = false) {
  const state = initGame();
  const log = [];

  while (state.round <= TOTAL_ROUNDS) {
    if (state.round === 5) {
      grandUnmasking(state, log);
    }
    playRound(state, log);

    if (state.me.exile.length >= EXILE_LIMIT) {
      log.push(`💀 나 몰락 (${state.me.exile.length}장 추방) → 즉시 패배`);
      return { winner: 'opponent', reason: 'exile', log, stats: state.stats, exiles: [state.me.exile.length, state.opponent.exile.length] };
    }
    if (state.opponent.exile.length >= EXILE_LIMIT) {
      log.push(`💀 상대 몰락 (${state.opponent.exile.length}장 추방) → 즉시 승리`);
      return { winner: 'me', reason: 'exile', log, stats: state.stats, exiles: [state.me.exile.length, state.opponent.exile.length] };
    }
  }

  // Reckoning
  const { detail, myTotal, oppTotal } = score(state);
  log.push('');
  log.push('═════════ RECKONING ═════════');
  log.push(`나:   자리 ${detail.me.surface} + 정체 ${detail.me.identity} + 콤보 ${detail.me.combo} + 추방 ${detail.me.exile} = ${myTotal}`);
  log.push(`상대: 자리 ${detail.opponent.surface} + 정체 ${detail.opponent.identity} + 콤보 ${detail.opponent.combo} + 추방 ${detail.opponent.exile} = ${oppTotal}`);

  const winner = myTotal > oppTotal ? 'me' : myTotal < oppTotal ? 'opponent' : 'draw';
  log.push(`결과: ${winner === 'me' ? '나 승리' : winner === 'opponent' ? '상대 승리' : '무승부'} (${myTotal} vs ${oppTotal})`);

  return {
    winner,
    reason: 'reckoning',
    log,
    stats: state.stats,
    exiles: [state.me.exile.length, state.opponent.exile.length],
    scores: [myTotal, oppTotal],
    detail,
    court: state.court.map(sl => sl.card ? { owner: sl.owner, identity: sl.card.identity, name: sl.card.name } : null),
  };
}

// ─── Aggregate stats ────────────────────────────────────────────────
function runMany(n) {
  const results = [];
  for (let i = 0; i < n; i++) results.push(runGame(false));

  const wins = { me: 0, opponent: 0, draw: 0 };
  const endReasons = { exile: 0, reckoning: 0 };
  const totalDuels = [];
  const totalDeferred = [];
  const totalExiles = [];
  const totalScores = [];
  const scoreDiffs = [];

  for (const r of results) {
    wins[r.winner]++;
    endReasons[r.reason]++;
    totalDuels.push(r.stats.duels);
    totalDeferred.push(r.stats.deferred);
    totalExiles.push(r.exiles[0] + r.exiles[1]);
    if (r.scores) {
      totalScores.push(...r.scores);
      scoreDiffs.push(Math.abs(r.scores[0] - r.scores[1]));
    }
  }

  const avg = arr => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
  const max = arr => arr.length === 0 ? 0 : Math.max(...arr);
  const min = arr => arr.length === 0 ? 0 : Math.min(...arr);

  return {
    n,
    wins,
    endReasons,
    duels: { avg: avg(totalDuels), min: min(totalDuels), max: max(totalDuels) },
    deferred: { avg: avg(totalDeferred), max: max(totalDeferred) },
    exiles: { avg: avg(totalExiles), max: max(totalExiles) },
    scores: { avg: avg(totalScores), min: min(totalScores), max: max(totalScores) },
    scoreDiff: { avg: avg(scoreDiffs), max: max(scoreDiffs) },
  };
}

// ─── CLI ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const gamesIdx = args.indexOf('--games');
const games = gamesIdx >= 0 ? parseInt(args[gamesIdx + 1]) : 1;
const verboseIdx = args.indexOf('--verbose');
const verbose = verboseIdx >= 0 ? parseInt(args[verboseIdx + 1]) : (games === 1 ? 1 : 0);

if (verbose > 0) {
  console.log(`\n═══════════════════════════════════════`);
  console.log(`  MASQUERADE 시뮬레이션 · ${verbose}판 상세`);
  console.log(`═══════════════════════════════════════\n`);
  for (let i = 0; i < verbose; i++) {
    console.log(`\n── 게임 ${i + 1} ──`);
    const r = runGame(true);
    for (const line of r.log) console.log(line);
  }
}

if (games > 1) {
  console.log(`\n═══════════════════════════════════════`);
  console.log(`  집계 · ${games}판`);
  console.log(`═══════════════════════════════════════\n`);
  const stats = runMany(games);
  console.log(`승리: 나 ${stats.wins.me} / 상대 ${stats.wins.opponent} / 무승부 ${stats.wins.draw}`);
  console.log(`종료 사유: 몰락 ${stats.endReasons.exile} · 정상 스코어링 ${stats.endReasons.reckoning}`);
  console.log(`\n결투 발생: 평균 ${stats.duels.avg.toFixed(1)}회 (범위 ${stats.duels.min}~${stats.duels.max})`);
  console.log(`유예 결투: 평균 ${stats.deferred.avg.toFixed(1)}회`);
  console.log(`총 추방: 평균 ${stats.exiles.avg.toFixed(1)}장 (최대 ${stats.exiles.max})`);
  console.log(`\n점수 분포: 평균 ${stats.scores.avg.toFixed(1)}점 · 범위 ${stats.scores.min}~${stats.scores.max}`);
  console.log(`점수 차이: 평균 ${stats.scoreDiff.avg.toFixed(1)}점 · 최대 ${stats.scoreDiff.max}점`);
}
