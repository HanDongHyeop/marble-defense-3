// 마블 디펜스 실험실 — 다이얼 · 밀어 합치기 공용: 포탑이 판 칸 번호에 묶이지 않으므로 '몬스터 ↔ 포탑' 거리를 판 좌표(U, V) 직선 거리로 잰다.
// 몬스터는 본편과 같은 바깥 길(f)을 걷는다 → 몬스터끼리 거리(번개 연쇄 · 폭발 범위)는 본편 그대로 f로.
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;

  function make(G) {
    // [v3] 직사각형 판(geom3.js)은 길 · 역변환을 직접 준다
    if (G.V3) return { laneAnchor: null, laneUV: G.laneUV, toUV: G.toUV, setSlot(t, u, v, k, rp) { const p = G.P(u, v); t.tower = p; t.padUV = [u, v]; t.center = p; t.pawn = p; t.badge = p; t.scale = 1; t.tscale = 1; t.zone = -1; t.corner = false; t.w = G.CFG.cell; const pad = []; rp = rp || G.CFG.rp; for (let n = 0; n < 16; n++) { const an = n / 16 * Math.PI * 2; pad.push(G.P(u + Math.cos(an) * rp, v + Math.sin(an) * rp)); } t.pad = pad; t.quad = pad; } };
    const C = G.CFG, S = G.S, c = C.L / 2;
    // 길 기준점(geom.js laneAnchor와 같은 계산 — geom이 내보내지 않아 그대로 옮김)
    function laneAnchor(i) {
      i = ((i % 24) + 24) % 24;
      if (i === 0) return [S - c, S - c];
      if (i === 6) return [c, S - c];
      if (i === 12) return [c, c];
      if (i === 18) return [S - c, c];
      const [U, V] = G.padUV(i), z = G.zoneOf(i);
      return z === 0 ? [U, S - c] : z === 1 ? [c, V] : z === 2 ? [U, c] : [S - c, V];
    }
    function laneUV(f, w) {
      f = ((f % 24) + 24) % 24;
      const i = Math.floor(f), r = f - i;
      const [u1, v1] = laneAnchor(i), [u2, v2] = laneAnchor(i + 1);
      let U = u1 + (u2 - u1) * r, V = v1 + (v2 - v1) * r;
      let nu, nv;
      if (Math.abs(v2 - v1) < 1e-6) { nu = 0; nv = V > S / 2 ? 1 : -1; } else { nu = U > S / 2 ? 1 : -1; nv = 0; }
      const off = (w || 0) * C.L * 0.4;
      return [U + nu * off, V + nv * off];
    }
    // 화면 좌표 → 판 좌표(P의 역함수, 뉴턴 몇 번)
    function toUV(x, y) {
      let U = S / 2, V = S / 2;
      for (let k = 0; k < 12; k++) {
        const [px, py] = G.P(U, V), e = 1e-3, [ax, ay] = G.P(U + e, V), [bx, by] = G.P(U, V + e);
        const j11 = (ax - px) / e, j21 = (ay - py) / e, j12 = (bx - px) / e, j22 = (by - py) / e, det = j11 * j22 - j12 * j21;
        const dx = x - px, dy = y - py;
        U += (j22 * dx - j12 * dy) / det; V += (-j21 * dx + j11 * dy) / det;
      }
      return [U, V];
    }
    // G.tiles[i] 한 칸을 판 좌표 (u, v)에 놓음(그림 · 손가락 판정이 모두 이 값을 읽는다)
    function setSlot(t, u, v, k, rp) {
      const p = G.P(u, v);
      t.tower = p; t.padUV = [u, v]; t.center = p; t.pawn = p; t.badge = p;
      t.scale = G.gAt(u, v) * (k || 1); t.tscale = t.scale;
      const pad = []; rp = rp || C.rp;
      for (let n = 0; n < 16; n++) { const an = n / 16 * Math.PI * 2; pad.push(G.P(u + Math.cos(an) * rp, v + Math.sin(an) * rp)); }
      t.pad = pad; t.quad = pad; t.zone = -1; t.corner = false; t.w = 60;
    }
    return { laneAnchor, laneUV, toUV, setSlot };
  }

  // 거리 규칙을 Game에 덧씌움(다이얼 · 밀어 합치기)
  //   PERP = 포탑 자리에서 길 가운데까지의 기본 간격만큼 빼 줌 → 본편(칸 번호 ±사거리)과 비슷한 길이를 덮는다
  function mixin(Cls, G, GEO, opt) {
    const PERP = opt.perp == null ? 0.5 : opt.perp;
    return class extends Cls {
      posOf(m) { super.posOf(m); const uv = GEO.laneUV(m.f, m.w * 0.8); m.u = uv[0]; m.v = uv[1]; }
      dMT(m, i) { const p = G.tiles[i].padUV; if (m.u == null) this.posOf(m); return Math.hypot(m.u - p[0], m.v - p[1]) - PERP; }
      inRange(i, range, type) {
        const out = [], see = type === 'beacon';
        for (const m of this.monsters) if (m.alive && m.kind !== 'ghostly' && (!m.stealth || see || this.t < m.revealUntil) && this.dMT(m, i) <= range + 0.5) out.push(m);
        return out;
      }
      retarget(s) {
        const t = this.tiles[s.i], r = t && t.tower ? this.rangeOf(s.i) + 0.5 : 2.5;
        let best = null, bd = 1e9;
        for (const o of this.monsters) {
          if (!o.alive || (o.stealth && this.t >= o.revealUntil) || this.dMT(o, s.i) > r + 0.5) continue;
          const d = Math.hypot(o.x - s.x, o.y - s.y); if (d < bd) { bd = d; best = o; }
        }
        if (best) s.m = best; else s.lost = true;
      }
      occupyCheck(m) {
        if (m.kind !== 'elite' || m.occTile || !m.alive) return;
        let bi = -1, bd = 0.25;
        for (const t of this.tiles) if (t.tower && t.tower.tier < 6 && !t.occ) { const d = this.dMT(m, t.i); if (d < bd) { bd = d; bi = t.i; } }
        if (bi < 0) return;
        if (this.shield > 0) { this.shield--; this.emit('shield'); m.occTile = -1; return; }
        this.tiles[bi].occ = { mon: m.id, ransom: 0 }; m.occTile = bi; this.emit('occupy', { i: bi });
      }
      // 성광탑 공속 버프: 이웃 = 맵마다(opt.nbr)
      lightBuff(i) {
        let b = 0, crit = 0;
        for (const t of this.tiles) {
          const j = t.i; if (j === i) continue;
          const o = t.tower; if (!o || o.type !== 'light' || this.disabled(j)) continue;
          const d = opt.nbr(i, j);
          const near = d <= 1 || (this.sp('light', 'lightRange') && d <= 2) || (o.tier >= 5 && d <= 3);
          if (near) { b += o.tier * (0.03 + (this.sp('light', 'lightAps') ? 0.01 : 0)) * (o.tier >= 4 ? 1.5 : 1) * (this.fk('buffUp') ? 1.2 : 1); if (o.tier >= 6) crit = 0.1; }
        }
        return [b, crit];
      }
      startMission() { /* 미션(블루마블 쪽 규칙)은 이 판에 없다 */ }
      zoneFull() { return false; }   // 요새(한 변 5칸)는 블루마블 판 규칙 — 칸 번호가 판 변이 아니므로 없음
      // 소환(랜덤다이스식): 빈 자리 아무 데나 1단계. 값은 굴리기와 같은 사다리(20 + 2씩)
      roll() { return this.summon(); }
      summon() {
        if (this.over) return false;
        const empty = this.tiles.filter(t => !t.tower && !t.blocked);
        if (!empty.length) { this.emit('full', {}); return false; }
        const rescue = this.gold < this.rollCost && !(this.freeRolls > 0) && !this.tiles.some(t => t.tower);
        if (this.gold < this.rollCost && !(this.freeRolls > 0) && !rescue) { this.emit('nogold'); return false; }
        if (rescue) this.emit('rescueRoll', {}); else if (this.freeRolls > 0) this.freeRolls--; else { this.gold -= this.rollCost; this.emit('spend', { amt: this.rollCost, why: 'roll' }); }
        this.rollCost += D_ECON().rollStep;
        this.rolls++; this.stats.rolls++; this.lastRollT = this.t;
        const t = this.pickOne(empty);
        let tier = 1;
        if (this.cmd.id === 'mechanic' && this.r() < 0.1) tier = 2;
        this.build(t.i, this.buildPick(), tier);
        this.emit('summon', { i: t.i });
        return true;
      }
      rollAffordable() { return this.gold >= this.rollCost || this.freeRolls > 0 || !this.tiles.some(t => t.tower); }
    };
  }
  let D_ECON = () => (isNode ? require('../../js/data.js') : root.DATA).ECON;

  const API = { make, mixin };
  if (isNode) module.exports = API; else root.LAB_GEO = API;
})(typeof window !== 'undefined' ? window : globalThis);
