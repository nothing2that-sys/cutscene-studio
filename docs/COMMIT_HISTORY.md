# 실제 개발 커밋 이력

2026-11-11에 기존 개발 저장소의 실제 커밋 61개를 개인정보 정리 후 가져왔습니다. 원래 변경 내용과 커밋 메시지·작성일·커밋일을 유지했습니다. 작성자 연락처 대신 공개 계정 `nothing2that-sys`와 GitHub noreply 주소를 사용합니다.

공개 허용한 파일 경로만 각 시점에서 복원했으며, 개인 작업 프로젝트·첨부·재배포 제외 포즈 데이터는 과거 버전에서도 제외했습니다. 텍스트에 포함된 개인 로컬 경로·연락처·내부 주소·개인 Drive 링크를 치환했습니다. 이 때문에 원본과 공개 커밋의 해시는 다릅니다. 각 커밋 메시지의 `Original-Commit`에 대응 원본 해시를 기록했습니다.

처음 공개한 커밋과 기능 영상 업데이트 커밋은 그대로 보존했습니다. 정리한 개발 이력을 별도 계보로 가져온 뒤 현재 공개 버전의 파일을 유지하는 병합으로 연결했습니다. 아래 과거 커밋은 당시 개발 상태이므로 현재의 완성 버전과 구분합니다.

이력 전체 검사: 병합 시점의 커밋 64개와 텍스트 blob 875개를 검사했고, 제외 대상 파일 경로·개인 식별 문자열·일반 자격 증명 패턴이 검출되지 않았습니다. 이 검사는 모든 종류의 민감 정보 검출을 보장하지 않습니다.

| 날짜 | 공개 커밋 | 실제 변경 내용 | 원본 대응 |
| --- | --- | --- | --- |
| 2026-11-02 | [9f4c5e1](https://github.com/nothing2that-sys/cutscene-studio/commit/9f4c5e129cc569bedd093708dd89540bb130ccb9) | Initial local cutscene studio with validation and integrated skill | `b639095` |
| 2026-11-02 | [987b37f](https://github.com/nothing2that-sys/cutscene-studio/commit/987b37f24d82330ee3e817826722c485cd3c185b) | Document private repository setup and dependency audit findings | `bfd4f38` |
| 2026-11-02 | [4dfe6a1](https://github.com/nothing2that-sys/cutscene-studio/commit/4dfe6a1dfa4b73a3612290793ba87d757fdb1035) | Include native project fixture so tests run on a fresh clone | `be8f9ce` |
| 2026-11-02 | [3d9e576](https://github.com/nothing2that-sys/cutscene-studio/commit/3d9e576a762c6157d18ead85875a9cda2d1b8e8b) | Fix From File validation, stale pose panel and shot deletion | `ca222a1` |
| 2026-11-02 | [10b6ce8](https://github.com/nothing2that-sys/cutscene-studio/commit/10b6ce8d7f5e4a3a27fb603fdd67c4ab10b18fcc) | Stabilize IK dragging and resolve remaining review findings | `fb34e79` |
| 2026-11-02 | [f7afcd8](https://github.com/nothing2that-sys/cutscene-studio/commit/f7afcd88612962f1931c7c5ae06583d52e60af68) | Upgrade Vite to 8.3.5 and clear dependency vulnerabilities | `caa2a5c` |
| 2026-11-02 | [c7c36e6](https://github.com/nothing2that-sys/cutscene-studio/commit/c7c36e6e8a352d63ac34ecffbf2ff226e0fc8b21) | Add torso-attached chest reference shapes and capture landmarks | `3eee221` |
| 2026-11-02 | [98d3499](https://github.com/nothing2that-sys/cutscene-studio/commit/98d3499f4f66dfb311beee16e10eca88fe56a3f9) | Add direct actor and joint dragging with reusable pose library | `2f2e3bf` |
| 2026-11-02 | [64257ec](https://github.com/nothing2that-sys/cutscene-studio/commit/64257ec48af02d3887ad6e6d7156cd0a10b559d8) | Improve pose editing performance and register local image references | `30893fb` |
| 2026-11-02 | [229891d](https://github.com/nothing2that-sys/cutscene-studio/commit/229891d354f07feb502e666673edfa6490f21f79) | Convert reference images to reusable estimated 3D poses | `e73b100` |
| 2026-11-02 | [c70731c](https://github.com/nothing2that-sys/cutscene-studio/commit/c70731c5ff2f0bbc6133d249cf4df89c2e9392b6) | Refine and review 466 image pose drafts; separate unresolved references | `3902a2c` |
| 2026-11-02 | [3bdc404](https://github.com/nothing2that-sys/cutscene-studio/commit/3bdc4040361f92a45e4dc934580280962917544f) | Add human proxy display, editable scene notes and camera pan controls | `27690b2` |
| 2026-11-02 | [0544ee7](https://github.com/nothing2that-sys/cutscene-studio/commit/0544ee7ff02d8c1572be7814471733519938ffd6) | Replace segmented mannequin display with continuous skinned human | `56a5e38` |
| 2026-11-02 | [3252e65](https://github.com/nothing2that-sys/cutscene-studio/commit/3252e65185798cb2dffee68cce7a6d770056eed5) | Shape drawing mannequin from illustrated body reference | `35c1de0` |
| 2026-11-02 | [e731de7](https://github.com/nothing2that-sys/cutscene-studio/commit/e731de7f98219a3e64f4ef0bcf46163ac1b56df0) | Use connected gallery-proportion human model and add three-view preview | `bdf3a5f` |
| 2026-11-03 | [a64ad12](https://github.com/nothing2that-sys/cutscene-studio/commit/a64ad127254e9edddc8b288d3ebcd6ad46496b3f) | Build rigid anatomical body sections with pose-stable volumes | `a9be299` |
| 2026-11-03 | [32274b5](https://github.com/nothing2that-sys/cutscene-studio/commit/32274b5d693bca8bc961411c48f7045c3553e462) | docs: approve articulated body v1 implementation plan | `fed299c` |
| 2026-11-03 | [25a86c8](https://github.com/nothing2that-sys/cutscene-studio/commit/25a86c8356a1d433ef7573acffe46b063919e48b) | docs: pin approved body plan revision | `bb9c08a` |
| 2026-11-04 | [f69512d](https://github.com/nothing2that-sys/cutscene-studio/commit/f69512d02843cafcf2bb7032cfa7a41b20000007) | feat: integrate articulated body and fixed-angle line view (WIP) | `9788a56` |
| 2026-11-04 | [a1b60d1](https://github.com/nothing2that-sys/cutscene-studio/commit/a1b60d1cd6ebcb38ee5f803b6e8c3d2068285c0b) | docs: hand off articulated body v1 implementation checkpoint | `0da0afb` |
| 2026-11-04 | [15244ae](https://github.com/nothing2that-sys/cutscene-studio/commit/15244aee6d86dd67366a198172e4b09c243cac7c) | fix: close articulated body v1 handoff items 1-6 in the main editor | `431f7f2` |
| 2026-11-04 | [021a541](https://github.com/nothing2that-sys/cutscene-studio/commit/021a541e0387b2edac1b523db71c0269a0756faf) | feat: add camera-relative shot description to the handoff | `4d53754` |
| 2026-11-04 | [6ee578d](https://github.com/nothing2that-sys/cutscene-studio/commit/6ee578dbb09461104e2121c946959fe47403b3d7) | fix: drive the figure's own left/right from l_/r_ joints | `c7b522f` |
| 2026-11-04 | [fa62993](https://github.com/nothing2that-sys/cutscene-studio/commit/fa629931f254b0b153b944735b8872819ea57df3) | fix: apply legacy rotation poses to the v1 body by limb direction | `8470b72` |
| 2026-11-04 | [0a3b4ac](https://github.com/nothing2that-sys/cutscene-studio/commit/0a3b4acc70a9eec4840688e7ba3b3059dfe4d5f7) | feat: dock editor panels, add figure rotation, keep facing on pose apply | `939c8cb` |
| 2026-11-06 | [a0b0895](https://github.com/nothing2that-sys/cutscene-studio/commit/a0b0895200bb35de55bc4811094ff1558b01cd66) | feat: export LLM shot package with label, depth, light and pose passes | `cf30f6b` |
| 2026-11-06 | [bcdc5b0](https://github.com/nothing2that-sys/cutscene-studio/commit/bcdc5b04f09576fa55bd9c8158e5cdbed6bd53df) | feat: add lamp and spot lighting with distance falloff | `6d133bb` |
| 2026-11-06 | [6d3438c](https://github.com/nothing2that-sys/cutscene-studio/commit/6d3438cf34cf467669d0b13a5ab4c914f54bb178) | fix: kneeling facing, pose name tags and preview cost; add LLM package verification | `2cd6429` |
| 2026-11-06 | [29f2ca7](https://github.com/nothing2that-sys/cutscene-studio/commit/29f2ca7da5765f176ad7771c4e6e5a33fe2e1018) | feat: fix art style first and state where the light is in the LLM package | `60a6a1d` |
| 2026-11-06 | [efbc439](https://github.com/nothing2that-sys/cutscene-studio/commit/efbc43906c68de19859c287181c1e594a2c5a0f5) | fix: credit nested raycast hits to their owner; add one-variable LLM ablation set | `eaefad9` |
| 2026-11-06 | [6d3a1ad](https://github.com/nothing2that-sys/cutscene-studio/commit/6d3a1ad6ec16b9328b8d6746271298c9be95c14f) | feat: reshape the LLM package prompt from the ablation results | `8d36c6f` |
| 2026-11-10 | [db846ea](https://github.com/nothing2that-sys/cutscene-studio/commit/db846ea6e76260bfd7e489c042e19e1cad70b776) | docs(skill): JSON-to-handoff flow, art style, lamp/spot lighting and the LLM package | `579284a` |
| 2026-11-10 | [971dd4f](https://github.com/nothing2that-sys/cutscene-studio/commit/971dd4f2d3f28b3f31165928c6929377b899a549) | feat: LiDAR-style depth views in the LLM package | `55e96b3` |
| 2026-11-10 | [c4636a6](https://github.com/nothing2that-sys/cutscene-studio/commit/c4636a68a887ff97b0dc86798fc4a447e0027ee7) | fix: leave the top-down plan out of the LLM package | `788ed03` |
| 2026-11-10 | [8f8f83c](https://github.com/nothing2that-sys/cutscene-studio/commit/8f8f83c9e7e3af4861200bfd1faf41bdad0a2713) | fix: keep fixed-view pan in place when the cut aspect differs from the window | `b2cb3e8` |
| 2026-11-10 | [46fd3e2](https://github.com/nothing2that-sys/cutscene-studio/commit/46fd3e21205bcfcac4a4e6a24922de3e43e059dd) | feat: body types for the common body (male, neutral, child, heavy male) | `c1a25f1` |
| 2026-11-10 | [7e1d846](https://github.com/nothing2that-sys/cutscene-studio/commit/7e1d846f2dae0c146fc0666dce3d0a780244d70d) | feat: low pose presets (kneeling, half-kneeling, squatting, crouching, lying) | `b32dcaa` |
| 2026-11-10 | [70da438](https://github.com/nothing2that-sys/cutscene-studio/commit/70da4381a6d48bc0e7ea3b5c6fbc0d06ce9a461a) | perf: prebuilt torso meshes for the body types | `6dc67b3` |
| 2026-11-10 | [c35caac](https://github.com/nothing2that-sys/cutscene-studio/commit/c35caac8211efb47614ad702b6c75b54258be5a1) | fix: heavy male waist band, knee gap and arm overlap | `83b3604` |
| 2026-11-10 | [1a0c1f6](https://github.com/nothing2that-sys/cutscene-studio/commit/1a0c1f660600694dfc6a2eb5fa4c017b591f8d7c) | docs: record the user's pass on the body types | `34dafe9` |
| 2026-11-10 | [cccebc2](https://github.com/nothing2that-sys/cutscene-studio/commit/cccebc2f8471b37191a2d0fc8ab4a4bf06b856c4) | feat: body-type ablation set and a faces line in the package prompt | `8d62238` |
| 2026-11-11 | [2f0903c](https://github.com/nothing2that-sys/cutscene-studio/commit/2f0903c1319100db4c25d7319067d5ba9781e605) | feat: body type in the package, crouch wording, floor-pose library cards | `8a3ffe9` |
| 2026-11-11 | [e8a29e7](https://github.com/nothing2that-sys/cutscene-studio/commit/e8a29e767ff2c298b04b1390e7cac534e68f25a5) | fix: clear stale character sheets; autosave with restore and close guard | `5a792f1` |
| 2026-11-11 | [6b90cfa](https://github.com/nothing2that-sys/cutscene-studio/commit/6b90cfa4cb264b73e8445d7fd850de967b9786ef) | feat: gaze and expression per person; role and intent in the prompt | `d99098e` |
| 2026-11-11 | [282a810](https://github.com/nothing2that-sys/cutscene-studio/commit/282a81040997f069984136aa14fa257fd3643093) | feat: package every shot in one zip; label colours only for visible objects | `d53d099` |
| 2026-11-11 | [5df59a4](https://github.com/nothing2that-sys/cutscene-studio/commit/5df59a4faa0acbf36ae2c79cdc18abfd8aa881fe) | fix: GLB data out of undo history, stable GLB ids, child default height, validator copy test | `b642a13` |
| 2026-11-11 | [602a4b6](https://github.com/nothing2that-sys/cutscene-studio/commit/602a4b682698ddf46917f1b5a3780a32c005f617) | feat: six new prop shapes and size editing in the properties panel | `cc37648` |
| 2026-11-11 | [7fc6a34](https://github.com/nothing2that-sys/cutscene-studio/commit/7fc6a345be7ab44aa3198477c82fcd91f7371762) | feat: hand-held props follow the holder's hand | `87a3dae` |
| 2026-11-11 | [0269f5f](https://github.com/nothing2that-sys/cutscene-studio/commit/0269f5f3f559a1d9572ac8319f8be6f1bb03a5d4) | feat: up to two extra lights (fill / practical) besides the key light | `0bfba3e` |
| 2026-11-11 | [551cb36](https://github.com/nothing2that-sys/cutscene-studio/commit/551cb361eea1716e837363a38d49c3e994eddcb8) | test: gaze ablation set; review status for the finished plan | `ab52534` |
| 2026-11-11 | [5cab0ae](https://github.com/nothing2that-sys/cutscene-studio/commit/5cab0ae3a8c4f601deb8f008d6b68199c3469f85) | fix: light colour in words, spot-field warning, one pre-capture per package | `2c5ffc6` |
| 2026-11-11 | [847471d](https://github.com/nothing2that-sys/cutscene-studio/commit/847471d0167efd584ba82b13072089687df91919) | fix: waiting for a body-type mesh is a guarded, superseded restore (S1) | `714027a` |
| 2026-11-11 | [c1d55b7](https://github.com/nothing2that-sys/cutscene-studio/commit/c1d55b7384469625597fcb1137a764ca4110ec49) | feat: prone and side-lying pose presets | `b238834` |
| 2026-11-11 | [24b76a3](https://github.com/nothing2that-sys/cutscene-studio/commit/24b76a3a8e4dc933b4437f9546748e909a155f9c) | feat: camera roll (dutch angle) and lens in mm | `e38df18` |
| 2026-11-11 | [7596e03](https://github.com/nothing2that-sys/cutscene-studio/commit/7596e03fe5a6470f7cecbc4e644c5bae6f2c4d1a) | feat: overlap warnings on scene import and in the package (feature 10) | `4512cfa` |
| 2026-11-11 | [13b34b7](https://github.com/nothing2that-sys/cutscene-studio/commit/13b34b7fe992268e12d98018833172131d74af1d) | feat: per-shot hidden objects and lighting (feature 9) | `9aa19ff` |
| 2026-11-11 | [2b0c0c1](https://github.com/nothing2that-sys/cutscene-studio/commit/2b0c0c1262d96f3b92aeeeb5076a9598459ac9c5) | feat: optional wall shadows (room.wallShadows) - S2 | `b7e1173` |
| 2026-11-11 | [fa003aa](https://github.com/nothing2that-sys/cutscene-studio/commit/fa003aadfd1889000ec63e9aaa593b4b4df029f4) | chore: one runner for all checks; review items all done | `f7397c5` |
| 2026-11-11 | [1fa78d8](https://github.com/nothing2that-sys/cutscene-studio/commit/1fa78d8c46df468e1cd1b76828c639c04be21393) | test: Gemini ablation set for the new features (held props, extra light, wall shadows, dutch/lying) | `5f12235` |
| 2026-11-11 | [3b792a1](https://github.com/nothing2that-sys/cutscene-studio/commit/3b792a101fdc10056305e3864ff5af8f647a8922) | fix: held props hang from the hand by default (attachTo.grip) | `1adfab6` |
| 2026-11-11 | [f2943b6](https://github.com/nothing2that-sys/cutscene-studio/commit/f2943b679bc3eb495b5dca949868fe526e3dc09f) | docs: light-marker leak checked on Gemini; glow is not from the marker | `f33d2ea` |
