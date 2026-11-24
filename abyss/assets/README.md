# 이미지 교체 방법

`data.js`에서 `img` 값에 이 폴더의 이미지 경로를 넣으면 기본 도트 그림 대신 그 이미지를 그립니다.

- 투명 배경 PNG 권장, **오른쪽을 보는** 그림 기준 (왼쪽을 볼 땐 자동 반전)
- 예: `hero: { ..., img: 'assets/hero.png', imgScale: 1 }`
- 몬스터: `monsters.rat.img = 'assets/rat.png'` 처럼 지정
