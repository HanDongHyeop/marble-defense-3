// 마블 디펜스 3 — 화면 조작 층(본편 ui.js + lab_ui.js 위): 캐릭터 그림 경로 · 강화 창(단추를 눌러야 뜸) · 아군 정보 카드
(function (root) {
  const U = root.UI.prototype, D = root.DATA;
  const $ = id => document.getElementById(id);
  const fmt = n => Math.floor(n).toLocaleString('ko-KR');
  const ART = root.V3VIEW.ART, artOf = root.V3VIEW.artOf, TIER_COL = root.V3VIEW.TIER_COL;

  // 그림 경로: 본편 이름(t_<종류>_<단계> · m_normal · x_crystal) → v3 그림
  const baseImg = U.img;
  U.img = function (k) {
    let m = /^t_(\w+?)_(\d)$/.exec(k);
    if (m) { const F2 = { fire: 'fire', gatling: 'mech', bolt: 'storm', ice: 'frost', light: 'knight', corrode: 'demon', combo: 'mage' }, GR5 = [0, 1, 2, 3, 3, 4, 5]; return 'v3/img/px/ally2/' + (F2[m[1]] || 'fire') + '_' + GR5[+m[2]] + '.png'; }   // [v3.9e] 예전 그림으로 대신하지 않음
    if (k === 'm_normal') return 'v3/img/px/mon/meadow_normal_1.png';
    if (k === 'x_crystal') return 'v3/img/obj/crystal.png';
    return baseImg.call(this, k);
  };

  const FAMK = { fire: 'fire', gatling: 'mech', bolt: 'storm', ice: 'frost', light: 'knight', corrode: 'demon', combo: 'mage' };
  // 강화 카드(창 안): 얼굴 · 이름 · 역할 · Lv · 값. 본편 update()가 .lv · .pr b · poor · max를 갱신한다
  U.buildDeck = function (deck) {
    const ks = deck || D.DECK;
    $('deckRow').innerHTML = ks.map(k => { const C = D.CHAR && D.CHAR[k]; return `<button class="deck v3card" data-k="${k}" style="--c:${root.V3VIEW.COL[artOf(k)]}">
      <span class="face sym"><img src="v3/img/sym/${FAMK[k]}.png" onerror="this.onerror=null;this.src='v3/img/px/ally2/${FAMK[k]}_1.png'" alt=""></span>
      <span class="nm">${C ? C.name : D.TOWERS[k].name}</span><span class="role">${C ? C.role : ''}</span>
      <span class="lv">Lv 0</span><span class="eff">타격당 +0</span>
      <div class="pr"><span class="coin"></span><b>100</b></div></button>`; }).join('');
    const gi = $('gdImg'); if (gi) gi.src = this.img('i_gdice');
    $('gaugeIco').src = this.img('x_crystal');
  };

  // [v3.1] 보이는 등급 · 이름
  const GR = root.GRADE3;
  const FAM2 = { fire: 'fire', gatling: 'mech', bolt: 'storm', ice: 'frost', light: 'knight', corrode: 'demon', combo: 'mage' };
  const NAME2 = { fire: '불꽃', gatling: '기계', bolt: '폭풍', ice: '서리', light: '기사' };
  const face = (type, grade) => '<img src="v3/img/ally2/' + FAM2[type] + '_' + grade + '.png" alt="">';   // [v3.9e] 예전 그림으로 대신하지 않음

  // 강화 단추 · 창
  const baseBind = U.bind;
  U.bind = function () {
    const r = baseBind.call(this);
    const s = this.sfx(), sheet = $('upSheet'), btn = $('upBtn');
    const open = on => { sheet.hidden = !on; document.body.classList.toggle('upopen', on); btn.classList.toggle('on', on); btn.setAttribute('aria-expanded', on ? 'true' : 'false'); if (on) { this.hideInfo(); } };
    this.upOpen = open;
    btn.addEventListener('click', e => { e.stopPropagation(); s.init(); s.click && s.click(); open(sheet.hidden); });
    $('upClose').addEventListener('click', e => { e.stopPropagation(); s.click && s.click(); open(false); });
    // 판을 누르면 닫힘(밀기 · 탭과 같이)
    $('world').addEventListener('pointerdown', () => { if (!sheet.hidden) open(false); if (!$('v3Sheet').hidden) this.v3Sheet(null); }, true);
    // [v3.5] 방향 단추(2048 십자) 복구 — 쓸기와 같은 동작. 누르면 그 방향으로 한 번 밀기
    $('dpad').addEventListener('pointerdown', e => {
      const b = e.target.closest('[data-d]'); if (!b) return; e.preventDefault(); e.stopPropagation(); s.init();
      b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
      if (this.g && !this.g.over) this.labSlide(b.dataset.d);
    });
    // [v3.1] 아래 줄: 미션 · 조합 · 배속
    const tog = k => { s.init(); if (s.click) s.click(); this.v3Sheet(this._sheetK === k ? null : k); };
    $('misBtn').addEventListener('click', e => { e.stopPropagation(); tog('mis'); });
    $('mixBtn').addEventListener('click', e => { e.stopPropagation(); tog('mix'); });
    $('v3SheetX').addEventListener('click', e => { e.stopPropagation(); this.v3Sheet(null); });
    $('spdBtn').addEventListener('click', e => { e.stopPropagation(); s.init(); if (s.click) s.click(); this.settings.speed = (this.settings.speed || 1) >= 2 ? 1 : 2; this.v3Sub(true); });
    $('v3SheetB').addEventListener('click', e => {
      const b = e.target.closest('[data-v3]'); if (!b || b.disabled) return; e.stopPropagation(); s.init();
      if (!this.g) return;
      const ok = b.dataset.v3 === 'legend' ? this.app.cmd('makeLegend', [b.dataset.k]) : b.dataset.v3 === 'gamble' ? this.app.cmd('gamble', [b.dataset.k]) : this.app.cmd('awakenMythic', [+b.dataset.i]);
      if (ok) { if (s.click) s.click(); } else s.error();
      this._sheetSig = null; this.v3SheetFill();
    });
    return r;
  };
  const baseUpdate = U.update;
  U.update = function () {
    this._mergeHint = 1;   // [v3.7] 본편의 '같은 포탑끼리 끌어 겹쳐 보세요' 알림은 끔(첫 판 튜토리얼이 같은 내용을 v3 말로 가르침 — 겹쳐 뜸)
    baseUpdate.call(this);
    const g = this.g; if (!g) return;
    // 강화 효과 글씨(종류별 강화 1단계 = 공격 +?%) · 살 수 있으면 단추에 점
    let can = false;
    for (const b of document.querySelectorAll('.deck.v3card')) {
      const k = b.dataset.k, lv = g.upg[k] || 0, c = g.upgradeCost(k);
      const add = g.upgHitAdd ? g.upgHitAdd(k) : 0;
      const ef = b.querySelector('.eff'); const t = '타격당 +' + (add * lv) + (lv < 10 ? ' → +' + (add * (lv + 1)) : ''); if (ef.textContent !== t) ef.textContent = t;
      if (lv < 10 && g.gold >= c) can = true;
    }
    const dot = document.querySelector('#upBtn .dot'); if (dot && dot.hidden === can) dot.hidden = !can;
    this.v3Sub(false);
  };

  // [v3.1] 아래 줄 숫자 · 조합 가능 표시 · 열린 창 새로 고침
  U.v3Sub = function (force) {
    const g = this.g; if (!g || !g.mis) return;
    const M = GR.MISSIONS, done = g.mis.filter(q => q.done).length;
    const t1 = done + '/' + M.length; if ($('misN').textContent !== t1) $('misN').textContent = t1;
    const t2 = String(g.mythStones); if ($('mythN').textContent !== t2) $('mythN').textContent = t2;
    const sp = (this.settings.speed || 1) >= 2 ? '2x' : '1x'; if ($('spdTxt').textContent !== sp) $('spdTxt').textContent = sp;
    const ready = !g.dragMode && (g.constructor.ORDER.some(k => g.legendRecipe(k).ok) || g.towersList().some(t => { const st = g.mythState(t.i); return st && st.ok; }));
    if (g.dragMode && !this._mixNamed) { this._mixNamed = true; const b = $('mixBtn').querySelector('b'); if (b) b.textContent = '뽑기'; }
    if ($('mixN').hidden === ready) { $('mixN').hidden = !ready; $('mixBtn').classList.toggle('ready', ready); }
    if (!$('v3Sheet').hidden && (force || !this._sheetT || performance.now() - this._sheetT > 300)) { this._sheetT = performance.now(); this.v3SheetFill(); }
  };
  U.v3Sheet = function (k) {
    this._sheetK = k; this._sheetSig = null;
    $('v3Sheet').hidden = !k;
    document.body.classList.toggle('upopen', !!k || !$('upSheet').hidden);
    $('misBtn').classList.toggle('on', k === 'mis'); $('mixBtn').classList.toggle('on', k === 'mix');
    if (k) { if (this.upOpen) this.upOpen(false); document.body.classList.add('upopen'); this.hideInfo(); this.v3SheetFill(); }
  };
  U.v3SheetFill = function () {
    const g = this.g, k = this._sheetK; if (!g || !k) return;
    let html = '';
    if (k === 'mis') {
      $('v3SheetT').textContent = '판 미션'; $('v3SheetS').textContent = '보상: 신화석 · 금화';
      html = '<div class="v3mis">' + GR.MISSIONS.map(M => {
        const st = g.mis.find(q => q.id === M.id), n = Math.min(st.n, M.goal);
        const rw = M.reward.myth ? '<span class="rw gem">신화석 ' + M.reward.myth + '</span>' : M.reward.gold ? '<span class="rw gold">금화 ' + M.reward.gold + '</span>' : '<span class="rw gem">보스마다 신화석 1</span>';
        return '<div class="mrow ' + (st.done ? 'done' : '') + '"><div class="mt"><b>' + M.name + '</b>' + rw + '</div><div class="mbar"><i style="width:' + (n / M.goal * 100) + '%"></i></div><span class="mn">' + (st.done ? '완료' : n + ' / ' + M.goal) + '</span></div>';
      }).join('') + '</div>';
    } else {
      const DM = g.dragMode;
      $('v3SheetT').textContent = DM ? '행운 뽑기' : '조합'; $('v3SheetS').textContent = DM ? '성공하면 빈 칸에 그 등급 아군(계열 무작위)' : '전설 = 재료가 판에 다 있으면 · 신화 = 전설 게이지 + 신화석 1';
      const chip = (have, img, label) => '<span class="ing ' + (have ? 'ok' : '') + '">' + img + '<em>' + label + '</em></span>';
      const rows = DM ? '' : g.constructor.ORDER.map(type => {
        const r = g.legendRecipe(type), pt = r.partnerType;
        const btn = r.locked ? '<button class="mk" disabled>' + r.from + '라운드부터</button>'
          : r.cap ? '<button class="mk" disabled>전설 최대 ' + g.constructor.LEGEND_CAP + '</button>'
          : '<button class="mk ' + (r.ok ? 'go' : '') + '" data-v3="legend" data-k="' + type + '" ' + (r.ok ? '' : 'disabled') + '>전설 소환</button>';
        return '<div class="lrow"><span class="lface">' + face(type, 4) + '</span><div class="lmid"><b>' + NAME2[type] + ' 전설</b><div class="ings">'
          + chip(r.need[0].have, face(type, 3), NAME2[type] + ' 영웅') + '<i>+</i>' + chip(r.need[1].have, face(pt, 3), NAME2[pt] + ' 영웅') + '<i>+</i>' + chip(r.need[2].have, '<span class="any">희귀</span>', '아무거나')
          + '</div></div>' + btn + '</div>';
      }).join('');
      const legs = DM ? '' : g.towersList().filter(t => t.tower.tier === 5).map(t => {
        const st = g.mythState(t.i);
        const why = !st.open ? '성장 탭에서 해금하면 각성' : st.cap ? '신화는 판에 1개까지' : st.gauge < 1 ? '처치 ' + st.kills + ' / ' + st.need : st.stones < 1 ? '신화석이 필요해요' : '각성할 수 있어요!';
        return '<div class="lrow myth"><span class="lface">' + face(t.tower.type, 4) + '</span><div class="lmid"><b>' + NAME2[t.tower.type] + ' 전설 → 신화</b><div class="mbar"><i style="width:' + (st.gauge * 100) + '%"></i></div><small>' + why + '</small></div>'
          + '<button class="mk ' + (st.ok ? 'go myth' : '') + '" data-v3="myth" data-i="' + t.i + '" ' + (st.ok ? '' : 'disabled') + '>신화 각성<em>신화석 1</em></button></div>';
      }).join('');
      const gb = kind => { const I = g.gambleInfo(kind), nm = kind === 'hero' ? '영웅 뽑기' : '희귀 뽑기', cost = kind === 'hero' ? '신화석 1' : '금화 50';
        return '<button class="gb ' + kind + (I.ok ? ' go' : '') + '" data-v3="gamble" data-k="' + kind + '" ' + (I.ok ? '' : 'disabled') + '><b>' + nm + '</b><span>성공 ' + Math.round(I.p * 100) + '%</span><em>' + cost + '</em></button>'; };
      if (DM) html = '<div class="v3mix"><div class="gbrow">' + gb('rare') + gb('hero') + '</div><div class="lsep">전설 · 신화는 같은 등급끼리 합쳐서 만들어요</div></div>';
      else html = '<div class="v3mix">' + rows + (legs ? '<div class="lsep">판 위 전설</div>' + legs : '') + '<div class="lsep">행운 뽑기 — 성공하면 빈 칸에 그 등급 아군(계열 무작위)</div><div class="gbrow">' + gb('rare') + gb('hero') + '</div></div>';
    }
    if (html !== this._sheetSig) { this._sheetSig = html; $('v3SheetB').innerHTML = html; }
  };
  const baseOnEv = U.onEvent;
  U.onEvent = function (e) {
    baseOnEv.call(this, e);
    if (e.ev === 'missionDone') this.toast('미션 완료!', e.name, e.reward.myth ? '신화석 +' + e.reward.myth : e.reward.gold ? '금화 +' + e.reward.gold : '', false, 1.8);
    if (e.ev === 'gamble') { if (e.win) { this.toast('행운 뽑기', '성공!', (e.tier === 3 ? '영웅' : '희귀') + ' 아군이 나왔어요', false, 1.4); if (root.SFX.jackpot) root.SFX.jackpot(); } else { this.toast('행운 뽑기', '꽝…', e.kind === 'hero' ? '위로금 금화 +40' : '다음엔 될 거예요', true, 1.2); if (root.SFX.bad) root.SFX.bad(); } }
    if (e.ev === 'gambleNo') this.toast('행운 뽑기', e.empty ? '재화가 모자라요' : '빈 칸이 없어요', '', true, 1.2);
    if (e.ev === 'legendNo' && e.cap) this.toast('전설', '판 위 전설은 최대 ' + this.g.constructor.LEGEND_CAP + '개', '', true, 1.2);
  };

  // 보스 경고: 판 컨셉의 보스 그림(이끼 돌뱀 · 서리 수정룡 · 용암 뱀룡) — 본편은 보스 종류별 픽셀 그림
  const baseWarn = U.bossWarn;
  U.bossWarn = function (e) {
    baseWarn.call(this, e);
    const g = this.g, cpt = root.V3VIEW.CONCEPT[(g && g.chapter) || 1] || 'meadow', img = $('warnImg');
    if (img) img.src = 'v3/img/mon/' + cpt + '_boss.png';
  };

  // 아군 정보 카드: 캐릭터 이름 · 단계 이름 · 역할(땅 · 출동 줄 없음)
  const baseShow = U.showInfo;
  U.showInfo = function (i) {
    baseShow.call(this, i);
    const g = this.g, tw = g.tiles[i] && g.tiles[i].tower, C = tw && D.CHAR && D.CHAR[tw.type]; if (!C) return;
    const box = $('infoBox');
    const nm = box.querySelector('.ib-name b'); if (nm) nm.textContent = NAME2[tw.type] + ' ' + (GR ? GR.GNAME[GR.GRADE[tw.tier]] : tw.tier);
    const tierEl = box.querySelector('.ib-tier'); if (tierEl && GR) tierEl.textContent = GR.GNAME[GR.GRADE[tw.tier]];
    const stars = box.querySelector('.ib-stars'); if (stars && GR) { const gg = GR.GRADE[tw.tier]; stars.innerHTML = '★'.repeat(gg) + '<i>' + '★'.repeat(5 - gg) + '</i>'; }
    const fam = box.querySelector('.ib-fam'); if (fam) fam.textContent = C.name + ' · ' + C.role;
    const pic = box.querySelector('.ib-pic'); if (pic) pic.style.setProperty('--c', root.V3VIEW.COL[artOf(tw.type)]);
    for (const el of box.querySelectorAll('.ib-land, .ib-sub:not(.aw)')) el.remove();
    // 사거리 = 캐릭터 둘레 원(칸 수)
    const st = box.querySelectorAll('.ib-stats > div'); if (st[3]) st[3].querySelector('b').textContent = g.allRange ? '판 전체' : '반경 ' + (+(g.rangePx(i) / 100).toFixed(1)) + '칸';
  };
})(window);
