# 재사용 코드와 출처

이 작업은 [fanverseio/pose-toolkit](https://github.com/fanverseio/pose-toolkit)의 [기반 커밋 5ad2d16](https://github.com/fanverseio/pose-toolkit/commit/5ad2d16ae107c8e5ee3304fd30bbadb7ed213e33)을 `app`에 복제해 확장했습니다. 기반의 저작권 고지와 [GPL-3.0 라이선스](app/LICENSE)를 유지합니다. `app`의 새 장면 포맷·스튜디오 UI와 기존 코드 수정은 2026년 11월 1일 추가했으며 GPL-3.0으로 제공합니다. 기반 이력은 위 upstream 링크에서, 이후 확장·수정은 이 저장소의 Git 이력에서 확인할 수 있습니다. 배포 저장소에는 내부 `app/.git`을 포함하지 않습니다.

| 구성 | 출처 | 라이선스 | 사용 |
| --- | --- | --- | --- |
| pose-toolkit | https://github.com/fanverseio/pose-toolkit | GPL-3.0 | 기반 UI, 관절·IK, 모델 가져오기와 조작, 내보내기 |
| mannequin-js 5.2.3 | https://github.com/boytchev/mannequin.js | GPL-3.0 | 코드로 생성하는 마네킹과 자세 데이터 |
| Three.js | https://github.com/mrdoob/three.js | MIT | WebGL 렌더링, 카메라, 조작 컨트롤, 모델 로더 |
| Vite 8.3.5 | https://github.com/vitejs/vite | MIT | 개발 서버와 Rolldown 기반 빌드 |
| MakeHuman 인체 데이터 | https://github.com/makehumancommunity/makehuman | CC0-1.0 (assets) | 기본 인체 메시, 리그 가중치, 중립 가슴 형태의 가공 데이터 |

연속 인체 데이터는 MakeHuman 커밋 `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`에서 가져왔습니다. 프로그램 코드(AGPL)와 자산(CC0)은 [공식 LICENSE.md](https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/LICENSE.md)에서 구분합니다. 프로그램 코드를 복사하지 않았습니다. 원본 링크·SHA-256은 `app/src/assets/reference-human.source.json`, CC0 전문은 [MakeHuman-ASSETS-CC0.txt](app/public/licenses/MakeHuman-ASSETS-CC0.txt)에 보존합니다. [가공·검증·제한](docs/CONTINUOUS_HUMAN.md).

정확한 설치 버전은 `app/package-lock.json`, 각 의존성의 고지는 설치된 패키지의 LICENSE 파일을 참조합니다. 배포용 빌드에는 [의존성 라이선스 모음](app/public/THIRD_PARTY_LICENSES.txt)을 함께 제공합니다.

A3D·Storyboarder·StoryBlender·CineVision·OpenPose Editor·Fullik·three-vrm은 조사와 설계 참고 대상입니다. 이들 프로젝트의 구현 코드를 이번 확장에 복사하지 않았습니다. README 스냅샷은 `research/upstream`에 출처 기록용으로 보관합니다. 외부 포즈 이미지나 캐릭터·가구 모델 라이브러리는 일괄 수집하거나 배포하지 않습니다.

2026-11-02 선택적 오프라인 변환 도구: [rtmlib 0.0.16](https://github.com/Tau-J/rtmlib)(Apache-2.0)의 RTMPose3d API, [RTMW3D-X ONNX](https://huggingface.co/Soykaf/RTMW3D-x)(해당 모델 카드 Apache-2.0), ONNX Runtime(CPU), NumPy·OpenCV를 사용합니다. Python과 모델은 `.review-tools/`에 별도 설치하며 앱 JS 번들에 포함하지 않습니다. 모델 출처·SHA-256을 추정 및 변환 결과에 기록합니다. 사용자 제공 Drive 원본·원시 추론은 개인 로컬 폴더에서 Git 제외합니다. 2026-11-02 검토한 466개 파생 관절 JSON은 비공개 저장소 data/pose-corrections에 보관하며 공개 데이터셋으로 재배포하지 않습니다.

2026-11-02 선택적 2D 재추정: [rtmlib 공식 Body 구성](https://github.com/Tau-J/rtmlib/blob/main/rtmlib/tools/solution/body.py)의 RTMPose-X body7 모델과 [MMPose HumanArt 설정](https://github.com/open-mmlab/mmpose/blob/main/configs/body_2d_keypoint/rtmpose/humanart/rtmpose_humanart.yml)을 참조했습니다. 모델 SHA-256 `df0c0fa91e9870b1515dcaff741fd76cc753dcfb12786862f61b243bae81cd52`. Python/ONNX는 오프라인 준비 전용이며 앱 JS 번들에 포함하지 않습니다.

2026-11-02 작화용 인체: 기본 머리·몸통·팔다리는 저장소의 `illustration-body.js`에서 생성하며, 기존 CC0 가공 데이터에서는 손·발 표면을 사용합니다. [현행 모형·제한](docs/ILLUSTRATION_BODY.md). 사용자 첨부 레퍼런스 이미지는 배포 자료에 포함하지 않습니다.
