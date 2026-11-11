# 컷신 스킬 통합 결과

컷신·포즈 검색·포즈 융합·포즈 삽화의 네 진입점을 cutscene-studio 하나로 통합했습니다. 기본 경로는 소설에서 장면 JSON을 만들고 로컬 3D에서 수정한 뒤 캡처를 작화에 전달하는 흐름입니다. 포즈 검색과 이미지 융합은 명시적으로 요청했을 때만 수행합니다.

## 사용

$cutscene-studio 이 소설에서 필요한 컷을 골라 편집기용 장면 JSON을 만들어줘.

$cutscene-studio 이 수정 프로젝트와 캡처를 기준으로 최종 작화 지시를 만들어줘.

개인 설치 위치: `%USERPROFILE%\.codex\skills\cutscene-studio`. 이 저장소의 원본은 아래 경로이며 앱 실행에 스킬 설치가 필수는 아닙니다. 다른 폴더에서 도구를 실행할 때는 `--app-root D:\github\cutscene-studio`를 지정하세요.

프로젝트 보관본: [SKILL.md](../skills/cutscene-studio/SKILL.md)

## 정리한 기존 스킬

- comic-cutscene-director
- direct-illustration-poses
- fuse-pose-references
- create-pose-illustration

개발 당시 기존 폴더 전체를 스킬 검색 경로 밖의 개인 백업으로 이동하고 원본과 백업의 모든 파일 SHA-256을 대조했습니다. 개인 백업은 이 저장소에 포함되지 않으며 새 PC에서 실행할 때 필요하지 않습니다. cinematic-director와 short-drama-storyboard는 이번 정리 범위에 포함하지 않았습니다.

## 검증

공식 quick_validate.py가 통과했습니다. 실제 앱 포맷 검증, 잘못된 ID 거부, 출력 덮어쓰기 방지, 최초 제안보다 수정 상태 우선, 촬영 카메라와 작업 카메라 구분, PNG 바이트 보존 추출, 잘못된 이미지 거부, 번들 스키마 폴백, 오프라인 갤러리 메타데이터 검색 등 9개 동작 검사가 통과했습니다. 실제 최종 이미지 생성과 독립 LLM 전 과정을 실행한 검증은 아닙니다.

JSON 검증·수정본 검사·전달 묶음 추출 도구는 scripts/scene.mjs이며 웹 검색이나 이미지 생성을 자동으로 호출하지 않습니다. 캡처·정본 이미지는 실제로 열어 별도 확인해야 합니다. 이번 통합으로 앱의 컷별 포즈 공유 등 구현 한계를 바꾸지는 않았습니다.

검증 근거: validation/skill-integration-latest.json 및 validation/skill-installation.json.
