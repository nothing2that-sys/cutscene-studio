# 관절별 인체 실행 증거 — 2026-11-03

[구현·사용·한계](../../SEGMENTED_BODY.md). Chrome 소스 3002와 배포 3001을 실제 실행했습니다.

- segmented-body.json: 16개 영역 중 두 손을 제외한 14개 강체 영역, 266개 거리 표본 × 6자세, 최대 치수 편차, 열린 경계 0, 실제 구조선 토글과 PNG.
- reference.png / reference-ui.png: 한 팔 머리 위·반대손 허리의 실제 3면 렌더와 UI. 원본 포즈의 완전 일치를 판정한 결과는 아닙니다.
- comparison.png / shipped-comparison.png: 기본 자세의 소스·배포 렌더.
- preview-and-chest.json: 체형·등신·가슴 기준점·구조·보기·PNG, WebGL 없는 비교 화면.
- human-body.json / pose-surface.json: 표시 전환·키·등신, 6자세의 리그·유한 정점·컬러/깊이 마스크.
- direct-editor.json / drawing-presets.json: 인물·무릎·발목 조작, 포즈 라이브러리, 여성형 프리셋과 Undo/Redo.
- chest-reference.json: 가슴 조절·재열기·From File·실제 전달 묶음.
- scene-usability.json / solo-view.json: 설명·카메라·단독 편집·전체 장면 캡처와 유휴 GPU 그리기 0.
- converted-poses.json / pose-corrections.json: 기존 1,001개 검사와 1,398회 적용.
- unit-tests.txt: 기존 형식·설명·CC0 자산 단위 22개. 기존 자산의 연결성 검사는 현행 모형 전체가 연결 피부라는 뜻은 아닙니다.

현재 모형은 분리 부위의 고정 볼륨 방식입니다. 각도에 따라 부위 경계·겹침이 보일 수 있습니다. 갤러리 원본이나 사용자 첨부 그림은 포함하지 않았으며 PNG는 실제 앱 렌더입니다.
