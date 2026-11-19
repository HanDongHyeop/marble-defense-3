// 마블 디펜스 3 판 기하 — 위에서 내려다본 직사각형 판(쿼터뷰 마름모 X). js/geom.js와 같은 이름(GEOM)으로 덮어 쓴다.
// 판 좌표 (U, V): U 0..SW(가로) · V 0..SH(세로). 화면 = 축에 나란한 확대(P). 바깥 둘레 = 몬스터 길(폭 L), 그 안쪽 = 가로 NC × 세로 NR 칸 판.
// [v3.1 · 2026-11-18] 4×4 → 가로 4 × 세로 5(사용자: 소환 단추 아래가 비니 맵을 세로로 늘리자 · 양쪽에서 오니 정사각형일 필요 없음). 판 캔버스 높이 900 → 990(CFG.FIELD_H)
// 길(v3.6): f = 0 왼쪽 위 굴 → 왼쪽 변 ↓ → 아래 변 → → 오른쪽 변 ↑ → f = 24 위 가운데(12시) 수정. 한 방향.
//   길이(호 길이)에 비례해 f를 나눔: 아래 반 변 3 · 옆 변 6 · 위 반 변 3.
(function (root) {
  const NC = 4, NR = 5, N = NC, NCELL = NC * NR;
  // L = 길 폭 · CS = 칸 한 변 · GAP = 길 안쪽 가장자리 ~ 판 가장자리 · rp = 칸 그림 반지름(손가락 판정)
  const CFG = { W: 720, FIELD_H: 990, cx: 360, L: 1.1, CS: 1.68, GAP: 0.12, rp: 0.7, cell: 120, laneTopY: 200 };
  const M0 = CFG.L + CFG.GAP;                      // 판 시작(판 좌표)
  const SW = 2 * M0 + NC * CFG.CS, SH = 2 * M0 + NR * CFG.CS;
  const S = SW;                                    // (옛 이름 — 가로 폭)
  const O = M0;
  const u = CFG.cell / CFG.CS;                     // 화면 px / 판 좌표 1
  const c = CFG.L / 2;                             // 길 가운데 선
  const x0 = CFG.cx - SW / 2 * u, y0 = CFG.laneTopY - c * u;
  CFG.x0 = x0; CFG.y0 = y0; CFG.u = u; CFG.N = N; CFG.NC = NC; CFG.NR = NR; CFG.M0 = M0;

  function P(U, V) { return [x0 + U * u, y0 + V * u]; }
  function toUV(x, y) { return [(x - x0) / u, (y - y0) / u]; }
  function gAt() { return 1; }

  // [v3.6] 길 = 한 방향(사용자: 양쪽에서 나오면 공격 범위가 의미 없음 → 왼쪽에서 나와 돌게).
  //   f = 0 왼쪽 위 모서리(굴) → 왼쪽 변을 내려가 → 아래 변 → 오른쪽 변을 올라가 → f = 24 위 가운데(12시 수정). 호 길이에 비례해 f를 나눔
  const A = SW / 2 - c, WD = SW - 2 * c, B = SH - 2 * c, LEN = 2 * B + WD + A, END = 24;
  function laneUV(f, w) {
    f = Math.max(0, Math.min(END, f));
    const d = f / END * LEN; let U, V, nu, nv;
    if (d <= B) { U = c; V = c + d; nu = -1; nv = 0; }
    else if (d <= B + WD) { U = c + (d - B); V = SH - c; nu = 0; nv = 1; }
    else if (d <= 2 * B + WD) { U = SW - c; V = SH - c - (d - B - WD); nu = 1; nv = 0; }
    else { U = SW - c - (d - 2 * B - WD); V = c; nu = 0; nv = -1; }
    const off = (w || 0) * CFG.L * 0.4;                   // w > 0 = 바깥쪽
    return [U + nu * off, V + nv * off];
  }
  function lanePoint(f, w) { const [U, V] = laneUV(f, w); return P(U, V).concat([1]); }
  // 길 방향(화면 x 부호) — 몬스터 그림 좌우 뒤집기용
  function laneDir(f, dir) { const a = laneUV(f, 0), b = laneUV(f + 0.05 * (dir || 1), 0); return [b[0] - a[0], b[1] - a[1]]; }

  const cellUV = i => [M0 + ((i % NC) + 0.5) * CFG.CS, M0 + (Math.floor(i / NC) + 0.5) * CFG.CS];
  function circle(U, V, r) { const out = []; for (let n = 0; n < 16; n++) { const an = n / 16 * Math.PI * 2; out.push(P(U + Math.cos(an) * r, V + Math.sin(an) * r)); } return out; }

  // 칸 24개(본편 sim이 24칸을 전제로 하는 계산 — (i + 12) % 24 등 — 이 깨지지 않게). 0..19 = 4×5 판, 20..23 = 쓰지 않는 칸(막힘)
  const tiles = [];
  for (let i = 0; i < 24; i++) {
    const used = i < NCELL, [U, V] = used ? cellUV(i) : [-50, -50], p = P(U, V);
    const pad = used ? circle(U, V, CFG.rp) : [];
    tiles.push({ i, zone: -1, corner: false, out: [0, 1], quad: pad, center: p, pawn: p, tower: p, home: p, pad, padUV: [U, V], badge: p, scale: 1, tscale: 1, w: CFG.cell, unused: !used });
  }
  function zoneOf() { return -1; }
  function tileRect(i) { const [U, V] = cellUV(i), h = CFG.CS / 2; return [U - h, U + h, V - h, V + h]; }
  function padUV(i) { return tiles[i] ? tiles[i].padUV : null; }
  function ringPoly(d) { return [P(d, d), P(SW - d, d), P(SW - d, SH - d), P(d, SH - d)]; }
  const plaza = P(SW / 2, SH / 2);
  const boardRect = (() => { const a = P(M0, M0), b = P(SW - M0, SH - M0); return { x: a[0], y: a[1], w: b[0] - a[0], h: b[1] - a[1] }; })();

  const GEOM = { V3: true, N, NC, NR, NCELL, CFG, S, SW, SH, O, u, P, toUV, gAt, tiles, zoneOf, tileRect, padUV, lanePoint, laneUV, laneDir, ringPoly, plaza, R2: Math.SQRT2, cellUV, boardRect, LANE_LEN: LEN / 2, END, lanePts: [[c, c], [c, SH - c], [SW - c, SH - c], [SW - c, c], [SW / 2, c]] };
  if (typeof module !== 'undefined' && module.exports) module.exports = GEOM; else root.GEOM = GEOM;
})(typeof window !== 'undefined' ? window : globalThis);
