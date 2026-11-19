// [v3] 4×4 직사각형 판 + 난이도별 구멍(holes) · 캐릭터 아군(2026-11-18)
// [v2] 마블 디펜스 2 = 밀어 합치기 판 고정(실험실 lab/js/lab_cfg.js에서 복사 · 2026-11-16). 아래 실험실 설명은 원본 그대로
// 마블 디펜스 실험실 — 맵 고르기 · 맵별 수치. 브라우저(전역 LAB)와 Node(require) 둘 다.
// 실험실 = 본편을 건드리지 않고 '핵심 손동작'만 바꿔 비교하는 판 3개(2026-11-16 사용자 요청).
//   공통: 6시(굴)에서 몬스터가 양쪽으로 갈라져 12시 수정으로 간다 · 수정 체력이 0이 되면 패배 · 작전 카드(로그라이크) 없음
//         보스 1마리 = 왼쪽 길, 2마리 = 양쪽 길(15 · 20라운드)
//   marble = 지금 판(주사위 · 착지)  /  dial = 포탑 고리를 돌린다  /  slide = 2048처럼 판을 밀어 합친다
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const map = 'slide';

  // 수치(봇으로 맞춤 — lab/tools/labbot.js). 조정용: LABX='{"crystal":30}'
  const CFG = {
    marble: { name: '마블 + 수정', crystal: 20, countMul: 1.2, spd: 0.85, bossSpd: 0.8, bossDmg: 8, twoBossFrom: 15, twoBossHp: 0.62, sides: 'even', hpMul: 0.52, roundGold: 0, commander: 'gambler' },
    dial:   { name: '다이얼 성', crystal: 20, countMul: 1.2, spd: 0.85, bossSpd: 0.8, bossDmg: 8, twoBossFrom: 15, twoBossHp: 0.62, sides: 'waves', hpMul: 0.65, roundGold: 1, commander: 'cheer' },
    slide:  { name: '밀어 합치기', oneWay: true, holes: { normal: [], hard: [5, 14], hell: [2, 9, 15] }, crystal: 20, countMul: 1.2, spd: 0.85, bossSpd: 0.8, bossDmg: 8, twoBossFrom: 15, twoBossHp: 0.62, sides: 'waves', hpMul: 2.7, hpLate: 0.13, roundGold: 1, commander: 'cheer' },   // [v3.1] 5등급(힘 1 · 3 · 9 · 30 · 90) → 체력 ×1.2 + 라운드마다 +13%(후반 가파르게) · [v3] 0.66
  };
  const x = isNode ? process.env.LABX : null;
  if (x) Object.assign(CFG[map], JSON.parse(x));

  const LAB = {
    map, CFG, C: CFG[map],
    choice() { return { commander: CFG[map].commander, pawn: 'car', mode: 'conquest', diff: 'normal', chapter: 1, deck: null }; },
    TITLE: { marble: '① 마블 + 수정', dial: '② 다이얼 성', slide: '마블 디펜스 3' },
    V2: true, V3: true,
  };
  if (isNode) module.exports = LAB; else root.LAB = LAB;
})(typeof window !== 'undefined' ? window : globalThis);
