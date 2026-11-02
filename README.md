# 로컬 컷신 스튜디오

소설에서 LLM이 제안한 공간·인물·카메라·조명을 불러와 직접 수정하고, 이미지 생성용 참조를 촬영하는 로컬 도구입니다. Python 대신 JavaScript와 Three.js를 사용합니다. [pose-toolkit](https://github.com/fanverseio/pose-toolkit)을 기반으로 확장했습니다.

## 실행

검증용 비공개 저장소를 클론해 실행하는 PowerShell 명령입니다. 해당 저장소 접근 권한이 있는 GitHub 계정으로 인증해야 합니다.

[저장소 인계와 새 설치 확인 결과](docs/REPOSITORY_HANDOFF.md)도 함께 확인하세요.

```powershell
git clone https://github.com/muzik1014/cutscene-studio.git D:\github\cutscene-studio
Set-Location D:\github\cutscene-studio
npm --prefix app ci
npm --prefix app run build
.\start.cmd
```

외부 검증이나 새 PC의 `D:\github\<레포명>`에서 시작한다면 [외부 검증 인계 문서](docs/EXTERNAL_REVIEW.md)를 먼저 읽으세요. 저장소 포함 범위, 새 설치, 자동·수동 검증, 알려진 제약과 검증 AI용 요청문을 정리했습니다. 결과는 [검증 보고서 양식](docs/EXTERNAL_REVIEW_REPORT_TEMPLATE.md)에 남길 수 있습니다.

이 작업 폴더에서 `start.cmd`를 실행하고 브라우저로 http://127.0.0.1:3001 을 여세요. 소스 클론 후에는 아래 명령으로 `app/dist`를 먼저 빌드합니다. 편집 중 외부 API나 인터넷 연결이 필요하지 않습니다. 실행기는 `CUTSCENE_NODE` 설정, PATH의 Node.js, 프로젝트 내부 `.review-tools/node/node.exe` 순으로 찾습니다. 특정 PC의 Codex 설치 경로는 필요하지 않습니다.

다른 PC나 소스만 복사한 경우 Node.js 20.19 이상인 20.x 또는 22.12 이상과 npm을 설치한 뒤 `app`에서 다음을 실행합니다. 검증 환경은 Node.js 24.22.2입니다. 최초 의존성 설치에는 인터넷 연결이 필요합니다.

```powershell
npm ci
npm run build
```

이후 루트 폴더의 `start.cmd`를 사용합니다. 개발 중에는 `app`에서 `npm run dev`를 사용할 수 있습니다. 포트는 3001이며 서버는 로컬 주소에만 바인딩합니다.

## 사용 순서

1. 왼쪽 **예제 장면**으로 두 인물·탁자·상자가 있는 장면을 엽니다.
2. 소설을 [장면 작성 지침](prompts/scene-planner.md)과 함께 LLM에 전달합니다. 생성된 JSON은 **장면 JSON 열기** 또는 붙여넣기로 적용합니다.
3. 인물·소품을 클릭하거나 오른쪽 목록에서 고릅니다. 위쪽 Move / Rotate와 오른쪽 관절 슬라이더, Enable IK로 조정합니다. 빈 공간을 드래그하면 시점을 회전하고 휠로 거리를 조정합니다.
4. 왼쪽에서 방 크기·벽·빛을 조절합니다. 작업 화면을 돌려 구도를 찾고 **구도 저장**을 누릅니다. 기존 컷은 **갱신**으로 현재 카메라를 저장합니다.
5. 촬영 미리보기를 확인하고 **PNG 캡처**, 필요하면 **Depth PNG**를 저장합니다. 정밀 작업 상태는 위쪽 **Save**로 저장하고 **Load**로 다시 엽니다.
6. 최종 이미지 생성에는 캡처, 캐릭터 정본 이미지, **작화 지시문**을 전달합니다. **LLM 전달 묶음**은 컬러·깊이 이미지의 data URL, 정밀 프로젝트와 지시문을 담은 JSON입니다. 일반 이미지 생성 UI에서는 별도 PNG를 직접 첨부하는 편이 편리합니다.

## 현재 구현 범위

- LLM용 장면 JSON 검증과 배치, 인물 기본 포즈 4종
- 기존 마네킹 관절·IK·이동·회전·GLB 가져오기 기능 재사용
- 방, 상자·탁자·의자·구체, 주광 방향·색·세기와 주변광 조정
- 작업 카메라와 저장된 촬영 카메라 분리, 여러 카메라 컷, 화면비 변경
- 가이드·선택 강조 없는 컬러 PNG와 선형 깊이 PNG, 긴 변 1600픽셀
- 관절·소품·공간·카메라·컷을 포함하는 프로젝트 저장과 되돌리기
- LLM 전달용 이미지·정밀 상태·작화 지시문 내보내기

카메라 컷은 현재 동일한 인물·포즈·공간을 공유합니다. 컷별로 다른 동작을 저장하려면 별도 프로젝트 파일을 사용하세요. 컷별 포즈 상태, 접촉·접지 제약, OpenPose 출력과 VRM은 후속 고도화 대상입니다. 소설을 자동 분석하는 LLM 호출과 최종 이미지 생성 호출은 아직 연결하지 않았습니다. 일반 이미지 참조만으로 생성 모델의 정확한 구도 보존을 보장하지 않습니다.

정밀 프로젝트의 `studio.initialProposal`과 전달 묶음의 `proposal`은 최초 장면 제안을 보존합니다. `studio.document`의 공간·조명·제목·원문은 현재 편집값이며, 인물·소품 배치와 관절은 `mannequins`·`importedModels`가 기준입니다. 전달 묶음의 `editorState`는 이 현재 상태 전체를 담습니다. 구형 프로젝트는 최초 제안을 복원할 수 없어 `proposalOrigin: legacy-current-state`로 표시합니다. 인물이 없는 장면도 지원하며 Delete 키와 목록 휴지통 모두 마지막 인물을 삭제할 수 있습니다.

## 설계와 출처

- [오픈소스 조사와 채택 판단](docs/OPEN_SOURCE_RESEARCH.md)
- [고도화 설계와 구현 순서](docs/DESIGN.md)
- [조사한 11개 프로젝트와 소스 경로](research/sources.json)
- [재사용 코드와 라이선스](THIRD_PARTY_NOTICES.md)
- [로컬 검증 결과](docs/VALIDATION.md)

## 검증 명령

```powershell
node --test scripts/scene-format.test.mjs scripts/scene-feedback.test.mjs
```

브라우저 검사는 `npm install --prefix .review-tools --no-save playwright`와 Google Chrome 설치 후 실행합니다. 스크립트는 프로젝트의 Playwright를 찾아 사용하므로 개발 PC 경로나 `NODE_PATH` 수정이 필요하지 않습니다. 서버와 검사 순서는 [외부 검증 인계 문서](docs/EXTERNAL_REVIEW.md)를 참고하세요. IK 연속성은 `scripts/ik-continuity-check.mjs`, 잔여 결함 회귀는 `scripts/review-regression-check.mjs`로 확인합니다.

## 코덱스 통합 스킬

설치된 전용 스킬은 $cutscene-studio입니다. 예: $cutscene-studio 이 소설에서 필요한 컷을 골라 편집기용 장면 JSON을 만들어줘.

소설 해석·장면 JSON 작성과 검증·수정본 확인·작화를 한 진입점으로 연결합니다. 포즈 검색과 융합은 필요한 경우에만 요청합니다. [통합 결과와 백업 위치](docs/SKILL_INTEGRATION.md), [스킬 원본](skills/cutscene-studio/SKILL.md)을 참고하세요.

## JSON 오류를 코덱스에 전달하기

JSON 붙여넣기에서 검사만 또는 장면 적용을 누르면 오류·경고 목록이 표시됩니다. 오류는 적용을 차단하고 기존 장면을 유지합니다. 경고는 의도한 배치인지 확인할 항목이며 적용할 수 있습니다. LLM 수정 요청 복사를 눌러 이 대화에 붙여넣거나 보고서 저장으로 받은 JSON을 전달하세요. 원본 입력과 오류 경로가 함께 들어 있어 같은 JSON을 수정해 돌려받을 수 있습니다. 클립보드가 제한되면 선택 가능한 텍스트가 표시됩니다.

정밀 프로젝트의 구조도 Load 전에 검사합니다. 일부 공간 경고는 간단한 수치 조건이며, 실제 접촉·가림·시선·구도는 촬영 미리보기에서 확인해야 합니다.

## 인물 체형과 포즈

인물을 선택한 뒤 오른쪽 인물 체형 설정에서 키(cm)와 등신을 지정하고 체형 적용을 누르세요. 5·8·9.5등신 버튼과 직접 수치 입력을 지원합니다. 다른 인물에는 각각 별도 설정이 저장됩니다. 장면 JSON에서는 actors[].height(미터)와 headUnits를 사용합니다.

체형 설정을 적용한 뒤 포즈 조작에서는 뼈 길이·몸 크기가 고정됩니다. Root는 인물 전체 위치이고 다른 관절에는 위치 입력이 없습니다. Move는 선택 부위 끝점을 제약 IK로 움직이고 Rotate는 해당 관절을 회전합니다. 팔꿈치·무릎의 옆 꺾임과 각도 범위 이탈을 막으며 닿지 않는 목표를 위해 팔·다리를 늘리지 않습니다. 실제 충돌·손 접촉·발 고정까지 자동 해결하는 기능은 아닙니다.

키와 등신은 똑바로 선 중립 자세 기준입니다. 머리 크기를 조정하고 기존 몸통·팔다리의 상대 비율을 유지한 상태에서 전체 키를 맞춥니다. 별도의 팔다리 길이 커스텀 기능은 없습니다. 기존 프로젝트에 체형 정보가 없으면 원래 형태를 유지하고 체형 적용으로 새 설정을 만들 수 있습니다.
