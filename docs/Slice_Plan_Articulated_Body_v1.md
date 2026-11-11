# Slice Plan — 작화 인체 v1 완성

**문서 상태**: 전체 계획 2판 — 게이트 1 승인, 새 맥락 계획 검토 조건 반영, 게이트 2 승인 완료. 승인된 묶음 착수 범위에 한해 효력 있음.

**정본**: 이 대화의 사용자 요구(2026-11-03), `docs/DESIGN.md`의 기존 편집기 계약, 첫 인체 원본 `9884.png`. 이 계획서는 기존 편집기 계약을 대체하지 않는다. P015는 다른 자세의 교차 검증 자료다. `docs/BODY_REDESIGN_PLAN.md`와 시제품 보고서는 과거 근거이며 최종 품질 승인 규격이 아니다. 사용자는 이 기준 관계를 포함한 범위를 승인했다.

**대상 저장소**: `D:\github\cutscene-studio` — `git rev-parse --show-toplevel`로 확인.

**HGLOS 출처**: `D:\github\hglos\plugin\hglos\ENTRY.md`, `RULES.md`, `HOST.md`, `COORDINATION.md`, `skills/hglos-design/SKILL.md`, `references/plan-items.md`, `assets/slice-plan-template.md`. 스킬 소스를 직접 읽어 적용하며 설치·자동 발견·hook 활성화를 완료했다고 주장하지 않는다.

**승인**: 범위 — 사용자(이름 미제공), 2026-11-03, **“범위 승인 — 메인 편집기 통합까지”**. 계획·M1–M4 묶음 착수·계획서 커밋 — 사용자(이름 미제공), 2026-11-03, **“전체 계획·묶음 착수 승인 + 계획서만 커밋 허용”**. 제품 코드 커밋·푸시 허가는 포함하지 않음.

> 기존의 “진행해줘”, “더 개선해줘”, “HGLOS로 계획해줘”는 이 초안의 범위·전체 계획 승인으로 전용하지 않는다. 부위별 사용자 확인을 반복하지 않고 HGLOS의 범위·계획·종결 승인 단위를 사용한다.

## 1. 닫는 운영 주장

사용자가 메인 편집기에서 기준 전신 인체를 불러와 3D로 자세·방향·구도를 잡고, 앵글을 고정해 자연스럽게 연결된 2.5D 작화 선화로 이동·확대·축소하며, 손발 세부는 인물 설명으로 전달하고, 같은 상태를 저장·복원·작화 전달할 수 있다.

**이번 완성의 경계**:

- “추가 시제품을 보여줬다”가 아니라 메인 편집기의 실제 사용 흐름이 닫혀야 한다.
- 기준 체형과 공통 리그·파라미터 계약을 고정한다. 새 참고 포즈마다 별도의 전용 모델·별도 기본 실행 경로를 계속 추가하지 않는다.
- 첫 원본은 얼굴 없는 작화 인체의 외형·관절·연결선 목표다. P015는 같은 제작 구조가 다른 자세에서도 유지되는지 검증한다. 두 그림의 모든 화면 좌표를 동시에 강제로 일치시키는 것이 목표는 아니다.
- 포즈와 카메라를 먼저 구분한다. 2D에서 닮아 보이게 하려고 골반 방향·발 앞뒤·관절 굽힘·발목 방향을 왜곡한 상태는 완료가 아니다.
- 최종 결과는 고정된 검수 묶음과 하나의 통합 판정표로 제시한다. 개선 부위 하나마다 사용자 확인을 받는 흐름은 종료한다.

## 2. 종결 조건 + 판정 수단 + 미달 예시

아래 범위 조건은 승인됐다. 실행 계약과 수치 기준은 6절에 구체화한다. 새 측정에 맞춰 임계값을 낮추지 않는다. 지금 이 표는 통과 보고가 아니다.

| ID | 종결 조건 | 판정 수단 | 미달 예시 |
| --- | --- | --- | --- |
| V1-SHAPE | 원본의 인체 비례와 어깨→상완, 흉곽→허리→골반, 고관절→허벅지, 무릎→종아리 흐름이 자연스럽게 이어지고 관절을 읽을 수 있다. | 고정 프레임·동일 포즈의 원본/무광/실루엣/선화 대조, 주요 영역별 측정, 구현 맥락 밖 검증자의 외형 판정. 마지막에 전체 결과를 한 번에 사용자 검수. 지표 하나로 시각 판정을 대체하지 않는다. | 허리가 잘린 통처럼 보임, 골반이 겹친 바지 조각처럼 보임, 무릎 덮개가 따로 뜸, 팔다리가 원통처럼 뭉침. 저장 테스트가 통과해도 이 항목은 미달. |
| V1-POSE | 골반·흉곽·다리의 3D 방향, 무릎/팔꿈치 굽힘과 기준 포즈의 앞뒤 관계가 일관된다. | 기준 포즈의 실제 변환·세계 앞 방향·손발 깊이를 확인하고 정면·측면·후면·사선을 같은 저장 상태에서 재현한다. 숨은 깊이는 추정으로 명시한다. | 골반은 정면인데 상체만 회전, 오른발 앞이라고 표시했지만 실제 깊이는 뒤, 접촉 보정이 손목/발목 목표를 조용히 밀어냄. |
| V1-CONTACT | 등록된 자세·가동 구간에서 연결구의 의도된 맞물림 외에 눈에 띄는 외피 침투·탈락·틈이 없다. 지정한 지지점과 목표점이 보존된다. | 허용 접합 영역을 먼저 고정하고 실제 표시 메시의 접촉/교차·연속 조작을 검사한다. 정점 검사에만 의존하지 않고 얇은 면 교차와 급격한 접힘도 검수한다. 기준 지지점의 오차 허용값은 계획 승인 전에 고정한다. | 검사 마스크를 넓혀 관통을 숨김, 볼 관절이 외피 밖으로 빠짐, 다리를 크게 꺾자 몸통이 뚫림, 포즈가 튀거나 목표점이 이동함. |
| V1-LINE | 고정 선화의 외곽·몸통 연결선·관절선이 자연스럽고 실제 3D의 가림과 일치한다. | 같은 장면/카메라의 3D·선화·가림을 대조하고 고정 모드 전환·복귀·확대·이동 후 정렬을 확인한다. 소스 이미지를 모델 출력에 덧그려 통과시키지 않는다. | 관절 이중 테두리, 허리선 단절, 삼각형 면 잡선, 뒤쪽 선이 앞에 나타남, 3D 복귀 시 위치가 바뀜. |
| V1-EDITOR | 메인 편집기에서 추가→포즈/구도 편집→앵글 고정→저장/재열기→작화 전달을 사용할 수 있다. | 실제 앱에서 저장된 기준 장면을 다시 열고 동일 상태·카메라로 출력한다. 복수 인물·소품이 있는 기준 장면의 가림도 검증한다. | 비교 페이지에서만 작동, 메인 앱은 이전 인체만 사용, 저장 후 리그/카메라/설명이 달라짐, 다른 물체와 가림이 깨짐. |
| V1-DATA | 기존 프로젝트·포즈·Undo/Redo·카메라 컷·인물 설명·컬러/깊이 출력 계약을 보존한다. 체형/리그가 다르면 명시적으로 처리한다. | 기존 파일의 마이그레이션 또는 기존 표시 유지, 새 저장 왕복, 오류 입력의 상태 불변, 컬러/깊이/설명의 같은 현재 상태 참조를 대조한다. | 파일이 열리지만 포즈가 바뀜, 다른 체형을 같은 것으로 읽음, 설명 누락, 컬러와 깊이가 다른 자세/앵글. |
| V1-PERF | 유휴와 고정 장면의 팬·줌은 캐시를 사용하고, 변경이 있는 때만 필요한 투영을 갱신한다. 지원 성능 범위가 측정으로 정해진다. | 동일 해상도·환경·장면에서 기존/새 인체의 렌더·재투영·포즈 변경 비용, 호출 수·면 수·메모리를 측정한다. 기준 장면·허용값은 새 측정 전에 확정한다. | 매 프레임 재투영, 확대만 해도 선화 재생성, 인물 수가 늘자 무제한 비용 증가, 호출 수만 적다고 반응성 미달을 통과 처리. |
| V1-VERIFY | 외형·포즈·기능·성능의 통합 판정이 독립 검증에서 닫히고 사용자가 최종 채택한다. | 승인된 계획과 동결 기준으로 HGLOS 모드 B 종결 검증. 새 맥락 검증자가 결과를 재현하고 미달/재현 못 함/제한을 기록한다. | 구현자의 자체 테스트만으로 완성 선언, 과거 로그 재사용, 미검증을 통과로 변경, 반복 상한 뒤에도 끝없이 검증만 추가. |

### 검수 대상을 고정하는 원칙

첫 원본의 전신 자세와 골반/발 앞뒤, P015의 한 손 허리 자세, 중립 다면 보기, 팔 올림, 한 걸음, 쪼그림, 무릎꿇기, 허리 비틀기, 큰 팔꿈치/무릎 굽힘을 후보 묶음으로 고정한다. 실제 포즈 ID·포함 집합·미지원 항목은 범위 승인 후 실행 스크립트로 대조하여 잠근다. 전수 완료·항목 수는 아직 주장하지 않는다.

평가 기준/원본/기대 집합/판정 코드는 구현자의 수정 범위와 분리해 고정해야 한다. 일부러 틀린 앞뒤 관계·벌어진 연결부·잘못된 저장 상태 등 실패 입력에서 검사가 실제로 실패하는지 먼저 확인한다. 같은 사람/모델이 바꾼 기준으로 자기 구현을 통과시키지 않는다.

### 끝나는 방식

- 모든 조건이 통과하고 독립 종결 판정과 사용자 전체 검수가 성립하면 v1을 닫는다.
- 미달이 있으면 해당 ID와 근거를 하나의 묶음으로 보고한다. 기능이 통과했다는 이유로 외형 미달을 면제하지 않는다.
- HGLOS 변경분 검증은 정해진 회차 상한을 따른다. 수렴 정지·효용 정지·예산 정지를 구별하고 상한을 임의로 늘리지 않는다.
- 예산/전제 반증으로 끝낼 때는 “완료”가 아니라 미달/미검증과 재설계 필요를 기록한다. 작업별 시간·재작업 예산과 종료 일정은 전체 계획에서 고정한다.

## 3. 하지 않을 것

- 손가락·발가락·손발톱의 상세 해부학 조형. 동작과 접촉을 읽는 단순 손발을 두고 세부는 인물 설명에 맡긴다.
- 얼굴·표정·머리카락·의상 생성, 아동형·모든 성별/체형/등신의 신규 지원 확장.
- 원본 그림의 유일한 실제 카메라·숨은 3D 형상 복원, 픽셀 완전 일치 보장.
- 임의의 모든 자세에서 무관통·균형을 보장하는 전신 물리 시뮬레이션. 이번에 등록한 자세와 가동 범위로 한정한다.
- 갤러리의 추가 이미지 수집, 이미지 일괄 다운로드, 기존 대규모 참고 이미지 전체의 신규 자동 변환.
- 포즈별 전용 시제품·별도 체형 분기를 계속 추가하며 목표를 옮기는 것.
- OpenPose/VRM/외부 생성기 연결, 유료 API 호출, 클라우드 배포, 저장소 전체 리팩터링.
- 사용자 지시 없는 커밋·푸시, 기존 미커밋 변경 삭제, 스킬 전역 설치·hook 설정 변경.

## 4. 보존 범위 — 관측자별

| 관측자 | 바뀌면 안 되는 것 | 확인 수단 |
| --- | --- | --- |
| 기존 장면/포즈 사용자 | 기존 프로젝트·라이브러리·관절·배치·카메라·설명. 새 인체 전환으로 원본 저장 파일을 무단 재작성하지 않는다. | 기존 파일을 복사본에서 열어 변환/표시 경로와 저장 왕복을 비교. 차이는 사전 승인된 마이그레이션 계약으로만 허용. |
| 편집 사용자 | 직접 조작, Undo/Redo, 선택·단독 보기·카메라 컷, 기존 표시로 돌아갈 수 있는 경로. | 메인 앱의 전체 사용 시나리오와 기존 회귀 검사. |
| 작화 전달 수신자 | 현재 상태의 인물·구도·가림·컬러/깊이 정렬과 손발 설명. | 현재 장면 출력과 전달 묶음/지시문의 직접 대조. |
| 레퍼런스 권리자/자료 보관자 | 원본 PNG의 로컬 참고 경계. 갤러리 원본/가공본을 앱 배포물·문서에 복제하지 않는다. | 참조 해시·경로와 출력/번들 검토. 문서에는 새 모델의 렌더만 사용. |
| 같은 작업 폴더의 다른 작성자 | 기존 수정, 저장 장면, 첨부자료, 작업 외 스킬 파일. | 착수 전 dirty/미추적 파일 스냅샷과 범위별 전후 해시/차이 검토. |

## 5. 사라지는 것

- 비교용 시제품에서만 새 인체와 선화를 쓸 수 있고 메인 편집기에서는 사용할 수 없는 상태.
- 원본 포즈 하나마다 새 모델·새 기본 분기를 추가하는 운영 패턴. 승인된 기준 체형/파라미터와 공통 리그로 모은다.
- 작은 도형 수치를 고친 후 사용자에게 매번 모양 확인을 넘기는 진행 방식.
- 기능 검사나 관절점 일치 수치를 외형 완성 판정으로 쓰는 설명.
- 기존 별도 실험 파일을 제품 정본처럼 동시에 유지하는 혼선. 이전 실험·이미지·보고는 삭제하지 않고 과거 기록으로 구분한다.
- 참고 이미지용 보조 서버가 실제 인체 편집/촬영의 필수 조건인 상태. 원본 참고는 로컬 파일 선택 등으로 분리한다.

## 6. 검증 가능 전제

### 실행 환경과 전제

아래 명령은 저장소 루트의 PowerShell에서 실행한다. `N=.review-tools/node/node.exe`, `P=.review-tools/pose-python/python.exe`라는 표기는 경로 약칭이며 실제 호출은 `& <경로> ...`로 한다. 공통 환경은 Windows, PowerShell Core 7.6.5, UTF-8, Node v24.22.2, Python 3.12.10이다. 앱/성능 명령은 동일 Chrome·GPU 모드·1280×960 viewport·DPR 1에서 실행한다. 런타임 서버/브라우저의 loopback 권한은 실제 도구 결과를 따르며 필요한 실행만 승격한다.

| 전제 / 출처 | 측정 방법(실행 명령/조회) | 환경 | 사전 기준 | 결과 |
| --- | --- | --- | --- | --- |
| 경로·복구 기준 / Git | `git rev-parse --show-toplevel`; `git rev-parse HEAD`; `git status --short` | 공통 | 대상 루트 일치, 기존 변경 삭제 금지 | 루트 일치. HEAD `a9be29905f9d74d8819212308f51f9a982aae1b8`. tracked 수정과 untracked 시제품 존재. HEAD 단독 복구 불가. |
| 로컬 도구 / 실행 파일 | `& .review-tools/node/node.exe --version`; `& .review-tools/pose-python/python.exe --version` | 공통 | 설치된 도구로 실행, 외부 설치 불필요 | 위 버전 실측. |
| 메인 인체 교체 경계 / 실제 소스 | `Get-Content app/src/body-surface.js`; `Get-Content app/src/body-rig.js`; `Get-Content app/src/human-skin.js` | 공통 | 기존 리그·저장 계약 유지 가능한 어댑터 경계 | body-surface의 인체/rig 교체 경계 있음. 기존 driver와 시제품의 축·힌지·단위가 다름. 그대로 삽입 불가. |
| 고정 선화 / 실제 소스 | `Get-Content app/src/doll-fixed-view.js`; `Get-Content app/src/doll-line-contours.js`; `Get-Content app/src/view-performance.js` | 공통 | 장면 단위 가림·변경 무효화 필요 | 단일 시제품 캐시와 메인 유휴 렌더 제어 존재. 복수 인물·소품 통합 성립은 측정 불가(R-CACHE). |
| 기존 저장 계약 / 원본 테스트 | `& .review-tools/node/node.exe --test scripts/scene-format.test.mjs` | 공통 | 기존 검사를 수정하지 않고 통과 | 설계 전제 실측 exit 0, pass 3 / fail 0. `validation/hglos-articulated-body-v1-plan-20261103-r1/scene-format-baseline.txt`. O0에서 수정 전 다시 확인. |
| 빌드 / 앱 | `& .review-tools/node/node.exe .review-tools/node/node_modules/npm/bin/npm-cli.js --prefix app run build` | 공통, dist 쓰기 직렬 | 종료 0; 참고 원본 PNG의 배포 제외는 별도 판정 | 실측 exit 0, 10.57초. 큰 chunk 경고 있음. `build-baseline.txt`는 도구 결과 요약이며 실행 전문이 아님. 현재 dist에 body-study/reference.png가 있어 배포 제외는 미달; M4에서 닫음. |
| 브라우저/GPU 성능 / 실제 장면 | `& .review-tools/node/node.exe validation/body-v1-oracle/run.mjs --case baseline --base-url http://127.0.0.1:3001 --viewport 1280x960 --dpr 1 --out validation/body-v1-O0/perf-baseline` | 공통 viewport, renderer/GPU 정보 기록 | 아래 성능 예산; 동일 환경 A/B | 측정 불가(R-PERF): 이 runner는 O0 작성 예정. 기존 performance-check.mjs는 port3002·1600×1100·고정 출력이므로 이번 측정에서 사용하지 않음. |
| 원본 경계 / 로컬 파일 | `Get-FileHash .review-tools/gallery-one/full_single_P015_front.png -Algorithm SHA256`; `Test-Path app/public/body-study/reference.png` | 공통 | P015 해시 고정, 원본은 로컬 참고만 | P015 기준 SHA256 `51f54ceb4d8115f6e29a36a9583a88f896314304101ca035091a1d30394e80aa`; 첫 원본 경로 확인. O0 재대조. |
| 독립 실행 / 호스트 도구 | `Get-Command claude,agy -ErrorAction SilentlyContinue`; 네이티브 `spawn_agent` capability 조회 | 공통 | 새 맥락 검토 가능; 신원 추정 금지 | 명령 조회에서 claude/agy 결과 없음. 네이티브 새 맥락 계획 검토 실제 수행. 모델의 정확한 배포 ID·버전 미확인. 외부 회사 송신 없이 네이티브 경로 사용. |

### 승인할 판정 계약 — 구현 전 동결

다음 값은 **제안하는 합격 기준**이며 현 구현의 측정 결과가 아니다. O0 담당자가 이 계획을 실행 가능한 `validation/body-v1-oracle/`의 계약·고정 fixture·검사로 옮긴다. 이후 모델/앱 구현자는 이 경로를 수정할 수 없다. O0와 구현을 서로 다른 새 맥락으로 분리한다. 오라클 담당자는 앱 소스를 변경하지 않는다. 기준 부족을 발견하면 미달/측정 불가로 돌려 보내며 느슨한 기준을 임의로 추가하지 않는다.

- **기준 집합**: `ref-original`, `ref-p015`, `neutral-front`, `neutral-side`, `neutral-back`, `neutral-oblique`, `arms-up`, `step`, `squat`, `kneel`, `waist-twist`, `elbow-flex`, `knee-flex`. source별 포즈·카메라·체형·허용 접합 영역을 fixture로 고정한다. 스크립트의 expected/observed 집합 차이가 비어 있어야 포함 완료다. 손발 세부는 제외하되 손바닥/발바닥 방향·끝점·지지는 포함한다. 접힘 fixture는 해당 리그의 **문서화한 지원 한계**에서 만들고 중립→목표를 관절별 5도 이하 간격으로 검사한다. 기존보다 지원 범위를 줄이는 경우 자동 통과 불가, 계획 이탈로 보고한다.
- **형태**: 원본의 인물 높이로 정규화한다. ref-original의 머리 높이·어깨 폭·허리 폭·골반 폭·상완/전완/허벅지/종아리의 중간 폭은 표시한 원본 길이 대비 상대오차 10% 이내, 관절 중심 재투영 오차는 인물 높이의 2% 이내. 가려진 단면은 추정으로 표시하고 수치 대상에서 제외한다. 화면 맞춤은 카메라·전체 스케일/이동만 허용, 부위별 2D 변형은 금지. P015는 별도 체형 피팅 대신 공통 구조의 방향·접촉·선화 검증에 사용한다. 수치 통과와 별도로 독립 검증자가 2절 SHAPE의 각 연결 영역을 동일 프레임 시트에서 통과/미달 판정한다. 하나라도 미달이면 전체 외형 미달이다.
- **포즈/접촉**: 저장된 pelvis/chest world basis와 다리 깊이 순서를 기대 값과 대조한다. 원본의 오른발 앞·왼발 뒤 관계는 카메라 기준 부호가 fixture와 일치해야 한다. IK 목표/지정 지지점의 보정 전후 변화는 인물 높이의 0.5% 이하, 저장 왕복 관절각 차이 0.01도 이하, 위치 0.1mm 이하. 의도된 접합을 제외한 외피 침투 깊이/연결 틈은 인물 높이의 0.2% 이하. 실제 변형된 메시의 정점 내부/면·모서리 교차 및 몸통 자체 접힘을 검사하고, 허용 접합 영역은 부위 ID·로컬 구역으로 고정한다. 마스크 확대·목표 이동으로 통과 금지. 검사가 지원하지 않는 기하 사례는 자동 PASS 불가, 시각 검수와 미검증 범위를 함께 보고한다.
- **선화**: 원본과 같은 프레임 및 다면 시트에서 외곽·허리/골반 연결·관절선의 단절/이중 테두리/면 잡선/숨은 선 노출을 항목별 판정한다. 의도된 경계 외 외곽 연결 틈은 1280×960 기준 2px 이하. 3D→고정→3D 왕복 투영 오차 1px 이하. 동일 상태 PNG export에 참고 이미지 합성이 없어야 한다. 손발은 단순 형태와 인물 설명의 상세 지시가 같은 인물을 참조해야 한다.
- **캐시/가림**: 고정은 현재 카메라의 투영/깊이 관계를 보존하는 장면 전체 캐시다. 화면 팬·줌·장면 전체 화면 이동은 캐시 변환이다. 개별 인물/소품 XYZ·포즈·카메라·가림·표시 변경은 revision을 올려 장면을 재투영한다. 개별 Z 이동을 0 재투영으로 약속하지 않는다. 작업 중에는 3D preview를 허용하고 pointer-up 후 선화를 갱신한다. 최소 기준 장면은 단일 인물, 교차한 인물+소품, 전후 인물의 깊이 교환이다. color/depth/handoff는 같은 revision에서 생성한다.
- **성능**: 인물당 표시 본체 30,000 triangles 이하, 16 draw calls 이하(장면 소품·선택 UI 별도 집계). 유휴 2초·고정 팬/줌 연속 120회 동안 본 장면 WebGL draw 0, cache 크기 증가 없음. warm-up 10회 뒤 60회 측정에서 입력→3D preview p95 50ms 이하, 고정 선화 갱신 p95는 단일 인물 120ms/인물 둘+기본 소품 셋 250ms 이하. 같은 환경의 기존 메인 앱보다 3D preview p95가 20% 넘게 악화되면 미달. 소프트웨어 GPU만 가능하면 환경 한정 결과로 명시하며 하드웨어 목표를 통과로 쓰지 않는다. 모드 전환 20회 후 해제되지 않은 geometry/texture는 초기 안정 상태 대비 +5% 이하, JS heap은 강제 GC 없이 참고 추세만 보고한다.
- **데이터/제품**: 기존 fixture는 원본 복사본에서 열고, 새 v1 body asset/rig version을 명시적으로 저장한다. 기존 Male driver를 보존하고 새 표면의 축·단위 어댑터로 연결하는 방식을 우선한다. 지원하지 않는 기존 체형은 기존 renderer로 표시하고 명시적으로 선택하게 한다. v1로 조용히 재해석하지 않는다. 다른 리그 포즈 입력은 거절하거나 명시적 변환 보고; 거절 시 장면 불변. 메인 추가→포즈→고정→인물 이동→Undo/Redo→저장/재열기→color/depth/설명 전달을 실제 메인 진입에서 실행한다. 보조 참고 서버 없이도 전 과정이 작동해야 한다.
- **실패 제어**: 앞뒤 반전·허리 연결 분리·얇은 삼각형 교차·가림 무효화 누락·잘못된 rig version·기준 집합 누락·오라클 사본 변조를 각각 주입해 비정상 종료를 먼저 확인한다. 결함 주입은 출력 fixture/사본에서만 한다. 시각 항목의 잘못된 시트는 검증자가 미달로 판정해야 한다. 실패를 못 잡는 검사는 성공 근거에서 제외한다.

측정 스크립트의 CLI 계약: O0가 `validation/body-v1-oracle/run.mjs`를 작성한다. `& .review-tools/node/node.exe validation/body-v1-oracle/run.mjs --case <baseline|geometry|contact|line|editor|data|perf|package|negative|all> --base-url http://127.0.0.1:3001 --viewport 1280x960 --dpr 1 --out <새 validation/run-id>`를 지원하고 종료 0=통과, 그 외=미달/실행 실패를 JSON에서 구분한다. 누락 파일·빈 기대 집합·빈 결과는 실패다. 외형 시각 판정은 독립 보고서로 별도 결합하며 CLI exit 0만으로 외형 통과를 주장하지 않는다. 이 명령은 **작성 예정**이고 지금 존재/통과한다고 주장하지 않는다.

오라클 동결 절차: O0 작성→새 맥락 검토자가 계획 대비 누락/negative control/비어 있지 않은 집합 확인→파일별 SHA256 manifest와 외부 실행 로그 보존→후속 작업 시작. 기존 `scripts/scene-format.test.mjs`는 O0 자체의 호환 회귀 oracle이며 수정 금지다. O0의 새 검증기 의미는 계획과 독립 검토로 심사한다. manifest checker도 변조 사본에서 nonzero를 먼저 실측한다. 오라클을 바꿔야 한다면 후속 구현을 멈추고 영향/재승인 필요를 보고한다. OS 보호 hook은 없으므로 범위 지시·전후 해시 검사를 사용하며 강제 격리라고 부르지 않는다.

O0 합격은 **검사기 자체의 유효성·양성/음성 대조군·계약/관측 경계·무결성 동결**에 대한 판정이다. 아직 고치지 않은 제품의 기대 미달은 별도 baseline에 기록하며 제품 검사 전부 통과를 O0의 전제에 넣지 않는다. 실제 변형 메시·세계행렬·표시 카메라·캐시 revision의 관측 인터페이스와 좌표/단위를 함께 고정한다. 앱 내부의 합격 여부 자기신고만 읽어 판정하지 않는다.

카메라 fixture는 메인 **PerspectiveCamera의 FOV·종횡비·다른 물체 깊이**를 포함하며 작업 카메라/촬영 컷 각각에서 lock/unlock·저장 복원을 검사한다. 시제품 orthographic 결과로 메인 검증을 대체하지 않는다. 팬/줌 draw 0과 성능 측정은 stage뿐 아니라 preview/export 등 장면을 그리는 renderer 전체를 관측한다. 명시적 export 동작은 별도 계측으로 구별한다. baseline과 새 제품의 입력→preview 지연 정의·동일 입력 시퀀스·warm-up·샘플 집계 방법을 O0에서 고정한다.

배포 계약은 참고 PNG를 로컬에 보존하면서 배포 산출물에 포함하지 않는 것이다. M4가 기존 사용자 수정이 있는 `app/vite.config.js`의 scoped baseline을 남긴 뒤 최소 배포 필터를 적용한다. 로컬 원본을 삭제하지 않는다. package 검사는 고정 원본의 경로뿐 아니라 해시로 dist의 포함 여부를 검사하고 누락 검사/빌드 실패를 구별한다. 프로덕션 인체 동작은 참고 PNG URL에 의존하지 않는다.

## 7. 미결

| 미결 | 닫히는 조건 | 필요 시점 | 누가 |
| --- | --- | --- | --- |
| R-BASE: 구현 착수 시 baseline 변동 가능 | O0에서 위 명령 실측. 기존 실패와 이번 변경 실패 분리. 기존 실패가 필수 계약을 막으면 착수 중단. | 제품 수정 전 | 새 맥락 구현 오케스트레이터 |
| R-ORACLE: 검증기·고정 fixture 아직 없음 | O0 산출물을 독립 검토/실패 제어 후 동결. 만들 수 없는 판정은 미검증 처리하고 제품 구현 착수 금지. | M1 전 | 오라클 작성자 + 새 맥락 검토자 |
| R-CACHE: 복수 물체 가림·투영 계약 | scene revision과 main camera의 projection을 계약화, 깊이 교환 fixture 통과. 단일 인물 cache 복제만으로 닫지 않음. | M3 완료 | 구현자 + 독립 검증자 |
| R-PERF: GPU/기준 측정 부족 | O0에서 환경/기존 p95 확보; M4에서 사전 예산 판정. 환경 미충족이면 해당 성능은 측정 불가로 남기고 최종 완료 금지. | O0 / V-B | 구현자 / 검증자 |
| R-POSE: 그림의 숨은 방향 추정 | O0에서 세계/카메라 축과 앞뒤 부호, 추정 관절을 fixture로 명시. 원본에 없는 정확한 각도라고 주장 금지. | O0 동결 | 오라클 작성자 |
| R-CONTACT: 임의 자세 보장 불가 | 지원 구간·허용 접합을 fixture에 열거하고 메시 교차 반례 검출, 미지원 동작을 UI/보고에 명시. | M1 / V-B | 구현자 / 검증자 |
| R-REVIEW: 외부 회사 도구 가용성 미확인 | capability/실제 신원을 기록, 권한 없는 외부 송신 없이 사용 가능한 네이티브 새 맥락으로 강등. 확인 불가 모델 필드는 미확인. | 계획 검토 및 V-A/B 시작 | 각 오케스트레이터 |
| R-WRITER: 공유 dirty 작업 폴더 | scoped baseline과 즉시 전후 hash; 예상 밖 변경이면 해당 범위 중단, 타 작성자 변경 덮어쓰기 금지. | 매 쓰기 전 | 각 작업자 |

범위/정본/통합 여부는 게이트 1에서 닫혔다. 새로운 제품 범위나 수치 완화가 필요하면 게이트 2 변경으로 돌린다. 실제 결과가 나쁘다는 이유로 해당 미결을 지우지 않는다.

## 8. 되돌림 지점과 작업 분할

### 복구와 승인 고정

Git 복구 기준은 `a9be29905f9d74d8819212308f51f9a982aae1b8`이다. 이 값은 **현재 dirty 상태의 백업이 아니다**. O0는 제품 코드 수정 전에 쓰기 대상의 존재/내용/해시를 `validation/<구현 run>/baseline/`에 복사하고 tracked diff·untracked 목록·manifest를 남긴다. 복구는 이번 작업이 바꾼 파일만 백업과 대조해 되돌리며 작업 전 존재하지 않았던 파일은 이번 생성물임을 해시로 확인한 뒤 처리한다. 예상 밖 변경은 덮어쓰지 않고 보고한다. Git reset/clean으로 작업 폴더를 일괄 복원하지 않는다.

계획 승인이 커밋까지 허용하면 계획서만 지정해 커밋하고, HGLOS 절차대로 승인 커밋을 Current State에 기록하는 별도 커밋을 만든다. 커밋 허가가 없으면 커밋하지 않고, 승인 발화 기록 후 `plan_hash.py` 산출값을 사용자에게 별도 답변으로 확인받는다. 확인된 외부 해시를 다음 맥락의 `--expect`에 사용한다. Current State 안의 해시 사본만을 신뢰 근거로 쓰지 않는다.

### 실행 계약

설계→구현→검증은 각각 다른 맥락이다. 이 설계자는 앱 코드를 구현하지 않는다. 구현은 승인 계획만 입력받은 새 작업자가 맡고, 검증은 그 작업자와도 다른 새 검증자가 맡는다. 스킬이 요구하는 네이티브 에이전트 위임을 사용하되 새 사용자 채팅을 임의로 만들지 않는다. 계획 진행 정본은 이 문서 Current State이고 각 작업자는 결과 파일만 반환, 지정 오케스트레이터가 상태를 갱신한다.

`O = validation/body-v1-oracle/`, `R = validation/<각 작업의 새 run-id>/`로 표기한다. 후속 작업에서 O와 기존 oracle 테스트는 쓰기 금지다. 테스트 runner가 쓰는 출력 R은 오라클과 분리한다. 각 작업은 T2 승인 유지 대상이며 게이트 2 승인 전에는 시작하지 않는다(O0는 원본 불변 T1). 아래 시간은 집중 작업 예상치이며 실제 경과시간 보장이 아니다. 개별 부위가 아니라 계약/제품 경계로 작업을 나눈다.

| 작업 | 쓰기 범위 | 공유 자원 | after | 예상(분) / tier | oracle / 완료 검증 |
| --- | --- | --- | --- | --- | --- |
| O0 기준·복구·오라클 동결 | `validation/body-v1-oracle/**`, 자신의 R | baseline 대장, browser/GPU, port3001, app/dist | 없음 | 120 / T1 | 수정 금지 `scripts/scene-format.test.mjs`; 기준 의미는 승인 계획으로 새 검토자가 심사. baseline/build, negative controls, 해시 변조 반례, expected 집합 검토 후 동결. |
| M1 공통 전신 형상·리그 | `app/src/doll-{core-geometry,torso-skin,full-rig,profiles,full-design,full,contact,mesh-reduction}.js`, `app/public/doll-full-core/**`, `scripts/build-doll-full-preview.mjs` (default 인자만), 자신의 R | body/rig 계약, browser/GPU, port3001 | O0 | 240 / T2 | O/run.mjs geometry/contact. 하나의 기준 체형·리그에서 몸통/팔다리/단순 손발을 함께 조정, 원본 시트/극단 굽힘 및 목표 보존 검증. P015 전용 체형을 제품 분기로 추가 금지. |
| M2 기존 편집기 어댑터·데이터 | `app/src/{body-rig,body-surface,human-skin,segmented-body,scene-format,studio,main}.js`, 필요한 신규 `app/src/body-v1-*.js`, 자신의 R | body/rig 계약, 저장 계약, browser/GPU, port3001 | M1 | 180 / T2 | O/run.mjs editor/data, 기존 scene-format test. 축/단위 어댑터, legacy fallback, version·오류 입력·Undo/Redo·기존 프로젝트 보존. |
| M3 장면 단위 2.5D 통합 | `app/src/{doll-fixed-view,doll-line-contours,view-performance,studio,main,exportSystem}.js`, `app/src/style.css`, 필요한 신규 `app/src/body-v1-*.js`, 자신의 R | scene revision 계약, browser/GPU, port3001, app/dist | M2 | 180 / T2 | O/run.mjs line/editor/perf. 메인 lock/unlock·scene cache·깊이 교환·같은 revision export 검증, 팬/줌 재렌더 0. |
| M4 제품 통합·전달·회귀 | 앞선 M1–M3 쓰기 경로의 합집합, `app/src/scene-object-info.js`, `README.md`, `docs/ARTICULATED_BODY_V1.md`, `app/vite.config.js`, 자신의 R | browser/GPU, port3001, app/dist | M3 | 120 / T2 | O/run.mjs all + 기존 scene-format test/build. 메인 실제 전체 흐름, 보조 서버 없는 사용, 손발 설명, 새 장면/legacy 비교 및 시각 시트. 소스 PNG 배포 검사. |
| V-A 변경분 적대 검토 | 자신의 R만(소스 읽기 전용) | 검토 스냅샷 | M4 | 90 / T0 | HGLOS validate_findings/make_round_json/compare_rounds. 새 맥락 정식 회차 상한 3, 이전 발견 전달 금지. |
| V-B 종결 재현 | 자신의 R만(소스 읽기 전용) | browser/GPU, port3001 | V-A | 120 / T0 | 승인 계획·동결 O와 실제 결과 직접 재현, SHAPE/LINE 독립 시각 판정 및 `verdict.md`. 빌드가 필요하면 메인이 실행하고 검증자는 로그 확인과 직접 재현을 구별. |

M1 파일 목록의 중괄호는 문서 약칭이다. 실제 JSON/백업 목록은 개별 경로로 풀어 사용한다. M3의 stylesheet 경로 `app/src/style.css`는 실물 확인했다. 검증자의 소스 읽기 전용은 실행 지시이며 OS 강제 보호를 주장하지 않는다.

O0 및 M1–M4는 빌드가 필요하므로 파생 출력 `app/dist/**`도 해당 작업의 허용 쓰기 범위이며 `app-dist`를 직렬 공유 자원으로 둔다(작업 JSON에 명시). 소스/저장 데이터 쓰기 권한으로 확대하지 않는다. 제품 변경마다 위의 동일 build 명령으로 dist를 갱신하고, `scripts/serve.mjs`가 현재 그 dist를 제공하는지 확인 후 검증한다. 서버가 없을 때만 `& .review-tools/node/node.exe scripts/serve.mjs`로 시작한다. port3001의 기존 프로세스를 임의 종료하지 않고 앱/asset 식별을 확인한다. full preview 생성은 `& .review-tools/node/node.exe scripts/build-doll-full-preview.mjs default`만 허용하며 core 빌더·gallery-p015 인자는 이번 경로에서 실행하지 않는다. 이번 쓰기 범위 밖의 core/gallery 실험 자산은 삭제하거나 덮어쓰지 않는다. 허용된 doll-full-core 갱신도 scoped baseline 뒤에 수행한다.

T2 착수 확인은 게이트 2에서 M1–M4의 묶음 착수까지 명시적으로 받는다. 승인 후 작업별로 또 승인을 요구하지 않고 각 작업 완료를 짧게 보고한 뒤 다음으로 간다. 미달·전제 반증·범위 밖 쓰기가 생길 때만 멈춰 보고한다. O0의 독립 검토와 V-A 각 회차 시간은 작업표 예산 안에 포함한다.

O0가 통과하기 전 M1은 시작하지 않는다. 오라클 경로가 없는데 oracle이 있다고 처리하거나 `oracle:none`으로 자율 구현을 계속하지 않는다. 독립 검토에 따라 검증기 수정이 필요하면 O0 안에서 수정하고 다시 동결한다. 제품 수정 뒤 검사 기준 완화는 금지다.

### 시간·수정 예산과 종료

작업 JSON의 `minutes` 합산 출력은 기본 **1,050분(17.5시간)**, 보정 포함 상한 **1,410분(23.5시간)**이다. 집중 작업 기준 약 2–3일 규모이며 실제 완료 시각을 보장하지 않는다. 한편 제품 보정 예산은 **240분**, 독립 최종 재현에서 발견한 미달 수정+새 검증 예산은 **120분**으로 제한한다. 계획서 개정은 HGLOS 규정대로 최대 2판이다. 상한을 다 썼을 때 기준을 낮추거나 시제품을 하나 더 만드는 대신 남은 미달/재현 불가와 재설계 필요를 보고한다. 임의의 외형 피드백 무한 반복은 하지 않는다.

V-A는 같은 스냅샷에서 최대 3 정식 회차이며 `compare_rounds.py <run> --cap 3` 결과를 사용한다. 소스를 수정하면 이전 수렴을 재사용하지 않고 새 run으로 처리하되 **이 계획 전체의 V-A 예산 90분 안**에서만 진행한다. 미해결 심각 결함/예산 정지는 통과가 아니다. V-B는 기준별 직접 재현표·실행 원문·무결성·발견 4분류·제한·판정과 범위 한정문을 남긴다. 최종 재현 보정 기회는 위 120분 안에서 한 번이며 실패하면 미달로 종료한다.

마지막 사용자에게 넘기는 것은 단일 결과 묶음이다: 메인 앱 사용 경로, 원본과 새 모델 비교/다면/접힘/가림 시트, 저장 왕복 파일, 성능 A/B, V1별 판정과 제한, 독립 verdict. 사용자는 전체 채택 여부를 최종 확인한다. 중간에 허리/골반/팔/다리를 각각 승인받는 작업은 없다.

### 병렬 판정

실제 입력·원문 출력은 `validation/hglos-articulated-body-v1-plan-20261103-r1/`에 보존한다. 현재 계약은 아직 동결 전이므로 `contracts_frozen:false`로 판정한다. 코드/UI/브라우저·GPU 자원과 선후 의존이 겹쳐 제품 작업을 직렬로 설계했다. 출력은 실행 후 아래에 그대로 기록한다. 실제 동결 전에 병렬 가능이라고 선전하지 않는다.

| 작업 | 쓰는 범위 | 겹침 | 공유 자원 | 판정 |
|---|---|---|---|---|
| O0 | validation/body-v1-oracle/**, validation/body-v1-O0/**, app/dist/** | M1: 쓰기 겹침: app/dist/** ~ app/dist/** / 공유 자원: app-dist, browser-GPU, port3001; M2: 쓰기 겹침: app/dist/** ~ app/dist/** / 공유 자원: app-dist, browser-GPU, port3001; M3: 쓰기 겹침: app/dist/** ~ app/dist/** / 공유 자원: app-dist, browser-GPU, port3001; M4: 쓰기 겹침: app/dist/** ~ app/dist/** / 공유 자원: app-dist, browser-GPU, port3001; V-B: 공유 자원: browser-GPU, port3001 | app-dist, baseline-ledger, browser-GPU, port3001 | 직렬 |
| M1 | app/src/doll-core-geometry.js, app/src/doll-torso-skin.js, app/src/doll-full-rig.js, app/src/doll-profiles.js, app/src/doll-full-design.js, app/src/doll-full.js, app/src/doll-contact.js, app/src/doll-mesh-reduction.js, app/public/doll-full-core/**, scripts/build-doll-full-preview.mjs, validation/body-v1-M1/**, app/dist/** | O0: 쓰기 겹침: app/dist/** ~ app/dist/** / 공유 자원: app-dist, browser-GPU, port3001; M2: 쓰기 겹침: app/dist/** ~ app/dist/** / 공유 자원: app-dist, body-rig-contract, browser-GPU, port3001; M3: 쓰기 겹침: app/dist/** ~ app/dist/** / 공유 자원: app-dist, browser-GPU, port3001; M4: 쓰기 겹침: app/dist/** ~ app/dist/**; app/public/doll-full-core/** ~ app/public/doll-full-core/**; app/src/doll-contact.js ~ app/src/doll-contact.js; app/src/doll-core-geometry.js ~ app/src/doll-core-geometry.js; app/src/doll-full-design.js ~ app/src/doll-full-design.js; app/src/doll-full-rig.js ~ app/src/doll-full-rig.js; app/src/doll-full.js ~ app/src/doll-full.js; app/src/doll-mesh-reduction.js ~ app/src/doll-mesh-reduction.js; app/src/doll-profiles.js ~ app/src/doll-profiles.js; app/src/doll-torso-skin.js ~ app/src/doll-torso-skin.js; scripts/build-doll-full-preview.mjs ~ scripts/build-doll-full-preview.mjs / 공유 자원: app-dist, browser-GPU, port3001; V-B: 공유 자원: browser-GPU, port3001 | app-dist, body-rig-contract, browser-GPU, port3001 | 직렬 |
| M2 | app/src/body-rig.js, app/src/body-surface.js, app/src/human-skin.js, app/src/segmented-body.js, app/src/scene-format.js, app/src/studio.js, app/src/main.js, app/src/body-v1-*.js, validation/body-v1-M2/**, app/dist/** | O0: 쓰기 겹침: app/dist/** ~ app/dist/** / 공유 자원: app-dist, browser-GPU, port3001; M1: 쓰기 겹침: app/dist/** ~ app/dist/** / 공유 자원: app-dist, body-rig-contract, browser-GPU, port3001; M3: 쓰기 겹침: app/dist/** ~ app/dist/**; app/src/body-v1-*.js ~ app/src/body-v1-*.js; app/src/main.js ~ app/src/main.js; app/src/studio.js ~ app/src/studio.js / 공유 자원: app-dist, browser-GPU, port3001; M4: 쓰기 겹침: app/dist/** ~ app/dist/**; app/src/body-rig.js ~ app/src/body-rig.js; app/src/body-surface.js ~ app/src/body-surface.js; app/src/body-v1-*.js ~ app/src/body-v1-*.js; app/src/human-skin.js ~ app/src/human-skin.js; app/src/main.js ~ app/src/main.js; app/src/scene-format.js ~ app/src/scene-format.js; app/src/segmented-body.js ~ app/src/segmented-body.js; app/src/studio.js ~ app/src/studio.js / 공유 자원: app-dist, browser-GPU, port3001; V-B: 공유 자원: browser-GPU, port3001 | app-dist, body-rig-contract, browser-GPU, port3001, save-contract | 직렬 |
| M3 | app/src/doll-fixed-view.js, app/src/doll-line-contours.js, app/src/view-performance.js, app/src/studio.js, app/src/main.js, app/src/exportSystem.js, app/src/style.css, app/src/body-v1-*.js, validation/body-v1-M3/**, app/dist/** | O0: 쓰기 겹침: app/dist/** ~ app/dist/** / 공유 자원: app-dist, browser-GPU, port3001; M1: 쓰기 겹침: app/dist/** ~ app/dist/** / 공유 자원: app-dist, browser-GPU, port3001; M2: 쓰기 겹침: app/dist/** ~ app/dist/**; app/src/body-v1-*.js ~ app/src/body-v1-*.js; app/src/main.js ~ app/src/main.js; app/src/studio.js ~ app/src/studio.js / 공유 자원: app-dist, browser-GPU, port3001; M4: 쓰기 겹침: app/dist/** ~ app/dist/**; app/src/body-v1-*.js ~ app/src/body-v1-*.js; app/src/doll-fixed-view.js ~ app/src/doll-fixed-view.js; app/src/doll-line-contours.js ~ app/src/doll-line-contours.js; app/src/exportSystem.js ~ app/src/exportSystem.js; app/src/main.js ~ app/src/main.js; app/src/studio.js ~ app/src/studio.js; app/src/style.css ~ app/src/style.css; app/src/view-performance.js ~ app/src/view-performance.js / 공유 자원: app-dist, browser-GPU, port3001; V-B: 공유 자원: browser-GPU, port3001 | app-dist, browser-GPU, port3001, scene-revision-contract | 직렬 |
| M4 | app/dist/**, app/public/doll-full-core/**, app/src/body-rig.js, app/src/body-surface.js, app/src/body-v1-*.js, app/src/doll-contact.js, app/src/doll-core-geometry.js, app/src/doll-fixed-view.js, app/src/doll-full-design.js, app/src/doll-full-rig.js, app/src/doll-full.js, app/src/doll-line-contours.js, app/src/doll-mesh-reduction.js, app/src/doll-profiles.js, app/src/doll-torso-skin.js, app/src/exportSystem.js, app/src/human-skin.js, app/src/main.js, app/src/scene-format.js, app/src/scene-object-info.js, app/src/segmented-body.js, app/src/studio.js, app/src/style.css, app/src/view-performance.js, app/vite.config.js, docs/ARTICULATED_BODY_V1.md, README.md, scripts/build-doll-full-preview.mjs, validation/body-v1-M4/** | O0: 쓰기 겹침: app/dist/** ~ app/dist/** / 공유 자원: app-dist, browser-GPU, port3001; M1: 쓰기 겹침: app/dist/** ~ app/dist/**; app/public/doll-full-core/** ~ app/public/doll-full-core/**; app/src/doll-contact.js ~ app/src/doll-contact.js; app/src/doll-core-geometry.js ~ app/src/doll-core-geometry.js; app/src/doll-full-design.js ~ app/src/doll-full-design.js; app/src/doll-full-rig.js ~ app/src/doll-full-rig.js; app/src/doll-full.js ~ app/src/doll-full.js; app/src/doll-mesh-reduction.js ~ app/src/doll-mesh-reduction.js; app/src/doll-profiles.js ~ app/src/doll-profiles.js; app/src/doll-torso-skin.js ~ app/src/doll-torso-skin.js; scripts/build-doll-full-preview.mjs ~ scripts/build-doll-full-preview.mjs / 공유 자원: app-dist, browser-GPU, port3001; M2: 쓰기 겹침: app/dist/** ~ app/dist/**; app/src/body-rig.js ~ app/src/body-rig.js; app/src/body-surface.js ~ app/src/body-surface.js; app/src/body-v1-*.js ~ app/src/body-v1-*.js; app/src/human-skin.js ~ app/src/human-skin.js; app/src/main.js ~ app/src/main.js; app/src/scene-format.js ~ app/src/scene-format.js; app/src/segmented-body.js ~ app/src/segmented-body.js; app/src/studio.js ~ app/src/studio.js / 공유 자원: app-dist, browser-GPU, port3001; M3: 쓰기 겹침: app/dist/** ~ app/dist/**; app/src/body-v1-*.js ~ app/src/body-v1-*.js; app/src/doll-fixed-view.js ~ app/src/doll-fixed-view.js; app/src/doll-line-contours.js ~ app/src/doll-line-contours.js; app/src/exportSystem.js ~ app/src/exportSystem.js; app/src/main.js ~ app/src/main.js; app/src/studio.js ~ app/src/studio.js; app/src/style.css ~ app/src/style.css; app/src/view-performance.js ~ app/src/view-performance.js / 공유 자원: app-dist, browser-GPU, port3001; V-B: 공유 자원: browser-GPU, port3001 | app-dist, browser-GPU, port3001 | 직렬 |
| V-A | validation/body-v1-VA/** | - | review-snapshot | 직렬 |
| V-B | validation/body-v1-VB/** | O0: 공유 자원: browser-GPU, port3001; M1: 공유 자원: browser-GPU, port3001; M2: 공유 자원: browser-GPU, port3001; M3: 공유 자원: browser-GPU, port3001; M4: 공유 자원: browser-GPU, port3001 | browser-GPU, port3001 | 직렬 |

실행 단계 - 위에서 아래로 순서대로, 한 단계 안의 작업만 동시에 돈다:
단계 1 [단독]: O0
단계 2 [단독]: M1
단계 3 [단독]: M2
단계 4 [단독]: M3
단계 5 [단독]: M4
단계 6 [단독]: V-A
단계 7 [단독]: V-B
동시 실행 단계 없음 - 전부 직렬
동시 실행 상한: 3
통합 후 검증 1회는 병렬 여부와 무관하게 필수다.

### 새 맥락 계획 검토

검토 원문: `validation/hglos-articulated-body-v1-plan-20261103-r1/plan-review.md`.검토자는 이전 대화를 상속하지 않은 네이티브 새 맥락이며 정확한 배포 모델 ID/버전은 미확인이다. 1판 판정은 **조건부**다. 원문 보고서는 그대로 보존한다. 검토된 1판 사본은 같은 폴더의 `plan-v1-reviewed.md`다.

2판 반영: F-PACKAGE는 M4에 기존 dirty `app/vite.config.js` 보존을 전제로 배포 필터 쓰기를 허용하고 package 검사를 명시했다. F-PERF-COMMAND는 다른 port/viewport/고정 출력의 구 스크립트를 제외하고 새 runner의 baseline 명령으로 교체했다. F-PREVIEW-SCOPE는 이번에 불필요한 core 빌더를 제외하고 full 빌더의 default 출력만 허용했다. 파생 dist 쓰기 소유, perspective/작업·촬영 카메라 구분, 전체 renderer 계측, O0 자체 합격과 제품 미달 구분도 보강했다.

이는 설계자의 지적 반영 기록이다. 검토자가 2판을 다시 통과 판정했다고 주장하지 않는다. 계획 개정 상한에 도달했으며 잔존 전제는 구현 Step 0에서 재측정한다. 전체 계획은 위 승인란의 발화로 승인됐다.

## Current State

- 승인 시점 커밋: fed299c9b06bf10d2c607402122faf00b773bae5
- 승인 시점 해시: 아직 승인 전.
- 현재 위치: postVB source7411 pin을고정했고제품쓰기/빌드/브라우저는19:14:34UTC종료했다. B2P1과재현된기존DATA/LINE회귀를17source파일에서최소보완했으며geometry/rest는불변이다. 구현자재현성공과새독립binding한정통과를전체종결로확대하지않고새fresh A/필수같은판실행/B보완재대조로진행한다. 이전3c2d A예산정지/B미달은그대로보존한다.
- 역할: 재개 구현 오케스트레이터 `/root/body_v1_resume`가 Current State 단일 작성자다. O0 작성자·모델 구현자·독립 검토자는 맥락/쓰기 범위를 분리한다. 부모 설계자는 제품 코드를 수정하지 않는다.
- 저장소 HEAD 실측: `bb9c08ab0569c4843b37194ea2eef2189ec659fa` (O0 착수 시).
- 작업 트리: 기존 수정·미추적 시제품이 있는 상태. HEAD만으로 현재 상태가 복구된다고 가정하지 않는다. `reset --hard`/`clean`을 되돌림 절차로 쓰지 않는다.
- 실행 환경 실측: Windows / PowerShell Core 7.6.5 / 콘솔 UTF-8 / `D:\github\cutscene-studio\.review-tools\pose-python\python.exe` / Python 3.12.10.
- 현재 시제품의 기능 로그: `docs/review-evidence/2026-11-03-gallery-p015/checks.json`, `default-regression/checks.json`. 이는 과거 자체 기능 검사이며 이번 HGLOS 외형/종결 통과가 아니다.
- 현재 메인 앱 구조 확인: `docs/DESIGN.md`, `app/src/body-surface.js`, `app/src/view-performance.js`. 별도 `doll-full.html` 시제품을 보존했고 M2/M3에서 실제 메인 통합을 구현·자체 실행했다. 메인 독립 종결 검증은 미검증이다.
- HGLOS 협업 hooks/registry: 이 프로젝트에서 확인되지 않음. 자동 쓰기 보호/세션 충돌 중재가 있다고 주장하지 않는다. 별도 원격/유료 검증 호출을 하지 않는다.
- 다음 한 단계: 고정7411의새59scope 안전packet/guard후fresh A를새run cap3/전체90분잔여안에서실행한다. 이전A/B발견·CurrentState·validation보고를넘기지않고actualsource/baseline/승인본문/도구계약만사용한다. source/CurrentState는A중동결,회차/시간은R에만기록한다. 별도R17환경observer후보는원r16b/props0·3/수치/height/fixture불변의제한심사전미채택이며GPU/무거운실행은A자원반납후직렬수행한다. 120분1회창20:33:18UTC/기존A잔여는증액하지않는다.
- 실행 일정 조정: 최신 사용자 지시가 단일 모델 미달만 반복하다 끝내지 않고 실제 메인 통합까지 이어가도록 요구하므로, 기존 M4의 M1–M3 합집합 보완 범위를 사용한다. 고정 M1 자산의 독립 binding 심사는 제품 구현과 역할을 분리한다. M1은 현재 통과가 아니며 미달을 보존한 상태의 안정 인터페이스 인계다. source writer/GPU/build/port는 계속 직렬 관리한다.
- M1 실제 이정표: 허리 인위 x 팽창 제거, 부모 joint ownership/단일 closed loft 및 torso field union, knee150·waist90 요청각 보존을 구현했다. 최종 checkpoint는 `validation/body-v1-M1-20261103/checkpoint/`이며 SHAPE 수치(폭 최대0.0987309061, 관절 높이 최대0.0134454533)·중립 F1 수치가 통과하고 90/150 저장 왕복 오차0을 실측했다. 전체 품질 통과가 아니다. 고정 scope manifest는 `validation/body-v1-resume-20261103/M1-checkpoint/product-manifest.json`, SHA256 `ecfd2977156fb3a5e15ef4ca434dd4be351661611f02babc1aa8e665367bee85`다.
- M4 잔존 품질: M1 전체 CONTACT는 중립2·원본24·waist90 2·knee150 304·elbow150 3501 실패(측정불가36)를 보존했다(`contact-checkpoint-summary.json`). 시각 자연스러움·발 형상/방향·접합과 실제 sweep/F4는 아직 닫지 않았다. 손발 세부는 인물 설명으로 넘기는 승인 범위에 맞춰 필요하면 단순 닫힌 손발 외피로 실제 geometry를 단순화하되 palm/sole 표면 anchor·지지방향·pose 호환을 보존하고 새 독립 binding으로 재검증한다. 마스크 확대·숫자 통과로 실패를 숨기지 않는다.
- POSE 시각 잔존: 중립 측면 발과 달리 source 발이 수직에 가깝게 보인다. 원본 2D 길이를 맞추려고 발목을 과도하게 꺾거나 발 geometry를 몰래 역회전해 숨기는 것은 완료가 아니다. inferred source recipe가 잘못됐는지는 실제 원본·고정 관측을 통한 별도 독립 판단 대상이며 제품 작성자가 frozen recipe를 고치지 않는다.
- M1 독립 binding: 새 맥락 `/root/body_v1_resume/asset_binding_review`가 실제 전체 cap/loop·closed target·palm/sole triangle과 동일 rest를 검토해 통과했다. 원문 `validation/body-v1-resume-20261103/M1-checkpoint/binding-verdict.md`, 실행 자료 `binding-report.json`의 외부 SHA256 `f9f857eb38bed5ec873a5767f92f75682b7a1c72b0e36e8a9d456a18c5ad5a4f`. 이 범위는 default/full 자산 binding이며 CONTACT 수치·시각·main binding 통과가 아니다.
- M2 실제 이정표: 첫 메인 새 인체 실제 렌더(`validation/body-v1-M2-20261103/first-main.png`), 등록 source/일반 장면 저장 왕복, 실제 UI 추가/포즈/배치/UndoRedo/SaveLoad/packet·설명, 29MB legacy 복사본의 pose/placement·원본 hash 보존을 실측했다. source 직후 elbow+1도→이동→UndoRedo→재열기에서 fore/hand만 변화하고 다른 mesh는 수치 정밀도 내 불변이었다. 최종 basis/profile guard 보완과 이후 독립검증은 별개다.
- 요청 scene 관측 버전 보강: 원 r5 `validation/body-v1-oracle/`는 불변 보존한다. 실제 props/frame 상속의 scene 소속 오류와 후속 ancestor frame 이중변환 반례를 보완한 별도 `validation/body-v1-oracle-r6/`를 새 실행 버전으로 채택했다. 독립 제한 원문 `validation/body-v1-oracle-maintenance-r6-20261103/review-frame-order-verdict.md`, manifest `candidate-r6-frame-order-manifest.json`의 외부 SHA256 `3131e807bc67b95be22642ec03a2578612b859339c538400e91ca7febdfe24ff`. actual Three의 등록 순서·회전/비균등 scale·변형 prop world geometry/index/frame·원 scene 불변을 직접 재현했다. r5→r6 변경은 observer/SCHEMA/README뿐이며 수치·fixture active sets·F1/F2/F3/B1 bytes는 그대로다. production main/F4 최종 통과는 후속이다.
- M2 최종 인계: source 직후 +1도 편집 포함 실제 사용/저장 흐름과 basis/profile guard 보완을 마치고 제품 쓰기를 종료했다. 최종 scope 사본은 `validation/body-v1-resume-20261103/M2-checkpoint-final/`, manifest SHA256 `7c0035e6f845fdd22ca9aa62dba453f16e3b33a757d48ab45b8b96585c10f119`. M3 첫 실제 cache 선화는 `validation/body-v1-M3-20261103/first-fixed-buffer.png`이며 실제 223.1ms cold capture·strokes290을 관측했다. steady 성능/내부 구조선·최종 LINE 통과로 전용하지 않는다.
- SHAPE 프레임 한정: `projection-evidence.json`(M1 R) 및 `validation/body-v1-resume-20261103/portrait-projection-check.json`은 portrait 실제 pixel 등방성과 oracle NDC 비등방성 차이를 재현했다. 인체 비균등 scale 없이 square viewport/frustum 고정 audit frame에서 SHAPE를 검사하며 그 결과를 일반 aspect/perspective 통과로 확대하지 않는다. 메인 LINE/EDITOR/DATA의 기존 aspect·카메라 왕복 조건은 그대로다.
- r4 독립 근거: `validation/body-v1-O0-resume-review-20261103/verdict.md`. F1·기존 F2/F3는 보고 범위 통과, F4-B1 때문에 O0 동결은 미달. 후보 manifest 원본 SHA256 `ca0ebd56e334219f8e9d847650a4696ebdc2ed4ba86f951320755a9f390f14d3`이며 심사 전후 verify와 소스 guard는 통과했다. r4 코드/제어·실제 제품 baseline은 `validation/body-v1-O0-resume-author-20261103/`에 보존했다.
- r5 동결 근거: `validation/body-v1-O0-resume-review-20261103/r5/verdict.md`. 같은 독립 검토자의 B1 제한 재심사는 통과이며 정식 V-A 회차로 세지 않는다. 외부 manifest `validation/body-v1-O0-resume-author-20261103/r5/candidate-r5-manifest.json`, 원본 SHA256 `870c6ec5372854f8ef8c37593e28e7c5660ccc402823be388f349a86bed6bdb0`. 동일 rest 양성 및 baked-offset/layout/hierarchy/stature/profile 오류를 실제 observer에서 직접 대조했고 F1/F2/F3 bytes 보존을 확인했다. 실제 제품의 rest/접합/anchor binding은 M1/M2 후속 독립 심사 의무이며 제품 품질 통과가 아니다.
- 새 실행 baseline: `validation/body-v1-resume-20261103/baseline/`에 scoped 제품 소스·full-core·config·기존 테스트 사본, manifest, tracked diff와 status를 보존했다. 승인 본문 해시 `80e657518dcadd478ba0ea5ba9fcd721a7b4516e1af46136a7278263b522108f` 재대조 일치. Node v24.22.2 / Python 3.12.10 및 기존 scene-format test exit 0을 재측정했다.
- O0 근거: `validation/body-v1-O0-20261103/`의 승인 증명·tracked diff·미추적 목록·scoped baseline. baseline manifest SHA256 `b865f4f1814d855d1ef1bd9f6bc8f07f717b47dcdafa5a64acbb341320abf7e1`.
- M3 안정 인계: `validation/body-v1-M3-20261103/report-M3.md` SHA256 `885fc62130e959c463b84e839b15a578bf9447bb3c4d47953f201162a16ff3db`. 실제 source/P015 working·shot 선화의 dense world hidden·RGBA·silhouette·orphan은 자체 frozen 함수 검사에서 0, source actor +1m/heading45 및 저장 왕복 world 오차는 수치 정밀도 이내였다. warmup10/sample60 선화 P95 단일69.8ms/복수213.6ms, actual GPU body draw 최대15를 관측했다. 공식 r6 PERF는 preview41.5ms·idle0·LINE/lock 통과 후 STALE_OCCLUSION exit2였고, 동기 revision 수정 후 개별 Z/pose/visibility만 재검사 통과했다. 공식 전체 재실행은 최종 버전에서 필요하며 이 checkpoint를 M3 전체 품질 통과로 쓰지 않는다.
- M3 guide 잔존: `latest-source-buffer.png`와 `guide-diagnostic.json`에서 실제 full-rig guide 35 중26 nonempty 근접을 관측했다. 나머지9개는 정상가림/표면밖/미구현 분류가 아직 없고 특히 무릎 관절 ellipse가 약하다. M4 실제 무릎/발목 외피에 guide를 재바인딩하고 actual scene 가림으로 검증한다. 원본선 덧그림·표면밖 원 강제표시는 금지다.
- 승인된 최소 범위 확장: 부모가 전달한 사용자 승인 범위 내 정상 구현으로 `app/src/direct-editor.js`·`app/src/studio.css`의 body 상태만 `data-editor-mode`로 분리했다(버튼 `data-edit-mode` 유지). exact 사본/hash·전체 참조 대조는 M3 `dom-baseline/`·`dom-rename.json`에 보존했다. main new-v1 actual body는 공통 `castShadow=false`로 GPU draw를 줄였고 조명/receiveShadow·props·legacy는 보존, shadow proxy는 추가하지 않았다.
- source 입력 독립 후보: `validation/body-v1-source-calibration-20261103/perspective/`의 지원 actual Perspective 후보를 고정했다. candidate SHA256 `d0b58b16495418bce087c6064d5b3480af16fe6f0987d7706c315c1d58ee41f9`, report SHA256 `888f846360f6876ef15787d65db23a745475bc918d9e9e0e5684fba791576eae`. 동일 체형/같은 pose 4면 actual pixel 관절1.750522%·폭8.756231% 및 전체 foot floor≈0을 자체 측정했다. P015 후보의 관절 재투영 최대170.727px 차이는 시각 진단으로 보존한다. SHAPE2%/10%는 ref-original 목표이며 P015의 모든 화면좌표 동시피팅을 새 gate로 만들지 않는다. P015는 같은 제작구조/공통몸체의 다른 자세로 자연 hand-hip·앞뒤·sole-floor·가림·목표보존·요청재생을 교차검증한다. 독립 채택 판정과 조건은 다음 항목에 기록하며 이 기존 수치를 미래 M4 asset 통과로 전용하지 않는다.
- source 독립 채택: `validation/body-v1-source-adoption-review-20261103/verdict.md` SHA256 `fb2019a73aca9765fae6424be4c23c0d4a0f2e22ed3c6c768a09ca5909f51cb3`는 ref-original을 새 natural-sole inferred request로, P015를 rear-leg 추정의 공통몸체 natural-sole 교차검증으로 조건부 채택할 근거를 확인했다. 정확한 원본/P015 복원 주장은 하지 않는다. world 목표/방향·actor placement·floor/camera·새 request revision 명시와 전체 SHAPE/CONTACT/F4/LINE 잔존 보존이 조건이다. 별도 r7에 입력 연결·독립 원target/실제foot frame/floor 검사를 보강했고 새 맥락 제한 심사가 통과했다. 원문 `validation/body-v1-oracle-r7-review-20261103/verdict.md` SHA256 `56280971c93a1b2b880800235c202a95f5e486242ffc89ce033d458a79bc9ba1`, 외부 manifest `candidate-r7-manifest.json`(maintenance-r7 R) SHA256 `04dfc42d99e1f5ebb40ca173ee799165895a015039b58e83977bf0fea8a480de`의 exact40개 파일을 실행버전으로 채택한다. r5/r6/r7 모두 불변이며 F1/F2/F3/B1·수치·fixture active sets·지원범위는 보존했다. 제품은 순수 JSON SHA256 `266634d7783dffdc1a8199f53331abff2a2f0d38ce301e15ff5f618c7f53e6db`만 exact 복사해 자체 binder로 연결한다. 실제 M4 제품/메인 source 전체와 binding 통과는 후속이다.
- M4 첫 변경: 고정 shoulder parent rest L Y−90/R Y+90, restRevision2와 구 명시 quaternion world보존 변환 및 driver residual 호환, digit bones/q/curls를 유지하는 닫힌 단일 손발 외피를 구현하고 첫 build exit0을 실측했다. 첫 actual 화면은 `validation/body-v1-M4-20261103/first/`다. 90/150 저장왕복 오차0·분리 clone mutable누수 없음이며 CONTACT 첫 전체 실행은 기존 gap time budget 초과로 측정 실패했다. 형상·DATA·CONTACT/guide 보완 중이며 통과로 소급하지 않는다.
- M4 corrective 경계: `validation/body-v1-M4-20261103/corrective/`는 중립 팔 벌림 방향을 보존하는 canted shoulder rest와 elbow/knee inner 표면 CPU 보정을 실제 raw/PNG로 보존한다. 요청각·기존 junction mask를 바꾸지 않았고 collision-only 진단은 중립0/elbow150 1/knee150 26/구source21 실패·측정불가0이다. adjacency witness를 생략한 진단으로 전체 CONTACT 통과가 아니다. 구 M2 source/editedMoved 저장의 world joint는 약1.2e-15m 내 보존됐고, 새 corrective로 표면 정점은4.484mm 바뀌어 의도된 변형 집합을 분리 확인한다. 기존 posture getter의 숨은 digit Euler reorder 읽기 부작용을 순수 snapshot 경계로 보정해 잘못된 rest/driver/mismatch 판본의 거절 후 raw 불변을 모두 확인했다. 남은 elbow/knee/hip·actual surface guide와 새 source 제품 연결을 계속한다.
- r8 F2 witness 최소 보강: 제품 CONTACT 첫 타임아웃은 F1 전체rim→solid가 아니라 구 F2 `minimumSurfaceGap`의 global/local 정확최소 탐색이었다. 부모의 명시 지시로 별도 유지 역할이 r7 불변 복제→`validation/body-v1-oracle-r8/`의 두 호출에만 기존epsilon과 같은 `stopAt:tolerance`를 전달했다. 실제surface witness upper≤epsilon만 조기 종료하며 within/region·그외 exact/측정불가 fallback·2초 budget·gap/마스크는 그대로다. 새 독립 원문 `validation/body-v1-oracle-r8-review-20261103/verdict.md` SHA256 `c628992d662cbae947fee11a3989041d113e095e85376efc8413124fac65f50d`가 gap9 및 추가 경계7·exact2옵션/나머지39bytes불변을 통과 판정했다. 외부 manifest `validation/body-v1-oracle-maintenance-r8-20261103/candidate-r8-manifest.json` SHA256 `ecf415296a8eee72512ddd9f14f21273f33f70768cb25b5668f5c1881fc4c62f`의 exact40개를 새 실행판으로 채택한다. r5/r6/r7/r8 모두 불변이며 실제 제품 CONTACT 시간/품질 통과는 후속이다.
- M4 새 source 실제 연결: 순수 request JSON을 제품 `app/src/body-v1-source-requests.json`에 exact 복사하고 자체 world binder·명시 revision 저장/UI 액션을 연결했다. `validation/body-v1-M4-20261103/r7-source/` 첫 full/main 측정은 발목목표 오차<6.3e-16m·heading/sole 방향을 보존하고 전체foot floor minY 원본 약−0.047mm/P015 약0이었다. 첫 full crop/main shin·fore 누락과 빈3D PNG 실패를 원문 보존한 뒤 Perspective cache 수식과 canonical→CPU update→display public-mutator 경계를 수정했다. 새 `r7-source-fixed/`에서 실제 full/main 선화와 동기 main 3D framebuffer를 복구했다. 실제 knee/ankle/shoulder 및 torso.structure guide가 nonempty이며 missing/outside/unbound0을 원문 metrics로 확인했다. 이는 독립 품질 판정이나 전체 LINE 통과를 대신하지 않는다.
- r9 SHAPE scaled-basis 관측 보강: 실제 uniform matrix를 직접 Quaternion.setFromRotationMatrix로 읽던 오류를 고정raw에서 재현했다(기존92.85/93.04° 오검출, 실제분해회전0/0°). 부모의 명시 지시로 별도 r9의 shape.mjs만 finite/affine/비특이 positive scale/orthogonal axes/unit quaternion/TRS 검증 후 decompose 회전추출로 수정했다. 새 독립 원문 `validation/body-v1-oracle-r9-review-20261103/verdict.md` SHA256 `82648d9394245bcb5d8cff3d4e859a0dd73a8cbe8a10867955f50f44e1025302`가 actualraw joint1.750522%/width8.756231%·globalfit 불변, basis0/0° 및 독립16 양성/음성·.0099°통과/.0101°미달·invalid matrix fail-closed를 확인했다. 외부 manifest `validation/body-v1-oracle-maintenance-r9-20261103/candidate-r9-manifest.json` SHA256 `85fe8429e192a573d9bc4a6785c7de3be5c3d15c88ca257295a1cc8ccaff6a86`의 exact40개를 실행판으로 채택한다. 나머지39files·.01°·SHAPE비례/관절·F1/F4·fixture/data는 불변이며 r5~r9 모두 쓰기 금지다. 실제 제품 시각 SHAPE/메인 품질은 후속이다.
- M4 성능 이력 보존: 이전89.9/152.1ms, 미달84.3/148.6ms, 2e96pin41.5/96.9/214.2ms와8aa0pin41.8/116.3/233.5ms 원문은 각 해당판에만 유효하다. 새 보호on 제품의 최종 성능 판정은 아래3c2d 공식 결과이며 이전 통과로 대체하지 않는다.
- 같은 pin 공식 접촉/F4: `validation/body-v1-M4-binding-fix-contact-20261103/full-result.json`은13/13 실제fixture CONTACT/F1 및 원본SHAPE/F4 통과다. 나머지12 F4는 freshrest exact비교 오류로 측정불가, 구 unconditional sweep 미달을 보존했다. 최소재현 `validation/body-v1-M4-20261103/rest-order-diff/serialized-summary.json`은 geometry/nodes/joints가JSON상같고 localStature 한 필드만5.326286009382573→5.3262860093825735(Δ8.881784197001252e-16), 동일clone parent.y만변경해복귀함을 보였다. 제품쓰기없으며 별도 r13 actual localhierarchy 관측계산 보강·독립보고서 재계산/심사 전 F4를 통과로 바꾸지 않는다.
- 최종 source 첫편집: 같은 pin `validation/body-v1-M4-20261103/main-source-flow-final/results.json`은 원본/새 P015 직후 손목·팔꿈치+1도 네 요청 실제각오차≤1.43e-14도/제한없음, 무관mesh변위≤8.47e-16m, UndoRedo/SaveReopen 최대약2.03e-15m 및 pageerrors0을 기록했다. 새 revision/curl20/15를 유지했다. 후속 실제 alias 수정 후 필요한 회귀는 재검증한다.
- 새 독립 binding 미달/최소 보완: 원 pin의 `validation/body-v1-final-binding-review-20261103/binding-rest-report-original-pin.json` SHA256 `a15c1395b054d634c2e3ff32c5975659fda6707c7ff5b96905932152aa3c40df`는 main head region frame·숨은 legacy mutable buffer 공유14refs·main-source canonical replay 후 stale alias를 미달 판정했다. 14:40:29~14:46:46UTC 실제 최소fix를 수행하고 새4035 pin을 직접 대조해 mismatch0을 확인했다. 새 manifest는 `validation/body-v1-resume-20261103/M4-binding-fix-final/product-manifest.json` SHA256 `8aa0b7510819ea1cf0961c38fc9573915c5ecd2b8cb5ee2b162fab275ffceaa6`; source delta는 body-v1-adapter.js1개다. 형상/restbuffer/index/수치는 그대로이며 독립 같은 반례 재대조 중이다. fix관측6.28분을 차감한 보수잔여26.90분을 기록했다. r12는非空Three18대조군 통과 후 최소collector/분류 동결 중이며 아직 미채택이다.
- r10 실행 채택: 별도 유지 역할의 private allowedAt inverse precompute 캐시는 실제 matrix/radius/strict predicate와 결과를 보존한다. 독립 원문 `validation/body-v1-oracle-r10-review-20261103/verdict.md` SHA256 `6aa151cfb1e099f73c2a0cceca6715d44548ba43023486ee586b32c04c255ddc`가5958동등·stale음성 및actual42query의완료결과동등/timeout해소를 확인했다. 외부 manifest `validation/body-v1-oracle-maintenance-r10-20261103/candidate-r10-manifest.json` SHA256 `dd262bec555c7aca8e3bff9f50a166c32e691714136d1343223d8b26e9641f02`의exact40개를 실행판으로 채택한다. product.mjs private영역만 변경/나머지39files·호출자·기준·범위분류는 불변이다. r5~r10 모두 쓰기 금지다.
- M4 접촉 최신 경계: `validation/body-v1-M4-20261103/r11-final-targets/`에서 원본/새 P015/step/squat CONTACT/F1 및 원본 SHAPE 수치가 통과했다. 중립4·arms-up·waist90·elbow150·knee150/kneel의 이전 통과는 최종 pin 전체13fixture 재검사를 대체하지 않는다. 새 binding/F4·공식 성능·전체·독립 시각 검증은 미검증이다. 이전 frozen P015 실패와 타임아웃은 그대로 보존한다.
- P015 손 원인/분리 보완: 독립 원인 원문 `validation/body-v1-p015-hand-review-20261103/verdict.md` SHA256 `89929a3236c8426da7eaefc28fec8ba2861370b4688ce1077460dc73a29c85f7`는 oldR 실제finger/FK도 동일torso안약74mm였음을 확인했다. 불량8cm handrow warp는 보존 후 정상mitten+실제digit변형으로 복귀했다. 독립 채택 원문 `validation/body-v1-p015-adoption-review-20261103/verdict.md` SHA256 `b8f1f1d5d6a5bf7ac2d74012f409e2507065db5b01caf8a4216ac65212028ac5` 및 `r11-data-addendum.md` SHA256 `ca92bd4461f262e98482cfc6607d97a419c58d0bee0ea51c863e433f372f7a13`가 같은몸체/rest·원wrist목표·다리/발/camera/배치를 유지한 orientation/curl 입력만 한정 채택했다. 새 revision은 `body-v1-inferred-natural-hand-hip-v2:p015`, curl20/15이며 과거 explicitq는 재해석하지 않는다. 실제 손/몸통 최소틈4.67/4.76mm는 정확 접촉으로 주장하지 않으며 새0mm gate도 추가하지 않는다.
- r11 순수 입력 채택: `validation/body-v1-oracle-maintenance-r11-20261103/candidate-r11-manifest.json` SHA256 `ef1f1bde9b1547ee75b6f7cb0a188cb370e015e19acfb6bcd2d5daf54ab06285`의 exact40개를 실행판으로 채택했다. r10 대비 source-requests.json P015 revision/방향/curl/선언목표만 변경했고 원본 record 및 나머지39파일/판정기준은 불변이다. 제품 exact JSON SHA256 `a6586519e444510b20c7e23c0b8641064340ed0f3ffa0c412fd50a4e181ab51a`를 연결했다.
- 최종 시각 잔존: 기존 정점 hip proximal 폭 흐름과 neutral indexed normals의 실제 skin Jacobian inverse-transpose 전달을 보완했다. analytic normal 시도의 날카로운 patch는 실패 원문으로 보존했고 채택하지 않았다. `validation/body-v1-M4-20261103/r11-normal-hip-final/`의 hip 단차는 감소했으나 torso 넓은 요철은 잔존하며 숫자 SHAPE 통과로 면제하지 않는다. 추가 외형 실험을 반복하지 않고 정확 최종 pin의 독립 시각 판정으로 넘긴다.
- 범위/요청 실행 해석: `validation/body-v1-range-contract-review-20261103/`의 verdict/addendum/execution-review 원문과 부모 채택에 따라 기존 main숫자/UI domain·namedpose/실제150 정상경로의정확수용·F4/CONTACT/F1은유지한다. 기타 neutral domain은 전수방문과 정상수용/명시제한·거절을 분리하되 독립requested 기하/kinematic근거·실제적용안전·원요청미달UI/결과가필수다. 정상경로/동일baseline초기조건을 결과전에고정, solver미해결은미검증, 중간경로와무관관절/root변경·부분제한/무변경거절도분리한다. self-report만으로통과/실제지원축소·필수pose실패의제한회피는금지. 사례집합과분류 보강은캐시와별도후보/독립심사전에는oracle에반영하지않는다.
- 시간 관측: budget-observation-20261103.json에M4집중사용null/관측wall상하한을보존했다. A는16:30:47→17:08:51UTC38분04초(무효호출/packet준비포함),잔여51분56초에서정지해B시간을중복차감하지않는다. B는17:10:52.534→18:31:16UTC80.3911분(CUA1201초대기/보고보존포함)으로미달종료했다. 120분1회보완의writer실제집중시작18:33:18.0577653UTC/연속창상한20:33:18.0577653UTC를별도관측하며과거소모를소급합치거나예산초기화/증액하지않는다.
- 종료B의r15 고정 실행판: 외부 manifest `validation/body-v1-oracle-maintenance-r15-20261104/candidate-r15-manifest.json` SHA256 `ac43da07a0bcf3c5b4dc54967b68f0f85bb8684e682bec0d528ea6d60aca151b`의 exact43을 채택한다. r12 분류 미달3개, r13 localStature 관측 보강, r14 B1 manual 반례를 각 불변 원판으로 보존했다. 독립 원문 `validation/body-v1-oracle-r15-review-20261104/verdict.md` 및 독립 script/실행 로그가 자동 asset B1·외부manualparent·실제geometry음성·raw순수읽기·다축180/초기배치/요청joint position-scale/UI음성과 domain집합 보존을 확인했다. actual whole3160 완료가 아니다. oldmain의 신규contactguard를 소급 요구하지 않고 숫자/기존조건과 추가보호 차이를 분리하며 old수용→제한을 정상수용PASS로 합치지 않는다.
- R16b 후속 실행 채택: 원R15/R16은불변보존하고 raw nativeDOF·oldmain 실제numeric pipeline·oldnumeric/품질/정상지원 분리를보강한 R16b 외부manifest `validation/body-v1-oracle-maintenance-r16b-20261104/candidate-r16b-manifest.json` SHA256 `7907c751563e0eea4655af2b131b29877c1b4efa60bcc49082e5b32f43dd842d`의exact43을후속범위실행판으로채택했다. 원R16독립미달2반례를보존했고 `validation/body-v1-oracle-r16-review-20261104/r16b-verdict.md` SHA256 `673b9b558e0d43085a012bebae37ce69e2f3877332994b70e85498b23894cb3b`의동일제한재대조는통과다. R16대비분류파일3치환외42files/domain/수치/마스크는불변이다. oldmain실제frame/collection·전체domain은미검증이며제품PASS가아니다. 현재17:10:52UTC부터진행하는B는r15/source3c2d그대로고정해직접재현중이며A원문발견을전달하지않았다.
- 메인 실제 보호 보완: 기존 domain 내 l_leg.raise135도 수용 후 실제CONTACT36 미달을 확인하여 default native 단일축 transaction을 연결했다. 새보호는 원요청/실제적용/이유를 표시하고 해당joint만 안전한 이전상태로 복원한다. GUI/drive135→0 안전거절, elbow/knee150·waist90 정확수용, original/P015 elbow/wrist+1 네입력과 UndoRedo/SaveReopen·원revision/curl을 확인했다. 실제 actor.protection=true와 canonical bulk=false/oracle fresh=false를 분리한다. 단순 제한 자기신고는 independent requested/applied 관측을 대신하지 않는다.
- 1회보완 이전 기준pin: 3c2d 종료시 validation/body-v1-resume-20261103/M4-line-ray-final/product-manifest.json SHA256 3c2d65b767c0f362e7fa92813d82e88284332a5d5a417d981de6ed8715e025e2의4035를실측보존했고B전후대조도동일했다. 이제postVB writer가이exactbaseline을새R에보존한뒤쓰기중이므로편집중작업트리를3c2d고정판으로주장하지않는다. geometry/rest는그대로이며이전binding2e76aa2cd9e6351e54b8692dcb976fb3d269cea58e02dbc903560f28c9739f52는이전pin입력으로보존한다.
- 마지막 공식 판정/일정: B r15/3c2d공식line79.1/168.7ms는120/250안,보이는neutral별도preview39.9ms는50안이다. 초기기본인체offscreen으로동일장면preview A/B는미검증이다. 이전167.2ms미달/다른pin성능은역사원문으로보존해새source로전용하지않는다. 실제editor/13named main F4/F1과등록시각130행은부분통과이며B미달2/전체범위CONTACT·지원보존미검증을면제하지않는다.
- 예산/미완 관측: M4기존보정집중사용미측정·보수전체잔여0.47분/확인active차감5.30분을실제소진으로단정하지않는다. 새1회120분창은postVB소스/필요검증에별도관측중이다. full1858은3prefix trace부분만,main1302는native요청1144정확수용/158명시거절관측만완료했고전수삼각형CONTACT/old지원보존은미검증이다. P015/squat GAP_TIME2304/2385ms 및posedbbox height기준한정도보존한다.
- V-A 독립성/회차: 첫호출은옛CurrentState/saved외JSON 노출신고로즉시무효중단했고새맥락안전packet으로재시작했다. 원자료/무효기록은보존하며elapsed를포함했다. 필터59scope before/after·28경로차분·saved필드의양방향대조와각회차종료guard/hash는모두통과했다. 정식3회 발견6/8/8, 신규위치6/4/2, 총고유위치12, 계약위반[]이며 `compare_rounds.py --cap 3`은예산정지(잔존리스크미지수)다. 원문수정/발견분석·회차간전달없이저장·검사·비교만했다. `validation/body-v1-VA-20261103-final/stop-summary.json`이회차/시간요약이며정지자체는승인/통과가아니다.

- 독립B 원문/실제보완: validation/body-v1-VB-20261104/verdict.md SHA256 1c7f69aa2eb51b26ce10c0eaa1c7bdd8bfedfbccf100e2f5336343808cd7be0a를그대로저장했다. 116원문전문/4035product·43oracle양음성/visual130행·51PNG를보존했다. CUA마지막파일선택만도구대기후MAIN중단됐고이전직접UI와MAIN재열기는구분했다. sourcewriter model_m1는자신의postVB R만쓰며CurrentState/oracle/기존R/commit은쓰지않는다. 필요한좁은pose-format·pose-library·model-preview호환및direct-editor/studio/view-performance/scene-object-info의숨은legacy포함bounds동일원인호출자는부모허용에따라exactbeforehash/사본·이유를먼저보존해새v1 actual bodyMeshes경계로최소정합한다. legacy/props/기존saved배치보존,매pose/load자동ground·새기능/전체UI개편은금지다.

- 새pin/독립binding/안전입력: `validation/body-v1-postVB-20261104/product-pin/product-manifest.json` SHA256 `7411b942511a1a59c28d697f97b01bf923900ee6006fb7311819220362dd7f0d`,4035actualfiles mismatch[]/변조음성exit1을MAIN이실측했다. `source-delta.json`17파일/`disposition.json`의구현자근거·미확인을보존한다. 새독립binding `binding-rest-report-postVB742.json` SHA256 `0e2555386be2661fe6c0d7eac0c70bbf644ab283b3767f59298dd86085b86135`는18행/56files/3rest의actual재관측·28rim/anchor계산·mutable0·수용45/60save/load/fresh FK0한정통과다. 정식A/B·전체CONTACT/F4/PERF통과아니다. 새A59scopeSHA `03f99e2ea2ebebec102cf15098a9065c0393fd86eaeb6e37bbb5975483cc5cc8`,packetSHA `aa993fd1b963870f972aeadbcb700fcaac8d9c97b8839e10faf5e11e2489127d`,diffSHA `e8887397c02ca6edb3f1ceef688edae10bfeab09d850c6759a98cb913d287e16`,33diff경로이며양방향누락/초과/금지경로[]다. 원본baseline tracked.diff/이전보고/CurrentState는입력에넣지않았다.

### 단계 현황

| 단계 | 상태 | 근거 |
| --- | --- | --- |
| 설계 | 미검증 | 범위 승인 완료. 1판 독립 검토는 조건부, 2판에서 지적 반영. 2판 자체 독립 재검토는 미실시. 게이트 2 및 제품 작업 묶음 착수 승인 완료. |
| 구현 | 미검증 | M4 제품쓰기를종료하고안정3c2d를인계했다. 실제인체·메인·DATA·guide·보호구현과공식editor/13F4/F1은확인했지만성능/범위/시각·전체종결미달/미검증을유지한다. |
| 검증 | 미달 | 마지막3c2d 독립 binding과 공식 메인 editor/13named F4/F1 통과. 정식 V-A3회는예산정지/잔존리스크미지수이며성능·범위·시각·전체종결미달/미검증을유지한다. 같은snapshot B직접재현및승인된1회보완경로로이어간다. |





### 사용자 재개 지시

- 사용자(이름 미제공), 2026-11-03: “그럼 남은 두 계약부터 재설계해서 계속 진행해줘. 검증 준비만 반복하다 끝내지 말고 실제 인체 수정이랑 메인 편집기 통합까지 이어지게 해줘.”
- 기존 범위·묶음 착수·수치 기준을 유지한 F1/F4 구체화와 후속 제품 진행을 재개한다. 이전 O0 120분 실행은 종료 기록 그대로 보존하며 이 지시 이전에 추가 예산이 승인됐다고 소급하지 않는다. 이번 추가 보완은 새 실행으로 구분한다. 준비 시간은 진행 점검에 사용하고, 단순 준비 시간 도달만으로 사용자 지시의 전체 작업을 종료하지 않는다. 임계값 완화·제품 commit/push·V-A 상한 증가는 허용하지 않는다.
- 기술 계약 자료: `validation/body-v1-contract-redesign-20261103/contract-redesign.md`. 이는 승인 계획 O0의 구체화 자료이며 진행 정본은 계속 이 Current State다. 기존 승인 본문은 바꾸지 않았다.

### O0 실행 정리

- 종합 원문: `validation/body-v1-O0-20261103/report-O0.md`, 작성자 원문: `validation/body-v1-O0-author-20261103/report-O0.md`.
- 독립 미달 원문: `validation/body-v1-O0-review2-20261103/verdict.md` (SHA256 `f62a216d5bf81c0968ec83b360e66b1f5fa871e5e3ac6c5574e03d44e302b3e1`).
- 잔존: F1 최대 외피 틈 검사와 F4 필수 목표/지지점 보존. F2 집계/F3 실제 RGBA 양방향은 r3에서 국소 보강·대조했고 새 제한 검토는 통과(`validation/body-v1-O0-local-review-20261103/verdict.md`). 전체 O0/제품 통과가 아니며 래스터 범위 제한은 원문에 명시했다.
- 최신 후보: r3 외부 manifest SHA256 `ea1db84303ab0747de12b589ffd719895bbbeb85a87da6c957566b0c5f165556`. r2 원문/코드 사본/전후 diff 보존. 작성자 쓰기 종료07:01:46.648 UTC. 추가 제품/commit/push 없음.
- 시간: `validation/body-v1-O0-20261103/time-budget.json`. 실측 가능한 시작은 05:04:12 UTC이며 선행 독해 시간은 미측정. 120분을 모두 소진했다고 주장하지 않는다. 남은 시간 안에 필수 F1/F4 정의·실측·새 심사를 닫을 입증된 경로가 없어 정리했다. 추가 작업량의 신뢰 가능한 분 단위 범위는 측정 불가.
- 보존: `validation/body-v1-O0-20261103/preservation-final.json`에서 승인 내용/승인 commit 줄/기존 tracked diff와 scoped 제품 소스 불변을 대조했다. 원본 PNG·기존 scene-format 검사·기존 서버를 보존했다. app/dist는 허용된 baseline build로 갱신했다. 추가 commit/push 없음.

### 2026-11-04 현황 정리 및 커밋 인계

- 사용자 최신 지시: “왜 멈춘거야? 어디까지 됐는지 확인해서 정리해주고 커밋해줘”. 이번 제품 작업의 로컬 커밋이 명시 승인됐다. 원격 push 승인은 아니다.
- 기존 Current State 작성자 `/root/body_v1_resume` 및 관측 보완 역할이 `Selected model is at capacity. Please try a different model.` 오류로 종료됐다. `/root`가 이 최종 인계 기록의 작성권을 회수한다. 제품 소스는 수정하지 않는다.
- 마지막 제품 pin: `validation/body-v1-postVB-20261104/product-pin/product-manifest.json`, SHA256 `7411b942511a1a59c28d697f97b01bf923900ee6006fb7311819220362dd7f0d`. 커밋 준비 시 소스/자산 56개 재대조 불일치 0, scene-format 테스트 3개 통과를 확인했다.
- 새 A 1회차 정식 출력 검사 완료/중간 심각도 6건/계속 판정. 2회차 반환은 있으나 조정 역할 오류로 회차 저장·검사·비교 미완료다. 원문 반환이 agent 상태 목록에 노출된 사실도 기록하며 향후 새 검증 입력에 전달하지 않는다. 수렴/통과 판정 없음. 새 최종 B는 미실시다.
- 환경 관측 R17 후보의 제한 심사는 반례로 미달했고 후속 후보 종결도 미완료다. 기존 동결 원본을 고치거나 미채택 후보를 통과로 취급하지 않는다.
- 기존 120분 1회 보완 창의 마감은 이미 경과했다. 오류 대기를 실행 완료 또는 승인된 추가 예산으로 계산하지 않는다. 이번 사용자 지시는 현황 정리·커밋이며 새 제품 보완/검증 예산 승인으로 확대하지 않는다.
- 사용 가능한 구현과 검증 공백을 `docs/ARTICULATED_BODY_V1_STATUS.md`에 정리한다. 전체 v1 종결은 미완료 상태로 보존하고, 제품·필요 자산·관련 문서를 선별해 중간 커밋한다. 다른 스킬 수정/별도 저장 장면/로컬 참고 원본/검증 대용량 원문은 제외한다.


