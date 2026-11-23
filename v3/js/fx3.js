// 마블 디펜스 3.2 — 캐릭터 연출 층(view3.js 위에 덮음 · 2026-11-18 사용자 요청)
//   ① 레벨 표시: 별 줄 대신 머리 위 작은 'Lv.1 ~ Lv.4 · MAX' 배지(등급 색 판 + 기울인 글씨 + 등급 오를 때 튀어 오름 · MAX는 빛 띠가 지나감)
//   ② 바라보는 방향: 왼쪽 / 오른쪽 둘뿐. 쏜 대상이 내 왼쪽이면 왼쪽, 오른쪽이면 오른쪽(그림은 왼쪽을 봄 → 오른쪽이면 뒤집음). 합친 뒤에도 다음 공격 때 다시 정해짐
//   ③ 반경: 캐릭터를 누르면 판이 살짝 어두워지고(멈추지 않음) 그 캐릭터 둘레에 디자인된 반투명 원(안쪽은 밝게 뚫림 · 도는 눈금 · 퍼지는 물결 · 범위 안 몬스터 표적)
//   ④ 공격 모션 · 탄: 계열마다 다른 몸짓과 탄(불 = 불덩이 · 숨결 / 기계 = 예광탄 + 반동 / 폭풍 = 뻗는 번개 / 서리 = 도는 얼음 조각 / 기사 = 베기 + 검기)
//      전설 · 신화는 탄이 크고 겹이 늘고 맞는 효과가 화려함. 픽셀 격자 없음 · shadowBlur 없음(아이폰) · 오프스크린 캐시 없음
// 레이어: (view3) 바탕 → 길 → 판 → 몬스터 · 아군 → [반경: 어둡게 + 원 + 고른 아군 다시] → 탄 → 맞는 효과 → 글씨
(function (root) {
  const R = root.Renderer.prototype, G = root.GEOM, D = root.DATA, TAU = Math.PI * 2;
  const GRADE = { 1: 1, 2: 2, 3: 3, 4: 3, 5: 4, 6: 5 };
  const FAM = { fire: 'fire', gatling: 'mech', bolt: 'storm', ice: 'frost', light: 'knight', corrode: 'demon', combo: 'mage' };
  const famOf = t => FAM[t] || 'fire';
  // 계열 색: [주색, 밝은 색, 짙은 색]
  const FC = { fire: ['#ff7a2a', '#ffe08a', '#c8301a'], mech: ['#ffb43a', '#fff6c8', '#d0601a'], storm: ['#b48cff', '#fff29a', '#6a3fd0'], frost: ['#7fdcff', '#f2fdff', '#2a8fd0'], knight: ['#ffd65a', '#fffbe0', '#e09a20'], demon: ['#d0487a', '#ffc4dc', '#6a1840'], mage: ['#56d6c8', '#e6fff8', '#1f7f8a'] };
  const GC = ['', ['#eceae6', '#aaa69e'], ['#a8d4ff', '#4a90e0'], ['#d8b0ff', '#8a4ae0'], ['#ffd27a', '#f08a1a'], ['#ff9aa8', '#e0304a']];   // 등급 배지 색(위, 아래)
  const GT = ['', ['#ffffff', '#ecebe6', '#bdb8ae'], ['#d6f0ff', '#6ebcff', '#2a7fe0'], ['#f0dcff', '#c08cff', '#8a3fe0'], ['#fff6c0', '#ffc23a', '#f07a10'], ['#ffe0d0', '#ff6a5a', '#d81e3c']];   // 레벨 글씨 색(위 · 가운데 · 아래)
  const OUT = '#1d1b3a';
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; };
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const ease = q => 1 - (1 - q) * (1 - q);
  const SPR = 0.52;   // 2차 그림 배율(칸 대비)
  // [v3.7] 캐릭터별 공격: 그림 2장(평소 · 공격 자세 <계열>_<등급>_atk.png — 1.4배 넓은 창, 같은 배율 · 같은 발 위치)을 바꿔 끼우고, 몸짓 · 발사 위치 · 탄 모양을 캐릭터마다 따로 둔다.
  //   전: 그림 1장을 계열 5종이 같은 식으로 밀고 찌그러뜨림 + 발사 위치가 전부 '몸 앞 30px · 위 44px' 고정 → 입 · 손 · 무기와 어긋남
  //   k = 몸짓(lunge 내지르기 · recoil 반동 · pulse 부풀기 · hop 뛰기 · breath 내뿜기 · slam 내려치기), a = 세기(px), m = 발사 위치(공격 그림 안 0~1, 왼쪽 보는 기준),
  //   s = 탄 모양, z = 탄 크기, hold = 공격 그림을 보여 주는 구간(0~1), arc = 포물선 높이
  const MOT = {
    fire: [{ k: 'lunge', a: 10, m: [0.24, 0.72], s: 'fire', z: 0.8 }, { k: 'hop', a: 8, m: [0.38, 0.46], s: 'crescent' }, { k: 'lunge', a: 18, m: [0.23, 0.77], s: 'fire', z: 1.15 }, { k: 'breath', a: 6, m: [0.23, 0.60], s: 'cone', hold: 0.75 }, { k: 'breath', a: 8, m: [0.28, 0.62], s: 'cone', hold: 0.75, z: 1.2 }],
    mech: [{ k: 'recoil', a: 6, m: [0.43, 0.60], s: 'needle', z: 0.7 }, { k: 'recoil', a: 10, m: [0.29, 0.63], s: 'orb' }, { k: 'recoil', a: 9, m: [0.25, 0.70], s: 'twin' }, { k: 'slam', a: -4, m: [0.35, 0.35], s: 'orb', arc: 46 }, { k: 'recoil', a: 7, m: [0.19, 0.72], s: 'mech' }],
    storm: [{ k: 'pulse', m: [0.24, 0.74] }, { k: 'pulse', m: [0.50, 0.60] }, { k: 'lunge', a: 8, m: [0.27, 0.75] }, { k: 'lunge', a: 14, m: [0.23, 0.67] }, { k: 'lunge', a: 12, m: [0.14, 0.67] }],
    frost: [{ k: 'hop', a: 12, m: [0.30, 0.62], s: 'orb', z: 0.7 }, { k: 'lunge', a: 8, m: [0.21, 0.69], s: 'orb' }, { k: 'hop', a: 8, m: [0.44, 0.47], s: 'frost' }, { k: 'breath', a: 8, m: [0.17, 0.71], s: 'cone', hold: 0.75 }, { k: 'slam', a: 12, m: [0.15, 0.77], s: 'crescent', z: 1.2 }],
    // [v3.9] 악마 · 마법사(공격 자세 그림이 없으면 평소 그림으로 몸짓만)
    demon: [{ k: 'hop', a: 8, m: [0.30, 0.62], s: 'orb', z: 0.8 }, { k: 'lunge', a: 14, m: [0.16, 0.50], s: 'needle' }, { k: 'pulse', m: [0.30, 0.58], s: 'orb' }, { k: 'slam', a: 10, m: [0.20, 0.62], s: 'crescent', z: 1.1 }, { k: 'breath', a: 8, m: [0.20, 0.58], s: 'cone', hold: 0.75, z: 1.2 }],
    mage: [{ k: 'lunge', a: 8, m: [0.20, 0.62], s: 'orb', z: 0.7 }, { k: 'hop', a: 8, m: [0.25, 0.75], s: 'star' }, { k: 'slam', a: 8, m: [0.22, 0.42], s: 'orb' }, { k: 'pulse', m: [0.22, 0.38], s: 'star', z: 1.1 }, { k: 'pulse', m: [0.80, 0.42], s: 'star', z: 1.3 }],
    knight: [{ k: 'slam', a: 10, m: [0.29, 0.89], s: 'crescent', z: 0.8 }, { k: 'lunge', a: 16, m: [0.09, 0.72], s: 'needle' }, { k: 'slam', a: 10, m: [0.50, 0.37], s: 'star' }, { k: 'lunge', a: 20, m: [0.09, 0.66], s: 'needle', z: 1.3 }, { k: 'slam', a: 12, m: [0.19, 0.88], s: 'knight', z: 1.2 }],
  };
  const motOf = (f, g) => (MOT[f] || MOT.fire)[Math.max(0, Math.min(4, g - 1))];
  R.atkPic = function (type, tier) { const f = famOf(type), g = GRADE[tier] || 1; return FAM[type] ? this.pic('a2k_' + f + g, 'v3/img/px/ally2/' + f + '_' + g + '_atk.png') : null; };
  const basePre = R.preload;
  R.preload = function () { basePre.call(this); for (const n in (root.FXSHEETS || {})) root.FXSHEETS[n].sheets.forEach((s, k) => this.pic('fx_' + n + k, 'v3/img/fx/' + s)); for (const f of Object.values(FAM)) for (let g = 1; g <= 5; g++) this.pic('a2k_' + f + g, 'v3/img/px/ally2/' + f + '_' + g + '_atk.png'); };
  // 발사 위치(화면 좌표): 공격 그림 안의 점(입 · 손 · 총구 · 무기 끝)을 그 캐릭터가 보는 방향에 맞춰 옮김
  R.muzzle = function (game, i) {
    const t = game.tiles[i], tw = t && t.tower; if (!tw || !FAM[tw.type]) return null;
    const p = this.drawPos(game, i, tw), f = famOf(tw.type), M = motOf(f, GRADE[tw.tier] || 1), dir = (this.face && this.face[tw.id]) || -1;
    const w = this.allySize(tw.tier) * SPR, w2 = w * 1.4;
    return [p[0] + (dir > 0 ? -1 : 1) * (M.m[0] - 0.5) * w2, p[1] - 4 - (w2 - w * 0.06) + M.m[1] * w2 + (f === 'storm' ? -6 : 0)];
  };
  // [v3.7] 끌기: 든 아군은 손가락을 따라옴 · 맨 위에 그림
  // [pixelfx 가져옴] spawn/poof · 4배 매끄럽게 · MIT — 합쳐지는 자리에 연기 퐁
  const baseMergeFx = R.mergeFx;
  R.mergeFx = function (game, i, tier) { baseMergeFx.call(this, game, i, tier); return;   // [v3.9d] 합칠 때 캐릭터를 0.5초 덮던 연기 그림을 뺌(사용자: 이상한 그림이 보임) — 흰 번쩍 + 고리 + 별만
    if (!this.fx3) return; const tw = game.tiles[i] && game.tiles[i].tower; if (!tw) return; const p = this.drawPos(game, i, tw); this.fx3.push({ k: 'sheet', key: 'merge', g: 1, x: p[0], y: p[1] - 6, t: this.time, life: 0.6, mul: tier >= 5 ? 1.35 : 1 }); };
  const baseDrawPos = R.drawPos;
  R.drawPos = function (g, i, tw) { const d = this.drag; if (d && d.from === i && d.fx != null && tw) return [d.fx, d.fy + 1e-3]; return baseDrawPos.call(this, g, i, tw); };

  // ------------------------------------------------------------------ 사건: 방향 · 총구 효과 · 맞는 효과
  const baseConsume = R.consume;
  R.consume = function (game, events, A) {
    if (!this.face) { this.face = {}; this.fx3 = []; this.trail = {}; this.lvSeen = {}; this.lvPop = {}; }
    const rest = [];
    for (const e of events) {
      if (e.ev === 'impact') { this.impact3(e); continue; }
      if (e.ev === 'fire') {
        const t = game.tiles[e.i], tw = t && t.tower;
        if (tw) {
          const p = this.drawPos(game, e.i, tw), dx = e.tx - p[0];
          if (Math.abs(dx) > 6) this.face[tw.id] = dx > 0 ? 1 : -1;   // 왼쪽 / 오른쪽 둘뿐(바로 위 · 아래면 그대로)
          const g = GRADE[tw.tier] || 1, f = famOf(tw.type), dir = this.face[tw.id] || -1;
          const prev = this.towerAnim[e.i];
          this.towerAnim[e.i] = { t: this.time, tx: e.tx, ty: e.ty, n: prev ? (prev.n || 0) + 1 : 0 };
          const mzp = this.muzzle(game, e.i) || [p[0] + dir * 30, p[1] - 44];
          if (this.fx3.length < 140) this.fx3.push({ k: 'mz', f, g, x: mzp[0], y: mzp[1], dir, t: this.time, life: f === 'knight' ? 0.2 : 0.12, s: hash(tw.id + this.time) });
          if (A && A.fire) A.fire(e.type, e.tier);
        }
        continue;
      }
      if (e.ev === 'upgrade' && e.type) { for (const t of game.tiles) if (t.tower && t.tower.type === e.type && !t.blocked) this.fx3.push({ k: 'buff', i: t.i, f: famOf(e.type), t: this.time + Math.random() * 0.12, life: 0.95, s: Math.random() }); }
      if (e.ev === 'gamble') { if (e.win && e.i >= 0) { const t = game.tiles[e.i]; if (t.tower) { this.summonFx(game, e.i); const h = G.tiles[e.i].tower; this.fx3.push({ k: 'buff', i: e.i, f: famOf(t.tower.type), t: this.time, life: 0.9, s: Math.random() }); this.say(e.tier === 3 ? '영웅!' : '희귀!', e.tier === 3 ? '#d8b0ff' : '#a8d4ff', h[0], h[1] - 80, 1, 30); } } else this.burst(360, 560, 40, '#b9b0dc'); }
      if (e.ev === 'commander') { const C = D.COMMANDERS[e.id] || {}; this.cmdFx = { id: e.id, grade: C.grade || 'rare', i: e.i, t: this.time }; if (C.grade === 'legend') { this.shake = Math.max(this.shake, 14); this.flash = 0.4; } else if (C.grade === 'epic') this.shake = Math.max(this.shake, 6); }
      rest.push(e);
    }
    return baseConsume.call(this, game, rest, A);
  };
  // [pixelfx 가져옴] 타격 · 합치기 효과 = 4배 매끄럽게 구운 시트(pixelfx_가져온목록.md). n = 이름, a~b = 쓰는 구간(0~1 · 앞뒤의 날아오는 탄 · 남는 자국은 뺌), s = 그리는 배율, t = 길이(초)
  const SHEET = { knight: { n: 'hit-spark', a: 0, b: 1, s: 0.5, t: 0.4 }, fire: { n: 'hit-spark', a: 0, b: 1, s: 0.56, t: 0.42 }, mech: { n: 'bullet-impact', a: 0, b: 0.3, s: 0.5, t: 0.36 }, storm: { n: 'zap-hit', a: 0.3, b: 0.78, s: 0.42, t: 0.4 }, frost: { n: 'ice-shatter', a: 0.2, b: 0.5, s: 0.27, t: 0.45 }, merge: { n: 'poof', a: 0, b: 0.7, s: 0.5, t: 0.6 }, demon: { n: 'hit-spark', a: 0, b: 1, s: 0.5, t: 0.4 }, mage: { n: 'zap-hit', a: 0.3, b: 0.78, s: 0.42, t: 0.4 } };
  const FXM = root.FXSHEETS || {};
  R.sheetPic = function (n, k) { return this.pic('fx_' + n + k, 'v3/img/fx/' + FXM[n].sheets[k]); };
  // 시트 한 프레임 그리기(원점 = 맞은 자리). q = 0~1 진행. 그렸으면 true(그림이 아직 안 왔으면 false → 손으로 그린 효과로 대신)
  R.drawSheet = function (c, key, x, y, q, mul, flip) {
    const S = SHEET[key], M = S && FXM[S.n]; if (!M) return false;
    const fi = Math.min(M.frames.length - 1, Math.floor((S.a + (S.b - S.a) * q) * M.frames.length)), fr = M.frames[fi], im = this.sheetPic(S.n, fr[0]); if (!im) return false;
    const sc = S.s * (mul || 1), w = M.size[0], h = M.size[1];
    c.save(); c.translate(x, y); if (flip) c.scale(-1, 1); c.drawImage(im, fr[1], fr[2], w, h, -M.origin[0] * sc, -M.origin[1] * sc + (key === 'merge' ? 0 : h * sc * 0.12), w * sc, h * sc); c.restore();
    return true;
  };
  R.impact3 = function (e) {
    if (e.x == null || this.fx3.length > 160) return;
    const f = famOf(e.type);
    this.fx3.push({ k: 'hit', f, g: GRADE[e.tier] || 1, x: e.x, y: e.y - 18, t: this.time, life: SHEET[f] ? SHEET[f].t : 0.3, s: Math.random(), big: e.big });
  };

  // ------------------------------------------------------------------ 아군: 몸짓 · 방향 · 레벨 배지
  R.drawAlly = function (c, game, t, hi) {
    if (!this.face) { this.face = {}; this.fx3 = []; this.trail = {}; this.lvSeen = {}; this.lvPop = {}; }
    const tw = t.tower, T = this.time, pos = this.drawPos(game, t.i, tw), x = pos[0], y = pos[1], size = this.allySize(tw.tier);
    const f = famOf(tw.type), g = GRADE[tw.tier] || 1, dir = this.face[tw.id] || -1;
    const an = this.towerAnim[t.i], aps = game.apsOf ? Math.max(0.5, game.apsOf(t.i)) : 1, dur = Math.min(0.42, Math.max(0.2, 0.85 / aps));
    const M = motOf(f, g), drg = this.drag && this.drag.from === t.i; let atk = false;
    const at = an ? T - an.t : 9, q = at < dur ? at / dur : -1;
    const pop = this.pop[tw.id] != null ? T - this.pop[tw.id] : 9;
    // 기본 숨쉬기(폭풍은 둥둥 떠 있음)
    let ox = 0, oy = f === 'storm' ? -6 + Math.sin(T * 2.6 + t.i) * 4 : 0, sx = 1 + Math.sin(T * 2.4 + t.i) * 0.018, sy = 1 / sx, rot = 0;
    if (pop >= 0 && pop < 0.35) { const k = pop / 0.35, b = Math.sin(k * Math.PI); sx = 1 + b * 0.22; sy = 1 - b * 0.14; if (k < 0.25) { sx *= 0.6 + k * 1.6; sy *= 0.6 + k * 1.6; } }
    else if (q >= 0) {
      // 공격 몸짓: 앞 30% = 모으기(뒤로 움츠림), 뒤 70% = 지르기 → 돌아옴
      // [v3.7] 쏘는 순간 바로 공격 그림으로 바뀌고(탄이 떠나는 때와 맞음) → 잠깐 버팀 → 평소 그림으로 돌아오며 가라앉음. e = 세기(0 → 1 → 0.75 → 0)
      const e = q < 0.12 ? q / 0.12 : q < 0.55 ? 1 - (q - 0.12) / 0.43 * 0.25 : 0.75 * (1 - (q - 0.55) / 0.45), A = M.a || 10;
      atk = q < (M.hold || 0.6);
      if (M.k === 'lunge') { ox = dir * A * e; rot = dir * 0.05 * e; }
      else if (M.k === 'recoil') { ox = -dir * A * e; rot = -dir * 0.07 * e; }
      else if (M.k === 'pulse') { sx = 1 + 0.13 * e; sy = 1 + 0.13 * e; oy -= 5 * e; }
      else if (M.k === 'hop') { oy -= A * Math.sin(Math.min(1, q / 0.7) * Math.PI); ox = dir * 4 * e; }
      else if (M.k === 'breath') { ox = dir * A * e; sx = 1 + 0.05 * e; sy = 1 - 0.03 * e; }
      else { ox = dir * A * e; oy += 3 * e; rot = dir * 0.1 * e; sx = 1 + 0.06 * e; sy = 1 - 0.05 * e; }
      if (q >= 0.6 && q < 0.8) { const b = Math.sin((q - 0.6) / 0.2 * Math.PI); sx *= 1 + 0.05 * b; sy *= 1 - 0.05 * b; }   // 돌아오며 살짝 눌림
    }
    const dis = game.disabled ? game.disabled(t.i) : false, stop = game.t < (t.stopUntil || 0);
    const col = GC[g][1];
    if (drg) { oy -= 14; sx *= 1.1; sy *= 1.1;
      if (this.drag.moveTo != null) { const h = G.tiles[this.drag.moveTo].tower, hy = h[1] + G.CFG.cell * 0.3 - 4, b = 0.5 + 0.5 * Math.sin(T * 9); c.save(); c.strokeStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * b) + ')'; c.lineWidth = 4; c.setLineDash([10, 7]); c.lineDashOffset = -T * 30; c.beginPath(); c.ellipse(h[0], hy, 34, 12, 0, 0, TAU); c.stroke(); c.restore(); } }
    // [v3.7] 합칠 수 있는 짝 표시: 고르거나 든 아군과 같은 계열 · 같은 등급이면 발밑 고리가 뛰고 살짝 들썩임(든 아군이 닿은 짝은 더 밝게)
    const src = this.drag ? this.drag.from : this.sel, mate = game.dragMode && src != null && src !== t.i && game.canMerge(src, t.i), tgt = this.drag && this.drag.target === t.i;
    if (mate) { const b = 0.5 + 0.5 * Math.sin(T * 9); oy -= 3 * b; c.save(); c.strokeStyle = rgba(tgt ? '#ffffff' : GC[g][0], tgt ? 1 : 0.55 + 0.4 * b); c.lineWidth = tgt ? 6 : 4; c.beginPath(); c.ellipse(x, y - 4, 36 + 4 * b + (tgt ? 6 : 0), 13 + 1.5 * b + (tgt ? 2 : 0), 0, 0, TAU); c.stroke(); c.restore(); }
    // 발밑: 그림자 + 등급 빛(전설 · 신화는 도는 고리)
    c.save();
    c.fillStyle = 'rgba(20,10,30,' + (drg ? 0.16 : 0.26) + ')'; c.beginPath(); c.ellipse(x, y - 2, drg ? 24 : 30, drg ? 7 : 9, 0, 0, TAU); c.fill();
    if (g >= 2) { const gl = c.createRadialGradient(x, y - 4, 2, x, y - 4, 46); gl.addColorStop(0, rgba(col, g >= 4 ? 0.75 : 0.5)); gl.addColorStop(1, rgba(col, 0)); c.fillStyle = gl; c.beginPath(); c.ellipse(x, y - 4, 46, 16, 0, 0, TAU); c.fill(); }
    if (g >= 4) {
      c.strokeStyle = rgba(GC[g][0], 0.9); c.lineWidth = 3; c.setLineDash([9, 7]); c.lineDashOffset = -T * 34; c.beginPath(); c.ellipse(x, y - 4, 38, 13, 0, 0, TAU); c.stroke(); c.setLineDash([]);
      if (g >= 5) for (let k = 0; k < 3; k++) { const a = T * 1.6 + k * TAU / 3, px = x + Math.cos(a) * 40, py = y - 6 + Math.sin(a) * 13 - 10 * Math.abs(Math.sin(T * 2 + k)); this.star(c, px, py, 4, '#fff2b0'); }
    }
    c.restore();
    // 몸
    const im = this.allyPic(tw.type, tw.tier), ima = atk && im ? this.atkPic(tw.type, tw.tier) : null;
    c.save(); c.translate(x + ox, y - 4 + oy);
    if (dir > 0) c.scale(-1, 1);   // 그림은 왼쪽을 본다
    c.rotate(dir > 0 ? -rot : rot); c.scale(sx, sy);
    if (dis || stop) c.filter = 'grayscale(0.85) brightness(0.8)';
    let top = 84;
    if (im) { const two = im.src.indexOf('ally2') >= 0, w = size * (two ? SPR : 1), h = w * im.naturalHeight / im.naturalWidth; if (ima && two) c.drawImage(ima, -w * 0.7, -(h * 1.4 - h * 0.06), w * 1.4, h * 1.4); else c.drawImage(im, -w / 2, -h * 0.94, w, h); top = two ? h * 0.9 : h * 0.72; }
    c.filter = 'none';
    c.restore();
    // [v3.9d] 든 아군 위 화살표(통통 튀는 ▼) — 아군이 많을 때 무엇을 들었는지 보이게
    if (drg) { const b = Math.abs(Math.sin(T * 6)) * 8, ax = x + ox, ay = y - 4 + oy - top - 44 - b; c.save(); c.lineJoin = 'round'; c.fillStyle = '#ffe14a'; c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(ax - 15, ay - 12); c.lineTo(ax + 15, ay - 12); c.lineTo(ax, ay + 8); c.closePath(); c.stroke(); c.fill(); c.restore(); }
    // 레벨 배지(머리 위)
    if (this.lvSeen[tw.id] !== tw.tier) { if (this.lvSeen[tw.id] != null) this.lvPop[tw.id] = T; this.lvSeen[tw.id] = tw.tier; }
    this.lvBadge(c, x, y - 4 + oy - top - 6, g, T - (this.lvPop[tw.id] != null ? this.lvPop[tw.id] : -9), t.i);
    if (tw.tier === 5 && game.mythState && !game.dragMode) {   // 전설: 신화 각성 게이지
      const st = game.mythState(t.i), k = st ? st.gauge : 0, bw = 58, by = y + 10;
      c.fillStyle = 'rgba(20,14,30,0.75)'; this.rr(c, x - bw / 2 - 2, by - 2, bw + 4, 10, 5); c.fill();
      c.fillStyle = k >= 1 ? (Math.sin(T * 8) > 0 ? '#ffe14a' : '#ff8a3a') : '#ff9a3a'; if (k > 0.04) { this.rr(c, x - bw / 2, by, bw * k, 6, 3); c.fill(); }
    }
    if (t.occ) { c.fillStyle = 'rgba(80,20,40,0.55)'; this.rr(c, x - 44, y - 96, 88, 96, 18); c.fill(); }
    if (t.warn) { const k = Math.max(0, (t.warn.until - game.t) / 15); c.strokeStyle = '#ff4a4a'; c.lineWidth = 5; c.beginPath(); c.arc(x, y - 44, 50, -Math.PI / 2, -Math.PI / 2 + TAU * k); c.stroke(); }
  };
  // 레벨 글씨: 판(배경) 없음. 굵은 남색 윤곽 2겹 + 등급 색 그라데이션 글씨 + 윗빛. 등급: 회백 · 파랑 · 보라 · 주황금 · 진홍(MAX)
  //   age = 등급이 바뀐 뒤 지난 시간(튀어 오름 · 별 조각) · 전설 · MAX는 빛 띠가 글씨 위로 지나감
  R.lvBadge = function (c, x, y, g, age, seed) {
    // [v3.9] 시안의 레벨 표: 짙은 남색 판 + 흰 픽셀 글씨(갈무리11 · 판 캔버스의 논리 픽셀 2px에 맞춰 22px). MAX는 금색. 등급이 오르면 튀어 오름
    const max = g >= 5, txt = max ? 'MAX' : 'Lv.' + g; let lift = 0;
    if (age >= 0 && age < 0.4) lift = -Math.sin(age / 0.4 * Math.PI) * 10;
    // [v3.9d] 판(배경) 없이 글씨만: 굵은 남색 테 + 아래 두께 + 등급 색(위는 밝게 · 아래는 짙게 두 톤) — 밝은 칸 · 어두운 칸 모두에서 읽힘
    c.save(); c.font = '24px Gal, Jua, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
    const ty = y + lift + 4;
    c.strokeStyle = OUT; c.lineWidth = 7; c.strokeText(txt, x, ty + 2.5); c.strokeText(txt, x, ty);
    c.fillStyle = GT[g][2]; c.fillText(txt, x, ty);
    c.save(); c.beginPath(); c.rect(x - 60, ty - 30, 120, 19); c.clip(); c.fillStyle = g === 1 ? '#ffffff' : GT[g][1]; c.fillText(txt, x, ty); c.restore();
    c.restore();
    if (age >= 0 && age < 0.45) { const k = age / 0.45; for (let n = 0; n < 5; n++) { const a = -Math.PI / 2 + (n - 2) * 0.55, d = 14 + k * 26; c.globalAlpha = 1 - k; this.star(c, x + Math.cos(a) * d, y + Math.sin(a) * d, 4.5 * (1 - k * 0.5), GT[g][1]); } c.globalAlpha = 1; }
  };

  // ------------------------------------------------------------------ 반경(누른 캐릭터): 어둡게 + 뚫린 원 + 눈금 고리 + 물결 + 표적
  R.drawSel = function (c, game) {
    if (this.sel == null || !game.tiles[this.sel] || !game.tiles[this.sel].tower) { this._selA = 0; return; }
    if (game.allRange) {   // [v3.8] 사거리 없음: 범위 원 · 어둡게 대신 고른 아군 발밑 고리만(합칠 짝은 drawAlly가 표시)
      const tw0 = game.tiles[this.sel].tower, p0 = this.drawPos(game, this.sel, tw0), b0 = 0.5 + 0.5 * Math.sin(this.time * 7);
      c.save(); c.strokeStyle = 'rgba(255,255,255,' + (0.75 + 0.25 * b0) + ')'; c.lineWidth = 5; c.beginPath(); c.ellipse(p0[0], p0[1] - 4, 38 + 2 * b0, 13.5 + b0, 0, 0, TAU); c.stroke(); c.restore(); this.drawAlly(c, game, game.tiles[this.sel], true); return;
    }
    const i = this.sel, t = game.tiles[i], tw = t.tower, T = this.time, p = this.drawPos(game, i, tw), x = p[0], y = p[1] - 30;
    const r = (game.rangeOf ? game.rangeOf(i) + 1 : 2.5) * G.u, a = ease(Math.min(1, (T - this.selT) * 5)), rr = r * (0.6 + 0.4 * a);
    const f = famOf(tw.type), col = FC[f][0], lite = FC[f][1], H = G.CFG.FIELD_H || 900;
    c.save();
    // 판 어둡게(원 안은 뚫림)
    c.fillStyle = 'rgba(12,8,28,' + (0.55 * a) + ')'; c.beginPath(); c.rect(0, 0, 720, H); c.arc(x, y, rr, 0, TAU, true); c.fill('evenodd');
    // 원 안: 가장자리로 갈수록 계열 색
    const gr = c.createRadialGradient(x, y, rr * 0.35, x, y, rr); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.75, rgba(col, 0.1 * a)); gr.addColorStop(1, rgba(col, 0.34 * a));
    c.fillStyle = gr; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill();
    // 퍼지는 물결 2겹
    for (let k = 0; k < 2; k++) { const q = (T * 0.55 + k * 0.5) % 1; c.strokeStyle = rgba(lite, 0.4 * (1 - q) * a); c.lineWidth = 3; c.beginPath(); c.arc(x, y, rr * q, 0, TAU); c.stroke(); }
    // 테: 짙은 바깥 선 + 밝은 선 + 안쪽 가는 선
    c.lineWidth = 7; c.strokeStyle = rgba(OUT, 0.55 * a); c.beginPath(); c.arc(x, y, rr, 0, TAU); c.stroke();
    c.lineWidth = 3.5; c.strokeStyle = rgba(lite, 0.95 * a); c.beginPath(); c.arc(x, y, rr, 0, TAU); c.stroke();
    c.lineWidth = 1.5; c.strokeStyle = rgba(col, 0.7 * a); c.beginPath(); c.arc(x, y, rr - 9, 0, TAU); c.stroke();
    // 도는 눈금(짧은 금 36개 · 굵은 화살촉 4개)
    c.save(); c.translate(x, y); c.rotate(T * 0.35);
    for (let k = 0; k < 36; k++) { const an = k / 36 * TAU, big = k % 9 === 0; c.strokeStyle = rgba(lite, (big ? 0.95 : 0.5) * a); c.lineWidth = big ? 3.5 : 2; c.beginPath(); c.moveTo(Math.cos(an) * (rr - (big ? 22 : 15)), Math.sin(an) * (rr - (big ? 22 : 15))); c.lineTo(Math.cos(an) * (rr - 9), Math.sin(an) * (rr - 9)); c.stroke(); }
    c.rotate(-T * 0.9);
    for (let k = 0; k < 4; k++) { const an = k / 4 * TAU; c.save(); c.rotate(an); c.translate(rr + 2, 0); c.fillStyle = rgba(lite, a); c.strokeStyle = rgba(OUT, 0.7 * a); c.lineWidth = 2; c.beginPath(); c.moveTo(-9, 0); c.lineTo(6, -8); c.lineTo(2, 0); c.lineTo(6, 8); c.closePath(); c.fill(); c.stroke(); c.restore(); }
    c.restore();
    // 범위 안 몬스터 표적
    const inR = game.inRange ? game.inRange(i, game.rangeOf(i), tw.type) : [];
    for (const m of inR) { const s = 22 + (m.boss ? 30 : 0), q = T * 3; c.strokeStyle = rgba('#ffffff', 0.9 * a); c.lineWidth = 3; for (let k = 0; k < 4; k++) { const an = q + k * Math.PI / 2; c.beginPath(); c.arc(m.x, m.y - 24, s, an, an + 0.8); c.stroke(); } }
    c.restore();
    this.drawAlly(c, game, t, true);   // 고른 캐릭터는 어둠 위에 다시
  };

  // ------------------------------------------------------------------ 탄
  R.drawShots = function (c, game) {
    if (!this.trail) this.trail = {};
    const T = this.time, live = {};
    for (const s of game.shots) {
      if (s.delay > 0 || s.done) continue;
      live[s.id] = 1;
      const tr = this.trail[s.id] || (this.trail[s.id] = []);
      const f = famOf(s.type), g = GRADE[s.tier] || 1, big = g >= 4, myth = g >= 5, C = FC[f], M = motOf(f, g), kd = M.s || f;
      // [v3.7] 탄은 그 캐릭터의 발사 위치(입 · 손 · 총구 · 무기 끝)에서 떠나 규칙상의 길로 합쳐짐(가는 동안 어긋남이 0으로 줄어듦)
      const mz = s.i != null && game.tiles[s.i] && game.tiles[s.i].tower && game.tiles[s.i].tower.type === s.type ? this.muzzle(game, s.i) : null;
      const tot = Math.hypot(s.tx - s.sx, s.ty - s.sy) || 1, pr = Math.min(1, Math.hypot(s.x - s.sx, s.y - s.sy) / tot);
      const SX = mz ? mz[0] : s.sx, SY = mz ? mz[1] : s.sy, X = s.x + (SX - s.sx) * (1 - pr), Y = s.y + (SY - s.sy) * (1 - pr) - (M.arc ? Math.sin(pr * Math.PI) * M.arc : 0);
      tr.push(X, Y); if (tr.length > 12) tr.splice(0, 2);
      const dx = s.tx - SX, dy = s.ty - SY, a = Math.atan2(dy, dx) - (M.arc ? Math.cos(pr * Math.PI) * 0.6 * (dx < 0 ? -1 : 1) : 0), k = (big ? (myth ? 1.7 : 1.35) : 1) * (M.z || 1);
      if (f === 'storm') { this.bolt3(c, SX, SY, X, Y, C, k, s.id, T); continue; }
      // 꼬리(지나온 자리)
      const n = tr.length / 2;
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let q = 0; q < n - 1; q++) {
        const px = tr[q * 2], py = tr[q * 2 + 1], w = (q + 1) / n;
        if (f === 'fire') { c.fillStyle = rgba(q % 2 ? C[0] : C[2], 0.5 * w); c.beginPath(); c.arc(px + Math.sin(T * 30 + q) * 2, py, (3 + 7 * w) * k, 0, TAU); c.fill(); }
        else if (f === 'frost') { c.fillStyle = rgba(C[1], 0.55 * w); this.star(c, px + Math.sin(q * 2.1 + s.id) * 5, py + Math.cos(q * 1.7 + s.id) * 5, 3.5 * w * k, rgba(C[1], 0.7 * w)); }
        else if (f === 'knight') { c.fillStyle = rgba(C[0], 0.3 * w); c.beginPath(); c.arc(px, py, 6 * w * k, 0, TAU); c.fill(); }
      }
      c.restore();
      c.save(); c.translate(X, Y); c.rotate(a);
      { const gw = Math.min(1, pr * tot / (46 * k)); if (gw < 1) c.scale(0.3 + 0.7 * gw, 0.55 + 0.45 * gw); }   // 막 떠난 탄은 작게 시작해 자람 — 꼬리가 캐릭터 몸을 덮지 않게
      if (kd === 'crescent') {   // 휘두른 자국: 초승달(불꼬리 · 얼음 발톱 · 몽둥이)
        const r = 13 * k;
        c.fillStyle = rgba(C[2], 0.9); c.beginPath(); c.arc(-r * 0.5, 0, r * 1.25, -1.15, 1.15); c.arc(-r * 1.1, 0, r * 1.25, 0.85, -0.85, true); c.closePath(); c.fill();
        c.fillStyle = C[0]; c.beginPath(); c.arc(-r * 0.5, 0, r * 1.12, -1.05, 1.05); c.arc(-r * 0.95, 0, r * 1.12, 0.8, -0.8, true); c.closePath(); c.fill();
        c.fillStyle = C[1]; c.beginPath(); c.arc(-r * 0.5, 0, r, -0.85, 0.85); c.arc(-r * 0.78, 0, r, 0.68, -0.68, true); c.closePath(); c.fill();
      } else if (kd === 'needle') {   // 찌르기 · 가는 광선: 앞이 뾰족한 긴 바늘
        const L = 34 * k, w = 4.5 * k;
        c.fillStyle = OUT; c.beginPath(); c.moveTo(8, 0); c.lineTo(-L * 0.25, -w - 2); c.lineTo(-L, 0); c.lineTo(-L * 0.25, w + 2); c.closePath(); c.fill();
        c.fillStyle = C[0]; c.beginPath(); c.moveTo(5, 0); c.lineTo(-L * 0.25, -w); c.lineTo(-L + 4, 0); c.lineTo(-L * 0.25, w); c.closePath(); c.fill();
        c.fillStyle = C[1]; c.beginPath(); c.moveTo(4, 0); c.lineTo(-L * 0.2, -w * 0.45); c.lineTo(-L * 0.7, 0); c.closePath(); c.fill();
      } else if (kd === 'orb') {   // 던진 덩어리: 포탄 · 눈덩이(짙은 테 + 밝은 면 + 반짝)
        const r = 9 * k;
        c.fillStyle = OUT; c.beginPath(); c.arc(0, 0, r + 2.5, 0, TAU); c.fill();
        c.fillStyle = f === 'mech' ? '#5a5560' : C[1]; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
        c.fillStyle = f === 'mech' ? '#8a8490' : '#ffffff'; c.beginPath(); c.arc(r * 0.25, -r * 0.3, r * 0.5, 0, TAU); c.fill();
        if (f === 'mech') { c.fillStyle = C[0]; c.beginPath(); c.arc(-r - 3, 0, 4 + Math.sin(T * 40 + s.id) * 1.5, 0, TAU); c.fill(); }
      } else if (kd === 'twin') {   // 쌍포: 예광탄 두 줄
        const L = 24 * k, w = 3.5 * k;
        for (const off of [-6, 6]) { const tg = c.createLinearGradient(-L, 0, 4, 0); tg.addColorStop(0, rgba(C[2], 0)); tg.addColorStop(0.6, rgba(C[0], 0.85)); tg.addColorStop(1, '#ffffff'); c.strokeStyle = tg; c.lineWidth = w * 1.8; c.lineCap = 'round'; c.beginPath(); c.moveTo(-L, off); c.lineTo(2, off); c.stroke(); c.fillStyle = C[1]; c.beginPath(); c.ellipse(3, off, w * 1.4, w, 0, 0, TAU); c.fill(); }
      } else if (kd === 'star') {   // 철퇴: 도는 가시 공
        c.rotate(T * 14 + s.id); const r = 10 * k;
        c.fillStyle = OUT; c.beginPath(); for (let n = 0; n < 16; n++) { const an = n / 16 * TAU, rr = (n % 2 ? r : r * 1.7) + 2; c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } c.closePath(); c.fill();
        c.fillStyle = C[0]; c.beginPath(); for (let n = 0; n < 16; n++) { const an = n / 16 * TAU, rr = n % 2 ? r * 0.9 : r * 1.5; c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } c.closePath(); c.fill();
        c.fillStyle = C[1]; c.beginPath(); c.arc(-r * 0.2, -r * 0.2, r * 0.45, 0, TAU); c.fill();
      } else if (kd === 'fire' || kd === 'cone') {
        // 불덩이: 뒤로 흔들리는 불꼬리 3갈래 + 짙은 테 + 밝은 속
        const r = (kd === 'cone' ? 11 : 9) * k, wob = Math.sin(T * 40 + s.id); if (kd === 'cone') c.scale(1.5, 1);   // 내뿜기: 길게 늘인 불 · 냉기 혀
        c.fillStyle = C[2]; c.beginPath(); c.moveTo(r * 0.6, -r); c.quadraticCurveTo(-r * 2.2, -r * 1.3 + wob * 3, -r * 3.4, wob * 4); c.quadraticCurveTo(-r * 2.2, r * 1.3 + wob * 3, r * 0.6, r); c.closePath(); c.fill();
        c.fillStyle = C[0]; c.beginPath(); c.moveTo(r * 0.7, -r * 0.8); c.quadraticCurveTo(-r * 1.4, -r * 0.9 - wob * 2, -r * 2.4, -wob * 3); c.quadraticCurveTo(-r * 1.4, r * 0.9 - wob * 2, r * 0.7, r * 0.8); c.closePath(); c.fill();
        const gr = c.createRadialGradient(r * 0.1, 0, 1, 0, 0, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, C[1]); gr.addColorStop(1, C[0]);
        c.fillStyle = gr; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
        if (big) { c.strokeStyle = rgba(C[1], 0.8); c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, r + 5 + wob * 2, -1.1, 1.1); c.stroke(); }
        if (myth) { c.strokeStyle = rgba('#ffffff', 0.7); c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r + 11 - wob * 2, -0.8, 0.8); c.stroke(); }
      } else if (kd === 'mech') {
        // 예광탄: 긴 빛줄기(뒤로 사라짐) + 뜨거운 머리
        const L = 30 * k, w = 4 * k;
        const tg = c.createLinearGradient(-L, 0, 4, 0); tg.addColorStop(0, rgba(C[2], 0)); tg.addColorStop(0.6, rgba(C[0], 0.85)); tg.addColorStop(1, '#ffffff');
        c.strokeStyle = tg; c.lineWidth = w * 1.9; c.lineCap = 'round'; c.beginPath(); c.moveTo(-L, 0); c.lineTo(2, 0); c.stroke();
        c.strokeStyle = '#ffffff'; c.lineWidth = w * 0.7; c.beginPath(); c.moveTo(-L * 0.45, 0); c.lineTo(3, 0); c.stroke();
        c.fillStyle = C[1]; c.beginPath(); c.ellipse(3, 0, w * 1.5, w, 0, 0, TAU); c.fill();
        if (myth) { c.strokeStyle = rgba('#ff5a3a', 0.8); c.lineWidth = 2; c.beginPath(); c.moveTo(-L, -5); c.lineTo(-6, -5); c.moveTo(-L, 5); c.lineTo(-6, 5); c.stroke(); }
      } else if (kd === 'frost') {
        // 얼음 조각: 빙글 도는 마름모 결정(밝은 면 · 어두운 면) + 큰 등급은 작은 조각 둘이 따라 돎
        c.rotate(T * 16 + s.id);
        const r = 11 * k;
        c.fillStyle = C[2]; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(r * 1.3, 0); c.lineTo(0, r * 0.62); c.lineTo(-r * 1.3, 0); c.lineTo(0, -r * 0.62); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = C[0]; c.beginPath(); c.moveTo(r * 1.3, 0); c.lineTo(0, -r * 0.62); c.lineTo(-r * 1.3, 0); c.closePath(); c.fill();
        c.fillStyle = C[1]; c.beginPath(); c.moveTo(r * 0.9, -1); c.lineTo(0, -r * 0.5); c.lineTo(-r * 0.3, -1); c.closePath(); c.fill();
        if (big) for (let q = 0; q < (myth ? 3 : 2); q++) { const an = q * TAU / (myth ? 3 : 2), px = Math.cos(an) * r * 1.9, py = Math.sin(an) * r * 1.9; c.fillStyle = C[1]; c.beginPath(); c.moveTo(px + 5, py); c.lineTo(px, py + 3); c.lineTo(px - 5, py); c.lineTo(px, py - 3); c.closePath(); c.fill(); }
      } else {
        // 검기: 초승달 칼빛(바깥 금빛 · 안쪽 흰빛)
        const r = 15 * k;
        c.fillStyle = rgba(C[2], 0.9); c.beginPath(); c.arc(-r * 0.5, 0, r * 1.25, -1.15, 1.15); c.arc(-r * 1.1, 0, r * 1.25, 0.85, -0.85, true); c.closePath(); c.fill();
        c.fillStyle = C[0]; c.beginPath(); c.arc(-r * 0.5, 0, r * 1.12, -1.05, 1.05); c.arc(-r * 0.95, 0, r * 1.12, 0.8, -0.8, true); c.closePath(); c.fill();
        c.fillStyle = '#ffffff'; c.beginPath(); c.arc(-r * 0.5, 0, r, -0.85, 0.85); c.arc(-r * 0.78, 0, r, 0.68, -0.68, true); c.closePath(); c.fill();
        if (big) { c.strokeStyle = rgba(C[1], 0.85); c.lineWidth = 2.5; c.beginPath(); c.arc(-r * 0.5, 0, r * 1.5, -0.7, 0.7); c.stroke(); }
        if (myth) { this.star(c, r * 0.9, 0, 7, '#ffffff'); }
      }
      c.restore();
    }
    for (const id in this.trail) if (!live[id]) delete this.trail[id];
  };
  // 번개: 캐릭터에서 탄 자리까지 뻗는 꺾인 빛줄기(40ms마다 모양이 바뀌어 지직거림) + 머리 불꽃
  R.bolt3 = function (c, x0, y0, x1, y1, C, k, id, T) {
    const d = Math.hypot(x1 - x0, y1 - y0); if (d < 4) return;
    const seg = Math.max(3, Math.round(d / 26)), fr = Math.floor(T * 25), nx = -(y1 - y0) / d, ny = (x1 - x0) / d;
    const path = off => { c.beginPath(); c.moveTo(x0, y0); for (let q = 1; q < seg; q++) { const w = q / seg, j = (hash(id * 7 + q * 13 + fr + off) - 0.5) * 20 * k; c.lineTo(x0 + (x1 - x0) * w + nx * j, y0 + (y1 - y0) * w + ny * j); } c.lineTo(x1, y1); };
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = rgba(C[2], 0.55); c.lineWidth = 10 * k; path(0); c.stroke();
    c.strokeStyle = rgba(C[0], 0.9); c.lineWidth = 5 * k; path(0); c.stroke();
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = '#ffffff'; c.lineWidth = 2.2 * k; path(0); c.stroke();
    if (k > 1.2) { c.strokeStyle = rgba(C[1], 0.8); c.lineWidth = 2; path(50); c.stroke(); }
    const r = 7 * k; const gr = c.createRadialGradient(x1, y1, 0, x1, y1, r * 2); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, C[1]); gr.addColorStop(1, rgba(C[0], 0));
    c.fillStyle = gr; c.beginPath(); c.arc(x1, y1, r * 2, 0, TAU); c.fill();
    c.restore();
  };

  // ------------------------------------------------------------------ 총구 · 맞는 효과
  const baseFx = R.drawFx;
  R.drawFx = function (c, dt) {
    baseFx.call(this, c, dt);
    if (!this.fx3) return;
    const T = this.time;
    for (const e of this.fx3) {
      const q = (T - e.t) / e.life; if (q < 0 || q > 1) continue;
      const C = FC[e.f], k = e.g >= 5 ? 1.7 : e.g >= 4 ? 1.35 : 1, inv = 1 - q;
      c.save(); c.translate(e.x, e.y);
      if (e.k === 'buff') { c.restore(); this.buffFx(c, e, q); continue; }
      if (e.k === 'sheet') { c.restore(); this.drawSheet(c, e.key, e.x, e.y, q, e.mul, false); continue; }
      if (e.k === 'hit' && e.g < 4) { c.restore(); if (this.drawSheet(c, e.f, e.x, e.y, q, 1, e.s > 0.5)) continue; c.save(); c.translate(e.x, e.y); }   // 일반 ~ 영웅 = 구운 시트만 / 전설 · 신화 = 시트 + 손으로 그린 큰 효과
      if (e.k === 'hit' && e.g >= 4) { c.restore(); this.drawSheet(c, e.f, e.x, e.y, Math.min(1, q * 1.2), k, e.s > 0.5); c.save(); c.translate(e.x, e.y); }
      if (e.k === 'mz') {
        c.scale(e.dir, 1);
        if (e.f === 'mech') {   // 총구 불꽃: 앞으로 뻗는 별꼴
          c.globalCompositeOperation = 'lighter'; c.fillStyle = rgba(C[0], inv);
          c.beginPath(); for (let n = 0; n < 8; n++) { const an = n / 8 * TAU, rr = (n % 2 ? 5 : n === 0 ? 26 : 13) * k * (0.6 + q * 0.6); c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } c.closePath(); c.fill();
          c.fillStyle = rgba('#ffffff', inv); c.beginPath(); c.arc(0, 0, 5 * k, 0, TAU); c.fill();
        } else if (e.f === 'knight') {   // 베기: 캐릭터 앞에 큰 초승달이 위에서 아래로 쓸고 지나감
          const r = 34 * k, sw = -1.2 + q * 2.4;
          c.rotate(sw * 0.5); c.globalAlpha = inv;
          c.fillStyle = C[0]; c.beginPath(); c.arc(-r * 0.4, 0, r, -1.1, 1.1); c.arc(-r * 0.85, 0, r, 0.8, -0.8, true); c.closePath(); c.fill();
          c.fillStyle = '#ffffff'; c.beginPath(); c.arc(-r * 0.4, 0, r * 0.9, -0.9, 0.9); c.arc(-r * 0.68, 0, r * 0.9, 0.7, -0.7, true); c.closePath(); c.fill();
        } else if (e.f === 'storm') {   // 기 모음: 안으로 조여 드는 고리 + 불꽃
          c.strokeStyle = rgba(C[1], inv); c.lineWidth = 3; c.beginPath(); c.arc(-8, 0, (20 - 12 * q) * k, 0, TAU); c.stroke();
        } else if (e.f === 'fire') {   // 입김: 앞으로 짧은 불 혀
          c.globalCompositeOperation = 'lighter'; c.fillStyle = rgba(C[0], inv * 0.9);
          c.beginPath(); c.moveTo(-6, -7 * k); c.quadraticCurveTo(18 * k * (0.5 + q), 0, -6, 7 * k); c.closePath(); c.fill();
        } else {   // 서리: 눈가루 흩날림
          for (let n = 0; n < 4; n++) { const an = -0.6 + n * 0.4 + e.s, d = 8 + q * 22; this.star(c, Math.cos(an) * d, Math.sin(an) * d - 4, 4 * inv * k, rgba(C[1], inv)); }
        }
      } else {
        const s0 = e.s * 10;
        if (e.f === 'fire') {   // 할퀸 자국 3줄 + 불똥
          c.globalCompositeOperation = 'lighter';
          const gr = c.createRadialGradient(0, 0, 0, 0, 0, 30 * k * (0.5 + q)); gr.addColorStop(0, rgba('#ffffff', inv)); gr.addColorStop(0.4, rgba(C[0], inv * 0.8)); gr.addColorStop(1, rgba(C[2], 0));
          c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 30 * k * (0.5 + q), 0, TAU); c.fill();
          c.globalCompositeOperation = 'source-over'; c.rotate(-0.7 + e.s);
          c.lineCap = 'round';
          for (let n = -1; n <= 1; n++) { const len = (22 - Math.abs(n) * 5) * k, off = Math.min(1, q * 2.5); c.strokeStyle = rgba(C[2], inv); c.lineWidth = 7; c.beginPath(); c.moveTo(-len, n * 10 * k); c.quadraticCurveTo(0, n * 10 * k - 8, -len + len * 2 * off, n * 10 * k); c.stroke(); c.strokeStyle = rgba(C[1], inv); c.lineWidth = 3; c.stroke(); }
          for (let n = 0; n < (k > 1 ? 7 : 4); n++) { const an = hash(s0 + n) * TAU, d = (10 + 34 * q) * k; c.fillStyle = rgba(C[1], inv); c.beginPath(); c.arc(Math.cos(an) * d, Math.sin(an) * d - q * 10, 2.5 * inv + 1, 0, TAU); c.fill(); }
        } else if (e.f === 'mech') {   // 튀는 불똥: 짧은 선 + 흰 번쩍
          c.globalCompositeOperation = 'lighter';
          this.star(c, 0, 0, (16 - 8 * q) * k, rgba('#ffffff', inv));
          c.strokeStyle = rgba(C[0], inv); c.lineWidth = 2.5; c.lineCap = 'round';
          for (let n = 0; n < (k > 1 ? 7 : 4); n++) { const an = hash(s0 + n) * TAU, d0 = (6 + 20 * q) * k, d1 = d0 + 9 * k * inv; c.beginPath(); c.moveTo(Math.cos(an) * d0, Math.sin(an) * d0); c.lineTo(Math.cos(an) * d1, Math.sin(an) * d1); c.stroke(); }
          if (k > 1.5) { c.strokeStyle = rgba('#ff7a3a', inv); c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 10 + 26 * q, 0, TAU); c.stroke(); }
        } else if (e.f === 'storm') {   // 지직: 사방으로 꺾인 가지 + 고리
          c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round';
          for (let n = 0; n < (k > 1 ? 6 : 4); n++) { const an = hash(s0 + n) * TAU, L = (16 + 14 * q) * k; c.strokeStyle = rgba(n % 2 ? C[1] : C[0], inv); c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(an + 0.3) * L * 0.5, Math.sin(an + 0.3) * L * 0.5); c.lineTo(Math.cos(an) * L, Math.sin(an) * L); c.stroke(); }
          c.strokeStyle = rgba('#ffffff', inv); c.lineWidth = 3; c.beginPath(); c.arc(0, 0, (8 + 18 * q) * k, 0, TAU); c.stroke();
          if (k > 1.5) { this.bolt3(c, 0, -90, 0, 0, C, 1.4, s0, T); }
        } else if (e.f === 'frost') {   // 깨짐: 얼음 조각이 흩어짐 + 서리 고리
          c.strokeStyle = rgba(C[1], inv * 0.9); c.lineWidth = 3; c.beginPath(); c.arc(0, 0, (10 + 22 * q) * k, 0, TAU); c.stroke();
          for (let n = 0; n < (k > 1 ? 8 : 5); n++) { const an = hash(s0 + n) * TAU, d = (8 + 30 * q) * k, px = Math.cos(an) * d, py = Math.sin(an) * d + q * q * 14, r = (6 - 3 * q) * k; c.save(); c.translate(px, py); c.rotate(an + q * 5); c.fillStyle = rgba(n % 2 ? C[1] : C[0], inv); c.beginPath(); c.moveTo(r, 0); c.lineTo(0, r * 0.5); c.lineTo(-r, 0); c.lineTo(0, -r * 0.5); c.closePath(); c.fill(); c.restore(); }
          if (k > 1.5) for (let n = 0; n < 6; n++) { const an = n / 6 * TAU; c.strokeStyle = rgba('#ffffff', inv); c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(an) * 26 * (0.4 + q), Math.sin(an) * 26 * (0.4 + q)); c.stroke(); }
        } else {   // 기사: 십자 섬광 + 베인 줄
          c.globalCompositeOperation = 'lighter'; c.rotate(0.5 + e.s);
          c.fillStyle = rgba('#ffffff', inv);
          for (let n = 0; n < 2; n++) { c.rotate(Math.PI / 2 * n); const L = (26 + 10 * q) * k * (n ? 0.55 : 1), w = 5 * inv * k + 1; c.beginPath(); c.moveTo(-L, 0); c.lineTo(0, -w); c.lineTo(L, 0); c.lineTo(0, w); c.closePath(); c.fill(); }
          c.strokeStyle = rgba(C[0], inv); c.lineWidth = 3; c.beginPath(); c.arc(0, 0, (10 + 20 * q) * k, 0, TAU); c.stroke();
          if (k > 1.5) for (let n = 0; n < 5; n++) { const an = hash(s0 + n) * TAU, d = 16 + 30 * q; this.star(c, Math.cos(an) * d, Math.sin(an) * d, 5 * inv, rgba(C[1], inv)); }
        }
      }
      c.restore();
    }
    this.fx3 = this.fx3.filter(e => T - e.t < e.life);
    this.drawCmdFx(c);
  };
  // 강화 효과(전형적인 능력 업): 발밑 고리 2겹이 퍼지고 → 빛 기둥이 솟고 → 화살촉(▲)과 별이 위로 올라감
  R.buffFx = function (c, e, q) {
    const g = this.game, t = g && g.tiles[e.i]; if (!t || !t.tower) return;
    const p = this.drawPos(g, e.i, t.tower), x = p[0], y = p[1] - 4, C = FC[e.f], inv = 1 - q;
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 2; k++) { const w = Math.min(1, q * 1.6 + k * 0.25); c.strokeStyle = rgba(k ? C[1] : C[0], (1 - w) * 0.9); c.lineWidth = 4; c.beginPath(); c.ellipse(x, y, 20 + 44 * w, (20 + 44 * w) * 0.36, 0, 0, TAU); c.stroke(); }
    const hgt = 120 * ease(Math.min(1, q * 2.2)), gr = c.createLinearGradient(0, y, 0, y - hgt);
    gr.addColorStop(0, rgba(C[1], 0.75 * inv)); gr.addColorStop(0.6, rgba(C[0], 0.4 * inv)); gr.addColorStop(1, rgba(C[0], 0));
    c.fillStyle = gr; c.beginPath(); c.moveTo(x - 32, y); c.lineTo(x - 22, y - hgt); c.lineTo(x + 22, y - hgt); c.lineTo(x + 32, y); c.closePath(); c.fill();
    c.globalCompositeOperation = 'source-over';
    for (let k = 0; k < 3; k++) {   // 올라가는 ▲
      const w = (q * 1.5 + k * 0.22) % 1, px = x + (k - 1) * 22, py = y - 10 - w * 95, s = 9;
      c.globalAlpha = Math.sin(w * Math.PI) * inv * 1.4 > 1 ? 1 : Math.max(0, Math.sin(w * Math.PI) * inv * 1.4);
      c.fillStyle = '#ffffff'; c.strokeStyle = C[2]; c.lineWidth = 2.5; c.lineJoin = 'round'; c.beginPath(); c.moveTo(px, py - s); c.lineTo(px + s, py + 2); c.lineTo(px + 4, py + 2); c.lineTo(px + 4, py + s); c.lineTo(px - 4, py + s); c.lineTo(px - 4, py + 2); c.lineTo(px - s, py + 2); c.closePath(); c.fill(); c.stroke();
    }
    for (let k = 0; k < 6; k++) { const w = (q + hash(e.s * 9 + k)) % 1, px = x + (hash(e.s * 5 + k) - 0.5) * 70, py = y - w * 110; c.globalAlpha = Math.sin(w * Math.PI) * inv; this.star(c, px, py, 5 * (1 - w * 0.4), k % 2 ? C[1] : '#ffffff'); }
    c.restore();
  };
  // 지휘관 효과: 등급이 높을수록 크고 화려함(희귀 = 고리 · 영웅 = 고리 + 빛살 · 전설 = 화면 전체)
  R.drawCmdFx = function (c) {
    const e = this.cmdFx, g = this.game; if (!e || !g) return;
    const T = this.time, q = (T - e.t) / (e.grade === 'legend' ? 1.6 : 1.0); if (q > 1) { this.cmdFx = null; return; }
    const inv = 1 - q, H = G.CFG.FIELD_H || 900, tp = e.i != null && G.tiles[e.i] ? G.tiles[e.i].tower : [360, H * 0.55];
    c.save();
    if (e.id === 'cheer') {   // 함성: 아래에서 위로 퍼지는 소리 고리 3겹 + 아군 머리 위 번개 표시
      c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) { const w = Math.min(1, q * 1.3 + k * 0.16); c.strokeStyle = rgba('#ffd65a', (1 - w) * 0.9); c.lineWidth = 10 * (1 - w) + 2; c.beginPath(); c.arc(360, H - 60, 80 + w * 620, Math.PI * 1.12, Math.PI * 1.88); c.stroke(); }
      c.globalCompositeOperation = 'source-over';
      for (const t of g.tiles) if (t.tower && !t.blocked) { const p = this.drawPos(g, t.i, t.tower), yy = p[1] - 70 - q * 26; c.globalAlpha = inv; c.fillStyle = '#fff29a'; c.strokeStyle = OUT; c.lineWidth = 2.5; c.lineJoin = 'round'; c.beginPath(); c.moveTo(p[0] + 4, yy - 14); c.lineTo(p[0] - 8, yy + 2); c.lineTo(p[0] - 1, yy + 2); c.lineTo(p[0] - 5, yy + 14); c.lineTo(p[0] + 8, yy - 3); c.lineTo(p[0] + 1, yy - 3); c.closePath(); c.fill(); c.stroke(); }
    } else if (e.id === 'mechanic') {   // 개조: 톱니 테가 돌며 조여 듦 + 불똥
      c.translate(tp[0], tp[1] - 20); c.rotate(q * 5); c.strokeStyle = rgba('#8fd0ff', inv); c.lineWidth = 6; c.setLineDash([14, 10]); c.beginPath(); c.arc(0, 0, 62 - 26 * q, 0, TAU); c.stroke(); c.setLineDash([]);
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; this.star(c, Math.cos(a) * (30 + 50 * q), Math.sin(a) * (30 + 50 * q), 6 * inv, rgba('#ffffff', inv)); }
    } else if (e.id === 'teleporter') {   // 순간이동: 보라 소용돌이 + 위로 솟는 빛살
      c.translate(tp[0], tp[1] - 20); c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) { c.rotate(q * 6 + k * 2.1); c.strokeStyle = rgba(k % 2 ? '#f0c8ff' : '#b06aff', inv); c.lineWidth = 6; c.beginPath(); c.arc(0, 0, 26 + k * 16 + q * 20, 0, 3.6); c.stroke(); }
      c.setTransform(c.getTransform()); c.fillStyle = rgba('#d8a8ff', inv * 0.5); c.fillRect(-10, -170 * ease(q), 20, 170 * ease(q));
    } else if (e.id === 'demolish') {   // 폭파: 큰 고리 2겹 + 빛살 8줄
      c.translate(tp[0], tp[1] - 20); c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 2; k++) { c.strokeStyle = rgba(k ? '#fff2b0' : '#ff8a3a', inv); c.lineWidth = 12 * inv + 2; c.beginPath(); c.arc(0, 0, (60 + k * 40) + q * 220, 0, TAU); c.stroke(); }
      for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + 0.3; c.strokeStyle = rgba('#ffd27a', inv); c.lineWidth = 7 * inv + 1; c.beginPath(); c.moveTo(Math.cos(a) * (30 + q * 120), Math.sin(a) * (30 + q * 120)); c.lineTo(Math.cos(a) * (90 + q * 220), Math.sin(a) * (90 + q * 220)); c.stroke(); }
    } else if (e.id === 'freeze') {   // 시간 정지: 화면 가장자리 서리 + 큰 시계 고리가 멈춤 + 몬스터마다 얼음 결정
      const vg = c.createRadialGradient(360, H / 2, H * 0.25, 360, H / 2, H * 0.75); vg.addColorStop(0, 'rgba(160,230,255,0)'); vg.addColorStop(1, rgba('#9fe6ff', 0.55 * Math.min(1, inv * 1.6)));
      c.fillStyle = vg; c.fillRect(0, 0, 720, H);
      c.translate(360, H * 0.52); c.strokeStyle = rgba('#e8fbff', Math.min(1, inv * 1.5)); c.lineWidth = 8; const rr = 150 + 130 * ease(Math.min(1, q * 2)); c.beginPath(); c.arc(0, 0, rr, 0, TAU); c.stroke();
      for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; c.lineWidth = k % 3 ? 3 : 7; c.beginPath(); c.moveTo(Math.cos(a) * (rr - 22), Math.sin(a) * (rr - 22)); c.lineTo(Math.cos(a) * (rr - 6), Math.sin(a) * (rr - 6)); c.stroke(); }
      const ha = -Math.PI / 2 + Math.min(1, q * 3) * 1.2; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(ha) * rr * 0.6, Math.sin(ha) * rr * 0.6); c.moveTo(0, 0); c.lineTo(0, -rr * 0.38); c.stroke();
      c.setTransform(c.getTransform()); c.translate(-360, -H * 0.52);
      for (const m of g.monsters) if (m.alive) for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; c.strokeStyle = rgba('#ffffff', Math.min(1, inv * 2)); c.lineWidth = 3; c.beginPath(); c.moveTo(m.x, m.y - 26); c.lineTo(m.x + Math.cos(a) * 26, m.y - 26 + Math.sin(a) * 26); c.stroke(); }
    } else if (e.id === 'meteor') {   // 유성 폭격: 유성 7개가 비스듬히 떨어져 길에 꽂힘 → 불기둥 고리
      c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 7; k++) {
        const w = Math.max(0, Math.min(1, q * 2.4 - k * 0.12)), tgt = G.lanePoint(3 + k * 3 + hash(k + e.t) * 2, 0), sx = tgt[0] + 260, sy = tgt[1] - 520;
        if (w < 1) { const x = sx + (tgt[0] - sx) * w * w, y = sy + (tgt[1] - sy) * w * w; if (w > 0) {
          const tg = c.createLinearGradient(x + 90, y - 180, x, y); tg.addColorStop(0, 'rgba(255,140,40,0)'); tg.addColorStop(1, 'rgba(255,200,90,0.95)');
          c.strokeStyle = tg; c.lineWidth = 26; c.lineCap = 'round'; c.beginPath(); c.moveTo(x + 90, y - 180); c.lineTo(x, y); c.stroke();
          c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x, y, 15, 0, TAU); c.fill(); c.fillStyle = '#ffb43a'; c.beginPath(); c.arc(x, y, 24, 0, TAU); c.fill(); } }
        else { const b = Math.min(1, (q * 2.4 - k * 0.12 - 1) * 1.4), bi = 1 - b; if (bi > 0) { c.strokeStyle = rgba('#ffd27a', bi); c.lineWidth = 12 * bi + 2; c.beginPath(); c.arc(tgt[0], tgt[1], 30 + b * 110, 0, TAU); c.stroke(); c.fillStyle = rgba('#ff7a2a', bi * 0.7); c.beginPath(); c.arc(tgt[0], tgt[1], 60 * bi, 0, TAU); c.fill(); } }
      }
    }
    c.restore();
  };

  // 손가락 판정 칸: 줄인 그림 크기에 맞춤(칸 전체를 눌러도 잡히게 넉넉히)
  R.towerRect = function (g, i) {
    const tw = g.tiles[i] && g.tiles[i].tower, p = this.drawPos(g, i, tw), s = G.CFG.cell * 0.96;
    return { x: p[0] - s / 2, y: p[1] - s * 0.92, w: s, h: s, cx: p[0], cy: p[1] };
  };
})(window);
