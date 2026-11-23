// 마블 디펜스 실험실 ③ 밀어 합치기 — 주사위 · 말 · 착지 없음. 판 가운데 5×5 칸(가장자리 16칸이 길에 가깝다)을 2048처럼 민다.
// 한 번 밀면 모든 포탑이 그 방향 끝까지 미끄러지고, 같은 종류 · 같은 단계가 부딪히면 합쳐진다(한 번 밀 때 포탑 하나는 한 번만 합쳐짐 — 2048 규칙).
// 조작: 소환(빈 칸 무작위 1단계) · 판을 쓸어 밀기(↖ ↗ ↘ ↙ 네 방향, 화면의 마름모 축) / 아래 방향 단추. 손으로 끌어 합치기는 없다(미는 것만).
// 칸 i = r * 5 + c, 판 좌표 U = 가장자리 + (c + .5) × 칸, V = 가장자리 + (r + .5) × 칸.  +U = 화면 ↘, −U = ↖, +V = ↙, −V = ↗
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;

  function install(SIM, D, G, LAB, GEOAPI) {
    D = D || (isNode ? require('../../js/data.js') : root.DATA);
    if (LAB.map !== 'slide') return null;
    const GEO = GEOAPI.make(G);
    const S = G.S, CF = G.CFG, N = G.N || 5, NC = G.NC || N, NR = G.NR || N, NCELL = NC * NR;   // [v3.1] 가로 NC × 세로 NR
    // [v3] 4×4 직사각형 판(geom3.js). 칸 위치는 geom3이 이미 정해 둠
    const M0 = G.V3 ? G.CFG.M0 : CF.L + 0.12, CS = G.V3 ? G.CFG.CS : (S - 2 * M0) / N;   // 칸 한 변(판 좌표)
    const cellUV = i => [M0 + ((i % NC) + 0.5) * CS, M0 + (Math.floor(i / NC) + 0.5) * CS];
    if (!G.V3) {
      while (G.tiles.length < N * N) G.tiles.push({ i: G.tiles.length, zone: -1, corner: false, out: [0, 1] });
      for (let i = 0; i < N * N; i++) { const [u, v] = cellUV(i); G.tiles[i].i = i; GEO.setSlot(G.tiles[i], u, v, 1.1, CS * 0.42); G.tiles[i].home = G.tiles[i].tower; }
    }
    root.LAB_SLIDE_INFO = { N, CS, M0 }; root.LAB_GEO_INST = GEO;
    const man = (i, j) => { if (G.grid) { const a = G.grid(i), b = G.grid(j); return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]); } return Math.abs((i % NC) - (j % NC)) + Math.abs(Math.floor(i / NC) - Math.floor(j / NC)); };   // [v3.9] 맵마다 판 모양이 달라 칸 격자는 기하가 알려 줌
    const DIRS = { '+U': [1, 0], '-U': [-1, 0], '+V': [0, 1], '-V': [0, -1] };

    const Mixed = GEOAPI.mixin(SIM.Game, G, GEO, { perp: 0.5, nbr: man });
    class SlideGame extends Mixed {
      constructor(opt) {
        if (G.use) G.use(opt.map || G.CH_MAP[opt.mode === 'endless' ? 1 : Math.max(1, Math.min(6, opt.chapter || 1))]);   // [v3.9] 장마다 맵(길 · 판 모양)이 다름 — 판을 만들기 전에 기하를 바꿈
        super(opt);
        const NCELL = G.NCELL || NC * NR;
        while (this.tiles.length < NCELL) this.tiles.push({ i: this.tiles.length, corner: false, cornerKind: null, zone: -1, trait: null, tower: null, warn: null, occ: null, stopUntil: 0 });
        for (const t of this.tiles) { t.corner = false; t.cornerKind = null; t.trait = null; t.zone = -1; t.blocked = t.i >= NCELL; }
        // [v3] 구멍 칸(난이도마다): 막힌 칸 — 소환도 안 되고 밀 때 벽
        const H = (G.map && G.map.holes && G.map.holes[this.diff || 'normal']) || (LAB.C.holes && LAB.C.holes[this.diff || 'normal']) || [];
        this.holes = H.filter(i => i < NCELL);
        for (const i of this.holes) this.tiles[i].blocked = true;
        this.slideCd = 0; this.slides = 0;
      }
      // 한 번 밀기. 반환: 움직였는지. 사건 'slid' = { dir, moves: [{ from, to, id }], merges: [{ from, to, id, tier }] }
      slide(dir) {
        if (this.over || !DIRS[dir] || this.t < this.slideCd) return false;
        const [du, dv] = DIRS[dir];
        const moves = [], merges = [];
        const merged = new Set();
        this._sliding = true;
        try {
        const fixed = t => !!t.occ;   // 점령당한 포탑은 못 움직임(벽)
        // 줄마다: 미는 방향 앞쪽부터 차례로 끝까지
        const lines = du !== 0 ? NR : NC, len = du !== 0 ? NC : NR;   // 가로로 밀면 줄 = 행(NR개, 각 NC칸), 세로로 밀면 줄 = 열
        for (let line = 0; line < lines; line++) {
          const all = [];
          for (let s = 0; s < len; s++) {
            const pos = du > 0 ? len - 1 - s : du < 0 ? s : dv > 0 ? len - 1 - s : s;   // 앞(밀리는 끝)부터
            const c = du !== 0 ? pos : line, r = du !== 0 ? line : pos;
            all.push(r * NC + c);
          }
          // [v3] 구멍(막힌 칸)에서 줄을 끊는다 — 구멍 너머로는 못 감
          const segs = [[]];
          for (const ci of all) { if (this.tiles[ci].blocked) segs.push([]); else segs[segs.length - 1].push(ci); }
          for (const cells of segs) for (let s = 1; s < cells.length; s++) {
            const from = cells[s], A = this.tiles[from];
            if (!A.tower || fixed(A)) continue;
            let k = s;
            while (k - 1 >= 0 && !this.tiles[cells[k - 1]].tower) k--;
            // 바로 앞 포탑과 합치기?
            const fr = k - 1 >= 0 ? cells[k - 1] : -1;
            if (fr >= 0) {
              const B = this.tiles[fr];
              if (!fixed(B) && !merged.has(B.tower.id) && this.canMerge(from, fr)) {
                const id = A.tower.id, tier = A.tower.tier;
                if (this.merge(from, fr)) { merged.add(this.tiles[fr].tower.id); merges.push({ from, to: fr, id, tier }); continue; }
              }
            }
            const to = cells[k];
            if (to !== from) { this.moveTower(from, to); moves.push({ from, to, id: this.tiles[to].tower.id }); }
          }
        }
        } finally { this._sliding = false; }
        if (!moves.length && !merges.length) { this.emit('slideNo', { dir }); return false; }
        this.slides++; this.stats.slides = this.slides; this.stats.multi = Math.max(this.stats.multi || 0, merges.length);
        this.slideCd = this.t + 0.18;
        this.emit('slid', { dir, moves, merges });
        return true;
      }
      // 손으로 끌어 합치기는 없다 — 미는 동안(slide 안)에만 합쳐짐
      // [실험실 규칙] 종류가 5가지라 '같은 종류 + 같은 단계'면 판이 금방 막힌다(봇 25칸 꽉 참 · 합치기 16번 · 최고 3단계)
      //   → 2048처럼 '같은 단계'면 합쳐지고, 미는 방향 앞에 있던 포탑의 종류가 남는다(behave.merge가 B = 앞 포탑 종류를 남김)
      canMerge(a, b) { return !!this._sliding && this.slideMergeable(a, b); }
      slideMergeable(a, b) {
        if (a === b) return false;
        const A = this.tiles[a] && this.tiles[a].tower, B = this.tiles[b] && this.tiles[b].tower;
        return !!(A && B && A.tier === B.tier && A.tier < 6 && !this.tiles[a].occ && !this.tiles[b].occ);
      }
      merge(a, b) { if (!this._sliding) return false; return super.merge(a, b); }
      // [v2] 지휘관: 철거반장 폭발 = 그 포탑 둘레(본편은 판 변 구역 — 이 판엔 변 구역이 없음)
      useCommander(i) {
        if (this.cmd.id !== 'demolish') return super.useCommander(i);
        if (!this.cmdReady()) return false;
        const t = this.tiles[i]; if (i == null || !t || !t.tower) return false;
        const g = t.tower.tier * 8, hit = this.monsters.filter(m => m.alive && this.dMT(m, i) <= 3.2);
        this.gold += g; t.tower = null;
        this.emit('demolish', { i, gold: g });
        for (const m of hit) this.damage(m, this.hpR() * 1.2, 'none', null, { big: true });
        this.cmd.readyAt = this.t + Math.max(10, D.COMMANDERS.demolish.cd - this.meta.cdCut);
        this.emit('commander', { id: 'demolish', i });
        return true;
      }
      moveTower(a, b) {
        const A = this.tiles[a], B = this.tiles[b];
        B.tower = A.tower; A.tower = null;
        B.warn = A.warn; A.warn = null;
        B.stopUntil = A.stopUntil; A.stopUntil = 0;
        if (this.offer && this.offer.i === a) this.offer = null;
      }
    }
    SlideGame.N = N; SlideGame.NC = NC; SlideGame.NR = NR; SlideGame.NCELL = NCELL; SlideGame.CS = CS; SlideGame.M0 = M0; SlideGame.cellUV = cellUV; SlideGame.DIRS = DIRS;
    SIM.Game = SlideGame;
    return SlideGame;
  }

  if (isNode) module.exports = install; else root.LAB_SLIDE = install;
})(typeof window !== 'undefined' ? window : globalThis);
