# 작화용 인체 검증 — 2026-11-02

[사용·구현·제한](../../ILLUSTRATION_BODY.md). Chrome에서 소스(3002)와 빌드 앱(3001)을 실제 실행했습니다.

- illustration-body.json: 여성형/기본형 프리셋, 키·등신·뼈 보존, 다른 인물 보존, Undo/Redo, 실제 렌더 2종.
- human-body.json: 표시 전환·포즈 보존, 표면 높이와 실제 draw call/삼각형.
- pose-surface.json: 3체형과 6자세, 변형 정점·뼈 보존, 전체 외곽과 실제 변형 정점의 일치(윤곽 캐시 포함), 컬러/깊이 마스크, 조작점 표시 조건.
- direct-editor.json: 인물·무릎·발목 조작과 포즈 라이브러리 회귀.
- chest-reference.json: 가슴 설정·저장/Load·전달 묶음.
- converted-poses.json, pose-corrections.json: 기존 포즈 1,001개 검사와 1,398회 체형별 적용.
- solo-view.json, scene-usability.json: 단독 편집·캡처·대상 설명·카메라.
- unit-tests.txt: 단위 19개. 연결성 테스트 대상은 손·발 출처인 기존 CC0 가공 자산이며, 현행 작화 인체 전체가 단일 연결 표면이라는 뜻은 아닙니다.

PNG는 앱의 실제 인체 렌더입니다. reference.png는 포즈 예시이며 사용자 첨부 포즈와 완전히 일치한다고 판정한 결과는 아닙니다. 첨부 원본과 Drive 이미지는 포함하지 않았습니다. 깊은 접힘의 부위 경계·자기 침투는 남을 수 있습니다.
