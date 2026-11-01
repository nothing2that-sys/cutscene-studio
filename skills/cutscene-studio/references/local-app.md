# 로컬 편집기 연결

편집기 프로젝트는 app/src/scene-format.js와 scripts/serve.mjs, start.cmd를 가진 폴더다. helper의 info/validate는 --app-root, 현재 디렉터리와 부모, references/runtime.json에 기록한 설치 당시 경로 순으로 찾는다. 모두 없으면 번들 스키마로 JSON을 검증할 수 있지만 앱 실행·렌더 확인은 하지 못했다고 구별한다. 프로젝트 위치가 실제로 필요할 때만 사용자에게 묻는다.

node "<스킬>/scripts/scene.mjs" info --app-root "<프로젝트>"
node "<스킬>/scripts/scene.mjs" validate "<장면.json>" --app-root "<프로젝트>"
node "<스킬>/scripts/scene.mjs" validate "<장면.json>" --out "<새 정규화 파일.json>"
node "<스킬>/scripts/scene.mjs" inspect "<프로젝트 또는 전달 묶음.json>"

장면 JSON은 왼쪽 ‘장면 JSON 열기’/붙여넣기로 가져온다. 정밀 프로젝트는 위쪽 Load로 연다. helper는 JSON 파일을 저장·검증·추출하며 실행 중인 브라우저에 자동 주입하지 않는다. 편집기 서버에는 장면 쓰기 API가 없다.

서버가 필요하면 프로젝트에서 node scripts/serve.mjs를 실행하고 로컬 주소를 연다. 기본은 http://127.0.0.1:3001 이며 실행 중인지 먼저 확인해 중복 실행하지 않는다. start.cmd도 같은 빌드를 연다. 앱·Node.js·빌드가 없으면 JSON 결과까지 제공하고 부족한 의존성을 알린다. 스킬 사용을 앱 재설치·코드 수정·외부 API 가입으로 확대하지 않는다.

## 실제 수정과 보존

사용자가 Save한 프로젝트가 정밀 상태의 원본이다. 이미지 생성용 전달 묶음은 컬러/깊이 PNG와 editorState·작화 지시를 포함한다. 카메라 컷 선택 후 ‘갱신’해야 현재 작업 카메라가 저장된 촬영 구도에 반영된다. 컷마다 다른 포즈를 저장하는 기능은 아직 없다.

앱 포맷을 읽지 않고 외부 엔진의 좌표·뼈 이름이나 카메라 focal length를 JSON에 추가하지 않는다. 앱이 바뀌면 실제 스키마를 우선하고 불일치가 있으면 그 필드만 조정한다.
