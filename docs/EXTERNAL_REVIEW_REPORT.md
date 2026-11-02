# 추가 검증: 이미지 포즈 보정 — 2026-11-02

기존 보정 필요 466개 전체 원본 대조 후 205개 장면 배치용 보정본·261개 미해결로 구분했습니다. 기존 검수 전 535개 파일은 해시가 보존됐습니다. 1001개 형식 확인, 1398회 체형별 적용, 실제 Chrome 필터·적용·저장·Undo/Redo·단독 캡처 검사와 단위 테스트 14/14 및 프로덕션 빌드를 통과했습니다.

[보정 범위·실행 증거·제한](POSE_CORRECTION_REPORT.md), [미해결만 보기](review-evidence/2026-11-02-pose-correction/UNRESOLVED.md). 205개도 단일 시점의 근사 포즈이며 손가락·시선·숨은 깊이·정밀 접촉은 보장하지 않습니다. 아래는 이전 검증 이력입니다.

---

# 외부 검증 보고서

## 2026-11-02 이미지 포즈 1,001개의 3D 변환 초안

이미지 등록에 이어 **원본 PNG → RTMW3D-X CPU 추정 → 앱의 고정 길이·제한 관절에 재배치 → 변환 카드 적용**을 구현했습니다. 준비 작업에서만 모델을 실행하며 편집기에서는 완성된 JSON만 읽습니다. 원본 이미지와 모델은 외부 API에 전달하지 않았습니다. [변환 방식·재현·제한](POSE_CONVERSION.md).

- 원본 1,001개 전체 추정 및 변환 JSON 생성. 전 파일의 회전 포맷·원본 해시 연결 검증 통과. 변환 중 뼈 길이·인물 루트 위치 불변 조건도 검사했습니다.
- 모델 점수와 관절 방향 적합 오차 기준 **일반 추정 535개 / 보정 필요 466개**. 두 분류 모두 시각 검수 완료를 뜻하지 않습니다. **보정 필요 항목의 정확한 원본 재현은 남은 작업**입니다. 품질별 필터를 제공하며 손가락·접촉·시선·무게중심은 복원하지 않습니다.
- 대표 비교 6개를 실제로 열었고, 실패가 드러난 무릎꿇기 0301·바로눕기 0401·엎드리기 0451에 개별 보정을 추가했습니다. 원본의 의자 면·손 접촉·가려진 관절까지 일치한다고 판정한 결과는 아닙니다. 시각 검수 상태는 자동으로 참으로 올리지 않았습니다.
- 변환 카드를 선택하면 현재 인물에 추정 관절을 적용하고 원본을 옆에 표시합니다. 잘못된 원본 연결은 적용 전에 거부합니다. 직접 고친 결과를 원본 번호와 연결해 내 포즈로 저장·백업할 수 있습니다. 변환 데이터는 `converted-pose` 묶음으로 일반 포즈 JSON 입력에서도 읽습니다.
- 포즈 적용 후 단독 편집 시점을 새 자세의 전체 크기에 다시 맞춰 눕는 자세가 잘리지 않게 했습니다. 원래 작업 카메라와 촬영 컷은 유지합니다.
- 접지 옵션이 켜진 변환 포즈는 몸 전체 최저점을 기존 발바닥 높이에 맞춰 눕는 자세의 바닥 관통을 줄입니다. 수평 위치·체형·뼈 길이는 유지하며 Y 보정과 관절 변경이 Undo/Redo에 함께 들어갑니다.
- 기존 통합 스킬의 포즈 참조 문서를 갱신하고 설치 사본과 일치함을 확인했습니다. 호출은 `$cutscene-studio` 그대로이며 로컬 검색 helper는 상위 5건만 반환합니다. 스킬 검사 통과.

실제 실행: 단위 14/14, Vite 배포 빌드, `converted-poses-check.mjs --all` 통과. 선택 인물만 변경·다른 인물 보존·체형/길이/XZ/원래 카메라 보존, Undo/Redo, 눕기 적용, 손상된 출처 해시 거부를 3001 배포본에서 확인했습니다. 기존 직접 편집·라이브러리·단독 화면·이미지 검색 회귀 검사도 수행했습니다. [검증 증거](review-evidence/2026-11-02-pose-conversion/).

실측 추정 실행은 샘플 20개 약 32초와 나머지 981개 약 1,301초였습니다. 후자는 CPU 4스레드이며 다른 개발·검증 작업이 함께 실행됐으므로 독립 성능 벤치마크가 아닙니다. 모델·Python은 Git 제외한 별도 준비 환경이고 일반 편집기에 추론 의존성을 추가하지 않았습니다. 원본·추정점·변환 파일도 개인 로컬 폴더로 유지합니다. 다른 PC에서는 원본 등록과 변환을 다시 실행해야 합니다.

---

## 2026-11-02 편집 성능 개선과 Drive 이미지 레퍼런스

선택 인물 단독 포즈 편집, 기본 가벼운 화면, 변경 시에만 렌더링, 드래그 중 촬영 미리보기 정지, 같은 목표의 반복 IK 계산 억제를 적용했습니다. 단독 시점은 임시 편집 카메라이며 원래 작업 카메라와 전체 장면을 저장·캡처합니다. [성능 설정과 측정 범위](PERFORMANCE.md).

6명 장면·1600×1100 창, 포즈 모드 전후 비교:

| 항목 | 이전 `2f2e3bf` | 변경 후 |
|---|---:|---:|
| 주 화면 draw calls | 593 | 97 |
| 주 화면 triangles | 121,428 | 20,220 |
| 편집 버퍼 | 1600×1100 | 1024×704 |
| 정지 2.5초 주 화면 렌더 | Intel 52 / 소프트웨어 2 | 둘 다 0 |
| Intel Iris Xe 이동 시 FPS | 21.9 | 26.9 |
| 강제 SwiftShader 이동 시 FPS | 1.2 | 4.4 |

FPS는 2.5초 표본으로 환경 부하에 따라 달라집니다. 변경 후 Intel 측정은 다른 회귀 검사를 마친 뒤 별도 실행했으며, 동시에 검사할 때 18.9fps도 관찰됐습니다. SwiftShader는 비교용 강제 설정입니다. 실제 사용자 크롬의 그래픽 가속 설정이나 전체 CPU·전력 절감률을 확정한 결과는 아닙니다. 앱 **렌더링 정보**에서 해당 브라우저가 사용하는 장치를 확인할 수 있습니다.

Drive의 PNG 1,001개·분류 20개를 로컬 이미지 레퍼런스로 등록했습니다. 태그 목록과 모든 이미지의 SHA-256이 일치했습니다. 36개씩 표시하며 번호·분류·태그 검색, 이미지 고정, 현재 실제 3D 자세와 원본 번호 연결 저장을 제공합니다. **2D 이미지를 자동 3D 변환한 기능이 아닙니다.** 저장한 3D 자세는 기존 내 포즈 카드로 적용합니다. 원본·검색 목록은 Git에서 제외한 개인 로컬 자료이며 다른 PC는 [등록 안내](IMAGE_REFERENCES.md)에 따라 내려받습니다.

실제 실행 확인: 단위 13/13, Vite 8.3.5 배포 빌드(57 모듈), 의존성 감사 0건. 기존 일반 흐름·JSON 오류 UI·체형·IK 연속성·가슴 참조·잔여 결함·직접 편집/라이브러리 회귀 검사 통과. 직접 편집 검사는 단독 모드를 나갈 때 카메라가 복원되는 새 동작을 반영했습니다.

추가 검사:

- `solo-view-check.mjs` 8묶음: 정지 GPU 호출 0, 전체 인물·소품·동등한 관절 회전과 원래 카메라 저장, 전체 장면 컬러 PNG와 단독 중 PNG의 바이트 일치, Depth 1600×900, 편집 품질 변경에도 PNG 동일, 인물 전환, 단독 해제·수동 미리보기, 렌더링 정보.
- `performance-check.mjs`: 하드웨어·소프트웨어 모드에서 실제 주 렌더 시 보이는 인물 1명과 정지 렌더 0 확인.
- `image-references-check.mjs` 4묶음: 1,001개·20분류·페이지당 36개, ID로 로컬 PNG 열기, 참고 이미지 고정 및 실제 현재 관절 저장·백업 연결, 분류 검색·닫기. 페이지 오류 0.

증거: [전후 측정 및 회귀 결과](review-evidence/2026-11-02-performance/), [단독 화면](review-evidence/2026-11-02-performance/solo.png). PNG는 직접 열어 전체 촬영 장면이 유지되는 것을 확인했고, 단독 편집 화면과 이미지 검색 화면도 열어 확인했습니다. 손으로 장시간 조작한 체감, 타 브라우저, 이미지 전체의 3D 복원 정확도는 검증 범위가 아닙니다. 배포 JS가 500kB를 넘는 기존 번들 경고는 남아 있습니다.

---

## 2026-11-02 직접 조작과 참조 포즈 라이브러리

사용자가 관절/기즈모 선택이 어렵다고 보고해 기본 조작을 바꿨습니다. **인물 이동 / 포즈 잡기 / 세부 조정**을 분리하고, 원을 잡는 위치와 실제 움직이는 관절을 일치시켰습니다. [사용법](DIRECT_EDITING.md).

- 기본 모드는 인물 전체 이동. 몸의 어느 부분을 잡아도 같은 인물 객체가 바닥에서 움직이며 Shift 드래그는 높이를 조절합니다.
- 포즈 모드는 이름 붙은 10개 점을 제공합니다. 무릎은 무릎 자체를 움직여 아래 다리가 따라오고, 발목은 위 다리·무릎으로 목표를 맞춥니다. 팔꿈치·손목도 같은 원칙입니다. 겹친 점은 벌리고 실제 위치까지 연결선을 표시합니다.
- 기존 무릎/팔꿈치 Move가 발목/손목 끝을 움직이던 체인을 수정했습니다. 곧게 편 다리를 몸 쪽으로 당길 때 CCD가 정지하던 경우는 2뼈 힌지 해를 초기 후보로 사용하되 기존 길이·관절·연속성 제한 안에서 개선될 때만 채택합니다.
- 정면·옆면·위 보기와 편집용 벽 걷어내기를 추가했습니다. 저장 컷·미리보기·PNG에서는 원래 벽을 복원합니다. 기본 화면에서는 상세 수치/기즈모를 숨기고 세부 조정에서 제공합니다.
- 저장된 포즈·개별 인물·장면·프로젝트 JSON을 **선택 인물에** 적용합니다. 여러 참조 인물이 있으면 선택 창을 제공합니다. 키·등신·가슴 형태·뼈 길이·수평 위치를 복사하지 않으며 발 높이 유지는 Y만 보정합니다.
- 기존 cutscene-studio 포즈 지침으로 작성한 초기 10개 참조와 렌더 미리보기·[정밀 포즈 JSON](../examples/poses/)을 포함했습니다. 외부 갤러리 이미지는 사용하지 않았습니다.
- 내 포즈는 IndexedDB에 보관됩니다. 자동 모음은 관절 자세 변화만 기록하고 중복을 억제합니다. 이름 지정·검색·삭제·파일 백업·병합 복원을 제공합니다. 브라우저 프로필/접속 주소별 저장이며 프로젝트 Save와 별개이므로 정기 백업이 필요합니다.
- 설치된 기존 스킬에도 포즈 JSON 검증·재사용 흐름과 inspect 지원을 반영했습니다. 새 스킬을 분리하지 않았습니다.

실제 재검증: Vite 8.3.5 빌드(55 모듈), 단위 **13/13**, 기존 일반 브라우저·JSON 오류 UI·체형·IK·가슴 참조·잔여 결함 회귀 검사 통과. 기존 수치/기즈모 검사는 세부 조정 모드에 진입해 동일 동작을 검사하도록 했고, IK 검사는 관절이 실제로 움직이며 루트가 이동하지 않는다는 조건도 추가했습니다. 의존성 감사 0건 유지.

새 `scripts/direct-editor-check.mjs` **12묶음** 통과, 페이지 오류 0:

- 통째 이동, 무릎 직접 이동과 아래 다리 추종, 발목 연동, 뼈 길이 유지.
- 곧은 다리의 짧아진 목표: 초기 오차 약 0.16065m → 약 3.2e-16m, 무릎 약 73.79° 굽힘.
- 부정한 참조 관절 거부, 선택 인물만 포즈 변경, 체형/수평 위치 유지.
- 자동 모음·중복 억제·이름 검색·새로고침 후 지속·백업/복원·삭제 지속. 모두 삭제한 라이브러리는 새로고침 후에도 빈 상태 유지.
- 사용자가 여는 **3001 배포 빌드**에서도 몸 드래그·무릎 이동·길이 고정·포즈 저장과 재접속 지속을 별도 확인.

증거: [검사 요약](review-evidence/2026-11-02-direct-editing/summary.json), [실제 조작 화면](review-evidence/2026-11-02-direct-editing/pose-handles.png), [라이브러리 화면](review-evidence/2026-11-02-direct-editing/library.png). 초기 포즈의 3D 미리보기와 실제 관절 연결을 열어 확인했습니다. 손/의자 접촉, 전신 균형·충돌·발 고정, 많은 포즈를 장기간 모았을 때의 성능까지 자동 해결·검증한 결과는 아닙니다. 라이브러리는 브라우저 저장소 정책과 용량의 영향을 받습니다.

---

## 2026-11-02 가슴 위치·형태 참조 추가

사용자가 여성 인물의 가슴 위치가 최종 이미지에서 어긋나는 문제를 알려, 공통 마네킹 흉곽에 붙는 선택적 입체 참조를 추가했습니다. 여성 전용 전체 리그나 연부 조직 시뮬레이션은 아닙니다. 각 인물의 체형 설정에서 표시를 켜고 높이·좌우 간격·돌출을 조절한 뒤 체형 적용을 누릅니다. [사용 안내](CHEST_REFERENCE.md), [불러올 예제 JSON](../examples/chest-reference.json).

- `actors[].chest`와 정밀 상태의 `bodyProfile.chest`에 설정 저장. 미지정한 기존 장면은 원래 형태 유지.
- 흉곽 로컬 좌표에 고정해 포즈를 따라 이동하며 뼈 길이·키·등신을 바꾸지 않음.
- 실제 지오메트리이므로 컬러/깊이 캡처에 포함. 전달 묶음의 `anatomyReferences`에 좌우 체적 중심의 월드 좌표와 촬영 화면 좌표 추가. `actorIndex`는 같은 묶음 editorState의 인물 배열과 대응하며, ID 없는 수동 추가 인물도 식별 가능.
- 컷신 스킬의 포맷·작화 지시·번들 검증기를 갱신. 설치된 스킬의 앱 경로는 `D:\github\cutscene-studio`, 배포본의 기록 경로는 상대 경로로 유지.

실제 검사: Vite 8.3.5 빌드, 단위 테스트 **10/10**, 새 `chest-reference-check.mjs`의 3D/브라우저 검사, 기존 일반 편집·체형·IK 검사 통과. 새 검사는 흉곽 추종·로컬 고정·뼈 길이·키/등신·인물별 독립 설정·Undo/Redo·저장 왕복·개별 From File·컬러/깊이 형태 차이·화면 좌표·해제를 확인했습니다. 새 기능 검사 페이지 오류 0, 형태를 움직인 뒤 뼈 길이 변화 약 1.1e-16m, 체형 측정 오차 0. 스킬 원본/설치본의 공식 기본 검사와 새 장면의 실제 스키마 검증도 통과했습니다. 의존성 감사는 여전히 0건입니다.

정면의 얕은 돌출은 기존 8비트 선형 깊이 출력에서 양자화되어 구분되지 않을 수 있어 사선에서도 촬영했습니다. 화면 좌표는 체적 중심이며 유두 위치나 가림 검사 결과가 아닙니다. 기본 수치는 편집용 초안으로 캐릭터 정본에 맞춰 조절해야 합니다. 실제 최종 이미지 생성까지 수행하거나 위치 보존을 검증한 결과는 아닙니다.

증거: [검사 요약](review-evidence/2026-11-02-chest/summary.json), [컬러 캡처](review-evidence/2026-11-02-chest/color.png), [깊이 캡처](review-evidence/2026-11-02-chest/depth.png). 전체 로컬 산출물과 설치 스킬의 변경 전 백업은 `validation/chest-reference/`에 있습니다.

---

## 2026-11-02 의존성 취약점 수정 및 Vite 8 회귀 검증

`fb34e79` 이후 남아 있던 F13을 수정했습니다. **이번 조회 시점의 전체 npm 감사 결과는 2건에서 0건으로 감소했습니다.** 설치·빌드·감사의 대상은 `app`이며 저장소 최상위에서는 `npm --prefix app ...`로 실행했습니다. 아래 이전 절의 "취약점 2건 미해결"은 과거 기록이며 현재 상태에는 해당하지 않습니다. 이 절은 수정 담당 Codex가 실제 설치·빌드·브라우저 실행으로 재검증한 결과입니다.

### 변경

- Vite 5.4.21(`^5.2.0`) → **8.3.5 고정 버전**, `package-lock.json` 갱신.
- 취약 간접 의존성 **esbuild 0.21.5 제거**. 새 설치와 잠금 파일 모두 esbuild 항목 없음. Vite 8의 빌드 엔진은 Rolldown이며 이번 잠금 파일은 1.2.16을 사용합니다.
- `app/package.json`에 Node 요구 사항 `^20.19.0 || >=22.12.0` 명시. README와 외부 검증 안내도 갱신. 실제 검증은 Node **24.22.2**에서 수행했으며 모든 최소 버전을 별도로 실행한 결과는 아닙니다.
- 현재 설치된 Vite의 라이선스로 고지 모음을 재생성하고 배포 빌드에 동일하게 포함. 재생성 도구의 출처 문구와 줄 끝 공백을 정리했으며 라이선스 본문 내용은 유지.
- 앱 기능·리그·저장 포맷의 변경 없음.

업그레이드 검토 자료: [Vite 8 발표](https://vite.dev/blog/announcing-vite8), [공식 마이그레이션 안내](https://vite.dev/guide/migration). 버전별 실제 요구 사항과 설치 결과는 `package-lock.json`과 아래 증거가 기준입니다.

### 실제 결과

| 검사 | 결과 |
| --- | --- |
| 갱신한 잠금 파일에서 `npm ci` | 성공 |
| 전체 `npm audit --json`(개발 의존성 포함) | **0건**: high/moderate/low/critical 모두 0 |
| `npm audit --omit=dev --json` | **0건** |
| Vite 8.3.5 배포 빌드 | 성공, 50 모듈 |
| 단위 테스트 | **9/9 통과** |
| 일반 브라우저 흐름 | 통과: 편집·Undo·저장 왕복·컬러/깊이/세로 PNG·전달 묶음, 페이지 오류/외부 요청 0 |
| JSON 오류 UI | **11항목 통과**, 페이지 오류 0 |
| 체형/관절 검사 | 5·8·9.5등신 실측, 80개 포즈·길이 보존, 저장 왕복·잘못된 뼈 거부 통과 |
| 실제 IK 마우스 드래그/수렴 | 4부위 모두 입력당 월드 회전 ≤20°, 길이 변화 ≤3.4e-16m. 반복 목표 오차 약 0.00000398m로 수렴 |
| 보고 항목 회귀 검사 | **7묶음 통과**: From File, 초기 제안, 구형 파일 출처/경고, 조명, 삭제, 라이선스 MIME |
| Windows 실행기 | Node 없는 PATH·명시 Node·포트 3013에서 실제 HTTP 기동 통과 |
| 통합 스킬 도구 | **9항목 통과**, 선택 Python은 실행 파일을 명시해 검사 |
| 시각 확인 | 실제 생성 컬러·깊이 PNG를 열어 인물/소품/공간·동일 구도·가이드 제외 확인 |
| 라이선스 | 생성된 고지와 `dist`의 고지 바이트 일치 |

검증 환경은 Windows, Node 24.22.2, Google Chrome/Playwright입니다. 정적 배포는 3001, 새 Vite 8 개발 서버는 3002에서 실행했습니다. 기존 3종 브라우저 검사는 SwiftShader, 실제 마우스 IK와 추가 회귀 검사는 D3D11을 사용했습니다. 검사 스크립트를 우회하거나 assertion을 완화하지 않았습니다.

GitHub에 포함한 증거: [감사 수정 전](review-evidence/2026-11-02-dependencies/audit-before.json), [전체 감사 수정 후](review-evidence/2026-11-02-dependencies/audit-after.json), [운영 의존성 감사](review-evidence/2026-11-02-dependencies/audit-production.json), [전체 결과 요약](review-evidence/2026-11-02-dependencies/summary.json), [컬러 PNG](review-evidence/2026-11-02-dependencies/color.png), [깊이 PNG](review-evidence/2026-11-02-dependencies/depth.png). 로컬 로그는 `validation/dependency-upgrade/`에 있습니다.

단일 JS 청크 500kB 초과 경고는 남아 있으나 빌드는 통과합니다. npm 감사 0건은 해당 시점의 알려진 의존성 취약점 조회 결과이며 앱 전체의 보안이나 아래 미검증 범위를 보증하지 않습니다. 외부 GLB·완전 오프라인 첫 기동·다른 브라우저·장시간 성능·생성 모델 구도 보존은 이번에도 검증 범위를 확대하지 않았습니다.

---

## 2026-11-02 후속 수정 및 실제 재검증

이 절은 `ca222a1` 이후 사용자의 수정 요청으로 수행한 결과입니다. 아래 원래 외부 검증 본문은 당시의 발견 기록으로 보존하며, **현재 수정 상태는 이 절을 우선**합니다. 최초 독립 검증과 달리 이 절은 수정 담당 Codex의 재검증입니다.

**판정: 핵심 흐름 사용 가능. 급반전 재현과 보고된 잔여 기능 결함을 수정했으며, 미검증 범위와 의존성 문제는 아래에 남깁니다.**

| 항목 | 현재 조치 | 실제 확인 |
| --- | --- | --- |
| F1·F2 From File 입력 우회 | `ca222a1` 수정 유지 | 손상·문법·늘어난 뼈 거부, 기존 상태 보존, 정상 추가/Undo, 재열기 재확인 |
| F3 IK 급반전 | 큰 쿼터니언 회전 후 클램프 대신 실제 Euler 자유도별 감쇠 CCD. 오차를 줄이는 후보만 채택. 입력 한 단계의 축별 변화 ≤12°, 주요 관절 월드 회전 변화 ≤20° | Head·Neck·Right Wrist·Left Ankle 실제 기즈모 40스텝 드래그. 길이 변화 ≤3.4e-16m, 페이지 오류 0 |
| F4 수치 패널 | 기존 기즈모 종료 갱신 유지, 별도 IK 핸들 종료에도 패널 갱신 추가 | 기존 회전 기즈모 재현: 표시 오차 약 1.4e-14°, 슬라이더 한 칸 변화 0.5° |
| F5 컷 삭제 | `ca222a1` 수정 유지 | 앞 컷 삭제 후 활성 컷과 저장 인덱스 유지 |
| F6 최초 제안 혼합 | `studio.initialProposal`을 분리 보존. 현재 환경은 `studio.document`, 전달 묶음 `proposal`은 불변 초기 사본 | 방·조명 변경과 저장/재열기 후 초기 사본 유지, 실제 변경은 editorState에 존재 |
| F6 구형 파일 | 원본을 복원할 수 없는 경우 `proposalOrigin: legacy-current-state` 명시. 새 제안은 `scene-import` | 구형 프로젝트 Load 후 전달 묶음 출처 표시 확인 |
| F7 고정 정보 누락 | bodyProfile이 있고 boneLayout이 없으면 `LEGACY_RIG` 경고 | 적용 가능하되 원래 비율 검증 불가를 UI에 표시. 고정값 동시 변조에 대한 보안 보장은 하지 않음 |
| F8 조명 UI | 복원값과 프리셋 비교, 불일치 시 사용자 지정 표시 | Load·Undo 및 사용자 지정 위치 모두 확인 |
| F9 마지막 인물 삭제 | 빈 장면 허용으로 통일 | Delete/휴지통 모두 0명까지 삭제, Undo와 빈 장면 저장/재열기 확인 |
| F10 경로 의존 | Playwright 공통 탐색기, Python 설정/일반 명령 탐색과 미설치 skip, 촬영물 없는 경우 추적 fixture 사용. 실행기의 Codex 경로 제거 | NODE_PATH 없이 브라우저 검사, 명시 PYTHON으로 갤러리 검사, Python 미설치 skip, 선행 촬영물 없는 별도 사본 검사, Node 없는 PATH에서 실행기 기동 |
| F11 라이선스 다운로드 | `.txt`에 text/plain MIME 추가 | 실제 HTTP 응답 헤더 확인 |
| F12 출처 문구 | 배포에 없는 내부 app/.git 대신 upstream 커밋과 현재 Git 이력 안내 | 문서 대조 |

### IK 비교와 사용상 한계

같은 초기 장면과 마우스 경로(`scripts/ik-continuity-check.mjs`)로 이번에 측정한 결과입니다. 원래 보고서의 최대 128°와는 시작 포즈·경로 조건이 다르므로 동일 조건의 아래 전후 값으로 비교합니다.

| Move 부위 | 수정 전 최대 월드 회전/입력 | 수정 후 |
| --- | --- | --- |
| Head | 44.88° | 20.00° |
| Neck | 30.89° | 18.34° |
| Right Wrist | 8.71° | 9.30° |
| Left Ankle | 5.71° | 7.22° |

원래 30°를 넘는 재현 사례를 억제했고 모든 측정 부위가 20° 상한을 지켰습니다. 모든 부위의 회전량을 이전보다 작게 만들었다는 의미는 아닙니다. 별도 도달 가능한 목표를 60회 반복하면 오차가 0.31637m에서 약 0.00000398m로 단조 감소했습니다. 한 입력에서 즉시 목표에 닿는 것보다 자세 연속성을 우선하므로 빠른 큰 드래그에서는 목표를 덜 따라갈 수 있습니다. 전역 최적해·물리 속도 제한·접촉/충돌 해결을 보장하지 않습니다.

### 실행 결과와 재현 명령

환경: Windows, Node v24.22.2, Google Chrome/Playwright. 기존 3종은 ANGLE SwiftShader, 새 마우스 회귀 검사는 ANGLE D3D11. 프로젝트 내 `.review-tools`의 Node/Playwright를 사용했습니다.

- 빌드 통과: Vite 5.4.21, 49 모듈. 단일 JS 청크 500kB 초과 경고는 유지.
- 단위 테스트 **9/9** 통과: 누락된 rig lock 경고와 잘못된 초기 제안 검사 추가.
- 기존 브라우저 검사 **3종 통과**: 일반 편집, JSON 오류 UI, 체형·80개 포즈·뼈 길이.
- 새 IK 검사 통과: 4부위 실제 드래그와 반복 목표 수렴.
- 새 잔여 항목 회귀 검사 **7묶음 통과**, 페이지 오류 0.
- 기존 외부 검증의 `verify-fixes.mjs` **6/6** 통과.
- 스킬 검사 **9항목 통과**(PYTHON 실행 파일 지정). Python 없는 별도 사본에서는 핵심 8항목 통과, 선택 갤러리만 skipped. 선행 handoff 파일 없이 추적 fixture/합성 PNG 사용도 확인.
- Windows 실행기: 시스템 PATH에서 Node를 제외하고 CUTSCENE_NODE 지정, 포트 3013 실제 HTTP 기동 통과.
- 스크린샷을 실제로 열어 예제 화면·조명 UI·드래그 후 자세를 확인.

```powershell
# 먼저 빌드, 정적 서버 3001과 Vite 서버 3002 실행(인계 문서 참고)
node --test scripts/scene-format.test.mjs scripts/scene-feedback.test.mjs
node scripts/browser-check.mjs
node scripts/validation-ui-check.mjs
node scripts/body-rig-check.mjs
node scripts/ik-continuity-check.mjs
node scripts/review-regression-check.mjs
node scripts/check_cutscene_skill.mjs
node scripts/launcher-check.mjs
```

`launcher-check.mjs`는 Windows의 빈 포트 3013이 필요합니다. `ik-continuity-check.mjs --baseline`은 비교 자료 생성용이며 이전 구현은 Git에서 별도로 체크아웃해야 합니다. 현재 구현에서 실행하면 현재 구현의 값을 기록합니다.

GitHub에 함께 포함한 근거: [검사 결과 요약 JSON](review-evidence/2026-11-02/summary.json), [편집 화면](review-evidence/2026-11-02/editor.png), [IK Head 조작 후](review-evidence/2026-11-02/ik-head-after.png). 전체 입력·이미지·로그는 로컬 `validation/ik-continuity`, `validation/review-regression`, `validation/post-review`, `validation/external-review/fixes`에 있습니다. 전체 대용량 산출물은 Git에서 제외합니다.

### 여전히 남는 범위

- F13: Vite high 1건/esbuild moderate 1건의 기존 의존성 감사 기록은 해결하지 않았습니다. 메이저 업그레이드와 별도 회귀 검증 대상입니다. 기본 배포 정적 서버와 개발 서버의 영향 범위는 원래 보고서를 참고하세요.
- GLB 스키닝/모프·외부 자산, 완전 오프라인 첫 기동, 사람 손 조작, 다른 브라우저, 장시간 성능, 실제 생성 모델의 구도 보존은 이번에도 추가 검증하지 않았습니다.
- IK 입력 변화 상한은 재현된 급반전을 막는 제약이며 모든 자세의 자연스러움이나 정확한 접촉을 증명한 결과는 아닙니다.

---

## 최초 외부 검증 기록(수정 전 상태 포함)

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
