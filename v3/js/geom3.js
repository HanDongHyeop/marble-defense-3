// 마블 디펜스 3 판 기하 — 위에서 내려다본 판. js/geom.js와 같은 이름(GEOM)으로 덮어 쓴다.
// [v3.9 · 2026-11-23] 맵마다 길 · 판 모양이 다르다(사용자 확정 시안 v9_maps/compose.py의 좌표 그대로 · 무대 720×1280 px).
//   M 초원: 왼쪽 가운데 보스 → 아래 → 오른쪽 → 위 → 왼쪽 → 살짝 위 수정(4×5)
//   V 용암: 6×3 두 덩이(36칸). 아래 덩이 왼쪽 보스 → 아래 → 오른쪽 → 위 → 두 덩이 사이를 왼쪽으로 → 위 → 오른쪽 → 살짝 위 수정
//   S 눈: 왼쪽 위 보스 → 오른쪽 → 살짝 아래 → 두 갈래(왼쪽으로 돌아 내려감 / 그대로 내려가 아래를 돎) → 왼쪽 아래 수정(4×5)
// 판 좌표 (U, V) = 무대 px ÷ u(u = 71.43 고정 → 사거리 1 = 어느 맵에서나 같은 px). 길 위 위치 f = 0(보스) ~ 24(수정), 길이에 비례.
// hp = 맵별 몬스터 체력 배율(길이 짧은 눈 맵은 낮게 · 36칸 용암은 높게 — 봇으로 맞춤)
// GEOM.use(key)를 판 시작 전에 부른다(tiles · CFG는 같은 객체를 고쳐 쓴다 → 다른 파일이 잡고 있는 참조가 그대로 산다).
(function (root) {
  const u = 120 / 1.68, END = 24, RW = 54, REF_LEN = 2255;   // RW = 길 폭(px) · REF_LEN = 예전 둘레 길 길이(px) — 몬스터가 걷는 px 속도를 맵과 상관없이 같게
  const MAPS = {
    M: { name: '초원', slots: [[180, 338, 4, 5, 100]], start: [74, 585], end: [236, 196], holes: { hard: [5, 14], hell: [2, 9, 15] },
      lanes: [[[120, 585], [142, 585], [142, 876], [618, 876], [618, 300], [236, 300], [236, 226]]] },
    V: { name: '용암', hp: 1.22, slots: [[132, 286, 6, 3, 76], [132, 598, 6, 3, 76]], start: [66, 700], end: [560, 180], holes: { hard: [8, 27], hell: [3, 16, 31] },
      lanes: [[[94, 740], [94, 864], [626, 864], [626, 556], [94, 556], [94, 250], [560, 250], [560, 212]]] },
    S: { name: '눈', hp: 0.72, slots: [[196, 372, 4, 5, 92]], start: [80, 222], end: [150, 868], holes: { hard: [5, 14], hell: [2, 9, 15] },
      lanes: [[[124, 215], [610, 215], [610, 334], [150, 334], [150, 866]], [[124, 215], [610, 215], [610, 334], [610, 870], [150, 870]]], fork: 605 },   // fork = 갈림까지 길이(px)
  };
  const CH_MAP = { 1: 'M', 2: 'S', 3: 'V', 4: 'M', 5: 'S', 6: 'V' };
  const CFG = { W: 720, FIELD_H: 990, cx: 360, L: RW / u, CS: 1.68, GAP: 0.12, rp: 0.7, cell: 120, laneTopY: 200, u, N: 4, NC: 4, NR: 5, M0: 0, RW };
  const tiles = [];
  const GEOM = { V3: true, CFG, u, END, tiles, MAPS, CH_MAP, R2: Math.SQRT2, O: 0 };
  let cur = null, lanes = [], cells = [];

  function P(U, V) { return [U * u, V * u]; }
  function toUV(x, y) { return [x / u, y / u]; }
  function build(pts) { const seg = []; let len = 0; for (let k = 1; k < pts.length; k++) { const a = pts[k - 1], b = pts[k], l = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push({ a, b, l, at: len, dx: (b[0] - a[0]) / l, dy: (b[1] - a[1]) / l }); len += l; } return { pts, seg, len }; }
  // 길 위 점(px). w = 길 폭 안 옆 자리(−1 ~ 1). 모서리에서는 두 변의 옆 방향을 섞어 튀지 않게
  function lanePx(f, w, lane) {
    const Ln = lanes[lane || 0] || lanes[0]; f = Math.max(0, Math.min(END, f));
    const d = f / END * Ln.len; let s = Ln.seg[Ln.seg.length - 1];
    for (const q of Ln.seg) if (d <= q.at + q.l) { s = q; break; }
    const t = Math.max(0, Math.min(s.l, d - s.at)); let nx = s.dy, ny = -s.dx;
    const k = Ln.seg.indexOf(s), R = RW * 0.5;
    if (t < R && k > 0) { const p = Ln.seg[k - 1], m = 0.5 + t / R * 0.5; nx = nx * m + p.dy * (1 - m); ny = ny * m - p.dx * (1 - m); }
    else if (s.l - t < R && k < Ln.seg.length - 1) { const p = Ln.seg[k + 1], m = 0.5 + (s.l - t) / R * 0.5; nx = nx * m + p.dy * (1 - m); ny = ny * m - p.dx * (1 - m); }
    const off = (w || 0) * RW * 0.4;
    return [s.a[0] + s.dx * t + nx * off, s.a[1] + s.dy * t + ny * off, s.dx, s.dy];
  }
  function laneUV(f, w, lane) { const p = lanePx(f, w, lane); return [p[0] / u, p[1] / u]; }
  function lanePoint(f, w, lane) { const p = lanePx(f, w, lane); return [p[0], p[1], 1]; }
  function laneDir(f, dir, lane) { const p = lanePx(f, 0, lane); return [p[2] * (dir || 1), p[3] * (dir || 1)]; }
  const cellUV = i => cells[i] ? [cells[i].x / u, cells[i].y / u] : [-50, -50];
  const grid = i => cells[i] ? [cells[i].c, cells[i].r] : [0, 0];
  function circle(x, y, r) { const out = []; for (let n = 0; n < 16; n++) { const an = n / 16 * Math.PI * 2; out.push([x + Math.cos(an) * r, y + Math.sin(an) * r]); } return out; }

  function use(key) {
    if (typeof key === 'number') key = CH_MAP[key];
    const M = MAPS[key] || MAPS.M; if (cur === M) return GEOM;
    cur = M; GEOM.key = MAPS[key] ? key : 'M'; GEOM.map = M;
    lanes = M.lanes.map(build);
    cells = []; let r0 = 0, x0 = 1e9, y0 = 1e9, x1 = 0, y1 = 0;
    for (const [x, y, nc, nr, s] of M.slots) {
      for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) cells.push({ x: x + (c + 0.5) * s, y: y + (r + 0.5) * s, c, r: r0 + r, s, blk: [x, y, nc * s, nr * s] });
      r0 += nr; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + nc * s); y1 = Math.max(y1, y + nr * s);
    }
    const s = M.slots[0][4], NC = M.slots[0][2], NR = r0, NCELL = cells.length;
    Object.assign(CFG, { cell: s, CS: s / u, rp: 0.42 * s / u, N: NC, NC, NR });
    Object.assign(GEOM, { N: NC, NC, NR, NCELL, S: 720 / u, SW: 720 / u, SH: 990 / u, LANE_LEN: lanes[0].len / u / 2, LEN_PX: lanes[0].len, speedK: REF_LEN / lanes[0].len, lanes: lanes.length,
      forkF: M.fork ? M.fork / lanes[0].len * END : END + 1, lanePts: M.lanes[0].map(p => [p[0] / u, p[1] / u]), lanesPx: M.lanes, startPx: M.start, endPx: M.end,
      boardRect: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, blocks: M.slots.map(q => ({ x: q[0], y: q[1], w: q[2] * q[4], h: q[3] * q[4] })), plaza: [(x0 + x1) / 2, (y0 + y1) / 2] });
    // 칸: 적어도 24개(본편 sim이 24칸을 전제로 하는 계산이 깨지지 않게). 쓰지 않는 칸은 화면 밖 · 막힘
    const n = Math.max(24, NCELL); tiles.length = n;
    for (let i = 0; i < n; i++) {
      const used = i < NCELL, p = used ? [cells[i].x, cells[i].y] : [-3600, -3600], pad = used ? circle(p[0], p[1], 0.42 * s) : [];
      const t = tiles[i] || (tiles[i] = {});
      Object.assign(t, { i, zone: -1, corner: false, out: [0, 1], quad: pad, center: p, pawn: p, tower: p, home: p, pad, padUV: [p[0] / u, p[1] / u], badge: p, scale: 1, tscale: 1, w: s, unused: !used });
    }
    return GEOM;
  }
  function tileRect(i) { const [U, V] = cellUV(i), h = CFG.CS / 2; return [U - h, U + h, V - h, V + h]; }
  Object.assign(GEOM, { P, toUV, gAt: () => 1, zoneOf: () => -1, tileRect, padUV: i => tiles[i] ? tiles[i].padUV : null, lanePoint, laneUV, laneDir, lanePx, cellUV, grid, use,
    ringPoly: d => [P(d, d), P(GEOM.SW - d, d), P(GEOM.SW - d, GEOM.SH - d), P(d, GEOM.SH - d)] });
  use('M');
  if (typeof module !== 'undefined' && module.exports) module.exports = GEOM; else root.GEOM = GEOM;
})(typeof window !== 'undefined' ? window : globalThis);
