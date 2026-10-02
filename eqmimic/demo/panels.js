// The demo's screens, shared by both layouts (the tour and the sandbox). Each P.<name>(host) fills
// one element from window.DEMO (data.js: a real raid night with every name invented). Nothing is
// fetched and nothing is saved: toggles and votes change this page only.
(function () {
  'use strict';
  var D = window.DEMO;
  var P = window.DemoPanels = {};

  var ABBR = { Bard: 'BRD', Beastlord: 'BST', Cleric: 'CLR', Druid: 'DRU', Enchanter: 'ENC', Magician: 'MAG',
    Monk: 'MNK', Necromancer: 'NEC', Paladin: 'PAL', Ranger: 'RNG', Rogue: 'ROG', 'Shadow Knight': 'SHD',
    Shaman: 'SHM', Warrior: 'WAR', Wizard: 'WIZ' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function kfmt(n) { return n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'k' : String(Math.round(n)); }
  function mmss(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function cls(c) { return '<span class="cls">' + esc(ABBR[c] || '') + '</span>'; }
  // Times show in US Eastern, the way a raid on this server talks about them.
  function clock(iso) { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }); }
  function day(iso) { return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York' }); }
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fight = function (id) { return D.fights.filter(function (f) { return f.id === id; })[0] || D.fights[0]; };
  var you = D.you;
  var youCls = (D.roster.filter(function (r) { return r.name === you; })[0] || {}).cls || 'Bard';
  P.data = D;
  P.fmt = { esc: esc, fmt: fmt, kfmt: kfmt, mmss: mmss, clock: clock, day: day };

  // ── On your screen: the overlays, replaying one real fight ────────────────────────────────────
  P.scene = function (host) {
    var f = fight('f4');                       // Xerkizh The Creator: 7 minutes, slowable, rampages
    var LOOP = 48000;                          // the 7-minute fight, replayed in 48 seconds
    var ease = {};
    f.players.forEach(function (p, i) { ease[p.name] = 0.85 + ((i * 37) % 30) / 100; });
    var tank = f.players.filter(function (p) { return p.cls === 'Warrior'; })[0];
    var calls = [
      { at: 28, text: '⚠ ' + f.boss + ' goes on a RAMPAGE', warn: false },
      { at: 70, text: 'Slowed: ' + f.boss + ' · 3:00', warn: true },
      { at: 150, text: '⚠ RAMPAGE — ON YOU', warn: false },
      { at: 238, text: f.boss + ' summons ' + (tank ? tank.name : 'the tank'), warn: true },
      { at: 245, text: 'Slow fades in 0:05 — reslow', warn: true },
      { at: 330, text: '⚠ ' + f.boss + ' goes on a RAMPAGE', warn: false },
    ];
    host.innerHTML =
      '<div class="scene" role="img" aria-label="Mimic\'s overlays during a raid fight: damage meter, timers, a callout and the target\'s card">'
      + '<div class="ov dpsov"><h4><span><span class="mv">✥</span><b class="sc-boss"></b></span><span class="sc-t"></span></h4><div class="sc-rows"></div>'
      + '<div class="sc-raid faint" style="font-size:11px;margin-top:4px"></div></div>'
      + '<div class="ov timov"><h4><span><span class="mv">✥</span>Timers</span><span class="faint">✕</span></h4><div class="sc-tim"></div></div>'
      + '<div class="ov tgtov"><h4><span><span class="mv">✥</span>Target Info</span><span class="faint">F/Q/V</span></h4><div class="sc-tgt"></div></div>'
      + '<div class="callout sc-call"></div>'
      + '<div class="note">Overlays sit over the game like this. Each one moves, resizes and hides on its own.</div>'
      + '</div>'
      + '<div class="replay"><button type="button" class="sc-pp">' + (reduced ? '▶ Play' : '❚❚ Pause') + '</button>'
      + '<span>Replaying a real 7-minute fight against ' + esc(f.boss) + ', ' + f.players.length + ' raiders, every name invented.</span></div>';
    var q = function (c) { return host.querySelector(c); };
    q('.sc-boss').textContent = f.boss;
    var t0 = performance.now(), paused = reduced, frozenAt = reduced ? 0.58 : null, timer = null;
    function frame() {
      if (!host.isConnected) { clearInterval(timer); return; }   // the sandbox moved to another page
      var p = frozenAt != null ? frozenAt : ((performance.now() - t0) % LOOP) / LOOP;
      var sec = p * f.dur;
      var rows = f.players.map(function (pl) {
        var d = pl.dmg * Math.pow(p, ease[pl.name]);
        return { name: pl.name, cls: pl.cls, d: d, dps: sec > 1 ? d / sec : 0 };
      }).sort(function (a, b) { return b.d - a.d; });
      var top = rows.slice(0, 8), mine = rows.filter(function (r) { return r.name === you; })[0];
      if (mine && top.indexOf(mine) < 0) top.push(mine);
      var max = Math.max(1, rows[0].d);
      q('.sc-t').textContent = mmss(sec);
      q('.sc-raid').textContent = 'raid ' + kfmt(rows.reduce(function (s, r) { return s + r.dps; }, 0)) + ' DPS · '
        + rows.length + ' on the meter' + (mine ? ' · you #' + (rows.indexOf(mine) + 1) : '');
      q('.sc-rows').innerHTML = top.map(function (r) {
        return '<div class="dpsrow' + (r.name === you ? ' me' : '') + '"><span class="faint">' + (rows.indexOf(r) + 1) + '</span>'
          + '<span class="n">' + esc(r.name) + ' ' + cls(r.cls) + '</span><span class="v">' + fmt(r.dps) + '</span>'
          + '<i style="transform:scaleX(' + (r.d / max).toFixed(3) + ')"></i></div>';
      }).join('');
      var slowLeft = sec < 70 ? null : (180 - ((sec - 70) % 180));
      var tick = 6 - (sec % 6);
      var bars = [
        { label: 'Server tick', left: tick, of: 6, c: '' },
        slowLeft != null ? { label: 'Slow · ' + f.boss, left: slowLeft, of: 180, c: 'gold' } : { label: 'Slow · not landed yet', left: 0, of: 180, c: 'gold' },
        { label: 'Rampage cooldown', left: 30 - (sec % 30), of: 30, c: 'red' },
        { label: youCls === 'Bard' ? 'Your Selo\'s Accelerando' : 'Your Clarity', left: 210 - (sec % 210), of: 210, c: 'purple' },
      ];
      q('.sc-tim').innerHTML = bars.map(function (b) {
        return '<div class="tbar ' + b.c + '"><b style="width:' + (100 * b.left / b.of).toFixed(1) + '%"></b><span><em>' + esc(b.label) + '</em><em>' + (b.left > 0 ? mmss(b.left) : '—') + '</em></span></div>';
      }).join('');
      var hpPct = Math.max(1, Math.round(100 * (1 - p)));
      q('.sc-tgt').innerHTML = '<div><b>' + esc(f.boss) + '</b> <span class="dim">lvl ' + f.level + '</span></div>'
        + '<div class="hp"><b style="width:' + hpPct + '%"></b></div>'
        + '<div class="dim" style="font-size:11px">' + hpPct + '% of ' + kfmt(f.hp) + ' HP · AC ' + f.ac + ' · hits ' + f.hit[0] + '–' + f.hit[1] + '</div>'
        + '<div style="font-size:11px;margin:3px 0">MR ' + f.resists.magic + ' · FR ' + f.resists.fire + ' · CR ' + f.resists.cold + ' · PR ' + f.resists.poison + ' · DR ' + f.resists.disease + '</div>'
        + '<div>' + f.abilities.slice(0, 6).map(function (a) { return '<span class="chip' + (/Summon|Rampage|Enrage/.test(a) ? ' red' : '') + '">' + esc(a) + '</span>'; }).join('') + '</div>';
      var c = calls.filter(function (x) { return sec >= x.at && sec < x.at + 22; })[0];
      var el = q('.sc-call');
      if (c) { el.textContent = c.text; el.className = 'callout sc-call on' + (c.warn ? ' warn' : ''); }
      else if (frozenAt != null) { el.textContent = calls[2].text; el.className = 'callout sc-call on'; }
      else el.className = 'callout sc-call';
    }
    function run() { clearInterval(timer); timer = setInterval(frame, 250); frame(); }
    q('.sc-pp').addEventListener('click', function () {
      if (paused) { var at = frozenAt || 0; t0 = performance.now() - at * LOOP; frozenAt = null; paused = false; run(); this.textContent = '❚❚ Pause'; }
      else { frozenAt = ((performance.now() - t0) % LOOP) / LOOP; paused = true; clearInterval(timer); frame(); this.textContent = '▶ Play'; }
    });
    if (paused) frame(); else run();
  };

  // ── Mimic's control panel (runs on your PC; local mode) ───────────────────────────────────────
  var PERSONAL = [
    { name: 'Song interrupted', pattern: 'Your song is interrupted.', say: 'interrupted', on: true },
    { name: 'Mez worn off', pattern: 'Your {spell} spell has worn off of {s}.', say: '{s} is loose', on: true },
    { name: 'Out of range of the tank', pattern: 'Your target is too far away, get closer!', say: 'too far', on: false },
    { name: 'Slow landed', pattern: '{s} yawns.', say: 'slowed', on: true, timer: '3:00' },
  ];
  var OVERLAYS = [
    ['Damage meter', 'Who is doing what, live, with your own row always shown.', true],
    ['Trigger alerts', 'Callouts in the middle of the screen, spoken out loud if you want.', true],
    ['Timers', 'Countdowns for slows, debuffs, songs and the server tick.', true],
    ['Target Info', 'Level, HP, resists and what the mob can do, with its quests and vendor.', true],
    ['Charm tracker', 'Your charmed pet, its time left and when it will break.', false],
    ['Pet tracker', 'Your pet\'s health and buffs.', false],
    ['HUD', 'A ring round your character: health, mana, swing and cooldowns.', false],
    ['Buff queue', 'Who needs what buff. Needs your guild\'s server.', null],
  ];
  P.dashboard = function (host) {
    var tabs = ['Fights', 'Triggers', 'Overlays', 'Settings'];
    host.innerHTML = '<div class="mimic"><div class="bar"><img src="' + (window.DEMO_ROOT || '../') + 'mimic-logo.png" alt=""><b>Mimic</b>'
      + '<span class="dim">' + esc(you) + ' · ' + esc(youCls) + '</span>'
      + '<span class="st"><span><span class="dot"></span>Zeal connected</span><span><span class="dot"></span>Reading your log</span><span class="purple">● Local mode</span></span></div>'
      + '<div class="body"><div class="tabs" role="tablist">' + tabs.map(function (t, i) {
        return '<button type="button" role="tab" aria-selected="' + (i === 0) + '" data-tab="' + t + '">' + t + '</button>'; }).join('')
      + '</div><div class="dash-body"></div></div></div>';
    var body = host.querySelector('.dash-body');
    var personal = PERSONAL.map(function (t) { return Object.assign({}, t); });
    var ovs = OVERLAYS.map(function (o) { return o.slice(); });
    function show(tab) {
      host.querySelectorAll('.tabs button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === tab)); });
      if (tab === 'Fights') {
        body.innerHTML = '<p class="sub">Every fight Mimic saw tonight, from your own log. Click one to see the whole raid\'s numbers on your guild\'s site.</p>'
          + '<div class="scroll"><table class="tbl"><thead><tr><th>Fight</th><th>Started</th><th class="num">Length</th><th class="num">Your damage</th><th class="num">Your DPS</th><th class="num">You placed</th></tr></thead><tbody>'
          + D.fights.map(function (f) {
            var i = f.players.map(function (p) { return p.name; }).indexOf(you), me = f.players[i];
            return '<tr><td>' + esc(f.boss) + '</td><td class="dim">' + clock(f.at) + '</td><td class="num">' + mmss(f.dur) + '</td>'
              + '<td class="num">' + (me ? fmt(me.dmg) : '—') + '</td><td class="num gold">' + (me ? fmt(me.dps) : '—') + '</td>'
              + '<td class="num">' + (me ? (i + 1) + ' of ' + f.players.length : 'not there') + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      } else if (tab === 'Triggers') {
        body.innerHTML = '<p class="sub">Your own triggers. They match lines in your log and speak, flash or start a timer. Tells, guild chat and private channels never reach them.</p>'
          + '<div class="scroll"><table class="tbl"><thead><tr><th>On</th><th>Trigger</th><th>Watches for</th><th>Says</th></tr></thead><tbody>'
          + personal.map(function (t, i) {
            return '<tr><td><button type="button" class="toggle" data-pt="' + i + '" aria-pressed="' + t.on + '" aria-label="' + esc(t.name) + '"></button></td>'
              + '<td>' + esc(t.name) + (t.timer ? ' <span class="chip blue">⏱ ' + t.timer + '</span>' : '') + '</td><td><code>' + esc(t.pattern) + '</code></td><td class="dim">“' + esc(t.say) + '”</td></tr>';
          }).join('') + '</tbody></table></div>'
          + '<p class="dim" style="font-size:12px;margin:10px 0 0">If your guild runs the server, its raid triggers arrive here too, and update while you play.</p>';
      } else if (tab === 'Overlays') {
        body.innerHTML = '<div class="scroll"><table class="tbl"><thead><tr><th>Show</th><th>Overlay</th><th>What it does</th></tr></thead><tbody>'
          + ovs.map(function (o, i) {
            return '<tr><td>' + (o[2] == null ? '<span class="chip">guild</span>' : '<button type="button" class="toggle" data-ov="' + i + '" aria-pressed="' + o[2] + '" aria-label="' + esc(o[0]) + '"></button>') + '</td>'
              + '<td>' + esc(o[0]) + '</td><td class="dim">' + esc(o[1]) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      } else {
        body.innerHTML = '<dl class="kv"><dt>Mode</dt><dd><span class="purple">Local only.</span> Nothing about your play leaves this PC.</dd>'
          + '<dt>Log</dt><dd><code>C:\\EverQuest\\Logs\\eqlog_' + esc(you) + '_pq.proj.txt</code></dd>'
          + '<dt>Zeal</dt><dd>Connected: your target, HP and buffs come straight from the game.</dd>'
          + '<dt>Voice</dt><dd>On, Windows voice “Zira”, volume 80%</dd>'
          + '<dt>Hide all</dt><dd><code>Ctrl+Shift+H</code></dd>'
          + '<dt>Updates</dt><dd>Mimic 2.7.7 · checks once a day</dd></dl>';
      }
    }
    host.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.tab) show(b.dataset.tab);
      if (b.dataset.pt != null) { var t = personal[+b.dataset.pt]; t.on = !t.on; b.setAttribute('aria-pressed', String(t.on)); }
      if (b.dataset.ov != null) { var o = ovs[+b.dataset.ov]; o[2] = !o[2]; b.setAttribute('aria-pressed', String(o[2])); }
    });
    show('Fights');
  };

  // ── Your guild's site: the raid night, its parses ─────────────────────────────────────────────
  P.night = function (host, onPick) {
    var dmg = D.fights.reduce(function (s, f) { return s + f.total; }, 0);
    var names = {}; D.fights.forEach(function (f) { f.players.forEach(function (p) { names[p.name] = 1; }); });
    var first = D.fights[0], last = D.fights[D.fights.length - 1];
    var mvp = {}; D.fights.forEach(function (f) { f.players.forEach(function (p) { mvp[p.name] = (mvp[p.name] || 0) + p.dmg; }); });
    var tops = Object.keys(mvp).sort(function (a, b) { return mvp[b] - mvp[a]; }).slice(0, 5);
    host.innerHTML = '<div class="stats">'
      + '<div class="stat"><b>' + D.fights.length + '</b><span>bosses killed</span></div>'
      + '<div class="stat"><b>' + Object.keys(names).length + '</b><span>raiders</span></div>'
      + '<div class="stat"><b>' + kfmt(dmg) + '</b><span>damage to bosses</span></div>'
      + '<div class="stat"><b>' + clock(first.at).replace(/ [AP]M$/, '') + '–' + clock(new Date(Date.parse(last.at) + last.dur * 1000).toISOString()) + '</b><span>' + esc(day(first.at)) + ', Eastern</span></div></div>'
      + '<div class="scroll"><table class="tbl"><thead><tr><th>Boss</th><th>Killed</th><th class="num">Length</th><th class="num">Raiders</th><th class="num">Raid DPS</th><th>Top damage</th></tr></thead><tbody>'
      + D.fights.map(function (f) {
        return '<tr class="click" data-fight="' + f.id + '" tabindex="0"><td>' + esc(f.boss) + '</td><td class="dim nw">' + clock(new Date(Date.parse(f.at) + f.dur * 1000).toISOString()) + '</td>'
          + '<td class="num">' + mmss(f.dur) + '</td><td class="num">' + f.players.length + '</td><td class="num gold">' + fmt(f.raidDps) + '</td>'
          + '<td>' + esc(f.players[0].name) + ' ' + cls(f.players[0].cls) + '</td></tr>';
      }).join('') + '</tbody></table></div>'
      + '<p class="dim" style="font-size:12px;margin:10px 0 4px">Most damage across the night</p>'
      + tops.map(function (n, i) { return '<span class="chip' + (i === 0 ? ' gold' : '') + '">' + (i + 1) + '. ' + esc(n) + ' · ' + kfmt(mvp[n]) + '</span>'; }).join('');
    host.addEventListener('click', function (e) { var r = e.target.closest('[data-fight]'); if (r && onPick) onPick(r.dataset.fight); });
    host.addEventListener('keydown', function (e) { var r = e.target.closest('[data-fight]'); if (r && e.key === 'Enter' && onPick) onPick(r.dataset.fight); });
  };

  P.parse = function (host, id) {
    var f = fight(id);
    var max = f.players[0].dmg;
    host.innerHTML = '<dl class="kv" style="margin-bottom:10px"><dt>Boss</dt><dd>' + esc(f.boss) + ' <span class="dim">lvl ' + f.level + ' · ' + kfmt(f.hp) + ' HP</span></dd>'
      + '<dt>Fight</dt><dd>' + esc(day(f.at)) + ', ' + clock(f.at) + ' · ' + mmss(f.dur) + ' · ' + f.players.length + ' raiders · raid ' + fmt(f.raidDps) + ' DPS</dd>'
      + '<dt>Merged</dt><dd class="dim">from every raider\'s log that saw it: each sees part of the fight, the site keeps the best of each</dd></dl>'
      + '<div class="scroll"><table class="tbl"><thead><tr><th>#</th><th>Raider</th><th class="num">Damage</th><th class="num">DPS</th><th style="min-width:90px">Share</th></tr></thead><tbody>'
      + f.players.map(function (p, i) {
        return '<tr' + (p.name === you ? ' class="you"' : '') + '><td class="faint">' + (i + 1) + '</td><td>' + esc(p.name) + ' ' + cls(p.cls)
          + (p.pet ? ' <span class="chip">+pet</span>' : '') + '</td><td class="num">' + fmt(p.dmg) + '</td><td class="num gold">' + fmt(p.dps) + '</td>'
          + '<td><div class="share"><i style="width:' + (100 * p.dmg / max).toFixed(1) + '%"></i></div></td></tr>';
      }).join('') + '</tbody></table></div>';
  };
  P.fightOptions = function (sel) {
    return D.fights.map(function (f) { return '<option value="' + f.id + '"' + (f.id === sel ? ' selected' : '') + '>' + esc(f.boss) + '</option>'; }).join('');
  };

  // ── Officer pages ─────────────────────────────────────────────────────────────────────────────
  // The guild's triggers: real game text from a live set, plus the stock ones every guild starts with.
  var GUILD_TRIGGERS = [
    { name: 'Rampage', cat: 'callout', pattern: '^\\[.+?\\]\\s+{s} goes on a RAMPAGE!$', say: 'Rampage', on: true, stock: true },
    { name: 'Enrage', cat: 'callout', pattern: '^\\[.+?\\]\\s+{s} has become ENRAGED\\.$', say: 'Enraged, back off', on: true, stock: true },
    { name: 'Slow landed', cat: 'timer', pattern: '^\\[.+?\\]\\s+{s} yawns\\.$', say: 'Slowed', timer: 180, on: true, stock: true },
    { name: 'Blind Rage recast — Rallos Zek', cat: 'mechanic', pattern: '^\\[.+?\\]\\s+(?:[\\w \'`-]+ has been consumed in a blind rage\\.|A blind rage consumes you\\.)$', timer: 192, on: true },
    { name: 'Dark Aura on you — Quarm', cat: 'callout', pattern: '^\\[.+?\\]\\s+A dark aura surrounds you\\.$', say: 'Dark Aura (Curse)', on: true },
    { name: 'Glacier Breath recast — Quarm', cat: 'mechanic', pattern: '^\\[.+?\\]\\s+(?:[\\w \'`-]+ is surrounded in thick black ice\\.|Thick, black ice forms around your body\\.)$', timer: 60, on: true },
    { name: 'Plane of Time: Phase 2 wall', cat: 'mechanic', pattern: '^\\[.+?\\]\\s+Ethereal mists gather at the far wall, causing it fade in and out of focus\\.$', say: 'Phase 2 wall opening', on: true },
    { name: 'Black Plague on you — Bertoxxulous', cat: 'callout', pattern: '^\\[.+?\\]\\s+A black plague assaults your body\\.$', say: 'Black Plague (Disease)', on: true },
    { name: 'Call of the Faceless recast — Cazic Thule', cat: 'mechanic', pattern: '^\\[.+?\\]\\s+(?:[\\w \'`-]+ has been frozen in fear\\.|Fear freezes your muscles\\.)$', timer: 88, on: false },
    { name: 'Ring of Fire: ring reset', cat: 'mechanic', pattern: 'The sacred ring of fire has been cleansed of trespassers\\.', say: 'Ring reset: the boss despawned', on: true },
  ];
  P.triggersAdmin = function (host) {
    var list = GUILD_TRIGGERS.map(function (t) { return Object.assign({}, t); });
    function render() {
      host.innerHTML = '<p class="sub">Raid callouts for the whole guild. A change here reaches every raider\'s Mimic within about two minutes, mid-raid included.</p>'
        + '<div class="scroll"><table class="tbl"><thead><tr><th>On</th><th>Trigger</th><th>Kind</th><th>Pattern</th><th>Does</th></tr></thead><tbody>'
        + list.map(function (t, i) {
          return '<tr><td><button type="button" class="toggle" data-gt="' + i + '" aria-pressed="' + t.on + '" aria-label="' + esc(t.name) + '"></button></td>'
            + '<td>' + esc(t.name) + (t.stock ? ' <span class="chip">stock</span>' : '') + '</td>'
            + '<td><span class="chip ' + (t.cat === 'callout' ? 'red' : t.cat === 'timer' ? 'blue' : 'orange') + '">' + t.cat + '</span></td>'
            + '<td><code>' + esc(t.pattern) + '</code></td>'
            + '<td class="dim">' + (t.say ? '“' + esc(t.say) + '”' : '') + (t.timer ? (t.say ? ' · ' : '') + '⏱ ' + mmss(t.timer) : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    host.addEventListener('click', function (e) { var b = e.target.closest('[data-gt]'); if (!b) return; var t = list[+b.dataset.gt]; t.on = !t.on; b.setAttribute('aria-pressed', String(t.on)); });
    render();
  };

  P.attendance = function (host) {
    var nights = D.attendance.nights;
    var rows = D.roster.map(function (r) {
      var p = D.attendance.present[r.name] || [];
      var n = p.filter(Boolean).length;
      return { r: r, p: p, ra: Math.round(100 * n / nights.length) };
    }).sort(function (a, b) { return b.ra - a.ra || a.r.name.localeCompare(b.r.name); });
    host.innerHTML = '<p class="sub">Raid attendance over the last ' + nights.length + ' raid nights, from who was in the fights. RA% is what loot and rank go by.</p>'
      + '<div class="scroll"><table class="tbl"><thead><tr><th>Raider</th>' + nights.map(function (n) { return '<th class="num">' + esc(day(n).replace(/^\w+, /, '')) + '</th>'; }).join('')
      + '<th class="num">RA</th></tr></thead><tbody>'
      + rows.map(function (x) {
        return '<tr><td>' + esc(x.r.name) + ' ' + cls(x.r.cls) + '</td>' + x.p.map(function (v) { return '<td class="num">' + (v ? '<span class="green">✓</span>' : '<span class="faint">·</span>') + '</td>'; }).join('')
          + '<td class="num ' + (x.ra >= 75 ? 'green' : x.ra >= 50 ? 'gold' : 'red') + '">' + x.ra + '%</td></tr>';
      }).join('') + '</tbody></table></div>';
  };

  P.loot = function (host) {
    var spent = {}; D.loot.forEach(function (l) { spent[l.winner] = (spent[l.winner] || 0) + l.dkp; });
    var standing = D.roster.map(function (r) {
      var earned = (D.attendance.present[r.name] || []).filter(Boolean).length * 10;
      return { r: r, earned: earned, spent: spent[r.name] || 0, now: earned - (spent[r.name] || 0) };
    }).sort(function (a, b) { return b.now - a.now; }).slice(0, 12);
    host.innerHTML = '<p class="sub">Tonight\'s drops and who won them. Bids are sealed: officers see them only after the auction closes.</p>'
      + '<div class="scroll"><table class="tbl"><thead><tr><th>Item</th><th>From</th><th>Won by</th><th class="num">DKP</th></tr></thead><tbody>'
      + D.loot.map(function (l) {
        return '<tr><td class="blue">' + esc(l.item) + '</td><td class="dim">' + esc(l.boss) + '</td><td>' + esc(l.winner) + ' ' + cls(l.cls) + '</td>'
          + '<td class="num gold">' + (l.dkp || '<span class="faint">rot</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>'
      + '<p class="dim" style="font-size:12px;margin:14px 0 4px">Standings (10 per raid night)</p>'
      + '<div class="scroll"><table class="tbl"><thead><tr><th>Raider</th><th class="num">Earned</th><th class="num">Spent</th><th class="num">Now</th></tr></thead><tbody>'
      + standing.map(function (s) { return '<tr><td>' + esc(s.r.name) + ' ' + cls(s.r.cls) + '</td><td class="num">' + s.earned + '</td><td class="num">' + s.spent + '</td><td class="num gold">' + s.now + '</td></tr>'; }).join('')
      + '</tbody></table></div>';
  };

  P.members = function (host) {
    var latest = '2.7.6', n = { latest: 0, old: 0, beta: 0, none: 0 };
    D.roster.forEach(function (r) { if (!r.mimic) n.none++; else if (/beta/.test(r.mimic)) n.beta++; else if (r.mimic === latest) n.latest++; else n.old++; });
    host.innerHTML = '<div class="stats"><div class="stat"><b class="green">' + n.latest + '</b><span>on the latest Mimic</span></div>'
      + '<div class="stat"><b class="purple">' + n.beta + '</b><span>on the beta</span></div>'
      + '<div class="stat"><b class="orange">' + n.old + '</b><span>one version behind</span></div>'
      + '<div class="stat"><b class="faint">' + n.none + '</b><span>not running it</span></div></div>'
      + '<div class="scroll"><table class="tbl"><thead><tr><th>Character</th><th>Rank</th><th>Mimic</th></tr></thead><tbody>'
      + D.roster.map(function (r) {
        var m = !r.mimic ? '<span class="faint">—</span>' : /beta/.test(r.mimic) ? '<span class="chip purple">' + r.mimic + '</span>'
          : r.mimic === latest ? '<span class="chip green">' + r.mimic + '</span>' : '<span class="chip orange">' + r.mimic + ' · update</span>';
        return '<tr><td>' + esc(r.name) + ' ' + cls(r.cls) + '</td><td>' + (r.rank === 'Officer' ? '<span class="gold">Officer</span>' : esc(r.rank)) + '</td><td>' + m + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  };

  var FEEDBACK = [
    { ref: 61, kind: 'Bug', title: 'Damage meter counts a pet twice after its owner zones', who: 'Thalwen', status: 'On beta', votes: 4 },
    { ref: 58, kind: 'Idea', title: 'Let the trigger overlay live on my second monitor', who: 'Corlan', status: 'Implemented', votes: 9 },
    { ref: 57, kind: 'Idea', title: 'Show who in tonight\'s raid is locked out of the next boss', who: 'Ithys', status: 'Planned', votes: 7 },
    { ref: 55, kind: 'Bug', title: 'Charm timer keeps counting after the pet dies', who: 'Yrlith', status: 'Implemented', votes: 3 },
    { ref: 52, kind: 'Idea', title: 'Collapse the flag checklist by tier', who: 'Galwen', status: 'On beta', votes: 5 },
    { ref: 49, kind: 'Bug', title: 'Spoken callout cuts off the one before it', who: 'Ornar', status: 'New', votes: 2 },
  ];
  P.feedback = function (host) {
    var tone = { New: '', Planned: 'blue', 'On beta': 'purple', Implemented: 'green' };
    host.innerHTML = '<p class="sub">Bugs and ideas from the raid, each with a number. When a fix ships, the report moves on its own and its author gets a message.</p>'
      + '<div class="scroll"><table class="tbl"><thead><tr><th>#</th><th>Report</th><th>From</th><th class="num">+1</th><th>Status</th></tr></thead><tbody>'
      + FEEDBACK.map(function (f) {
        return '<tr><td class="faint">FB-' + f.ref + '</td><td><span class="chip ' + (f.kind === 'Bug' ? 'red' : 'blue') + '">' + f.kind + '</span> ' + esc(f.title) + '</td>'
          + '<td class="dim">' + esc(f.who) + '</td><td class="num">' + f.votes + '</td><td><span class="chip ' + tone[f.status] + '">' + f.status + '</span></td></tr>';
      }).join('') + '</tbody></table></div>';
  };
})();
