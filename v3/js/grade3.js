// 마블 디펜스 3.1 — 5등급(일반 · 희귀 · 영웅 · 전설 · 신화)과 전설 조합 · 신화 각성 · 판 안 미션(2026-11-18 사용자 확정)
//   일반 → 희귀 → 영웅: 지금처럼 같은 단계면 종류 상관없이 밀어서 합친다(2048).
//   전설: 계열마다 정해진 재료(그 계열 영웅 + 짝 계열 영웅 + 희귀 아무거나 1)가 판에 다 있으면 [전설 소환] → 재료가 사라지고 전설 1(값 없음). 판 위 최대 3.
//   신화: 전설이 각성 게이지(처치 수)를 채우고 + 신화석 1 + 그 계열 신화가 판 밖 성장 탭에서 해금돼 있으면 [신화 각성]. 판 위 최대 1.
//   신화석: 보스 처치 + 판 미션(영웅 5계열 모두 판에 · 전설 2개 만들기)
// 내부 단계 번호는 본편 그대로 1 · 2 · 3 · 5 · 6(4는 안 씀) — 본편의 '4단계부터 강한 공격 · 6단계 각성' 규칙이 전설 · 신화에 그대로 붙는다.
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const GRADE = { 1: 1, 2: 2, 3: 3, 4: 3, 5: 4, 6: 5 };           // 내부 단계 → 보이는 등급
  const TIER_OF = [0, 1, 2, 3, 5, 6];                               // 보이는 등급 → 내부 단계
  const GNAME = ['', '일반', '희귀', '영웅', '전설', '신화'];
  const ORDER = ['fire', 'gatling', 'bolt', 'ice', 'light'];       // 짝 계열 = 다음 차례(용 → 로봇 → 구름 → 서리 → 기사 → 용)
  const PARTNER = {}; ORDER.forEach((k, n) => { PARTNER[k] = ORDER[(n + 1) % ORDER.length]; });
  const MERGE_MAX = 3, LEGEND_T = 5, MYTH_T = 6, LEGEND_CAP = 3, MYTH_CAP = 1;
  // 조절 값(봇으로 맞춤 · Node에서 G3='{"legendFrom":5}'로 바꿔 시험): 전설 조합은 legendFrom 라운드부터 · 신화 각성 게이지 = 전설이 처치한 수
  const C3 = { legendFrom: 6, mythKills: 150, upgHit: 0.6 };
  if (isNode && process.env.G3) Object.assign(C3, JSON.parse(process.env.G3));
  const MYTH_KILLS = C3.mythKills;
  const MISSIONS = [
    { id: 'allHero', name: '영웅 5계열 모두 판에 모으기', goal: 5, reward: { myth: 1 } },
    { id: 'legend2', name: '전설 2개 만들기', goal: 2, reward: { myth: 1 } },
    { id: 'multi3', name: '한 번 밀어 3번 합치기', goal: 1, reward: { gold: 60 } },
    { id: 'kills', name: '몬스터 300마리 처치', goal: 300, reward: { gold: 120 } },
    { id: 'upg3', name: '강화 3번 하기', goal: 3, reward: { gold: 60 } },
    { id: 'boss', name: '보스 처치(보스마다 신화석)', goal: 4, reward: { myth: 0 }, repeat: true },
  ];

  function install(SIM, D) {
    D = D || (isNode ? require('../../js/data.js') : root.DATA);
    const Base = SIM.Game;
    // 등급별 힘: 초당 피해(1단계 = 1) 1 · 3 · 9 · 30 · 90 — 2개 합치면 3배(합칠 때마다 확실히 세짐) · 전설 · 신화는 크게 뜀
    //   본편 6단계: 1 · 2.2 · 3.6 · 5.5 · 7.5 · 10(앞 단계 대비 ×1.3 ~ 1.6)
    const T = D.TIER, want = [0, 1, 3, 9, 9, 30, 90];
    // [v3.2] 전설 · 신화는 공속이 아주 빠름(사용자) — 초당 피해는 want 그대로(탄 1발 피해가 그만큼 작아짐). 한 번에 쏘는 탄 수는 줄임(화면 · 성능)
    T.aps = [0, 1, 1.15, 1.35, 1.35, 2.6, 3.6];
    T.shots = [0, 1, 1, 2, 2, 2, 3];
    const aps = T.aps;
    // [v3.3] 강화 = 랜덤다이스2 방식: 강화 1레벨마다 '탄 1발당 고정 공격력'을 더한다(랜다2 불: 기본 150 · 눈금당 +100 · 강화당 +150 — 눈금과 상관없이 같은 값).
    //   → 낮은 등급일수록 강화가 크게 느껴지고(일반 Lv10 = 약 7배), 높은 등급은 덜(신화 Lv10 = 약 1.7배). 본편의 '× (1 + 10%·Lv)'는 끔
    D.ECON.upgStep = 0;
    T.vol = want.map((w, t) => t ? w / aps[t] : 0);
    T.dmg = T.vol.map((v, t) => t ? v / T.shots[t] : 0);
    T.name = ['', '일반', '희귀', '영웅', '영웅', '전설', '신화'];
    T.ring = ['', '#c9c4bd', '#7fb8ff', '#c08cff', '#c08cff', '#ffb43a', '#ff5a6a'];

    class GradeGame extends Base {
      constructor(opt) {
        super(opt);
        this.mergeMax = MERGE_MAX;
        this.mythStones = 0;
        this.mythOpen = new Set(opt.mythOpen || ['fire']);   // 판 밖 성장 탭에서 해금한 계열(첫 계열은 처음부터 열림)
        this.mis = MISSIONS.map(m => ({ id: m.id, n: 0, done: false }));
        this.stats.legendsMade = 0; this.stats.myths = 0;
      }
      grade(t) { return GRADE[t] || t; }
      // 탄 1발 피해 = 기본 × 등급 배율 / 탄 수 + (기본 공격력 × UPG_HIT × 강화 Lv)
      dmgMul(i) {
        const base = super.dmgMul(i), tw = this.tiles[i].tower, lv = this.upg[tw.type] || 0; if (!lv) return base;
        const n = tw.type === 'gatling' ? 3 * tw.tier : T.shots[tw.tier];
        return base * (1 + C3.upgHit * lv * n / T.vol[tw.tier]);
      }
      upgHitAdd(type) { return Math.round(D.TOWERS[type].atk * C3.upgHit); }
      useCommander(i) {
        const id = this.cmd.id;
        if (id !== 'freeze' && id !== 'meteor') return super.useCommander(i);
        if (!this.cmdReady()) return false;
        if (id === 'freeze') { for (const m of this.monsters) if (m.alive) m.stunUntil = Math.max(m.stunUntil, this.t + (m.boss ? 2 : 4)); }
        else { for (const m of this.monsters.slice()) if (m.alive) this.damage(m, m.boss ? m.maxHp * 0.12 : this.hpR() * 6, 'none', null, { big: true }); }
        this.cmd.readyAt = this.t + Math.max(10, D.COMMANDERS[id].cd - (this.meta.cdCut || 0));
        this.emit('commander', { id });
        return true;
      }
      slideMergeable(a, b) { const A = this.tiles[a] && this.tiles[a].tower; return !!(A && A.tier < this.mergeMax) && super.slideMergeable(a, b); }
      // 행운 합치기(+1) · 건축가가 영웅을 넘지 않게: 합치기로는 영웅까지만
      setTier(i, tier, why, lucky) { if (why !== 'legend' && why !== 'mythic' && why !== 'debug' && tier > this.mergeMax) tier = this.mergeMax; return super.setTier(i, tier, why, lucky); }

      // ---------------------------------------------------------- 전설 조합
      // 반환: { ok, main, partner, rare, need: [{ what, have }] } — 화면(조합 창)이 재료 표시에 그대로 쓴다
      legendRecipe(type) {
        const L = this.towersList(), free = t => !t.occ && !this.disabled(t.i);
        const main = L.find(t => t.tower.type === type && t.tower.tier === 3 && free(t));
        const pt = PARTNER[type];
        const partner = L.find(t => t.tower.type === pt && t.tower.tier === 3 && free(t) && t !== main);
        const rare = L.find(t => t.tower.tier === 2 && free(t));
        const cap = this.towersList().filter(t => t.tower.tier === LEGEND_T).length >= LEGEND_CAP;
        const locked = this.round < C3.legendFrom;   // 첫 보스(5라운드)를 지나야 전설 조합이 열림
        return { type, partnerType: pt, ok: !!(main && partner && rare) && !cap && !locked, cap, locked, from: C3.legendFrom, main: main && main.i, partner: partner && partner.i, rare: rare && rare.i,
          need: [{ what: 'main', have: !!main }, { what: 'partner', have: !!partner }, { what: 'rare', have: !!rare }] };
      }
      makeLegend(type) {
        if (this.over) return false;
        const r = this.legendRecipe(type); if (!r.ok) { this.emit('legendNo', { type, cap: r.cap }); return false; }
        const from = [r.partner, r.rare].map(i => ({ i, type: this.tiles[i].tower.type, tier: this.tiles[i].tower.tier }));
        for (const f of from) { this.tiles[f.i].tower = null; this.tiles[f.i].warn = null; }
        this.tiles[r.main].tower.kills = 0;
        this.setTier(r.main, LEGEND_T, 'legend');
        this.stats.legendsMade++; this.stats.legends = (this.stats.legends || 0) + 1;
        if (!this._firstLeg) this._firstLeg = this.round;
        this.emit('legend', { i: r.main, type, from });
        this.misAdd('legend2', 1);
        return true;
      }
      // ---------------------------------------------------------- 신화 각성
      mythState(i) {
        const t = this.tiles[i], tw = t && t.tower; if (!tw || tw.tier !== LEGEND_T) return null;
        const open = this.mythOpen.has(tw.type), gauge = Math.min(1, (tw.kills || 0) / MYTH_KILLS), cap = this.towersList().filter(q => q.tower.tier === MYTH_T).length >= MYTH_CAP;
        return { open, gauge, kills: tw.kills || 0, need: MYTH_KILLS, stones: this.mythStones, cap, ok: open && gauge >= 1 && this.mythStones >= 1 && !cap };
      }
      awakenMythic(i) {
        const s = this.mythState(i); if (!s || !s.ok || this.over) { this.emit('mythNo', { i, s }); return false; }
        this.mythStones--;
        this.setTier(i, MYTH_T, 'mythic');
        this.stats.myths++;
        if (!this._firstMyth) this._firstMyth = this.round;
        this.emit('mythic', { i, type: this.tiles[i].tower.type });
        return true;
      }
      kill(m, src) {
        if (src && src.tile != null) { const tw = this.tiles[src.tile] && this.tiles[src.tile].tower; if (tw && tw.tier === LEGEND_T) tw.kills = (tw.kills || 0) + 1; }
        const r = super.kill(m, src);
        this.misAdd('kills', 1);
        return r;
      }
      // ---------------------------------------------------------- 신화석 · 미션
      addMyth(n, why) { this.mythStones += n; this.emit('mythStone', { n, total: this.mythStones, why }); }
      misAdd(id, n, set) {
        const M = MISSIONS.find(q => q.id === id), s = this.mis.find(q => q.id === id); if (!M || !s || s.done) return;
        s.n = set ? Math.max(s.n, n) : s.n + n;
        if (s.n >= M.goal) {
          s.done = true;
          if (M.reward.myth) this.addMyth(M.reward.myth, M.name);
          if (M.reward.gold) { this.gold += M.reward.gold; this.emit('gold', { amt: M.reward.gold, why: M.name }); }
          this.emit('missionDone', { id, name: M.name, reward: M.reward });
        }
      }
      bossDown(m) { super.bossDown(m); this.addMyth(1, '보스 처치'); this.misAdd('boss', 1); }
      upgrade(type) { const ok = super.upgrade(type); if (ok) this.misAdd('upg3', 1); return ok; }
      slide(dir) {
        const ok = super.slide(dir);
        if (ok) {
          const last = this.events[this.events.length - 1];
          if (last && last.ev === 'slid' && last.merges.length >= 3) this.misAdd('multi3', 1);
          this.checkBoard();
        }
        return ok;
      }
      checkBoard() { const kinds = new Set(this.towersList().filter(t => t.tower.tier >= 3).map(t => t.tower.type)); this.misAdd('allHero', kinds.size, true); }
      build(i, type, tier) { const r = super.build(i, type, tier); return r; }
      step(dt) { super.step(dt); if (!this._ck || this.t - this._ck > 0.5) { this._ck = this.t; this.checkBoard(); } }
    }
    GradeGame.GRADE = GRADE; GradeGame.TIER_OF = TIER_OF; GradeGame.GNAME = GNAME; GradeGame.PARTNER = PARTNER; GradeGame.ORDER = ORDER;
    GradeGame.MISSIONS = MISSIONS; GradeGame.C3 = C3; GradeGame.MYTH_KILLS = MYTH_KILLS; GradeGame.LEGEND_CAP = LEGEND_CAP; GradeGame.MYTH_CAP = MYTH_CAP;
    // 같은 이름에 붙어 있던 정적 값(N · DIRS · cellUV …)을 이어받음
    for (const k of Object.keys(Base)) if (!(k in GradeGame)) GradeGame[k] = Base[k];
    SIM.Game = GradeGame;
    return GradeGame;
  }
  const API = { install, C3, GRADE, TIER_OF, GNAME, PARTNER, ORDER, MISSIONS };
  if (isNode) module.exports = API; else root.GRADE3 = API;
})(typeof window !== 'undefined' ? window : globalThis);
