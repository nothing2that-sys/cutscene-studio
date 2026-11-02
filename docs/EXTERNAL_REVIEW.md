# 외부 검증 인계 문서

작성 기준: 2026-11-02. 대상은 이 문서가 포함된 로컬 컷신 스튜디오 소스입니다. 검증자는 먼저 실제 클론의 커밋을 기록하세요. 이 문서는 독립 검증의 요청서이며, 기존 개발 환경의 통과 기록을 새 환경의 통과로 간주하지 않습니다.

## 1. 프로젝트 목적과 사용자 흐름

소설의 삽화 순간을 LLM이 추천하고, 공간·인물·포즈·카메라·조명을 수치화한 장면 JSON으로 전달합니다. 사용자는 오프라인 3D 편집기에서 일부만 수정한 뒤 컬러·깊이 PNG를 촬영하고 캐릭터 정본과 함께 이미지 생성 도구에 전달합니다. 반복적인 포즈 검색·합성과 구도 재생성을 줄이는 것이 목적입니다.

흐름: 소설 → 외부 LLM/통합 스킬 → 장면 JSON → 입력 검사 → 로컬 편집 → 프로젝트 저장·캡처 → 이미지 생성 도구.

현재 편집기에는 LLM API와 최종 이미지 생성 API가 연결되어 있지 않습니다. LLM 작업은 외부 대화와 파일 전달로 수행합니다. 편집기 자체는 설치·빌드 후 인터넷 없이 사용하는 구조입니다.

## 2. 검증용 저장소 구성과 클론 경로

예정 경로는 `D:\github\<레포명>`입니다. 아래 명령의 `<레포명>`과 `<검증용-저장소-URL>`은 실제 값으로 바꾸세요. 현재 이 문서에는 배포 저장소 URL이 확정되어 있지 않습니다.

```powershell
New-Item -ItemType Directory -Force 'D:\github' | Out-Null
git clone <검증용-저장소-URL> 'D:\github\<레포명>'
Set-Location 'D:\github\<레포명>'
git rev-parse HEAD
git status --short
```

**저장소를 준비할 때 최상위 프로젝트 폴더 전체를 포함해야 합니다.** 현재 개발 폴더는 최상위에 Git 저장소가 없고 `app/.git`에 기반 프로젝트 이력이 있습니다. 이 내부 저장소의 origin은 `fanverseio/pose-toolkit`입니다. 기반 저장소만 클론하면 이번 확장과 바깥의 문서·검증 도구·스킬이 준비되지 않습니다.

최상위 저장소에 `app`을 일반 소스 폴더로 넣으려면 내부 `.git`이 별도 저장소나 gitlink로 등록되지 않도록 준비해야 합니다. 기존 내부 Git 이력은 보존한 별도 복사본에서 저장소를 구성하세요. 외부 검증 준비 과정에서 원본 저장소로 push하지 마세요. 외부 검증용 저장소는 `muzik1014/cutscene-studio` 비공개 저장소를 사용하며, 클론 시 파일 구성과 커밋을 확인하세요.

필수 포함 목록:

| 경로 | 용도 |
| --- | --- |
| `app/src`, `app/index.html`, `app/public` | 앱 소스와 정적 자산 |
| `app/package.json`, `app/package-lock.json`, `app/vite.config.js`, `app/LICENSE` | 재현 가능한 설치·빌드와 라이선스 |
| `scripts`, `start.cmd` | 실행 서버·검증·보조 도구 |
| `examples`, `prompts`, `skills/cutscene-studio` | 예제·LLM 지침·통합 스킬 원본 |
| `README.md`, `docs`, `THIRD_PARTY_NOTICES.md`, `research` | 설계·검증·출처 |

`.tools`, `app/node_modules`, `app/dist`, `validation`은 현재 최상위 `.gitignore`에서 제외됩니다. `dist`는 새로 빌드하고 `validation`은 재검증하면서 생성합니다. 기존 스크린샷과 보고서는 일반 클론에 없을 수 있으며, 필요하면 별도 검증 첨부물로 제공해야 합니다. `.review-tools`를 아래 절차로 생성한다면 검증용 로컬 의존성이므로 커밋 대상에서 제외하세요.

## 3. 새 Windows 환경에서 실행

준비물: Git, Node.js 20.19 이상인 20.x 또는 22.12 이상과 npm, WebGL 사용 가능한 브라우저. Vite 8.3.5로 갱신했으며 검증 환경은 Node.js 24.22.2입니다. 자동 브라우저 검증에는 Google Chrome도 필요합니다. Node.js 버전은 `node --version`으로 기록하고, 설치 성공 여부는 아래 명령으로 판단하세요. Python은 앱 실행과 핵심 테스트에 필요하지 않습니다.

저장소 최상위에서 실행합니다.

```powershell
node --version
npm --version
npm --prefix app ci
npm --prefix app run build
.\start.cmd
```

브라우저에서 `http://127.0.0.1:3001`을 엽니다. 서버 종료는 Ctrl+C입니다. 최초 의존성 설치에는 인터넷이 필요합니다. `start.cmd`는 빌드가 없으면 안내 후 종료하며 자동 설치하지 않습니다. npm PowerShell 실행 정책 오류가 나면 동일 명령에서 `npm` 대신 `npm.cmd`를 사용하세요.

대안 실행은 `node scripts/serve.mjs`입니다. 서버는 기본적으로 `127.0.0.1:3001`에 바인딩하고 `app/dist`를 제공합니다. 포트 충돌은 기존 서버를 확인하세요. 자동 테스트는 3001/3002를 고정 사용하므로 임의 포트 변경 시 테스트도 맞춰야 합니다.

## 4. 구현 범위와 데이터 기준

| 영역 | 현재 동작 | 검증 시 경계 |
| --- | --- | --- |
| 장면 제안 | 방·인물·소품·카메라·조명·저장 컷 JSON | LLM의 소설 해석 품질은 별도 평가 |
| 입력 검사 | 문법·자료형·범위·지원 필드·중복 ID·관절 검사, 오류/경고 표시 | 구조 검사가 실제 시각적 타당성을 보장하지 않음 |
| 오류 복구 | 오류는 적용 차단, 원문·경로를 포함한 수정 요청 복사/보고서 저장 | 잘못된 입력 후 기존 장면 보존을 확인 |
| 체형 | 인물별 키 50~300cm, 3~12등신, 5/8/9.5 프리셋 | 중립 기립 키/머리 높이; 머리 크기와 전체 스케일 조절 |
| 포즈 | 관절 회전 제한·제약 IK, 뼈 오프셋·스케일 고정 | 몸통·팔다리 상대 길이 배분은 기존 리그; 외부 GLB에 동일 기능 보장 안 됨 |
| 관절 | 팔꿈치·무릎 0~150도 힌지, 기타 관절별 범위 | 단순 축별 범위이며 인체 충돌·평형 모델 아님 |
| 촬영 | 작업 카메라/저장 촬영 카메라 분리, 컬러/선형 깊이 PNG | 여러 컷이 동일 포즈·공간 공유 |
| 저장 | 정밀 관절·체형·고정 길이·공간·컷·이미지 전달 묶음 | 자동 저장·장애 복구를 검증했다고 가정하지 말 것 |

장면 제안은 `version:1`, `units:"meters"`, Y-up 오른손 좌표계입니다. `actors[].height`는 미터, `headUnits`는 등신, `yaw`와 의미상 관절 각도는 도입니다. 인물 위치는 포즈 적용 후 인체 최저점 기준이며 소품 위치는 바닥면 중심입니다. 초기 JSON 최대치는 인물 12명·소품 80개·컷 24개입니다.

정밀 프로젝트의 `mannequins`와 `importedModels`, 전달 묶음의 `editorState`가 **실제 편집 결과**입니다. `studio.document`는 현재 환경·제목 등을 담고 인물·소품 정의는 초기 제안이므로 실제 변환은 정밀 배열을 따릅니다. 최초 제안은 별도 `studio.initialProposal`/`proposal`에 보존합니다. `proposalOrigin: legacy-current-state`는 구형 파일을 연 시점의 값으로 최초 원본을 복원한 것이 아닙니다. 정밀 리그 변환의 라디안/Euler 순서와 장면 제안의 도 단위를 혼동하지 마세요.

`bodyProfile`은 키·등신이고 `boneLayout`은 포즈 중 유지할 길이·스케일 기준입니다. 파일의 길이 변조 검사는 이 기준과의 불일치를 검사하는 기능이며, 파일과 기준을 동시에 바꾸는 공격을 막는 보안 기능은 아닙니다.

## 5. 코드 읽기 순서

| 파일 | 검토 포인트 |
| --- | --- |
| `app/src/scene-format.js` | 표준 장면 포맷·관절 범위·기본 포즈·전체 오류 수집 |
| `app/src/scene-feedback.js` | 입력 종류 판별·정밀 프로젝트 사전 검사·원문 보존 |
| `app/src/validation-panel.js` | 오류/경고 UI·복사 실패 대안·보고서 |
| `app/src/body-rig.js` | 키/등신 계산·관절 제한·길이 고정·제약 IK |
| `app/src/main.js` | 선택·기즈모·수치 입력·이력·저장/복원 |
| `app/src/studio.js` | 장면 적용·공간/빛·촬영 카메라·캡처·전달 묶음 |
| `scripts/serve.mjs` | 루프백 정적 서버·요청 경로 처리 |
| `skills/cutscene-studio/scripts/scene.mjs` | 앱 탐색·검증·실제 편집 상태 검사·PNG 추출 |

상세 문서: [설계](DESIGN.md), [JSON 검사](JSON_VALIDATION.md), [체형·관절](BODY_RIG.md), [기존 검증](VALIDATION.md), [스킬 통합](SKILL_INTEGRATION.md), [출처](../THIRD_PARTY_NOTICES.md).

## 6. 자동 검증 재현

모든 테스트는 저장소 최상위에서 실행하세요. 아래 실행 순서를 지켜야 선행 테스트의 산출물을 사용할 수 있습니다.

### 6.1 순수 포맷·피드백 검사

```powershell
node --test scripts/scene-format.test.mjs scripts/scene-feedback.test.mjs
node skills/cutscene-studio/scripts/scene.mjs info --app-root .
node skills/cutscene-studio/scripts/scene.mjs validate examples/example-scene.json --app-root .
```

현재 단위 테스트는 9개입니다. 새 클론에서도 실행 로그와 실제 개수를 기록하세요.

### 6.2 브라우저 테스트 준비

현재 검사 스크립트는 `scripts/playwright-runtime.mjs`에서 일반 모듈 검색 경로와 프로젝트의 `.review-tools`를 탐색합니다. Node 실행 파일의 위치나 Codex 설치 경로에 의존하지 않습니다.

```powershell
npm install --prefix .review-tools --no-save playwright
node --input-type=module -e "import {loadPlaywright} from './scripts/playwright-runtime.mjs'; console.log(!!loadPlaywright().chromium)"
```

Chrome 채널을 사용하므로 Chrome을 설치하세요. 스크립트는 Playwright 기본 Chromium을 선택하지 않습니다. WebGL/SwiftShader 실행 가능 여부도 환경에 따라 확인해야 합니다. 의존성 오류나 브라우저 시작 실패는 앱 기능 실패와 구분하여 보고하세요.

### 6.3 서버와 테스트

터미널 A: 빌드 완료 후 `node scripts/serve.mjs` 실행(3001).

터미널 B: 체형 엔진의 소스 모듈 검사에 필요한 Vite 서버 실행(3002).

```powershell
npm --prefix app run dev -- --port 3002
```

터미널 C: 저장소 최상위에서 다음 순서로 실행합니다. 별도의 `NODE_PATH` 설정이 필요하지 않습니다.

```powershell
node scripts/browser-check.mjs
node scripts/validation-ui-check.mjs
node scripts/body-rig-check.mjs
node scripts/ik-continuity-check.mjs
node scripts/review-regression-check.mjs
```

| 검사 | 핵심 확인 | 생성 근거 |
| --- | --- | --- |
| `browser-check.mjs` | 편집·되돌리기·저장/재열기·캡처·외부 요청 | `validation/browser-report.json`, PNG·프로젝트·`handoff.json` |
| `validation-ui-check.mjs` | 다중 오류·원문 복사·적용 차단·경고·클립보드 대안 | `validation/json-feedback/browser-report.json` |
| `body-rig-check.mjs` | 지오메트리 키/등신·80개 포즈·관절 제한·뼈 고정·저장 | `validation/body-rig/report.json`, `editor.png` |

정상 종료 코드와 JSON 결과를 확인하고 PNG를 실제로 열어 보세요. 체형 테스트는 180cm/5·8·9.5등신 및 140cm/5등신을 측정합니다. 기존 결과의 길이 허용오차는 대체로 1e-6, 일반 저장 왕복 비교는 1e-8입니다. 개별 assertion을 기준으로 판정하세요. 테스트는 로컬 `validation` 산출물을 갱신하므로 이전 결과가 필요하면 별도 보관하세요.

### 6.4 통합 스킬의 이식성 확인

프로젝트 내부의 스킬 도구는 `--app-root .`로 실행하면 기존 PC 경로 없이 검증할 수 있습니다. `skills/cutscene-studio/references/runtime.json`에는 개발 PC의 절대 경로가 남아 있습니다. 앱 탐색 순서는 명시 경로 → 현재 작업 폴더와 상위 → runtime 기록 → 번들 스키마 폴백입니다. 독립 환경에서 실제로 어떤 스키마를 사용했는지 출력으로 확인하세요.

`scripts/check_cutscene_skill.mjs`는 `validation/handoff.json`이 없으면 추적된 프로젝트 fixture와 합성 1픽셀 PNG로 추출·상태 우선순위를 검사합니다. 보고서의 `packetSource`로 실제 촬영물 검사와 구분하세요. Python은 `PYTHON` 실행 파일 설정 → `python`/`py -3`에서 찾고, 없으면 선택 갤러리 항목만 `skipped`로 보고합니다. 핵심 Node 검사는 계속 실행합니다. 스킬은 앱 실행에 필수 설치 항목이 아닙니다.

## 7. 수동 검증 체크리스트

- [ ] 네트워크를 끊은 상태에서 예제 불러오기·포즈 변경·저장/열기·컬러/깊이 캡처가 되는가?
- [ ] 인물 A 180cm/5등신, B 165cm/9.5등신 설정이 서로 독립적이고 저장 후 유지되는가?
- [ ] 관절을 마우스로 직접 Move/Rotate하고 수치 입력도 했을 때 뼈 길이가 늘어나지 않는가?
- [ ] 팔꿈치·무릎 옆 꺾임, 각도 초과, 멀리 있는 IK 목표를 올바르게 제한하는가?
- [ ] 극단 포즈·키·등신 조합에서 튐/NaN/반전/조작 불능이 생기는가? 정확한 조합을 기록했는가?
- [ ] 체형 변경·포즈 편집·실행 취소/다시 실행·저장/열기를 조합해도 상태가 보존되는가?
- [ ] 잘못된 단위·미지원 필드·중복 ID·관절 초과·깨진 JSON·늘어난 정밀 뼈 입력을 거부하는가?
- [ ] 오류에는 필드 경로가 있고 수정 요청에 원문이 보존되며 기존 편집 결과가 유지되는가?
- [ ] 검사만 누르면 장면이 바뀌지 않고, 경고만 있는 입력은 의도대로 적용 가능한가?
- [ ] 작업 시점을 움직여도 저장된 촬영 컷은 유지되고, 갱신 시에만 의도대로 바뀌는가?
- [ ] 컬러·깊이 캡처의 카메라·화면비가 같고 기즈모·격자·선택 강조가 빠지는가?
- [ ] 전달 묶음의 실제 수정 상태가 최초 제안과 구분되고 추출 PNG가 원본과 일치하는가?
- [ ] 한글 경로 `D:\github\<레포명>`에서 새 설치·빌드·시작·저장이 가능한가?

자동 검사는 직접 마우스 기즈모 조작의 모든 경우를 대체하지 않습니다. 실제 드래그·선택 전환·극단 각도는 수동으로 추가 검증하세요.

## 8. 기존 증거와 미검증 범위

개발 환경에서 빌드, 단위 검사 8개, 일반 브라우저 흐름, JSON 오류 UI 11항목, 체형 측정/80개 포즈/뼈 길이 보존 테스트의 통과가 기록되어 있습니다. 이 문서 작성 중 기존 소스·보고서를 대조하고 포맷·피드백 단위 검사 8개를 다시 실행해 통과했습니다. 전체 브라우저 검증을 새로 수행한 것은 아닙니다. 구형 `docs/VALIDATION.md`에는 11월 1일의 46모듈 빌드 기록이 남아 있으므로 최신 체형 구현 이후 빌드와 구분하세요.

우선 검토할 미확인/제한 항목:

1. 독립 PC·드라이버·브라우저·한글 클론 경로의 설치 재현성.
2. 실제 마우스 드래그 중 IK 안정성, 연속 편집/이력, 극단 체형, 장시간 성능.
3. JSON 입력 전반과 비동기 GLB 복원의 실패 시 상태 보존·자원 정리.
4. 외부 GLB의 스키닝·모프·재질 및 깊이 렌더 호환성.
5. 접촉·접지·자기 충돌·시선·무게중심은 자동 해결하지 않음.
6. 컷별 포즈 분리, OpenPose/VRM, 생성기 직접 연결은 미구현.
7. Vite 빌드는 단일 JS 청크 500kB 초과 경고가 있었음. 성능 측정과 빌드 실패는 구분.
8. 최종 이미지가 구도/포즈를 보존하는지에 대한 실제 생성 모델 비교는 미검증.

공개 배포 전 출처·라이선스 고지를 함께 검토하세요. 기반은 pose-toolkit/Mannequin.js의 GPL-3.0이며 Three.js/Vite 등의 고지가 포함됩니다. 다른 조사 프로젝트는 참고 대상으로, 코드 복사를 했다는 의미가 아닙니다.

## 9. 외부 검증 AI에 전달할 요청문

다음 문장을 저장소 위치와 함께 전달하면 됩니다.

> `D:\github\<레포명>`의 로컬 컷신 스튜디오를 독립 검증해 주세요. 먼저 `docs/EXTERNAL_REVIEW.md`와 실제 소스를 읽고 커밋·실행 환경을 기록하세요. 목적은 소설 기반 장면 JSON을 로컬 3D에서 수정하고 작화 참조로 캡처하는 도구입니다. 새 설치부터 빌드·스키마 검사·오류 복구·인물별 키/등신·관절 범위/뼈 길이 고정·IK·저장 왕복·촬영/전달 묶음까지 검증해 주세요. 문서상 주장과 실제 구현을 구분하고, 자동 검사 외에 마우스 조작과 극단값도 확인하세요. 근거 없이 통과 처리하지 말고 실행 못 한 항목은 이유와 함께 남겨 주세요. 발견 사항은 심각도·파일/행·재현 절차·기대/실제 결과·증거로 작성하고 `docs/EXTERNAL_REVIEW_REPORT_TEMPLATE.md` 형식으로 보고해 주세요. 우선 검증 보고서와 수정 제안을 작성하고, 코드 변경은 별도 요청이 있을 때 진행해 주세요.

