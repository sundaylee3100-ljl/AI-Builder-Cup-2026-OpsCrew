# OpsCrew 真实云端演示视频（带语音解说）操作说明与交接全案
# OpsCrew Cloud Live Demo with Spoken Narration — Operational Walkthrough

> **适用赛事**：AI Builder Cup 2026 (Google AI Studio Track)  
> **视频实测时长**：**154.05 秒**（严格小于赛事规定上限 180.00 秒 / 3分钟，预留近 26 秒充足安全余量）  
> **生产运行环境**：Google Cloud Run (`https://opscrew-883881551915.us-central1.run.app`)  
> **音频标准**：48 kHz / 16-bit 立体声 AAC，EBU R128 广播级响度标准化（-16 LUFS，TP: -1.5 dBFS）  
> **配套物料**：画面内嵌动态半透明安全区字幕条 + 外挂同轨 `OpsCrew_Combined_Official_Demo_165s.srt` / `.vtt` 字幕 + 原始高保真素材留档

---

## 一、 录制核心原则与合规边界 (Core Principles & Guardrails)

1. **真实云端端到端运行（Zero Mock / Zero Splice）**：
   - 绝不使用本地 Fake 数据或拼接不同运行回合的片段。
   - 所有推理均由部署在 Cloud Run 上的真实 Gemini 模型链完成（Gemini 2.5 Flash / Gemini 3.1 Flash-Lite 双模自适应架构）。
   - 数据持久化通过 Cloud Run 与 Google Firestore Native 实时原子事务写入。

2. **严格遵守大赛功能真实性边界（No Exaggerated Claims）**：
   - **准确归属**：项目在 Google AI Studio Build 中从零创建；Gemini 驱动事实提取、规划与复核；团队成员使用 Google Antigravity 辅助云端部署。
   - **诚实边界**：明确说明当前系统接受文本与结构化合成报销输入；绝不虚夸未交付的端到端 OCR、自动打款、自动发信或 SLA 保证。
   - **权限闭环**：AI 各阶段仅生成建议，绝无权限直接创建工单、审批或付款；人类操作员未显式授权前，复选框初始保持**未勾选（Unchecked）**。
   - **独立回读机制**：工单持久化成功只有在经过独立的 GET 接口回读校验后才标记为成功，并能在访客历史中重新打开验证。

---

## 二、 三大部分、10 大分段逐秒对照表 (Complete 3-Part Storyboard & Narration)

视频采用“**交付物与架构极速导入（20秒） + 真实云端在线交互全流程（122秒） + 专业致谢与公测邀请片尾（12秒）**”的三段式完整结构，既快速建立技术背景，又将最充分的时间留给核心实机操作与合规审查，并以高规格片尾从容致谢。

| 时间段 (Time) | 阶段划分与画面动作 (Stage & Action) | 英文原声解说词 (Spoken Narration - Verbatim) | 中文说明与评委审查要点 (Judge Review Points) |
| :--- | :--- | :--- | :--- |
| **00:00 – 00:09.5**<br>(Part 1 幻灯片 1) | **项目愿景与赛事归属**<br>• 呈现 OpsCrew 封面幻灯片（团队标识与副标题）。<br>• 底部安全字幕带显示英文介绍。 | *“Welcome to OpsCrew, an autonomous multi-agent copilot built in Google AI Studio Build for the AI Builder Cup 2026.”* | **团队与工具归属声明**：<br>向评委清晰交代项目在 AI Studio Build 中从零孵化，参加 AI Builder Cup 2026。 |
| **00:09.5 – 00:20.0**<br>(Part 1 幻灯片 2) | **云端多智能体架构与安全信任边界**<br>• 呈现 Cloud Run 三智能体协作与安全信任边界架构图（彻底消除线条交叉，标注双模自适应链路）。<br>• 明确标注 Vertex AI & Gemini API 双模链路、Firestore Native 与 Secret Manager。 | *“Deployed on Google Cloud Run with dual-mode Vertex AI & Gemini API, Firestore, and Secret Manager. Now, let us examine OpsCrew operating live in production.”* | **架构与生产环境交代**：<br>说明系统基于 Google Cloud Run 部署，并直观呈现清晰无遮挡的信任边界与双模自适应能力。 |
| **00:20.0 – 00:38.0**<br>(Part 2 片段 1) | **切入真实 Cloud Run 网页与录入测试用例**<br>• 画面无缝平滑切入真实 Cloud Run 生产页面。<br>• 启动 Firebase 访客会话。<br>• 清空表单并录入合规测试集 DEV-04（$38 停车费，缺失发票，SYNTH-EMP-100）。 | *“I explicitly start a Firebase visitor session. Synthetic example DEV-04 is a $38 parking expense for employee SYNTH-EMP-100, with a missing receipt.”* | **真实访客隔离与标准用例**：<br>展示 Cloud Run 真实域名与独立访客会话，演示真实报销异常场景的录入。 |
| **00:38.0 – 00:58.0**<br>(Part 2 片段 2) | **触发三阶段协同推理与遥测耗时走字**<br>• 点击 `Analyze, plan & review` 触发推理。<br>• 计时器真实走字（~10秒），展示后台 Facts、Planner、Reviewer 协同作业。<br>• 结果生成后展开遥测折叠面板巡览。 | *“Gemini extracts facts, then a separately prompted Planner proposes handling steps. A Reviewer checks the proposal. This timer measures elapsed time.”* | **真实大模型推理与透明耗时**：<br>展示真实多智能体协同推理，拒绝虚假前端假动画。 |
| **00:58.0 – 01:10.0**<br>(Part 2 片段 3) | **透明遥测与非轮询真实说明**<br>• 鼠标悬停巡览各角色完成状态与耗时。<br>• 明确交代遥测数据在响应返回后展示。 | *“Completed role attempts appear after the response; it is not live progress inside each stage.”* | **工程诚信与透明度**：<br>向评委诚实说明当前界面计时器测量总耗时，尝试记录在响应返回后一次性呈现。 |
| **01:10.0 – 01:29.0**<br>(Part 2 片段 4) | **合规条款 SYN-004 匹配与零越权安全**<br>• 鼠标指示方案判定结果：`EVIDENCE_REQUEST`。<br>• 高亮引用条款 **`SYN-004`**（发票缺失补件说明）。<br>• 指示独立 Reviewer 的 **`PASS`** 审核结论。<br>• 巡览自动生成的员工通知草稿（Notice Draft）。 | *“The result requests receipt evidence. Clause SYN-004 asks for an itemized receipt or explanation. The passing plan and review grant no permission to create a case, reimburse or pay.”* | **确定性策略与零越权安全**：<br>证明系统严格依照规则引擎匹配 SYN-004，强调 AI 此时仅有建议权，绝无打款或结案权力。 |
| **01:29.0 – 01:52.0**<br>(Part 2 片段 5) | **人类审查员授权（关键防作弊合规审查）**<br>• 点击 `Prepare human confirmation` 展开最终授权卡片。<br>• 鼠标移动至复选框处**刻意停顿 4.5 秒，清晰展示复选框初始为未勾选（Unchecked）**。<br>• 鼠标手动点击复选框完成授权，触发打勾动效。<br>• 点击 `Confirm & create synthetic case` 提交原子工单创建请求。 | *“I prepare human confirmation, inspect this specific plan, and explicitly authorize the record. The checkbox starts unchecked. I now submit that authorization.”* | **关键防作弊合规审查点**：<br>彻底响应裁判要求，清晰捕捉到复选框从未勾选到操作员人工勾选的全过程，体现严格的人在回路。 |
| **01:52.0 – 02:04.0**<br>(Part 2 片段 6) | **独立读回验证与 Firestore 原子持久化**<br>• 屏幕平滑滚动至 `scrollY = 950`，将确认结果与历史列表完美居中在屏幕中上方。<br>• 弹出 `Saved case verified by independent readback` 绿色标识。<br>• 鼠标巡览生成的唯一 Case ID 与工单状态。 | *“Success appears only after a separate read of the saved record from Firestore. The case record is atomic and policy-verified.”* | **独立读回验证与完美居中**：<br>证明不是前端假提示，而是通过独立 GET 请求回读 Firestore，且布局居中彻底避开字幕遮挡。 |
| **02:04.0 – 02:22.0**<br>(Part 2 片段 7) | **访客历史重开一致性验证与平稳收尾**<br>• 点击 `Refresh history` 刷新访客历史记录。<br>• 在历史列表中点击 `Open & verify case` 重新调取工单，证明数据一致性。<br>• 视频平稳静止保持 8 秒，画面完整留存，平滑过渡至片尾。 | *“I refresh visitor history and reopen the same case to verify state parity. OpsCrew requires human authorization and never issues payment automatically.”* | **状态回读验证与安全收尾**：<br>在历史记录中重新加载同一工单，验证字段对齐；重申“绝不自动付款”安全底线；留足 8 秒稳定帧。 |
| **02:22.0 – 02:34.0**<br>(Part 3 片尾致谢) | **专业致谢与生产环境公测邀请 (Thank You & Live Deployment)**<br>• 画面切换至深色暗夜微光片尾卡片（1080p 矢量渲染）。<br>• 大号标题呈现 “Thank You for Watching!”。<br>• 三大特性卡呈现：<br>  1. 真实云端生产环境 (`opscrew-883881551915.us-central1.run.app`)。<br>  2. 双模式 AI 架构（Vertex AI Agent Platform + Gemini API）。<br>  3. 零信任企业安全防护（SYN-001 ~ SYN-008 规则库、Fail-Closed 保底、三角色审查）。<br>• 底部安全区内嵌致谢与公测邀请字幕条。 | *“Thank you for watching! OpsCrew unites autonomous Gemini multi-agent reasoning with deterministic enterprise safety. We invite you to test our live deployment on Google Cloud Run. Thank you!”* | **专业片尾致谢与体验邀请**：<br>彻底解决“视频缺少结尾”问题；提供赛事官方规范的专属致谢与开源仓库信息；诚挚邀请评委直接访问 Google Cloud Run 在线环境测试真实交互。 |

---

## 三、 交付产物与技术指标 (Deliverable Artifacts & Specs)

全套交付视频均已生成并完成音画、字幕及播放器遮挡校验：

| 文件名称 | 文件路径 | 技术规格 / 校验 | 用途说明 |
| :--- | :--- | :--- | :--- |
| **【官方主推】结合版解说演示视频**<br>`OpsCrew_Combined_Official_Demo_165s.mp4` | `submission/video_output/OpsCrew_Combined_Official_Demo_165s.mp4` | • 容器: MP4 (H.264 High Profile)<br>• 分辨率: 1920x1080 (Full HD)<br>• 帧率: 25.00 fps<br>• 音频: AAC 48kHz 立体声 (192 kbps)<br>• 时长: **154.05 秒 (< 180s 严格达标，预留近 26 秒安全余量)**<br>• 文件大小: **16.07 MB (16,065,114 字节)**<br>• SHA256: `8a8a3c5cd29a5ee1a8818d66c8ee33d9f4b9f2c033d43f59eac5099ece3370be`<br>• 字幕位置: **距底边 60~75px Title-Safe 悬浮胶囊区（彻底避开播放器控制栏与进度条遮挡）** | **最终官方主提交视频**。<br>• **Part 1 (0:00–0:20.02)**: 2 张核心架构与交付物介绍幻灯片（彻底修复信任边界架构图线条交叉与遮挡，体现双模自适应 Vertex AI / Gemini API 架构）。<br>• **Part 2 (0:20.02–2:22.04)**: 真实云端在线交互全流程（真实多模型推理、未勾选复选框停顿授权、Firestore原子持久化、独立回读与重开验证、8秒平稳收尾）。<br>• **Part 3 (2:22.04–2:34.05)**: 专业片尾致谢卡片（Thank You for Watching、Cloud Run 线上公测邀请、双模架构与安全卡片、Samantha 专业致谢原声）。 |
| **结合版外挂 SRT 字幕**<br>`OpsCrew_Combined_Official_Demo_165s.srt` | `submission/video_output/OpsCrew_Combined_Official_Demo_165s.srt` | 标准 SubRip 格式，9 条英文字幕，精确到毫秒 | 供上传 YouTube / 赛事平台作为独立英文字幕轨道。 |
| **结合版外挂 VTT 字幕**<br>`OpsCrew_Combined_Official_Demo_165s.vtt` | `submission/video_output/OpsCrew_Combined_Official_Demo_165s.vtt` | 标准 WebVTT 格式，9 条英文字幕 | 供 HTML5 播放器及在线评测平台使用。 |
| **Part 1 幻灯片专用片段**<br>`part1_slides.mp4` | `submission/video_output/part1_slides.mp4` | 20.02 秒，精炼 2 张核心幻灯片 + 预留底部字幕带 + 无遮挡架构图 | 结合版前半段素材。 |
| **Part 2 网页录像专用片段**<br>`part2_demo.mp4` | `submission/video_output/part2_demo.mp4` | 122.00 秒，包含独立回读、重开验证与8秒收尾 | 结合版中段真实云端操作素材。 |
| **Part 3 片尾致谢专用片段**<br>`part3_outro.mp4` | `submission/video_output/part3_outro.mp4` | 12.00 秒，高保真 Thank You 片尾卡片 + 双模架构特性卡 + 邀请公测解说 | 结合版尾段致谢素材。 |

---

## 四、 视听体验与排版优化要点 (Visual & Subtitle Engineering)

1. **Title-Safe Zone 绝对高度抬升**：
   - 网页录制（Playwright）：将字幕条悬浮容器 CSS 设定为 `bottom: 75px`，确保在主流播放器（YouTube / QuickTime / VLC / HTML5 控件）弹出控制条和进度条时，字幕仍完整无缺、毫无遮挡。
   - 幻灯片与片尾渲染（Python PIL）：采用等比缩放至 `1920 x 900`，底部留出 180px 深色底带，字幕胶囊气泡四周留足呼吸间距。

2. **操作视口居中优化 (`scrollY = 950`)**：
   - 针对原视频后半段“历史记录列表偏低、被字幕遮挡”的问题，在进入工单确认与回读阶段时，自动平滑下滚至 `scrollY = 950`。
   - 使得 Section 3 确认工单卡片位于 `y = 300~500px`，历史记录列表位于 `y = 550~700px`，与底部字幕胶囊（`y = 965~1045px`）之间保留了超过 260px 的绝对安全空隙。

3. **解说词精细拆分与完整回读展示**：
   - 将原过长的一段解说拆分为 `p2_c6`（独立回读与 Firestore 原子持久化）和 `p2_c7`（历史记录刷新与重开验证）。
   - 让解说节奏与画面的“点击回读”、“刷新历史”、“打开同一工单”严丝合缝对齐。

4. **音频底噪音轨保底与从容静止收尾**：
   - 引入 `-f lavfi anullsrc=r=48000:cl=stereo -t 122.0` 作为混音基底，彻底根除 ffmpeg `amix` 提前截断的问题。
   - 页面操作完成后保持 8 秒静止稳定展示，杜绝“戛然而止”或“演示不完整”的感觉。

5. **专业片尾致谢与赛事专属视觉呈现 (Part 3 Outro)**：
   - 制作了兼具竞赛官方质感与技术专业度的片尾致谢卡片（深色暗夜渐变、环境漫反射光晕、竞赛徽章）。
   - 罗列 Google Cloud Run 真实线上地址、双模 AI 架构（Vertex AI Agent Platform + Gemini API）、零信任规则引擎与开源团队署名。
   - 配置 Samantha 专业英文女声致谢解说，并在底部保留严格的 Title-Safe 悬浮字幕，让全片结构完整、起承转合自然。

---

## 五、 队友/评委自检与复核验证流程 (Self-Verification Steps)

1. **核验时长与音视频轨道（必须严格 < 180.00 秒）**：
   ```bash
   # 查看官方结合版视频时长 (当前实测: 154.05 秒)
   ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 submission/video_output/OpsCrew_Combined_Official_Demo_165s.mp4

   # 查看音视频流规格
   ffprobe submission/video_output/OpsCrew_Combined_Official_Demo_165s.mp4 2>&1 | grep Stream
   ```

2. **在 macOS 上一键调出并播放预览**：
   ```bash
   # 打开输出文件夹直接查看视频
   open submission/video_output
   ```

3. **重新全自动化生成指令**：
   ```bash
   # 一键生成完整结合版视频（自动检查并渲染 Part 1 幻灯片 + 自动运行 Playwright 录制 Part 2 云端操作 + 自动对齐混流）
   node submission/record-combined-demo.mjs
   ```
