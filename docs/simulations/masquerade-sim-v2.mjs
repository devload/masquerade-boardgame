#!/usr/bin/env node
/**
 * MASQUERADE · Shared Court simulator v2
 *
 * All-included version: challenge system, slot buffs, whisper cards,
 * alliance, court events, mask swap, tightened balance.
 *
 *   node masquerade-sim-v2.mjs                 # 1 detailed game
 *   node masquerade-sim-v2.mjs --games 500     # aggregate stats
 *   node masquerade-sim-v2.mjs --games 500 --verbose 2
 */

// ─── Config ─────────────────────────────────────────────────────────
const IDENTITIES = ['Royalty', 'Thief', 'Scholar', 'Hunter', 'Mystic'];
const IDENTITY_KR = {
  Royalty: '👑 왕족', Thief: '🗡 도둑', Scholar: '📚 학자',
  Hunter: '🏹 사냥꾼', Mystic: '🔮 신비주의자',
};
const BEATS = {
  Royalty: ['Thief', 'Mystic'],
  Thief:   ['Scholar', 'Hunter'],
  Scholar: ['Royalty', 'Mystic'],
  Hunter:  ['Royalty', 'Scholar'],
  Mystic:  ['Thief', 'Hunter'],
};
const ICONS = ['moon', 'day', 'shell', 'feather', 'forest'];

// v2 tuning (tuned after balance runs)
const TOTAL_ROUNDS = 8;
const COURT_SIZE = 8;
const EXILE_LIMIT = 5;         // 몰락 임계값
const EXILE_PENALTY = -4;      // 추방 페널티
const DUEL_WIN_BONUS = 0;      // 결투 승자 표면 점수 보너스 (자리 확보 자체가 보상)
const CHALLENGE_ALLOWED_FROM = 7; // 챌린지는 R7부터만 (후반부 클라이맥스)

// Slot buffs — each slot has a favored identity that gets +N bonus
const SLOT_BUFFS = {
  0: { identity: 'Royalty', bonus: 5, name: '왕좌 자리' },       // Slot 1
  1: { identity: 'Thief', bonus: 3, name: '뒷골목 자리' },        // Slot 2
  2: { identity: 'Scholar', bonus: 4, name: '도서관 자리' },      // Slot 3
  3: { identity: 'Hunter', bonus: 4, name: '숲가 자리' },         // Slot 4
  4: { identity: 'Hunter', bonus: 2, adjacent: 2, name: '무도회 중심' }, // Slot 5, hunter +2, adjacent icon bonus doubled
  5: { identity: 'Mystic', bonus: 4, name: '수정구 자리' },       // Slot 6
  6: { identity: 'Scholar', bonus: 3, name: '학문의 자리' },      // Slot 7
  7: { identity: 'Mystic', bonus: 3, distinctBonus: 1, name: '왕 옆자리' }, // Slot 8, mystic +3, distinct identity bonus +1 per
};

// Court events pool
const COURT_EVENTS = [
  { name: '왕이 도착', desc: '모든 왕족 카드 +5', apply: (state) => addIdentityBonus(state, 'Royalty', 5) },
  { name: '도둑 검거', desc: '모든 도둑 카드 -3', apply: (state) => addIdentityBonus(state, 'Thief', -3) },
  { name: '학자 초청', desc: '학자 매치 슬롯 조건 완화 (±2)', apply: (state) => state.scholarLoose = true },
  { name: '가면 축제', desc: '모든 카드 표면 +1', apply: (state) => state.festivalBonus = 1 },
  { name: '신비 안개', desc: '모든 신비주의자 +5', apply: (state) => addIdentityBonus(state, 'Mystic', 5) },
  { name: '사냥 대회', desc: '모든 사냥꾼 +5', apply: (state) => addIdentityBonus(state, 'Hunter', 5) },
];

function addIdentityBonus(state, identity, bonus) {
  state.identityBonus[identity] = (state.identityBonus[identity] || 0) + bonus;
}

// ─── Cards ──────────────────────────────────────────────────────────
function generateDeck() {
  const cards = [];
  let id = 1;
  for (const identity of IDENTITIES) {
    for (let i = 0; i < 8; i++) { // 8 per identity = 40 cards
      const surface = 1 + Math.floor(Math.random() * 4); // 1-4
      const number = id;
      cards.push({
        id: id++,
        name: `${identity[0]}${i+1}`,
        surface, number, identity,
        icon: ICONS[Math.floor(Math.random() * ICONS.length)],
        whisper: Math.random() < 0.15, // 15% of cards have whisper power
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

// ─── Init ───────────────────────────────────────────────────────────
function initGame() {
  const deck = generateDeck();
  const me = { hand: deck.splice(0, 3), exile: [], id: 'me', knownOppCards: [] };
  const opp = { hand: deck.splice(0, 3), exile: [], id: 'opponent', knownOppCards: [] };
  const market = deck.splice(0, 3);
  const court = Array.from({ length: COURT_SIZE }, () => ({
    owner: null, card: null, pending: null, alliance: null,
  }));
  return {
    deck, me, opponent: opp, market, court,
    round: 1, log: [],
    identityBonus: {},
    scholarLoose: false, festivalBonus: 0,
    events: [],
    stats: { duels: 0, deferred: 0, challenges: 0, alliances: 0, exiles: 0, peaceful: 0, whispers: 0, maskSwaps: 0 },
  };
}

// ─── Duel ───────────────────────────────────────────────────────────
function duel(cardA, cardB) {
  if (cardA.identity === cardB.identity) return 'draw';
  if (BEATS[cardA.identity].includes(cardB.identity)) return 'a';
  return 'b';
}

function resolveDuel(state, slot, myCard, oppCard, log, isChallenge = false) {
  state.stats.duels++;
  if (isChallenge) state.stats.challenges++;
  const outcome = duel(myCard, oppCard);

  if (outcome === 'draw') {
    // Alliance — both cards stay, both score halved on this slot
    state.stats.alliances++;
    state.court[slot].alliance = { me: myCard, opponent: oppCard };
    state.court[slot].owner = null; // shared
    log.push(`  🤝 S${slot+1} 동맹: 양쪽 ${IDENTITY_KR[myCard.identity]} (반반 스코어)`);
    return;
  }

  const winner = outcome === 'a' ? 'me' : 'opponent';
  const loser = outcome === 'a' ? 'opponent' : 'me';
  const winCard = outcome === 'a' ? myCard : oppCard;
  const loseCard = outcome === 'a' ? oppCard : myCard;

  // For a challenge, when the challenger WINS, defender's card was already
  // captured as `loseCard` (myCard/oppCard). The standard exile push below
  // handles it. When challenger LOSES, defender stays and challenger's card
  // is exiled (also handled by standard push). No extra push needed here.
  if (isChallenge) {
    log.push(`  🎯 챌린지: ${winner === 'me' ? '나' : '상대'} 승리`);
  }

  state.court[slot].owner = winner;
  state.court[slot].card = winCard;
  state.court[slot].alliance = null;
  state[loser].exile.push(loseCard);
  state.stats.exiles++;

  const winnerName = winner === 'me' ? '나' : '상대';
  log.push(`  ⚔ S${slot+1}: ${winnerName} ${IDENTITY_KR[winCard.identity]} 승리 (+${DUEL_WIN_BONUS} 보너스)` +
           ` · ${IDENTITY_KR[loseCard.identity]} 추방`);
}

// ─── AI ─────────────────────────────────────────────────────────────
function pickMove(state, player) {
  const p = state[player];
  const opp = player === 'me' ? 'opponent' : 'me';

  // Available slots: empty, or challenge allowed from R7+ (climax)
  const canChallenge = state.round >= CHALLENGE_ALLOWED_FROM;
  const availableSlots = state.court
    .map((s, i) => {
      if (s.pending) return -1; // don't touch pending
      if (s.owner === null) return i; // empty
      if (canChallenge && s.owner === opp) return i; // can challenge opponent
      return -1;
    })
    .filter(i => i >= 0);

  if (availableSlots.length === 0) return null;
  const identitiesKnown = state.round > 5;

  let bestScore = -Infinity;
  let bestChoice = null;

  for (const card of p.hand) {
    for (const slot of availableSlots) {
      let score = card.surface;
      const buff = SLOT_BUFFS[slot];
      const isChallenge = state.court[slot].owner === opp;

      // Slot buff for own identity
      if (identitiesKnown && buff.identity === card.identity) {
        score += buff.bonus;
      }

      if (identitiesKnown) {
        // Identity-specific bonuses
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

        // Challenge estimate: assume 40% chance to win against unknown card
        if (isChallenge) {
          const oppCard = state.court[slot].card;
          const outcome = duel(card, oppCard);
          if (outcome === 'a') score += 8; // strong incentive to challenge if we win
          else if (outcome === 'draw') score += 2; // alliance
          else score -= 5; // discourage losing challenge
        }
      } else {
        // First half: random exploration
        score += Math.random() * 4;
      }

      // Random tiebreaker
      score += Math.random() * 1.5;

      if (score > bestScore) {
        bestScore = score;
        bestChoice = { card, slot, isChallenge };
      }
    }
  }

  return bestChoice;
}

// ─── Round execution ────────────────────────────────────────────────
function playRound(state, log) {
  const myMove = pickMove(state, 'me');
  const oppMove = pickMove(state, 'opponent');
  if (!myMove || !oppMove) {
    log.push(`R${state.round}: 자리 없음, 스킵`);
    state.round++;
    return;
  }

  log.push(`R${state.round}: 나 S${myMove.slot+1} ${myMove.card.name}(${IDENTITY_KR[myMove.card.identity]}${myMove.isChallenge ? '🎯' : ''}) · 상대 S${oppMove.slot+1} ${oppMove.card.name}(${IDENTITY_KR[oppMove.card.identity]}${oppMove.isChallenge ? '🎯' : ''})`);

  // Whisper effect (upon reveal)
  if (myMove.card.whisper && state.opponent.hand.length > 0) {
    const target = state.opponent.hand[0];
    state.me.knownOppCards.push({ id: target.id, identity: target.identity });
    state.stats.whispers++;
    log.push(`  🌙 속삭임! 내 카드가 상대 손패 ${IDENTITY_KR[target.identity]} 유출`);
  }
  if (oppMove.card.whisper && state.me.hand.length > 0) {
    const target = state.me.hand[0];
    state.opponent.knownOppCards.push({ id: target.id, identity: target.identity });
    state.stats.whispers++;
    log.push(`  🌙 상대 속삭임 · 내 손패 정체 유출됨`);
  }

  // Remove played cards from hands
  state.me.hand = state.me.hand.filter(c => c.id !== myMove.card.id);
  state.opponent.hand = state.opponent.hand.filter(c => c.id !== oppMove.card.id);

  if (myMove.slot !== oppMove.slot) {
    // Different slots
    if (myMove.isChallenge) {
      resolveDuel(state, myMove.slot, myMove.card, state.court[myMove.slot].card, log, true);
    } else {
      state.court[myMove.slot].owner = 'me';
      state.court[myMove.slot].card = myMove.card;
    }
    if (oppMove.isChallenge) {
      resolveDuel(state, oppMove.slot, state.court[oppMove.slot].card, oppMove.card, log, true);
    } else {
      state.court[oppMove.slot].owner = 'opponent';
      state.court[oppMove.slot].card = oppMove.card;
    }
    state.stats.peaceful++;
  } else {
    // Same slot!
    if (state.round <= 4) {
      state.court[myMove.slot].pending = { me: myMove.card, opponent: oppMove.card };
      state.stats.deferred++;
      log.push(`  ⏸ 결투 유예 → R5 UNMASKING`);
    } else {
      resolveDuel(state, myMove.slot, myMove.card, oppMove.card, log);
    }
  }

  // Refill hand
  while (state.me.hand.length < 3 && state.deck.length > 0) state.me.hand.push(state.deck.shift());
  while (state.opponent.hand.length < 3 && state.deck.length > 0) state.opponent.hand.push(state.deck.shift());

  state.round++;
}

// ─── R5 UNMASKING ───────────────────────────────────────────────────
function grandUnmasking(state, log) {
  log.push('');
  log.push('═════════ R5 · GRAND UNMASKING ═════════');
  const pendingSlots = state.court.map((s, i) => s.pending ? i : -1).filter(i => i >= 0);
  for (const slot of pendingSlots) {
    const p = state.court[slot].pending;
    resolveDuel(state, slot, p.me, p.opponent, log);
    state.court[slot].pending = null;
  }
  log.push('');
}

// ─── Court Events (R3, R6) ──────────────────────────────────────────
function fireCourtEvent(state, log) {
  const event = COURT_EVENTS[Math.floor(Math.random() * COURT_EVENTS.length)];
  event.apply(state);
  state.events.push(event.name);
  log.push(`🎪 왕궁 이벤트: ${event.name} · ${event.desc}`);
}

// ─── Mask Swap (R3) ─────────────────────────────────────────────────
function maskSwap(state, log) {
  // Simple bot: 30% chance to swap a random hand card's identity
  for (const player of ['me', 'opponent']) {
    if (Math.random() < 0.3 && state[player].hand.length > 0) {
      const idx = Math.floor(Math.random() * state[player].hand.length);
      const oldId = state[player].hand[idx].identity;
      const newId = IDENTITIES[Math.floor(Math.random() * IDENTITIES.length)];
      if (newId !== oldId) {
        state[player].hand[idx].identity = newId;
        state.stats.maskSwaps++;
        log.push(`  🎭 ${player === 'me' ? '나' : '상대'} 가면 교체: ${IDENTITY_KR[oldId]} → ${IDENTITY_KR[newId]}`);
      }
    }
  }
}

// ─── Scoring ────────────────────────────────────────────────────────
function score(state) {
  const s = {
    me: { surface: 0, identity: 0, slot: 0, event: 0, exile: 0, combo: 0 },
    opponent: { surface: 0, identity: 0, slot: 0, event: 0, exile: 0, combo: 0 },
  };

  for (let i = 0; i < COURT_SIZE; i++) {
    const slot = state.court[i];
    const buff = SLOT_BUFFS[i];

    // Alliance case: both score half
    if (slot.alliance) {
      const { me: myC, opponent: oppC } = slot.alliance;
      const halfBase = Math.floor((myC.surface + oppC.surface + (state.festivalBonus * 2)) / 2);
      s.me.surface += halfBase;
      s.opponent.surface += halfBase;
      continue;
    }

    if (!slot.card || !slot.owner) continue;

    const target = s[slot.owner];
    target.surface += slot.card.surface + state.festivalBonus;

    // Slot buff for identity
    if (buff.identity === slot.card.identity) target.slot += buff.bonus;

    // Identity effects
    switch (slot.card.identity) {
      case 'Royalty': {
        const roys = state.court.filter(sl => sl.card?.identity === 'Royalty' || sl.alliance?.me?.identity === 'Royalty' || sl.alliance?.opponent?.identity === 'Royalty').length;
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
        const diff = Math.abs(slotNum - cardMod);
        const threshold = state.scholarLoose ? 2 : 0;
        if (diff <= threshold) target.identity += 8;
        break;
      }
      case 'Hunter': {
        for (const adj of [i - 1, i + 1]) {
          if (adj >= 0 && adj < COURT_SIZE) {
            const a = state.court[adj];
            if (a.card?.icon === slot.card.icon) {
              const bonus = (i === 4) ? 10 : 5; // Slot 5 무도회 중심 doubles hunter adjacent
              target.identity += bonus;
            }
          }
        }
        break;
      }
      case 'Mystic': {
        const distinct = new Set(state.court.filter(sl => sl.card).map(sl => sl.card.identity)).size;
        const perDistinct = (i === 7) ? 3 : 2; // Slot 8 왕 옆자리 mystic bonus
        target.identity += distinct * perDistinct;
        break;
      }
    }

    // Global identity bonus from court events
    if (state.identityBonus[slot.card.identity]) {
      target.event += state.identityBonus[slot.card.identity];
    }
  }

  s.me.exile = state.me.exile.length * EXILE_PENALTY;
  s.opponent.exile = state.opponent.exile.length * EXILE_PENALTY;

  // Combos
  const mySlots = state.court.filter(sl => sl.owner === 'me').length;
  const oppSlots = state.court.filter(sl => sl.owner === 'opponent').length;
  if (mySlots >= 6) s.me.combo += 15;
  if (oppSlots >= 6) s.opponent.combo += 15;

  const myIdentityCounts = {}; const oppIdentityCounts = {};
  for (const sl of state.court) {
    if (!sl.card || !sl.owner) continue;
    const counts = sl.owner === 'me' ? myIdentityCounts : oppIdentityCounts;
    counts[sl.card.identity] = (counts[sl.card.identity] || 0) + 1;
  }
  if (Object.values(myIdentityCounts).some(n => n >= 4)) s.me.combo += 15;
  if (Object.values(oppIdentityCounts).some(n => n >= 4)) s.opponent.combo += 15;

  const distinct = new Set(state.court.filter(sl => sl.card).map(sl => sl.card.identity)).size;
  if (distinct === 5) { s.me.combo += 10; s.opponent.combo += 10; }
  if (state.stats.duels === 0) { s.me.combo += 20; s.opponent.combo += 20; }

  const myTotal = s.me.surface + s.me.identity + s.me.slot + s.me.event + s.me.exile + s.me.combo;
  const oppTotal = s.opponent.surface + s.opponent.identity + s.opponent.slot + s.opponent.event + s.opponent.exile + s.opponent.combo;
  return { detail: s, myTotal, oppTotal };
}

// ─── Game ───────────────────────────────────────────────────────────
function runGame(narrative = false) {
  const state = initGame();
  const log = [];

  while (state.round <= TOTAL_ROUNDS) {
    if (state.round === 3) {
      fireCourtEvent(state, log);
      maskSwap(state, log);
    }
    if (state.round === 5) {
      grandUnmasking(state, log);
    }
    if (state.round === 6) {
      fireCourtEvent(state, log);
    }

    playRound(state, log);

    if (state.me.exile.length >= EXILE_LIMIT) {
      log.push(`💀 나 몰락 (${state.me.exile.length}장) → 패배`);
      return finish(state, log, 'opponent', 'exile');
    }
    if (state.opponent.exile.length >= EXILE_LIMIT) {
      log.push(`💀 상대 몰락 (${state.opponent.exile.length}장) → 승리`);
      return finish(state, log, 'me', 'exile');
    }
  }

  const { detail, myTotal, oppTotal } = score(state);
  log.push('');
  log.push('═════════ RECKONING ═════════');
  log.push(`나:   자리 ${detail.me.surface} + 정체 ${detail.me.identity} + 자리버프 ${detail.me.slot} + 이벤트 ${detail.me.event} + 콤보 ${detail.me.combo} + 추방 ${detail.me.exile} = ${myTotal}`);
  log.push(`상대: 자리 ${detail.opponent.surface} + 정체 ${detail.opponent.identity} + 자리버프 ${detail.opponent.slot} + 이벤트 ${detail.opponent.event} + 콤보 ${detail.opponent.combo} + 추방 ${detail.opponent.exile} = ${oppTotal}`);

  const winner = myTotal > oppTotal ? 'me' : myTotal < oppTotal ? 'opponent' : 'draw';
  log.push(`결과: ${winner === 'me' ? '나 승리' : winner === 'opponent' ? '상대 승리' : '무승부'} (${myTotal} vs ${oppTotal})`);

  return {
    winner, reason: 'reckoning', log,
    stats: state.stats,
    exiles: [state.me.exile.length, state.opponent.exile.length],
    scores: [myTotal, oppTotal],
    detail,
    events: state.events,
  };
}

function finish(state, log, winner, reason) {
  return {
    winner, reason, log,
    stats: state.stats,
    exiles: [state.me.exile.length, state.opponent.exile.length],
    scores: null,
    events: state.events,
  };
}

// ─── Aggregate ──────────────────────────────────────────────────────
function runMany(n) {
  const results = [];
  for (let i = 0; i < n; i++) results.push(runGame(false));

  const wins = { me: 0, opponent: 0, draw: 0 };
  const endReasons = { exile: 0, reckoning: 0 };
  const stats = { duels: [], deferred: [], challenges: [], alliances: [], exiles: [], scores: [], scoreDiffs: [], whispers: [], maskSwaps: [] };

  for (const r of results) {
    wins[r.winner]++;
    endReasons[r.reason]++;
    stats.duels.push(r.stats.duels);
    stats.deferred.push(r.stats.deferred);
    stats.challenges.push(r.stats.challenges);
    stats.alliances.push(r.stats.alliances);
    stats.exiles.push(r.exiles[0] + r.exiles[1]);
    stats.whispers.push(r.stats.whispers);
    stats.maskSwaps.push(r.stats.maskSwaps);
    if (r.scores) {
      stats.scores.push(...r.scores);
      stats.scoreDiffs.push(Math.abs(r.scores[0] - r.scores[1]));
    }
  }

  const avg = arr => arr.length === 0 ? 0 : arr.reduce((a,b)=>a+b,0)/arr.length;
  const max = arr => arr.length === 0 ? 0 : Math.max(...arr);
  const min = arr => arr.length === 0 ? 0 : Math.min(...arr);

  return {
    n, wins, endReasons,
    duels: { avg: avg(stats.duels), min: min(stats.duels), max: max(stats.duels) },
    deferred: { avg: avg(stats.deferred), max: max(stats.deferred) },
    challenges: { avg: avg(stats.challenges), max: max(stats.challenges) },
    alliances: { avg: avg(stats.alliances), max: max(stats.alliances) },
    exiles: { avg: avg(stats.exiles), max: max(stats.exiles) },
    scores: { avg: avg(stats.scores), min: min(stats.scores), max: max(stats.scores) },
    scoreDiff: { avg: avg(stats.scoreDiffs), max: max(stats.scoreDiffs) },
    whispers: { avg: avg(stats.whispers) },
    maskSwaps: { avg: avg(stats.maskSwaps) },
  };
}

// ─── CLI ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const gi = args.indexOf('--games');
const games = gi >= 0 ? parseInt(args[gi + 1]) : 1;
const vi = args.indexOf('--verbose');
const verbose = vi >= 0 ? parseInt(args[vi + 1]) : (games === 1 ? 1 : 0);

if (verbose > 0) {
  console.log(`\n═══════ MASQUERADE v2 · ${verbose}판 상세 ═══════\n`);
  for (let i = 0; i < verbose; i++) {
    console.log(`\n── 게임 ${i + 1} ──`);
    const r = runGame(true);
    for (const line of r.log) console.log(line);
  }
}

if (games > 1) {
  console.log(`\n═══════ 집계 · ${games}판 ═══════\n`);
  const s = runMany(games);
  console.log(`승리: 나 ${s.wins.me} / 상대 ${s.wins.opponent} / 무승부 ${s.wins.draw}`);
  console.log(`종료: 몰락 ${s.endReasons.exile}회 · 정상 ${s.endReasons.reckoning}회`);
  console.log(`\n결투: 평균 ${s.duels.avg.toFixed(1)}회 (범위 ${s.duels.min}~${s.duels.max})`);
  console.log(`유예 결투: 평균 ${s.deferred.avg.toFixed(1)}회`);
  console.log(`챌린지: 평균 ${s.challenges.avg.toFixed(1)}회`);
  console.log(`동맹: 평균 ${s.alliances.avg.toFixed(1)}회`);
  console.log(`총 추방: 평균 ${s.exiles.avg.toFixed(1)}장 (최대 ${s.exiles.max})`);
  console.log(`속삭임: 평균 ${s.whispers.avg.toFixed(1)}회`);
  console.log(`가면 교체: 평균 ${s.maskSwaps.avg.toFixed(1)}회`);
  console.log(`\n점수: 평균 ${s.scores.avg.toFixed(1)} · 범위 ${s.scores.min}~${s.scores.max}`);
  console.log(`점수 차: 평균 ${s.scoreDiff.avg.toFixed(1)} · 최대 ${s.scoreDiff.max}`);
}
