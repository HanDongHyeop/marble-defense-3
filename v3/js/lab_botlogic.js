// 실험실 자동 플레이 판단 — 다이얼 · 밀어 합치기(마블은 본편 test/botlogic.js). 브라우저 window.LABBOT(game) / Node require.
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const D = isNode ? require('../../js/data.js') : root.DATA;
  const pow = t => Math.pow(2, t.tier - 1);

  // 이 위치(판 좌표)에 있는 포탑이 사거리 안에 둔 몬스터들의 위협 합
  function cover(g, tw, u, v, range) {
    let s = 0;
    for (const m of g.monsters) {
      if (!m.alive || m.u == null) continue;
      const d = Math.hypot(m.u - u, m.v - v) - 0.5;
      if (d <= range + 0.5) s += (m.boss ? 6 : m.weight) * (1 + Math.max(0, (m.dir < 0 ? -m.f : m.f)) / 6);
    }
    return s * pow(tw);
  }
  function rangeOfTw(g, tw) { const T = D.TOWERS[tw.type]; return Math.min(12, (T.range || 2) + D.RANGE_T[tw.tier]); }

  function common(g, skill) {
    // [v3.1] 전설 조합 · 신화 각성(재료 · 조건이 되면 바로)
    if (g.makeLegend) {
      for (const k of g.constructor.ORDER) if (g.legendRecipe(k).ok) { g.makeLegend(k); return true; }
      for (const t of g.towersList()) { const s = g.mythState(t.i); if (s && s.ok) { g.awakenMythic(t.i); return true; } }
    }
    if (g.cmdReady() && D.COMMANDERS[g.cmd.id].mode === 'tap') g.useCommander();
    if (g.truckReady() && g.monsters.length < 6 && g.round >= 3) g.callTruck();
    if (skill >= 0.8 && g.round >= 2) {
      const cnt = {}; for (const t of g.towersList()) cnt[t.tower.type] = (cnt[t.tower.type] || 0) + t.tower.tier;
      const top = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
      if (top && g.upgradeCost(top) <= g.rollCost * 2.2 && g.gold >= g.upgradeCost(top)) { g.upgrade(top); return true; }
    }
    return false;
  }

  function thinkDial(g, skill) {
    const T = g.towersList();
    for (const a of T) for (const b of T) if (a.i !== b.i && g.canMerge(a.i, b.i)) { g.merge(a.i, b.i); return; }
    if (common(g, skill)) return;
    if (g.gold >= g.rollCost && g.tiles.some(t => !t.tower)) { g.summon(); return; }
    // 돌리기: 지금 기준 ±5칸 중 위협을 가장 많이 덮는 각도
    if (skill >= 0.5 && g.monsters.length) {
      const Dl = g.constructor, base = Math.round(g.rotTo);
      let best = base, bs = -1;
      for (let d = -5; d <= 5; d++) {
        let s = 0;
        for (const t of T) { const [u, v] = Dl.ringUV(t.i + 0.5 + base + d); s += cover(g, t.tower, u, v, rangeOfTw(g, t.tower)); }
        s *= 1 - Math.abs(d) * 0.01;
        if (s > bs) { bs = s; best = base + d; }
      }
      if (best !== base) g.rotateBy(best - base);
    }
  }

  // 밀어 합치기: 네 방향을 가볍게 흉내 내 보고(합쳐지는 단계 합 + 길 덮기) 가장 나은 쪽
  function simSlide(g, dir) {
    const Sl = g.constructor, NC = Sl.NC || Sl.N, NR = Sl.NR || Sl.N, [du, dv] = Sl.DIRS[dir], lines = du !== 0 ? NR : NC, len = du !== 0 ? NC : NR;
    const grid = g.tiles.map(t => t.blocked ? { type: '_', tier: 99, fixed: true, m: false } : t.tower ? { type: t.tower.type, tier: t.tower.tier, fixed: !!t.occ, m: false } : null);   // [v3] 구멍 = 벽
    let mergeGain = 0, moved = 0;
    const MAXT = g.mergeMax || 6, HG = (g.tiles.filter(t => !t.tower && !t.blocked).length <= 5 || g.towersList().filter(t => t.tower.tier >= 5).length >= 3) ? 4 : -40;   // [v3.6 실험] 영웅 흡수는 판이 차거나 전설 3명이 된 뒤에만 이득으로 봄   // [v3.1] 밀어 합치기는 영웅(3)까지
    for (let line = 0; line < lines; line++) {
      const cells = [];
      for (let s = 0; s < len; s++) { const pos = du > 0 ? len - 1 - s : du < 0 ? s : dv > 0 ? len - 1 - s : s; const c = du !== 0 ? pos : line, r = du !== 0 ? line : pos; cells.push(r * NC + c); }
      for (let s = 1; s < len; s++) {
        const from = cells[s], A = grid[from]; if (!A || A.fixed) continue;
        let k = s; while (k - 1 >= 0 && !grid[cells[k - 1]]) k--;
        const fr = k - 1 >= 0 ? cells[k - 1] : -1;
        if (fr >= 0 && g.heroMerge && grid[fr] && !grid[fr].fixed && !grid[fr].m && A.tier === 3 && grid[fr].tier === 3) { grid[fr].m = true; grid[from] = null; mergeGain += HG; moved++; continue; }   // [v3.6 실험] 영웅 흡수: 판이 찼을 때만 이득으로 봄
        if (fr >= 0) { const B = grid[fr]; if (B && !B.fixed && !B.m && B.tier === A.tier && A.tier < MAXT && (!g.sameType || B.type === A.type)) { B.tier++; B.m = true; if (B.type === 'prism') B.type = A.type; grid[from] = null; mergeGain += Math.pow(2, B.tier); moved++; continue; } }
        if (cells[k] !== from) { grid[cells[k]] = A; grid[from] = null; moved++; }
      }
    }
    let cov = 0;
    grid.forEach((tw, i) => { if (tw && tw.type !== '_') { const [u, v] = Sl.cellUV(i); cov += cover(g, tw, u, v, rangeOfTw(g, tw)); } });
    return { moved, score: mergeGain * 3 + cov };
  }
  function thinkSlide(g, skill) {
    if (common(g, skill)) return;
    const empty = g.tiles.filter(t => !t.tower && !t.blocked).length;
    if (g.gold >= g.rollCost && empty > 0) { g.summon(); return; }
    if (g.dragMode) {   // [v3.7] 끌어서 합치기: 같은 계열 · 같은 등급 짝이 있으면 낮은 등급부터 합침(합치면 늘 힘이 는다: 2개 → 3배짜리 1개)
      const L = g.towersList().filter(t => !t.occ && t.tower.tier < 6).sort((x, y) => x.tower.tier - y.tower.tier);
      const hold = typeof process !== 'undefined' && process.env && process.env.HOLD ? +process.env.HOLD : 99;   // HOLD = 빈 칸이 이보다 많으면 합치지 않고 둠(비교용)
      if (empty <= hold) for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) if (g.canMerge(L[i].i, L[j].i)) { g.merge(L[i].i, L[j].i); return; }
      // 자리 옮기기: 길을 더 많이 덮는 빈 칸이 있으면(15% 이상) 센 아군부터 그리로
      if (g.moveTo && !(typeof process !== 'undefined' && process.env && process.env.NOMOVE)) {
        const Sl = g.constructor, free = g.tiles.filter(t => !t.tower && !t.blocked);
        for (const t of g.towersList().filter(q => !q.occ).sort((x, y) => y.tower.tier - x.tower.tier)) {
          const rg = rangeOfTw(g, t.tower), c0 = cover(g, t.tower, ...Sl.cellUV(t.i), rg); let best = null, bc = c0 * 1.15 + 1e-6;
          for (const e of free) { const c = cover(g, t.tower, ...Sl.cellUV(e.i), rg); if (c > bc) { bc = c; best = e.i; } }
          if (best != null) { g.moveTo(t.i, best); return; }
        }
      }
      return;
    }
    if (g.t < g.slideCd) return;
    let cur = 0; g.tiles.forEach((t, i) => { if (t.tower) { const [u, v] = g.constructor.cellUV(i); cur += cover(g, t.tower, u, v, rangeOfTw(g, t.tower)); } });
    let best = null, bs = cur * 1.08 + (empty === 0 ? -1e9 : 0);
    for (const dir of Object.keys(g.constructor.DIRS)) { const r = simSlide(g, dir); if (r.moved && r.score > bs) { bs = r.score; best = dir; } }
    if (best && (skill >= 0.5 || Math.random() < 0.5)) g.slide(best);
  }

  function think(g, skill) {
    skill = skill == null ? 1 : skill;
    if (g.over) return;
    if (g.lab === 'dial') thinkDial(g, skill); else if (g.lab === 'slide') thinkSlide(g, skill);
  }
  const API = { think };
  if (isNode) module.exports = API; else root.LABBOT = g => think(g, 1);
})(typeof window !== 'undefined' ? window : globalThis);
