// 마블 디펜스 3 — 아군 = 캐릭터 5계열 × 6단계(2026-11-18). 규칙(공격 방식)은 본편 포탑 다섯 종류를 그대로 쓰고 이름 · 그림만 캐릭터로.
//   검사 = 화염(fire) · 궁수 = 개틀링(gatling, 연사) · 마법사 = 번개(bolt, 연쇄) · 서리 = 빙결(ice) · 사제 = 성광(light, 이웃 공속 버프)
(function (root) {
  const D = root.DATA; if (!D) return; const M0 = root.META;
  const CHAR = {
    fire:    { name: '불꽃 검사', art: 'sword',  role: '근거리 화력 · 화상', tiers: ['', '나무칼 꼬마', '냄비 검사', '불꽃 검사', '화염 기사', '염화 검성', '용염 기사'] },
    gatling: { name: '숲 궁수',   art: 'archer', role: '빠른 연사',         tiers: ['', '새총 꼬마', '꼬마 사냥꾼', '숲 궁수', '쌍석궁 사수', '바람 궁사', '폭풍 사수'] },
    bolt:    { name: '번개 마법사', art: 'mage', role: '연쇄 번개',         tiers: ['', '견습 마법사', '찌릿 마법사', '번개 마법사', '뇌전 술사', '폭풍 대마법사', '천둥 현자'] },
    ice:     { name: '서리 꼬마', art: 'frost',  role: '얼려서 묶기',       tiers: ['', '털모자 꼬마', '눈덩이 투수', '고드름 창병', '서리 기사', '빙하 수호자', '겨울 군주'] },
    corrode: { name: '꼬마 악마', art: 'demon', role: '저주 · 맞은 몬스터가 피해를 더 받음', tiers: ['', '꼬마 임프', '삼지창 악마', '늪 악마', '늪 악마', '가고일', '지옥 군주'] },
    combo:   { name: '마법사', art: 'mage', role: '먼 거리 · 2연타', tiers: ['', '두건 견습생', '빗자루 마녀', '뼈 주술사', '뼈 주술사', '대마법사', '별의 현자'] },
    light:   { name: '빛의 사제', art: 'priest', role: '옆 아군 공속 업',    tiers: ['', '종지기 꼬마', '꼬마 성가대', '빛의 사제', '견습 천사', '대사제', '대천사'] },
  };
  for (const k in CHAR) { D.TOWERS[k].name = CHAR[k].name; D.TOWERS[k].role = CHAR[k].role; }
  D.CHAR = CHAR;
  // [v3.3] 지휘관 = 스킬 심볼 6종(캐릭터성 없음). 희귀 2 · 영웅 2 · 전설 2. 도박사 · 건축가는 뺌(건축가 = 영웅까지만 올려 5등급 규칙에서 약함)
  if (D.COMMANDERS) {
    const C = D.COMMANDERS; delete C.gambler; delete C.architect;
    Object.assign(C.cheer, { name: '함성', grade: 'rare', cd: 60, act: '10초 동안 모든 아군 공격 속도 +30%', pas: '' });
    Object.assign(C.mechanic, { name: '개조', grade: 'rare', cd: 45, act: '누른 아군을 판에 가장 많은 계열로 바꿈(전설 재료 맞추기)', pas: '' });
    Object.assign(C.teleporter, { name: '순간이동', grade: 'epic', cd: 40, act: '누른 아군과 고른 칸의 자리를 바꿈', pas: '' });
    Object.assign(C.demolish, { name: '폭파', grade: 'epic', cd: 50, act: '누른 아군을 터뜨림 → 금화 + 둘레 몬스터에게 큰 피해', pas: '' });
    C.freeze = { name: '시간 정지', grade: 'legend', mode: 'tap', cd: 75, act: '모든 몬스터 4초 정지(보스는 2초)', pas: '' };
    C.meteor = { name: '유성 폭격', grade: 'legend', mode: 'tap', cd: 80, act: '길 위 모든 몬스터에게 큰 피해(보스는 체력의 12%)', pas: '' };
    D.CMD_ORDER = ['cheer', 'mechanic', 'teleporter', 'demolish', 'freeze', 'meteor'];
    D.CMD_GRADE = { rare: '희귀', epic: '영웅', legend: '전설' };
  }
  // [v3.5] 유물(운빨존많겜 '유물'처럼 판 밖에서 금화로 올리는 영구 효과 · 최대 Lv10). 값 = Lv당
  D.RELICS = [
    { id: 'purse', name: '금화 주머니', v: 15, unit: '', desc: '시작 금화 +{v}' },
    { id: 'heart', name: '수정 심장', v: 1, unit: '', desc: '수정 체력 +{v}' },
    { id: 'blade', name: '보스 사냥검', v: 4, unit: '%', desc: '보스에게 주는 피해 +{v}%' },
    { id: 'clover', name: '행운의 클로버', v: 2, unit: '%', desc: '행운 뽑기 성공률 +{v}%' },
    { id: 'scroll', name: '의뢰 두루마리', v: 10, unit: '%', desc: '판 미션 금화 보상 +{v}%' },
    { id: 'glass', name: '날개 모래시계', v: 2, unit: '%', desc: '지휘관 다시 쓰기 시간 −{v}%' },
  ];
  D.RELIC_MAX = 10;
  D.relicCost = lv => 300 + lv * 350;   // Lv → Lv+1 금화
  D.DECK = ['fire', 'gatling', 'bolt', 'ice', 'light'];   // 기본 덱(5종)
  D.V3_ALL = D.DECK.concat(['corrode', 'combo']);   // [v3.9] 악마 · 마법사 계열 추가(그려 둔 7계열 35종 모두). 한 판에는 5종(덱) — 7종을 다 넣으면 같은 종류가 안 모여 합치기가 막힘(봇 79% → 33%)
  if (M0 && M0.UNLOCK) { delete M0.UNLOCK.corrode; delete M0.UNLOCK.combo; }
  if (M0 && M0.BASE) for (const k of D.V3_ALL) if (!M0.BASE.includes(k)) M0.BASE.push(k);
  D.deckOk = d => Array.isArray(d) && d.length === 5 && new Set(d).size === 5 && d.every(k => D.V3_ALL.includes(k));
  D.V3_DECK = D.DECK.slice();
  D.ALL = D.V3_ALL.slice();   // 도감 · 덱 목록 = 캐릭터 7계열
  // 성장 탭: 계열(원소 · 기계 · 비전 · 성역)마다 이 게임의 캐릭터만 · 캐릭터가 없는 계열(심연 · 조커)과 잠긴 옛 포탑 열기는 숨김
  const M = root.META;
  if (M && M.FAMS && !M._v3) {
    M._v3 = 1;
    for (const f of M.FAMS) f.towers = (f.towers || []).filter(k => D.ALL.includes(k));
    for (let i = M.FAMS.length - 1; i >= 0; i--) if (!M.FAMS[i].towers.length) M.FAMS.splice(i, 1);
    for (const k of Object.keys(M.UNLOCK || {})) if (!D.ALL.includes(k)) delete M.UNLOCK[k];
  }
  D.PRESETS = [{ name: '수호대', deck: D.DECK.slice() }, { name: '수호대', deck: D.DECK.slice() }];
  D.TIER.name = ['', '견습', '숙련', '정예', '영웅', '전설', '신화'];
  D.TIER.ring = ['', '#c9c4bd', '#7fe07a', '#5fb2ff', '#c08cff', '#ffa53a', '#ffd23a'];
  // [v3 밸런스] 구멍(어려움 2칸 · 지옥 4칸)만큼 판이 좁아 v2보다 크게 어려워짐(봇 성장 중간: 어려움 25% · 지옥 성장 높음 25%) → 체력 배율을 낮춰 v2 수준으로
  if (D.DIFF && !D.DIFF._v3) { D.DIFF._v3 = 1; D.DIFF.hard.hp *= 0.8; D.DIFF.hell.hp *= 0.8; }
  // [v3.4] 전체 체력을 올린 뒤(hpMul 1.8) 뒤쪽 장이 너무 어려움(6장 성장 높음 8%) → 장 체력 배율의 '1을 넘는 몫'을 40%로
  if (root.META && root.META.CHAPTERS && !root.META._v34) { root.META._v34 = 1; for (const C of root.META.CHAPTERS) C.hp = 1 + (C.hp - 1) * 0.4; }
  if (D.DIFF) { D.DIFF.normal.desc = '4×4 판 그대로'; D.DIFF.hard.desc = '몬스터 체력 ×1.5 · 판 구멍 2칸'; D.DIFF.hell.desc = '몬스터 체력 ×1.6 · 판 구멍 3칸'; }
  if (D.BOSSES) {   // [v3.6] 보스 설명을 이 판 규칙으로(전: 본편의 '포탑 · 칸에 멈춰 구조 · 프리즘탑')
    D.BOSSES.destroyer.desc = '아군 2명에게 망치 예고 — 15초 뒤 한 등급 내려간다';
    D.BOSSES.ghost.desc = '아군 3명을 잠시 멈춘다';
    D.BOSSES.witch.desc = '아군 1명의 계열을 무작위로 바꾼다';
    D.BOSSES.magician.desc = '가장 낮은 아군 1명을 한 등급 올려 주는 선물';
    D.BOSSES.quake.desc = '아군 2명의 자리를 뒤섞는다';
    D.BOSSES.swindler.desc = '아군 1명을 붙잡아 못 움직이게 한다 — 보스를 잡으면 풀린다';
    D.BOSSES.piggy.desc = '수정에 닿으면 가진 금화의 50% 보너스(수정은 안 깨짐)';
    D.BOSSES.goblin.desc = '수정에 닿기 전에 잡으면 금화 보너스';
  }
  if (D.MONSTERS) { D.MONSTERS.normal.name = '돌블록'; D.MONSTERS.fast.name = '날개돌'; D.MONSTERS.giant.name = '큰바위'; if (D.MONSTERS.truck) D.MONSTERS.truck.name = '보물 수레'; }   // [v3.10] 수송차 → 보물 수레(컨셉에 맞게)
})(typeof window !== 'undefined' ? window : globalThis);
