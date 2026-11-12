# 소설에서 장면 구성과 이미지 생성까지

왼쪽 **소설 → 장면 → 이미지**에서 원문과 인물·연출 설정을 입력합니다.

- **한 번에 이미지까지**: 원문 → 모델의 장면 JSON → 검사 → 3D 장면 적용 → 첫 추천 컷 촬영 → 이미지 생성 → 결과 표시·저장.
- **장면만 구성**: 장면을 적용한 뒤 멈춥니다. 인물·소품·포즈·조명·카메라를 수정하고, 설정화를 연결한 뒤 **현재 구도로 이미지 생성**을 누릅니다.
- **수정한 현재 작업 시점으로 촬영**: 체크하면 현재 작업 카메라를 선택한 컷에 저장하고 촬영합니다. 체크를 끄면 선택한 컷의 저장된 카메라를 사용합니다. 한 번에 생성은 이 옵션과 관계없이 첫 추천 컷을 사용합니다.

생성 당시의 컬러·라벨·깊이·직사광·포즈 PNG, 설정화, 작화 지시문과 shot.json을 앱이 직접 전달합니다. ZIP을 다운로드해 다시 첨부할 필요가 없습니다. 설정화는 합계 15장까지 전달할 수 있습니다. API 키·CLI 설정에 들어 있는 인증 정보는 브라우저로 보내지 않습니다.

## 연결 방식 선택

**모델 연결 설정**에서 장면 구성과 이미지 생성의 연결을 각각 선택합니다. 예를 들어 장면은 Codex CLI, 이미지는 Gemini API를 사용할 수도 있습니다. 다른 연결로 자동 전환하거나 실패한 요청을 자동 재시도하지 않습니다.

### 로그인된 Codex CLI (기본)

Codex CLI의 기존 로그인을 사용합니다. 새 API 키를 만들지 않습니다. CLI는 PATH 또는 Windows Codex 앱의 설치 경로에서 찾습니다. npm 설치의 고정 JS 진입점도 지원합니다. `codex login status`로 로그인 여부를 확인할 수 있습니다.

2026-11-12 이 PC의 **codex-cli 0.166.0 / ChatGPT 로그인**에서 실제 확인했습니다.

1. 단독 헤드리스 호출로 파란 찻잔 PNG 생성.
2. 앱에서 소설 입력 → CLI 장면 구성 → JSON 검사·3D 적용.
3. 편집한 화풍과 현재 장면의 5개 참조 이미지 전달 → CLI 내장 image_gen → 실제 PNG 회수 → 앱 표시·다운로드.

CLI의 `image_generation` 기능이 꺼져 있으면 이미지 연결을 사용할 수 없다고 표시합니다. 기능이 켜져 있어도 계정·모델·사용량에 따라 도구가 제공되지 않을 수 있으며, 실제 이미지가 반환되어야 성공으로 기록합니다. 성공한 CLI 버전은 연결 상태에서 확인할 수 있습니다. 로그인 여부·버전·기능 확인은 모델을 호출하지 않습니다.

CLI 작업은 저장소 소스 대신 독립된 작업 폴더에서 실행합니다. 프롬프트는 stdin으로, 참조 이미지는 `-i`로 전달합니다. 셸·브라우저·컴퓨터 조작·다중 에이전트·앱 도구는 끄고 읽기 전용 샌드박스를 사용합니다. 이미지 생성은 CLI 내장 image_gen을 사용하며 별도 API 스크립트나 브라우저 자동화를 사용하지 않습니다. 로그인 계정의 사용량 한도는 적용됩니다.

현재 검증된 헤드리스 제공자는 Codex CLI입니다. Gemini/Claude/Antigravity CLI는 이미지 생성·파일 반환 지원을 확인하지 않아 선택 항목에 넣지 않았습니다. **Gemini API는 별도 연결로 지원합니다.**

### OpenAI / Gemini API (선택)

API를 고르면 서버에 설정된 기존 키를 사용합니다. 키가 없으면 설정 필요 상태를 보여주고 실행을 막습니다. 이 구현 작업에서는 새 키를 만들거나 API로 실제 유료 생성을 호출하지 않았습니다.

저장소 루트의 Git 제외 파일 `.env.local`, 또는 실행 프로세스의 환경 변수를 사용합니다.

| 연결 | 환경 변수 | 장면 구성 기본 모델 | 이미지 요청 기본 모델 |
| --- | --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` | `gpt-6-astra` | `gpt-6-astra` + `gpt-image-2.5-sunburst` 이미지 도구 |
| Gemini | `GEMINI_API_KEY` 또는 `GOOGLE_API_KEY` | `gemini-3.8-flash` | `gemini-nano-banana-2.1` |

설정한 뒤 로컬 서버를 재시작합니다. 모델 입력란에서 요청 모델을 바꿀 수 있으며, CLI 모델 입력란을 비우면 CLI의 기본 모델을 사용합니다. API는 별도 요금·접근 권한·제공자별 이미지 입력 한도가 적용됩니다. 계정에서 사용 가능한 모델을 선택하세요. 브라우저에 키를 입력하거나 로그인 토큰을 API 키로 변환하지 않습니다.

OpenAI Responses와 Gemini Interactions를 직접 호출하며, 요청/응답 어댑터는 외부 호출 없이 계약 테스트로 검사했습니다. 실제 API 계정의 이미지 품질·권한·청구 동작은 검증하지 않았습니다.

공식 자료: [Codex CLI](https://learn.chatgpt.com/docs/codex/cli), [OpenAI 이미지 도구](https://developers.openai.com/api/docs/guides/tools-image-generation), [Gemini 이미지 생성](https://aistudio.google.com/docs/image-generation).

## 실행·저장·실패 처리

`start.cmd` 또는 `app`에서 `npm run dev`를 사용합니다. 양쪽 모두 `/api/ai/` 로컬 생성 서버를 제공합니다. 일반 정적 파일 서버나 `vite preview`만으로는 생성 기능을 사용할 수 없습니다. 편집·기존 내보내기 기능은 그대로 사용할 수 있습니다.

- 동시에 하나의 모델 작업을 실행하며 최대 10분을 기다립니다. **취소**는 진행 중인 CLI 프로세스 트리 또는 API 요청을 중단합니다. 이미 처리된 모델 사용량은 남을 수 있습니다.
- 모델의 장면 JSON은 기존 검사기로 검사하고, 실패하면 편집 장면을 교체하지 않습니다. 작화 실패 후에도 이미 구성한 장면에서 수정·재생성을 할 수 있습니다.
- `.cutscene-ai/<작업 ID>/`에 작업 결과·상태·참조 입력·최종 이미지를 로컬 저장합니다. 이 폴더는 Git에서 제외합니다. 장면 결과와 지시문에 원문 일부가 포함될 수 있습니다.
- 새로고침하면 마지막 작업 상태와 완성 이미지를 다시 표시합니다. 이전 장면 결과는 **완료된 장면 불러오기**로 명시적으로 적용합니다. 편집한 3D 프로젝트 자체는 기존 **Save/Load**를 사용합니다.
- 서버가 재시작되어 중단된 작업은 실패 상태로 표시합니다. 자동으로 다시 실행하지 않습니다.
- 서버는 루프백에 바인딩하며 다른 Host·Origin·사이트 요청을 거부합니다. 생성 이미지의 경로·형식·용량·생성 시각을 확인하고 지정된 로컬 결과만 제공합니다.

## ReviewGate에서 가져온 부분

C# 데스크톱 앱 전체를 의존성으로 추가하지 않고, 다음 실행 구조를 JavaScript로 옮겨 컷신의 작업 계약에 맞게 수정했습니다.

- `CliTransport.RunJobAsync`: 독립 작업 폴더, 셸을 거치지 않는 인자 배열, stdin 프롬프트, JSONL 이벤트와 최종 응답 파일, 출력 상한, timeout·취소와 프로세스 트리 종료.
- `FromCodex`: 최종 agent_message 이벤트와 `-o` 응답 파일에서 결과 수집.
- `WireAdapters.BuildJob`, `HttpTransport`: 제공자 요청 변환과 전송 분리, 고정 endpoint·redirect 거부·응답 상한·불확실한 요청의 자동 재시도 방지.

읽은 소스: [CliTransport.cs](https://github.com/nothing2that-sys/reviewgate/blob/main/src/ReviewGate.Transport.Cli/CliTransport.cs) (blob SHA `a7bf0d1eb72790ebd5f56af3667a700891454098`), [WireAdapters.cs](https://github.com/nothing2that-sys/reviewgate/blob/main/src/ReviewGate.Providers/WireAdapters.cs), [HttpTransport.cs](https://github.com/nothing2that-sys/reviewgate/blob/main/src/ReviewGate.Transport.Http/HttpTransport.cs). 2026-11-12 조회. 검수 루브릭·구현 워커·정책 발급 UI는 가져오지 않았습니다.

## 검증

```powershell
node --test scripts/ai-workflow.test.mjs scripts/scene-format.test.mjs scripts/scene-feedback.test.mjs
node scripts/ai-workflow-check.mjs http://127.0.0.1:3001
```

기본 브라우저 검사는 모델 호출을 모의하고 실제 장면 적용·렌더·참조 생성·자동/수동 흐름·이미지 표시·새로고침 복구·설정 누락 처리를 검사합니다. 실제 로그인 계정으로 검사하려면 명시적으로 `--live`를 추가합니다. Chrome 대신 Edge를 쓰려면 `CUTSCENE_BROWSER_CHANNEL=msedge`를 설정합니다. 증거는 Git 제외 경로 `.review-tools/ai-workflow/`에 저장합니다.

2026-11-12 검증 결과: 연결/전송·장면 포맷·촬영 패키지 테스트 **36개 통과**, Edge 헤드리스 브라우저에서 **자동 생성·중간 편집·수정 카메라 반영·새로고침 복구·API 설정 누락 처리 통과**. 실제 Codex CLI로 생성한 장면 제목은 `오후 햇살 아래 파란 찻잔`이며, 최종 PNG가 서버를 거쳐 브라우저에 표시된 것을 확인했습니다. API 모델의 실제 호출은 하지 않았습니다.

구도·포즈·정본 보존은 생성 모델의 특성에 따라 달라집니다. 자동 연결의 성공이 작화 품질이나 원문 충실도를 보장하지 않으므로 최종 이미지는 확인하세요.
