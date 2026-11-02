# GitHub 검증용 저장소 인계

준비일: 2026-11-02.

후속 수정과 실제 재검증 결과는 [외부 검증 보고서의 최신 절](EXTERNAL_REVIEW_REPORT.md)을 우선 참고하세요. 현재 단위 테스트는 9개이며 IK 연속성·잔여 결함 회귀 스크립트가 추가되었습니다. 아래 설치 당시 기록의 8개 테스트와 구분합니다.

- 저장소: https://github.com/muzik1014/cutscene-studio
- 소유자: `muzik1014`
- 공개 범위: private
- 기본 브랜치: `main`
- 권장 클론 경로: `D:\github\cutscene-studio`

```powershell
git clone https://github.com/muzik1014/cutscene-studio.git D:\github\cutscene-studio
Set-Location D:\github\cutscene-studio
npm --prefix app ci
npm --prefix app run build
node --test scripts/scene-format.test.mjs scripts/scene-feedback.test.mjs
.\start.cmd
```

브라우저에서 http://127.0.0.1:3001 을 엽니다. 외부 검증자에게 저장소 접근 권한을 부여하거나, 소유자 계정으로 인증한 로컬 클론에서 검증하세요. 비공개 저장소 URL만으로 다른 계정의 접근이 허용되지는 않습니다.

앱·문서·검증 스크립트·스킬·출처·기반 예제를 최상위 저장소 하나로 구성했습니다. 원본 작업 폴더와 내부 `app/.git`은 보존하고 별도 사본에서 Git 저장소를 만들었습니다. 배포 사본의 스킬 `runtime.json`은 `appRoot:"."`로 바꿨으며, 다른 작업 폴더에서 도구를 실행할 때는 `--app-root D:\github\cutscene-studio`를 지정하세요.

`node_modules`, `dist`, 임시 도구와 과거 `validation` 산출물은 업로드하지 않습니다. 새 클론은 의존성 설치와 빌드가 필요합니다. 기존 자동 브라우저 검사에는 추가 Playwright/Chrome 설정이 필요하므로 [외부 검증 인계 문서](EXTERNAL_REVIEW.md)를 따라 실행하세요.

## 업로드 준비 중 확인한 결과

- 배포 사본에서 `npm ci`: 성공.
- 배포 사본에서 Vite 5.4.21 빌드: 성공, 49개 모듈.
- 포맷·피드백 단위 테스트: 8개 통과.
- 예제 장면 JSON: 앱 스키마 사용, 인물 2·소품 2·컷 2, 오류·경고 없음.
- 일반 자격 증명 패턴 검사: 일치 없음. 모든 종류의 민감 정보 검출을 보장하는 검사는 아닙니다.
- 기존 브라우저 테스트 전체를 업로드 준비 과정에서 재실행하지는 않았습니다.

실제 `D:\github\cutscene-studio` 클론 검사에서 단위 테스트가 제외된 `validation/project-initial.json`에 의존하는 문제를 발견했습니다. 실제 예제 프로젝트를 `scripts/fixtures/native-project.json`으로 포함하고 테스트 경로를 바꿔, 사전 브라우저 실행 없이 재현할 수 있도록 수정했습니다.

## 외부 검증에 포함할 의존성 문제

최초 인계에서는 Vite high 1건, 간접 의존성 esbuild moderate 1건이 보고되었습니다. 이후 2026-11-02 Vite를 8.3.5로 고정 갱신해 취약 esbuild 의존성을 제거했고, 새 잠금 파일 설치 후 전체 `npm audit`와 운영 의존성 감사 모두 0건을 확인했습니다. 현재 빌드에는 Node.js 20.19 이상인 20.x 또는 22.12 이상이 필요하며, Node.js 24.22.2에서 실제 실행을 확인했습니다. 상세 회귀 결과와 감사 원본은 [외부 검증 보고서 최신 절](EXTERNAL_REVIEW_REPORT.md)을 참고하세요. 감사 결과는 조회 시점에 따라 바뀔 수 있습니다.

또한 JS 단일 청크가 500kB를 초과한다는 빌드 경고가 있습니다. 기본 사용 서버는 Vite 개발 서버가 아니라 `scripts/serve.mjs`의 루프백 정적 서버입니다.

검증 결과는 [보고서 양식](EXTERNAL_REVIEW_REPORT_TEMPLATE.md)에 남기세요.
