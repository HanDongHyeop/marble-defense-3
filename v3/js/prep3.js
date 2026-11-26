// 마블 디펜스 3 — 준비 · 전투 모드(2026-11-26 사용자 확정 · 슬롯바운드 흐름 참고). 지금 방식(실시간)은 그대로 두고 로비에서 고르는 모드.
//   흐름: 웨이브 몬스터가 판에서 다 없어지면(처치 · 수정 도착) 준비 10초(P.prepTime · [바로 시작]으로 건너뜀) → 다음 웨이브(적은 많이) → 다시 준비
//   [2026-11-26 사용자] 준비 시간 제한 없음 → 10초로 · 전투 중 소환 끄기 설정은 없앰(소환은 늘 됨). 고르는 창(갈래 카드 · 각성)은 준비 시간에만(창이 떠 있는 동안 시계 멈춤) — 전투 중엔 머리 위 '!'
//   성장: 합치기 없음. 아무 캐릭터나 끌어 놓으면 '먹이기' = 레벨 +1(+ 도시락) + 먹힌 캐릭터 계열의 흔적 하나.
//         그 등급의 정해진 레벨(P.thr)에 닿으면 갈래 카드 2장 → 한 등급 오름. 신화(최고)가 된 뒤에도 먹이면 P.awk 레벨마다 각성 카드 3장 중 1장
//   흔적: 계열마다 정해진 흔적 하나(05 확정안 표). 칸 = 등급별 P.slots. 빈 칸 = [받기 · 취소] / 같은 흔적 = 자동 레벨업(Lv3이면 자동으로 레벨로) / 칸이 가득 = [바꾸기 · 레벨로 · 취소]
//         먹힌 캐릭터가 받는 쪽과 같은 계열이면 흔적 대신 '메인 강화'(레벨당 피해 +10%, 최대 3 → 그다음은 자동으로 레벨로)
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const P = {
    thr: [0, 8, 18, 30, 45],          // 보이는 등급 g(1 일반 ~ 4 전설)의 레벨이 thr[g]에 닿으면 다음 등급 갈래 카드
    lvStart: [0, 1, 8, 18, 30, 45],   // 그 등급으로 바로 나온 캐릭터(미니릴 · 행운 뽑기)의 시작 레벨
    awk: [60, 80, 100],                // 신화 각성 I · II · III 레벨
    slots: [0, 1, 1, 2, 2, 3],        // 흔적 칸(일반 1 · 희귀 1 · 영웅 2 · 전설 2 · 신화 3)
    conv: [0, 1, 2, 3, 4, 5],         // 칸이 가득 찼을 때 [레벨로] 덤 = 먹힌 캐릭터 등급별(일반 +1 ~ 신화 +5) — 기본 +1에 더함
    // 레벨 힘: 피해 × gx[등급] × (1 + slope[등급] × (레벨 − 그 등급 시작 레벨)). 등급 힘(1 · 3 · 9 · 30 · 90)에 곱함
    //   한 등급 안에서는 먹일 때마다 먹힌 캐릭터 힘이 거의 그대로 넘어오고(일반은 1마리 ≈ +0.58배 · 칸이 차서 [레벨로]면 +2 레벨), 문턱에서 등급이 오르면 한 번 뜀
    //   결과 힘(일반 Lv1 = 1): 희귀 Lv8 ≈ 6 · 영웅 Lv18 ≈ 18 · 전설 Lv30 ≈ 48 · 신화 Lv45 ≈ 110(옛 같은 등급 합치기: 2마리 3 · 4마리 9 · 8마리 30 · 16마리 90)
    gx: [0, 1, 2, 2, 1.6, 1.22],
    slope: [0, 0.58, 0.139, 0.091, 0.05, 0.015],
    mainUp: 0.10,                     // 같은 계열 먹이기(메인 강화) 1마다 피해 +10%
    trP: 0.25,                        // 흔적 확률 = 레벨 × 25%(최대 Lv3 = 75%)
    lunchP: 0.06, lunchV: [[1, 0.48], [2, 0.30], [3, 0.22]],   // 도시락: 일반 · 희귀 소환의 6% · 값 +1 / +2 / +3(슬롯바운드 +1~5의 40 · 25 · 18%를 줄여 맞춤)
    killGold: 0.35,                   // 처치 금화는 35%만 바로 · 나머지 65%는 웨이브를 이기면 한꺼번에
    count: 1.5, hp: 0.7,              // 웨이브 몬스터 수 ×1.5 · 한 마리 체력 ×0.7(많이 잡는 맛 · 웨이브 총 체력 ×1.05)
    countFrom: 1.0, countRamp: 5,     // 마릿수 배율은 1웨이브 ×1.0에서 5웨이브 ×1.5까지 늘어남(초반엔 합치기가 없어 힘이 약함)
    earlyHp: 0.75,                    // 1웨이브 체력 ×0.75 → 5웨이브 ×1(한 명을 키우기 전 구간이 가장 약함)
    startGold: 60,                    // 준비 시간에 먼저 소환하라고 시작 금화 +60
    hpMul: 0.9,                       // 밸런스(봇: 0.85 → 1장 보통 94% · 1.0 → 58%)
    interestPer: 25, interestMax: 8,  // 이자 = 가진 금화 25마다 +1(최대 +8)
    prepTime: 10, firstPrep: 15,      // 웨이브 사이 준비 시간(초) · 첫 웨이브 전
  };
  let on = false;
  if (isNode) { on = !!process.env.PREP; if (process.env.PREPX) Object.assign(P, JSON.parse(process.env.PREPX)); }
  else try {
    const q = new URLSearchParams(location.search);
    const md = q.get('mode'); if (md) { if (md === 'prep') localStorage.setItem('mdv3_mode', 'prep'); else localStorage.removeItem('mdv3_mode'); }
    on = localStorage.getItem('mdv3_mode') === 'prep';
  } catch (e) { /* 저장 막힘 */ }

  // 흔적(05 확정안) — 확률형(화상 · 얼음 · 저주 · 튐 · 한 번 더)과 공속형(기계 · 기사)
  const TR = {
    fire:    { n: '화상', d: lv => `맞힐 때 ${lv * 25}%로 3초 화상(때린 피해의 12%/초)` },
    ice:     { n: '얼음', d: lv => `맞힐 때 ${lv * 25}%로 얼음 1칸(5칸 = 얼림)` },
    corrode: { n: '저주', d: lv => `맞힐 때 ${lv * 25}%로 저주 1칸(받는 피해 ↑ · 최대 3칸)` },
    gatling: { n: '빨라짐', aps: [0.10, 0.20, 0.30], d: lv => `공격 속도 +${lv * 10}%` },
    bolt:    { n: '튐', d: lv => `맞힐 때 ${lv * 25}%로 옆 적에게 50% 피해로 튐` },
    combo:   { n: '한 번 더', d: lv => `맞힐 때 ${lv * 25}%로 한 번 더 때림` },
    light:   { n: '공속', aps: [0.08, 0.16, 0.24], d: lv => `공격 속도 +${lv * 8}%` },
  };
  // 등급업 갈래(새 그림 없이 시작 — 사용자 (다)는 아직 답이 없어 기본안). 계열마다 두 갈래
  const BR = {
    atk: { n: '강공형', dmg: 0.20, d: '피해 ▲▲' },
    spd: { n: '속공형', aps: 0.15, d: '공격 속도 ▲▲' },
    rng: { n: '원거리형', rng: 0.35, dmg: 0.08, d: '반경 ▲ · 피해 ▲' },
  };
  const BR_OF = { fire: ['atk', 'spd'], light: ['atk', 'spd'], corrode: ['atk', 'spd'], gatling: ['spd', 'rng'], bolt: ['atk', 'rng'], ice: ['spd', 'rng'], combo: ['atk', 'rng'] };
  // 각성(신화 뒤 · I · II · III 단계 값). 공통 4장 + 계열 2장 중 3장을 보여 줌(고른 것은 다시 안 나옴)
  const AWK_ALL = [
    { id: 'power', n: '집중 공격', k: 'dmg', v: [0.12, 0.18, 0.25], d: '피해 +{v}%' },
    { id: 'haste', n: '전투 본능', k: 'aps', v: [0.10, 0.15, 0.20], d: '공격 속도 +{v}%' },
    { id: 'boss', n: '보스 사냥', k: 'boss', v: [0.20, 0.30, 0.40], d: '보스에게 주는 피해 +{v}%' },
    { id: 'crit', n: '급소 노리기', k: 'crit', v: [0.08, 0.12, 0.16], d: '치명타 확률 +{v}%p' },
  ];
  const AWK_FAM = {
    fire:    [{ id: 'f1', n: '불꽃 강타', k: 'dmg', v: [0.15, 0.22, 0.30], d: '피해 +{v}%' }, { id: 'f2', n: '화염 확산', k: 'rng', v: [0.3, 0.45, 0.6], d: '반경 +{v}칸', raw: 1 }],
    gatling: [{ id: 'g1', n: '과열 회로', k: 'aps', v: [0.12, 0.18, 0.25], d: '공격 속도 +{v}%' }, { id: 'g2', n: '철갑탄', k: 'boss', v: [0.25, 0.35, 0.50], d: '보스에게 주는 피해 +{v}%' }],
    bolt:    [{ id: 'b1', n: '연쇄 증폭', k: 'dmg', v: [0.15, 0.22, 0.30], d: '피해 +{v}%' }, { id: 'b2', n: '먹구름', k: 'rng', v: [0.3, 0.45, 0.6], d: '반경 +{v}칸', raw: 1 }],
    ice:     [{ id: 'i1', n: '혹한', k: 'proc', v: [0.10, 0.15, 0.20], d: '흔적이 터질 확률 +{v}%p' }, { id: 'i2', n: '눈보라', k: 'rng', v: [0.3, 0.45, 0.6], d: '반경 +{v}칸', raw: 1 }],
    light:   [{ id: 'l1', n: '수호의 맹세', k: 'aps', v: [0.12, 0.18, 0.25], d: '공격 속도 +{v}%' }, { id: 'l2', n: '성검', k: 'boss', v: [0.25, 0.35, 0.50], d: '보스에게 주는 피해 +{v}%' }],
    corrode: [{ id: 'c1', n: '깊은 저주', k: 'proc', v: [0.10, 0.15, 0.20], d: '흔적이 터질 확률 +{v}%p' }, { id: 'c2', n: '지옥불', k: 'dmg', v: [0.15, 0.22, 0.30], d: '피해 +{v}%' }],
    combo:   [{ id: 'm1', n: '마력 폭주', k: 'aps', v: [0.12, 0.18, 0.25], d: '공격 속도 +{v}%' }, { id: 'm2', n: '별의 지혜', k: 'rng', v: [0.3, 0.45, 0.6], d: '반경 +{v}칸', raw: 1 }],
  };
  const AWK_BY = {}; for (const c of AWK_ALL) AWK_BY[c.id] = c; for (const k in AWK_FAM) for (const c of AWK_FAM[k]) AWK_BY[c.id] = c;
  const awkText = (c, s) => c.d.replace('{v}', c.raw ? c.v[s] : Math.round(c.v[s] * 100));

  const UPX = 120 / 1.68;
  function install(SIM, D) {
    const Base = SIM.Game, GR = isNode ? require('./grade3.js') : root.GRADE3;
    const GRADE = GR.GRADE, TIER_OF = GR.TIER_OF, ECON = D.ECON;
    const gOf = tw => GRADE[tw.tier] || 1;

    class PrepGame extends Base {
      constructor(opt) {
        super(opt);
        this.prepOn = opt.prep != null ? !!opt.prep : on;
        if (!this.prepOn) return;
        this.phase = 'prep'; this.debt = 0; this.kAcc = 0; this.prepEnd = this.t + P.firstPrep;
        this.stats.feeds = 0; this.stats.gradeUps = 0; this.stats.battleT = []; this.battleT0 = 0;
        this.gold += P.startGold;
      }
      // ---------------------------------------------------------------- 흐름: 준비 ↔ 전투
      step(dt) {
        if (!this.prepOn) return super.step(dt);
        if (this.phase !== 'prep') { super.step(dt); this.stepBattle(); return; }
        if (this.over || this.paused) return;
        this.t += dt;   // 준비 시간: 몬스터 없음(남은 탄만 마저 날아감) · 시간이 다 되면 다음 웨이브
        this.updateShots(dt);
        if (this.t >= this.prepEnd) this.startBattle();
      }
      // 전투: 판에 몬스터가 하나도 안 남으면(처치 · 수정 도착) 바로 준비 시간으로(실험실의 '3초 뒤 다음 라운드'를 기다리지 않음)
      stepBattle() {
        if (this.phase !== 'battle' || this.over || this.round < 1) return;
        if (this.spawnQ.length || this.bossWait != null || (this.bossesLeft && this.bossesLeft()) || this.monsters.some(m => m.alive && m.kind !== 'truck')) return;
        this.endBattle();
      }
      prepLeft() { return this.prepOn && this.phase === 'prep' ? Math.max(0, this.prepEnd - this.t) : 0; }
      startBattle() {
        if (!this.prepOn || this.phase !== 'prep' || this.over) return false;
        this.phase = 'battle'; this.battleT0 = this.t;
        this._go = true; try { this.startRound(); } finally { this._go = false; }
        this.emit('battle', { round: this.round, boss: this.round % 5 === 0 });
        return true;
      }
      startRound() {
        if (!this.prepOn) return super.startRound();
        if (this._go) {
          super.startRound();
          // 웨이브 몬스터 수 ×P.count(한 마리 체력은 hpR에서 ×P.hp)
          const q = this.spawnQ, want = Math.round(q.length * this.cntMul());
          while (q.length && q.length < want) q.splice(this.rand(q.length + 1), 0, Object.assign({}, q[this.rand(q.length)]));
          this.spawnEvery = ECON.spawnTime / Math.max(1, q.length);
          return;
        }
        // 실험실 step이 '다음 라운드'를 부르는 순간 = 전투 끝 판정. 남은 몬스터 · 보스가 있으면 기다림(웨이브는 다 잡아야 끝)
        if (this.monsters.some(m => m.alive && m.kind !== 'truck') || this.spawnQ.length || this.bossWait != null || (this.bossesLeft && this.bossesLeft())) { this.roundT = ECON.roundTime - 0.5; return; }
        this.endBattle();
      }
      endBattle() {
        this.phase = 'prep';
        for (const m of this.monsters) if (m.alive && m.kind === 'truck') { m.alive = false; this.emit('truckGone', {}); }
        this.monsters = this.monsters.filter(m => m.alive);
        const pay = Math.round(this.debt); this.debt = 0;
        const it = Math.min(P.interestMax, Math.floor(this.gold / P.interestPer));
        this.gold += pay + it;
        this.stats.battleT.push(+(this.t - this.battleT0).toFixed(1)); this.prepEnd = this.t + P.prepTime;
        this.emit('prep', { round: this.round, pay, interest: it, next: this.round + 1, boss: (this.round + 1) % 5 === 0 });
      }
      // 보스 라운드: 준비 시간을 이미 가졌으니 기다리지 않고 바로 등장
      spawnBoss() { if (!this.prepOn) return super.spawnBoss(); this.bossWait = null; this.bossGap = null; this.spawnBossNow(); }
      cntMul(r) { const k = Math.min(1, ((r || this.round) - 1) / Math.max(1, P.countRamp - 1)); return P.countFrom + (P.count - P.countFrom) * k; }
      hpR(r) { const h = super.hpR(r); if (!this.prepOn) return h; const k = Math.min(1, (Math.max(1, r || this.round) - 1) / 4); return h * P.hp * P.hpMul * (P.earlyHp + (1 - P.earlyHp) * k); }
      spawnMonster(kind, f, w, extra) {
        if (this.prepOn && extra && extra.boss) extra = Object.assign({}, extra, { hpMul: (extra.hpMul || 1) / P.hp });   // 보스는 마릿수 보정(×0.7)을 받지 않음
        return super.spawnMonster(kind, f, w, extra);
      }
      // 처치 금화: P.killGold만 바로(몬스터 수 ×1.5 몫은 덜어 냄) · 나머지는 웨이브 보상으로
      kill(m, src) {
        if (!this.prepOn || m.boss || m.kind === 'truck') return super.kill(m, src);
        const g0 = this.gold; super.kill(m, src);
        const got = (this.gold - g0) / this.cntMul();
        if (got > 0) { this.gold = g0; this.kAcc += got * P.killGold; const k = Math.floor(this.kAcc); this.kAcc -= k; this.gold += k; this.debt += got * (1 - P.killGold); }
      }

      // ---------------------------------------------------------------- 캐릭터 상태
      build(i, type, tier) {
        const r = super.build(i, type, tier), tw = this.tiles[i].tower;
        if (this.prepOn && tw) {
          const g = gOf(tw);
          Object.assign(tw, { lv: P.lvStart[g], tr: [], br: [], awk: [], mainUp: 0 });
          if (g <= 2 && this.r() < P.lunchP) { let x = this.r(); tw.lunch = 3; for (const [v, p] of P.lunchV) { x -= p; if (x <= 0) { tw.lunch = v; break; } } }
        }
        return r;
      }
      mods(tw) {
        const o = { dmg: 0, aps: 0, rng: 0, boss: 0, crit: 0, proc: 0 }; if (!tw) return o;
        for (const b of tw.br || []) { const B = BR[b]; if (B) for (const k in o) if (B[k]) o[k] += B[k]; }
        for (const a of tw.awk || []) { const c = AWK_BY[a.id]; if (c) o[c.k] += c.v[a.s]; }
        for (const t of tw.tr || []) { const T = TR[t.k]; if (T && T.aps) o.aps += T.aps[t.lv - 1]; }
        return o;
      }
      dmgMul(i) { const m = super.dmgMul(i); if (!this.prepOn) return m; const tw = this.tiles[i].tower, o = this.mods(tw); return m * this.lvMul(tw) * (1 + P.mainUp * (tw.mainUp || 0)) * (1 + o.dmg); }
      lvMul(tw) { const g = gOf(tw); return P.gx[g] * (1 + P.slope[g] * Math.max(0, (tw.lv || 1) - P.lvStart[g])); }
      apsOf(i) { const a = super.apsOf(i); if (!this.prepOn) return a; return Math.min(10, a * (1 + this.mods(this.tiles[i].tower).aps)); }
      rangeOf(i) { const r = super.rangeOf(i); if (!this.prepOn || !this.tiles[i].tower) return r; return r + this.mods(this.tiles[i].tower).rng * 100 / UPX; }
      srcOf(i) { const s = super.srcOf(i); if (this.prepOn) s.critChance += this.mods(this.tiles[i].tower).crit; return s; }
      damage(m, amt, dtype, src, opts) {
        if (!this.prepOn || !src || src.tile == null || (opts && opts.tr)) return super.damage(m, amt, dtype, src, opts);
        const tw = this.tiles[src.tile] && this.tiles[src.tile].tower, o = tw ? this.mods(tw) : null;
        if (o && m.boss && o.boss) amt *= 1 + o.boss;
        const r = super.damage(m, amt, dtype, src, opts);
        if (tw && tw.tr && tw.tr.length) this.procs(tw, m, amt, dtype, src, o.proc);
        return r;
      }
      procs(tw, m, amt, dtype, src, add) {
        for (const t of tw.tr) {
          const T = TR[t.k]; if (!T || T.aps || this.r() >= P.trP * t.lv + (add || 0)) continue;
          if (t.k === 'fire') { if (m.alive) this.burn(m, amt * 0.12); }
          else if (t.k === 'ice') { if (m.alive) this.addFreeze(m, 1); }
          else if (t.k === 'corrode') { if (m.alive) this.addCorrode(m, 1, 3); }
          else if (t.k === 'bolt') { const o = this.near(m, 1.8)[0]; if (o) { this.damage(o, amt * 0.5, dtype, src, { tr: 1, quiet: true }); this.emit('chain', { pts: [[m.x, m.y - 14 * m.g], [o.x, o.y - 14 * o.g]] }); } }
          else if (t.k === 'combo') { if (m.alive) this.damage(m, amt, dtype, src, { tr: 1, quiet: true }); }
        }
      }

      // ---------------------------------------------------------------- 먹이기(끌어 놓기 = 아무 캐릭터나)
      canMerge(a, b) {
        if (!this.prepOn) return super.canMerge(a, b);
        if (a === b) return false;
        const A = this.tiles[a] && this.tiles[a].tower, B = this.tiles[b] && this.tiles[b].tower;
        if (!(A && B && !this.tiles[a].occ && !this.tiles[b].occ)) return false;
        if (A.locked && gOf(B) < gOf(A)) return false;   // [2026-11-26] 잠금: 자기보다 낮은 등급에는 먹여지지 않음(드래그 때 짝으로 안 보이고 놓아도 제자리)
        return true;
      }
      lockUnit(i) { const tw = this.tiles[i] && this.tiles[i].tower; if (!tw || !this.prepOn) return false; tw.locked = !tw.locked; this.emit('lock', { i, on: tw.locked }); return true; }
      dragMerge(a, b) { return this.prepOn ? this.feed(a, b) : super.dragMerge(a, b); }
      // 먹이면 어떻게 되는지(화면이 고르는 창을 띄울지 정함): kind = main · mainMax · up · max · empty · full
      feedInfo(a, b) {
        const A = this.tiles[a].tower, B = this.tiles[b].tower, k = A.type, base = 1 + (A.lunch || 0), conv = P.conv[gOf(A)];
        if (k === B.type) return (B.mainUp || 0) < 3 ? { kind: 'main', k, base, conv } : { kind: 'mainMax', k, base, conv };
        const have = B.tr.find(x => x.k === k);
        if (have) return have.lv < 3 ? { kind: 'up', k, lv: have.lv, base, conv } : { kind: 'max', k, base, conv };
        if (B.tr.length < P.slots[gOf(B)]) return { kind: 'empty', k, base, conv, ask: ['take', 'cancel'], auto: 'take' };
        return { kind: 'full', k, base, conv, ask: ['swap', 'level', 'cancel'], auto: 'level' };
      }
      feed(a, b, pick, sw) {
        if (this.over || !this.canMerge(a, b)) return false;
        const I = this.feedInfo(a, b); pick = pick || I.auto || null;
        if (pick === 'cancel') return false;
        const A = this.tiles[a].tower, B = this.tiles[b].tower;
        let gain = I.base, res = I.kind;
        if (I.kind === 'main') B.mainUp = (B.mainUp || 0) + 1;
        else if (I.kind === 'up') B.tr.find(x => x.k === I.k).lv++;
        else if (I.kind === 'max' || I.kind === 'mainMax') gain += I.conv;   // 이미 최대 → 묻지 않고 레벨로
        else if (I.kind === 'empty') B.tr.push({ k: I.k, lv: 1 });
        else if (pick === 'swap') { const j = sw != null && B.tr[sw] ? sw : 0; B.tr[j] = { k: I.k, lv: 1 }; res = 'swap'; }
        else { gain += I.conv; res = 'level'; }
        this.tiles[a].tower = null; this.tiles[a].warn = null;
        // [2026-11-26 사용자] 높은 등급을 먹이면 등급 차이 d만큼 흔적 +1(최대가 아닌 흔적 중 무작위로 하나씩 · 한 흔적에 한 번만 · 남는 몫은 버려짐)
        const d = gOf(A) - gOf(B), bonus = [];
        if (d > 0) {
          const el = B.tr.filter(t => t.lv < 3);
          for (let n = el.length - 1; n > 0; n--) { const j = this.rand(n + 1); [el[n], el[j]] = [el[j], el[n]]; }
          for (const t of el.slice(0, d)) { t.lv++; bonus.push(t.k); }
        }
        B.lv += gain; this.stats.feeds++; this.stats.merges++;
        this.emit('feed', { i: b, a, gain, lv: B.lv, k: I.k, res, lunch: A.lunch || 0, type: B.type, typeA: A.type, tierA: A.tier, d: Math.max(0, d), bonus });
        this.misAdd('merge20', 1);
        this.checkUp(b);
        return true;
      }
      checkUp(i) {
        const tw = this.tiles[i] && this.tiles[i].tower; if (!tw || !this.prepOn) return;
        const g = gOf(tw);
        if (g < 5 && !tw.ready && tw.lv >= P.thr[g]) { tw.ready = 1; this.emit('upReady', { i, g }); }
        if (g >= 5 && !tw.awkReady && tw.awk.length < 3 && tw.lv >= P.awk[tw.awk.length]) { tw.awkReady = 1; tw.awkOpts = this.awkOffer(tw); this.emit('awkReady', { i }); }
      }
      nextLv(tw) { const g = gOf(tw); return g < 5 ? P.thr[g] : tw.awk.length < 3 ? P.awk[tw.awk.length] : null; }
      branches(i) { const tw = this.tiles[i].tower; return BR_OF[tw.type] || ['atk', 'spd']; }
      // 갈래를 고르면 어떻게 바뀌는지(카드에 '지금 → 다음'으로 보여 줌): 잠깐 바꿔 재고 되돌림
      preview(i, br) {
        const tw = this.tiles[i].tower, keep = { tier: tw.tier, br: tw.br };
        const now = this.statOf(i);
        if (br) { tw.tier = TIER_OF[gOf(tw) + 1]; tw.br = tw.br.concat([br]); }
        const nx = this.statOf(i); tw.tier = keep.tier; tw.br = keep.br;
        return { now, nx };
      }
      statOf(i) {   // 화면용: 초당 피해(1 = 일반 Lv1 기준) · 공격 속도 · 반경(칸)
        const T = D.TIER, tw = this.tiles[i].tower;
        const dps = this.dmgMul(i) * T.dmg[tw.tier] * T.shots[tw.tier] * this.apsOf(i), base = D.TOWERS[tw.type].atk * T.dmg[1] * T.shots[1] * D.TOWERS[tw.type].aps * T.aps[1];
        return { dps: dps / Math.max(1e-6, base), aps: this.apsOf(i), rng: this.rangePx ? this.rangePx(i) / 100 : 0 };
      }
      gradeUp(i, br) {
        const tw = this.tiles[i] && this.tiles[i].tower; if (!tw || !tw.ready || this.over || this.phase !== 'prep') return false;
        if (!this.branches(i).includes(br)) br = this.branches(i)[0];
        const g = gOf(tw) + 1;
        tw.ready = 0; tw.br.push(br);
        this.setTier(i, TIER_OF[g], 'merge'); this.stats.gradeUps++;
        if (g === 4) { this.stats.legendsMade++; this.stats.legends = (this.stats.legends || 0) + 1; if (!this._firstLeg) this._firstLeg = this.round; this.misAdd('legend2', 1); this.emit('legend', { i, type: tw.type, from: [] }); }
        if (g === 5) { this.stats.myths++; if (!this._firstMyth) this._firstMyth = this.round; this.emit('mythic', { i, type: tw.type }); }
        this.emit('gradeUp', { i, g, br, type: tw.type });
        this.checkUp(i);
        return true;
      }
      awkOffer(tw) {
        const pool = AWK_ALL.concat(AWK_FAM[tw.type] || []).filter(c => !tw.awk.some(a => a.id === c.id)).map(c => c.id);
        for (let n = pool.length - 1; n > 0; n--) { const j = this.rand(n + 1); [pool[n], pool[j]] = [pool[j], pool[n]]; }
        return pool.slice(0, 3);
      }
      awaken(i, id) {
        const tw = this.tiles[i] && this.tiles[i].tower; if (!tw || !tw.awkReady || this.over || this.phase !== 'prep') return false;
        if (!(tw.awkOpts || []).includes(id)) id = tw.awkOpts[0];
        tw.awk.push({ id, s: tw.awk.length }); tw.awkReady = 0; tw.awkOpts = null;
        this.emit('awaken', { i, id, s: tw.awk.length - 1, type: tw.type });
        this.checkUp(i);
        return true;
      }
      // 보스 교란이 등급을 바꾸면(망치 −1 · 마술사 +1) 레벨도 그 등급 범위로
      setTier(i, tier, why, lucky) {
        const tw = this.tiles[i] && this.tiles[i].tower, g0 = tw ? gOf(tw) : 0;
        const r = super.setTier(i, tier, why, lucky);
        if (this.prepOn && tw && tw.lv != null && why !== 'merge') { const g = gOf(tw); if (g !== g0) { tw.lv = Math.max(P.lvStart[g], Math.min(tw.lv, g < 5 ? P.thr[g] - 1 : tw.lv)); tw.ready = 0; this.checkUp(i); } }
        return r;
      }
    }
    for (const k of Object.keys(Base)) if (!(k in PrepGame)) PrepGame[k] = Base[k];
    SIM.Game = PrepGame;
    return PrepGame;
  }

  // ---------------------------------------------------------------- 봇(밸런스 · 자동 확인용)
  function bot(g) {
    if (g.over || !g.prepOn) return;
    if (g.phase === 'prep') for (const t of g.towersList()) {
      const tw = t.tower;
      if (tw.ready) { g.gradeUp(t.i, g.branches(t.i)[0]); return; }
      if (tw.awkReady) { g.awaken(t.i, tw.awkOpts[0]); return; }
    }
    const D = g.constructor.__D || (isNode ? require('../../js/data.js') : root.DATA);
    if (g.cmdReady && g.cmdReady() && D.COMMANDERS[g.cmd.id] && D.COMMANDERS[g.cmd.id].mode === 'tap' && g.phase === 'battle') g.useCommander();
    {
      const empty = g.tiles.filter(t => !t.tower && !t.blocked).length;
      if (g.round >= 2) {   // 강화: 판에 가장 많은 계열
        const cnt = {}; for (const t of g.towersList()) cnt[t.tower.type] = (cnt[t.tower.type] || 0) + (t.tower.lv || 1);
        const top = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
        if (top && g.upgradeCost(top) <= g.rollCost * 2.2 && g.gold >= g.upgradeCost(top)) { g.upgrade(top); return; }
      }
      if (g.gold >= g.rollCost && empty > 0) { g.summon(); return; }
      if (empty === 0 || (g.gold < g.rollCost && g.round >= 3 && g.towersList().length >= 6)) {   // 판이 가득하거나 소환할 금화가 없음: 가장 약한 캐릭터를 가장 센 캐릭터에게(도시락 먼저)
        const L = g.towersList().filter(t => !t.occ), sc = t => (GRADE_(g, t.tower)) * 1000 + t.tower.lv;
        const car = L.filter(t => !(GRADE_(g, t.tower) >= 5 && t.tower.awk.length >= 3)).sort((x, y) => sc(y) - sc(x))[0];
        const fod = L.filter(t => t !== car).sort((x, y) => (y.tower.lunch || 0) - (x.tower.lunch || 0) || sc(x) - sc(y))[0];
        if (car && fod) { const I = g.feedInfo(fod.i, car.i); g.feed(fod.i, car.i, I.auto || null); return; }
      }
    }
    if (g.phase === 'prep') g.startBattle();
  }
  const GRADE_ = (g, tw) => (g.constructor.GRADE || {})[tw.tier] || tw.tier;

  const API = { install, P, TR, BR, BR_OF, AWK_ALL, AWK_FAM, AWK_BY, awkText, bot, get on() { return on; } };
  if (isNode) module.exports = API; else root.PREP3 = API;
})(typeof window !== 'undefined' ? window : globalThis);
