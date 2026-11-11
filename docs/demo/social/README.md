# X용 기능 소개 영상

[MP4 다운로드](cutscene-studio-x.mp4) · [시나리오](../../DEMO_SCENARIO_SOCIAL.md)

약 42초, 1920×1080, 30fps, H.264 High / yuv420p, AAC 무음 트랙, 한국어 화면 자막. 결과 화면으로 시작해 실제 조작을 짧게 연결한다. 최종 작화는 기존 외부 이미지 생성 예제이며 촬영 중 AI를 호출하지 않는다.

- 기본 포즈 변경, 포즈 JSON 저장, 기본 자세로 복귀, 저장한 자세 재적용
- 내 포즈 라이브러리에 이름을 붙여 저장하고 카드로 적용
- 카메라 회전과 촬영 구도 저장
- 깊이·거리 색·링, 광원·그림자 미리보기 출력 확대
- LLM 패키지 ZIP 다운로드
- 기존 거리·조명 생성 비교와 최종 작화 예제

거리 비교는 동일 실험의 컬러 조건 `02_01_01.png`와 깊이 조건 `02_03_01.png`다. 화면 키 비율 오차 0.18 → 0.03은 조건별 3회 평균으로, 화면에 선택한 개별 그림의 측정치가 아니다. [전체 평가](../../review-evidence/2026-11-06-llm-ablation/E2-depth-heights/results/scores.md).

조명 비교는 컬러 조건 `01_01.png`와 조명 조건 `03_02.png`다. 일부 성공 사례이며 전체 실험의 판정은 불확실하다. [전체 평가](../../review-evidence/2026-11-06-llm-ablation/E1-under-light/results/scores.md).

재현: 로컬 서버를 실행한 뒤 `node scripts/record-demo-social.mjs`, `node scripts/edit-demo-social.mjs`. Playwright·Chrome·녹화용 FFmpeg가 필요하며, 편집용 FFmpeg 경로는 `FFMPEG_PATH`로 지정할 수 있다. 녹화 원본과 중간 컷은 `.review-tools/social-recording/`에만 저장한다.

[촬영 타임라인](timeline.json) · [편집·검증 보고서](edit-report.json)
