# 갤러리 비례 인체 실행 증거 — 2026-11-02

[사용·출처·한계](../../GALLERY_PROPORTIONS.md). 실제 Chrome에서 소스 3002와 빌드 3001을 실행했습니다.

- gallery-body.json: 비교 화면, 소스·배포본 PNG, 가슴 높이/간격/볼륨의 실제 메시·기준점 변화, 뼈 보존, 비교 화면 유휴 그리기 0.
- no-webgl-fallback.png: 빌드된 비교 화면에서 WebGL 생성이 불가능할 때 실제 정적 렌더와 비활성 조작을 표시함.
- comparison.png / comparison-ui.png / shipped-comparison.png: 동일 인물의 3면 실제 렌더와 UI, 빌드 앱의 실제 PNG.
- human-body.json: 표시 전환·키·등신·포즈 보존, 2 calls / 39,992 렌더 삼각형.
- pose-surface.json: 3체형·6자세, 변형 외곽·좌표·고정 리그·컬러/깊이 마스크와 조작점 표시.
- direct-editor.json / chest-reference.json: 직접 조작·포즈 라이브러리·가슴·저장/Load·UndoRedo·전달 묶음.
- converted-poses.json / pose-corrections.json: 기존 포즈 1,001개 검사와 1,398회 적용.
- scene-usability.json / solo-view.json: 설명·카메라·단독 편집과 전체 캡처.
- unit-tests.txt: 22/22. 현행 갤러리 메시 검사 3개는 단일 닫힌 연결 성분, 정점/가중치/가슴 변형, 고정 CC0 출처를 확인합니다.

PNG는 별도 CC0 모델을 가공한 앱의 렌더입니다. 갤러리 원본 이미지는 포함하지 않았습니다. 원본 그림과의 시각적 동일성이나 모든 자세의 해부학적 정확성을 판정한 결과는 아닙니다.
