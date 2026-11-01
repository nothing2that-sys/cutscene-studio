# 편집기 장면 포맷

실제 앱의 app/src/scene-format.js를 우선한다. scripts/scene-format.mjs는 설치 당시의 오프라인 검증 사본이다. 검증 도구가 사용한 스키마 출처를 출력한다. 포맷을 확장하려고 앱 코드를 임의로 바꾸지 않는다.

## 좌표와 한계

- version=1, units="meters". 오른손 좌표계, Y가 위. 방 바닥 중심 [0,0,0], 방 크기 [너비,높이,깊이].
- 인물 position은 포즈 적용 후 인체 최저점의 기준 좌표. 서 있는 발은 Y=0. 소품 position은 밑면 중심. 탁자 높이가 0.75이면 위의 상자는 Y=0.75.
- yaw와 joints 속성은 도, camera.fov는 수직 화각. 정밀 프로젝트의 rotation은 라디안 Euler 배열이므로 서로 복사하지 않는다.
- 기본 벽은 X 음의 끝과 Z 음의 끝. 카메라를 벽 밖에 두면 인물이 가려질 수 있다. yaw 방향은 실제 예제 렌더로 대조한다.
- 기본 포즈 standing/sitting/pointing/reaching, 소품 box/table/chair/sphere. 눕기·무릎꿇기·의자 접촉 자동 해결은 없다. 지원하는 관절값으로 근사할 수 있는 부분과 사용자가 조정할 부분을 밝힌다.
- 최대 인물 12, 소품 80, 카메라 컷 24. 보통 필요한 1~3컷만 제안한다.
- 문·창 개구부, 여러 층은 자동 모델링하지 않는다. 중요하면 위치·높이·이동 관계를 assumptions와 대리 블록에 남긴다.

## 필드

필수값은 version/units/camera이고 장면 의미에 필요한 room/actors/props/lighting/shots도 명시한다. 생략값 기본 처리와 정확한 범위는 검증기를 따른다.

| 필드 | 내용 |
| --- | --- |
| title/sourceText/assumptions | 제목, 관련 원문, 원문과 구별한 연출상 가정 |
| room | size, color(#RRGGBB), walls(boolean) |
| actors[] | 고유 id, name, position, yaw, height, headUnits, pose, joints, intent |
| props[] | 인물과도 중복되지 않는 id, name, type, position, size, yaw, color |
| camera | position, target, fov(10~100). 위치와 목표점은 달라야 함 |
| lighting | position, target, color, intensity(0~10), ambient(0~3) |
| shots[] | 고유 id, name, purpose, camera. 같은 순간의 카메라 후보 |

관절은 l/r가 인물 기준 좌우다.

| 관절 | 속성 범위 |
| --- | --- |
| torso | bend -90~90, tilt -45~45, turn -90~90 |
| neck/head | nod -90~90, tilt -45~45, turn -90~90 |
| l_arm/r_arm | raise -180~180, straddle -180~180, turn -90~90 |
| l_elbow/r_elbow | bend 0~150 |
| l_wrist/r_wrist | bend -90~90, turn -90~90, straddle -45~45 |
| l_leg/r_leg | raise -90~135, straddle -90~90, turn -90~90 |
| l_knee/r_knee | bend 0~150 |
| l_ankle/r_ankle | bend -45~45, turn -45~45 |

완전한 입력 예제는 [example-scene.json](../assets/example-scene.json)에 있다. 수치는 장면 가정이며 다른 소설의 정본으로 쓰지 않는다. 시간·동작이 다른 삽화는 별도 장면 파일과 연속성 메모를 만든다.

## 수정 범위

장면 JSON을 고칠 때 요청되지 않은 ID·카메라·인물·소품·조명은 유지한다. 프로젝트나 전달 묶음이 있으면 최초 제안으로 다시 시작하지 않는다. 정밀 리그의 변경은 실제 편집 상태를 기준으로 하며, 불확실한 변환을 임의로 다시 계산하지 않는다. 현재 앱에는 자동 잠금·부분 패치 적용 기능이 없으므로 이를 수행했다고 보고하지 않는다.

## 오류와 경고

앱은 문법·지원 필드·자료형·수치·중복 ID 오류를 모아 보여주고 오류가 있으면 적용하지 않는다. 지원하지 않는 추가 필드는 조용히 버리지 않고 오류로 보고한다. 방 밖 배치 등 일부 공간 조건과 기본 방/조명 사용은 경고로 표시하며 적용은 허용한다. 앱의 검사만 버튼은 장면을 바꾸지 않는다. 보고서의 originalJSON을 오류 수정의 원본으로 삼는다.

## 인물의 키와 등신 비율

actors[].height는 미터 단위의 기립 키(0.5~3), headUnits는 전체 키/머리 높이 비율(3~12, 생략 시 8)이다. 5·8·9.5 등 소수 등신을 지원한다. 원문·정본에 체형 설정이 있으면 이를 따르고 없으면 선택을 연출상 가정으로 기록한다. 예: height=1.8, headUnits=8은 기립 키 180cm, 머리 높이 22.5cm다. 숙이거나 앉아서 현재 화면 높이가 줄어도 설정 키를 다시 줄이지 않는다.

인물 체형 설정에서만 키·등신을 바꾼다. 포즈는 관절 회전 또는 끝점 IK로 바꾸며 뼈의 로컬 위치·스케일과 인체 전체 스케일을 변경하지 않는다. 팔꿈치·무릎은 0~150도 힌지이며 옆 꺾임은 막는다. 다른 주요 관절도 앱의 각도 제한을 따른다. 손발 목표점이 닿지 않으면 뼈를 늘리지 않고 도달 가능한 지점에서 멈춘다. 관절끼리의 충돌과 정확한 손 접촉까지 자동 해결하는 것은 아니다.

정밀 프로젝트는 bodyProfile과 boneLayout을 보존한다. boneLayout은 포즈 편집 중 고정할 길이·크기의 기준이다. BONE_LENGTH_LOCKED/BODY_SCALE_LOCKED 오류를 고치려고 고정값도 함께 바꾸지 않는다. 회전으로 고치거나 명시적으로 요청한 체형 변경을 편집기 체형 설정/초기 장면 JSON에서 수행한다. 구형 프로젝트에 체형 메타데이터가 없으면 기존 형태를 유지하며 설정 적용 전에는 8등신이었다고 단정하지 않는다.
