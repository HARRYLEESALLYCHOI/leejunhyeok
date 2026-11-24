// =====================================================================
//  심연 원정 — 게임 데이터 (이름 / 설명 / 수치 / 이미지)
//  이 파일만 고치면 게임 속 이름·설명·수치가 바뀝니다.
//  img: 'assets/파일명.png' 를 지정하면 기본 도트 그림 대신 그 이미지를 그립니다.
// =====================================================================
window.GAME_DATA = {
  title: '심연 원정',
  subtitle: 'IRON TRIBE · ABYSS EXPEDITION',
  camp: '붉은 모닥불 야영지',
  currency: '룬 조각',
  soulWord: '영혼 결정',

  hero: {
    name: '카르그',
    tribe: '철의 부족',
    img: null,               // 예: 'assets/hero.png' (정면 기준, 오른쪽을 보는 그림)
    imgScale: 1,
  },

  credits: [
    '심연 원정 — 오리지널 2D 던전 액션',
    '기획·프로그래밍·그래픽: Claude Code',
  ],

  themes: [
    { name: '흙먼지 굴',   floor: ['#3a2f25', '#352a21', '#40342a'], wall: '#5b4a3a', wallTop: '#75614c', wallDark: '#221a13', accent: '#e0a050', dark: 0.86 },
    { name: '이끼 낀 폐허', floor: ['#27302a', '#232c25', '#2c362e'], wall: '#46574a', wallTop: '#5d7262', wallDark: '#161e18', accent: '#8fd06a', dark: 0.88 },
    { name: '자줏빛 심연', floor: ['#241d31', '#201a2c', '#2a2237'], wall: '#3d3150', wallTop: '#55476c', wallDark: '#120d1a', accent: '#b080ff', dark: 0.9 },
    { name: '핏빛 균열',   floor: ['#331c1c', '#2d1818', '#3a2020'], wall: '#553030', wallTop: '#70403e', wallDark: '#1b0b0b', accent: '#ff6040', dark: 0.9 },
  ],

  // 일반 몬스터 — floors: 등장 층 범위, soul: 영혼 결정 드랍 확률
  monsters: {
    rat:    { name: '굴쥐',         hp: 22,  atk: 6,  spd: 125, r: 10, xp: 4,  rune: [1, 3],  ai: 'melee',  range: 20,  cd: 0.9, floors: [1, 5], soul: 0.05, blood: '#7a1010', img: null },
    skel:   { name: '녹슨 해골병',   hp: 46,  atk: 10, spd: 72,  r: 13, xp: 8,  rune: [2, 5],  ai: 'melee',  range: 26,  cd: 1.3, floors: [1, 7], soul: 0.05, blood: '#d8d0b8', img: null },
    shroom: { name: '포자 버섯',     hp: 36,  atk: 8,  spd: 32,  r: 13, xp: 7,  rune: [2, 4],  ai: 'ranged', proj: 'spore', range: 230, cd: 2.2, floors: [1, 6], soul: 0.05, blood: '#7fbf4a', img: null },
    wolf:   { name: '동굴 늑대',     hp: 52,  atk: 13, spd: 140, r: 13, xp: 12, rune: [3, 6],  ai: 'lunge',  range: 140, cd: 2.0, floors: [2, 9], soul: 0.04, blood: '#8a1515', img: null },
    newt:   { name: '불씨 도롱뇽',   hp: 58,  atk: 14, spd: 60,  r: 12, xp: 14, rune: [3, 7],  ai: 'ranged', proj: 'fire', range: 270, cd: 1.9, floors: [4, 99], soul: 0.04, blood: '#ff8a30', img: null },
    golem:  { name: '이끼 골렘',     hp: 190, atk: 24, spd: 46,  r: 20, xp: 32, rune: [8, 14], ai: 'slam',   range: 46,  cd: 2.4, floors: [4, 99], soul: 0.06, blood: '#6d8a5a', img: null },
    spider: { name: '서리 거미',     hp: 72,  atk: 15, spd: 115, r: 13, xp: 20, rune: [4, 8],  ai: 'ranged', proj: 'web', range: 210, cd: 2.4, floors: [5, 99], soul: 0.04, blood: '#9fd8ff', img: null },
    wraith: { name: '떠도는 망령',   hp: 84,  atk: 16, spd: 88,  r: 13, xp: 24, rune: [5, 9],  ai: 'blink',  proj: 'shade', range: 250, cd: 2.0, floors: [6, 99], soul: 0.04, blood: '#80ffe0', img: null },
  },

  // 보스 — 3층마다 등장
  bosses: {
    ratking: { name: '역병 쥐왕',       title: '썩은 굴의 주인',   hp: 950,  atk: 16, r: 30, xp: 160, rune: [80, 120],  img: null },
    warden:  { name: '석상 수호자',     title: '잊힌 폐허의 문지기', hp: 2000, atk: 24, r: 34, xp: 400, rune: [180, 240], img: null },
    eye:     { name: '심연의 눈',       title: '바닥 없는 곳의 시선', hp: 3200, atk: 28, r: 36, xp: 900, rune: [400, 520], img: null },
  },

  // 영혼 결정 — 흡수하면 패시브 + 액티브 스킬(1~4번 키)
  souls: {
    rat:     { name: '굴쥐의 영혼',       grade: 1, color: '#c8a77a', passive: '이동속도 +10%',            skill: '질주',     skillDesc: '5초간 이동속도 60% 증가',             cd: 12 },
    skel:    { name: '녹슨 해골의 영혼',   grade: 1, color: '#e8e0c8', passive: '방어력 +4',               skill: '뼈 갑옷',  skillDesc: '6초간 최대체력 30% 보호막',           cd: 15 },
    shroom:  { name: '포자 버섯의 영혼',   grade: 1, color: '#8fd05a', passive: '초당 체력 재생 +1',        skill: '포자 폭발', skillDesc: '주변에 3초간 독 구름',                cd: 10 },
    wolf:    { name: '동굴 늑대의 영혼',   grade: 2, color: '#b0b8c8', passive: '공격력 +4',               skill: '피의 돌진', skillDesc: '조준 방향으로 돌진하며 베기',          cd: 7 },
    newt:    { name: '불씨 도롱뇽의 영혼', grade: 2, color: '#ff9a40', passive: '치명타 확률 +5%',          skill: '화염구',   skillDesc: '폭발하는 불덩이 발사',                cd: 3.5 },
    golem:   { name: '이끼 골렘의 영혼',   grade: 2, color: '#7fa86a', passive: '최대체력 +30',             skill: '대지 강타', skillDesc: '주변을 내려쳐 피해 + 기절',           cd: 9 },
    spider:  { name: '서리 거미의 영혼',   grade: 2, color: '#a8e0ff', passive: '공격속도 +10%',            skill: '서리 고리', skillDesc: '주변 적에게 피해 + 둔화',             cd: 10 },
    wraith:  { name: '떠도는 망령의 영혼', grade: 3, color: '#80ffe0', passive: '흡혈 4%',                  skill: '흡혼',     skillDesc: '주변 적의 생명력을 빨아들임',         cd: 12 },
    ratking: { name: '역병 쥐왕의 영혼',   grade: 4, color: '#a0ff60', passive: '공격력 +10%, 재생 +2',      skill: '역병 폭풍', skillDesc: '6초간 따라다니는 역병 소용돌이',      cd: 18 },
    warden:  { name: '석상 수호자의 영혼', grade: 4, color: '#d0c090', passive: '방어력 +10, 최대체력 +40',  skill: '석화 피부', skillDesc: '3초간 무적 + 주변 충격파',            cd: 20 },
    eye:     { name: '심연의 눈의 영혼',   grade: 5, color: '#c080ff', passive: '치명타 +10%, 치명피해 +50%', skill: '심연 광선', skillDesc: '조준 방향으로 관통 광선',             cd: 8 },
  },

  gradeNames: ['', '하급', '중급', '상급', '영웅', '전설'],
  gradeColors: ['', '#c8c8c8', '#6ad06a', '#5aa8ff', '#c070ff', '#ffb030'],
};
