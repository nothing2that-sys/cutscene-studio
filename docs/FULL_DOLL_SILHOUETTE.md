후속 수정: [골반 회전과 오른발 앞·왼발 뒤 배치](FULL_DOLL_PELVIS_POSE.md). 아래의 수치와 점 일치는 직전 포즈의 기록입니다.

# 전신 실루엣과 연속 선화 보완

2026-11-03. [실행 화면](http://127.0.0.1:3001/doll-full.html)

[선화: 원본 / 이전 / 현재](review-evidence/2026-11-03-silhouette/line-comparison.png) · [3D 비례 비교](review-evidence/2026-11-03-silhouette/shape-comparison.png) · [네 방향 선화](review-evidence/2026-11-03-silhouette/line-four-views.png)

## 바뀐 구조와 외형

이전에는 허리 외피 세 조각이 벌어졌고, 외피 접촉을 피하는 자동 보정이 원본 자세의 어깨와 왼다리를 밀어냈다. 특히 왼 무릎 투영 X가 약 355, 발목이 약 338로 바뀌어 원본의 392, 406과 크게 달랐다.

전신 전용 몸통 외피를 한 개의 닫힌 표면으로 합쳤다. 골반·복부·흉곽의 기존 세 관절과 뼈 길이는 유지하고, 허리 부근 정점에 높이에 따른 혼합 가중치를 적용한다. 상체가 반대로 기울어질 때는 허리 부위에 제한된 횡방향 보정도 적용한다. 이 보정은 중립에서 0이며, 어깨와 고관절 소켓까지 움직이지 않는다. 실제 3D 메시가 함께 굽기 때문에 카메라를 돌려도 연결이 유지된다. 원본 이미지를 선화 위에 덧그리는 방식은 아니다.

- 원본 비교 자세에서 보호 ON/OFF의 어깨·팔꿈치·손목·무릎·발목 투영이 같아졌다. 현재 왼 무릎은 (392,820), 발목은 (406,1085)다. 이 점들은 설계 목표이므로 점 일치만으로 외형 합격을 판단하지 않는다.
- 허리의 단차와 빈틈을 없애고 골반으로 넓어지는 곡선을 연결했다. 허리의 굽은 분할선은 외피 표면에 붙는 보조선이다. 허리 외피가 물리적으로 분리된 구체관절 조각이라는 뜻은 아니다.
- 위팔 최대 반폭은 33→32, 전완은 25→26으로 조정했다. 허벅지는 59→64, 종아리는 37→41로 늘리고 부풀어 오르는 위치와 발목까지의 테이퍼를 조정했다. 고관절 안쪽은 초반에 좁히고 위쪽은 둥글게 닫아 골반과의 외피 간섭을 줄였다.
- 어깨 연결구와 소켓 크기를 함께 조정했다. 팔꿈치·무릎 아래의 첫 단면을 관절 안쪽으로 연장해 갑자기 굵어지는 턱을 줄였다.
- 복부·흉곽의 직접 편집은 굽힘/옆굽힘 ±35도, 비틀기 ±45도로 제한한다. 극단적인 단일 외피 접힘을 인증하는 물리 시뮬레이션은 아니다.

[독립적인 근사 실루엣 비교](review-evidence/2026-11-03-silhouette/silhouette-metrics.json)는 같은 960×1280 프레임에서 원본의 닫힌 외곽과 실제 회색 렌더의 점유 영역을 비교했다.

| 영역 | 이전 IoU | 현재 IoU |
| --- | ---: | ---: |
| 몸통·팔·다리 영역 | .688 | .849 |
| 허리·골반 영역 | .800 | .902 |
| 다리 영역 | .653 | .836 |

이 수치는 재현 정확도 퍼센트가 아니다. 원본의 선을 임계값으로 읽고 3×3 닫힘, 바깥 영역 채우기 및 두 팔 안쪽 빈 공간의 수동 씨앗점을 사용한 근사치다. 측정 영역과 임계값은 JSON에 남겼고 [원본 점유 마스크](review-evidence/2026-11-03-silhouette/source-mask.png)도 확인했다. 손발 대부분과 머리는 비교 영역에서 제외한다. 가슴 외곽, 골반 좌우 윤곽과 깊이, 손발 방향에는 아직 차이가 남는다.

## 2.5D 선화

전신 고정 보기에서는 부위 ID와 깊이로 실제 보이는 면을 구분해 윤곽을 추출한다. 윤곽을 단순화한 뒤 곡선으로 이어 작은 면 경계와 계단 형태의 잡선을 줄였다. 구조선은 가늘고 옅게, 관절선은 더 진하게 표시하며 윤곽 바로 옆의 관절 중복선은 생략한다. 관절·몸통 보조선은 실제 표면의 가림을 따른다. 손발은 단순한 외곽과 동작을 읽는 수준으로 둔다.

가림 검사에는 접촉 검사에서 만든 BVH를 재사용한다. [비교 검사](review-evidence/2026-11-03-silhouette/visibility-checks.json)에서 기존 삼각형 전수 레이 검사와 정면·측면·후면·사선의 선화 픽셀 차이가 0이었다. 같은 로컬 Chrome 세션의 방향별 3회 측정에서는 빠른 재투영이 약 30–60ms, 전수 레이 방식은 약 541–1044ms였다. 이 값은 해당 실행의 관측치이며 기기 전체 FPS를 보장하지 않는다.

선화의 팬·줌·XYZ 이동은 기존처럼 이미지와 CSS 변환을 재사용한다. 포즈와 앵글을 바꿀 때만 윤곽과 가림을 다시 계산한다. 기존 몸통 실험 화면은 기존 선화 방식을 유지한다.

## 손발은 인물 설명으로 전달

손발톱 추가 메시를 제거하고 손발은 포즈용 형태로 유지했다. 손가락 세밀 조형을 더 늘리지 않는다. 전신 화면에 `인물 설명 · 손발 세부 묘사` 입력란과 `작화 설명 TXT` 내보내기를 추가했다. 12000자 이하의 설명을 전신 포즈 JSON의 선택 항목 `description`에 저장하며, 저장·불러오기와 Undo/Redo에 포함한다. 이 필드가 없는 기존 전신 파일도 열 수 있다.

메인 편집기의 인물 외형 설명에도 손발 세부를 적도록 안내했다. 실제 전달 묶음과 작화 지시문은 최신 인물 설명에 따라 손발 형태·손톱·장갑·신발을 완성하되, 캡처의 손목·발목 방향, 잡기·접촉 관계와 발의 접지를 유지하도록 전달한다. 전신 시제품 포즈를 메인 편집기의 리그로 자동 교체하는 기능을 추가한 것은 아니다. 설명을 바꾸면 형상이 자동 생성되지는 않는다.

[설명 전달 검사](review-evidence/2026-11-03-silhouette/description/checks.json)에서 전신 JSON/TXT·Undo/Redo·불러오기, 메인 편집기의 저장 파일·전달 묶음·작화 지시문까지 설명이 유지됨을 확인했다. 검증 파일의 장갑/신발 설명은 테스트용 문구이며 사용자 캐릭터의 기본값으로 넣지 않았다.

## 검사와 부하

- [전신 흐름](review-evidence/2026-11-03-silhouette/flow/checks.json): 포즈 저장 왕복, Undo/Redo, 잘못된 굽힘축 입력의 원자적 거부, 모든 연결 길이 유지, 유한 좌표, 브라우저 오류 0. 고정 보기 팬·줌·XYZ 추가 WebGL 렌더 0회.
- [외피 접촉](review-evidence/2026-11-03-silhouette/contacts/after-contacts.json): 기본 5종과 좌우 큰 굽힘 10종에서 허용 결합부 외의 1.2px보다 깊은 정점 침투 0개. 고관절 허용 영역의 반경은 이전과 같은 58이며 새 몸통 메시로 대상을 연결했다. 이 검사는 한 몸통 내부의 삼각형끼리 접히는 자기 교차나 모든 연속 이동, 외부 물체의 접촉을 인증하지 않는다.
- [몸통 토폴로지](review-evidence/2026-11-03-silhouette/description/checks.json): 5002정점/10000면, 경계·비다양체 변 0, Euler 값 2, 유한 법선. 실제 닫힌 외피의 연결을 확인했다.
- [기존 몸통 고정 보기](review-evidence/2026-11-03-silhouette/core-regression/checks.json): 캐시 재사용, 카메라 잠금, 3D 복귀 정렬과 브라우저 오류 없음.
- [부하](review-evidence/2026-11-03-silhouette/performance.json): **28,720 삼각형 / 15 draw calls**. 직전 30,512면/17회보다 약 5.9% 적은 면과 2회 적은 그리기다. 전신 미리보기 바이너리는 180,048바이트이며 초기 조형 Worker 실행 없이 읽었다. 단순 팔 회전에 손과 몸통의 로컬 메시를 재계산하지 않고, 허리 관절을 바꾸면 몸통이 갱신되는 것도 확인했다.

## 재현

```powershell
.review-tools/node/node.exe scripts/build-doll-full-preview.mjs
.review-tools/node/node.exe .review-tools/node/node_modules/npm/bin/npm-cli.js --prefix app run build
.review-tools/node/node.exe scripts/doll-silhouette-review.mjs
.review-tools/node/node.exe scripts/doll-silhouette-measure.mjs
.review-tools/node/node.exe scripts/doll-full-review.mjs docs/review-evidence/2026-11-03-silhouette/flow
.review-tools/node/node.exe scripts/doll-full-refine-review.mjs docs/review-evidence/2026-11-03-silhouette/contacts
.review-tools/node/node.exe scripts/doll-description-check.mjs
.review-tools/node/node.exe scripts/doll-visibility-check.mjs
.review-tools/node/node.exe scripts/doll-full-performance.mjs docs/review-evidence/2026-11-03-silhouette/performance.json
powershell -ExecutionPolicy Bypass -File scripts/doll-silhouette-sheets.ps1
```

주요 코드: `doll-torso-skin.js`, `doll-line-contours.js`, `doll-full-design.js`, `doll-full-rig.js`, `doll-contact.js`, `doll-fixed-view.js`. 초기 몸통 실험과 이전 전신 기록은 별도로 보존했다.
