// 마블 디펜스 실험실 — 그리기 층(본편 Renderer 위에 덧붙임). 세 맵 공통: 12시 수정 · 수정 깎임 연출 · 웨이브 방향 화살표
// 다이얼: 판 칸 고리(24조각)가 실제로 돌아가는 원판 + 포탑 레일 · 가운데 손잡이 / 밀어 합치기: 5×5 돌판 · 미는 방향 표시 · 미끄러짐 · 합쳐짐 잔상
// 레이어(아래 → 위): 판 그림 → [실험실 판: 원판 / 돌판] → 굴 → 수정(under) → 포탑 · 몬스터(깊이 순) → 탄 · 이펙트 → 잔상 · 떠오르는 글씨(over) → HUD(DOM)
(function (root) {
  const LAB = root.LAB; if (!LAB) return;
  const R = root.Renderer.prototype, G = root.GEOM, D = root.DATA, SIM = root.SIM;
  const TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => 1 - Math.pow(1 - t, 3);
  const PLUM = '#2b1426', VIO = '#c86bff';
  const S = G.S, CF = G.CFG;

  R.lab = function () { return this._lab || (this._lab = { pops: [], ghosts: [], anim: {}, slideFx: null, waveT: -9 }); };

  // ------------------------------------------------------------ 사건
  const baseConsume = R.consume;
  R.consume = function (game, events, audio) {
    const L = this.lab(), keep = [];
    this._labA = audio || this._labA;
    for (const e of events) {
      if (e.ev === 'cryHit') { this.cryHitFx(game, e, audio); continue; }
      if (e.ev === 'labWave') { L.waveT = this.time; keep.push(e); continue; }
      if (e.ev === 'slid') { this.slidFx(game, e, audio); continue; }
      if (e.ev === 'slideNo') { L.slideFx = { dir: e.dir, t0: this.time, no: 1 }; continue; }
      if (LAB.map === 'slide' && e.ev === 'mergeFrom') continue;   // 밀어 합치기: 잔상은 slidFx가 모두 그림(본편 잔상은 하나만)
      keep.push(e);
    }
    baseConsume.call(this, game, keep, audio);
  };
  R.cryPos = function () { const p = G.lanePoint(12, 0); return [p[0], p[1] + 6]; };
  R.cryHitFx = function (game, e, A) {
    const L = this.lab(), [x, y] = this.cryPos(), big = !!e.boss;
    // 몬스터가 수정으로 빨려 들어감(마지막 자리에서 보라 연기) → 수정이 번쩍 · 조각 · 숫자
    for (let q = 0; q < (big ? 10 : 5); q++) this.part({ x: e.x + rnd(-10, 10), y: e.y - rnd(4, 20), vx: (x - e.x) * rnd(1.2, 2) , vy: (y - 40 - e.y) * rnd(1.2, 2), drag: 2.5, life: rnd(0.3, 0.45), size: rnd(4, 7), col: q % 2 ? '#3a1840' : '#7a3a9a' });
    this.ring(x, y - 34, big ? 70 : 40, '#ff6a9a', big ? 0.6 : 0.35, big ? 7 : 4);
    for (let q = 0; q < (big ? 22 : 8); q++) { const a = rnd(-Math.PI, 0), sp = rnd(120, big ? 300 : 200); this.part({ x: x + rnd(-10, 10), y: y - rnd(20, 60), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, grav: 520, drag: 0.6, life: rnd(0.5, 0.8), size: rnd(3, big ? 8 : 6), col: q % 3 ? VIO : '#f6d0ff', kind: 'star', vr: rnd(-9, 9) }); }
    this.shake = Math.max(this.shake || 0, big ? 16 : 5);
    if (big) this.flash = Math.max(this.flash || 0, 0.3);
    L.pops.push({ s: '−' + e.dmg, x, y: y - 96, t0: this.time, col: '#ff6a8a', big });
    if (big && this.ribbon) this.ribbon('보스가 수정을 쳤다!', `수정 ${e.from} → ${e.to}`, false, null, { col: '#ff5a8a', pri: 1, dur: 2.2 });
    if (A) { try { if (big) { A.boom && A.boom(); } A.tone && A.tone({ f: big ? 260 : 520, f2: big ? 80 : 300, d: big ? 0.45 : 0.16, v: big ? 0.16 : 0.08, wave: 'triangle' }); } catch (er) { /* 소리 없음 */ } }
  };

  // ------------------------------------------------------------ 12시 수정
  R.drawCrystal = function (c, game) {
    if (!game.cry) return;
    const [x0, y] = this.cryPos(), t = this.time, cry = game.cry, k = cry.hp / cry.max;
    const hitA = clamp(1 - (game.t - cry.hitT) / 0.3, 0, 1), x = x0 + (hitA > 0 ? rnd(-3, 3) * hitA : 0);
    const low = k <= 0.35, im = this.I(low ? 'x_crystal_b' : 'x_crystal'), M = root.MANIFEST[low ? 'x_crystal_b' : 'x_crystal'];
    c.save();
    // 바닥 빛(체력이 줄면 붉게)
    const pu = 0.5 + 0.5 * Math.sin(t * (low ? 7 : 3));
    c.globalAlpha = 0.3 + 0.2 * pu; c.fillStyle = low ? '#ff4a7a' : VIO; c.beginPath(); c.ellipse(x, y + 2, 46, 16, 0, 0, TAU); c.fill();
    c.globalAlpha = 1;
    if (im && M) {
      const h = 78, w = M.w / M.h * h;
      c.drawImage(im, x - w / 2, y + 8 - h, w, h);
      if (hitA > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = hitA * 0.8; c.drawImage(im, x - w / 2, y + 8 - h, w, h); c.globalCompositeOperation = 'source-over'; }
    }
    if (!low) for (let n = 0; n < 3; n++) { const a = t * 1.5 + n * 2.1; this.star(c, x + Math.cos(a) * 38, y - 40 + Math.sin(a * 1.3) * 20, 4, 5, 2, t * 3 + n, '#f6d0ff'); }
    c.restore();
    // 수정 체력 띠(수정 바로 아래 · 몬스터가 닿는 자리라 얇게)
    const bw = 66, bx = x0 - bw / 2, by = y + 14;
    c.fillStyle = PLUM; this.rr(c, bx - 2, by - 2, bw + 4, 10, 4); c.fill();
    c.fillStyle = '#4a2440'; this.rr(c, bx, by, bw, 6, 3); c.fill();
    c.fillStyle = low ? '#ff5a7a' : '#d98bff'; if (k > 0) { this.rr(c, bx, by, Math.max(4, bw * k), 6, 3); c.fill(); }
  };

  // ------------------------------------------------------------ 웨이브 방향(다이얼 · 밀어 합치기): 굴에서 두 길로 뻗는 화살표 — 굵기 = 몫
  R.drawWaveArrows = function (c, game) {
    if (LAB.C.sides !== 'waves' || game.round < 1 || game.over) return;
    const bossRound = game.round % 5 === 0;
    const spawning = game.spawnQ && game.spawnQ.length > 0;
    let w = null, next = false;
    if (spawning && !bossRound) w = game.wave;
    else if (game.clearAt != null || (!spawning && !game.monsters.length)) { if ((game.round + 1) % 5 !== 0) { w = game.nextWave; next = true; } }
    if (!w) return;
    const t = this.time, a0 = clamp((t - this.lab().waveT) / 0.4, 0, 1);
    for (const side of [1, -1]) {
      const share = side > 0 ? w.L : 1 - w.L, heavy = share > 0.55, col = heavy ? '#ff7a3a' : '#ffe9b8';
      const n = heavy ? 3 : 1;
      for (let q = 0; q < n; q++) {
        const f = side * (0.75 + q * 0.42 + ((t * 1.2) % 1) * 0.14), p = G.lanePoint(f, 0), p2 = G.lanePoint(f + side * 0.2, 0);
        const ang = Math.atan2(p2[1] - p[1], p2[0] - p[0]), s = (heavy ? 15 : 10) * p[2];
        c.save(); c.translate(p[0], p[1] - 6); c.rotate(ang); c.globalAlpha = (next ? 0.55 : 0.85) * a0 * (0.6 + 0.4 * Math.sin(t * 6 + q));
        c.fillStyle = PLUM; c.beginPath(); c.moveTo(s + 4, 0); c.lineTo(-s, -s - 4); c.lineTo(-s * 0.4, 0); c.lineTo(-s, s + 4); c.closePath(); c.fill();
        c.fillStyle = col; c.beginPath(); c.moveTo(s, 0); c.lineTo(-s + 2, -s); c.lineTo(-s * 0.4 + 2, 0); c.lineTo(-s + 2, s); c.closePath(); c.fill();
        c.restore();
      }
    }
    if (w.tag !== 'even') {
      const p = G.lanePoint(0, 0), side = w.tag === 'left' ? -1 : 1;
      c.save(); c.globalAlpha = (next ? 0.7 : 1) * a0; c.font = '700 17px Jua, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      this.outlined(c, (next ? '다음: ' : '') + (w.tag === 'left' ? '◀ 왼쪽 많음' : '오른쪽 많음 ▶'), p[0] + side * 92, p[1] + 26, '#ffd6a8', PLUM, 5);
      c.restore();
    }
  };

  // ------------------------------------------------------------ 떠오르는 글씨(−1 등)
  R.drawLabPops = function (c) {
    const L = this.lab();
    L.pops = L.pops.filter(p => this.time - p.t0 < 1.1);
    for (const p of L.pops) {
      const a = (this.time - p.t0) / 1.1, s = a < 0.15 ? 0.6 + a / 0.15 * 0.6 : 1.2 - (a - 0.15) * 0.25;
      c.save(); c.globalAlpha = a > 0.7 ? (1 - a) / 0.3 : 1; c.translate(p.x, p.y - a * 30); c.scale(s, s);
      c.font = `700 ${p.big ? 34 : 24}px Jua, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      this.outlined(c, p.s, 0, 0, p.col, PLUM, 6); c.restore();
    }
  };

  const baseFx = R.drawFx;
  R.drawFx = function (c, layer) {
    const g = this._game;
    if (layer === 'under' && g) { this.drawCrystal(c, g); this.drawWaveArrows(c, g); }
    baseFx.call(this, c, layer);
    if (layer === 'over' && g) { if (this.drawGhosts) this.drawGhosts(c, g); this.drawLabPops(c); }
  };

  // ============================================================ 다이얼 · 밀어 합치기 공통: 말 · 주사위 · 칸 문양 없음
  if (LAB.map === 'dial' || LAB.map === 'slide') {
    R.drawPawnBody = function () {}; R.drawPawnBadge = function () {}; R.drawPawn = function () { return null; };
    R.drawPartnerBody = function () {}; R.drawPartnerTag = function () {};
    R.drawTrayDice = function () {}; R.drawDiceShow = function () {};
    // 사거리: 길에서 실제로 닿는 구간(판 좌표 직선 거리)만 밝힘
    R.drawRange = function (c, game) {
      const sel = this.sel; if (sel == null) return;
      const tl = game.tiles[sel]; if (!tl || !tl.tower) { this.sel = null; return; }
      const r = Math.min(12, game.rangeOf(sel)), a = clamp((this.time - (this.selT || 0)) / 0.18, 0, 1);
      const col = (D.TOWERS[tl.tower.type] || {}).color || '#ffffff';
      const probe = { f: 0, w: 0, u: 0, v: 0 };
      const segs = []; let cur = null;
      for (let f = -12; f <= 12.001; f += 0.1) {
        probe.f = f; const uv = root.LAB_GEO_INST.laneUV(f, 0); probe.u = uv[0]; probe.v = uv[1];
        const ok = game.dMT(probe, sel) <= r + 0.5;
        if (ok) { if (!cur) segs.push(cur = []); cur.push(f); } else cur = null;
      }
      c.save();
      for (const sg of segs) {
        if (sg.length < 2) continue;
        const inner = sg.map(f => G.lanePoint(f, -1.25)), outer = sg.map(f => G.lanePoint(f, 1.25));
        c.beginPath(); inner.forEach((p, n) => n ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); for (let n = outer.length - 1; n >= 0; n--) c.lineTo(outer[n][0], outer[n][1]); c.closePath();
        c.globalAlpha = 0.26 * a; c.fillStyle = '#ffffff'; c.fill(); c.globalAlpha = 0.18 * a; c.fillStyle = col; c.fill();
        c.globalAlpha = 0.85 * a; c.lineWidth = 3; c.strokeStyle = '#ffffff'; c.lineJoin = 'round'; c.stroke();
      }
      const [x, y] = G.tiles[sel].tower, sc = G.tiles[sel].scale;
      c.globalAlpha = 0.9 * a; c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y + 2, 34 * sc, 14 * sc, 0, 0, TAU); c.stroke();
      c.restore();
    };
  }

  // 판 좌표 다각형 그리기
  const poly = (c, pts) => { c.beginPath(); pts.forEach((q, n) => { const p = G.P(q[0], q[1]); n ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.closePath(); };
  const square = (d) => [[d, d], [S - d, d], [S - d, S - d], [d, S - d]];

  // ============================================================ ② 다이얼
  if (LAB.map === 'dial') {
    const O = G.O, B = CF.b;
    // 깊이 d의 정사각 고리 위 f 지점(본편 칸 번호 방향)
    const ringAt = (d, f) => {
      f = ((f % 24) + 24) % 24; const side = S - 2 * d, s = Math.floor(f / 6), r = (f - s * 6) / 6;
      if (s === 0) return [S - d - r * side, S - d]; if (s === 1) return [d, S - d - r * side]; if (s === 2) return [d + r * side, d]; return [S - d, d + r * side];
    };
    const band = (d0, d1, f0, f1) => {
      const fs = [f0]; for (let v = Math.ceil(f0 / 6) * 6; v < f1; v += 6) if (v > f0) fs.push(v); fs.push(f1);
      return fs.map(f => ringAt(d0, f)).concat(fs.slice().reverse().map(f => ringAt(d1, f)));
    };
    R.drawBoardTiles = function (c, game) {
      const rot = game.rot || 0, t = this.time;
      c.save(); c.lineJoin = 'round';
      // 1) 판 윗면 전체를 덮음(본편 칸 · 주사위 광장 지움)
      poly(c, square(O - 0.02)); c.fillStyle = '#3a2433'; c.fill();
      // 2) 돌아가는 바깥 원판 = 24조각(포탑 자리와 같은 칸, 고리와 함께 돈다)
      for (let k = 0; k < 24; k++) {
        const f0 = k + rot + 0.05, f1 = k + 1 + rot - 0.05;
        poly(c, band(O + 0.05, O + B - 0.05, f0, f1));
        c.fillStyle = k % 2 ? '#f0dfb6' : '#e2c792'; c.fill();
        c.strokeStyle = 'rgba(43,20,38,0.55)'; c.lineWidth = 2; c.stroke();
        // 조각마다 눈금(돌아가는 게 보이게)
        const m = ringAt(O + B * 0.5, k + 0.5 + rot), p = G.P(m[0], m[1]);
        c.fillStyle = k % 6 === 0 ? '#c0503a' : 'rgba(43,20,38,0.45)'; c.beginPath(); c.ellipse(p[0], p[1], k % 6 === 0 ? 6 : 3.5, (k % 6 === 0 ? 6 : 3.5) * 0.6, 0, 0, TAU); c.fill();
      }
      // 3) 가운데 광장: 잔디 + 원판 손잡이(돌림 방향 화살표 · 손잡이 홈이 같이 돈다)
      const ins = O + B + 0.04; poly(c, square(ins)); c.fillStyle = '#5f9a4c'; c.fill();
      c.strokeStyle = 'rgba(43,20,38,0.6)'; c.lineWidth = 3; c.stroke();
      const cx = S / 2, rr = (S - 2 * ins) * 0.36, ang = rot / 24 * TAU;
      const circ = (r0, a0, a1, n) => { const pts = []; for (let q = 0; q <= n; q++) { const a = a0 + (a1 - a0) * q / n; pts.push([cx + Math.cos(a) * r0, cx + Math.sin(a) * r0]); } return pts; };
      // 그림자 · 몸통 · 윗면
      c.save(); c.translate(0, 8); poly(c, circ(rr, 0, TAU, 48)); c.fillStyle = 'rgba(26,10,20,0.45)'; c.fill(); c.restore();
      poly(c, circ(rr, 0, TAU, 48)); c.fillStyle = '#c99a5c'; c.fill(); c.strokeStyle = PLUM; c.lineWidth = 3; c.stroke();
      poly(c, circ(rr * 0.82, 0, TAU, 48)); c.fillStyle = '#e0b878'; c.fill();
      for (let q = 0; q < 8; q++) { const a = ang + q * TAU / 8; const p1 = G.P(cx + Math.cos(a) * rr * 0.86, cx + Math.sin(a) * rr * 0.86), p2 = G.P(cx + Math.cos(a) * rr * 0.98, cx + Math.sin(a) * rr * 0.98); c.strokeStyle = '#8a5a2a'; c.lineWidth = 5; c.beginPath(); c.moveTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.stroke(); }
      // 돌림 화살표 두 개(시계 · 반시계)
      for (const dir of [1, -1]) {
        const a0 = ang + (dir > 0 ? 0.35 : Math.PI + 0.35), a1 = a0 + 1.9;
        const pts = circ(rr * 0.55, a0, a1, 18).map(q => G.P(q[0], q[1]));
        c.strokeStyle = 'rgba(255,248,230,0.85)'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); pts.forEach((p, n) => n ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
        const e = pts[pts.length - 1], e0 = pts[pts.length - 3], an = Math.atan2(e[1] - e0[1], e[0] - e0[0]);
        c.fillStyle = 'rgba(255,248,230,0.95)'; c.beginPath(); c.moveTo(e[0] + Math.cos(an) * 12, e[1] + Math.sin(an) * 12); c.lineTo(e[0] + Math.cos(an + 2.3) * 11, e[1] + Math.sin(an + 2.3) * 11); c.lineTo(e[0] + Math.cos(an - 2.3) * 11, e[1] + Math.sin(an - 2.3) * 11); c.closePath(); c.fill();
      }
      const hub = G.P(cx, cx); c.fillStyle = PLUM; c.beginPath(); c.ellipse(hub[0], hub[1], 16, 11, 0, 0, TAU); c.fill(); c.fillStyle = '#ffd23a'; c.beginPath(); c.ellipse(hub[0], hub[1] - 2, 11, 7, 0, 0, TAU); c.fill();
      // 4) 포탑 레일(판 바깥 띠): 홈 + 돌아가는 받침
      const dp = root.LAB_DIAL_DP, rw = 0.5;
      c.fillStyle = 'rgba(58,36,51,0.55)';
      c.beginPath(); square(dp - rw).forEach((q, n) => { const p = G.P(q[0], q[1]); n ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.closePath();
      square(dp + rw).reverse().forEach((q, n) => { const p = G.P(q[0], q[1]); n ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); }); c.closePath();
      c.fill('evenodd');
      for (const d of [dp - rw, dp + rw]) { poly(c, square(d)); c.strokeStyle = 'rgba(255,240,210,0.35)'; c.lineWidth = 2; c.stroke(); }
      for (let k = 0; k < 24; k++) {
        const [x, y] = G.tiles[k].tower, s = G.tiles[k].scale;
        c.fillStyle = 'rgba(26,10,20,0.5)'; c.beginPath(); c.ellipse(x, y + 3, 30 * s, 12 * s, 0, 0, TAU); c.fill();
        c.fillStyle = '#8c7a80'; c.beginPath(); c.ellipse(x, y, 28 * s, 11 * s, 0, 0, TAU); c.fill();
        c.fillStyle = '#a8969c'; c.beginPath(); c.ellipse(x, y - 1.5, 22 * s, 8 * s, 0, 0, TAU); c.fill();
      }
      c.restore();
      void t;
    };
  }

  // ============================================================ ③ 밀어 합치기
  if (LAB.map === 'slide') {
    const SL = root.LAB_SLIDE_INFO;
    const N = SL.N, CS = SL.CS, M0 = SL.M0, LIFT = 6;
    const ringOf = i => { const r = Math.floor(i / N), c = i % N; return Math.min(r, c, N - 1 - r, N - 1 - c); };
    const DIRV = { '+U': [1, 0], '-U': [-1, 0], '+V': [0, 1], '-V': [0, -1] };
    R.drawBoardTiles = function (c, game) {
      const t = this.time;
      c.save(); c.lineJoin = 'round';
      // 바탕(돌판 아래 흙) + 앞 두 면 두께
      const b0 = M0 - 0.1, b1 = S - M0 + 0.1;
      const P = G.P;
      const fl = [P(b0, b1), P(b1, b1), P(b1, b0)];
      c.fillStyle = '#24161c'; c.beginPath(); c.moveTo(fl[0][0], fl[0][1]); c.lineTo(fl[1][0], fl[1][1]); c.lineTo(fl[2][0], fl[2][1]); c.lineTo(fl[2][0], fl[2][1] + 14); c.lineTo(fl[1][0], fl[1][1] + 14); c.lineTo(fl[0][0], fl[0][1] + 14); c.closePath(); c.fill();
      poly(c, square(b0)); c.fillStyle = '#3b2a2e'; c.fill(); c.strokeStyle = PLUM; c.lineWidth = 3; c.stroke();
      // 칸(솟은 돌): 가장자리 16칸 = 밝은 크림(길에 가까움) · 안쪽 8칸 = 모래 · 가운데 = 어두운 모래
      const COL = [['#f3e2bc', '#e9d3a6'], ['#d9c397', '#cfb88a'], ['#bfa77c', '#bfa77c']];
      for (let i = 0; i < N * N; i++) {
        const r = Math.floor(i / N), cc = i % N, g = 0.07;
        const u0 = M0 + cc * CS + g, u1 = M0 + (cc + 1) * CS - g, v0 = M0 + r * CS + g, v1 = M0 + (r + 1) * CS - g;
        const a = P(u0, v0), b = P(u1, v0), d = P(u1, v1), e = P(u0, v1);
        // 앞 두 면(아래로 LIFT)
        c.fillStyle = '#8a6e52'; c.beginPath(); c.moveTo(e[0], e[1] - LIFT); c.lineTo(d[0], d[1] - LIFT); c.lineTo(d[0], d[1]); c.lineTo(e[0], e[1]); c.closePath(); c.fill();
        c.fillStyle = '#a6855f'; c.beginPath(); c.moveTo(d[0], d[1] - LIFT); c.lineTo(b[0], b[1] - LIFT); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.closePath(); c.fill();
        const ring = ringOf(i), col = COL[Math.min(2, ring)][(r + cc) % 2];
        c.fillStyle = col; c.beginPath(); c.moveTo(a[0], a[1] - LIFT); c.lineTo(b[0], b[1] - LIFT); c.lineTo(d[0], d[1] - LIFT); c.lineTo(e[0], e[1] - LIFT); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(43,20,38,0.7)'; c.lineWidth = 2; c.stroke();
        // 윗면 위쪽 모서리 빛
        c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(e[0] + 2, e[1] - LIFT - 1); c.lineTo(a[0], a[1] - LIFT + 2); c.lineTo(b[0] - 2, b[1] - LIFT - 1); c.stroke();
      }
      // 미는 방향 표시(네 변 바깥 · 밀면 그 방향이 번쩍)
      const L = this.lab(), sf = L.slideFx, fa = sf ? clamp(1 - (t - sf.t0) / 0.5, 0, 1) : 0;
      for (const k in DIRV) {
        const [du, dv] = DIRV[k], mid = S / 2;
        const u = mid + du * (S / 2 - M0 + 0.5), v = mid + dv * (S / 2 - M0 + 0.5);
        const p = P(u, v), p2 = P(u + du * 0.4, v + dv * 0.4), ang = Math.atan2(p2[1] - p[1], p2[0] - p[0]);
        const hot = sf && sf.dir === k ? fa : 0, s = 13 + 6 * hot;
        c.save(); c.translate(p[0], p[1] - LIFT); c.rotate(ang);
        c.globalAlpha = 0.45 + 0.45 * hot + 0.1 * Math.sin(t * 3);
        c.fillStyle = PLUM; c.beginPath(); c.moveTo(s + 4, 0); c.lineTo(-s, -s - 3); c.lineTo(-s * 0.3, 0); c.lineTo(-s, s + 3); c.closePath(); c.fill();
        c.fillStyle = sf && sf.no && sf.dir === k ? '#ff8a8a' : '#fff1c8'; c.beginPath(); c.moveTo(s, 0); c.lineTo(-s + 2, -s); c.lineTo(-s * 0.3 + 2, 0); c.lineTo(-s + 2, s); c.closePath(); c.fill();
        c.restore();
      }
      c.restore();
    };
    // 미끄러짐: 포탑이 옛 칸 → 새 칸으로 0.14초(그 동안 G.tiles 위치를 사이 값으로) · 합쳐진 쪽은 잔상이 앞 포탑으로 빨려 들어감
    const DUR = 0.14;
    R.slidFx = function (game, e, A) {
      const L = this.lab();
      L.slideFx = { dir: e.dir, t0: this.time };
      for (const mv of e.moves) L.anim[mv.id] = { from: G.tiles[mv.from].home, t0: this.time };
      for (const mg of e.merges) {
        const tw = game.tiles[mg.to].tower;
        L.ghosts.push({ tw: { type: tw ? tw.type : 'fire', tier: mg.tier, id: -1 }, from: G.tiles[mg.from].home, to: mg.to, t0: this.time });
      }
      if (A) { try { A.tone && A.tone({ f: 300, f2: 180, d: 0.09, v: 0.06, wave: 'triangle' }); } catch (er) { /* 소리 없음 */ } }
    };
    R.drawGhosts = function (c, game) {
      const L = this.lab();
      L.ghosts = L.ghosts.filter(gh => this.time - gh.t0 < DUR + 0.02);
      for (const gh of L.ghosts) {
        const p = clamp((this.time - gh.t0) / DUR, 0, 1), to = G.tiles[gh.to].home, e2 = ease(p);
        this.drawTower(c, game, gh.to, { at: [gh.from[0] + (to[0] - gh.from[0]) * e2, gh.from[1] + (to[1] - gh.from[1]) * e2], tw: gh.tw, scale: 1 - 0.25 * p, alpha: 1 - 0.6 * p });
      }
    };
    const baseFrame = R.frame;
    R.frame = function (game, dt, ui) {
      if (game && game.tiles) {
        const L = this.lab(), now = this.time + dt;
        for (let i = 0; i < N * N; i++) {
          const gt = G.tiles[i], tw = game.tiles[i] && game.tiles[i].tower, an = tw && L.anim[tw.id];
          if (an) {
            const p = clamp((now - an.t0) / DUR, 0, 1), e2 = ease(p);
            gt.tower = [an.from[0] + (gt.home[0] - an.from[0]) * e2, an.from[1] + (gt.home[1] - an.from[1]) * e2];
            if (p >= 1) delete L.anim[tw.id];
          } else gt.tower = gt.home;
        }
      }
      return baseFrame.call(this, game, dt, ui);
    };
  }
})(window);
