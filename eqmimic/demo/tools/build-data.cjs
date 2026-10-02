#!/usr/bin/env node
// Builds eqmimic/demo/data.js: the sample data behind the eqmimic.quest demo.
//
// Input is a private export of one real raid night (a guild's own parses, boss stats, attendance,
// loot); it is never committed. Every character name in it is replaced here by an invented one, the
// dates move back eight weeks, and ranks, DKP and Mimic versions are made up. No /who data is used.
//
// The invented names were checked against every character the guild knows and every name its /who
// history has seen, and against the server's NPC names, before they went in this list: none of them
// is anybody. The mapping is shuffled with Math.random and never written down, so the output cannot
// be turned back into the real names. The build stops if any real name survives into the output.
//
// Usage: node build-data.cjs <export.json>   (writes ../data.js)

const fs = require('fs');
const path = require('path');

const raw = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const INVENTED = ('Rynwen,Quelessa,Ulvyn,Thaliel,Coressa,Galric,Lordric,Cormara,Veshild,Wynwyn,Sylthil,Corhild,'
  + 'Varlan,Zarhild,Zarlan,Bralith,Elseth,Lorwen,Xanwen,Thalrek,Galthil,Rynnar,Ithgard,Syllith,Vardan,Lorrek,'
  + 'Halthas,Rynvyn,Nyrwen,Nyrwyn,Xanric,Dragard,Syldan,Vesvale,Ornar,Sylmara,Syldric,Ithys,Wynros,Lorvyn,Halwen,'
  + 'Zardor,Rynwyn,Thalmara,Nyrric,Yrdor,Galros,Xanlith,Alros,Draessa,Ithrek,Ryniel,Varessa,Halvale,Xanvyn,Ardys,'
  + 'Peliel,Lordan,Thalthil,Kellan,Thalgard,Fenvale,Kelwyn,Yrvale,Queldor,Fendan,Tororn,Ulthas,Yrlith,Jormara,'
  + 'Quelorn,Nyressa,Cordan,Tormir,Sylys,Nyrhild,Wynmir,Thalwen,Corvale,Brays,Wynrek,Alnar,Yrros,Eldan,Torthas,'
  + 'Zarthas,Belmir,Ulros,Uldric,Bradric,Drathil,Braessa,Jormir,Galwen,Orvyn,Bellan,Rynmir,Ithhild,Wynthil,Corlan,'
  + 'Drawen,Galdor,Torrek,Zarvyn,Draseth,Pelvyn').split(',');

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Every raider with a class (classless rows are pets) gets an invented name.
const classOf = new Map();
for (const rows of Object.values(raw.players)) for (const [n, cls] of rows) if (cls) classOf.set(n.toLowerCase(), cls);
const realNames = [...classOf.keys()];
const pool = shuffle(INVENTED.slice());
if (pool.length < realNames.length) throw new Error('not enough invented names');
const fake = new Map(realNames.map((n, i) => [n, pool[i]]));

const SHIFT_MS = 56 * 86400e3;   // eight weeks: same weekday, different date
const shift = (iso) => new Date(Date.parse(iso) - SHIFT_MS).toISOString();
const rnd = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

// EQEmu special abilities → what Target Info shows.
const ABIL = { 1: 'Summons', 2: 'Enrage', 3: 'Rampage', 4: 'AE Rampage', 5: 'Flurry', 7: 'Quad attack',
  10: 'Magic weapons only', 12: 'Unslowable', 13: 'Unmezzable', 14: 'Uncharmable', 15: 'Unstunnable',
  16: 'Unsnareable', 17: 'Unfearable', 19: 'Immune to melee', 20: 'Immune to spells', 31: 'Immune to pacify',
  46: 'Immune to ranged' };
const abilities = (sa) => sa.split('^').map((p) => Number(p.split(',')[0])).filter((id) => ABIL[id]).map((id) => ABIL[id]);

const fightId = new Map(raw.bosses.map((b, i) => [b.id, 'f' + (i + 1)]));   // not the database's ids
const fights = raw.bosses.map((b) => {
  const rows = (raw.players[b.id] || []).filter((r) => r[1]);
  const players = rows.map(([n, cls, dmg, dps, pet]) => ({ name: fake.get(n.toLowerCase()), cls, dmg, dps, pet: !!pet }));
  const total = players.reduce((s, p) => s + p.dmg, 0);
  return {
    id: fightId.get(b.id), boss: b.npc, level: b.level, hp: b.hp, ac: b.ac,
    resists: { magic: b.mr, fire: b.fr, cold: b.cr, poison: b.pr, disease: b.dr },
    hit: [b.min, b.max], abilities: abilities(b.sa),
    at: shift(b.at), dur: b.dur, total, raidDps: Math.round(total / b.dur), players,
  };
});

// The roster: everyone who raided that night, with a made-up rank and Mimic version.
const roster = shuffle(realNames.slice()).map((n, i) => ({
  name: fake.get(n), cls: classOf.get(n),
  rank: i < 3 ? 'Officer' : i < 34 ? 'Raider' : 'Recruit',
  mimic: i % 9 === 0 ? null : i % 7 === 0 ? '2.7.5' : i % 11 === 0 ? '2.7.7-beta.9' : '2.7.6',
})).sort((a, b) => a.name.localeCompare(b.name));

const attendance = {
  nights: raw.attendance.map((a) => shift(a.at)),
  present: Object.fromEntries(roster.map((r) => {
    const real = [...fake].find(([, f]) => f === r.name)[0];
    return [r.name, raw.attendance.map((a) => a.n.includes(real))];
  })),
};

// Loot: the night's real drops, each won by an invented raider of a class that uses it.
const byClass = (cls) => roster.filter((r) => r.cls === cls);
const loot = raw.loot.map((l) => {
  const cands = l.cls ? byClass(l.cls) : roster;
  const win = cands.length ? cands[rnd(0, cands.length - 1)] : roster[rnd(0, roster.length - 1)];
  return { item: l.item, boss: fights.find((f) => f.id === fightId.get(l.boss)).boss, winner: win.name, cls: win.cls,
    dkp: l.cls ? rnd(2, 9) * 5 : 0 };
});

// The Mimic user the control panel belongs to: a Bard with a mid-table night.
const bards = fights[2].players.filter((p) => p.cls === 'Bard');
const you = (bards[1] || bards[0] || fights[2].players[3]).name;

const data = {
  guild: 'Lantern Watch', zone: raw.zone, you, generated: new Date().toISOString().slice(0, 10),
  fights, roster, attendance, loot,
};

const out = 'window.DEMO = ' + JSON.stringify(data) + ';\n';
// Fail closed: no real name may survive, as a whole word, anywhere in the output.
const lower = out.toLowerCase();
const leaks = [...new Set([...realNames, ...raw.attendance.flatMap((a) => a.n)])]
  .filter((n) => new RegExp('\\b' + n.replace(/[^a-z0-9]/g, '') + '\\b').test(lower));
if (leaks.length) { console.error('real names in the output, not written:', leaks.length); process.exit(1); }

fs.writeFileSync(path.join(__dirname, '..', 'data.js'),
  '// Sample data for the eqmimic.quest demo. Every name is invented; built by tools/build-data.cjs.\n' + out);
console.log('wrote data.js:', fights.length, 'fights,', roster.length, 'raiders, you =', you);
