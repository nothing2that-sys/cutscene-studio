# 이미지 레퍼런스의 3D 포즈 변환

스킬 키워드는 기존 **`$cutscene-studio`**입니다. 앱의 **이미지 레퍼런스**에서 변환 카드를 선택하면 현재 선택 인물의 관절을 바꿉니다. 원본 이미지는 옆에 남고, 직접 보정한 자세를 원본 번호와 연결해 내 포즈에 저장할 수 있습니다.

## 구현과 제한

RTMW3D-X ONNX 모델을 CPU에서 사전 실행해 133개 점의 이미지 좌표·상대 깊이·모델 점수를 기록합니다. 각 PNG가 이미 한 사람씩 잘려 있으므로 이미지 전체를 인물 영역으로 사용합니다. 추정값을 앱의 뼈대에 맞추고 무릎·팔꿈치 힌지, 관절 범위, 뼈 길이 고정을 적용합니다. 팔다리 방향을 해석적으로 맞춘 후 범위 제한으로 생긴 오차를 국소 탐색으로 줄입니다.

카메라 내부 변수가 없어 XY와 깊이의 비율은 근사합니다. 시점의 yaw를 제거하며 인물 설정과 수평 위치를 복사하지 않습니다. 명확한 바로눕기·엎드리기·옆으로눕기 태그는 바닥 방향의 보조 가정으로 사용합니다. 접지가 켜진 변환 포즈는 몸 전체 최저점을 적용 전 발바닥 높이에 맞춥니다. 의자·손 접촉, 무게중심, 손가락과 시선은 자동으로 해결하지 않습니다.

원본·추정점·변환 JSON은 `app/public/local-pose-references/`에 보관하고 Git에서 제외합니다. 모델·Python 환경은 `.review-tools/`에 있고 일반 앱 실행에는 필요하지 않습니다. 앱은 완성된 JSON만 읽으며 외부 API나 GPU가 필요하지 않습니다. 이미지 업로드 없이 로컬에서 처리했습니다.

## 재현

Python 3.12에서 `python -m pip install -r scripts/pose-conversion-requirements.txt`를 실행합니다. [rtmlib 공식 3D 구현](https://github.com/Tau-J/rtmlib/blob/main/rtmlib/tools/solution/wholebody3d.py)이 사용하는 [RTMW3D-X ONNX](https://huggingface.co/Soykaf/RTMW3D-x)를 `.review-tools/pose-models/rtmw3d.onnx`에 둡니다. 모델의 SHA-256은 각 추정·변환 파일에 기록합니다.

1. `python scripts/infer-reference-landmarks.py --sample`: 분류별 대표 추정.
2. `python scripts/infer-reference-landmarks.py --threads 4`: 전체 추정. 기존 추정 JSON은 재사용하므로 중단 후 이어갈 수 있습니다.
3. 소스 서버 3002를 열고 `node scripts/convert-reference-poses.mjs`: 중립 인물에서 전체 변환·길이 고정 확인.
4. `node scripts/reference-conversion-preview.mjs`: 분류별 원본·3D 비교 시트 생성 및 시각 검수.
5. `npm --prefix app run build` 후 3001에서 `node scripts/converted-poses-check.mjs --all`.

`node scripts/search-reference-poses.mjs "의자에 앉아 고민"`은 상위 5건만 반환합니다. 변환 JSON은 `type: converted-pose` 안에 정규 `pose-reference`, 출처·품질 정보를 담으며 **포즈 JSON 불러오기**에서도 읽습니다. 장면 actors에 지원하지 않는 rotations 필드를 추가하지 않습니다.

## 품질 표시

전체가 자동 추정 초안입니다. `estimated`는 모델이 추정한 팔다리 방향에 맞췄다는 뜻이며 원본과 일치한 검수 완료 포즈가 아닙니다. `needs-correction`은 주요 관절의 약한 점수가 3개 이상이거나 방향 오차가 35도를 넘는 우선 보정 대상입니다. 점수는 확률이 아니며 방향 오차는 원본 이미지의 픽셀 오차가 아닙니다.

대표 예시에서 확인한 0301·0401·0451에는 개별 자세 보정을 추가했습니다. 이 경우 방향 오차는 보정 전 모델 적합 오차입니다. 전부 사람이 관절 하나씩 수정·검수했다는 뜻은 아닙니다. 보정 필요 항목은 앱에서 원본과 비교해 수정하고 내 포즈에 저장해 재사용하세요.
