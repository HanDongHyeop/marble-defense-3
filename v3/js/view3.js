// 마블 디펜스 3 판 그리기 — 본편 render*.js(쿼터뷰 · 픽셀풍 15겹)를 쓰지 않고 새로 그린다(2026-11-18).
// 톤: 랜덤다이스2처럼 매끈한 캐주얼(둥근 덩어리 · 부드러운 그라데이션 · 굵은 남색 윤곽). 픽셀 격자 없음.
// 레이어(아래 → 위): 바탕 그림 → 돌 블록 길 → 굴 · 수정 → 판 받침 · 칸 · 구멍 → 몬스터(그림자 · 몸 · 체력) → 아군(발밑 단계 빛 · 몸 · 단계 별)
//   → 탄 → 효과(터짐 · 링 · 조각) → 피해 숫자 → 알림 글씨.  위 캔버스(top)는 비워 둠(DOM HUD가 위에 있음).
// 그림 파일: v3/img/ally/<계열>_<단계>.png · v3/img/mon/<컨셉>_<종류>_<강화>.png · <컨셉>_boss.png · v3/img/map/bg_<컨셉>.jpg · v3/img/obj/*.png
(function (root) {
  const G = root.GEOM, D = root.DATA;
  const TAU = Math.PI * 2;
  const ART = { fire: 'sword', gatling: 'archer', bolt: 'mage', ice: 'frost', light: 'priest' };
  const ART_FALLBACK = { tyrant: 'sword', poison: 'frost', railgun: 'archer', mining: 'archer', summon: 'mage', combo: 'mage', beacon: 'priest', growth: 'priest', corrode: 'frost', greed: 'sword', prism: 'priest' };
  const artOf = type => ART[type] || ART_FALLBACK[type] || 'sword';
  // [v3.1] 운빨존많겜풍 2차 그림(5등급): v3/img/ally2/<계열>_<등급 1~5>.png — 없으면 1차 그림(6단계)으로
  const FAM2 = { fire: 'fire', gatling: 'mech', bolt: 'storm', ice: 'frost', light: 'knight' };
  const GRADE = { 1: 1, 2: 2, 3: 3, 4: 3, 5: 4, 6: 5 };
  const FH = () => (G.CFG.FIELD_H || 900);
  const COL = { sword: '#ff7a3a', archer: '#5fd35a', mage: '#b07cff', frost: '#6fd8ff', priest: '#ffd65a' };
  const TIER_COL = ['', '#c9c4bd', '#7fe07a', '#5fb2ff', '#c08cff', '#ffa53a', '#ffd23a'];
  // 장 → 컨셉(몬스터 · 길 · 판 색). 4~6장은 시안 확정 전이라 1~3장 몬스터를 빌려 씀
  const CONCEPT = { 1: 'meadow', 2: 'snow', 3: 'volcano', 4: 'meadow', 5: 'snow', 6: 'volcano' };
  const BG = { 1: 'meadow', 2: 'snow', 3: 'volcano', 4: 'factory', 5: 'temple', 6: 'abyss' };
  const PAL = {
    meadow:  { ground: ['#7cc46a', '#5aa452'], stone: ['#e2dccd', '#bdb3a2', '#8d8272'], slab: ['#7a9c62', '#5f804a'], cell: ['#dcefc0', '#bddc9c'], cellEdge: '#6f9656', hole: '#3b5a2c' },
    snow:    { ground: ['#dff2ff', '#b9dcf5'], stone: ['#e9f7ff', '#b4dcf5', '#7fb3d9'], slab: ['#8fb8d8', '#6f97ba'], cell: ['#f4fbff', '#cfe8fa'], cellEdge: '#6a92b6', hole: '#40607e' },
    volcano: { ground: ['#5a3a3a', '#3f2730'], stone: ['#7a7078', '#585060', '#2f2833'], slab: ['#4a3238', '#36242a'], cell: ['#a8968e', '#8a7670'], cellEdge: '#4a3434', hole: '#1a0f14', lava: '#ff7a2a' },
    factory: { ground: ['#8f9aa6', '#6f7a86'], stone: ['#c9ced6', '#9aa3ae', '#6c7682'], slab: ['#5b6672', '#47515c'], cell: ['#d7dde5', '#aeb8c4'], cellEdge: '#3f4954', hole: '#2a3038' },
    temple:  { ground: ['#e9d9a8', '#cdb782'], stone: ['#fff1c9', '#e0c98f', '#b39a62'], slab: ['#b89c62', '#94794a'], cell: ['#fff6da', '#ecd9a6'], cellEdge: '#8e7342', hole: '#5e4a2a' },
    abyss:   { ground: ['#2c2448', '#1b1530'], stone: ['#5d5480', '#433b62', '#2a2442'], slab: ['#2a2244', '#1d1733'], cell: ['#4e4474', '#3a3159'], cellEdge: '#16112a', hole: '#0b0816' },
  };
  const OUT = '#1d1b3a';   // 윤곽 남색(그림 시안과 같은 색)

  // 결정적 난수(길 돌 크기 흔들림 — 매 프레임 같은 모양)
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  class Renderer {
    constructor(ctx, top, img) {
      this.ctx = ctx; this.topCtx = top; this.img = img || {};
      this.time = 0; this.fx = []; this.parts = []; this.texts = []; this.coins = []; this.towerAnim = {}; this.dice = null;
      this.sel = null; this.selT = 0; this.drag = null; this.showDmg = true; this.goldPending = 0; this.goldBump = 0; this.lastLand = -9; this.diceShow = null;
      this.boardKey = 'board'; this.shake = 0; this.flash = 0; this.banners = [];
      this.pos = {};      // 아군 그려지는 자리(밀기 미끄럼): id → { x, y }
      this.pop = {};      // id → 합체 · 소환 튀어나옴 시작 시각
      this.ghosts = [];   // 합쳐지며 사라지는 아군(밀려 들어가 겹친 뒤 사라짐)
      this.art = {};
      this.ART = ART; this.artOf = artOf;
    }
    // ---------------------------------------------------------------- 그림 불러오기(없으면 null → 도형으로 대신)
    pic(key, path) {
      let a = this.art[key];
      if (!a) { a = this.art[key] = new Image(); a.onerror = () => { a.bad = true; }; a.src = path; }
      return a.complete && a.naturalWidth && !a.bad ? a : null;
    }
    allyPic(type, tier) {
      const f = FAM2[type], g = GRADE[tier] || tier;
      if (f) { const a = this.pic('a2_' + f + g, 'v3/img/ally2/' + f + '_' + g + '.png'); if (a) return a; }
      const k = artOf(type); return this.pic('a_' + k + tier, 'v3/img/ally/' + k + '_' + tier + '.png');
    }
    monPic(cpt, kind, lv) { return this.pic('m_' + cpt + kind + lv, 'v3/img/mon/' + cpt + '_' + kind + '_' + lv + '.png'); }
    bossPic(cpt) { return this.pic('b_' + cpt, 'v3/img/mon/' + cpt + '_boss.png'); }
    bgPic(name) { return this.pic('bg_' + name, 'v3/img/map/bg_' + name + '.jpg'); }
    objPic(name) { return this.pic('o_' + name, 'v3/img/obj/' + name + '.png'); }
    preload() {
      for (const f of Object.values(FAM2)) for (let g = 1; g <= 5; g++) this.pic('a2_' + f + g, 'v3/img/ally2/' + f + '_' + g + '.png');   // 기사 2차 그림은 아직(나오면 이 조건 지움)
      for (const c of ['meadow', 'snow', 'volcano']) { for (const kd of ['normal', 'fast', 'giant']) for (let l = 1; l <= 3; l++) this.monPic(c, kd, l); this.bossPic(c); }
      for (const b of Object.values(BG)) this.bgPic(b);
      for (const o of ['crystal', 'den', 'cart']) this.objPic(o);
    }

    cardBusy() { return false; }
    concept(g) { return CONCEPT[(g && g.chapter) || 1] || 'meadow'; }
    pal(g) { return PAL[BG[(g && g.chapter) || 1]] || PAL.meadow; }
    // 아군 그림 칸(손가락 판정 · 정보 창)
    towerRect(g, i) {
      const tw = g.tiles[i] && g.tiles[i].tower, p = this.drawPos(g, i, tw), s = this.allySize(tw ? tw.tier : 1);
      return { x: p[0] - s / 2, y: p[1] - s * 0.86, w: s, h: s, cx: p[0], cy: p[1] };
    }
    allySize(tier) { return G.CFG.cell * 1.34; }   // 그림 칸(정사각) 한 변 — 같은 계열 6단계를 같은 창으로 잘라 단계 간 크기 비율은 그림에 들어 있음
    drawPos(g, i, tw) { const h = G.tiles[i].tower; if (!tw) return [h[0], h[1] + G.CFG.cell * 0.3]; const p = this.pos[tw.id]; return p ? [p.x, p.y] : [h[0], h[1] + G.CFG.cell * 0.3]; }

    // ---------------------------------------------------------------- 사건 → 연출 · 소리
    consume(game, events, A) {
      for (const e of events) {
        switch (e.ev) {
          case 'fire': this.towerAnim[e.i] = { t: this.time, tx: e.tx, ty: e.ty }; A && A.fire && A.fire(e.type, e.tier); break;
          case 'impact': this.hitFx(e.x, e.y, e.type || (e.s && e.s.type), e.big); break;
          case 'dmg': if (this.showDmg && (e.big || e.crit || (e.maxHp && e.amt >= e.maxHp * 0.12))) this.dmgText(e); break;   // 작은 피해 숫자는 생략(겹쳐 지저분 — 치명 · 큰 피해만)
          case 'kill': this.killFx(game, e); A && A.kill && A.kill(e); break;
          case 'build': case 'summon': this.summonFx(game, e.i); if (e.ev === 'build') A && A.build && A.build(); break;
          case 'merge': this.mergeFx(game, e.i, e.tier); A && A.merge && A.merge(e.tier); break;
          case 'tierup': this.mergeFx(game, e.i, e.tier); A && A.tierup && A.tierup(); break;
          case 'slid': this.slidFx(game, e); break;
          case 'slideNo': this.nudge = { t: this.time, dir: e.dir }; break;
          case 'chain': this.chainFx(e.pts); break;
          case 'thunder': this.ring(e.x, e.y, 46, '#d9b8ff', 0.4, 6); A && A.thunder && A.thunder(); break;
          case 'boom': this.burst(e.x, e.y - 10, 30 * (e.r || 1), '#ffb35a'); A && A.boom && A.boom(); break;
          case 'react': this.say(e.name || '', '#ffffff', e.x, e.y - 20, 0.7, 20); break;
          case 'frozen': this.ring(e.x, e.y - 20, 30, '#bff0ff', 0.4, 5); break;
          case 'gold': if (e.i != null) { const p = G.tiles[e.i].tower; this.say('+' + e.amt, '#ffe066', p[0], p[1] - 40, 0.8, 24); } A && A.coin && A.coin(1); break;
          case 'salary': A && A.coin && A.coin(1); break;
          case 'boss': this.shake = Math.max(this.shake, 8); A && A.boss && A.boss(); break;
          case 'bossDown': this.shake = 12; this.banner('보스 처치!', '#ffd23a'); break;
          case 'bossSkill': this.flash = 0.2; A && A.bossSkill && A.bossSkill(); break;
          case 'round': A && A.round && A.round(); break;
          case 'nogold': A && A.error && A.error(); break;
          case 'upgrade': A && A.upgrade && A.upgrade(); break;
          case 'warn': { const p = this.drawPos(game, e.i, game.tiles[e.i].tower); this.ring(p[0], p[1] - 40, 44, '#ff4a4a', 0.5, 5); break; }
          case 'stop': { const p = this.drawPos(game, e.i, game.tiles[e.i].tower); this.ring(p[0], p[1] - 40, 40, '#c9b8ff', 0.4, 4); break; }
          case 'occupy': { const p = G.tiles[e.i].tower; this.say('점령당함!', '#ff8a8a', p[0], p[1] - 70, 0.9, 24); A && A.bad && A.bad(); break; }
          case 'reclaim': case 'rescue': { const p = G.tiles[e.i].tower; this.say(e.ev === 'rescue' ? '구조!' : '탈환!', '#8fffa0', p[0], p[1] - 70, 0.9, 24); A && A.good && A.good(); break; }
          case 'destroyed': case 'downgrade': { const p = G.tiles[e.i].tower; this.burst(p[0], p[1] - 30, 40, '#ff6a6a'); this.say(e.ev === 'destroyed' ? '파괴됨' : '−1단계', '#ff6a6a', p[0], p[1] - 70, 0.9, 24); A && A.bad && A.bad(); break; }
          case 'demolish': { const p = G.tiles[e.i].tower; this.burst(p[0], p[1] - 20, 70, '#ffb35a'); this.ring(p[0], p[1], 3.2 * G.u, '#ffcf6a', 0.5, 8); this.shake = 10; A && A.boom && A.boom(); break; }
          case 'commander': this.flash = 0.15; A && A.commander && A.commander(); break;
          case 'escape': this.say('도망갔다…', '#dddddd', e.x, e.y - 40, 1, 22); break;
          case 'truck': A && A.truck && A.truck(); break;
          case 'truckKill': this.say('대박!', '#ffe066', e.x, e.y - 50, 1, 30); A && A.jackpot && A.jackpot(); break;
          case 'cryHit': this.cryHit = this.time; this.shake = Math.max(this.shake, e.boss ? 12 : 5); { const c = this.cryPos(); for (let n = 0; n < 8; n++) this.shard(c[0], c[1] - 30); } break;
          case 'poof': this.burst(e.x, e.y - 10, 22, '#ffffff'); break;
          case 'piggy': this.banner('저금통 보너스 +' + e.gold, '#ffd23a'); A && A.jackpot && A.jackpot(); break;
          case 'legend': { const h = G.tiles[e.i].tower; for (const f of e.from || []) { const a = G.tiles[f.i].tower; this.ghosts.push({ type: f.type, tier: f.tier, x: a[0], y: a[1] + G.CFG.cell * 0.3, tx: h[0], ty: h[1] + G.CFG.cell * 0.3, t: this.time, life: 0.45 }); } this.mergeFx(game, e.i, 5); this.banner('전설 탄생!', '#ffb43a'); this.shake = 8; A && A.jackpot && A.jackpot(); break; }
          case 'mythic': this.mergeFx(game, e.i, 6); this.banner('신화 각성!', '#ff5a6a'); this.flash = 0.35; this.shake = 12; A && A.jackpot && A.jackpot(); break;
          case 'mythStone': { const c0 = this.cryPos(); this.say('신화석 +' + e.n, '#e9a8ff', 360, 300, 1.2, 30); A && A.good && A.good(); break; }
          case 'labWave': if (e.round > 1) this.waveArrows = { t: this.time, L: e.L }; break;
        }
      }
    }
    say(txt, col, x, y, life, size) { this.texts.push({ txt, col, x, y, t: this.time, life: life || 1, size: size || 26, kind: 'say' }); }
    banner(txt, col) { this.banners.push({ txt, col, t: this.time }); }
    dmgText(e) {
      const big = e.big || e.crit;
      this.texts.push({ txt: Math.round(e.amt).toLocaleString(), col: e.crit ? '#ffe14a' : big ? '#ffffff' : '#ffffff', x: e.x + (Math.random() - 0.5) * 16, y: e.y - 18, t: this.time, life: 0.7, size: e.crit ? 30 : big ? 26 : 20, kind: 'dmg', crit: e.crit });
      if (this.texts.length > 90) this.texts.splice(0, this.texts.length - 90);
    }
    ring(x, y, r, col, life, w) { this.fx.push({ k: 'ring', x, y, r, col, t: this.time, life, w: w || 4 }); }
    burst(x, y, r, col) {
      this.fx.push({ k: 'burst', x, y, r, col, t: this.time, life: 0.35 });
      for (let n = 0; n < 8; n++) { const a = n / 8 * TAU + Math.random() * 0.5, v = r * (2 + Math.random() * 2); this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - r, g: 400, t: this.time, life: 0.45, r: 4 + Math.random() * 4, col }); }
    }
    shard(x, y) { const a = Math.random() * TAU, v = 120 + Math.random() * 160; this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 140, g: 600, t: this.time, life: 0.7, r: 5 + Math.random() * 4, col: '#c8a8ff', shard: 1 }); }
    hitFx(x, y, type, big) {
      if (x == null) return;
      const col = COL[artOf(type)] || '#ffffff';
      this.fx.push({ k: 'hit', x, y, r: big ? 26 : 16, col, t: this.time, life: 0.22 });
    }
    killFx(game, e) {
      const cpt = this.concept(game);
      const col = cpt === 'snow' ? '#dff4ff' : cpt === 'volcano' ? '#ff8a3a' : '#cfc6b6';
      const n = e.big ? 14 : 7;
      for (let k = 0; k < n; k++) { const a = Math.random() * TAU, v = 80 + Math.random() * (e.big ? 260 : 150); this.parts.push({ x: e.x, y: e.y - 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, g: 700, t: this.time, life: 0.55, r: (e.big ? 7 : 5) + Math.random() * 4, col, chunk: 1 }); }
      this.fx.push({ k: 'burst', x: e.x, y: e.y - 20, r: e.big ? 44 : 24, col: '#ffffff', t: this.time, life: 0.25 });
      if (e.gold) this.coinFly(e.x, e.y - 20);
    }
    coinFly(x, y) { this.coins.push({ x, y, t: this.time }); if (this.coins.length > 30) this.coins.shift(); }
    summonFx(game, i) {
      const tw = game.tiles[i] && game.tiles[i].tower; if (!tw) return;
      const h = G.tiles[i].tower; this.pos[tw.id] = { x: h[0], y: h[1] + G.CFG.cell * 0.3 };
      this.pop[tw.id] = this.time;
      this.ring(h[0], h[1] + 10, 50, '#ffffff', 0.35, 5);
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; this.parts.push({ x: h[0], y: h[1] + 10, vx: Math.cos(a) * 140, vy: Math.sin(a) * 90 - 60, g: 200, t: this.time, life: 0.4, r: 5, col: '#fffbe0', star: 1 }); }
    }
    mergeFx(game, i, tier) {
      const tw = game.tiles[i] && game.tiles[i].tower, h = G.tiles[i].tower;
      if (tw) this.pop[tw.id] = this.time + 0.09;   // 밀려 들어오는 짝이 닿은 뒤 튐
      const col = TIER_COL[tier] || '#ffffff';
      this.fx.push({ k: 'merge', x: h[0], y: h[1] + 6, col, t: this.time + 0.09, life: 0.6, tier });
      for (let k = 0; k < 10 + tier * 2; k++) { const a = Math.random() * TAU, v = 120 + Math.random() * 160; this.parts.push({ x: h[0], y: h[1], vx: Math.cos(a) * v, vy: Math.sin(a) * v - 100, g: 300, t: this.time + 0.09, life: 0.6, r: 4 + Math.random() * 4, col, star: 1 }); }
      if (tier >= 5) this.say(tier === 6 ? '전설!' : tier + '단계!', col, h[0], h[1] - 70, 1, tier === 6 ? 36 : 30);
    }
    slidFx(game, e) {
      // 밀린 아군: 그려지는 자리(pos)는 이전 칸에 둔 채 → frame에서 새 칸으로 미끄러짐
      for (const mv of e.moves) { const a = G.tiles[mv.from].tower; if (!this.pos[mv.id]) this.pos[mv.id] = { x: a[0], y: a[1] + G.CFG.cell * 0.3 }; }
      for (const mg of e.merges) {
        const a = G.tiles[mg.from].tower, b = G.tiles[mg.to].tower;
        const p = this.pos[mg.id] || { x: a[0], y: a[1] + G.CFG.cell * 0.3 };
        this.ghosts.push({ type: mg.type || (game.tiles[mg.to].tower && game.tiles[mg.to].tower.type), tier: mg.tier, x: p.x, y: p.y, tx: b[0], ty: b[1] + G.CFG.cell * 0.3, t: this.time });
        delete this.pos[mg.id];
      }
      this.slideAt = { t: this.time, dir: e.dir };
    }
    chainFx(pts) { if (pts && pts.length > 1) this.fx.push({ k: 'chain', pts: pts.map(p => [p[0], p[1] - 20]), t: this.time, life: 0.25 }); }
    cryPos() { const p = G.lanePoint(12, 0); return [p[0], p[1] - 4]; }
    denPos() { const p = G.lanePoint(0, 0); return [p[0], p[1] + 6]; }

    // ---------------------------------------------------------------- 매 프레임
    frame(game, dt, ui) {
      const c = this.ctx; this.time += dt; const T = this.time;
      this.game = game;
      c.save();
      if (this.shake > 0) { c.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake); this.shake = Math.max(0, this.shake - dt * 40); }
      this.drawGround(c, game);
      this.drawPath(c, game);
      this.drawDen(c, game);
      this.drawBoard(c, game);
      this.drawWaveArrows(c, game);
      // 몬스터 · 아군을 y 순서로(아래 있는 것이 앞)
      const list = [];
      for (const m of game.monsters) if (m.alive) list.push({ y: m.y, m });
      this.updateAllies(game, dt);
      for (const t of game.tiles) if (t.tower && !t.blocked) { const p = this.drawPos(game, t.i, t.tower); list.push({ y: p[1], t }); }
      for (const gh of this.ghosts) list.push({ y: gh.ty, gh });
      list.sort((a, b) => a.y - b.y);
      this.drawCrystal(c, game);
      for (const it of list) { if (it.m) this.drawMonster(c, game, it.m); else if (it.t) this.drawAlly(c, game, it.t); else this.drawGhost(c, it.gh); }
      this.drawSel(c, game);
      this.drawShots(c, game);
      this.drawFx(c, dt);
      this.drawTexts(c);
      this.drawBanners(c);
      c.restore();
      if (this.flash > 0) { c.fillStyle = `rgba(255,255,255,${this.flash})`; c.fillRect(0, 0, 720, FH()); this.flash = Math.max(0, this.flash - dt * 1.5); }
      const tc = this.topCtx; if (tc) tc.clearRect(0, 0, 720, 1280);
      this.ghosts = this.ghosts.filter(gh => T - gh.t < (gh.life || 0.2));
    }

    // ---------------------------------------------------------------- 바탕
    drawGround(c, game) {
      const name = BG[game.chapter || 1] || 'meadow', pal = PAL[name], im = this.bgPic(name);
      if (im) {
        const H = FH(), s = Math.max(720 / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s; c.drawImage(im, (720 - w) / 2, (H - h) / 2, w, h);
        if (this._gtopFor !== name) {   // 판 위쪽 화면 밖(폰 비율 여백)을 바탕 그림 맨 위 색으로 이어 칠함
          this._gtopFor = name;
          try { const d = c.getImageData(0, 2, 720, 1).data; let r = 0, g2 = 0, b = 0, n = 0; for (let k = 0; k < d.length; k += 16) { r += d[k]; g2 += d[k + 1]; b += d[k + 2]; n++; } document.body.style.setProperty('--gtop', `rgb(${r / n | 0},${g2 / n | 0},${b / n | 0})`); } catch (e) { /* 읽기 막힘 */ }
        }
        return;
      }
      if (this._gtopFor !== '_' + name) { this._gtopFor = '_' + name; document.body.style.setProperty('--gtop', pal.ground[0]); }
      const gr = c.createLinearGradient(0, 0, 0, FH()); gr.addColorStop(0, pal.ground[0]); gr.addColorStop(1, pal.ground[1]);
      c.fillStyle = gr; c.fillRect(0, 0, 720, FH());
    }
    // 돌 블록 길: 둘레 길 가운데 선을 따라 둥근 네모 돌을 촘촘히(랜덤다이스2 길 느낌). 모서리 돌은 크게
    // [v3.3] 길 = 타일이 아니라 이어진 흙길(사용자). 둥근 네모 고리 한 줄: 짙은 가장자리 → 길 바닥 → 안쪽 밝은 띠 → 드문드문 자갈 · 바퀴 자국
    drawPath(c, game) {
      const pal = this.pal(game), L = G.CFG.L * G.u, cx = G.CFG.L / 2;
      const a = G.P(cx, cx), b = G.P(G.SW - cx, G.SH - cx), x = a[0], y = a[1], w = b[0] - a[0], h = b[1] - a[1], r = L * 0.55;
      const ring = (lw, col) => { c.lineWidth = lw; c.strokeStyle = col; this.rr(c, x, y, w, h, r); c.stroke(); };
      c.save(); c.lineJoin = 'round';
      c.translate(0, 5); ring(L * 0.98, 'rgba(20,14,30,0.22)'); c.translate(0, -5);   // 아래 그늘
      ring(L * 0.98, pal.stone[2]);
      ring(L * 0.86, pal.stone[1]);
      ring(L * 0.6, pal.stone[0]);
      // 바퀴 자국 두 줄(점선) + 자갈
      c.setLineDash([18, 22]); c.lineCap = 'round'; ring(3, 'rgba(60,40,30,0.18)'); c.setLineDash([]);
      const n = Math.round(2 * G.LANE_LEN * G.u / 46);
      for (let k = 0; k < n; k++) {
        const j = hash(k * 3 + (game.chapter || 1) * 17); if (j < 0.45) continue;
        const p = G.lanePoint(k / n * 24, (hash(k * 5 + 1) - 0.5) * 1.5), s = 4 + j * 6;
        c.fillStyle = j > 0.8 && pal.lava ? pal.lava : 'rgba(40,28,36,0.28)'; c.beginPath(); c.ellipse(p[0], p[1], s, s * 0.7, 0, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.ellipse(p[0] - 1, p[1] - 2, s * 0.5, s * 0.25, 0, 0, TAU); c.fill();
      }
      c.restore();
    }
    stone(c, x, y, w, h, pal, j) {
      const r = Math.min(w, h) * 0.28, lip = h * 0.14;
      // 아랫면(두께)
      c.fillStyle = pal.stone[2]; this.rr(c, x - w / 2, y - h / 2 + lip, w, h, r); c.fill();
      // 윗면
      const gr = c.createLinearGradient(x, y - h / 2, x, y + h / 2); gr.addColorStop(0, pal.stone[0]); gr.addColorStop(1, pal.stone[1]);
      c.fillStyle = gr; this.rr(c, x - w / 2, y - h / 2, w, h - lip * 0.4, r); c.fill();
      c.strokeStyle = 'rgba(29,27,58,0.55)'; c.lineWidth = 2.5; this.rr(c, x - w / 2, y - h / 2, w, h + lip * 0.6, r); c.stroke();
      // 윗면 빛
      c.fillStyle = 'rgba(255,255,255,0.35)'; this.rr(c, x - w * 0.36, y - h * 0.4, w * 0.4, h * 0.14, h * 0.07); c.fill();
      if (pal.lava && j > 0.55) {   // 용암 금: 화살표(^)로 읽히지 않게 비스듬한 지그재그 · 끝이 가늘게
        c.strokeStyle = pal.lava; c.lineCap = 'round'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x - w * 0.28, y - h * 0.12); c.lineTo(x - w * 0.1, y - h * 0.02); c.lineTo(x - w * 0.06, y + h * 0.12); c.lineTo(x + w * 0.12, y + h * 0.18); c.stroke();
        c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - w * 0.1, y - h * 0.02); c.lineTo(x + w * 0.08, y - h * 0.1); c.stroke(); }
    }
    rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
    drawDen(c, game) {
      const [x, y] = this.denPos(), im = this.objPic('den');
      if (im) { const w = 150, h = w * im.naturalHeight / im.naturalWidth; c.drawImage(im, x - w / 2, y - h * 0.62, w, h); return; }
      // 대신: 어두운 돌문 + 보라 소용돌이
      c.fillStyle = '#3a2f4a'; c.beginPath(); c.ellipse(x, y, 62, 44, 0, 0, TAU); c.fill();
      c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
      const sw = c.createRadialGradient(x, y, 4, x, y, 40); sw.addColorStop(0, '#f2c8ff'); sw.addColorStop(0.5, '#9a4cff'); sw.addColorStop(1, '#2a1640');
      c.fillStyle = sw; c.beginPath(); c.ellipse(x, y, 44, 30, 0, 0, TAU); c.fill();
      c.save(); c.translate(x, y); c.rotate(this.time * 2); c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 20, 0, 4); c.stroke(); c.restore();
    }
    drawCrystal(c, game) {
      const [x, y] = this.cryPos(), cry = game.cry || { hp: 1, max: 1 }, k = Math.max(0, cry.hp / cry.max), hit = this.time - (this.cryHit || -9);
      const bob = Math.sin(this.time * 2) * 4, jig = hit < 0.3 ? Math.sin(hit * 60) * 4 : 0;
      // 받침 빛
      const gl = c.createRadialGradient(x, y + 10, 4, x, y + 10, 80); gl.addColorStop(0, `rgba(200,160,255,${0.45 * k + 0.1})`); gl.addColorStop(1, 'rgba(200,160,255,0)');
      c.fillStyle = gl; c.beginPath(); c.ellipse(x, y + 10, 80, 40, 0, 0, TAU); c.fill();
      const im = this.objPic('crystal');
      if (im) { const w = 104, h = w * im.naturalHeight / im.naturalWidth; c.drawImage(im, x - w / 2 + jig, y - h * 0.86 + bob, w, h); }
      else {
        c.save(); c.translate(x + jig, y - 40 + bob);
        const gr = c.createLinearGradient(-30, -50, 30, 40); gr.addColorStop(0, '#f5e6ff'); gr.addColorStop(0.5, '#b788ff'); gr.addColorStop(1, '#6a3fd0');
        c.fillStyle = gr; c.beginPath(); c.moveTo(0, -58); c.lineTo(30, -12); c.lineTo(18, 36); c.lineTo(-18, 36); c.lineTo(-30, -12); c.closePath(); c.fill();
        c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.moveTo(-6, -46); c.lineTo(-20, -12); c.lineTo(-8, -10); c.closePath(); c.fill();
        c.restore();
      }
      // 금(깨짐): 체력이 줄면 금이 는다
      if (k < 0.75) {
        c.save(); c.translate(x + jig, y - 44 + bob); c.strokeStyle = 'rgba(40,20,60,0.85)'; c.lineWidth = 2.5; c.lineCap = 'round';
        const n = k < 0.25 ? 3 : k < 0.5 ? 2 : 1;
        for (let q = 0; q < n; q++) { c.beginPath(); c.moveTo(-14 + q * 12, -30 + q * 8); c.lineTo(-4 + q * 10, -14 + q * 6); c.lineTo(-12 + q * 12, 2 + q * 6); c.lineTo(-2 + q * 12, 16); c.stroke(); }
        c.restore();
      }
      if (hit < 0.25) { c.fillStyle = `rgba(255,80,80,${0.5 - hit * 2})`; c.beginPath(); c.arc(x, y - 40, 60, 0, TAU); c.fill(); }
    }
    drawBoard(c, game) {
      const pal = this.pal(game), B = G.boardRect, pad = 12, NCELL = G.NCELL || G.N * G.N, cs = G.CFG.cell;
      // 받침(판 전체를 한 덩어리 돌판으로)
      c.fillStyle = 'rgba(20,14,30,0.25)'; this.rr(c, B.x - pad, B.y - pad + 10, B.w + pad * 2, B.h + pad * 2, 26); c.fill();
      const gr = c.createLinearGradient(0, B.y - pad, 0, B.y + B.h + pad); gr.addColorStop(0, pal.slab[0]); gr.addColorStop(1, pal.slab[1]);
      c.fillStyle = gr; this.rr(c, B.x - pad, B.y - pad, B.w + pad * 2, B.h + pad * 2, 26); c.fill();
      c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
      // 칸
      for (let i = 0; i < NCELL; i++) {
        const t = game.tiles[i], h = G.tiles[i].tower, x = h[0] - cs / 2 + 5, y = h[1] - cs / 2 + 5, w = cs - 10;
        if (t && t.blocked) {   // 구멍: 판이 뚫려 땅 아래가 보임 + 작은 돌
          c.fillStyle = pal.hole; this.rr(c, x + 4, y + 4, w - 8, w - 8, 18); c.fill();
          const ig = c.createLinearGradient(0, y, 0, y + w); ig.addColorStop(0, 'rgba(0,0,0,0.45)'); ig.addColorStop(0.4, 'rgba(0,0,0,0)');
          c.fillStyle = ig; this.rr(c, x + 4, y + 4, w - 8, w - 8, 18); c.fill();
          c.fillStyle = pal.stone[1]; c.beginPath(); c.ellipse(h[0] - 14, h[1] + 16, 12, 8, 0, 0, TAU); c.ellipse(h[0] + 16, h[1] + 20, 8, 6, 0, 0, TAU); c.fill();
          continue;
        }
        c.fillStyle = pal.cellEdge; this.rr(c, x, y + 6, w, w, 20); c.fill();
        const cg = c.createLinearGradient(0, y, 0, y + w); cg.addColorStop(0, pal.cell[0]); cg.addColorStop(1, pal.cell[1]);
        c.fillStyle = cg; this.rr(c, x, y, w, w, 20); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.22)'; this.rr(c, x + 10, y + 8, w - 20, 12, 6); c.fill();
      }
      // 밀기 안 됨(움직일 게 없음) → 판이 그 방향으로 살짝 흔들림
    }
    drawWaveArrows(c, game) {
      const w = this.waveArrows; if (!w) return; const a = this.time - w.t; if (a > 2.2) return;
      const [x, y] = this.denPos(), al = Math.min(1, a * 4) * Math.min(1, (2.2 - a) * 2);
      const side = (dx, n) => { for (let k = 0; k < n; k++) { c.fillStyle = `rgba(255,90,90,${al})`; const px = x + dx * (70 + k * 26 + (a * 60) % 26); c.beginPath(); c.moveTo(px + dx * 12, y); c.lineTo(px - dx * 6, y - 12); c.lineTo(px - dx * 6, y + 12); c.closePath(); c.fill(); } };
      side(-1, w.L >= 0.5 ? 3 : 1); side(1, w.L <= 0.5 ? 3 : 1);
    }

    // ---------------------------------------------------------------- 몬스터
    monLv(game, m) { const r = m.rnd || game.round || 1; return r >= 14 ? 3 : r >= 7 ? 2 : 1; }
    drawMonster(c, game, m) {
      const cpt = this.concept(game), T = this.time;
      const boss = !!m.boss, kind = m.kind;
      const base = boss ? 'boss' : kind === 'fast' || kind === 'mini' ? 'fast' : kind === 'giant' || kind === 'elite' ? 'giant' : 'normal';
      const lv = this.monLv(game, m);
      let size = boss ? 160 : base === 'giant' ? 104 : base === 'fast' ? 66 : 72;
      if (kind === 'mini') size *= 0.72; if (kind === 'splitter') size *= 0.86; if (kind === 'goldmon') size *= 0.9;
      size *= 1 + (lv - 1) * 0.06;
      const stunned = T < 0 ? false : game.t < m.stunUntil, frozen = game.t < (m.frozenUntil || 0);
      const hop = stunned || frozen ? 0 : Math.abs(Math.sin((T * (base === 'fast' ? 14 : 8)) + m.id)) * (base === 'giant' || boss ? 3 : 6);
      const d = G.laneDir(m.f, m.dir || 1), face = Math.abs(d[0]) > 0.01 ? Math.sign(d[0]) : (m.dir || 1) > 0 ? -1 : 1;
      const x = m.x, y = m.y;
      // 그림자
      c.fillStyle = 'rgba(20,10,30,0.28)'; c.beginPath(); c.ellipse(x, y + 4, size * 0.34, size * 0.11, 0, 0, TAU); c.fill();
      const im = boss ? this.bossPic(cpt) : this.monPic(cpt, base, lv);
      const ghost = m.stealth && game.t >= (m.revealUntil || 0);
      c.save();
      if (ghost) c.globalAlpha = 0.45;
      c.translate(x, y - hop);
      if (face > 0) c.scale(-1, 1);   // 그림은 왼쪽을 본다 → 오른쪽으로 갈 때 뒤집음
      const hitK = Math.max(0, 1 - (game.t - (m.hitT || -9)) * 8);
      if (im) {
        const w = size, h = w * im.naturalHeight / im.naturalWidth;
        c.drawImage(im, -w / 2, -h * 0.9, w, h);
        if (hitK > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = hitK * 0.5; c.drawImage(im, -w / 2, -h * 0.9, w, h); }
      } else this.monShape(c, cpt, base, lv, size, boss, hitK);
      c.restore();
      // 상태 표식
      if (kind === 'goldmon') this.ring(x, y - size * 0.4, 0, '#ffd23a', 0.01, 1);
      if (kind === 'barrier' && !boss) { c.strokeStyle = 'rgba(140,220,255,0.75)'; c.lineWidth = 3; c.beginPath(); c.arc(x, y - size * 0.42, size * 0.56, 0, TAU); c.stroke(); }
      if (kind === 'armor' && !boss) { c.fillStyle = '#b8c4d4'; c.strokeStyle = OUT; c.lineWidth = 2.5; this.rr(c, x - 12, y - size * 0.95, 24, 14, 5); c.fill(); c.stroke(); }
      if (kind === 'elite') this.crown(c, x, y - size * 0.98, 16);
      if (frozen) { c.fillStyle = 'rgba(180,235,255,0.45)'; this.rr(c, x - size * 0.42, y - size * 0.9, size * 0.84, size * 0.84, 12); c.fill(); }
      if (stunned && !frozen) { c.fillStyle = '#ffe14a'; for (let k = 0; k < 3; k++) { const a = T * 5 + k * 2.1; c.beginPath(); c.arc(x + Math.cos(a) * 18, y - size * 0.95 + Math.sin(a) * 5, 4, 0, TAU); c.fill(); } }
      // 체력: 다친 몬스터만 가는 막대(보스는 큰 막대 = 위 HUD)
      if (!boss && m.hp < m.maxHp) {
        const bw = Math.max(36, size * 0.6), k = Math.max(0, m.hp / m.maxHp), by = y + 10;
        c.fillStyle = 'rgba(20,14,30,0.75)'; this.rr(c, x - bw / 2 - 2, by - 2, bw + 4, 9, 4); c.fill();
        c.fillStyle = k > 0.5 ? '#7fe07a' : k > 0.25 ? '#ffd23a' : '#ff5a5a'; this.rr(c, x - bw / 2, by, bw * k, 5, 2.5); c.fill();
      }
      if (boss) {
        const bw = 120, k = Math.max(0, m.hp / m.maxHp), by = y + 14;
        c.fillStyle = 'rgba(20,14,30,0.8)'; this.rr(c, x - bw / 2 - 3, by - 3, bw + 6, 14, 6); c.fill();
        c.fillStyle = '#ff4a5a'; this.rr(c, x - bw / 2, by, bw * k, 8, 4); c.fill();
      }
    }
    crown(c, x, y, s) {
      c.fillStyle = '#ffd23a'; c.strokeStyle = OUT; c.lineWidth = 2.5; c.beginPath();
      c.moveTo(x - s, y + s * 0.5); c.lineTo(x - s, y - s * 0.3); c.lineTo(x - s * 0.5, y + s * 0.1); c.lineTo(x, y - s * 0.6); c.lineTo(x + s * 0.5, y + s * 0.1); c.lineTo(x + s, y - s * 0.3); c.lineTo(x + s, y + s * 0.5); c.closePath(); c.fill(); c.stroke();
    }
    // 그림이 없을 때(시안 전 · 불러오는 중): 컨셉 색 돌덩이 + 화난 눈
    monShape(c, cpt, base, lv, size, boss, hitK) {
      const col = cpt === 'snow' ? ['#e8f8ff', '#8fc8ec'] : cpt === 'volcano' ? ['#6a5560', '#3a2a33'] : ['#c8bfae', '#8f8572'];
      const w = size * (base === 'fast' ? 0.8 : 0.9), h = size * (base === 'fast' ? 0.62 : 0.8);
      const gr = c.createLinearGradient(0, -h, 0, 0); gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]);
      c.fillStyle = gr; this.rr(c, -w / 2, -h, w, h, Math.min(w, h) * 0.3); c.fill();
      c.lineWidth = 3.5; c.strokeStyle = OUT; c.stroke();
      if (cpt === 'volcano' || lv >= 2) { c.strokeStyle = lv >= 3 ? '#ff4a7a' : '#ff9a3a'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-w * 0.3, -h * 0.2); c.lineTo(-w * 0.1, -h * 0.35); c.lineTo(w * 0.1, -h * 0.2); c.stroke(); }
      const ey = -h * 0.62, ex = w * 0.17;
      c.fillStyle = boss || lv >= 3 ? '#ff3a5a' : '#ffdf3a';
      c.beginPath(); c.moveTo(-ex - 9, ey - 4); c.lineTo(-ex + 7, ey + 2); c.lineTo(-ex - 7, ey + 6); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(ex + 9, ey - 4); c.lineTo(ex - 7, ey + 2); c.lineTo(ex + 7, ey + 6); c.closePath(); c.fill();
      if (hitK > 0) { c.fillStyle = `rgba(255,255,255,${hitK * 0.6})`; this.rr(c, -w / 2, -h, w, h, Math.min(w, h) * 0.3); c.fill(); }
    }

    // ---------------------------------------------------------------- 아군
    updateAllies(game, dt) {
      const k = Math.min(1, dt * 16), live = new Set();
      for (const t of game.tiles) {
        const tw = t.tower; if (!tw || t.blocked) continue; live.add(tw.id);
        const h = G.tiles[t.i].tower, tx = h[0], ty = h[1] + G.CFG.cell * 0.3;
        const p = this.pos[tw.id] || (this.pos[tw.id] = { x: tx, y: ty });
        if (dt === 0) continue;
        p.x += (tx - p.x) * k; p.y += (ty - p.y) * k;
        if (Math.abs(tx - p.x) < 0.5 && Math.abs(ty - p.y) < 0.5) { p.x = tx; p.y = ty; }   // 목표 근처에서 딱 고정(아이폰 미세 진동 방지)
      }
      for (const id in this.pos) if (!live.has(+id)) delete this.pos[id];
      for (const gh of this.ghosts) { gh.x += (gh.tx - gh.x) * k; gh.y += (gh.ty - gh.y) * k; }
    }
    drawAlly(c, game, t) {
      const tw = t.tower, T = this.time, [x, y] = this.drawPos(game, t.i, tw), size = this.allySize(tw.tier), art = artOf(tw.type);
      const an = this.towerAnim[t.i], at = an ? T - an.t : 9;
      const pop = this.pop[tw.id] != null ? T - this.pop[tw.id] : 9;
      let sx = 1, sy = 1;
      if (pop >= 0 && pop < 0.35) { const q = pop / 0.35; sx = 1 + Math.sin(q * Math.PI) * 0.22; sy = 1 - Math.sin(q * Math.PI) * 0.14; if (q < 0.25) { sx *= 0.6 + q * 1.6; sy *= 0.6 + q * 1.6; } }
      else if (at < 0.16) { const q = at / 0.16; sy = 1 - Math.sin(q * Math.PI) * 0.1; sx = 1 + Math.sin(q * Math.PI) * 0.08; }
      const breathe = 1 + Math.sin(T * 2.4 + t.i) * 0.018;
      const dis = game.disabled ? game.disabled(t.i) : false, stop = game.t < (t.stopUntil || 0);
      // 발밑 단계 빛(단계 색 · 5단계부터 빛 고리가 돈다)
      const col = (D.TIER.ring && D.TIER.ring[tw.tier]) || TIER_COL[tw.tier];
      c.save();
      c.globalAlpha = 0.85;
      const gl = c.createRadialGradient(x, y - 6, 4, x, y - 6, size * 0.48); gl.addColorStop(0, col); gl.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gl; c.beginPath(); c.ellipse(x, y - 6, size * 0.48, size * 0.2, 0, 0, TAU); c.fill();
      c.globalAlpha = 1;
      if (tw.tier >= 5) { c.strokeStyle = col; c.lineWidth = 3; c.setLineDash([10, 8]); c.lineDashOffset = -T * 30; c.beginPath(); c.ellipse(x, y - 6, size * 0.4, size * 0.15, 0, 0, TAU); c.stroke(); c.setLineDash([]); }
      c.restore();
      // 몸
      const im = this.allyPic(tw.type, tw.tier);
      c.save(); c.translate(x, y - 4);
      if (an && at < 0.16 && an.tx < x) c.scale(-1, 1);   // 쏠 때 대상 쪽을 봄(그림은 오른쪽을 봄)
      c.scale(sx * breathe, sy / breathe);
      if (dis || stop) c.filter = 'grayscale(0.85) brightness(0.8)';
      if (im) { const w = size * (im.src.indexOf('ally2') >= 0 ? 0.52 : 1), h = w * im.naturalHeight / im.naturalWidth; c.drawImage(im, -w / 2, -h * 0.94, w, h); }   // 2차 그림(운빨풍)은 여백이 적어 0.52배(사용자: 칸보다 커서 35% 더 작게)
      else this.allyShape(c, art, tw.tier, size);
      c.filter = 'none';
      c.restore();
      // 단계 표시(칸 아래 가운데 작은 별 줄) — 같은 단계끼리 합쳐지므로 한눈에 보여야 함
      this.tierPips(c, x, y + 14, tw.tier);
      if (tw.tier === 5 && game.mythState) {   // [v3.1] 전설: 신화 각성 게이지(처치 수) — 다 차면 금빛으로 깜박
        const st = game.mythState(t.i), k = st ? st.gauge : 0, bw = 64, by = y + 30;
        c.fillStyle = 'rgba(20,14,30,0.75)'; this.rr(c, x - bw / 2 - 2, by - 2, bw + 4, 10, 5); c.fill();
        c.fillStyle = k >= 1 ? (Math.sin(this.time * 8) > 0 ? '#ffe14a' : '#ff8a3a') : '#ff9a3a'; this.rr(c, x - bw / 2, by, bw * k, 6, 3); c.fill();
      }
      if (t.occ) { c.fillStyle = 'rgba(80,20,40,0.55)'; this.rr(c, x - size * 0.4, y - size * 0.8, size * 0.8, size * 0.8, 18); c.fill(); this.say('', '#fff', x, y, 0.01); }
      if (t.warn) { const k = Math.max(0, (t.warn.until - game.t) / 15); c.strokeStyle = '#ff4a4a'; c.lineWidth = 5; c.beginPath(); c.arc(x, y - size * 0.4, size * 0.48, -Math.PI / 2, -Math.PI / 2 + TAU * k); c.stroke(); }
    }
    drawGhost(c, gh) {
      const a = Math.min(1, (this.time - gh.t) / (gh.life || 0.2)), size = this.allySize(gh.tier), im = this.allyPic(gh.type, gh.tier);
      c.save(); c.globalAlpha = 1 - a * 0.6; c.translate(gh.x, gh.y - 4); c.scale(1 - a * 0.3, 1 - a * 0.3);
      if (im) { const w = size * (im.src.indexOf('ally2') >= 0 ? 0.52 : 1), h = w * im.naturalHeight / im.naturalWidth; c.drawImage(im, -w / 2, -h * 0.92, w, h); } else this.allyShape(c, artOf(gh.type), gh.tier, size);
      c.restore();
    }
    tierPips(c, x, y, tier) {
      const col = (D.TIER.ring && D.TIER.ring[tier]) || TIER_COL[tier]; tier = GRADE[tier] || tier;   // [v3.1] 보이는 등급(1~5)만큼 별
      const w = 13, gap = 2, tot = tier * w + (tier - 1) * gap;
      c.fillStyle = 'rgba(20,14,30,0.7)'; this.rr(c, x - tot / 2 - 5, y - 4, tot + 10, 16, 8); c.fill();
      for (let k = 0; k < tier; k++) { const px = x - tot / 2 + k * (w + gap) + w / 2; this.star(c, px, y + 4, 6.2, col); }
    }
    star(c, x, y, r, col) {
      c.fillStyle = col; c.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.48 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      c.closePath(); c.fill();
    }
    // 그림이 없을 때: 계열 색 콩 몸 + 큰 눈(시안 몸 규칙과 같은 덩어리)
    allyShape(c, art, tier, size) {
      const col = COL[art], w = size * 0.62, h = size * 0.7;
      c.fillStyle = col; c.beginPath(); c.ellipse(0, -h * 0.5, w / 2, h / 2, 0, 0, TAU); c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
      c.fillStyle = '#fff3dd'; c.beginPath(); c.ellipse(0, -h * 0.5, w * 0.34, h * 0.26, 0, 0, TAU); c.fill();
      c.fillStyle = OUT; c.beginPath(); c.arc(-9, -h * 0.52, 5, 0, TAU); c.arc(9, -h * 0.52, 5, 0, TAU); c.fill();
    }
    drawSel(c, game) {
      if (this.sel == null || !game.tiles[this.sel] || !game.tiles[this.sel].tower) return;
      const i = this.sel, p = G.tiles[i].tower, r = (game.rangeOf ? game.rangeOf(i) + 0.5 + 0.5 : 2.5) * G.u, a = Math.min(1, (this.time - this.selT) * 6);
      c.save(); c.globalAlpha = 0.9 * a; c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.setLineDash([12, 10]); c.lineDashOffset = -this.time * 40;
      c.beginPath(); c.arc(p[0], p[1], r * a, 0, TAU); c.stroke(); c.setLineDash([]);
      c.fillStyle = 'rgba(255,255,255,0.08)'; c.fill(); c.restore();
    }

    // ---------------------------------------------------------------- 탄
    drawShots(c, game) {
      for (const s of game.shots) {
        if (s.delay > 0 || s.done) continue;
        const art = artOf(s.type), col = COL[art], dx = s.tx - s.sx, dy = s.ty - s.sy, a = Math.atan2(dy, dx), big = s.tier >= 4;
        c.save(); c.translate(s.x, s.y); c.rotate(a);
        if (art === 'archer') {   // 화살
          c.strokeStyle = '#7a4a22'; c.lineWidth = 3; c.beginPath(); c.moveTo(-16, 0); c.lineTo(8, 0); c.stroke();
          c.fillStyle = big ? '#e8ffb0' : '#ffffff'; c.beginPath(); c.moveTo(14, 0); c.lineTo(6, -5); c.lineTo(6, 5); c.closePath(); c.fill();
          c.fillStyle = col; c.beginPath(); c.moveTo(-16, 0); c.lineTo(-22, -5); c.lineTo(-12, 0); c.lineTo(-22, 5); c.closePath(); c.fill();
          if (big) { c.strokeStyle = 'rgba(160,255,140,0.5)'; c.lineWidth = 6; c.beginPath(); c.moveTo(-30, 0); c.lineTo(-14, 0); c.stroke(); }
        } else if (art === 'frost') {   // 고드름
          c.fillStyle = '#e8fbff'; c.strokeStyle = '#3a8fc8'; c.lineWidth = 2;
          c.beginPath(); c.moveTo(16, 0); c.lineTo(-8, -6); c.lineTo(-14, 0); c.lineTo(-8, 6); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = 'rgba(160,230,255,0.4)'; c.beginPath(); c.arc(-14, 0, 8, 0, TAU); c.fill();
        } else {   // 불덩이 · 번개 구슬 · 빛 구슬: 꼬리 + 빛나는 공
          const r = (big ? 10 : 7) + (art === 'sword' ? 2 : 0);
          const tail = c.createLinearGradient(-r * 4, 0, 0, 0); tail.addColorStop(0, 'rgba(255,255,255,0)'); tail.addColorStop(1, col);
          c.fillStyle = tail; c.beginPath(); c.moveTo(0, -r * 0.8); c.lineTo(-r * 4, 0); c.lineTo(0, r * 0.8); c.closePath(); c.fill();
          const gr = c.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, col); gr.addColorStop(1, art === 'mage' ? '#6a2fd0' : art === 'sword' ? '#d0401a' : '#e0a020');
          c.fillStyle = gr; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
          if (art === 'mage') { c.strokeStyle = '#f2e0ff'; c.lineWidth = 2; c.beginPath(); c.moveTo(-r, -r * 0.6); c.lineTo(0, 0); c.lineTo(-r * 0.4, r * 0.4); c.lineTo(r, r * 0.8); c.stroke(); }
        }
        c.restore();
      }
    }

    // ---------------------------------------------------------------- 효과 · 글씨
    drawFx(c, dt) {
      const T = this.time;
      for (const f of this.fx) {
        const a = (T - f.t) / f.life; if (a < 0 || a > 1) continue;
        if (f.k === 'ring') { c.strokeStyle = f.col; c.globalAlpha = 1 - a; c.lineWidth = f.w * (1 - a * 0.5); c.beginPath(); c.arc(f.x, f.y, f.r * (0.5 + a * 0.7), 0, TAU); c.stroke(); c.globalAlpha = 1; }
        else if (f.k === 'burst' || f.k === 'hit') { const r = f.r * (0.4 + a * 0.9); const gr = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, r); gr.addColorStop(0, `rgba(255,255,255,${1 - a})`); gr.addColorStop(0.5, this.alpha(f.col, (1 - a) * 0.8)); gr.addColorStop(1, this.alpha(f.col, 0)); c.fillStyle = gr; c.beginPath(); c.arc(f.x, f.y, r, 0, TAU); c.fill(); }
        else if (f.k === 'merge') {
          c.save(); c.globalAlpha = 1 - a; c.strokeStyle = f.col; c.lineWidth = 8 * (1 - a) + 2;
          c.beginPath(); c.arc(f.x, f.y - 30, 30 + a * 70, 0, TAU); c.stroke();
          c.fillStyle = this.alpha('#ffffff', (1 - a) * 0.5); c.beginPath(); c.arc(f.x, f.y - 30, 50 * (1 - a), 0, TAU); c.fill();
          c.restore();
        } else if (f.k === 'chain') {
          c.save(); c.globalAlpha = 1 - a; c.strokeStyle = '#e6d0ff'; c.lineWidth = 4; c.shadowColor = '#b07cff'; c.lineJoin = 'round';
          c.beginPath(); f.pts.forEach((p, k) => { const j = k ? (Math.random() - 0.5) * 14 : 0; k ? c.lineTo(p[0] + j, p[1] + j) : c.moveTo(p[0], p[1]); }); c.stroke();
          c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.stroke(); c.restore();
        }
      }
      this.fx = this.fx.filter(f => T - f.t < f.life);
      for (const p of this.parts) {
        const a = (T - p.t) / p.life; if (a < 0 || a > 1) continue;
        const e = T - p.t, x = p.x + p.vx * e, y = p.y + p.vy * e + 0.5 * p.g * e * e;
        c.globalAlpha = 1 - a * a;
        if (p.star) this.star(c, x, y, p.r * (1 - a * 0.5), p.col);
        else if (p.shard) { c.fillStyle = p.col; c.save(); c.translate(x, y); c.rotate(e * 8); c.beginPath(); c.moveTo(0, -p.r); c.lineTo(p.r * 0.6, 0); c.lineTo(0, p.r); c.lineTo(-p.r * 0.6, 0); c.closePath(); c.fill(); c.restore(); }
        else { c.fillStyle = p.col; c.beginPath(); c.arc(x, y, p.r * (1 - a * 0.4), 0, TAU); c.fill(); if (p.chunk) { c.strokeStyle = 'rgba(29,27,58,0.6)'; c.lineWidth = 1.5; c.stroke(); } }
      }
      c.globalAlpha = 1;
      this.parts = this.parts.filter(p => T - p.t < p.life);
      if (this.parts.length > 260) this.parts.splice(0, this.parts.length - 260);
      // 금화: 처치 자리에서 위로 튀었다 사라짐(금화 줄로 날아가는 연출은 DOM 쪽 몫 — 가볍게)
      for (const k of this.coins) {
        const a = (T - k.t) / 0.6; if (a > 1) continue;
        const y = k.y - 30 * Math.sin(a * Math.PI) - a * 10;
        c.globalAlpha = 1 - Math.max(0, a - 0.6) * 2.5;
        const gr = c.createRadialGradient(k.x - 3, y - 3, 1, k.x, y, 9); gr.addColorStop(0, '#fff6b0'); gr.addColorStop(1, '#f0a800');
        c.fillStyle = gr; c.beginPath(); c.arc(k.x, y, 8, 0, TAU); c.fill(); c.strokeStyle = '#8a5a00'; c.lineWidth = 2; c.stroke();
      }
      c.globalAlpha = 1;
      this.coins = this.coins.filter(k => T - k.t < 0.6);
    }
    alpha(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
    drawTexts(c) {
      const T = this.time;
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      for (const t of this.texts) {
        const a = (T - t.t) / t.life; if (a < 0 || a > 1 || !t.txt) continue;
        const rise = t.kind === 'dmg' ? a * 30 : a * 24, sc = t.kind === 'dmg' ? (a < 0.15 ? 0.7 + a * 3 : 1) : (a < 0.12 ? 0.6 + a * 3.4 : 1);
        c.globalAlpha = a > 0.7 ? (1 - a) / 0.3 : 1;
        c.font = `${Math.round(t.size * sc)}px Jua, sans-serif`;
        c.lineWidth = t.size * 0.24; c.strokeStyle = OUT; c.strokeText(t.txt, t.x, t.y - rise);
        c.fillStyle = t.col; c.fillText(t.txt, t.x, t.y - rise);
      }
      c.globalAlpha = 1;
      this.texts = this.texts.filter(t => T - t.t < t.life);
    }
    drawBanners(c) {
      const T = this.time;
      for (const b of this.banners) {
        const a = (T - b.t) / 1.4; if (a > 1) continue;
        const sc = a < 0.12 ? 0.5 + a * 4 : 1;
        c.globalAlpha = a > 0.75 ? (1 - a) / 0.25 : 1;
        c.font = `${Math.round(44 * sc)}px Jua, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineWidth = 10; c.strokeStyle = OUT; c.strokeText(b.txt, 360, 520); c.fillStyle = b.col; c.fillText(b.txt, 360, 520);
      }
      c.globalAlpha = 1;
      this.banners = this.banners.filter(b => T - b.t < 1.4);
    }
  }
  root.Renderer = Renderer;
  root.V3VIEW = { ART, artOf, COL, TIER_COL, CONCEPT, BG, PAL };
})(window);
