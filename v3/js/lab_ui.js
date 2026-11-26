// [v2] 마블 디펜스 2 판(밀어 합치기)용 — 실험실 lab/js/lab_ui.js 복사본: 아웃게임에 결과 보내기 · 첫 판 규칙 카드 · 끌어 쓰는 지휘관 = 단추 → 포탑 누르기
// 마블 디펜스 실험실 — 화면 조작 층(본편 UI 위에 덧붙임): 수정 체력 게이지 · 보스 둘 · 규칙 카드 · 결과 · 맵별 조작(돌리기 · 밀기)
(function (root) {
  const LAB = root.LAB; if (!LAB) return;
  const U = root.UI.prototype, D = root.DATA, G = root.GEOM;
  const $ = id => document.getElementById(id);
  const MAP = LAB.map, C = LAB.C;
  const fmt = n => Math.floor(n).toLocaleString('ko-KR');

  const RULES = {
    marble: ['지금 판 그대로 — 주사위를 굴려 칸에 멈추고, 같은 포탑끼리 끌어 합쳐요.', '<b>작전 카드(로그라이크)는 뺐어요.</b> 판 시작 · 보스 처치 때 카드 창이 없어요.', '몬스터가 6시 굴에서 <b>양쪽 길</b>로 나와 12시 <b>수정</b>으로 가요. 닿은 만큼 수정이 깎이고(보스 −8), 0이 되면 끝.', '보스 1마리 = 왼쪽 길 · 15 · 20라운드는 <b>2마리가 양쪽</b>에서.'],
    dial: ['주사위 · 말이 없어요. <b>[소환]</b>을 누르면 빈 자리에 포탑이 생겨요.', '<b>판을 손가락으로 돌리면</b> 포탑 고리가 통째로 돌아요. 아래 ⟲ ⟳ 단추도 돼요(꾹 = 계속).', '굴 앞 <b>화살표</b> = 이번 웨이브가 많이 오는 쪽. 그쪽에 센 포탑을 돌려 대세요.', '같은 포탑 + 같은 단계는 끌어서 합치기. 몬스터가 12시 <b>수정</b>에 닿으면 수정이 깎여요.'],
    slide: LAB.V3 ? ['<b>[소환]</b>을 누르면 빈 칸에 1단계 아군이 나와요. 값은 부를 때마다 조금씩 올라요.', '<b>같은 등급</b> 둘을 <b>끌어서 겹치면</b>(또는 하나를 누르고 짝을 누르면) 합쳐져 한 등급 올라요. 일반 → 희귀 → 영웅 → 전설 → 신화까지. <b>끌어 놓은 쪽이 사라지고, 가만히 있던 쪽</b>이 제 계열 그대로 올라요.', '아군마다 <b>공격 반경</b>이 달라요. 아군을 누르면 둘레에 원으로 보여요. 용 · 기사는 짧지만 세고, 마법사는 멀리 쏴요.', '어려움 · 지옥은 판에 <b>구멍</b>이 있어요. 구멍에는 아군이 설 수 없어요.', '<b>[강화]</b> 단추 = 아군 종류별 능력치 업. 몬스터가 길 끝 <b>수정</b>에 닿으면 수정이 깎여요.']
      : ['<b>[소환]</b>을 누르면 빈 칸에 1단계 포탑이 생겨요. 값은 부를 때마다 조금씩 올라요.', '<b>판을 쓸어 밀면</b>(판 아래 소환 단추 위쪽까지 돼요) 모든 포탑이 그쪽 끝까지 미끄러지고, <b>같은 단계끼리 부딪히면 합쳐져요</b>(앞에 있던 포탑 종류가 남음 — 2048처럼). 아래 방향 단추도 돼요.', '<b>밝은 가장자리 칸</b>이 길에 가까워요. 가운데는 사거리가 잘 안 닿아요.', '굴 앞 화살표 = 많이 오는 쪽. 몬스터가 12시 <b>수정</b>에 닿으면 수정이 깎여요.'],
  };
  const ICON = { marble: '🎲', dial: '⟳', slide: '⇲' };

  // 실험실 앱 층(lab_app.js의 LAB_APP)을 UI가 만들어질 때 붙임 — 본편 boot가 판을 열기 전
  const baseBind0 = U.bind;
  U.bind = function () { if (root.LAB_APP && !this.app._labApp) { this.app._labApp = true; root.LAB_APP(this.app); } return baseBind0.call(this); };

  // ------------------------------------------------------------ 로비 = 바로 판(두 번째부터는 실험실 첫 화면으로)
  U.lobby = function () {
    if (!this._labStarted) { this._labStarted = true; this.app.start(LAB.choice()); this.labIntro(); return; }
    location.href = 'v3/outgame.html';
  };
  U.labIntro = function (back) {
    const m = this.open(`<div class="mbox labrule"><div class="lr-tag">하는 법 · 끌어서 합치기</div><h2>${LAB.TITLE[MAP]}</h2>
      <ol class="howto">${RULES[MAP].map(s => `<li>${s}</li>`).join('')}</ol>
      <p class="sub">20라운드 · 수정 체력 ${C.crystal} · 별 3개 = 승리 · 수정 70% 이상 · 6단계 아군</p>
      <div class="btns"><button class="btn green" data-act="go">${back ? '계속하기' : '시작!'}</button></div></div>`, 'labrule');
    m.onclick = e => {
      const b = e.target.closest('[data-act]'); if (!b) return; root.SFX.init && root.SFX.init(); root.SFX.click();
      this.close(); if (back) back(); else { this.app.paused = false; if (!this.app.hold) root.SFX.music('battle'); }
    };
  };
  U.help = function (back) { this.labIntro(back || (() => { this.close(); this.pauseMenu(); })); };
  const basePause = U.pauseMenu;
  U.pauseMenu = function () {
    basePause.call(this);
    const b = document.querySelector('#modal [data-act=lobby]'); if (b && !this.app.embed) b.textContent = '처음 화면으로 (이번 판 포기)';
  };

  // ------------------------------------------------------------ 매 프레임: 수정 게이지 · 보스 둘 · 남은 시간
  const baseUpdate = U.update;
  U.update = function () {
    baseUpdate.call(this);
    const g = this.g; if (!g || !g.cry) return;
    const k = g.cry.hp / g.cry.max;
    $('gaugeTxt').textContent = `${g.cry.hp} / ${g.cry.max}`;
    $('gaugeFill').style.width = Math.max(0, k * 100) + '%';
    $('gauge').classList.toggle('warn', k <= 0.35);
    if (g.cry.hitT !== this._cryHit) { this._cryHit = g.cry.hitT; if (g.cry.hitT > 0) { const el = $('gauge'); el.classList.remove('cryhit'); void el.offsetWidth; el.classList.add('cryhit'); } }
    const bs = [g.boss, g.boss2].filter(b => b && b.alive);
    if (bs.length) {
      const final = g.round >= D.ECON.rounds;
      $('bossName').textContent = bs.map(b => D.BOSSES[b.boss].name).join(' + ');
      $('bossFill').style.width = Math.max(0, bs.reduce((a, b) => a + b.hp, 0) / bs.reduce((a, b) => a + b.maxHp, 0) * 100) + '%';
      const dis = bs.some(b => D.BOSSES[b.boss].kind === 'disrupt');
      $('bossInfo').textContent = final ? '마지막 보스 — 수정에 닿으면 끝!' : dis ? `수정에 닿으면 수정 −${C.bossDmg}` : bs[0].boss === 'piggy' ? '수정에 닿으면 금화 보너스' : '잡으면 금화 보너스';
      // 남은 시간 = 가장 빠른 보스가 수정에 닿기까지
      const tt = Math.min(...bs.map(b => Math.max(0, ((C.oneWay ? 24 : 12) - root.SIM.prog(b)) / Math.max(0.05, g.monSpeed(b) || 0.05))));
      $('timerTxt').textContent = `${Math.floor(tt / 60)}:${String(Math.floor(tt % 60)).padStart(2, '0')}`;
    }
    if (g.bossWait != null && g.bossGap != null && timerTxt) timerTxt.textContent = '0:0' + Math.max(0, Math.ceil((C.bossPrep || 5) - (g.t - g.bossGap)));   // [v3.10b] 보스 준비 시간 세기
    if (MAP === 'slide') this.labWavePanel(g);
  };
  U.labWavePanel = function (g) {
    const el = $('labWave') || $('waveChip'); if (!el) return;
    if (C.oneWay) { el.hidden = true; return; }   // [v3.6] 한 방향 길 — 쏠림 예고 없음
    const bossNext = (g.round + 1) % 5 === 0, spawning = g.spawnQ && g.spawnQ.length;
    const w = spawning && g.round % 5 !== 0 ? g.wave : g.nextWave, tagNow = spawning ? '이번' : '다음';
    const key = (bossNext && !spawning ? 'B' : w.tag) + tagNow;
    if (key === this._waveKey) return; this._waveKey = key;
    el.innerHTML = bossNext && !spawning ? `<span class="wk">${tagNow} 웨이브</span><b>보스</b><span class="lab">${g.round + 1 >= C.twoBossFrom ? '양쪽에서 둘' : '왼쪽 길'}</span>`
      : `<span class="wk">${tagNow} 웨이브</span><b>${w.tag === 'left' ? '◀ 왼쪽' : w.tag === 'right' ? '오른쪽 ▶' : '◀ 고르게 ▶'}</b><span class="lab">${w.tag === 'even' ? '양쪽 반반' : '이쪽이 많이 와요'}</span>`;
  };

  // ------------------------------------------------------------ 보스 소개 문구
  const baseWarn = U.bossWarn;
  U.bossWarn = function (e) {
    baseWarn.call(this, e);
    const B = D.BOSSES[e.boss] || {}, final = this.g && this.g.round >= D.ECON.rounds;
    if (e.two) $('warnName').textContent = e.name + ' + ' + e.name2;
    $('warnSub').hidden = false;
    if (C.oneWay) $('warnSub').textContent = (e.two ? '보스 둘이 함께 와요' : final ? '마지막 보스' : '보스가 와요') + (final ? ' — 수정에 닿으면 끝' : B.kind === 'disrupt' || e.two ? ` · 수정에 닿으면 −${C.bossDmg}` : ' · 잡으면 금화 보너스');
    else $('warnSub').textContent = e.two ? '보스 둘! 왼쪽 · 오른쪽 길에서 함께 와요' + (final ? ' — 수정에 닿으면 끝' : ` · 수정에 닿으면 −${C.bossDmg}`)
      : final ? '마지막 보스 — 왼쪽 길로 와요 · 수정에 닿으면 끝' : B.kind === 'disrupt' ? `왼쪽 길로 와요 · 수정에 닿으면 수정 −${C.bossDmg}` : '왼쪽 길로 와요 · 잡으면 금화 보너스';
  };

  const baseOnEvent = U.onEvent;
  U.onEvent = function (e) {
    if (e.ev === 'mission' && MAP !== 'marble') return;
    baseOnEvent.call(this, e);
    if (e.ev === 'full') { this.toast('빈 자리가 없어요', '끌어서 합치세요', '같은 등급끼리', true, 1.4); root.SFX.error(); }
    if (e.ev === 'labWave' && C.sides === 'waves' && !C.oneWay && !e.boss && e.tag !== 'even') this.toast(e.round + ' 웨이브', e.tag === 'left' ? '◀ 왼쪽으로 많이 와요' : '오른쪽으로 많이 와요 ▶', MAP === 'dial' ? '센 포탑을 그쪽으로 돌려 대세요' : '그쪽 가장자리로 밀어 두세요', false, 1.8);
    if (e.ev === 'bossWait') this.toast('보스가 다가와요', '남은 몬스터를 모두 잡으면 나타나요', '', false, 2.2);   // [v3.10]
    if (e.ev === 'bossPrep') this.toast('보스 등장까지 ' + e.sec + '초', '배치 · 합치기를 정리하세요', '', false, 2.6);   // [v3.10b]
    if (e.ev === 'cryHit' && root.HAPTIC && root.HAPTIC.buzz) try { root.HAPTIC.buzz(e.boss ? 140 : 40); } catch (er) { /* 없음 */ }
  };

  // ------------------------------------------------------------ 결과(본편 보상 · 저장은 건드리지 않음 — 실험실 기록만)
  U.resultModal = function () {
    const g = this.g, win = g.over === 'win';
    root.SFX.music(null); win ? root.SFX.win() : root.SFX.lose();
    let mt = 0; for (const t of g.towersList()) mt = Math.max(mt, t.tower.tier);
    // [v2] 아웃게임 안: 결과는 아웃게임 결과 화면에서(보상 · 별 · 임무)
    if (this.app.embed) { this.app.post({ type: 'over', win, mode: g.mode, chapter: g.chapter, diff: g.diff, stars: g.stars(), kills: g.stats.kills, round: g.round, t: Math.round(g.t), legends: g.stats.legends, maxTier: Math.max(mt, g.stats.legends ? 6 : 0), score: g.score(), rolls: g.stats.rolls, merges: g.stats.merges, slides: g.stats.slides || 0, multi: g.stats.multi || 0, cry: g.cry.hp, loseReason: g.loseReason || '' }); return; }
    const rec = (() => { try { return JSON.parse(localStorage.getItem('marbleLab_rec') || '{}'); } catch (er) { return {}; } })();
    const r = rec[MAP] || { plays: 0, wins: 0, best: 0 };
    r.plays++; if (win) r.wins++; r.best = Math.max(r.best, win ? 21 : g.round);
    rec[MAP] = r; try { localStorage.setItem('marbleLab_rec', JSON.stringify(rec)); } catch (er) { /* 저장 안 됨 */ }
    const verb = MAP === 'marble' ? ['최대 연속 출동', '×' + g.comboMax] : MAP === 'dial' ? ['돌린 칸', Math.round(g.rotMoved || 0)] : ['합치기', g.stats.merges || 0];
    const m = this.open(`<div class="mbox labres"><h2 style="font-size:46px;color:${win ? '#ffd23a' : '#ff8a8a'}">${win ? '수정을 지켰다!' : '수정이 깨졌다'}</h2>
      <p class="sub">${LAB.TITLE[MAP]} · ${win ? '20라운드 끝까지' : g.round + '라운드에서'}</p>
      <div class="stat">
        <div><span>라운드</span><b>${g.round}</b></div><div><span>남은 수정</span><b>${g.cry.hp} / ${g.cry.max}</b></div>
        <div><span>처치</span><b>${fmt(g.stats.kills)}</b></div><div><span>샌 몬스터</span><b>${g.stats.leaks}</b></div>
        <div><span>최고 단계</span><b>${Math.max(mt, g.stats.legends ? 6 : 0)}</b></div><div><span>합치기</span><b>${g.stats.merges}</b></div>
        <div><span>${MAP === 'marble' ? '굴림' : '소환'}</span><b>${g.stats.rolls}</b></div><div><span>${verb[0]}</span><b>${typeof verb[1] === 'number' ? fmt(verb[1]) : verb[1]}</b></div>
      </div>
      <p class="sub">이 맵 기록: ${r.plays}판 · 승리 ${r.wins}</p>
      <div class="btns"><button class="btn sec" data-act="lab">처음 화면</button><button class="btn green" data-act="again">다시 하기</button></div></div>`);
    m.onclick = e => {
      const b = e.target.closest('[data-act]'); if (!b) return; root.SFX.click();
      if (b.dataset.act === 'lab') { location.href = 'v3/outgame.html'; return; }
      this.close(); this.app.start(LAB.choice());
    };
  };

  // ============================================================ ② 다이얼: 빈 곳 끌기 = 돌리기 · 포탑 끌기 = 합치기(본편)
  if (MAP === 'dial') {
    const cx = G.plaza[0], cy = G.plaza[1], K = G.CFG.k;
    const angOf = (x, y) => Math.atan2((y - cy) / K, x - cx);
    const baseDown = U.down, baseMove = U.move, baseUp = U.up;
    U.down = function (e) {
      const g = this.g; if (!g || g.over || g.paused || g.pick) return baseDown.call(this, e);
      const [x, y] = this.pt(e);
      if (this.towerAt(x, y) != null || y > 880 || y < 60) return baseDown.call(this, e);
      this.sfx().init(); this.hideInfo();
      const a = angOf(x, y);
      this.rotG = { a, acc: 0, r0: g.rotTo, id: e.pointerId, moved: 0 };
      this.app.cmd('rotDragTo', [g.rotTo]);
    };
    U.move = function (e) {
      const d = this.rotG; if (!d) return baseMove.call(this, e);
      const [x, y] = this.pt(e), a = angOf(x, y);
      let da = a - d.a; if (da > Math.PI) da -= Math.PI * 2; if (da < -Math.PI) da += Math.PI * 2;
      d.a = a; d.acc += da; d.moved += Math.abs(da);
      const v = d.r0 + d.acc / (Math.PI * 2) * 24;
      if (Math.round(v) !== this._rotTick) { this._rotTick = Math.round(v); try { root.SFX.tone && root.SFX.tone({ f: 900, d: 0.03, v: 0.03, wave: 'square' }); } catch (er) { /* 소리 없음 */ } if (root.HAPTIC) root.HAPTIC.play('select'); }
      this.app.cmd('rotDragTo', [v]);
    };
    U.up = function (e) {
      const d = this.rotG; if (!d) return baseUp.call(this, e);
      this.rotG = null; this.app.cmd('rotRelease');
    };
  }

  // ============================================================ ③ 밀어 합치기: 판 쓸기 = 밀기 · 짧게 누르기 = 포탑 정보
  if (MAP === 'slide') {
    const DRAGM = !!(root.GRADE3 && root.GRADE3.C3 && root.GRADE3.C3.drag);   // [v3.7] 끌어서(또는 탭-탭) 합치기 — 밀기 없음
    if (DRAGM) document.body.classList.add('dragmode');
    const dirOf = (x0, y0, x1, y1) => {
      const GEO = root.LAB_GEO_INST, a = GEO.toUV(x0, y0), b = GEO.toUV(x1, y1), du = b[0] - a[0], dv = b[1] - a[1];
      return Math.abs(du) >= Math.abs(dv) ? (du > 0 ? '+U' : '-U') : (dv > 0 ? '+V' : '-V');
    };
    U.down = function (e) {
      const g = this.g; if (!g || g.over || g.paused) return;
      this.sfx().init();
      const [x, y] = this.pt(e);
      // [v2] 순간이동술사: 바꿀 칸 고르기
      if (g.pick) { let i = this.tileAt(x, y); if (i == null) i = this.towerAt(x, y); if (i != null && g.pick.tiles.includes(i)) { this.app.cmd('choose', [i]); this.sfx().click(); } else { g.pick = null; this.toast('지휘관', '취소했어요', '', true, 1); } return; }
      // [v2] 끌어 쓰는 지휘관 = 지휘관 단추를 누른 뒤 포탑을 누름(이 판은 끌기가 '밀기'라서)
      if (this.cmdArm) {
        this.cmdArm = false; document.getElementById('cmdBtn').classList.remove('droptarget');
        const i = this.towerAt(x, y);
        if (i == null) { this.toast('지휘관', '취소했어요', '', true, 1); return; }
        if (!this.app.cmd('useCommander', [i])) { this.sfx().error(); this.toast('지휘관', '이 포탑엔 못 써요', D.COMMANDERS[g.cmd.id].act, true, 1.4); }
        else if (g.cmd.id === 'teleporter') this.toast('순간이동술사', '바꿀 칸을 누르세요', '빈 칸이면 그리로 옮겨요', false, 1.8);
        return;
      }
      if (DRAGM) {   // 아군을 누름 = 고르기(범위 · 합칠 짝 표시) / 누른 채 끌기 = 들고 가서 짝 위에 놓기 / 고른 뒤 짝을 누름 = 합치기
        const i = this.towerAt(x, y);
        if (i == null) { this.hideInfo(); this.press = null; return; }
        this.press = { i, x, y, t: performance.now() };
        return;
      }
      this.swipe = { x, y, t: performance.now(), i: this.towerAt(x, y) };
    };
    U.dragMove = function (e) {
      const p = this.press, g = this.g; if (!p || !g) return;
      const [x, y] = this.pt(e), R = this.app.renderer;
      if (!R.drag && Math.hypot(x - p.x, y - p.y) > 10) {
        if (!g.tiles[p.i].tower || g.tiles[p.i].occ) { this.press = null; return; }
        const f = R.drawPos(g, p.i, g.tiles[p.i].tower);
        this.hideInfo();
        R.drag = { from: p.i, offX: f[0] - p.x, offY: f[1] - p.y, target: null, fx: f[0], fy: f[1] };
        if (root.HAPTIC) root.HAPTIC.play('pick');
      }
      if (R.drag) {
        const d = R.drag; d.fx = x + d.offX; d.fy = y + d.offY;
        let best = null, bd = 78, any = 1e9;   // 든 아군 발밑에서 78px 안의 '합칠 수 있는' 가장 가까운 짝(어긋나게 놔도 됨)
        for (const t of g.tiles) {
          if (!t.tower || t.i === d.from) continue;
          const q = G.tiles[t.i].tower, dd = Math.hypot(q[0] - d.fx, q[1] + G.CFG.cell * 0.3 - d.fy);
          any = Math.min(any, dd);
          if (dd < bd && g.canMerge(d.from, t.i)) { bd = dd; best = t.i; }
        }
        if (best != null && best !== d.target && root.HAPTIC) root.HAPTIC.play('select');
        d.target = best; d.wrong = best == null && any < 40;
        // 합칠 짝이 없으면: 든 아군 발밑에서 가장 가까운 빈 칸(64px 안) = 자리 옮기기
        d.moveTo = null;
        if (g.canMove && best == null && !d.wrong) { let md = 64; for (const t of g.tiles) { if (t.tower || t.blocked) continue; const q = G.tiles[t.i].tower, dd = Math.hypot(q[0] - d.fx, q[1] + G.CFG.cell * 0.3 - d.fy); if (dd < md) { md = dd; d.moveTo = t.i; } } }
      }
    };
    U.dragUp = function (e) {
      const p = this.press, g = this.g, R = this.app.renderer; this.press = null; if (!g) return;
      if (R.drag) {
        const d = R.drag; R.drag = null;
        if (d.target != null) { if (this.app.cmd('merge', [d.from, d.target]) && root.HAPTIC) root.HAPTIC.play('select'); return; }
        if (d.moveTo != null) { if (this.app.cmd('moveTo', [d.from, d.moveTo])) { if (root.HAPTIC) root.HAPTIC.play('select'); this.sfx().click && this.sfx().click(); } return; }
        if (d.wrong && !g.prepOn) { this.sfx().error(); if (root.HAPTIC) root.HAPTIC.play('deny'); this.toast('합칠 수 없어요', '같은 등급끼리만', '', true, 1.1); }
        return;
      }
      if (!p || performance.now() - p.t > 450) return;
      const s = R.sel;
      if (s != null && s !== p.i && g.canMerge(s, p.i)) { this.hideInfo(); if (this.app.cmd('merge', [s, p.i]) && root.HAPTIC) root.HAPTIC.play('select'); return; }
      this.showInfo(p.i);
    };
    U.move = function (e) {
      if (DRAGM) return this.dragMove(e);
      const s = this.swipe; if (!s || s.done) return;
      const [x, y] = this.pt(e);
      // 소환 단추에서 시작: 손가락이 조금이라도(화면 10px) 움직이면 '탭'이 아니라 밀기 → 소환하지 않음
      if (s.roll && !s.moved && Math.hypot(e.clientX - s.cx, e.clientY - s.cy) > TAP_PX) { s.moved = true; document.getElementById('rollBtn').classList.remove('press'); }
      if (Math.hypot(x - s.x, y - s.y) > 46) { s.done = true; this.labSlide(dirOf(s.x, s.y, x, y)); }
    };
    U.up = function (e) {
      if (DRAGM) return this.dragUp(e);
      const s = this.swipe; this.swipe = null; if (!s || s.done) return;
      const [x, y] = this.pt(e);
      if (Math.hypot(x - s.x, y - s.y) > 26) { this.labSlide(dirOf(s.x, s.y, x, y)); return; }
      if (s.i != null && performance.now() - s.t < 450) this.showInfo(s.i); else this.hideInfo();
    };
    U.labSlide = function (dir) {
      if (DRAGM) return;
      this.hideInfo();
      if (this.app.cmd('slide', [dir])) { if (root.HAPTIC) root.HAPTIC.play('select'); }
      else { if (root.HAPTIC) root.HAPTIC.play('deny'); }
    };
    // [v2 · 2026-11-17] 밀기 영역을 판 아래로 넓힘: 판(캔버스) + 그 아래 패널 중 '소환 단추 위쪽 절반'까지(사용자 요청).
    //   소환 단추 위에서 시작해도 됨 — 움직임 없이 떼면 소환(탭), 누른 채 움직이면 밀기. 방향 단추 · 지휘관 · 수송차 · 멈춤 · AUTO · 덱 강화 단추는 제 동작 그대로
    const TAP_PX = 10;
    const NOT_SWIPE = '#world, #labPad, #cmdBtn, #truckBtn, #pauseBtn, #autoBtn, #deckRow, #upBtn, #upSheet, #subRow, #v3Sheet, #dpad, #modal, #infoBox, #offerCard';
    U.labGestureBind = function () {
      if (DRAGM) return;
      const stage = document.getElementById('stage'), roll = document.getElementById('rollBtn');
      stage.addEventListener('pointerdown', e => {
        const g = this.g; if (!g || g.over || g.paused || this.modalOpen() || g.pick || this.cmdArm) return;
        const t = e.target; if (!t.closest || t.closest(NOT_SWIPE)) return;
        const onRoll = !!t.closest('#rollBtn'), rr = roll.getBoundingClientRect();
        if (!onRoll && !(t.closest('#panel') && e.clientY <= rr.top + rr.height / 2)) return;
        this.sfx().init();
        const [x, y] = this.pt(e);
        this.swipe = { x, y, t: performance.now(), i: null, roll: onRoll, cx: e.clientX, cy: e.clientY };
      }, true);
      // 소환 단추에서 손을 뗄 때: 움직였으면 본편 굴리기(=소환) 처리로 넘기지 않고 밀기로만 끝냄
      roll.addEventListener('pointerup', e => {
        const s = this.swipe; if (!s || !s.roll || !(s.moved || s.done)) return;
        e.stopImmediatePropagation(); roll.classList.remove('press'); this.up(e);
      }, true);
    };
    const baseBind = U.bind;
    U.bind = function () {
      baseBind.call(this);
      this.labGestureBind();
      window.addEventListener('keydown', e => {
        if (!this.g || this.modalOpen()) return;
        const k = { ArrowUp: '-U', ArrowRight: '-V', ArrowDown: '+U', ArrowLeft: '+V', q: '-U', e: '-V', c: '+U', z: '+V' }[e.key];
        if (k) { e.preventDefault(); this.labSlide(k); }
      });
    };
  }

  // ============================================================ [v3.9d] 조작 잠금 — 판이 멈춰 있는 연출 · 창 동안은 아군 들기 · 합치기 · 소환 · 지휘관 · 수송차를 막는다(사용자: 보스 경고 중에 캐릭터를 들 수 있었음)
  //   잠기는 때: 보스 경고(3.3초) · 창(일시정지 · 규칙 · 결과 등 #modal)이 떠 있음 · 판이 끝남 · 판 시작 전(불러오는 중). 튜토리얼은 제 단계에서 필요한 조작을 스스로 열어 주므로 건드리지 않음
  //   막지 않는 것: 일시정지 단추 · 배속 · 아래 창 닫기(연출 중에도 멈추거나 나갈 수 있어야 함)
  {
    const P = root.UI.prototype;
    P.inputLocked = function () { const a = this.app, g = this.g; return !g || !!g.over || !!a.hold || (this.introBusy && this.introBusy()) || (this.modalOpen && this.modalOpen()); };
    P.dropHold = function () { const R = this.app && this.app.renderer; if (R) R.drag = null; this.press = null; if (this.cmdArm) { this.cmdArm = false; const b = document.getElementById('cmdBtn'); if (b) b.classList.remove('droptarget'); } };
    for (const k of ['down', 'move', 'up']) { const base = P[k]; P[k] = function (e) { if (this.inputLocked()) { this.dropHold(); return; } return base.call(this, e); }; }
    const bw = P.bossWarn; if (bw) P.bossWarn = function (e) { this.dropHold(); if (this.hideInfo) this.hideInfo(); return bw.call(this, e); };
    // 잠긴 동안 아래 패널 · 수송차를 못 누르게(body.inlock) — 0.1초마다 상태를 봄(연출은 타이머로 끝나므로)
    setInterval(() => { const ui = root.App && root.App.ui; if (!ui || !ui.inputLocked) return; const on = !!(ui.g && (ui.introBusy && ui.introBusy())); if (document.body.classList.contains('inlock') !== on) { document.body.classList.toggle('inlock', on); if (on) ui.dropHold(); } }, 100);
    // 명령도 막음(자동 소환 · 단축키 등 다른 길로 들어오는 것까지)
    const LOCKED = { callTruck: 1, roll: 1, summon: 1, merge: 1, moveTo: 1, useCommander: 1, choose: 1, upgrade: 1, gamble: 1, truck: 1, makeLegend: 1, awakenMythic: 1, slide: 1 };
    const hook = () => { const A = root.App; if (!A || !A.cmd || A._lk) return !!(A && A._lk); A._lk = 1; const base = A.cmd; A.cmd = function (name, a) { if (LOCKED[name] && this.ui && this.ui.introBusy && this.ui.introBusy()) return false; return base.call(this, name, a); }; return true; };
    if (!hook()) { const iv = setInterval(() => { if (hook()) clearInterval(iv); }, 200); }
  }
})(window);
