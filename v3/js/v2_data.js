// 마블 디펜스 2 — 본편 데이터 위에 덮는 문구(아웃게임 · 판 공용). 장 규칙 · 난이도 설명에서 블루마블 말(무인도 · 황금열쇠 · 땅 · 한도)을 걷어 냄
(function (root) {
  const M = root.META, D = root.DATA;
  if (M && M.CHAPTERS) {
    const RULE = { 1: '기본형', 2: '날쌘이가 많다', 3: '방울이가 많다(불 계열 반감)', 4: '철갑이가 많다(기계 계열 반감)', 5: '쌍둥이가 많다(잡으면 둘로)', 6: '엘리트 2배' };
    // 장 체력: 3장(화산)이 2장 바로 다음인데 너무 셈(봇 성장 중간 63% · 성장 없음 6%) → 1.27 → 1.15, 6장 1.5 → 1.45
    const HP = { 3: 1.15, 6: 1.45 };
    for (const C of M.CHAPTERS) { if (RULE[C.n]) C.rule = RULE[C.n]; C.desc = '밀어 합치기 판'; if (HP[C.n]) C.hp = HP[C.n]; }
  }
  if (D && D.DIFF) {
    D.DIFF.normal.desc = '처음 하는 판';
    D.DIFF.hard.desc = '몬스터 체력 ×1.5(보통 대비)';
    D.DIFF.hell.desc = '몬스터 체력 ×1.6 · 보스 교란 빠름';
  }
})(typeof window !== 'undefined' ? window : globalThis);
