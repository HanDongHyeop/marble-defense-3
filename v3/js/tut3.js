// 마블 디펜스 3.5 — 첫 판 튜토리얼(강제 진행 · 스포트라이트). 랜다2 · 운빨존많겜의 첫 전투 안내처럼 '해 보게' 한다.
//   화면을 어둡게 덮고 눌러야 할 곳만 뚫음(그곳만 터치가 통함) · 뚫린 곳에 고리 맥박 + 손가락 · 말풍선(제목 · 설명) · 단계마다 0.35초 입력 지연(실수 터치 방지)
//   판은 0라운드에 멈춰 둠(g.startAt을 미룸) → 몬스터 없이 조작만 익히고, 끝나면 1라운드 시작
//   단계: ① 소환 2번 ② 밀어 합치기(짝을 한 줄에 놓아 줌) ③ 방향 단추 ④ 캐릭터 눌러 범위 ⑤ 강화 열기 → 카드 누르기 ⑥ 조합 · 미션 안내 ⑦ 수정 안내 → 시작
//   다시 보기: 일시정지 → 도움말(규칙 카드) · 건너뛰기 단추 있음. 저장: localStorage mdv3_tutdone
(function (root) {
  const U = root.UI.prototype, G = root.GEOM;
  const $ = id => document.getElementById(id);
  const KEY = 'mdv3_tutdone';
  const seen = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } };
  const mark = () => { try { localStorage.setItem(KEY, '1'); } catch (e) { /* 저장 안 됨 */ } };
  const Q = new URLSearchParams(location.search);

  const TUT = root.TUT3 = { on: false, step: -1 };
  function rectOf(sel) {
    const st = $('stage').getBoundingClientRect(), k = st.width / 720;
    if (typeof sel === 'string') { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { x: (r.left - st.left) / k, y: (r.top - st.top) / k, w: r.width / k, h: r.height / k }; }
    return sel;
  }
  const boardRect = () => { const b = G.boardRect; return { x: b.x - 6, y: b.y - 6, w: b.w + 12, h: b.h + 12 }; };

  function steps(ui) {
    const g = () => ui.g, R = () => ui.app.renderer;
    return [
      { t: '아군 소환', x: '<b>[소환]</b>을 눌러 아군을 불러 보세요.<br>두 번 눌러 볼까요?', hole: () => rectOf('#rollBtn'), hand: 'tap',
        enter() { g().gold = Math.max(g().gold, 300); this.r0 = g().stats.rolls; }, done() { return g().stats.rolls >= this.r0 + 2; } },
      { t: '밀어서 합치기', x: '판을 <b>왼쪽으로 쓸어</b> 보세요.<br>같은 레벨끼리 부딪히면 합쳐져 <b>레벨이 올라요</b>.', hole: boardRect, hand: 'swipe',
        enter() { this.place(); this.m0 = g().stats.merges; },
        place() { const G0 = g(); for (const t of G0.tiles) if (!t.blocked) t.tower = null; G0.build(12, 'fire', 1); G0.build(14, 'gatling', 1); G0.slideCd = 0; },
        tick() { const G0 = g(); if (G0.stats.merges > this.m0) return; const L = G0.towersList(); if (L.length === 2 && (L[0].i >> 2) !== (L[1].i >> 2)) { if (!this.fixT) this.fixT = performance.now(); else if (performance.now() - this.fixT > 700) { this.fixT = 0; this.place(); ui.toast('다시!', '왼쪽이나 오른쪽으로 밀어 보세요', '', false, 1.2); } } },
        done() { return g().stats.merges > this.m0; } },
      { t: '방향 단추', x: '쓸기가 불편하면 <b>방향 단추</b>로 밀어도 돼요.<br>아무 방향이나 눌러 보세요.', hole: () => rectOf('#dpad'), hand: 'tap',
        enter() { this.n0 = TUT.slides; }, done() { return TUT.slides > this.n0; } },
      { t: '공격 범위', x: '아군을 <b>눌러</b> 보세요.<br>공격이 닿는 범위가 원으로 보여요.', hole() { const t = g().towersList()[0]; if (!t) return boardRect(); const p = R().drawPos(g(), t.i, t.tower); return { x: p[0] - 64, y: p[1] - 118, w: 128, h: 140 }; }, hand: 'tap',
        enter() { ui.hideInfo(); }, done() { return R().sel != null; } },
      { t: '강화', x: '<b>[강화]</b>를 눌러 창을 여세요.<br>금화로 한 계열 전체를 세게 만들어요.', hole: () => rectOf('#upBtn'), hand: 'tap',
        enter() { ui.hideInfo(); g().gold = Math.max(g().gold, 300); }, done() { return !$('upSheet').hidden; } },
      { t: '강화', x: '계열 카드를 눌러 <b>강화</b>해 보세요.<br>판 위 그 계열이 모두 강해져요.', hole: () => rectOf('#upSheet'), hand: 'tap', bubble: 'top',
        enter() { this.u0 = Object.values(g().upg).reduce((a, b) => a + b, 0); g().gold = Math.max(g().gold, 300); }, done() { return Object.values(g().upg).reduce((a, b) => a + b, 0) > this.u0; }, leave() { if (ui.upOpen) ui.upOpen(false); } },
      { t: '전설과 신화', x: 'Lv.3까지는 밀어서 합쳐요.<br>그 위 <b>전설</b>은 <b>[조합]</b>에서 재료를 모아 만들고,<br><b>신화</b>는 신화석이 필요해요.<br>신화석은 보스와 <b>[미션]</b>에서 얻어요.', hole: () => { const a = rectOf('#misBtn'), b = rectOf('#mixBtn'); return { x: a.x, y: a.y, w: b.x + b.w - a.x, h: a.h }; }, next: '알겠어요', block: true },
      { t: '수정을 지켜라', x: '몬스터가 6시 굴에서 나와 <b>12시 수정</b>으로 가요.<br>닿으면 수정이 깎이고, 0이 되면 끝!', hole: () => { const p = R().cryPos(); return { x: p[0] - 70, y: p[1] - 110, w: 140, h: 150 }; }, next: '시작!', block: true },
    ];
  }

  TUT.begin = function (ui) {
    if (TUT.on) return; const g = ui.g; if (!g) return;
    TUT.on = true; TUT.ui = ui; TUT.slides = 0; TUT.list = steps(ui);
    if (g.round === 0) g.startAt = 1e9;   // 판을 0라운드에 세워 둠
    const el = document.createElement('div'); el.id = 'tut3';
    el.innerHTML = '<i class="tb a"></i><i class="tb b"></i><i class="tb c"></i><i class="tb d"></i><i class="th"></i><i class="hole"></i><i class="hand"></i>'
      + '<div class="bub"><span class="st"></span><b class="tt"></b><p class="tx"></p><button class="nx" hidden></button></div><button id="tutSkip">건너뛰기</button>';
    $('stage').appendChild(el); TUT.el = el;
    el.querySelector('#tutSkip').addEventListener('click', e => { e.stopPropagation(); TUT.end(true); });
    el.querySelector('.nx').addEventListener('click', e => { e.stopPropagation(); if (performance.now() - TUT.t0 > 350) TUT.go(TUT.step + 1); });
    for (const b of el.querySelectorAll('.tb, .th')) b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge'); });
    TUT.go(0);
    const loop = () => { if (!TUT.on) return; TUT.tick(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  };
  TUT.go = function (n) {
    const prev = TUT.list[TUT.step]; if (prev && prev.leave) prev.leave();
    if (n >= TUT.list.length) { TUT.end(false); return; }
    TUT.step = n; TUT.t0 = performance.now(); const s = TUT.list[n], el = TUT.el;
    if (s.enter) s.enter();
    el.querySelector('.st').textContent = (n + 1) + ' / ' + TUT.list.length;
    el.querySelector('.tt').textContent = s.t; el.querySelector('.tx').innerHTML = s.x;
    const nx = el.querySelector('.nx'); nx.hidden = !s.next; if (s.next) nx.textContent = s.next;
    el.dataset.hand = s.hand || ''; el.classList.toggle('block', !!s.block);
    el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
    try { root.SFX.click && root.SFX.click(); } catch (e) { /* 소리 없음 */ }
    if (root.HAPTIC) try { root.HAPTIC.play('select'); } catch (e) { /* 없음 */ }
  };
  TUT.tick = function () {
    const s = TUT.list[TUT.step], el = TUT.el; if (!s) return;
    const r = (typeof s.hole === 'function' ? s.hole() : s.hole) || { x: 260, y: 500, w: 200, h: 200 }, pad = 8;
    const x = r.x - pad, y = r.y - pad, w = r.w + pad * 2, h = r.h + pad * 2;
    const set = (q, l, t, ww, hh) => { const e = el.querySelector(q); e.style.left = l + 'px'; e.style.top = t + 'px'; e.style.width = Math.max(0, ww) + 'px'; e.style.height = Math.max(0, hh) + 'px'; };
    set('.tb.a', 0, 0, 720, y); set('.tb.b', 0, y + h, 720, 1280 - y - h); set('.tb.c', 0, y, x, h); set('.tb.d', x + w, y, 720 - x - w, h);
    set('.hole', x, y, w, h); set('.th', x, y, w, h);
    // 입력 지연 · 안내만 하는 단계는 뚫린 곳도 막음
    el.querySelector('.th').style.display = (s.block || performance.now() - TUT.t0 < 350) ? 'block' : 'none';
    const hd = el.querySelector('.hand'); hd.style.left = (x + w / 2) + 'px'; hd.style.top = (y + h / 2) + 'px';
    const bub = el.querySelector('.bub'), bh = bub.offsetHeight || 160, above = s.bubble === 'top' ? true : (y + h / 2 > 640);
    bub.style.top = Math.max(96, Math.min(1280 - bh - 20, above ? y - bh - 26 : y + h + 26)) + 'px';
    if (s.tick) s.tick();
    if (!s.next && performance.now() - TUT.t0 > 350 && s.done && s.done()) {
      if (!TUT.doneT) { TUT.doneT = performance.now(); el.classList.add('ok'); try { root.SFX.good && root.SFX.good(); } catch (e) { /* 없음 */ } }
      else if (performance.now() - TUT.doneT > 650) { TUT.doneT = 0; el.classList.remove('ok'); TUT.go(TUT.step + 1); }
    }
  };
  TUT.end = function (skipped) {
    if (!TUT.on) return; TUT.on = false; mark();
    const s = TUT.list[TUT.step]; if (s && s.leave) s.leave();
    if (TUT.el) TUT.el.remove(); TUT.el = null;
    const ui = TUT.ui, g = ui.g; ui.hideInfo(); if (ui.upOpen) ui.upOpen(false);
    if (g && g.round === 0) g.startAt = g.t + 1.2;
    if (!skipped) { ui.toast('준비 끝!', '몬스터가 옵니다', '수정을 지켜 주세요', false, 1.8); try { root.SFX.jackpot && root.SFX.jackpot(); } catch (e) { /* 없음 */ } }
    if (!ui.app.hold) try { root.SFX.music('battle'); } catch (e) { /* 없음 */ }
    ui.app.paused = false;
  };

  // 밀기 횟수(움직이지 않아도 '시도'로 셈 — 방향 단추 단계)
  const baseSlide = U.labSlide;
  U.labSlide = function (d) { TUT.slides = (TUT.slides || 0) + 1; return baseSlide.call(this, d); };
  // 첫 판(규칙 카드 자리) → 튜토리얼. 도움말에서 부른 규칙 카드(back 있음)는 그대로
  const baseIntro = U.labIntro;
  U.labIntro = function (back) {
    if (!back && Q.get('tut') !== '0' && Q.get('qa') !== 'bot' && (!seen() || Q.get('tut') === '1')) { this.close && this.modalOpen() && this.close(); this.app.paused = false; TUT.begin(this); return; }
    return baseIntro.call(this, back);
  };
})(window);
