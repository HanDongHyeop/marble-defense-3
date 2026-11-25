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
  // [v3.6 실험] heroMerge = 영웅(Lv.3)끼리 부딪혔을 때: null = 안 합쳐짐(지금) / 'upg' = 뒤 영웅이 흡수되고 앞 영웅 계열 강화 +absorbLv / 'star' = 앞 영웅에 별 +1(그 한 명만 피해 +starMul)
  const C3 = { legendFrom: 6, mythKills: 150, upgHit: 0.6, heroMerge: null, absorbLv: 1, absorbCap: 30, starMul: 0.5, sameType: false, randType: false, anyType: true, frzPlus: 0.5, drag: true, allRange: false, move: false, shotSpd: 1.9, shotMin: 700 };
  // [v3.9 · 2026-11-23 사용자] 반경 복구 — 캐릭터(계열 × 등급)마다 다름. 값 = 원 반지름(100px = 초원 판 1칸). 가장 작은 반경 2.0 = 제 칸 + 바깥 1.5칸.
  //   단거리(등급이 올라도 거의 안 커짐 · 대신 피해가 큼): 용(fire · 숨결) · 기사(light · 칼). 나머지는 등급이 오르면 대체로 커지되 계열마다 계단이 다름
  const RANGE = { fire: [2.0, 2.0, 2.2, 2.2, 2.5], light: [2.0, 2.0, 2.3, 2.5, 2.7], corrode: [2.2, 2.2, 2.6, 3.0, 3.4], bolt: [2.3, 2.5, 2.8, 3.2, 3.7], gatling: [2.4, 2.6, 2.9, 3.3, 3.8], ice: [2.5, 2.5, 3.0, 3.4, 4.0], combo: [2.8, 3.0, 3.3, 3.8, 4.5] };
  const POWER = { fire: 1.3, light: 1.12 };   // 단거리 계열의 피해 배율
  const SHOT_T = [0, 1, 1.1, 1.25, 1.25, 1.45, 1.7];   // 등급별 탄 속도 배율(1등급도 빠르게 · shotSpd가 전체 배율)
  // [v3.10 · 2026-11-25 사용자] anyType = 같은 등급이면 계열이 달라도 합쳐짐 · 끌어 놓은 쪽이 사라지고 가만히 있던 쪽이 제 계열 그대로 한 등급 오름(randType 끔 — 결과 계열 무작위 없음). 흔적 넘겨주기는 다음 단계
  // [v3.10] frzPlus = 서리 얼음 5칸이 차서 얼 때 얼림 시간 +0.5초(1 → 1.5초 · 보스 제외)
  // [v3.8] allRange = 사거리 없음(판 어디서든 모든 몬스터에 닿음 — 랜덤다이스처럼 자리가 뜻이 없음) · move = 빈 칸으로 끌어 자리 옮기기(allRange면 필요 없어 끔)
  // [v3.7] drag = 끌어서(또는 탭-탭) 합치기: 같은 종류 + 같은 등급이면 판 어디서든 합쳐지고 신화까지 올라감(밀기 · 전설 조합 · 신화 각성 · 개수 제한 없음). randType = 합친 결과의 계열이 무작위(랜덤다이스)   // [v3.7 실험] sameType = 같은 종류 + 같은 레벨만 합쳐짐(랜덤다이스) / randType = 합친 결과의 종류가 무작위
  if (isNode && process.env.G3) Object.assign(C3, JSON.parse(process.env.G3));
  // 폰에서 시험: 로비 주소에 ?hm=upg(계열 강화) · ?hm=star(별) · ?hm=off(끄기) — 한 번 열면 이 기기에 기억(mdv3_hm)
  if (!isNode) try { const q = new URLSearchParams(location.search).get('hm'); if (q) { if (q === 'off') localStorage.removeItem('mdv3_hm'); else localStorage.setItem('mdv3_hm', q); } const h = localStorage.getItem('mdv3_hm'); if (h === 'upg' || h === 'star') { C3.heroMerge = h; C3.absorbLv = 2; C3.starMul = 1; } } catch (e) { /* 저장 막힘 */ }
  const MYTH_KILLS = C3.mythKills;
  const MISSIONS = [
    { id: 'allHero', name: '영웅 5계열 모두 판에 모으기', goal: 5, reward: { myth: 1 } },
    { id: 'legend2', name: '전설 2개 만들기', goal: 2, reward: { myth: 1 } },
    C3.drag ? { id: 'merge20', name: '합치기 20번', goal: 20, reward: { gold: 60 } } : { id: 'multi3', name: '한 번 밀어 3번 합치기', goal: 1, reward: { gold: 60 } },
    { id: 'kills', name: '몬스터 300마리 처치', goal: 300, reward: { gold: 120 } },
    { id: 'upg3', name: '강화 3번 하기', goal: 3, reward: { gold: 60 } },
    { id: 'boss', name: '보스 처치(보스마다 신화석)', goal: 4, reward: { myth: 0 }, repeat: true },
  ];

  const UPX = 120 / 1.68;   // 판 좌표 1 = px
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
        this.dragMode = !!C3.drag; this.allRange = !!(C3.drag && C3.allRange); this.canMove = !!(C3.drag && C3.move); this.mergeMax = this.dragMode ? MYTH_T : MERGE_MAX;
        this.heroMerge = opt.heroMerge !== undefined ? opt.heroMerge : C3.heroMerge; this.stats.absorbs = 0; this.sameType = C3.sameType;
        this.mythStones = 0;
        this.mythOpen = new Set(opt.mythOpen || ['fire']);   // 판 밖 성장 탭에서 해금한 계열(첫 계열은 처음부터 열림)
        this.mis = MISSIONS.map(m => ({ id: m.id, n: 0, done: false }));
        this.stats.legendsMade = 0; this.stats.myths = 0;
      }
      grade(t) { return GRADE[t] || t; }
      // 탄 1발 피해 = 기본 × 등급 배율 / 탄 수 + (기본 공격력 × UPG_HIT × 강화 Lv)
      dmgMul(i) {
        const tw = this.tiles[i].tower, base = super.dmgMul(i) * (1 + C3.starMul * (tw.star || 0)) * (this.allRange ? 1 : POWER[tw.type] || 1), lv = this.upg[tw.type] || 0; if (!lv) return base;
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
      // [v3.6] 보스 교란: 전설 · 신화는 건드리지 않음(전설이 −1단계 되면 안 쓰는 내부 단계 4가 됨)
      //   마술사 = 선물: 가장 낮은 아군 1명을 한 등급 올려 줌(전: 옛 '프리즘' 종류로 바꿈 → v3에 그림이 없어 옛 사람 그림이 나오던 버그)
      bossDisrupt(k, cand) {
        cand = cand.filter(t => t.tower.tier < LEGEND_T && t.tower.type !== 'prism');
        if (k === 'magician') {
          const t = cand.filter(c => c.tower.tier < MERGE_MAX).sort((a, c) => a.tower.tier - c.tower.tier)[0];
          if (t) { this.setTier(t.i, t.tower.tier + 1, 'tierup'); this.emit('hexed', { i: t.i, gift: 1, by: k }); }
          else { const g = this.round * 5; this.gold += g; this.emit('gold', { amt: g, why: '마술사의 선물' }); }
          return 15;
        }
        return super.bossDisrupt(k, cand);
      }
      // [v3.7] 끌어서 합치기: 같은 계열 + 같은 등급(신화 제외). 앞(b)에 있던 칸에 한 등급 위 아군이 남음. 영웅 2 → 전설, 전설 2 → 신화
      canMerge(a, b) {
        if (!this.dragMode) return super.canMerge(a, b);
        if (a === b) return false;
        const A = this.tiles[a] && this.tiles[a].tower, B2 = this.tiles[b] && this.tiles[b].tower;
        return !!(A && B2 && (C3.anyType || A.type === B2.type) && A.tier === B2.tier && A.tier < MYTH_T && !this.tiles[a].occ && !this.tiles[b].occ);
      }
      emit(ev, o) {
        if (ev === 'frozen' && C3.frzPlus && o && o.id != null) { const m = this.monsters.find(q => q.id === o.id); if (m && !m.boss && Math.abs((m.frozenUntil || 0) - this.t - 1) < 0.01) m.frozenUntil += C3.frzPlus; }
        return super.emit(ev, o);
      }
      dragMerge(a, b) {
        if (this.over || !this.canMerge(a, b)) return false;
        const A = this.tiles[a].tower, Bt = this.tiles[b].tower, nt = Bt.tier === 3 ? LEGEND_T : Bt.tier + 1;
        this.tiles[a].tower = null; this.tiles[a].warn = null; this.tiles[b].warn = null;
        this.stats.merges++;
        this.emit('mergeFrom', { a, b, type: Bt.type, tier: Bt.tier, typeA: A.type });
        if (C3.randType) Bt.type = this.buildPick();
        Bt.bonusAtk = Math.max(A.bonusAtk || 0, Bt.bonusAtk || 0);
        this.setTier(b, nt, nt === LEGEND_T ? 'legend' : nt === MYTH_T ? 'mythic' : 'merge');
        if (nt === LEGEND_T) { this.stats.legendsMade++; this.stats.legends = (this.stats.legends || 0) + 1; if (!this._firstLeg) this._firstLeg = this.round; this.emit('legend', { i: b, type: Bt.type, from: [{ i: a, type: A.type, tier: 3 }] }); this.misAdd('legend2', 1); }
        if (nt === MYTH_T) { this.stats.myths++; if (!this._firstMyth) this._firstMyth = this.round; this.emit('mythic', { i: b, type: Bt.type }); }
        this.misAdd('merge20', 1);
        return true;
      }
      // [v3.7] 자리 옮기기: 아군을 빈 칸으로 끌면 그 칸으로 감(값 없음). 밀기가 없어져 소환된 자리에 묶이면 길에서 먼 칸의 아군은 공격이 안 닿는다(봇: 성장 없음 0/20)
      rangeOf(i) { if (this.allRange) return 99; const tw = this.tiles[i].tower, R = tw && RANGE[tw.type]; if (!R) return super.rangeOf(i); return R[(GRADE[tw.tier] || 1) - 1] * 100 / UPX - 1; }   // 판정: 몬스터까지 거리 ≤ rangeOf + 1(판 좌표)
      rangePx(i) { return (this.rangeOf(i) + 1) * UPX; }
      // [v3.9] 탄이 훨씬 빠르게(1등급부터) · 등급이 오르면 더 빠르게
      shot(kind, i, m, dmg, speed, delay, extra) { const tw = this.tiles[i].tower; return super.shot(kind, i, m, dmg, Math.max(speed, C3.shotMin) * C3.shotSpd * SHOT_T[tw ? tw.tier : 1], delay, extra); }
      moveTo(a, b) {
        if (!this.canMove || this.over || a === b) return false;
        const A = this.tiles[a], Bt = this.tiles[b];
        if (!A || !Bt || !A.tower || A.occ || Bt.tower || Bt.blocked) return false;
        Bt.tower = A.tower; A.tower = null; Bt.warn = A.warn || null; A.warn = null;
        this.stats.moves = (this.stats.moves || 0) + 1;
        this.emit('moved', { a, b });
        return true;
      }
      heroPair(a, b) { if (!this.heroMerge || a === b) return false; const A = this.tiles[a], B = this.tiles[b]; return !!(A && B && A.tower && B.tower && A.tower.tier === 3 && B.tower.tier === 3 && !A.occ && !B.occ); }
      slideMergeable(a, b) { if (this.dragMode) return false; if (this.heroPair(a, b)) return true; const A = this.tiles[a] && this.tiles[a].tower, B2 = this.tiles[b] && this.tiles[b].tower; if (C3.sameType && A && B2 && A.type !== B2.type) return false; return !!(A && A.tier < this.mergeMax) && super.slideMergeable(a, b); }
      merge(a, b) {
        if (this.dragMode) return this.dragMerge(a, b);
        if (!this._sliding || !this.heroPair(a, b)) { const ok = super.merge(a, b); if (ok && C3.randType) { const T = this.tiles[b].tower; if (T && T.tier <= 3) T.type = this.buildPick(); } return ok; }
        const A = this.tiles[a].tower, Bt = this.tiles[b].tower;
        this.tiles[a].tower = null; this.tiles[a].warn = null;
        this.stats.merges++; this.stats.absorbs++;
        this.emit('mergeFrom', { a, b, type: Bt.type, tier: Bt.tier, typeA: A.type });
        if (this.heroMerge === 'star') { Bt.star = (Bt.star || 0) + 1 + (A.star || 0); Bt.upT = this.t; this.emit('absorb', { i: b, type: Bt.type, star: Bt.star }); }
        else { const lv = this.upg[Bt.type] = Math.min(C3.absorbCap, (this.upg[Bt.type] || 0) + C3.absorbLv); this.emit('absorb', { i: b, type: Bt.type, lv }); this.emit('upgrade', { type: Bt.type, lv, free: 1 }); }
        return true;
      }
      // 행운 합치기(+1) · 건축가가 영웅을 넘지 않게: 합치기로는 영웅까지만
      setTier(i, tier, why, lucky) { if (tier === 4) { const cur = this.tiles[i].tower ? this.tiles[i].tower.tier : 3; tier = this.dragMode && cur < 4 ? LEGEND_T : 3; }   // 내부 단계 4는 안 씀
        if (why !== 'legend' && why !== 'mythic' && why !== 'debug' && tier > this.mergeMax) tier = this.mergeMax; return super.setTier(i, tier, why, lucky); }

      // ---------------------------------------------------------- 유물(판 밖 성장) · 행운 뽑기
      applyRelics(rl) {
        const L = this.relics = Object.assign({ purse: 0, heart: 0, blade: 0, clover: 0, scroll: 0, glass: 0 }, rl || {});
        this.gold += L.purse * 15;
        if (this.cry) { this.cry.hp += L.heart; this.cry.max += L.heart; }
        if (L.glass) this.meta = Object.assign({}, this.meta, { cdCut: (this.meta.cdCut || 0) + L.glass * 1.2 });
      }
      damage(m, amt, dtype, src, opts) { if (m && m.boss && this.relics && this.relics.blade) amt *= 1 + this.relics.blade * 0.04; return super.damage(m, amt, dtype, src, opts); }
      // 행운 뽑기(운빨존많겜 도박): 희귀 = 금화 50 · 성공 60% / 영웅 = 신화석 1 · 성공 40%. 꽝이면 아무것도 안 나옴(영웅 꽝은 금화 40 위로금)
      gambleInfo(kind) {
        const luck = this.relics ? this.relics.clover * 0.02 : 0, empty = this.tiles.some(t => !t.tower && !t.blocked);
        const I = kind === 'hero' ? { tier: 3, costGold: 0, costMyth: 1, p: 0.4 + luck } : { tier: 2, costGold: 50, costMyth: 0, p: 0.6 + luck };
        I.ok = empty && this.gold >= I.costGold && this.mythStones >= I.costMyth && !this.over; I.empty = empty;
        return I;
      }
      gamble(kind) {
        const I = this.gambleInfo(kind); if (!I.ok) { this.emit('gambleNo', { kind, empty: I.empty }); return false; }
        this.gold -= I.costGold; this.mythStones -= I.costMyth;
        const win = this.r() < I.p; let i = -1;
        if (win) { const t = this.pickOne(this.tiles.filter(q => !q.tower && !q.blocked)); i = t.i; this.build(i, this.buildPick(), I.tier); }
        else if (kind === 'hero') { this.gold += 40; }
        this.stats.gambles = (this.stats.gambles || 0) + 1;
        this.emit('gamble', { kind, win, i, tier: I.tier });
        return true;
      }

      // ---------------------------------------------------------- 전설 조합
      // 반환: { ok, main, partner, rare, need: [{ what, have }] } — 화면(조합 창)이 재료 표시에 그대로 쓴다
      legendRecipe(type) {
        const L = this.towersList(), free = t => !t.occ && !this.disabled(t.i);
        const main = L.find(t => t.tower.type === type && t.tower.tier === 3 && free(t));
        const pt = PARTNER[type];
        const partner = L.find(t => t.tower.type === pt && t.tower.tier === 3 && free(t) && t !== main);
        const rare = L.find(t => t.tower.tier === 2 && free(t));
        const cap = this.towersList().filter(t => t.tower.tier === LEGEND_T).length >= LEGEND_CAP;
        const locked = this.round < C3.legendFrom || this.dragMode;   // 첫 보스(5라운드)를 지나야 전설 조합이 열림
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
        const t = this.tiles[i], tw = t && t.tower; if (this.dragMode || !tw || tw.tier !== LEGEND_T) return null;
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
          if (M.reward.gold) { const gg = Math.round(M.reward.gold * (1 + (this.relics ? this.relics.scroll * 0.1 : 0))); this.gold += gg; this.emit('gold', { amt: gg, why: M.name }); }
          this.emit('missionDone', { id, name: M.name, reward: M.reward });
        }
      }
      bossDown(m) { super.bossDown(m); this.addMyth(1, '보스 처치'); this.misAdd('boss', 1); }
      upgrade(type) { const ok = super.upgrade(type); if (ok) this.misAdd('upg3', 1); return ok; }
      slide(dir) {
        if (this.dragMode) return false;
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
  const API = { install, C3, RANGE, GRADE, TIER_OF, GNAME, PARTNER, ORDER, MISSIONS };
  if (isNode) module.exports = API; else root.GRADE3 = API;
})(typeof window !== 'undefined' ? window : globalThis);
