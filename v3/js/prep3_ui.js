// 마블 디펜스 3 — 준비 · 전투 모드 화면(prep3.js 규칙 위). 본편 ui.js + lab_ui.js + ui3.js 위에 덧붙임
//   ① 준비 띠 + [전투 시작] ② 먹이기 고르는 창(받기 · 취소 / 바꾸기 · 레벨로 · 취소) ③ 등급업 갈래 카드 2장 ④ 각성 카드 3장
//   ⑤ 캐릭터 머리 위: 레벨(등급 색) · 흔적 점 · '!'(고를 카드 있음) · 도시락 ⑥ 정보 카드에 레벨 · 다음 문턱 · 흔적 · 갈래 · 각성
(function (root) {
  const PR = root.PREP3; if (!PR || !root.UI) return;
  const U = root.UI.prototype, D = root.DATA, GR = root.GRADE3, P = PR.P;
  const $ = id => document.getElementById(id);
  const GN = GR.GNAME, GRADE = GR.GRADE;
  const FAMN = { fire: '불', gatling: '기계', bolt: '폭풍', ice: '서리', light: '기사', corrode: '악마', combo: '마법사' };
  const FAM2 = { fire: 'fire', gatling: 'mech', bolt: 'storm', ice: 'frost', light: 'knight', corrode: 'demon', combo: 'mage' };
  const TRC = { fire: '#ff7a3a', gatling: '#9fb3c8', bolt: '#ffe14a', ice: '#7fd8ff', light: '#ffd27a', corrode: '#c07aff', combo: '#7affc8' };
  const face = (type, g) => `<img src="v3/img/ally2/${FAM2[type]}_${g}.png" alt="">`;
  const gOf = tw => GRADE[tw.tier] || 1;
  const nameOf = tw => (D.CHAR && D.CHAR[tw.type] ? D.CHAR[tw.type].tiers[tw.tier] : FAMN[tw.type]);
  const on = () => { const a = root.App, g = a && a.game; return !!(g && g.prepOn); };

  // ---------------------------------------------------------------- 준비 띠 + [전투 시작]
  function bar() {
    let b = $('prepBar'); if (b) return b;
    b = document.createElement('div'); b.id = 'prepBar'; b.hidden = true;
    b.innerHTML = '<i class="pb-fill" id="pbFill"></i><div class="pb-t"><b id="pbTitle">준비 시간</b><span id="pbSub"></span></div><button id="pbGo" class="pb-go">바로 시작</button>';
    $('stage').appendChild(b);
    $('pbGo').addEventListener('click', e => {
      e.stopPropagation(); const A = root.App, ui = A.ui; if (!A.game || ui.inputLocked && ui.inputLocked()) return;
      root.SFX.init && root.SFX.init();
      const pend = A.game.towersList().find(t => t.tower.ready || t.tower.awkReady);
      if (pend) { ui.prepCard(pend.i); return; }   // 고를 카드가 남아 있으면 먼저
      if (A.cmd('startBattle')) { root.SFX.click && root.SFX.click(); if (root.HAPTIC) root.HAPTIC.play('select'); }
    });
    return b;
  }

  const baseUpdate = U.update;
  U.update = function () {
    baseUpdate.call(this);
    const g = this.g; if (!g || !g.prepOn) { const b = $('prepBar'); if (b) b.hidden = true; document.body.classList.remove('prepmode', 'inprep'); return; }
    document.body.classList.add('prepmode');
    const b = bar(), prep = g.phase === 'prep' && !g.over;
    document.body.classList.toggle('inprep', prep);
    if (b.hidden === prep) b.hidden = !prep;
    if (prep) {
      const nx = g.round + 1, boss = nx % 5 === 0, pend = g.towersList().filter(t => t.tower.ready || t.tower.awkReady).length;
      const left = g.prepLeft(), sec = Math.ceil(left), full = g.round ? PR.P.prepTime : PR.P.firstPrep;
      const t1 = `다음 ${nx}웨이브${boss ? '(보스)' : ''}까지 ${sec}초`, t2 = pend ? `고를 카드 ${pend}장 — 캐릭터 위 ! 를 누르세요` : '조합 준비 · 소환하고 먹여서 키우세요', t3 = pend ? '카드 고르기' : '바로 시작';
      $('pbFill').style.width = Math.max(0, Math.min(100, left / full * 100)) + '%'; $('prepBar').classList.toggle('hurry', sec <= 3);
      if ($('pbTitle').textContent !== t1) $('pbTitle').textContent = t1;
      if ($('pbSub').textContent !== t2) $('pbSub').textContent = t2;
      if ($('pbGo').textContent !== t3) { $('pbGo').textContent = t3; $('pbGo').classList.toggle('pend', !!pend); }
      const tt = $('timerTxt'), tx = '0:' + String(sec).padStart(2, '0'); if (tt && tt.textContent !== tx) tt.textContent = tx;
    }
  };

  // ---------------------------------------------------------------- 끌어 놓기 = 먹이기(고르는 창은 준비 시간에만 · 전투 중엔 기본값으로 바로)
  const hookCmd = () => {
    const A = root.App; if (!A || !A.cmd || A._prepCmd) return !!(A && A._prepCmd); A._prepCmd = 1;
    const base = A.cmd;
    A.cmd = function (name, a) {
      const g = this.game;
      if (name === 'merge' && g && g.prepOn && a && g.canMerge(a[0], a[1])) {
        const A = g.tiles[a[0]].tower, B = g.tiles[a[1]].tower;
        // 더 센 캐릭터(등급 또는 레벨이 높음)를 약한 쪽에 먹이려 하면 한 번 확인 — 먹힌 쪽 레벨은 넘어오지 않음(슬롯바운드와 같음)
        if (!this.bot && !(a[2] === 'ok') && (gOf(A) > gOf(B) || A.lv > B.lv)) { this.ui.feedWarn(a[0], a[1]); return true; }
        const I = g.feedInfo(a[0], a[1]);
        if (I.ask && g.phase === 'prep' && !this.bot) { this.ui.feedAsk(a[0], a[1], I); return true; }
        return base.call(this, 'feed', [a[0], a[1], I.auto || null]);
      }
      return base.call(this, name, a);
    };
    return true;
  };
  if (!hookCmd()) { const iv = setInterval(() => { if (hookCmd()) clearInterval(iv); }, 150); }

  U.feedWarn = function (a, b) {
    const g = this.g, A = g.tiles[a].tower, B = g.tiles[b].tower, gain = 1 + (A.lunch || 0);
    const card = (tw, cls) => `<div class="fw-c ${cls}"><span class="pf-face">${face(tw.type, gOf(tw))}</span><b class="g${gOf(tw)}">${GN[gOf(tw)]} Lv ${tw.lv}</b><small>${nameOf(tw)}</small></div>`;
    const m = this.open(`<div class="mbox prepf"><h2>더 센 캐릭터예요!</h2><p class="sub">먹힌 캐릭터의 레벨은 넘어오지 않아요</p>
      <div class="fw-row">${card(A, 'eat')}<span class="pf-arrow">→</span>${card(B, 'keep')}</div>
      <div class="fw-res">받는 쪽: Lv ${B.lv} → <b>${B.lv + gain}</b> · <span>${GN[gOf(A)]} Lv ${A.lv}는 사라져요</span></div>
      <div class="pf-btns"><button class="btn green" data-act="no">취소<small>먹이지 않음</small></button><button class="btn sec" data-act="yes">그래도 먹이기<small>${GN[gOf(A)]}를 먹여요</small></button></div></div>`, 'prepm');
    m.onclick = e => {
      const btn = e.target.closest('[data-act]'); if (!btn) return; e.stopPropagation(); root.SFX.click && root.SFX.click();
      this.close(); if (btn.dataset.act === 'yes') this.app.cmd('merge', [a, b, 'ok']);
    };
  };
  U.feedAsk = function (a, b, I) {
    const g = this.g, A = g.tiles[a].tower, B = g.tiles[b].tower, T = PR.TR[I.k];
    const gain = I.base, lvTo = B.lv + gain, lvConv = B.lv + gain + I.conv;
    const trRow = (t, j, swap) => `<button class="pf-tr ${swap ? 'sw' : ''}" ${swap ? `data-act="swap" data-j="${j}"` : 'disabled'} style="--c:${TRC[t.k]}"><i></i><b>${PR.TR[t.k].n} Lv${t.lv}</b><small>${PR.TR[t.k].d(t.lv)}</small>${swap ? '<em>이것과 바꾸기</em>' : ''}</button>`;
    const head = `<div class="pf-head"><span class="pf-face">${face(A.type, gOf(A))}</span><span class="pf-arrow">→</span><span class="pf-face big">${face(B.type, gOf(B))}</span></div>
      <div class="pf-new" style="--c:${TRC[I.k]}"><i></i><b>새 흔적: ${T.n} Lv1</b><small>${T.d(1)}</small></div>`;
    let body, title;
    if (I.kind === 'empty') {
      title = '흔적을 받을까요?';
      body = `${head}<div class="pf-btns"><button class="btn sec" data-act="cancel">취소<small>먹이지 않음</small></button><button class="btn green" data-act="take">받기<small>Lv ${B.lv} → ${lvTo} · 흔적 칸 ${B.tr.length + 1}/${P.slots[gOf(B)]}</small></button></div>`;
    } else {
      title = '흔적 칸이 가득 찼어요';
      body = `${head}<div class="pf-sec">바꾸기 = 아래 흔적 하나를 버리고 새 흔적 (Lv ${B.lv} → ${lvTo})</div><div class="pf-list">${B.tr.map((t, j) => trRow(t, j, true)).join('')}</div>
        <div class="pf-btns"><button class="btn sec" data-act="cancel">취소<small>먹이지 않음</small></button><button class="btn blue" data-act="level">레벨로<small>흔적 대신 Lv ${B.lv} → ${lvConv} (+${gain + I.conv})</small></button></div>`;
    }
    const m = this.open(`<div class="mbox prepf"><h2>${title}</h2><p class="sub">${nameOf(A)} 를(을) ${nameOf(B)} 에게 먹여요${A.lunch ? ` · 도시락 +${A.lunch}` : ''}</p>${body}</div>`, 'prepm');
    m.onclick = e => {
      const btn = e.target.closest('[data-act]'); if (!btn) return; e.stopPropagation();
      const act = btn.dataset.act; root.SFX.click && root.SFX.click();
      this.close();
      if (act === 'cancel') return;
      const ok = this.app.cmd('feed', [a, b, act, act === 'swap' ? +btn.dataset.j : null]);
      if (ok && root.HAPTIC) root.HAPTIC.play('select');
    };
  };

  // ---------------------------------------------------------------- 등급업 갈래 카드 · 각성 카드
  const fx1 = v => (v >= 100 ? Math.round(v) : v >= 10 ? v.toFixed(0) : v.toFixed(1));
  const arrows = (a, b) => { const k = b / Math.max(1e-6, a); return k >= 1.6 ? '▲▲▲' : k >= 1.25 ? '▲▲' : k > 1.01 ? '▲' : ''; };
  U.prepCard = function (i) {
    const g = this.g, t = g.tiles[i], tw = t && t.tower; if (!tw) return;
    if (g.phase !== 'prep') { this.toast('카드는 준비 시간에', '웨이브가 끝나면 고를 수 있어요', '', false, 1.4); return; }
    if (tw.ready) return this.gradeCard(i);
    if (tw.awkReady) return this.awkCard(i);
  };
  U.gradeCard = function (i) {
    const g = this.g, tw = g.tiles[i].tower, gg = gOf(tw), nt = GR.TIER_OF[gg + 1];
    const brs = g.branches(i);
    const cards = brs.map(br => {
      const B = PR.BR[br], pv = g.preview(i, br), n = pv.now, x = pv.nx;
      const row = (k, a, b, f) => `<div class="gc-row"><span>${k}</span><b>${f(a)}</b><i>→</i><b class="nx">${f(b)}</b><em>${arrows(a, b)}</em></div>`;
      return `<button class="gc-card" data-br="${br}"><div class="gc-face">${face(tw.type, gg + 1)}</div>
        <div class="gc-name">${D.CHAR[tw.type].tiers[nt]}<span>${B.n}</span></div><div class="gc-d">${B.d}</div>
        ${row('힘', n.dps, x.dps, fx1)}${row('공격 속도', n.aps, x.aps, v => v.toFixed(2))}${row('반경', n.rng, x.rng, v => v.toFixed(1) + '칸')}
        <div class="gc-pick">이걸로!</div></button>`;
    }).join('');
    const m = this.open(`<div class="mbox prepg"><div class="lr-tag">등급업 · Lv ${tw.lv}</div><h2>${FAMN[tw.type]} ${GN[gg]} → <span class="g${gg + 1}">${GN[gg + 1]}</span></h2>
      <p class="sub">지금 상태에서 어느 쪽으로 키울지 골라요. 레벨 · 흔적 · 각성은 그대로 이어져요.</p><div class="gc-wrap">${cards}</div></div>`, 'prepm');
    m.onclick = e => {
      const c = e.target.closest('[data-br]'); if (!c) return; e.stopPropagation();
      this.close(); if (this.app.cmd('gradeUp', [i, c.dataset.br])) { if (root.HAPTIC) root.HAPTIC.play('select'); setTimeout(() => this.prepNext(), 650); }
    };
  };
  U.awkCard = function (i) {
    const g = this.g, tw = g.tiles[i].tower, s = tw.awk.length;
    const cards = (tw.awkOpts || []).map(id => { const c = PR.AWK_BY[id]; return `<button class="gc-card aw" data-id="${id}"><div class="aw-ico">${['Ⅰ', 'Ⅱ', 'Ⅲ'][s]}</div><div class="gc-name">${c.n}</div><div class="gc-d big">${PR.awkText(c, s)}</div><div class="gc-pick">이걸로!</div></button>`; }).join('');
    const m = this.open(`<div class="mbox prepg"><div class="lr-tag">신화 각성 ${['Ⅰ', 'Ⅱ', 'Ⅲ'][s]} · Lv ${tw.lv}</div><h2>${nameOf(tw)}</h2>
      <p class="sub">세 장 중 하나를 골라요. 고른 효과는 계속 남아요.</p><div class="gc-wrap three">${cards}</div></div>`, 'prepm');
    m.onclick = e => {
      const c = e.target.closest('[data-id]'); if (!c) return; e.stopPropagation();
      this.close(); if (this.app.cmd('awaken', [i, c.dataset.id])) { if (root.HAPTIC) root.HAPTIC.play('select'); setTimeout(() => this.prepNext(), 500); }
    };
  };
  U.prepNext = function () {   // 고를 카드가 더 있으면 이어서(준비 시간에만)
    const g = this.g; if (!g || g.phase !== 'prep' || this.modalOpen()) return;
    const t = g.towersList().find(q => q.tower.ready || q.tower.awkReady); if (t) this.prepCard(t.i);
  };

  // 준비 시간에 '!' 캐릭터를 누르면 카드 · 아니면 정보(레벨 · 흔적)
  const baseShow = U.showInfo;
  U.showInfo = function (i) {
    const g = this.g, tw = g && g.tiles[i] && g.tiles[i].tower;
    if (g && g.prepOn && tw && (tw.ready || tw.awkReady) && g.phase === 'prep') { this.hideInfo && this.hideInfo(); this.prepCard(i); return; }
    baseShow.call(this, i);
    const box = $('infoBox'); if (!box) return;
    box.classList.toggle('pinfo', !!(g && g.prepOn && tw));
    if (!g || !g.prepOn || !tw) return;
    // [2026-11-26 사용자] 정보가 많아져 정보 카드를 새로: 이름 · 계열 · 등급(★) · Lv와 다음 문턱 막대 · 힘/공속/반경 · 흔적 칸(찬 칸 · 빈 칸 · 잠긴 칸) · 메인 강화 · 도시락 · 갈래 · 각성
    const gg = gOf(tw), nx = g.nextLv(tw), st = g.statOf(i), lo = gg < 5 ? PR.P.lvStart[gg] : (tw.awk.length ? PR.P.awk[tw.awk.length - 1] : PR.P.lvStart[5]);
    const k = nx ? Math.max(0, Math.min(1, (tw.lv - lo) / Math.max(1, nx - lo))) : 1;
    const goal = !nx ? '각성 완료' : gg < 5 ? `Lv ${nx}에 <b class="g${gg + 1}">${GN[gg + 1]}</b> 등급업` : `Lv ${nx}에 각성 ${['Ⅰ', 'Ⅱ', 'Ⅲ'][tw.awk.length]}`;
    const unlockAt = n => { for (let q = 1; q <= 5; q++) if (PR.P.slots[q] >= n) return GN[q]; return ''; };
    const slots = [0, 1, 2].map(n => {
      const t = tw.tr[n];
      if (t) return `<div class="pc-slot on" style="--c:${TRC[t.k]}"><i></i><b>${PR.TR[t.k].n}</b><span class="pips">${[1, 2, 3].map(q => `<u class="${q <= t.lv ? 'f' : ''}"></u>`).join('')}</span><small>${PR.TR[t.k].d(t.lv)}</small></div>`;
      if (n < PR.P.slots[gg]) return '<div class="pc-slot empty"><b>빈 칸</b><small>다른 계열을 먹이면 흔적이 들어와요</small></div>';
      return `<div class="pc-slot lock"><b>🔒 ${unlockAt(n + 1)}</b><small>${unlockAt(n + 1)} 등급부터 열려요</small></div>`;
    }).join('');
    const chips = [];
    if (tw.mainUp) chips.push(`<span class="pc-chip main">메인 강화 ${tw.mainUp}/3 · 피해 +${tw.mainUp * 10}%</span>`);
    if (tw.lunch) chips.push(`<span class="pc-chip lunch">도시락 +${tw.lunch} · 먹이면 레벨 +${1 + tw.lunch}</span>`);
    tw.br.forEach((b2, q) => chips.push(`<span class="pc-chip br"><em class="g${q + 2}">${GN[q + 2]}</em> ${PR.BR[b2].n}</span>`));
    const awk = gg >= 5 ? `<div class="pc-awk">${[0, 1, 2].map(q => { const a = tw.awk[q], c = a && PR.AWK_BY[a.id]; return `<span class="${a ? 'on' : ''}"><em>${['Ⅰ', 'Ⅱ', 'Ⅲ'][q]}</em>${c ? c.n : 'Lv ' + PR.P.awk[q]}</span>`; }).join('')}</div>` : '';
    box.innerHTML = `<div class="pc-top"><div class="pc-pic g${gg}">${face(tw.type, gg)}</div>
        <div class="pc-name"><b>${nameOf(tw)}</b><span class="pc-tags"><em class="fam">${FAMN[tw.type]}</em><em class="g${gg}">${GN[gg]}</em></span><span class="pc-stars g${gg}">${'★'.repeat(gg)}<i>${'★'.repeat(5 - gg)}</i></span></div></div>
      <div class="pc-lv"><b>Lv ${tw.lv}</b><div class="pc-bar"><i style="width:${(k * 100).toFixed(0)}%"></i></div><span>${goal}</span></div>
      <div class="pc-stats"><div><span>힘</span><b>×${st.dps >= 100 ? Math.round(st.dps) : st.dps.toFixed(1)}</b></div><div><span>공격 속도</span><b>${st.aps.toFixed(2)}</b></div><div><span>반경</span><b>${st.rng.toFixed(1)}칸</b></div></div>
      <div class="pc-sec">흔적 칸 <b>${tw.tr.length} / ${PR.P.slots[gg]}</b></div><div class="pc-slots">${slots}</div>
      ${chips.length ? `<div class="pc-chips">${chips.join('')}</div>` : ''}${awk}`;
  };

  // ---------------------------------------------------------------- 알림
  const baseEv = U.onEvent;
  U.onEvent = function (e) {
    baseEv.call(this, e);
    const g = this.g; if (!g || !g.prepOn) return;
    const R = this.app.renderer, posOf = i => { const tw = g.tiles[i] && g.tiles[i].tower; return tw ? R.drawPos(g, i, tw) : null; };
    if (e.ev === 'feed') {
      const p = posOf(e.i); if (p) R.say('Lv ' + e.lv + '  (+' + e.gain + ')', e.lunch ? '#ffd23a' : '#ffffff', p[0], p[1] - 120, 1.0, 26);
      if (e.res === 'up' || e.res === 'empty' || e.res === 'swap') { const t = g.tiles[e.i].tower.tr.find(x => x.k === e.k); if (p && t) R.say(PR.TR[e.k].n + ' Lv' + t.lv, TRC[e.k], p[0], p[1] - 150, 1.1, 22); }
      if (e.res === 'main' && p) R.say('메인 강화 ' + g.tiles[e.i].tower.mainUp, '#ffe9a8', p[0], p[1] - 150, 1.1, 22);
      if (R.mergeFx) R.mergeFx(g, e.i, g.tiles[e.i].tower.tier);
      root.SFX.merge && root.SFX.merge(1);
    }
    if (e.ev === 'upReady') { const p = posOf(e.i); if (p) R.say(GN[e.g + 1] + ' 등급업 준비!', '#ffe14a', p[0], p[1] - 170, 1.4, 26); if (g.phase === 'prep') setTimeout(() => this.prepNext(), 400); }
    if (e.ev === 'awkReady') { const p = posOf(e.i); if (p) R.say('각성 준비!', '#ff9ad0', p[0], p[1] - 170, 1.4, 26); if (g.phase === 'prep') setTimeout(() => this.prepNext(), 400); }
    if (e.ev === 'gradeUp' && e.g <= 3) R.banner(GN[e.g] + ' 등급업!', e.g === 2 ? '#7fb8ff' : '#c08cff');
    if (e.ev === 'awaken') R.banner('각성 ' + ['Ⅰ', 'Ⅱ', 'Ⅲ'][e.s] + '!', '#ff9ad0');
    if (e.ev === 'battle') { this.toast(e.round + ' 웨이브', e.boss ? '보스 등장!' : '전투 시작!', '전투 중에도 소환 · 먹이기는 돼요', false, 1.6); this.hideInfo && this.hideInfo(); }
    if (e.ev === 'prep') { this.toast(e.round + ' 웨이브 끝!', '금화 +' + (e.pay + e.interest), `웨이브 보상 ${e.pay} · 이자 ${e.interest} · 준비 ${PR.P.prepTime}초`, false, 2.2); root.SFX.good && root.SFX.good(); setTimeout(() => this.prepNext(), 900); }
  };

  // ---------------------------------------------------------------- 규칙 카드(첫 판) · 튜토리얼 끄기
  const baseIntro = U.labIntro;
  U.labIntro = function (back) {
    if (!on()) return baseIntro.call(this, back);
    const R = [`웨이브 몬스터가 판에서 다 없어지면 <b>준비 시간 ${P.prepTime}초</b>. 소환하고 먹여서 조합을 맞추세요. 빨리 끝났으면 <b>[바로 시작]</b>.`, '웨이브가 끝나면 금화 보상 + 이자(가진 금화 25마다 +1). 전투 중에도 소환 · 먹이기는 돼요.',
      '아무 캐릭터나 <b>끌어서 다른 캐릭터에 놓으면 먹이기</b>: 레벨 +1, 먹힌 캐릭터의 <b>계열 흔적</b>을 받아요.', `레벨이 문턱(일반 ${P.thr[1]} · 희귀 ${P.thr[2]} · 영웅 ${P.thr[3]} · 전설 ${P.thr[4]})에 닿으면 <b>갈래 카드 2장</b> 중 골라 한 등급 올라요. 신화가 된 뒤에도 먹이면 <b>각성 카드</b>.`,
      '같은 흔적은 자동으로 레벨업(최대 Lv3). 흔적 칸이 가득 차면 <b>[바꾸기]</b> 또는 <b>[레벨로]</b>.'];
    const m = this.open(`<div class="mbox labrule"><div class="lr-tag">준비 · 전투 모드</div><h2>마블 디펜스 3</h2><ol class="howto">${R.map(s => `<li>${s}</li>`).join('')}</ol><div class="btns"><button class="btn green" data-act="go">${back ? '계속하기' : '시작!'}</button></div></div>`, 'labrule');
    m.onclick = e => { const b = e.target.closest('[data-act]'); if (!b) return; root.SFX.click && root.SFX.click(); this.close(); if (back) back(); else { this.app.paused = false; if (!this.app.hold) root.SFX.music('battle'); } };
  };

  // ---------------------------------------------------------------- 봇(?qa=bot)
  const baseBot = root.LABBOT;
  root.LABBOT = g => (g && g.prepOn ? PR.bot(g) : baseBot && baseBot(g));

  // ---------------------------------------------------------------- 머리 위 표시(fx3 drawAlly · lvBadge 위에)
  const RP = root.V3VIEW && root.V3VIEW.Renderer ? root.V3VIEW.Renderer.prototype : null;
  const patchR = R => {
    if (!R || R._prep) return; R._prep = 1;
    const baseDraw = R.drawAlly, baseBadge = R.lvBadge;
    R.drawAlly = function (c, game, t, hi) { this._ptw = game && game.prepOn ? t.tower : null; this._pg = game; try { return baseDraw.call(this, c, game, t, hi); } finally { this._ptw = null; } };
    R.lvBadge = function (c, x, y, g, age, seed) {
      const tw = this._ptw; if (!tw) return baseBadge.call(this, c, x, y, g, age, seed);
      const GT = { 1: '#ffffff', 2: '#8fd0ff', 3: '#d9a8ff', 4: '#ffc35a', 5: '#ff7a8a' }, OUT = '#181b3a';
      let lift = 0; if (age >= 0 && age < 0.4) lift = -Math.sin(age / 0.4 * Math.PI) * 10;
      const txt = 'Lv.' + tw.lv, ty = y + lift + 4;
      c.save(); c.font = '24px Disp, Jua, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
      c.strokeStyle = OUT; c.lineWidth = 7; c.strokeText(txt, x, ty + 2.5); c.strokeText(txt, x, ty); c.fillStyle = GT[g] || '#fff'; c.fillText(txt, x, ty);
      // 흔적 점(계열 색 · 레벨만큼 진하게) — 글씨 아래
      const n = tw.tr.length; if (n) { const w = 14, x0 = x - (n - 1) * w / 2; for (let k = 0; k < n; k++) { const t = tw.tr[k]; c.beginPath(); c.arc(x0 + k * w, ty + 12, 5.5, 0, Math.PI * 2); c.fillStyle = OUT; c.fill(); c.beginPath(); c.arc(x0 + k * w, ty + 12, 4, 0, Math.PI * 2); c.globalAlpha = 0.45 + 0.55 * t.lv / 3; c.fillStyle = TRC[t.k]; c.fill(); c.globalAlpha = 1; if (t.lv >= 3) { c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke(); } } }
      // '!' = 고를 카드 있음(통통 튐)
      if (tw.ready || tw.awkReady) { const b = Math.abs(Math.sin(this.time * 5)) * 6, cx = x + c.measureText(txt).width / 2 + 16, cy = ty - 14 - b; c.beginPath(); c.arc(cx, cy, 13, 0, Math.PI * 2); c.fillStyle = OUT; c.fill(); c.beginPath(); c.arc(cx, cy, 10.5, 0, Math.PI * 2); c.fillStyle = tw.awkReady ? '#ff9ad0' : '#ffe14a'; c.fill(); c.font = '18px Disp, Jua, sans-serif'; c.fillStyle = OUT; c.fillText('!', cx, cy + 6.5); }
      // 도시락(먹이면 레벨 +값)
      if (tw.lunch) { const cx = x - c.measureText(txt).width / 2 - 18, cy = ty - 10; c.fillStyle = OUT; this.rr(c, cx - 12, cy - 10, 24, 20, 5); c.fill(); c.fillStyle = '#ffb04a'; this.rr(c, cx - 9.5, cy - 7.5, 19, 15, 3); c.fill(); c.fillStyle = '#fff4d0'; c.fillRect(cx - 9.5, cy - 2, 19, 3); c.font = '13px Disp, Jua, sans-serif'; c.fillStyle = OUT; c.fillText('+' + tw.lunch, cx, cy + 14 + 6); }
      c.restore();
    };
  };
  const tryPatch = () => { const A = root.App; if (A && A.renderer) { patchR(A.renderer); return true; } return false; };
  if (RP) patchR(RP); else if (!tryPatch()) { const iv = setInterval(() => { if (tryPatch()) clearInterval(iv); }, 150); }
})(window);
