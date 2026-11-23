// 마블 디펜스 실험실 — 공통 규칙 층(세 맵 모두). 본편 sim.js의 Game을 이어받아 바꾼다(본편 파일은 그대로).
// · 작전 카드(로그라이크) 없음 — 판 시작 · 보스 처치 카드 창이 뜨지 않는다
// · 몬스터: 6시 굴에서 왼쪽(f 0 → 12) · 오른쪽(f 0 → −12) 두 길로. 12시(f = ±12)에 닿으면 수정이 깎이고 사라진다(한 바퀴 돌지 않음)
// · 패배 = 수정 체력 0(판 위 몬스터 수 한도 없음) · 보스: 1마리 = 왼쪽, 2마리 = 양쪽(LAB.C.twoBossFrom 라운드부터)
// · 한쪽 길 몬스터 수는 줄이고(countMul ÷ 2) 이동 속도도 조금 느리게(spd)
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;

  function install(SIM, D, G, LAB) {
    const Base = SIM.Game;
    const { ECON, BOSSES, MONSTERS } = D;
    const C = LAB.C;
    const HALF = C.oneWay ? 24 : 12;   // [v3.6] oneWay = 한 방향 길(f 0 → 24)
    const prog = m => (m.dir < 0 ? -m.f : m.f);   // 굴에서 수정 쪽으로 온 거리(0 ~ 12)

    class LabGame extends Base {
      constructor(opt) {
        super(opt);
        this.lab = LAB.map;
        this.cards = []; this.cardPick = null; this.paused = false;
        this.cry = { hp: C.crystal, max: C.crystal, hitT: -9 };
        this.limit = 1e9;
        this.startAt = 1.4;
        this.boss2 = null; this.boss2T = 0;
        this.wave = { L: 0.5 };
        this.nextWave = this.sidePattern(1);
        this.stats.leaks = 0;
        // 본편은 판 시작 작전 카드(무료 포탑 · 금화 · 무료 굴림)가 초반을 받쳐 줬다 → 카드를 뺀 만큼 시작 금화로(세 맵 같게)
        this.gold += C.startGold == null ? 60 : C.startGold;
      }
      // -------------------------------------------------------- 로그라이크 끄기
      startCardPick() { /* 실험실: 작전 카드 없음 */ }
      rerollCards() { return false; }
      pickCard() { return false; }
      zoneFull(z) { return z >= 0 && super.zoneFull(z); }
      // 몬스터 체력: 본편 공식은 '판을 계속 도는' 전제(초반 ×3 혹)라 반 바퀴만 가는 실험실에선 초반이 너무 셈 → 초반만 덜어 냄(1R ×0.55 → 10R ×0.95)
      hpR(r) { const R = Math.max(1, r || this.round); return super.hpR(r) * (C.hpMul || 1) * (1 - (C.early == null ? 0.45 : C.early) * Math.exp(-(R - 1) / 4)) * (1 + (C.hpLate || 0) * (R - 1)) * ((G.map && G.map.hp) || 1); }   // [v3.1] hpLate = 라운드마다 체력 +비율(전설 30배 · 신화 90배라 후반이 가팔라야 함)

      // -------------------------------------------------------- 웨이브 · 양쪽 출발
      sidePattern(r) {
        if (C.oneWay) return { L: 1, tag: 'one' };
        if (C.sides !== 'waves') return { L: 0.5, tag: 'even' };
        // 다이얼 · 밀어 합치기: 한쪽으로 몰리는 웨이브가 섞여야 '돌리기 · 밀기'가 판단이 된다(굴 위 화살표로 미리 보여 줌)
        const k = r % 3;
        return k === 1 ? { L: 0.5, tag: 'even' } : k === 2 ? { L: 0.75, tag: 'left' } : { L: 0.25, tag: 'right' };
      }
      startRound() {
        super.startRound();   // 몬스터 종류 줄(spawnQ) · 보스(spawnBoss) · 미션 · 'round' 사건
        const q = this.spawnQ.slice();
        const want = Math.round(q.length * C.countMul);
        while (q.length > want) q.splice(this.rand(q.length), 1);
        while (q.length && q.length < want) q.splice(this.rand(q.length + 1), 0, q[this.rand(q.length)]);
        this.wave = this.sidePattern(this.round); this.nextWave = this.sidePattern(this.round + 1);
        // 왼쪽 몫을 고르게 섞음(오차 누적) → 두 길이 동시에 흐른다
        let acc = 0; const out = [];
        for (let n = 0; n < q.length; n++) { acc += this.wave.L; let dir = -1; if (acc >= 0.5) { dir = 1; acc -= 1; } out.push({ k: q[n], dir }); }
        this.spawnQ = out;
        this.spawnEvery = ECON.spawnTime / Math.max(1, out.length); this.spawnT = 0;
        if (C.roundGold && this.round > 1) { const g = Math.round(ECON.salary(this.round) * C.roundGold * (1 + (this.meta.salary || 0))); this.gold += g; this.emit('gold', { amt: g, why: '웨이브 보급' }); }
        this.emit('labWave', { round: this.round, L: this.wave.L, tag: this.wave.tag, boss: this.round % 5 === 0 });
      }
      spawnMonster(kind, f, w, extra) {
        const m = super.spawnMonster(kind, f, w, extra);
        if (m.dir == null) m.dir = 1;
        if (G.lanes > 1) { if (extra && extra.lane != null) m.lane = extra.lane; else { this._laneN = (this._laneN || 0) + 1; m.lane = this._laneN % G.lanes; } } else m.lane = 0;   // [v3.9] 갈림길: 몬스터가 번갈아 갈래를 고름
        m.rnd = this.round;   // [v3] 나온 라운드 = 강화 외형 단계(7 · 14라운드부터 금 · 가시 · 색 바뀜)
        this.posOf(m);
        return m;
      }
      monSpeed(m) { return super.monSpeed(m) * C.spd * (G.speedK || 1); }   // [v3.9] speedK = 길 길이가 달라도 걷는 px 속도는 같게

      // -------------------------------------------------------- 보스 1마리 = 왼쪽 · 2마리 = 양쪽
      spawnBoss() {
        const r = this.round, final = this.mode === 'conquest' && r >= ECON.rounds, two = r >= C.twoBossFrom;
        const k1 = this.nextBoss || this.pickBoss(r);
        this.nextBoss = final ? '' : this.pickBoss(r + 5);
        const mk = (kind, dir) => {
          const hpMul = ECON.bossHp * (final ? 1.1 : 1) * (two ? C.twoBossHp : 1) * (r <= 5 ? (C.firstBoss || 0.7) : 1);   // 첫 보스(5R)는 약하게 — 주사위 운이 나쁜 판이 5라운드에 무너지지 않게
          const m = this.spawnMonster('normal', 0, 0, { boss: kind, hpMul, weight: kind === 'goblin' ? 0 : ECON.bossW, spd: (kind === 'goblin' ? 1.5 : 0.6) * ECON.bossSpd * C.bossSpd, abT: dir < 0 ? 9 : 6, born: this.t, cardOnKill: false, w: 0, dir });
          m.kind = 'boss'; m.lapMode = false;
          return m;
        };
        this.boss = mk(k1, 1); this.bossT = 0;
        this.boss2 = null;
        if (two) { let k2 = this.pickBoss(r); for (let n = 0; n < 8 && k2 === k1; n++) k2 = this.pickBoss(r); this.boss2 = mk(k2, C.oneWay ? 1 : -1); this.boss2T = 0; if (C.oneWay) { this.boss.f = 2; this.posOf(this.boss); } }
        this.finalT = null; this.crystal = null;
        this.emit('boss', { boss: k1, name: BOSSES[k1].name, two: !!this.boss2, boss2: this.boss2 ? this.boss2.boss : null, name2: this.boss2 ? BOSSES[this.boss2.boss].name : null });
      }
      updateBoss(dt) {
        super.updateBoss(dt);
        const b2 = this.boss2; if (!b2 || !b2.alive || this.over) return;
        const b = this.boss, bt = this.bossT;
        this.boss = b2; this.bossT = this.boss2T;
        try { super.updateBoss(dt); } finally { this.boss2T = this.bossT; this.boss = b; this.bossT = bt; }
      }
      dropBoss(m) {   // 보스 하나가 판에서 빠짐(처치 · 수정 도착) → 남은 보스가 '주 보스'가 된다
        if (m === this.boss2) { this.boss2 = null; return; }
        if (m === this.boss) { const b2 = this.boss2 && this.boss2.alive ? this.boss2 : null; this.boss = b2; if (b2) this.bossT = this.boss2T; this.boss2 = null; }
      }
      bossesLeft() { return (this.boss && this.boss.alive ? 1 : 0) + (this.boss2 && this.boss2.alive ? 1 : 0); }
      bossDown(m) {
        const k = m.boss, final = this.mode === 'conquest' && this.round >= ECON.rounds;
        this.dropBoss(m);
        this.emit('bossDown', { boss: k, left: this.bossesLeft() });
        if (k === 'goblin') { const g = this.round * 10; this.gold += g; this.emit('gold', { amt: g, why: '황금 고블린' }); }   // 카드 대신 금화
        if (!this.bossesLeft()) {
          this.roundT = Math.max(this.roundT, ECON.roundTime - ECON.clearWait);
          if (final && k !== 'goblin' && k !== 'piggy') this.win();
        }
      }

      // -------------------------------------------------------- 수정
      reachCrystal(m) {
        m.alive = false;
        if (m.kind === 'truck') { this.emit('truckGone', {}); return; }
        if (m.boss) {
          const k = m.boss, final = this.mode === 'conquest' && this.round >= ECON.rounds;
          if (BOSSES[k].kind !== 'disrupt') {
            if (k === 'piggy') { const g = Math.min(Math.floor(this.gold * 0.5), this.round * 40); this.gold += g; this.emit('piggy', { gold: g }); }
            this.emit('escape', { x: m.x, y: m.y, boss: k });
          } else this.hitCrystal(final ? this.cry.hp : C.bossDmg, m);
          this.dropBoss(m);
          this.emit('bossLeave', { boss: k });
          if (!this.bossesLeft()) this.roundT = Math.max(this.roundT, ECON.roundTime - ECON.clearWait);
          return;
        }
        this.hitCrystal(MONSTERS[m.kind] ? Math.max(1, MONSTERS[m.kind].w) : 1, m);
      }
      hitCrystal(dmg, m) {
        if (this.over) return;
        const from = this.cry.hp;
        this.cry.hp = Math.max(0, from - dmg); this.cry.hitT = this.t;
        this.stats.leaks++;
        this.emit('cryHit', { dmg, from, to: this.cry.hp, x: m.x, y: m.y, boss: m.boss || null, kind: m.kind });
        if (this.cry.hp <= 0) this.lose('crystal');
      }

      // -------------------------------------------------------- 대상 = 수정에 가장 가까운 몬스터
      front(list) { let best = null, bp = -1e9; for (const m of list) { const p = prog(m); if (p > bp) { bp = p; best = m; } } return best; }
      prog(m) { return prog(m); }
      // 엘리트 점령(본편: 지나는 칸의 포탑) — 다이얼 · 밀어 합치기는 각 층에서 거리로 바꿈
      occupyCheck(m) {
        if (m.kind !== 'elite' || m.occTile || !m.alive) return;
        const i = Math.round(((m.f % 24) + 24) % 24) % 24, t = this.tiles[i];
        const d = ((m.f - i) % 24 + 36) % 24 - 12;
        if (t && t.tower && t.tower.tier < 6 && !t.occ && Math.abs(d) < 0.2) {
          if (this.shield > 0) { this.shield--; this.emit('shield'); m.occTile = -1; }
          else { t.occ = { mon: m.id, ransom: 0 }; m.occTile = i; this.emit('occupy', { i }); }
        }
      }
      // 쪼개지는 몬스터의 새끼도 부모와 같은 길 방향
      kill(m, src) {
        const n0 = this.monsters.length;
        super.kill(m, src);
        for (let k = n0; k < this.monsters.length; k++) {
          const c = this.monsters[k];
          if (c.kind === 'mini' && m.dir < 0) { c.dir = -1; c.f = m.f + (m.f - c.f); this.posOf(c); }
          if (m.lane && c.lane !== m.lane) { c.lane = m.lane; this.posOf(c); }
        }
      }

      // -------------------------------------------------------- 메인 갱신(본편 step을 실험실 규칙으로 다시 씀)
      step(dt) {
        if (this.over || this.paused) return;
        this.t += dt;
        if (this.round === 0) { if (this.t >= this.startAt) this.startRound(); }
        else {
          this.roundT += dt;
          if (this.spawnQ.length) {
            this.spawnT -= dt;
            if (this.spawnT <= 0) { this.spawnT += this.spawnEvery; const q = this.spawnQ.shift(); this.spawnMonster(q.k, 0, null, { dir: q.dir }); }
          }
          const last = this.mode === 'conquest' && this.round >= ECON.rounds;
          const hold = this.bossesLeft() > 0 && this.bossT < ECON.bossHold;
          if (this.clearAt == null && this.waveClear()) {
            this.clearAt = this.t;
            if (this.roundT < ECON.roundTime - ECON.clearWait) this.roundT = ECON.roundTime - ECON.clearWait;
            this.emit('waveClear', { round: this.round });
          }
          if (!last && !hold && this.roundT >= ECON.roundTime) this.startRound();
        }
        if (this.beforeMove) this.beforeMove(dt);
        let weight = 0;
        for (const m of this.monsters) {
          if (!m.alive) continue;
          if (m.dir == null) m.dir = 1;
          const v = this.monSpeed(m) * dt, before = m.f;
          m.f += v * m.dir; m.dist += v;
          if (prog(m) >= HALF) { this.reachCrystal(m); if (this.over) break; continue; }
          if (this.mines.length) for (const mi of this.mines) {
            if (mi.used) continue;
            const a = SIM.wrapD(m.f, mi.f), b = SIM.wrapD(before, mi.f);
            if (m.dir > 0 ? (a >= 0 && b < 0) : (a <= 0 && b > 0)) { mi.used = true; this.emit('boom', { x: m.x, y: m.y, r: 0.9 }); this.damage(m, this.hpR() * 0.6, 'none', null, { big: true }); }
          }
          this.occupyCheck(m);
          this.tickMon(m, dt);
          if (!m.alive) continue;
          this.posOf(m);
          if (m.kind !== 'truck' && m.boss !== 'goblin') weight += m.weight;
        }
        if (this.over) return;
        this.monsters = this.monsters.filter(m => m.alive);
        // 뭉침 풀기(같은 길끼리): 앞뒤가 가까우면 길 폭 안에서 옆으로 벌리고, 못 비키면 뒤쪽이 잠깐 늦춘다
        for (const dir of [1, -1]) {
          const ms = this.monsters.filter(m => m.dir === dir && !m.boss).sort((a, b) => prog(a) - prog(b));
          for (let k = 1; k < ms.length; k++) {
            const a = ms[k - 1], b = ms[k], gap = prog(b) - prog(a);
            if (gap < 0.45 && Math.abs(b.w - a.w) < 0.75) {
              const push = 2.0 * dt * (b.w >= a.w ? 1 : -1);
              if (gap < 0.3 && Math.abs(b.w - a.w) < 0.45) a.f -= dir * 0.35 * dt;
              b.w = Math.max(-0.95, Math.min(0.95, b.w + push)); a.w = Math.max(-0.95, Math.min(0.95, a.w - push));
            }
          }
        }
        this.mines = this.mines.filter(mi => !mi.used && this.t < mi.until);
        this.footprints = this.footprints.filter(fp => this.t < fp.until);
        this.weight = weight; this.stats.maxWeight = Math.max(this.stats.maxWeight, weight);
        this.updateBoss(dt);
        this.updatePassives(dt);
        this.updateTowers(dt);
        this.updateShots(dt);
        this.updatePawn(dt);
        this.updateWarnOcc(dt);
        this.updateMission();
        if (this.offer && this.t > this.offer.until) { this.offer = null; this.emit('offerGone'); }
        if (this.pick && this.t > this.pick.until) this.pick = null;
      }
      stars() { if (this.over !== 'win') return 0; return 1 + (this.cry.hp >= this.cry.max * 0.7 ? 1 : 0) + (this.stats.legends >= 1 ? 1 : 0); }
    }

    SIM.Game = LabGame;
    SIM.LabGame = LabGame;
    SIM.prog = prog;
    return LabGame;
  }

  if (isNode) module.exports = install; else root.LAB_CORE = install;
})(typeof window !== 'undefined' ? window : globalThis);
