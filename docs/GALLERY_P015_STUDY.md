# AI Pose Gallery P015 한 장 재현 시안

2026-11-03. [비교 화면 열기](http://127.0.0.1:3001/doll-full.html?study=gallery-p015)

선택한 자료는 [AI Pose Gallery](https://ai-pose-gallery.pages.dev/)의 **표준 전신 `full_single_P015_front`**다. 제목은 `立ち・コントラポスト腰に手`이며 한 손을 허리에 두고 서 있는 콘트라포스토 자세다. 같은 P015라도 다른 분류의 항목과 혼동하지 않는다. [공식 원본 PNG](https://ai-pose-gallery.pages.dev/img/full_single_P015_front.png)는 900×1200, 225,412바이트, SHA-256 `51f54ceb4d8115f6e29a36a9583a88f896314304101ca035091a1d30394e80aa`다.

사이트는 PNG 참조 자료를 제공한다. 이번에는 그중 원본 한 장만 받아, 수동으로 읽은 관절 위치와 비례를 전신 관절 모델에 적용했다. 다른 각도의 원본은 받지 않았다. 아래 측면·사선·후면은 같은 모델을 돌려 본 결과이며 원본의 숨은 깊이를 확인한 정답은 아니다.

![직접 만든 모델의 3D·선화·사선](review-evidence/2026-11-03-gallery-p015/p015-model-comparison.png)

[같은 모델의 네 방향 선화](review-evidence/2026-11-03-gallery-p015/p015-four-views.png)

## 화면과 데이터

전신 화면 상단의 **사이트 P015 비교** 링크로 들어간다. 왼쪽에 로컬 원본, 오른쪽에 모델이 같은 3:4 프레임으로 표시된다. 3D에서 회전·관절 편집을 하고, `2.5D · 앵글 고정`으로 선화를 볼 수 있다. 정면의 P015 전신일 때만 `원본 겹침`을 사용할 수 있다. 소스 이미지가 준비되지 않았거나 다른 자세·방향·확대/이동 상태에서는 겹침을 비활성화한다.

새 시안은 `gallery-p015` 체형이다. 기존 `default` 체형은 바꾸지 않았다.

| 항목 | 기존 | P015 시안 |
| --- | ---: | ---: |
| 어깨 중심의 중립 간격 | 200 | 220 |
| 위팔 길이 | 167 | 184 |
| 전완 길이 | 131 | 136 |
| 목 뿌리에서 머리 관절까지 | 28 | 65 |
| 어깨 연결구 반경 | 36.5 | 40.5 |

모든 값은 설계 좌표 단위다. cm 또는 실측 인체 치수가 아니다. 머리는 약 2.5% 길게 조정했고, 턱과 목의 접합부도 별도 체형에 맞춰 좁혔다. 몸통·골반은 기존 연속 외피와 세 관절을 유지한다. 골반 약 32도, 복부 약 25도, 흉곽 약 18도에 옆 기울기를 조합했다. 어깨 평균 위치로 프레임을 맞춘 뒤 팔과 손목을 구성하고, 다리는 고정 길이 두 뼈 IK와 몸 앞 방향의 무릎 폴로 배치했다.

초기에는 먼 쪽 오른팔이 흉곽에 들어가 자동 보정으로 바깥으로 밀렸다. 현재는 먼 쪽 팔의 팔꿈치 깊이를 뒤로 선택해 원본의 화면 위치를 유지하면서 외피 접촉을 줄였다. [원본 자세 진단](review-evidence/2026-11-03-gallery-p015/diagnostic.json)의 보호 OFF/ON에서 주요 관절 위치가 같고, 자동 보정은 없다. 관절점은 수동 구성 목표이므로 그 점의 일치만으로 외형 합격을 판단하지 않는다.

포즈 JSON에는 `rigProfile`을 저장한다. 서로 다른 두 체형의 파일을 잘못 열면 상태를 바꾸기 전에 거부한다. 설명과 관절을 저장·복원하며, 손발의 세부 묘사는 인물 설명으로 전달하는 기존 원칙을 유지한다. 메인 편집기의 기본 인체를 교체하지 않았다.

## 원본 한 장의 로컬 사용

갤러리의 안내는 한 장씩 참고하는 사용을 허용하고 원본/가공 이미지의 재배포와 일괄 다운로드를 금지한다. 원본 PNG는 Git 무시 대상인 `.review-tools/gallery-one/`에만 저장했다. 새 원본을 `app/public`이나 앱 번들, 문서 이미지에 넣지 않았다. 이 문서와 공개 증거 PNG는 모두 실제 모델 렌더다. 원본을 포함한 작업 화면 캡처는 같은 비공개 로컬 폴더에만 둔다.

로컬 참고 서버는 **127.0.0.1:3015의 P015 PNG 한 경로만** 읽는다. 디렉터리 목록이나 다른 파일은 제공하지 않는다. 이미지는 앱과 별도로 유지되며, 서버가 없으면 화면의 파일 선택으로 같은 PNG를 열 수 있다. 파일 선택 시 해시로 P015 정면 원본인지 확인한다. 공개 배포 환경에서는 자동 로컬 이미지를 요청하지 않고 파일 선택을 안내한다. 원본 이미지는 포즈 JSON·OBJ·현재 보기 PNG에 포함되지 않는다.

```powershell
# 한 장만 받으며, 이미 있으면 해시를 확인하고 재다운로드하지 않는다.
.review-tools/node/node.exe scripts/fetch-gallery-p015.mjs
# 로컬 원본 표시용; Ctrl+C로 종료. 편집기 서버와 별개다.
.review-tools/node/node.exe scripts/serve-gallery-reference.mjs
```

## 확인 결과와 남은 차이

[기능 검사](review-evidence/2026-11-03-gallery-p015/checks.json):

- 원본 자동 표시 900×1200, P015 체형·자세 선택, 브라우저 오류 없음.
- 저장 왕복·Undo/Redo, 다른 체형 파일의 원자적 거부, 설명 보존.
- 중립·팔 올림·걸음·쪼그림·P015에서 뼈 길이 유지, 최대 드리프트 약 4.4×10⁻¹⁶ 보기 단위.
- P015 자세의 실제 표시 정점을 전부 검사해, 허용 접합부를 제외한 1.2px보다 깊은 외피 침투 0개. 연속 시간 충돌·몸통 자기 교차·바닥 접지 인증은 아니다.
- 원본 겹침 ON/OFF의 내보낸 모델 PNG 해시가 같아 원본이 포함되지 않음을 확인.
- 고정 선화 팬·줌·XYZ의 추가 WebGL 렌더 0회.
- 28,720삼각형/15회 그리기, 유한 좌표. 새 체형용 몸통 미리보기를 별도로 만들어 초기 조형을 재사용한다.

[기존 전신 회귀](review-evidence/2026-11-03-gallery-p015/default-regression/checks.json)와 [기존 몸통 고정 보기](review-evidence/2026-11-03-gallery-p015/core-regression/checks.json)도 확인했다.

원본과 가슴·골반의 외곽, 무릎의 위치, 손발의 방향과 선의 표현에는 차이가 남는다. 후면과 실제 앞뒤 깊이, 접지·체중 분배도 한 장만으로는 확정하지 않았다. 이 시안은 그 차이를 같은 화면에서 검토할 수 있게 만든 것이다. 원본과 동일하거나 모든 포즈에서 해부학적으로 정확하다고 판정하지 않는다.

```powershell
.review-tools/node/node.exe scripts/build-doll-full-preview.mjs gallery-p015
.review-tools/node/node.exe .review-tools/node/node_modules/npm/bin/npm-cli.js --prefix app run build
.review-tools/node/node.exe scripts/gallery-p015-review.mjs
.review-tools/node/node.exe scripts/gallery-p015-check.mjs
powershell -ExecutionPolicy Bypass -File scripts/gallery-p015-sheets.ps1
```

주요 파일: `doll-profiles.js`, `doll-reference.js`, `doll-full-design.js`, `doll-full-rig.js`, `doll-full.js`. 원본 출처·해시·수동 관절점은 `doll-profiles.js`에 있고 이미지 바이트는 없다.
