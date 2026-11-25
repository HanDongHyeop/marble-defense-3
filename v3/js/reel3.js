// 마블 디펜스 3 — 미니 릴 소환(2026-11-25 사용자 스펙)
//   소환 단추 오른쪽 위 [릴] 단추를 켜고 소환을 누르면 → 단추 안 3칸 릴이 돌고 멈춘 모양대로 결과.
//   · 다 다름 40% = 꽝(소환 안 됨 · 금화는 씀) · 2개 같음 40% = 그 계열 일반 · 3개 같음 20% = 그 계열 영웅(3단계)
//   · 값 = 지금 소환 값 × 1.3 · 한 번 쓰면 20초(판 시간) 뒤 다시 쓸 수 있음 · 쓰면 저절로 꺼짐
//   · 금화가 모자라면 켜지지 않음(켜 둔 뒤 모자라지면 저절로 꺼짐) · 다시 쓸 수 있게 되면 [릴]이 톡 튀어 알림
//   · 첫 보스를 잡기 전에는 자물쇠로 잠김(누르면 '보스 1을 잡으세요'가 [미니릴] 위에 잠깐) · [미니릴] = 작은 슬롯머신(7 7 7 · 레버) · 기다리는 동안 밝은 몸통 위로 어둠이 걷히고 가운데 남은 초
//   · [v3.10] AUTO(자동 소환) 단추는 없앰
//   시험: 주소에 ?reelcd=5 = 다시 쓰기 5초 · ?reelp=0,0,1 = 결과 확률(꽝,2개,3개)
(function (root) {
  const U = root.UI && root.UI.prototype, D = root.DATA; if (!U || !D) return;
  const $ = id => document.getElementById(id);
  const fmt = n => Math.floor(n).toLocaleString('ko-KR');
  const q = new URLSearchParams(location.search);
  const R = {
    CD: +q.get('reelcd') || 20,                                   // 다시 쓰기(판 시간 초)
    MUL: 1.3,                                                     // 값 배율
    P: (q.get('reelp') || '0.4,0.4,0.2').split(',').map(Number),  // 꽝 · 2개 · 3개
    STOP: [0.5, 0.78, 1.06],                                      // 칸마다 멈추는 때(실제 초) — 앞 두 칸이 같으면 셋째 칸은 더 늦게(두근)
    TEASE: 0.45,
  };
  root.REEL3 = R;
  const FAMK = { fire: 'fire', gatling: 'mech', bolt: 'storm', ice: 'frost', light: 'knight', corrode: 'demon', combo: 'mage' };
  const SYM = { fire: 1, mech: 1, storm: 1, frost: 1, knight: 1 };   // v3/img/sym 에 있는 계열(없으면 1등급 그림)
  const icon = k => { const f = FAMK[k] || 'fire'; return SYM[f] ? `v3/img/sym/${f}.png` : `v3/img/px/ally2/${f}_1.png`; };
  const FAMN = { fire: '불', gatling: '기계', bolt: '폭풍', ice: '서리', light: '기사', corrode: '악마', combo: '마법사' };
  const nameOf = k => FAMN[k] || k;

  const st = { g: null, on: false, readyAt: 0, spin: false, usable: false, born: 0, open: false };
  const LOCK = q.get('reellock') !== '0';   // 시험: ?reellock=0 = 처음부터 열림
  const cost = g => Math.ceil(g.rollCost * R.MUL);
  const empties = g => g.tiles.filter(t => !t.tower && !t.blocked);
  const sfx = ui => ui.sfx ? ui.sfx() : null;
  const hap = n => { if (root.HAPTIC) root.HAPTIC.play(n); };
  const snd = (ui, name, v, r) => { const s = sfx(ui); if (s && s.file) s.file(name, v, r); };

  // ---------------------------------------------------------------- 단추 안 부품 만들기
  function mount() {
    const rb = $('rollBtn'); if (!rb || $('reelBtn')) return;
    const chip = document.createElement('span');
    chip.id = 'reelBtn'; chip.setAttribute('role', 'switch'); chip.setAttribute('aria-checked', 'false'); chip.setAttribute('aria-label', '미니 릴');
    chip.innerHTML = '<span class="mc"><span class="ri"><i>7</i><i>7</i><i>7</i></span><i class="cdw"></i><em class="sec"></em><i class="lock"></i></span><span class="lever"><i></i></span><b class="lb">미니릴</b><i class="spark"></i><span class="tip">보스 1을 잡으세요</span>';
    rb.appendChild(chip);
    const face = document.createElement('div'); face.id = 'reelFace';
    face.innerHTML = '<div class="wins">' + [0, 1, 2].map(n => `<div class="win" data-n="${n}"><img alt=""></div>`).join('') + '</div><div class="rcost"><span class="coin"></span><b id="reelCost">0</b><small>릴</small></div>';
    rb.appendChild(face);
    const fx = document.createElement('div'); fx.id = 'reelFx'; rb.appendChild(fx);
    chip.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); toggle(root.App && root.App.ui); });
    chip.addEventListener('pointerup', e => e.stopPropagation());
  }

  function toggle(ui) {
    const g = ui && ui.g; if (!g || g.over || st.spin) return;
    const s = sfx(ui); if (s && s.init) s.init();
    if (st.on) { st.on = false; s && s.click && s.click(); hap('tap'); paint(ui, true); return; }
    const chip = $('reelBtn');
    if (!st.open) { shake(chip); hap('deny'); s && s.error && s.error(); const tip = chip.querySelector('.tip'); tip.classList.remove('show'); void tip.offsetWidth; tip.classList.add('show'); return; }
    if (g.t < st.readyAt) { shake(chip); s && s.error && s.error(); hap('deny'); return; }
    if (g.gold < cost(g)) { shake(chip); s && s.error && s.error(); hap('deny'); ui.toast && ui.toast('미니 릴', '금화가 모자라요', `${fmt(cost(g))} 필요`, true, 1.1); return; }
    st.on = true; snd(ui, 'card', 0.45, 1.2); hap('select'); paint(ui, true);
    const f = $('reelFace'); if (f) { f.classList.remove('arm'); void f.offsetWidth; f.classList.add('arm'); }
  }
  function shake(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

  // ---------------------------------------------------------------- 상태 그리기(매 프레임)
  function paint(ui, force) {
    const g = ui && ui.g, chip = $('reelBtn'), rb = $('rollBtn'); if (!chip || !rb) return;
    if (!g) return;
    if (st.g !== g) { st.g = g; st.on = false; st.readyAt = 0; st.spin = false; st.usable = false; st.born = performance.now(); st.open = !LOCK; clearFx(); watchBoss(ui, g); }
    const c = cost(g), cdLeft = Math.max(0, st.readyAt - g.t), poor = g.gold < c;
    if (st.on && poor && !st.spin) { st.on = false; shake(chip); }
    const usable = st.open && !st.spin && cdLeft <= 0 && !poor && !g.over;
    // 다시 쓸 수 있게 된 순간 = 톡 튀는 알림(판 시작 직후 1초는 조용히)
    if (usable && !st.usable && performance.now() - st.born > 1000) { chip.classList.remove('wake'); void chip.offsetWidth; chip.classList.add('wake'); hap('tap'); snd(ui, 'coin', 0.18, 1.35); }
    st.usable = usable;
    chip.classList.toggle('on', st.on);
    chip.classList.toggle('ready', usable && !st.on);
    chip.classList.toggle('locked', !st.open);
    chip.classList.toggle('cd', st.open && cdLeft > 0);
    chip.classList.toggle('poor', st.open && cdLeft <= 0 && poor && !st.on);
    chip.setAttribute('aria-checked', st.on ? 'true' : 'false');
    chip.style.setProperty('--p', (cdLeft > 0 ? cdLeft / R.CD * 100 : 0) + '%');
    chip.querySelector('.lb').textContent = st.on ? '켜짐' : '미니릴';
    chip.querySelector('.sec').textContent = st.open && cdLeft > 0 ? Math.ceil(cdLeft) : '';
    rb.classList.toggle('reel-on', st.on || st.spin);
    rb.classList.toggle('reel-spin', st.spin);
    const rc = $('reelCost'); if (rc && !st.spin) rc.textContent = fmt(c);
    if (st.on && !st.spin && (force || !rb._idle)) { rb._idle = 1; idleIcons(g); }
    if (!st.on) rb._idle = 0;
  }
  function idleIcons(g) {
    const deck = g.deck || D.DECK;
    document.querySelectorAll('#reelFace .win').forEach((w, n) => { w.className = 'win'; w.querySelector('img').src = icon(deck[(n * 2) % deck.length]); });
  }

  // ---------------------------------------------------------------- 결과 정하기
  function decide(g) {
    const deck = (g.deck || D.DECK).filter(k => D.TOWERS[k]);
    const x = Math.random(), [p0, p1] = R.P, sum = R.P.reduce((a, b) => a + b, 0);
    const kind = x * sum < p0 ? 0 : x * sum < p0 + p1 ? 2 : 3;
    const a = g.buildPick();
    const others = deck.filter(k => k !== a);
    const pick = arr => arr.splice(Math.floor(Math.random() * arr.length), 1)[0];
    let sym;
    if (kind === 3) sym = [a, a, a];
    else if (kind === 2) { const b = pick(others.slice()); const odd = Math.floor(Math.random() * 3); sym = [a, a, a]; sym[odd] = b; }
    else { const o = others.slice(); sym = [a, pick(o), pick(o)]; for (let i = 2; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [sym[i], sym[j]] = [sym[j], sym[i]]; } }
    return { kind, type: a, sym };
  }

  // ---------------------------------------------------------------- 돌리기
  function go(ui) {
    const g = ui.g; if (!g || g.over || g.cardPick || st.spin) return true;
    if (ui.inputLocked && ui.inputLocked()) return true;
    if (!empties(g).length) { g.emit('full', {}); sfx(ui) && sfx(ui).error && sfx(ui).error(); ui.toast && ui.toast('소환', '빈 자리가 없어요', '', true, 1); return true; }
    const c = cost(g);
    if (g.gold < c) { st.on = false; paint(ui, true); g.emit('nogold'); return true; }
    g.gold -= c; g.emit('spend', { amt: c, why: 'roll' });
    st.on = false; st.spin = true; st.readyAt = g.t + R.CD;
    const res = decide(g);
    paint(ui, true);
    const wins = [...document.querySelectorAll('#reelFace .win')], deck = (g.deck || D.DECK);
    clearFx();
    wins.forEach(w => { w.className = 'win spin'; });
    snd(ui, 'dice', 0.5, 1.15); hap('tap');
    const t0 = performance.now();
    const tease = res.sym[0] === res.sym[1];
    const stops = [R.STOP[0], R.STOP[1], R.STOP[2] + (tease ? R.TEASE : 0)];
    const landed = [false, false, false];
    let k = 0;
    const tick = () => {
      const el = (performance.now() - t0) / 1000;
      k++;
      wins.forEach((w, n) => {
        if (landed[n]) return;
        if (el >= stops[n]) {
          landed[n] = true; w.querySelector('img').src = icon(res.sym[n]);
          w.className = 'win land'; snd(ui, 'card', 0.28, 0.9 + n * 0.12); hap('select');
          if (n === 1 && tease) wins[2].classList.add('tease');
          return;
        }
        if (k % 2 === n % 2) w.querySelector('img').src = icon(deck[Math.floor(Math.random() * deck.length)]);
      });
      if (landed.every(Boolean)) { setTimeout(() => resolve(ui, g, res, c), 160); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return true;
  }

  function resolve(ui, g, res, c) {
    const wins = [...document.querySelectorAll('#reelFace .win')], fx = $('reelFx');
    const done = ms => setTimeout(() => { st.spin = false; wins.forEach(w => { w.className = 'win'; }); paint(ui, true); }, ms);
    if (st.g !== g || g.over) { st.spin = false; return; }
    if (res.kind === 0) {   // 꽝: 펑
      wins.forEach(w => w.classList.add('miss'));
      fx.innerHTML = '<div class="puff">' + Array.from({ length: 8 }, (_, i) => `<i style="--a:${i * 45}deg;--d:${i % 2 ? 46 : 62}px"></i>`).join('') + '<b>꽝!</b></div>';
      snd(ui, 'thud', 0.55, 1.1); hap('deny');
      done(950); return;
    }
    const e = empties(g); if (!e.length) { done(300); return; }   // (도는 동안 다른 소환이 막혀 있어 생기지 않음 — 혹시 모를 오류 방지만)
    const tier = res.kind === 3 ? 3 : 1;
    const t = g.pickOne(e);
    g.rollCost += (root.DATA.ECON && root.DATA.ECON.rollStep) || 2;
    g.rolls++; g.stats.rolls++; g.lastRollT = g.t;
    g.build(t.i, res.type, tier); g.emit('summon', { i: t.i });
    if (res.kind === 2) {
      wins.forEach((w, n) => { if (res.sym[n] === res.type) w.classList.add('hit2'); else w.classList.add('dim'); });
      fx.innerHTML = '<div class="pair"><b>2개!</b></div>';
      snd(ui, 'coin', 0.3, 1.1);
      done(700);
    } else {
      wins.forEach(w => w.classList.add('hit3'));
      const conf = Array.from({ length: 18 }, (_, i) => `<i style="--x:${Math.round(Math.cos(i / 18 * 6.283) * (120 + (i % 3) * 50))}px;--y:${Math.round(-60 - Math.abs(Math.sin(i / 18 * 6.283)) * (90 + (i % 4) * 30))}px;--r:${i * 47}deg;--c:${['#ffd23a', '#ff6a8a', '#6fd8ff', '#8ff28a', '#c08cff'][i % 5]}"></i>`).join('');
      fx.innerHTML = `<div class="rays"></div><div class="conf">${conf}</div><div class="lucky"><b>LUCKY!</b><small>${nameOf(res.type)} 영웅 소환</small></div>`;
      const stg = $('stage'); if (stg) { const fl = document.createElement('div'); fl.className = 'reelFlash'; stg.appendChild(fl); setTimeout(() => fl.remove(), 600); }
      snd(ui, 'jackpot', 0.75); setTimeout(() => snd(ui, 'tierup', 0.5), 220); hap('slam');
      done(1500);
    }
  }
  // 첫 보스 처치 = 미니릴 열림(열리는 순간 자물쇠가 깨지며 톡 튐)
  function watchBoss(ui, g) {
    if (st.open || g._reelW) return; g._reelW = 1;
    const base = g.emit;
    g.emit = function (ev, d) {
      const r = base.apply(this, arguments);
      if (ev === 'bossDown' && !st.open && st.g === g) {
        st.open = true; st.usable = false; st.born = 0;
        const chip = $('reelBtn'); if (chip) { chip.classList.remove('unlock'); void chip.offsetWidth; chip.classList.add('unlock'); }
        setTimeout(() => ui.toast && ui.toast('미니릴', '열렸어요!', '켜고 소환하면 릴이 돌아요', false, 1.6), 1200);
      }
      return r;
    };
  }
  function clearFx() { const fx = $('reelFx'); if (fx) fx.innerHTML = ''; }

  // ---------------------------------------------------------------- 소환 단추에 끼우기
  const baseRoll = U.doRoll;
  U.doRoll = function (auto, aim) {
    if (st.spin) { const s = sfx(this); s && s.error && s.error(); return; }   // 도는 동안 다른 소환 막음
    if (st.on && this.g && !(this.app.net && this.app.net.ls)) { go(this); return; }
    return baseRoll.call(this, auto, aim);
  };
  // [v3.10] AUTO 단추 없앰 — 켜진 채 남지 않게 늘 끔
  const baseUpd = U.update;
  U.update = function () { this.auto = false; const r = baseUpd.apply(this, arguments); try { mount(); paint(this); } catch (e) { /* 그리기 실패는 판을 멈추지 않음 */ } return r; };
  const baseReset = U.reset;
  if (baseReset) U.reset = function () { st.g = null; st.on = false; st.spin = false; clearFx(); return baseReset.apply(this, arguments); };
})(window);
