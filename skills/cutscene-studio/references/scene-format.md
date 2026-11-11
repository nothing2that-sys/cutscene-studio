# 편집기 장면 포맷

실제 앱의 app/src/scene-format.js를 우선한다. scripts/scene-format.mjs는 설치 당시의 오프라인 검증 사본이다. 검증 도구가 사용한 스키마 출처를 출력한다. 포맷을 확장하려고 앱 코드를 임의로 바꾸지 않는다.

## 좌표와 한계

- version=1, units="meters". 오른손 좌표계, Y가 위. 방 바닥 중심 [0,0,0], 방 크기 [너비,높이,깊이].
- 인물 position은 포즈 적용 후 인체 최저점의 기준 좌표. 서 있는 발은 Y=0. 소품 position은 밑면 중심. 탁자 높이가 0.75이면 위의 상자는 Y=0.75.
- yaw와 joints 속성은 도, camera.fov는 수직 화각. 정밀 프로젝트의 rotation은 라디안 Euler 배열이므로 서로 복사하지 않는다.
- 기본 벽은 X 음의 끝과 Z 음의 끝. 카메라를 벽 밖에 두면 인물이 가려질 수 있다. yaw 방향은 실제 예제 렌더로 대조한다.
- 기본 포즈 standing/sitting/pointing/reaching과 바닥 자세 kneeling(두 무릎)/half-kneeling(오른쪽 무릎을 꿇고 왼발을 앞에 세움)/squatting(쪼그려 앉기)/crouching(상체를 숙여 웅크림)/lying(바닥에 등을 대고 누움)/lying-prone(엎드림)/lying-side(옆으로 누움). 소품 box/table/chair/sphere/cylinder(원기둥)/door(문)/window(창문)/bed(침대)/sofa(소파)/stairs(계단). size는 [가로, 높이, 깊이] m이고, door·window는 벽 앞에 세우는 판, stairs는 -z 쪽으로 올라간다(yaw로 돌린다).
  - 바닥 자세는 모든 체형 종류에서 몸의 가장 낮은 점이 position[1] 높이에 닿게 놓인다. 무릎이나 등이 바닥에 닿는다.
  - lying은 등을 대고, lying-prone은 엎드려(얼굴은 옆으로), lying-side는 아래쪽 팔을 깔고 옆으로 눕는다. 의자 접촉 자동 해결은 없다.
  - 그 밖의 자세는 joints로 근사하고, 근사한 부분과 사용자가 조정할 부분을 밝힌다.
- 최대 인물 12, 소품 80, 카메라 컷 24. 보통 필요한 1~3컷만 제안한다.
- 문·창 개구부, 여러 층은 자동 모델링하지 않는다. 중요하면 위치·높이·이동 관계를 assumptions와 대리 블록에 남긴다.

## 필드

필수값은 version/units/camera이고 장면 의미에 필요한 room/actors/props/lighting/shots도 명시한다. 생략값 기본 처리와 정확한 범위는 검증기를 따른다.

| 필드 | 내용 |
| --- | --- |
| title/sourceText/assumptions | 제목, 관련 원문, 원문과 구별한 연출상 가정 |
| style | 최종 작화 화풍(문자열, 최대 2000자). 생략하면 2D 웹툰 일러스트 기본값 |
| room | size, color(#RRGGBB), walls(boolean) |
| actors[] | 고유 id, name, position, yaw, height, headUnits, bodyType, chest, pose, joints, role, intent, description, lookAt, expression |
| props[] | 인물과도 중복되지 않는 id, name, type, position, size, yaw, color, role, intent, description, attachTo |
| camera | position, target, fov(10~100) 또는 focalMm(12~300, 35mm 풀프레임 세로 24mm 기준 렌즈; 둘 다 쓰면 focalMm), roll(-45~45°, +면 화면이 시계 방향으로 기울어지는 더치 앵글). 위치와 목표점은 달라야 함. zoom·view는 편집기가 쓰는 값이므로 새 장면에는 넣지 않음 |
| lighting | type(sun·lamp·spot, 생략 시 sun), position, target, color, intensity(0~10), ambient(0~3), spot일 때 coneDeg(5~170, 기본 50)·softness(0~1, 기본 0.3). extras: 보조광 최대 2개(각각 type·position·target·color·intensity, spot이면 coneDeg·softness; 그림자 없음, light.png에 안 나옴, 지시문에 글로 들어감) |
| shots[] | 고유 id, name, purpose, camera. 같은 순간의 카메라 후보 |

관절은 l/r가 인물 기준 좌우다.

개수 한계:
- 장면 JSON은 인물 12명·소품 80개까지 받는다.
- 편집기가 저장한 프로젝트 파일은 인물 100·소품 400까지 열린다.
- LLM 패키지의 라벨 색은 한 컷에 보이는 인물·소품 18개까지만 서로 다르다. 넘으면 경고(LABEL_COLORS_REPEAT)가 나오니 작은 소품을 숨기거나 컷을 나눈다.

role·description은 최종 작화에 쓰이는 외형·역할 설명이다. 인물이면 옷·머리·나이대처럼 그림에 필요한 것만 쓰고, 소품이면 재질·색·디자인을 쓴다. intent는 왜 그 자리·자세에 두었는지다. 이 문장들은 LLM 패키지의 인물 목록에 라벨 색과 짝지어 그대로 들어간다(인물은 설명·역할·의도, 소품은 설명·역할).

## 손에 든 소품 (props[].attachTo)

`attachTo: {"actor": "인물 id", "hand": "right" | "left"}`를 쓰면 소품이 그 손을 따라간다.
- 손목보다 조금 앞(손바닥 쪽)에 소품의 아래쪽을 놓는다. 컵은 손에 쥐어지고, 우산·지팡이는 손에서 위로 뻗는다.
- 위치(position)는 무시되고, 방향(yaw)은 소품 자체 값을 쓴다.
- 지시문에 「○○이(가) 오른손에 들고 있음」과 인물 쪽 「손에 든 것: …」이 들어간다.
- 없는 인물 id는 오류다(UNKNOWN_HOLDER).

## 시선과 표정 (lookAt, expression)

마네킹에는 얼굴이 없어서 누가 누구를 보는지와 표정이 그림에 드러나지 않는다. 원문에 시선이나 표정이 있으면 적는다.

| 필드 | 값 | 동작 |
| --- | --- | --- |
| lookAt | 다른 인물·소품의 id, 또는 지점 [x, y, z] (m) | 장면을 불러올 때 목과 머리를 그쪽으로 돌린다. 지시문에 「시선: ○○을(를) 봄」으로 들어간다 |
| expression | 200자 이하 문장 (예: "놀라 굳은 얼굴") | 지시문에 「표정: …」으로 들어간다 |

- 목과 머리는 합쳐서 좌우 80°, 위아래 45°까지만 돈다.
  - 대상이 그보다 옆이나 뒤에 있으면 한계까지만 돌리고 경고(LOOK_AT_LIMIT)를 낸다.
  - 이때는 yaw로 몸도 대상 쪽으로 돌린다.
- lookAt을 쓰면 joints의 head·neck turn/nod는 덮어쓴다. tilt는 그대로 둔다.
- 자기 자신이나 장면에 없는 id는 오류다(SELF_LOOK_TARGET, UNKNOWN_LOOK_TARGET).
- lying 자세에서는 자동으로 돌리지 않는다(경고 LOOK_AT_LYING).

## 체형 종류 (bodyType)

공통 인체의 체형을 고른다.

| bodyType | 체형 |
| --- | --- |
| female (생략과 같음) | 성인 여성 8등신 |
| male | 성인 남성 8등신 |
| neutral | 중성 8등신(성별 단서를 줄임) |
| child | 아이(약 5.4등신, 비례 내장) |
| male-heavy | 성인 남성 큰 체격 |

- bodyType을 쓰면 headUnits와 chest는 넣지 않는다. 아이의 머리 비율은 체형에 들어 있다. 키는 height로 정한다(예: 아이 1.1~1.3m).
- 인물 설명(description)과 체형이 어긋나지 않게 한다. 예: 남성 인물이면 male 또는 male-heavy, 성별이 정해지지 않았으면 neutral.
- headUnits를 8이 아닌 값으로 지정하고 bodyType이 없으면 예전 인체로 만들어진다. 새 장면에서는 bodyType을 쓴다.

- 키를 생략하면 아이(child)는 1.2m, 그 밖에는 1.75m로 놓는다. 아이 체형에 1.6m보다 큰 키를 적으면 경고(BODY_TYPE_HEIGHT)를 낸다.

## 화풍 (style)

LLM 패키지 지시문의 맨 앞에 들어가는 최종 그림체다. 이미지 생성 모델은 회색 3D 렌더·뎁스·라벨 이미지를 여러 장 받으면 실사·3D로 그리는 경향이 있다. 그래서 원하는 화풍을 구체적으로 적는다(예: `"2D 웹툰 일러스트: 깨끗한 검은 선화와 셀 채색. 사진·실사·3D 질감 금지"`, `"흑백 펜화 만화, 굵은 먹선과 스크린톤"`). 작품 지침에 화풍이 없으면 생략해 기본값을 쓰고, 추정한 화풍은 assumptions에 남긴다.

## 조명 종류

| type | 뜻 | 쓰는 경우 |
| --- | --- | --- |
| sun | 평행광. position→target 방향으로 장면 전체에 같은 세기, 그림자가 평행 | 해·달·흐린 하늘·큰 창 |
| lamp | 점광원. position에서 사방으로 퍼지고 거리 제곱으로 어두워짐, 그림자가 방사형으로 퍼짐 | 가로등·랜턴·촛불·스탠드 |
| spot | 원뿔 조명. position에서 target 쪽 coneDeg 안만 밝음 | 펜던트 조명·무대 조명·손전등 |

- intensity는 **target 지점에 도달하는 밝기**다. 종류를 바꿔도 target 주변 밝기가 비슷하다. lamp·spot의 target은 가장 밝게 보여야 할 인물이나 탁자 같은 지점으로 둔다.
- lamp·spot은 position과 target이 같으면 오류다.
- 광원 위치는 실제 공간 좌표로 둔다. 원문에서 "골목 끝 가로등"처럼 앞뒤 관계가 중요하면 카메라·인물과의 거리 관계가 맞는지 확인한다. 패키지는 광원이 인물들보다 앞인지 뒤인지 자동으로 적는다.
- 광원은 하나뿐이다(+ambient). 여러 광원은 가장 중요한 하나로 정하고 나머지는 assumptions에 남긴다.

예: `"lighting":{"type":"lamp","position":[0.6,1.7,3],"target":[0,1.3,1.5],"color":"#ffd9a0","intensity":2.4,"ambient":0.25}`

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

가슴 형태 참조는 `actors[].chest`로 선택합니다. 생략하면 표시하지 않고 `{}`이면 기본값을 사용합니다. `height`(흉곽 로컬 높이 비율) 0.55~0.78, `spacing`(흉곽 너비 대비 체적 중심 간격) 0.3~0.6, `projection`(돌출 배율) 0.4~1.6이며 기본값은 각각 0.65·0.46·1입니다. 정본·사용자 설정을 우선합니다. 이름만으로 성별을 추정하지 않으며 여성 체형으로 명시되고 위치 참조가 필요하면 기본값을 초기 제안으로 쓸 수 있습니다. 예: `"chest":{"height":0.65,"spacing":0.46,"projection":1}`. 포즈에서 흉곽을 따라 움직이는 형태이며 별도 뼈나 정확한 신체 측정값이 아닙니다.

actors[].height는 미터 단위의 기립 키(0.5~3), headUnits는 전체 키/머리 높이 비율(3~12, 생략 시 8)이다. 5·8·9.5 등 소수 등신을 지원한다. 원문·정본에 체형 설정이 있으면 이를 따르고 없으면 선택을 연출상 가정으로 기록한다. 예: height=1.8, headUnits=8은 기립 키 180cm, 머리 높이 22.5cm다. 숙이거나 앉아서 현재 화면 높이가 줄어도 설정 키를 다시 줄이지 않는다.

인물 체형 설정에서만 키·등신을 바꾼다. 포즈는 관절 회전 또는 끝점 IK로 바꾸며 뼈의 로컬 위치·스케일과 인체 전체 스케일을 변경하지 않는다. 팔꿈치·무릎은 0~150도 힌지이며 옆 꺾임은 막는다. 다른 주요 관절도 앱의 각도 제한을 따른다. 손발 목표점이 닿지 않으면 뼈를 늘리지 않고 도달 가능한 지점에서 멈춘다. 관절끼리의 충돌과 정확한 손 접촉까지 자동 해결하는 것은 아니다.

정밀 프로젝트는 bodyProfile과 boneLayout을 보존한다. boneLayout은 포즈 편집 중 고정할 길이·크기의 기준이다. BONE_LENGTH_LOCKED/BODY_SCALE_LOCKED 오류를 고치려고 고정값도 함께 바꾸지 않는다. 회전으로 고치거나 명시적으로 요청한 체형 변경을 편집기 체형 설정/초기 장면 JSON에서 수행한다. 구형 프로젝트에 체형 메타데이터가 없으면 기존 형태를 유지하며 설정 적용 전에는 8등신이었다고 단정하지 않는다.
