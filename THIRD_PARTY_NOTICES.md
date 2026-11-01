# 재사용 코드와 출처

이 작업은 [fanverseio/pose-toolkit](https://github.com/fanverseio/pose-toolkit)의 커밋 `5ad2d16ae107c8e5ee3304fd30bbadb7ed213e33`을 `app`에 복제해 확장했습니다. 기반의 저작권 고지와 [GPL-3.0 라이선스](app/LICENSE)를 유지합니다. `app`의 새 장면 포맷·스튜디오 UI와 기존 코드 수정은 2026년 11월 1일 추가했으며 GPL-3.0으로 제공합니다. 소스 원본 이력은 `app/.git`에 남아 있습니다.

| 구성 | 출처 | 라이선스 | 사용 |
| --- | --- | --- | --- |
| pose-toolkit | https://github.com/fanverseio/pose-toolkit | GPL-3.0 | 기반 UI, 관절·IK, 모델 가져오기와 조작, 내보내기 |
| mannequin-js 5.2.3 | https://github.com/boytchev/mannequin.js | GPL-3.0 | 코드로 생성하는 마네킹과 자세 데이터 |
| Three.js | https://github.com/mrdoob/three.js | MIT | WebGL 렌더링, 카메라, 조작 컨트롤, 모델 로더 |
| Vite | https://github.com/vitejs/vite | MIT | 개발 서버와 빌드 |

정확한 설치 버전은 `app/package-lock.json`, 각 의존성의 고지는 설치된 패키지의 LICENSE 파일을 참조합니다. 배포용 빌드에는 [의존성 라이선스 모음](app/public/THIRD_PARTY_LICENSES.txt)을 함께 제공합니다.

A3D·Storyboarder·StoryBlender·CineVision·OpenPose Editor·Fullik·three-vrm은 조사와 설계 참고 대상입니다. 이들 프로젝트의 구현 코드를 이번 확장에 복사하지 않았습니다. README 스냅샷은 `research/upstream`에 출처 기록용으로 보관합니다. 외부 포즈 이미지나 캐릭터·가구 모델 라이브러리는 일괄 수집하거나 배포하지 않습니다.
