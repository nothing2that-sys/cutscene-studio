# 중심 부품 시제품 03 — 조형 보완과 경량화

후속 보기 기능: [3D 편집과 2.5D 고정 앵글 보기](FIXED_ANGLE_VIEW.md).

2026-11-03. 실행: http://127.0.0.1:3001/doll-core.html

중심 부품의 조형 원본과 표시 메시를 분리했다. 기본 조립체는 이전 **46,708면에서 11,600면으로 약 75.2% 감소**했다. 실제 렌더에서 가슴의 상부 부착부/아랫면, 쇄골, 소켓 경계를 다시 확인했다. 기존 전신 모델이나 리그의 기본 외형은 변경하지 않았다.

## 조형 변경

가슴의 단일 종형 돌출식에 의존하던 부분을 상부의 넓은 뿌리 → 전면 볼륨 → 둥글게 돌아가는 아랫면을 각각 가진 제어 곡선으로 바꿨다. 좌우 쇄골은 중앙에서 옆으로 이어지는 두 곡선으로 나누고 중앙 목 밑의 약한 오목함을 추가했다. 조형 원본의 추출 해상도를 64³에서 80³으로 올리고 소켓/허리 입구 표면을 정리했다.

그 원본을 그대로 전부 그리지 않는다. 면의 거리 오차와 법선 변화를 고려하는 quadric edge collapse로 표시 메시를 만든다. 연결부가 닫혀 있는지, 면의 방향이 뒤집히지 않는지 검사하면서 줄인다. 완만한 면은 크게 나누고, 소켓 입구와 곡률이 바뀌는 부분에 정점을 더 남긴다. 가슴·소켓은 계속 실제 입체 표면이며 이미지 텍스처로 대체하지 않았다.

| 표시 품질 | 삼각형 합계 | 정점 합계 | 위치·법선·인덱스 배열 용량 |
|---|---:|---:|---:|
| 이전 시제품 | 46,708 | 23,360 | 840,888 bytes |
| 가볍게 | 6,200 | 3,106 | 111,744 bytes |
| **균형 — 기본** | **11,600** | **5,806** | **208,944 bytes** |
| 새 조형 원본 확인 | 73,408 | 36,710 | 1,321,488 bytes |

원본 확인 모드는 조형 점검용이다. 기본 표시와 같은 새 형상을 더 촘촘한 메시로 확인한다. 이 표의 용량은 메시 배열만의 값이며 앱 전체 RAM/VRAM 사용량이 아니다. 조립체 외피 draw call은 전후 모두 3회다. 시험 구관절을 켜면 그 부품의 호출이 별도로 추가된다.

## 실제 렌더 비교

- [전후 사선](review-evidence/2026-11-03-doll-core-refinement/before-after-oblique.png), [전후 정면](review-evidence/2026-11-03-doll-core-refinement/before-after-front.png)
- [개선판 정면·측면·후면·사선](review-evidence/2026-11-03-doll-core-refinement/improved-four-views.png)
- [세 표시 품질 비교](review-evidence/2026-11-03-doll-core-refinement/quality-modes.png)
- [원본 그림 / 새 조형 / 겹침](review-evidence/2026-11-03-doll-core-refinement/reference-review.png)

모든 모델 이미지는 실제 Chrome/WebGL 렌더다. 전후 비교는 이전 메시의 정점·법선·인덱스를 보존한 후 **최종 렌더러의 같은 카메라·조명·해상도**에서 다시 그린 자료다. 원본 그림과의 닮음은 사용자의 외형 검토 대상이며 자동 수치로 합격을 선언하지 않는다.

## 렌더 부하와 실행 응답

최종 검증 화면은 547×729 px다. 이전/개선 메시를 번갈아 그려 같은 브라우저와 재료에서 측정했다. 각 순서에 20회 워밍업과 배치 반복을 수행하고, 지원되는 `EXT_disjoint_timer_query_webgl2`로 40회 렌더의 평균 GPU 시간을 별도로 얻었다.

| 측정 | 이전 메시 | 기본 균형 메시 |
|---|---:|---:|
| GPU 평균, 첫 교차 순서 | 0.3246 ms | 0.2125 ms |
| GPU 평균, 두 번째 교차 순서 | 0.3243 ms | 0.2115 ms |

이번 검증 환경에서는 GPU 시간이 약 **35% 감소**했다. 이것은 해당 브라우저의 배치 GPU 측정이며 저사양 PC의 FPS나 모든 장면에서의 개선율 보장이 아니다. 원시 값과 측정 조건은 [performance.json](review-evidence/2026-11-03-doll-core-refinement/performance.json)에 있다. CPU 호출 시간은 매우 짧아 타이머 분해능과 실행 순서 영향을 받으므로 FPS 향상으로 환산하지 않았다.

초기 메시 최적화 계산은 기존보다 비싸졌다. 이를 화면 조작에 전가하지 않도록 다음을 적용했다.

- 기본 균형 메시를 208,944-byte 로컬 바이너리로 미리 계산해 즉시 읽는다. 기본 조형/해상도/표시 품질 키가 일치할 때만 사용한다.
- 수정 계산과 원본/경량 메시 생성은 지연 생성되는 모듈 Worker에서 한다. 이전 메시를 보여 주며 회전과 자세 조작은 계속할 수 있다.
- 여러 부품을 연속 수정해도 마지막 설계에 해당하는 결과만 함께 반영한다. 계산 중 OBJ 내보내기는 비활성화한다.
- 최근 결과와 조형 원본은 개수 제한을 둔 캐시에 보관한다. 초기화·되돌아온 품질은 가능한 경우 다시 계산하지 않는다.
- 캔버스는 화면 표시 크기에 맞추고 최대 너비 600px로 제한한다. 불필요한 drawing-buffer 보존을 끄고, 같은 프레임의 회전 입력을 모아 그린다. 유휴 상태에서 계속 그리지는 않는다.

초기 화면 확인은 이번 실행에서 약 388ms, 그중 기본 메시 준비 표시는 약 23ms였다. 당시 재조형 중에도 62회 화면 프레임과 즉시 카메라 전환을 확인했다. 이 값은 로컬 검증 환경의 관찰이며 [interaction-checks.json](review-evidence/2026-11-03-doll-core-refinement/interaction-checks.json)에 남겼다.

## 검증 범위

[mesh-audit.json](review-evidence/2026-11-03-doll-core-refinement/mesh-audit.json)에서 세 품질의 모든 부품에 대해 열린 경계 0, 비다양체 모서리 0, 일관되지 않은 면 방향 0과 양의 부피를 확인했다. 새 조형 원본 대비 부품별 부피 변화는 균형 모드 최대 약 0.09%, 경량 모드 최대 약 0.23%다. 이는 **메시 축소가 새 조형을 보존하는지** 확인하는 자료이며 원본 선화와의 유사성 점수가 아니다.

[편집/소켓/회전 확인](review-evidence/2026-11-03-doll-core-refinement/validation/checks.json)에서는 실제 소켓 차감, 강체 회전 때 정점 유지, 조형 변경, JSON 저장·재열기·초기화를 확인했다. 백그라운드 계산 중 연속 편집 결과의 일관성, 계산 중 화면 회전, 시제품 02의 조형 JSON 값 유지도 확인했다. 기존 앱 포즈 JSON 형식은 건드리지 않았다.

원본과의 가슴 외곽·골반 자세 차이는 남는다. 허리 접속부 간섭, 팔·다리 외피, 후면의 설계 가정 역시 아직 해결된 것으로 취급하지 않는다. 특히 가장 가벼운 모드에서는 작은 쇄골/배꼽/경계의 음영이 단순해질 수 있다. 세 표시 품질을 오가며 직접 검토할 수 있게 했다. 부하 개선을 외형 완성 판정에 쓰지 않는다.

## 파일과 재현

- [개선 조형 JSON](review-evidence/2026-11-03-doll-core-refinement/design.json), [기본 표시 메시 OBJ](review-evidence/2026-11-03-doll-core-refinement/core-neutral.obj)
- 형상: `app/src/doll-core-geometry.js`
- 메시 축소: `app/src/doll-mesh-reduction.js`
- 미리 계산 메시/Worker 로딩: `app/src/doll-core-mesh-loader.js`, `app/src/doll-core-worker.js`
- 기본 바이너리: `app/public/doll-core/preview.json`, `preview.bin`

```powershell
./.review-tools/node/node.exe ./.review-tools/node/node_modules/npm/bin/npm-cli.js --prefix app run build
# 3001번 서버가 없을 때만 scripts/serve.mjs 실행
./.review-tools/node/node.exe scripts/doll-core-refinement-review.mjs
./.review-tools/node/node.exe scripts/doll-core-mesh-audit.mjs
./.review-tools/node/node.exe scripts/doll-core-async-check.mjs
./.review-tools/node/node.exe scripts/doll-core-review.mjs docs/review-evidence/2026-11-03-doll-core-refinement/validation
./scripts/doll-core-refinement-sheets.ps1
```

`--baseline`은 수정 전 메시를 보존하는 옵션이다. 이미 보존한 이전 기준 파일을 무심코 덮어쓰지 않는다. 형상 수식 또는 축소 알고리즘/예산을 바꾸면 `CORE_SURFACE_REVISION`도 올린다. 기본 미리 계산 메시를 갱신할 때는 먼저 새 기본 형상을 브라우저에서 확인·내보낸 다음 `scripts/build-doll-core-preview.mjs`를 실행하고 다시 빌드한다. 설계 키가 안 맞으면 미리 계산 파일 대신 Worker에서 생성한다. 이전 조형 JSON의 선택 필드가 없어도 불러올 수 있다.
