# 연속 인체 검증 증거 — 2026-11-02

[검증 범위와 제한](../../CONTINUOUS_HUMAN.md). 실제 Chrome, 3001 배포본·3002 소스 서버에서 실행했습니다.

- `human-body.json`: 외형 전환 보존, 인물 1명 draw call/삼각형, UI 설정 유지.
- `continuous-skin.json`: 3체형 표면 키, 가슴/체형 재바인딩, 6자세 컬러·깊이 마스크 일치, 기본 조작점 숨김.
- `direct-editor.json`: 실제 인물·무릎·발목 드래그와 포즈 저장/적용.
- `converted-poses.json`: 1,001개 변환 포즈 형식·출처, 선택 인물/접지/UndoRedo.
- `pose-corrections.json`: 466개 × 3체형, 1,398회 적용과 길이 보존.
- `chest-reference.json`: 가슴 설정·저장/Load·전달 묶음.
- `scene-usability.json`: 설명·카메라·실제 전달 묶음.
- `solo-view.json`: 단독 편집의 유휴 그리기 0과 전체 장면 캡처.
- `unit-tests.txt`: 단위 19/19.

PNG는 앱의 CC0 가공 인체 렌더입니다. 외부 Drive 원본 이미지는 포함하지 않습니다. 자동 검사·화면 검토는 모든 자세의 해부학적 정확성이나 원본 사진과의 완전 일치를 판정하지 않습니다.
