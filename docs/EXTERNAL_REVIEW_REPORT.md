# 외부 검증 보고서

[보고서 양식](EXTERNAL_REVIEW_REPORT_TEMPLATE.md)을 따릅니다. 기존 `docs/VALIDATION.md`와 인계 문서의 통과 기록은 참고만 했고, 아래 판정은 모두 이번 환경에서 직접 실행한 결과입니다. 판정은 **통과 / 기능 실패 / 환경 오류 / 미실행**으로 구분하고, 결함은 **재현됨 / 소스상 의심**으로 구분합니다.

## 대상과 환경

- 검증 일시/검증자: 2026-11-02 09:10–10:40 KST / Claude Code(Opus 5.5), 사용자 jhlim 계정 PC에서 실행
- 저장소 URL/브랜치/커밋: `https://github.com/muzik1014/cutscene-studio` / `main`(origin과 동기) / `be8f9ce01c49ef0a1c9318bd781ab129ce3cce4b`
- 로컬 경로: `D:\github\cutscene-studio` (추가로 `git archive HEAD`를 한글·공백 경로 `validation\external-review\kr-path\컷신 스튜디오 검증`에 풀어 별도 설치·빌드·실행)
- 작업 트리 변경 여부: 시작 시 clean. 종료 시 추적 파일 변경 없음(이 보고서만 신규). 생성물은 모두 `.gitignore` 대상(`.review-tools/`, `app/node_modules/`, `app/dist/`, `validation/`)
- Windows/Node/npm/Chrome 버전: Windows 11 Pro 10.0.26300 / Node v24.22.2(공식 zip, SHA-256 확인, `.review-tools\node`) / npm 11.19.1 / Google Chrome 156.0.8078.49(Playwright `channel:'chrome'` → HeadlessChrome 156), Edge 156.0.4314.58, Claude 앱 내장 브라우저 Chrome 152 / Playwright 1.64.1 / Python 3.12.10 / Git 2.47.1
- GPU/WebGL/실행 모드: Intel Iris Xe. 자동 테스트는 스크립트 지정대로 headless + ANGLE SwiftShader(약 3.3fps). 참고 측정으로 headless D3D11(Iris Xe)에서 예제 장면 약 30.7fps(`logs/28-gpu-fps.json`)
- 설치 명령 및 추가 환경 설정:
  - 이 PC에는 PATH상의 Node/npm이 없었음. `%USERPROFILE%\.cache\codex-runtimes\...\node.exe`(v24.19.0)는 있으나 npm이 없어 독립성을 위해 사용하지 않음. nodejs.org의 `node-v24.22.2-win-x64.zip`을 받아 SHASUMS256으로 검증 후 `.review-tools\node`에 풀고 해당 셸 PATH 앞에만 추가(시스템 설정 변경 없음).
  - `npm --prefix app ci` → `npm --prefix app run build`
  - Playwright: `npm install --prefix .review-tools --no-save playwright`, `NODE_PATH=<repo>\.review-tools\node_modules`(인계 문서 6.2 절차 그대로)
  - 서버: `node scripts/serve.mjs`(3001), `npm --prefix app run dev -- --port 3002`

## 판정

- **전체 결론: 조건부 사용 가능**
- 목적에 대한 적합성: 핵심 흐름은 이번 환경에서 실제로 동작했습니다. 장면 JSON 검사·적용, 인물별 키/등신, 관절 범위·뼈 길이 고정, 저장·재열기, 실행 취소/다시 실행, 촬영 카메라 분리, 컬러·깊이 PNG, 전달 묶음, 오프라인 편집이 여기에 해당합니다. 작화 참조용 구도·포즈·조명 캡처라는 목적에는 사용할 수 있습니다.
- 가장 큰 결함 또는 남은 불확실성:
  1. **[P1] Add Mannequin › From File… 경로가 모든 입력 검증을 우회합니다.** 손상된 객체 JSON 하나로 3D 뷰가 멈추고 실행 취소가 예외로 실패하며, 이 상태로 저장한 프로젝트는 다시 열 수 없습니다(F1). 늘어난 뼈 데이터도 그대로 들어와 새 고정값이 됩니다(F2).
  2. **[P2] Move(제약 IK) 마우스 드래그 중 관절 구성이 한 스텝에 최대 128° 뒤집힙니다.** 뼈 길이는 유지되지만 포즈가 튑니다(F3).
  3. **[P2] 기즈모로 관절을 돌린 뒤 Properties 수치가 갱신되지 않습니다.** 이후 슬라이더를 한 칸 움직이면 관절이 87.5° 튑니다(F4).
  4. **[P2] 앞쪽 카메라 컷을 삭제하면 활성 컷이 다른 컷으로 바뀝니다.** PNG·전달 묶음이 의도와 다른 구도로 촬영될 수 있습니다(F5).
- 후속 수정: F1·F2·F4·F5는 이 검증 이후 작업 트리에서 수정했고 재검증을 통과했습니다(「수정 후 재검증」). 수정 반영 시 남는 주요 결함은 F3(P2)과 P3 항목입니다.
- 검증 범위 밖의 항목: LLM의 소설 해석 품질, 최종 이미지 생성 모델의 구도 보존, 외부 GLB 모델(테스트 자산 없음), 사람 손에 의한 물리 마우스 조작(Playwright CDP 마우스 이벤트와 앱 내장 브라우저 클릭/드래그로 대체), Edge/Firefox, 장시간 사용 성능.

## 실행 결과

증거 경로의 기준 폴더는 `validation/external-review/`입니다.

| 항목 | 판정 | 실행 명령·수동 절차 | 로그·이미지·입력 파일 |
| --- | --- | --- | --- |
| 새 클론·설치·빌드 | **통과**(조건: Node 별도 설치 필요) | 기존 클론에서 `npm --prefix app ci`(13 패키지), `npm --prefix app run build`(Vite 5.4.21, 49 모듈, JS 906.61kB > 500kB 경고). `git archive` 사본을 한글·공백 경로에 풀어 동일 설치·빌드·단위 테스트·`start.cmd` 실행(포트 3011)·스모크 테스트 | `logs/00-env.txt`, `logs/01-npm-ci.log`, `logs/02-build.log`, `logs/30-korean-path.log`, `logs/31-start-cmd-korean.log`, `kr-path-smoke/report.json` |
| 장면 포맷·피드백 단위 테스트 | **통과** 8/8 | `node --test scripts/scene-format.test.mjs scripts/scene-feedback.test.mjs` | `logs/03-unit-tests.log` |
| 일반 브라우저 흐름 | **통과** | `node scripts/browser-check.mjs`(12항목, pageErrors 0, 외부 요청 0) | `logs/10-browser-check.log`, `auto/browser-report.json`, `auto/color.png`, `auto/depth.png`, `auto/portrait.png`, `auto/editor.png` |
| JSON 오류 UI·수정 루프 | **통과** | `node scripts/validation-ui-check.mjs`(11항목) + 자체 `probe-ui.mjs` U6(11개 변형: 중복 ID·미지원 필드·관절 범위·포즈·cm 키·13명·NaN·코드 펜스·잘린 JSON·빈 입력·정밀 프로젝트 오입력) | `logs/10-validation-ui-check.log`, `auto/json-feedback/`, `ui/u6-input-*.json`, `ui/u6-report-*.json` |
| 키/등신·관절·길이 고정 | **통과** | `node scripts/body-rig-check.mjs` + `probe-rig.mjs` R5(수치 입력 클램프 7건)·R6(50/3, 50/12, 300/3, 300/12, 180/5·8·9.5, 140/5 실측 일치·발 위치·포즈 보존)·R6b(범위 밖 5건 거부) + `probe-ui.mjs` U1(인물별 독립·저장/재열기) | `logs/10-body-rig-check.log`, `auto/body-rig/`, `rig/report.json`, `rig/r6-profile-*.png`, `ui/u1-*.json` |
| 실제 마우스 조작·극단 포즈 | **기능 실패**(F3, F4) | Playwright 실마우스: 회전 링 드래그 8관절(링 hit-test 후 1.25회전), Move 기즈모 미도달 드래그 4부위×왕복, IK 핸들 미도달, 50cm/3등신·300cm/12등신 극단 드래그, 층 전환. 앱 내장 브라우저에서 클릭 선택·Move/Rotate 드래그 수동 조작 | `logs/20-probe-rig.log`, `logs/21-probe-jump-run2.log`, `rig/jump-report.json`, `rig/jump-translate-*.png`, `ik-flip/`, `stale-panel/`, `manual/*.jpg` |
| 저장·재열기·실행 취소/다시 실행 | **통과**(단, F1 경로 제외) | browser-check + `probe-rig.mjs` R8(체형→포즈→Undo→Redo→Save→Load 비교) + U1/U5d | `rig/r8-*.json`, `ui/u1-*.json`, `ui/u5-reopened-from-handoff.json` |
| 촬영 카메라·컬러/깊이 PNG | **통과**(F5 별도) | U2a(작업 카메라 궤도 이동 후 컷 PNG 픽셀 차 0), U2b/c/d(갱신 반영), U3a(5개 화면비 컬러·깊이 크기 일치, 배경 마스크 IoU 1.0), U3b(관절 선택·IK·회전 기즈모 표시 상태 캡처 = 미선택 캡처, 픽셀 차 0). PNG를 직접 열어 확인 | `ui/u2-*.png`, `ui/u3-color-*.png`, `ui/u3-depth-*.png`, `ui/u3-editor-with-gizmo.png`, `ui/u2d-report.json` |
| 전달 묶음·실제 편집 상태 우선 | **통과**(문서 차이 F6) | U5: 위치·관절·체형·방·조명 수정 후 전달 묶음 → editorState에 수정 반영, 묶음 PNG = 직접 캡처(바이트 동일), 스킬 `inspect`/`extract`가 editorState 사용, 묶음을 Load하면 editorState 복원 | `ui/u5-handoff.json`, `ui/u5-inspect.json`, `ui/u5-extracted/`, `ui/u5-color-direct.png` |
| 오프라인 동작·외부 요청 | **통과**(부분 미실행) | 로드 후 `context.setOffline(true)` 상태로 예제·포즈·Save/Load·컬러/깊이·전달 묶음·지시문: 요청 0건. 모든 프로브에서 127.0.0.1 외 요청 0건. 빌드 산출물에 외부 fetch URL 없음. **완전 오프라인 콜드 스타트는 미실행**(Chromium 오프라인 에뮬레이션이 루프백도 차단 → 환경 제약, 시스템 네트워크 차단은 하지 않음) | `logs/25-probe-offline.log`, `offline/` |
| 스킬 이식성·명시 앱 경로 | **통과**(조건부, F10) | `scene.mjs info/validate --app-root .`, 다른 cwd(`C:/Users/USER/04-skill-info-validate.log`, `logs/11-check-skill.log`, `logs/12-skill-other-cwd.log`, `skill/gallery-system-python.log`, `auto/skill-*` |
| 라이선스·배포 폴더 완전성 | **통과**(문서 차이 F12, 경미 F11) | `prepare-assets.mjs`와 같은 방식으로 메모리에서 재생성해 `app/public/THIRD_PARTY_LICENSES.txt`와 비교(줄바꿈 정규화 후 동일). `dist`에 동일 파일 포함. 루트·app·스킬 LICENSE = GPL-3.0 동일. `npm audit` 2건 = 인계 문서 기록과 일치 | `logs/05-npm-audit.log`, `logs/05-npm-audit.json`, `logs/06-npm-ls.log` |

### 자동 테스트 외 자체 검증 스크립트

모두 `validation/external-review/scripts/`에 있으며 앱 코드는 수정하지 않았습니다. 실행 예시는 `NODE_PATH`를 지정한 뒤 `node validation/external-review/scripts/<이름>.mjs`입니다.

| 스크립트 | 대상 | 내용 |
| --- | --- | --- |
| `lib.mjs` | 공통 | 브라우저 실행, 외부 요청 차단·기록, 다운로드. 3002에서는 앱이 실제 사용하는 mannequin/three/body-rig 모듈 인스턴스를 같은 URL로 import해 실측(`installProbe`) |
| `probe-rig.mjs` | 3002 | R1 층 전환, R2 회전 링 드래그, R3 Move 미도달 드래그, R4 IK 핸들, R5 수치 입력, R6 극단 체형, R7 극단 체형+드래그, R8 이력/재열기 |
| `probe-jump.mjs`, `repro-ik-flip.mjs` | 3002/3001 | 마우스 스텝별 관절 world 쿼터니언 각도 변화로 실제 튐 측정, 전후 스크린샷 |
| `repro-stale-panel.mjs` | 3002 | 기즈모 회전 후 패널 수치와 실제 값 비교, 슬라이더 한 칸 조정 |
| `probe-ui.mjs` | 3001 빌드 | U1–U8(체형 독립, 카메라 분리, PNG 정렬·클린 캡처, 컷 삭제, 전달 묶음, JSON 거부, 정밀 프로젝트 변조, From File) |
| `repro-fromfile-freeze.mjs` | 3001 빌드 | 손상 객체 From File 후 렌더 정지·저장·재열기·Undo |
| `probe-offline.mjs`, `smoke-korean-path.mjs`, `check-*.mjs` | 3001/3011 | 오프라인, 한글 경로, 컷 갱신, fps, 기타 |

## 발견 사항

### [P1] F1. From File로 손상된 객체를 추가하면 3D 뷰가 멈추고, 실행 취소가 실패하며, 저장한 프로젝트를 다시 열 수 없음

> **수정됨(후속 커밋 전 작업 트리)** — 아래 「수정 후 재검증」 참고. 이하 본문은 수정 전 `be8f9ce` 기준 기록입니다.

- 확인 상태: **재현됨**(빌드 3001)
- 위치: `app/src/main.js:672-700`(`addMannequinFromPickedFile`는 `JSON.parse`만 하고 `analyzeEditorState`를 호출하지 않음), `app/src/main.js:605-631`(`addMannequinFromData`: 검증 없이 `position.fromArray` 후 `mannequins.push`·`captureState`), `app/src/main.js:772`(`value.toFixed`) / `app/src/main.js:764`(`p.x.toFixed`, 매 프레임 HUD), `app/src/main.js:132-136`·`241`(Undo 시 이력 스냅샷 검증 예외)
- 재현 입력/전제: 예제 장면의 지훈을 💾로 저장한 객체 JSON에서 `position`을 `[1,"x",3]`, `posture.data`를 `[]`로 바꾼 파일 `ui/u8-input-broken-object.json`
- 재현 순서:
  1. 예제 장면을 엽니다.
  2. Add Mannequin › 📁 From File…에서 위 파일을 고릅니다.
  3. "Could not read that JSON file." 경고를 닫고 화면을 드래그합니다.
  4. Undo를 누릅니다.
  5. Save 후 같은 파일을 Load합니다.
- 기대 결과: 위쪽 Load와 같이 `INVALID_TRANSFORM`·`INVALID_POSTURE` 오류 목록을 표시하고 장면을 바꾸지 않습니다.
- 실제 결과: 경고는 "읽을 수 없음"이지만 세 번째 인물(지훈)이 층 목록에 추가됩니다. `pageerror: e.y.toFixed is not a function` 이후 렌더 루프가 멈춰 3D 뷰가 고정됩니다(궤도 드래그 전후 스크린샷 동일). Undo는 `mannequins[2].position: 유한한 숫자 3개…` 예외로 실패합니다. 저장 파일에는 `"position":[1,"x",3]`이 들어가고, Load 시 "JSON 오류 1개 · 입력을 적용하지 않았습니다."로 거부됩니다. 페이지를 새로 고쳐야 복구되며, 그때 저장하지 않은 작업은 잃습니다.
- 영향과 빈도: 손으로 고친 객체 파일이나 LLM이 만든 객체 파일에서 발생할 수 있습니다. 빈도는 낮지만 세션이 정지되고 저장 파일을 다시 열 수 없게 되는 데이터 손실성 결함입니다.
- 로그/스크린샷/프로젝트 파일: `logs/24-repro-fromfile-freeze.log`, `fromfile/report.json`, `fromfile/after-broken-fromfile.png`, `fromfile/project-with-broken-mannequin.json`, `ui/u8-after-fromfile-broken.json`
- 최소 수정 제안: `addMannequinFromPickedFile`이 `studio.importText(text, file.name, false)`를 호출하게 해 Load와 같은 검사·보고서·복원 경로를 쓰거나, 최소한 `analyzeEditorState(data)` 통과 시에만 `addMannequinFromData`/`addImportedModelFromData`를 호출합니다. 추가로 `addMannequinFromData`에서 장면 반영(`push`/`add`)을 패널 갱신보다 마지막에 두거나 try/catch로 롤백합니다.
- 수정 후 재검증 방법: `node validation/external-review/scripts/repro-fromfile-freeze.mjs` → `rendersAfter:true`, 층 수 불변, `pageErrors: []`, 오류 패널에 `INVALID_TRANSFORM` 표시.

### [P2] F2. From File 경로로는 늘어난 뼈 데이터가 거부되지 않고 새 고정값이 됨

> **수정됨(후속 커밋 전 작업 트리)** — 아래 「수정 후 재검증」 참고. 이하 본문은 수정 전 `be8f9ce` 기준 기록입니다.

- 확인 상태: **재현됨**(빌드 3001)
- 위치: `app/src/main.js:605-631`(`lockBoneLayout(m)`을 파일의 관절 위치로 다시 캡처), `app/src/main.js:672-700`
- 재현 입력/전제: 💾로 저장한 객체에서 `joints.l_elbow.position[1]`을 +3, `joints.l_knee.position[1]`을 -2 바꾼 `ui/u8-input-stretched-object.json`
- 재현 순서:
  1. 이 파일을 위쪽 Load로 엽니다.
  2. 같은 파일을 Add Mannequin › From File…로 엽니다.
  3. Save 후 그 프로젝트를 Load합니다.
- 기대 결과: BODY_RIG.md의 "로컬 뼈 위치나 스케일이 고정값과 달라진 정밀 프로젝트는 오류로 차단"과 같이 두 경로 모두 거부합니다.
- 실제 결과: Load는 "JSON 오류 2개"(`BONE_LENGTH_LOCKED`)로 거부합니다. From File은 인물을 추가하고 `l_elbow.position[1]=14`(원래 11)를 `boneLayout`에도 14로 고정합니다. 이렇게 저장한 프로젝트는 Load 시 "오류 0개"로 열립니다.
- 영향과 빈도: 뼈 길이 고정 보장이 UI 메뉴 하나로 우회됩니다. 이후 포즈 조작은 늘어난 길이를 유지합니다.
- 로그/스크린샷/프로젝트 파일: `logs/23-probe-ui.log`(U8a), `ui/u8-after-fromfile-stretched.json`, `ui/u8-fromfile-stretched.png`
- 최소 수정 제안: F1과 같습니다(From File을 Load 검증 경로로 통합).
- 수정 후 재검증 방법: `probe-ui.mjs` U8a에서 From File 후 인물 수 2 유지, 오류 패널에 `BONE_LENGTH_LOCKED`.

### [P2] F3. Move(제약 IK) 기즈모 드래그 중 중간 관절이 한 스텝에 급반전(최대 128°)

- 확인 상태: **재현됨**(dev 3002 실측, 같은 입력을 빌드 3001에서 재생해 스크린샷). 두 번 실행해 같은 수치가 나왔습니다(결정적).
- 위치: `app/src/body-rig.js:112-141`(`solveConstrainedIK`: 매 `objectChange`마다 현재 자세에서 CCD 48회를 돌리고 오차가 최소인 해를 채택합니다. 이전 자세와의 연속성 항이나 스텝당 회전 한계가 없고, `clampJoint`의 축별 Euler 클램프 때문에 해가 다른 구성으로 건너뜁니다), `app/src/main.js:1201-1206`
- 재현 입력/전제: 예제 장면 → 컷 "1. 관계와 공간" 클릭(작업 시점 고정) → 지훈 선택. `probe-jump.mjs`가 회전 8건 후 Move 8건을 같은 순서로 실행합니다. 마우스 경로와 각 스텝 자세는 `rig/jump-report.json`에 있습니다.
- 재현 순서:
  1. Head를 고르고 Move 모드에서 기즈모 중심(XYZ)을 잡습니다.
  2. 우하단으로 40스텝(스텝당 약 16px) 드래그합니다.
  3. 4번째 스텝 전후 자세를 비교합니다.
- 기대 결과: 끝점이 조금 움직이면 관절도 연속적으로 조금 움직입니다.
- 실제 결과(스텝 하나 기준):

  | 부위(Move) | 끝점 이동 | 최대 관절 회전 |
  | --- | --- | --- |
  | Head | 0.081m | neck 128.1° |
  | Neck | 0.686m | torso 109.9°(큰 스텝이라 기하적으로도 큼) |
  | Right_Wrist | 0.150m | r_arm 55.9° |
  | Left_Ankle | 0.127m | l_knee 34.8° |

  같은 측정에서 Rotate 링 드래그는 8개 관절 모두 스텝당 0.7° 이하로 기즈모 회전과 일치했습니다. 모든 경우 뼈 길이 변화 ≤ 3e-16m, 관절 범위 위반 0건, NaN 0건입니다.
- 영향과 빈도: 머리·손·발을 끌어 자세를 잡는 주 조작에서 포즈가 순간적으로 뒤집힙니다. 체형·길이는 안전하지만 사용자가 의도하지 않은 자세가 남을 수 있습니다(Undo로 복구 가능).
- 로그/스크린샷/프로젝트 파일: `logs/21-probe-jump-run2.log`, `rig/jump-report.json`, `rig/jump-translate-Head-11-step3.png` → `step4.png`(머리 방향이 반대쪽으로 뒤집힘), `rig/jump-translate-Right_Wrist-9-step6/7.png`, `ik-flip/repro.json`, `ik-flip/build-*.png`
- 최소 수정 제안: `solveConstrainedIK`에 직전 자세와의 쿼터니언 거리 페널티를 넣거나 반복당 관절 회전량을 제한(damped CCD)합니다. 드래그 시작 시 자세를 기준으로 매 스텝 연속성을 유지하고, 해가 이전 해보다 일정 각도 이상 벌어지면 채택하지 않습니다.
- 수정 후 재검증 방법: `probe-jump.mjs`의 translate 결과에서 `worstStep.jointDeg`가 끝점 이동을 감안한 기준(예: 30° 이하) 안에 들고 `jump:false`인지 확인합니다.

### [P2] F4. 기즈모 회전/이동 후 Properties 수치가 갱신되지 않아 이후 슬라이더 조작 시 관절이 튐

> **수정됨(후속 커밋 전 작업 트리)** — 아래 「수정 후 재검증」 참고. 이하 본문은 수정 전 `be8f9ce` 기준 기록입니다.

- 확인 상태: **재현됨**(앱 내장 브라우저 수동 조작에서 발견, dev 3002 실측으로 확인)
- 위치: `app/src/main.js:1197-1218`(`dragging-changed`·`objectChange`에서 `updatePropertiesPanel()`을 호출하지 않음), `app/src/main.js:837-842`·`854-855`(슬라이더 입력 시 표시된 값으로 축 하나를 덮어씀)
- 재현 순서:
  1. 예제 장면에서 지훈 → Torso → Rotate 모드를 고릅니다.
  2. Z 링을 드래그합니다.
  3. bend 슬라이더에 포커스를 두고 → 키를 한 번 누릅니다.
- 기대 결과: 드래그 후 패널이 bend 90을 표시하고, → 키를 누르면 90.5가 됩니다.
- 실제 결과: 드래그 후 실제 bend는 90.0°인데 패널은 2.00입니다. → 키를 누르면 실제 bend가 2.5°가 되어 몸통이 87.5° 튑니다. 앱 내장 브라우저에서도 몸통이 크게 숙여진 상태에서 bend 2.00/tilt 0/turn 0이 표시되는 것을 확인했습니다.
- 영향과 빈도: 기즈모로 대략 맞춘 뒤 수치로 미세 조정하는 일반적인 흐름에서 자주 발생합니다.
- 로그/스크린샷/프로젝트 파일: `logs/26-repro-stale-panel.log`, `stale-panel/report.json`, `stale-panel/after-gizmo.png`, `stale-panel/after-slider-nudge.png`, `manual/05-torso-rotate-rings.jpg`, `manual/06-after-rotate-panel-stale.jpg`
- 최소 수정 제안: `dragging-changed`에서 `!e.value`일 때(드래그 종료) `updatePropertiesPanel()`을 호출하고, 드래그 중에는 슬라이더/숫자 값만 갱신하는 가벼운 동기화 함수를 `objectChange`에서 호출합니다. IK 핸들 드래그 종료(`onMouseUp`)도 같습니다.
- 수정 후 재검증 방법: `repro-stale-panel.mjs`에서 `afterGizmo.panel.bend == afterGizmo.actual.bend`, `jumpDeg ≤ 0.5`.

### [P2] F5. 앞쪽 카메라 컷을 삭제하면 활성 컷이 다음 컷으로 바뀜

> **수정됨(후속 커밋 전 작업 트리)** — 아래 「수정 후 재검증」 참고. 이하 본문은 수정 전 `be8f9ce` 기준 기록입니다.

- 확인 상태: **재현됨**(빌드 3001)
- 위치: `app/src/studio.js:218`(`activeShot=Math.min(activeShot,shots.length-1)`는 삭제 위치가 활성 컷보다 앞일 때 인덱스를 줄이지 않음)
- 재현 순서:
  1. 예제 장면(컷 2개)에서 "구도 저장"으로 `C-new`를 추가해 3개를 만듭니다.
  2. "2. 상자 너머"를 클릭해 활성화합니다.
  3. 1번 컷의 ×를 누릅니다.
- 기대 결과: 활성 컷이 "상자 너머"로 유지됩니다.
- 실제 결과: 캡션과 강조 버튼이 "C-new"로 바뀝니다. 저장값은 `activeShot:1`이고 shots는 `["상자 너머","C-new"]`입니다. 이후 PNG 캡처·Depth·전달 묶음은 사용자가 고르지 않은 구도로 만들어집니다.
- 로그/스크린샷/프로젝트 파일: `logs/23-probe-ui.log`(U4), `ui/u4-after-delete.json`
- 최소 수정 제안: `if(i<activeShot)activeShot--; else if(i===activeShot)activeShot=Math.min(activeShot,shots.length-1);`
- 수정 후 재검증 방법: `probe-ui.mjs` U4 통과(`activeAfter`가 "상자 너머"로 시작).

### [P3] F6. 전달 묶음의 `proposal`(=`studio.document`)은 최초 제안이 아니라 방·조명·제목 편집이 반영된 값

- 확인 상태: **재현됨**
- 위치: `app/src/studio.js:243-253`(방 크기·벽·조명 세기·색·방향·주변광·제목·원문·추정 편집이 `document`를 직접 변경), `app/src/studio.js:266`(`proposal:document`)
- 재현 순서:
  1. 예제 장면에서 방 너비를 8, 주광 방향을 "오른쪽 앞"으로 바꿉니다.
  2. LLM 전달 묶음을 받습니다.
- 기대 결과(README·EXTERNAL_REVIEW §4·작화 지시문): `proposal`은 최초 LLM 제안(방 너비 6, 주광 `[-3,5,2]`)입니다.
- 실제 결과: `proposal.room.size[0]=8`, `proposal.lighting.position=[3,5,3]`이고 인물·소품 배치만 최초 값입니다. 공간·조명의 실제 편집 상태는 `editorState.mannequins/importedModels`가 아니라 `editorState.studio.document`에만 있습니다.
- 영향과 빈도: 문서 지침("실제 수정 상태는 editorState, proposal은 최초 제안")을 따르는 LLM이나 사용자가 공간·조명의 출처를 오해할 수 있습니다. 실제 값은 editorState에 있으므로 데이터 손실은 없습니다.
- 로그: `logs/23-probe-ui.log`(U5b), `ui/u5-handoff.json`
- 최소 수정 제안: 최초 제안을 별도 불변 사본(`initialProposal`)으로 보관해 `proposal`에 쓰고, 편집 가능한 공간·조명은 `studio.environment`처럼 이름을 분리합니다. 또는 문서를 "proposal/studio.document의 actors·props는 최초 제안, room·lighting·title은 현재 편집값"으로 정정합니다.
- 수정 후 재검증 방법: U5b 통과.

### [P3] F7. 정밀 프로젝트의 뼈 길이 검사는 `boneLayout` 삭제 또는 동시 변조로 통과

- 확인 상태: **재현됨**. 동시 변조는 EXTERNAL_REVIEW §4에 문서화된 한계이고, `boneLayout` 삭제 경로는 "구형 프로젝트" 처리로만 설명되어 있습니다.
- 위치: `app/src/scene-feedback.js:26-38`(`boneLayout`이 없으면 검사 생략), `app/src/main.js:167`(로드한 관절로 새 고정값 캡처)
- 재현: `ui/u7-input-stretched-joint-and-lock.json`, `ui/u7-input-stretched-without-boneLayout.json`을 Load하면 둘 다 "오류 0개"로 열립니다. `scale` 0은 정상적으로 거부됩니다.
- 영향: 보안 기능이 아니라는 문서 설명과 일치하는 경미한 한계입니다. 다만 `bodyProfile`이 있는데 `boneLayout`이 없는 조합은 실제 구형 프로젝트에서 나올 수 없으므로 경고로 표시할 만합니다.
- 최소 수정 제안: `bodyProfile`이 있고 `boneLayout`이 없으면 `LEGACY_RIG` 경고를 표시하고, 표준 리그 비율(체형에서 계산한 기대 길이)과 크게 다르면 오류로 처리합니다.

### [P3] F8. 주광 방향 드롭다운이 프로젝트 Load/Undo 후 동기화되지 않음

- 확인 상태: **재현됨**
- 위치: `app/src/studio.js:223-229`(`syncUI`가 `#studio-light-direction`을 설정하지 않음)
- 재현: "뒤쪽 역광"으로 저장 → "위에서"로 변경 → 저장 파일 Load. 조명 위치는 `[0,4,-4]`로 복원되지만 드롭다운은 "위에서"로 남습니다.
- 증거: `minor/report.json`
- 수정 제안: `lighting.position`과 프리셋 4개를 비교해 일치하는 값을 선택하고, 일치하지 않으면 "사용자 지정" 옵션을 표시합니다.

### [P3] F9. 층 목록의 휴지통으로 마지막 인물까지 삭제 가능(Delete 키와 불일치)

- 확인 상태: **재현됨**
- 위치: `app/src/main.js:502-524`(가드 없음) vs `app/src/main.js:543`(Delete 키는 마지막 인물 삭제 금지)
- 증거: `minor/report.json`(휴지통 2회 → 인물 0, Delete 키 2회 → 1 유지)
- 수정 제안: 의도된 정책 하나로 통일합니다(인물 0명 허용 여부 결정).

### [P3] F10. 실행기·검증 도구의 개발 PC 경로 의존

- 확인 상태: **재현됨/소스 확인**. 앱 기능 결함은 아니며 환경 이식성 문제입니다.
- 위치:
  - `start.cmd:7`: PATH에 node가 없으면 `%USERPROFILE%\.cache\codex-runtimes\...\node.exe`로 폴백합니다.
  - `scripts/browser-check.mjs:5`, `validation-ui-check.mjs:5`, `body-rig-check.mjs:5`: `createRequire(path.dirname(process.execPath)+'/../package.json')`. 일반 Node에서는 `NODE_PATH`가 필요합니다(인계 문서대로 하면 동작).
  - `scripts/check_cutscene_skill.mjs:56`: Codex Python 절대 경로를 사용합니다.
  - `scripts/check_cutscene_skill.mjs:11`: 선행 browser-check가 만든 `validation/handoff.json`이 필요합니다.
  - `docs/SKILL_INTEGRATION.md:11,22`: `C:/Users/USER\...` 경로를 기록합니다.
- 관찰: 이 PC에는 Codex Python이 있어 `check_cutscene_skill.mjs`가 통과했습니다. Codex Python이 없는 PC에서는 실패합니다. 스킬 본체(`scene.mjs`)는 절대 경로에 의존하지 않습니다. `runtime.json`의 `appRoot:"."`는 cwd 기준이라 사실상 의미가 없지만, 탐색 순서상 무해합니다. gallery.py는 시스템 Python 3.12로도 동작했습니다.
- 수정 제안: `check_cutscene_skill.mjs`가 `PYTHON` 환경 변수 → `python`/`py` → Codex 경로 순으로 찾게 하고, `handoff.json`이 없으면 해당 항목을 skip으로 표시합니다. 브라우저 스크립트는 `createRequire(import.meta.url)`에 `NODE_PATH` 안내를 추가합니다.

### [P3] F11. 정적 서버에 `.txt` MIME이 없어 라이선스 고지가 다운로드로 처리됨

- 확인 상태: **재현됨**(`curl -I /THIRD_PARTY_LICENSES.txt` → `application/octet-stream`)
- 위치: `scripts/serve.mjs:8`
- 수정 제안: `'.txt':'text/plain; charset=utf-8'`를 추가합니다.

### [P3] F12. THIRD_PARTY_NOTICES의 "소스 원본 이력은 app/.git에 남아 있습니다"가 배포 저장소와 불일치

- 확인 상태: **재현됨**(클론에 `app/.git` 없음. REPOSITORY_HANDOFF는 원본 작업 폴더에만 남겼다고 기술)
- 위치: `THIRD_PARTY_NOTICES.md:3`
- 수정 제안: 기반 커밋 `5ad2d16…`의 upstream URL을 출처로 명시하고, 수정 사항은 이 저장소 이력에 있다고 정정합니다.

### [정보] F13. 의존성 취약점과 설치 경고

- `npm audit`(2026-11-02 09:15): vite ≤6.4.3 **high**(실제 high 항목은 launch-editor `GHSA-587h-7wmj-h5pm`. 그 밖에 path traversal·`fs.deny` 우회 등 moderate/low 7건), esbuild ≤0.24.2 **moderate**(`GHSA-67mh-4wv8-2f99`). 수정 후보 vite 8.3.5(메이저)입니다. **REPOSITORY_HANDOFF의 기록(high 1·moderate 1, vite 8.3.5 제시)과 일치합니다.**
- 영향 범위: 모두 Vite **개발 서버**에 해당합니다. 개발 서버는 `127.0.0.1`에 바인딩됩니다(`app/vite.config.js`, `--port 3002` 확인). 기본 사용 경로인 `scripts/serve.mjs` + `dist`에는 Vite/esbuild 코드가 포함되지 않습니다. `serve.mjs`는 `..`, `%2e%2e`, `..%5c` 경로 탈출을 403/404로, POST를 405로 거부했습니다.
- npm 11.19의 `install-scripts` 정책 때문에 `esbuild@0.21.5` postinstall이 실행되지 않았다는 경고가 나왔습니다. `@esbuild/win32-x64`가 설치되어 빌드는 정상입니다. 다른 npm 버전에서는 이 경고가 없을 수 있습니다.

## 문서와 구현의 차이

| 문서의 주장 | 실제 확인 결과 | 수정 제안 |
| --- | --- | --- |
| README·EXTERNAL_REVIEW §4: 전달 묶음 `proposal`/`studio.document`는 최초 제안 | 방·조명·제목·원문 편집이 반영됨(F6) | 구현 분리 또는 문서 정정 |
| BODY_RIG: 고정값과 다른 로컬 뼈 위치·스케일의 정밀 프로젝트는 오류로 차단 | Load는 차단. From File 경로는 통과(F2). `boneLayout` 삭제 시 통과(F7) | From File 경로 통합, 경고 추가 |
| README: Move는 끝점 IK, 각도 범위 이탈을 막고 늘리지 않음 | 범위·길이는 실측으로 보장됨. 다만 드래그 중 구성 급반전(F3)은 문서에 없음 | 연속성 개선 또는 제약 문서화 |
| README: 오른쪽 관절 슬라이더와 기즈모로 조정 | 기즈모 후 슬라이더 수치가 낡음(F4) | 패널 동기화 |
| THIRD_PARTY_NOTICES: 원본 이력은 `app/.git` | 저장소에 없음(F12) | 문구 정정 |
| README: "Playwright가 없는 일반 PC에서는 해당 경로를 환경에 맞게 바꿔야" | 경로 수정 없이 `NODE_PATH`만으로 동작(EXTERNAL_REVIEW 6.2가 정확) | README를 6.2 절차로 맞춤 |
| EXTERNAL_REVIEW §6.4: `check_cutscene_skill.mjs`는 Codex Python 의존 | 사실. 이 PC에서는 Codex Python이 있어 통과 | F10 개선 |
| REPOSITORY_HANDOFF: 49 모듈 빌드, 단위 테스트 8개, audit 2건 | 모두 일치 | — |
| EXTERNAL_REVIEW §4: 키 50–300cm, 3–12등신, 5/8/9.5 프리셋, 인물별 독립 | 실측·UI·저장 왕복 모두 일치(오차 ≤1e-6) | — |
| DESIGN: 깊이 PNG는 선형 Z 반전, near/far 기록, 컬러와 같은 카메라 | 일치(5개 화면비에서 크기·배경 마스크 일치, `render.near/far` 기록) | — |
| README: 편집 중 외부 API·인터넷 불필요 | 로드 후 오프라인에서 전 흐름 동작, 외부 요청 0건 | — |

## 기타 관찰(결함으로 분류하지 않음)

- 앞서 소스를 읽으며 **층 목록으로 인물을 바꿀 때 이전 관절 기즈모가 남는다고 의심했으나 재현되지 않았습니다.** `updatePropertiesPanel()`이 기즈모를 다시 붙여 Root에 정상 부착됩니다(R1 통과).
- 첫 실행에서 "갱신 직후 컷 카메라 ≠ 작업 카메라"(U2b)로 실패했지만 원인은 테스트 타이밍이었습니다. OrbitControls 감쇠가 프레임 기반(0.05/프레임)이라 SwiftShader 약 3fps에서는 손을 뗀 뒤에도 수 초간 시점이 흘렀습니다. 갱신은 클릭 시점의 카메라를 정확히 저장합니다(`ui/u2d-report.json`). GPU 30fps 환경에서는 약 3초 안에 멈추지만, 궤도 이동 직후 바로 갱신하면 최종 화면과 조금 다를 수 있습니다(UX 참고).
- Rotate 링을 허용되지 않는 축(팔꿈치의 Y 링 등)으로 돌리면 관절은 클램프되는데 기즈모 링 방향은 계속 돌아 최대 6.6° 어긋납니다(`rig/jump-report.json`). 시각적 문제이며 관절에는 영향이 없습니다.
- 극단 체형은 정확하지만 키 설정은 현재 최저점(발)을 유지합니다. 앞선 조작으로 두 다리가 들린 자세에서는 체형을 바꿔도 인물이 떠 있는 상태가 유지됩니다(문서 설계대로).
- 앱 내장 브라우저(800×600 기본 창)에서는 좌우 패널이 3D 뷰의 대부분을 가립니다. 1600×1000에서는 정상 배치였습니다.
- 성능: 예제 장면 기준 Iris Xe D3D11 약 30fps, SwiftShader 약 3fps입니다. 장시간 성능은 측정하지 않았습니다.

## 미검증 범위

- **미실행**: 물리적으로 네트워크를 끊은 콜드 스타트(Chromium 에뮬레이션이 루프백도 차단하는 환경 제약, 시스템 네트워크 설정은 바꾸지 않음), 외부 GLB 가져오기·복원·깊이 렌더(테스트 자산 없음), 실제 사람 손의 마우스 조작(CDP 실마우스 이벤트와 앱 내장 브라우저 조작으로 대체), Edge/Firefox, 고DPI·다중 모니터, 장시간 사용, LLM 소설 해석 품질과 최종 이미지 생성의 구도 보존.
- 원격 저장소 새 클론 대신 기존 클론(origin/main과 동일 커밋)과 `git archive HEAD` 사본으로 새 설치를 재현했습니다.
- `start.cmd`는 cmd로 실행해 서버 기동만 확인했고 더블클릭 UX는 확인하지 않았습니다. 포트를 환경 변수로 바꾸면 안내 문구는 여전히 3001을 표시합니다(경미).

## 수정 후 재검증

사용자 승인을 받아 F1·F2·F4·F5를 수정했습니다. 커밋하지 않았으며 작업 트리 변경입니다.

| 결함 | 변경 | 위치 |
| --- | --- | --- |
| F1·F2 | From File이 JSON을 직접 적용하지 않고 위쪽 Load와 같은 `studio.importText(text, file.name, false)`를 거치도록 변경. 검사 보고서 표시, 오류 시 미적용, 적용 실패 시 이전 상태 복원을 Load와 공유합니다. 단일 객체(`type: mannequin/importedModel`)가 아닌 JSON은 기존처럼 안내 후 무시하고, 문법 오류는 보고서로 표시합니다. | `app/src/main.js` `addMannequinFromPickedFile` |
| F4 | 기즈모 드래그 종료(`dragging-changed`, `value=false`) 시 `updatePropertiesPanel()`을 호출한 뒤 이력을 기록. 패널 수치와 기즈모 위치가 실제 관절값으로 다시 맞춰집니다. | `app/src/main.js` TransformControls 리스너 |
| F5 | 컷 삭제 시 삭제한 컷이 활성 컷보다 앞이면 `activeShot`을 1 줄인 뒤 범위를 제한. | `app/src/studio.js` `renderShots` |

재검증 결과(빌드 `vite build`, Node v24.22.2, Chrome+SwiftShader):

- 단위 테스트 8/8 통과, 기존 브라우저 검사 3종(`browser-check`, `validation-ui-check`, `body-rig-check`) 모두 `passed: true` — `validation/external-review/logs/41-fix-*.log`
- `validation/external-review/scripts/verify-fixes.mjs` 6개 항목 모두 통과, 페이지 오류 0건 — `validation/external-review/fixes/report.json`, `logs/42-verify-fixes.log`
  - F1: 손상 객체를 From File로 넣으면 `INVALID_TRANSFORM`·`INVALID_POSTURE` 보고 후 미적용, 층 수 유지, 3D 뷰 계속 렌더, 저장한 프로젝트가 Load에서 「입력 적용 완료」로 다시 열림(`fixes/f1-after-broken-fromfile.png`).
  - F1b: 문법 오류 파일은 `JSON_SYNTAX`(행·열 포함)로 보고되고 미적용.
  - F1c(회귀): 정상 객체는 기존처럼 추가되고 실행 취소로 제거되며 렌더가 유지됨.
  - F2: 늘어난 뼈 객체는 `BONE_LENGTH_LOCKED`로 거부되고 층 수 유지.
  - F4: 몸통을 기즈모로 2°→90° 회전한 뒤 패널이 90.00으로 갱신, 슬라이더 한 칸(←)에 89.5°로 0.5°만 이동(수정 전 87.5° 튐). `fixes/f4-after-slider-nudge.png`
  - F5: 2번 컷 「상자 너머」 선택 후 1번 컷을 삭제해도 활성 컷이 「상자 너머」로 유지, 저장된 `activeShot`도 일치.
- 수정 전 증거(`fromfile/`, `stale-panel/`, `ui/`)는 덮어쓰지 않았습니다.

## 후속 작업

- 즉시 수정할 항목: F1/F2/F4/F5는 수정·재검증 완료(커밋 대기). 남은 항목은 아래와 같습니다.
- 다음 고도화로 다룰 항목: F3(연속성 있는 IK), F6(최초 제안과 편집 환경 분리), F7(구형 리그 경고), F10(검증 도구 이식성), 단일 JS 청크 분할(906kB), Vite 메이저 업그레이드와 회귀 검증.
- 외부 환경/생성 모델 검증이 필요한 항목: 실제 오프라인 PC 콜드 스타트, 외부 GLB 자산, 생성 모델의 구도·포즈 보존 비교.
- 코드 변경 여부와 변경 파일: 검증 단계에서는 앱 코드를 바꾸지 않았고, 이후 사용자 승인으로 `app/src/main.js`, `app/src/studio.js`만 수정했습니다. **의존성 버전 변경 없음, commit/push 없음.** 추가된 추적 대상 파일은 이 보고서(`docs/EXTERNAL_REVIEW_REPORT.md`) 하나입니다. 나머지 검증 산출물(`validation/external-review/`, 약 99MB이며 대부분 한글 경로 사본의 `node_modules`)과 검증용 도구(`.review-tools/`: Node zip, Playwright)는 `.gitignore` 대상입니다.

## 실행 명령 요약

```powershell
# 저장소 최상위, 셸 PATH 앞에 D:\github\cutscene-studio\.review-tools\node 추가
npm --prefix app ci
npm --prefix app run build
node --test scripts/scene-format.test.mjs scripts/scene-feedback.test.mjs
node skills/cutscene-studio/scripts/scene.mjs info --app-root .
node skills/cutscene-studio/scripts/scene.mjs validate examples/example-scene.json --app-root .
npm --prefix app audit
npm install --prefix .review-tools --no-save playwright
$env:NODE_PATH = 'D:\github\cutscene-studio\.review-tools\node_modules'
node scripts/serve.mjs                         # 터미널 A (3001)
npm --prefix app run dev -- --port 3002        # 터미널 B (3002)
node scripts/browser-check.mjs
node scripts/validation-ui-check.mjs
node scripts/body-rig-check.mjs
node scripts/check_cutscene_skill.mjs
node validation/external-review/scripts/probe-rig.mjs
node validation/external-review/scripts/probe-jump.mjs
node validation/external-review/scripts/probe-ui.mjs
node validation/external-review/scripts/repro-fromfile-freeze.mjs
node validation/external-review/scripts/repro-stale-panel.mjs
node validation/external-review/scripts/probe-offline.mjs
```
