# 작화 인체 v1 — 다음 구현 세션용 핸드오프

작성: 2026-11-04, Asia/Seoul. **구현 재개용 문서다. 독립 검증자에게 이 문서나 이전 발견을 입력으로 주지 않는다.**

## 바로 이어받을 기준

- 저장소: `D:\github\cutscene-studio`
- 제품 기준 커밋: `9788a567d05d2342d04ea6ae352d90b5ab6e8836` — `feat: integrate articulated body and fixed-angle line view (WIP)`
- 브랜치: `main`. 원격 push 안 함. 이 문서가 이후 별도 문서 커밋에 들어가도 위 제품 기준은 그대로다.
- 목표: 참고처럼 자연스러운 전신 관절 인체를 메인 편집기에서 포징하고, 앵글 고정 후 2.5D 선화로 사용한다. 고정 화면 팬·줌은 캐시를 사용하고 XYZ·포즈·가림 변경 때 새 투영한다. 손발 세부는 인물 설명으로 전달한다.
- 현재: 실제 인체와 메인 통합은 구현됐으나 **v1 종결 미완료**. 자세한 구현/확인/잔여 구분은 `docs/ARTICULATED_BODY_V1_STATUS.md`, 사용법은 `docs/ARTICULATED_BODY_V1.md`.
- 중단: 조정·관측 보완 에이전트가 `Selected model is at capacity` 오류로 종료됐고 자동 복구되지 않았다. 이후 사용자가 현황 정리와 커밋을 요청해 위 제품 커밋을 만들었다. 현재 이어서 도는 제품 작성자나 검증 작업은 없다.

## 먼저 읽을 자료

1. `docs/ARTICULATED_BODY_V1_STATUS.md`
2. `docs/Slice_Plan_Articulated_Body_v1.md` — 승인 본문과 Current State를 구분한다.
3. `D:\github\hglos\plugin\hglos\ENTRY.md`, `RULES.md`, `HOST.md` 및 해당 implement/verify 스킬.
4. 필요 시 `validation/body-v1-postVB-20261104/disposition.json`, `source-delta.json` — 구현자 보완 내역이며 독립 종결 판정이 아니다.

HGLOS 승인 본문 SHA256(Current State 제외): `80e657518dcadd478ba0ea5ba9fcd721a7b4516e1af46136a7278263b522108f`.
승인 시점 H: `fed299c9b06bf10d2c607402122faf00b773bae5`, 다음 계획 기록 커밋: `bb9c08ab0569c4843b37194ea2eef2189ec659fa`.
사용자는 범위와 전체 계획·묶음 착수, 메인 편집기 통합까지 승인했다. 반복적인 부분 승인이나 검증 준비만 하다 끝내는 방식을 원하지 않는다. 이후 제품 로컬 커밋도 명시 승인했다. push/배포 승인은 없다.

## 다음 구현자가 할 일

새 외형 실험이나 검증 프레임워크 재작성부터 시작하지 않는다. 검토 지적을 실제 UI에서 재현하고 기존 기능의 일관성을 먼저 닫는다. 아래는 **검토 지적이며 모두 실제 재현을 마친 확정 결함 목록은 아니다.**

1. 고정 **작업 화면** 팬·줌 → 구도 저장/컷 갱신 → 컬러·깊이·기존 Generate Image가 같은 구도를 사용하는지 확인한다. shot export 경로의 구현자 통과만으로 전체 내보내기를 통과시키지 않는다. 관련: `studio.js`, `body-v1-fixed.js`, `exportSystem.js`.
2. fixedView 없는 구형 프로젝트를 열 때 이전 장면의 고정 상태/팬·줌을 초기화하는지 확인한다. 원본/P015 버튼 재적용 때 기존 camera zoom/view가 남는지도 확인한다.
3. 창 크기 변경 시 pixel lift/ray 캐시 무효화, standalone Perspective 고정뷰 해제 시 깊이별 팬 시차, 3D shot 역할의 공개 displayCamera 일치를 확인한다.
4. 비동기 복원 중 Delete/Backspace가 기존 장면을 삭제하고 이력 기록을 빠뜨릴 수 있는지 재현한다. 실패 시 기존 장면 유지 계약까지 검증한다.
5. 기본 semantic 포즈 적용 시 legacy 골반 회전이 v1 중립에 주입되는지 확인하고, 쪼그림 상태에서 키 변경 시 keepFeet/발 지지가 유지되는지 확인한다.
6. 수정 후 같은 소스 버전에서 원본/P015 → 관절 편집 → 고정 선화 → 팬·줌/XYZ → 컷/내보내기 → Undo/Redo → 저장·재열기의 실제 흐름을 묶어 확인한다.

새 변경은 현재 형상/rest/저장 q를 불필요하게 바꾸지 않는다. 각 실제 실패에 최소 수정하고, 확인된 검사를 이유 없이 반복하거나 범위를 계속 넓히지 않는다.

## 소스 안내

| 영역 | 파일 |
| --- | --- |
| 전신 geometry·joint·rest·접힘 | `app/src/doll-full-rig.js`, `doll-full-design.js`, `doll-torso-skin.js` |
| 메인 native/canonical 연결·보호 | `app/src/body-v1-adapter.js`, `body-rig.js`, `body-surface.js` |
| 실제 메인 UI/관측 연결 | `app/src/body-v1-main.js`, `main.js`, `direct-editor.js` |
| 고정 선화·scene 가림·cache | `app/src/body-v1-fixed.js`, `body-v1-lines.js`, `studio.js`, `view-performance.js` |
| standalone 비교 화면 | `app/doll-full.html`, `app/src/doll-full.js`, `doll-fixed-view.js` |
| 명시 추정 입력 | `app/src/body-v1-source-request.js`, `body-v1-source-requests.json` |
| 저장/포즈/구형 파일 | `app/src/pose-format.js`, `scene-format.js`, `pose-library.js`, `model-preview.js` |

현재 기본 인체는 restRevision/driverRestRevision 2. 저장한 explicit quaternion을 preset/provenance로 재생성하지 않는다. 구 revision 변환은 세계 자세를 보존한다. 숨은 legacy 전체 bbox 대신 실제 표시 인체 bounds를 사용한다. 모든 pose/load 때 자동 grounding해 목표나 저장 배치를 옮기지 않는다.

## 검증 증거와 정지 상태

- 마지막 제품 manifest: `validation/body-v1-postVB-20261104/product-pin/product-manifest.json`, SHA256 `7411b942511a1a59c28d697f97b01bf923900ee6006fb7311819220362dd7f0d`.
- 커밋 직전 source/asset 56개 대조 불일치 0, production build 통과, scene-format test 3개 통과. 이전 구현자 전체 test 17개 통과. chunk 크기 경고와 prototype 5파일 EOF 빈 줄 경고는 남아 있다.
- 구현자 보완 재현: 기본/추가 인체 화면 안, 연속 Undo/Redo 직후 GLB 1개 저장·재열기 유지, malformed 준비 단계 거절, explicit pose/camera 왕복, 실제 방 벽·바닥 가림. 새 독립 B 전체 재현은 아니다.
- 새 pin 바인딩 제한 재검토: `validation/body-v1-final-binding-review-20261103/postVB742-verdict.md`, `binding-rest-report-postVB742.json`(SHA256 `0e2555386be2661fe6c0d7eac0c70bbf644ab283b3767f59298dd86085b86135`). 중립 rest/접합/anchors/분리·명시 자세 왕복 범위에 한정한다.
- 이전 pin `3c2d...` 정식 A는 3회 예산 정지/잔존 리스크 미지수. 독립 B는 초기 인체 offscreen과 GLB 즉시 저장 손실을 재현해 미달: `validation/body-v1-VB-20261104/verdict.md`.
- 새 pin A: `validation/body-v1-VA-postVB-20261104/`. R1은 정식 출력 검사 완료·medium 6·계속. R2 반환은 이전 agent 상태에 있으나 회차 파일 저장/계약 검사/비교가 미완료다. 정식 2회 완료나 수렴으로 부르지 않는다. 원문 반환이 조정자 상태 조회에 노출됐으며 새 독립 입력으로 넘기지 않는다.
- 새 pin 공식 성능/최종 B, 전체 지원 domain의 실제 삼각형 CONTACT·구 지원 보존, 동일하게 보이는 old/new preview A/B는 미완료다. main native 1302 입력 관측은 전수 물리 품질 증명이 아니다. full 1858의 일부 prefix만 완료됐다.
- 기존 정식 A 누적 90분 예산 중 새 A 실행 전 잔여는 51분56초였다. 새 A 준비/실행 추가 소모와 오류 종료 시점을 기록으로 재구성해야 한다. 잔여를 초기화하지 않는다.
- B 이후 1회 보완+재검증 120분 창은 `2026-11-03 18:33:18~20:33:18 UTC`였고 이미 경과했다. 오류 대기를 성공적 실행으로 간주하거나 새 세션을 예산 초기화 근거로 삼지 않는다. 후속 작업의 범위/예산을 기존 승인과 구분해 정리한다.

### 동결 검사 버전 주의

`validation/body-v1-oracle/` 및 r6~r16b 원본은 불변이다. 후속 실행용 채택 버전 r16b 외부 manifest는 `validation/body-v1-oracle-maintenance-r16b-20261104/candidate-r16b-manifest.json`, SHA256 `7907c751563e0eea4655af2b131b29877c1b4efa60bcc49082e5b32f43dd842d`(43개)다. 최초 B는 r15 고정이었다.

실제 환경 가림 추가로 기존 line observer의 환경 누락 반례가 발견돼 별도 r17 후보를 만들었으나, 제한 심사에서 숨은 조상 clone visibility·geometry ref 교체·미지원 vertex shader 반례로 미달했다. r17b 후속 보완의 최종 채택은 확인되지 않았다. r17/r17b를 통과판으로 사용하지 않는다. 제품의 `environmentMeshes`는 actors/props와 별도 actual mesh refs이며 prop 0/3 집합은 그대로다. 기준을 낮추거나 벽을 가짜 prop으로 넣지 않는다.

별도 r17 유지 폴더의 `main-contact-pair-index.mjs`는 오래된 13 main raw의 측정 timeout을 pair 사전색인만으로 해소했다. 3002 bool 대조, 이전 11 성공 보고 exact 비교(시간 제외), 13 CONTACT 완료는 old raw 진단이다. 새 제품 통과나 전체 range 증명이 아니다. frozen script 수정은 없었다.

수치/마스크/지원 domain을 완화해 통과시키지 않는다. 정상 named pose와 elbow/knee 150°는 정확 수용해야 한다. 다른 요청의 보호 거절은 독립 unsafe-request와 safe-applied 근거 및 실제 UI 요청/적용/이유가 필요하다. old unsafe 숫자 수용을 old 정상 안전 지원과 혼동하지 않는다.

## 로컬 환경·명령

PowerShell, Node 24.22.2, Python 3.12.10. 로컬 앱 `http://127.0.0.1:3001/`, standalone `/doll-full.html`. 기존 서버가 살아 있는지 먼저 확인하고 중복 실행하거나 다른 세션 서버를 종료하지 않는다.

```powershell
Set-Location D:\github\cutscene-studio
git status --short
git log -1 --oneline
& .review-tools/node/node.exe --test scripts/scene-format.test.mjs
& .review-tools/node/node.exe .review-tools/node/node_modules/npm/bin/npm-cli.js --prefix app run build
```

기존 Playwright runtime은 `scripts/playwright-runtime.mjs`, 로컬 Chrome headless D3D11, 검증 viewport 1280×960 DPR1. 실제 브라우저 확인과 정적 판단을 구분한다. CUA 파일 선택 대기로 과거 20분을 잃었으므로 동일 방식 반복을 피한다. GPU/빌드/서버·dist 자원은 직렬 관리한다.

## 작업 트리·보존·전달 제약

- index는 제품 커밋 후 비어 있었다. 관련 없는 `skills/cutscene-studio/*` 수정과 로컬 첨부, 저장 장면, 이전 prototype 설명/리뷰 스크립트·이미지 등이 남아 있다. 다음 시작 시 다시 확인한다. `git add -A`, `commit -a`, `reset --hard`, `clean`으로 정리하지 않는다.
- 원본 PNG는 `app/public/body-study/reference.png`, P015 로컬 원본은 `.review-tools/gallery-one/full_single_P015_front.png`. 참고 원본은 제품 커밋/배포에 포함하지 않는다. 새 이미지 수집·유료 호출·외부 송신 불필요.
- **`validation/`, `.review-tools/`, 첨부/참고 이미지와 일부 이전 review 스크립트는 Git 커밋에 없다.** 같은 PC/checkout의 새 대화는 읽을 수 있다. 다른 머신에서는 커밋만으로 기존 수치/독립 증거를 재현할 수 없다. 필요한 원문·도구를 별도 안전하게 전달하거나 미검증으로 표시하고 재현한다. 임의로 대용량 전체 폴더를 업로드하지 않는다.
- 독립 검증자는 새 맥락에서 대상 소스·승인 규칙·중립 범위만 받는다. 이 구현용 핸드오프, 이전 지적, Current State와 검토 원문을 reviewer packet에 섞지 않는다. 구현자와 별도이며 제품/동결 검사 쓰기 금지다.
- 계획 본문은 바꾸지 않는다. Current State는 새 조정 역할 한 명만 갱신한다. 현재 세션은 핸드오프 문서만 추가하고 제품 수정/검증 재개를 하지 않았다.

## 다음 대화에 붙일 요청

> `D:\github\cutscene-studio\docs\HANDOFF_ARTICULATED_BODY_V1.md`를 읽고 작화 인체 v1 작업을 이어받아줘. 제품 기준은 `9788a56`이고 최종 완료는 아니다. 먼저 실제 저장소/로컬 증거와 중단된 HGLOS 예산·검증 상태를 확인해줘. 카메라·내보내기·복원 입력·기본 포즈/발 지지의 잔여 지적을 실제 UI로 재현해 수정하고, 메인 편집기 전체 흐름이 이어지도록 진행해줘. 검증 준비나 기준 완화로 시간을 쓰지 말고, 이전 독립 판정을 새 버전 통과로 재사용하지 마.
