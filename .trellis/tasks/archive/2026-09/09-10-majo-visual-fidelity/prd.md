# 让 majo 视觉与文案贴近原页

## Goal

在不扩大 `/lab/majo/` Experiment 边界、不引入原站运行时依赖的前提下，
让当前 majo 页面在首屏构图、字体层级、底部播放器、分页、动效和显示文案上
尽量接近 owner 提供的原页静态参考。

用户价值是：访问 `/lab/majo/` 时能认出原页面的视觉和内容，而不是只保留
相同的三张图、三首音乐和大致交互。

## Background and confirmed evidence

- 已有独立 `majo` Experiment，入口为 `/lab/majo/`；历史任务明确只复刻原页主入口，
  不复制 vendor/source，也不纳入原参考目录中的 `/genshin/`、`/screen/` 等 sibling
  route。参见已归档的 majo PRD、设计和观察记录。
- 原页主入口使用三张全屏背景、五张图片预加载、三首按 slide 绑定的音乐、
  1500 ms fade/loop/parallax 切屏、约 10 秒的背景缩放和底部渐变播放器。
- 原页的主入口资源已与当前 ignored `public/media/` 中的八个文件逐一比较，
  内容完全相同；当前只是把原文件名规范化为 `slide-01..03`、`preload-04..05`
  和 `track-01..03`。
- 原页的可见文案包括标题“魔女之旅”、三组中文 slide 文本、原始歌曲全名及
  `Background by ...` 背景署名。当前页面额外显示 `MAJO / xx`、scene/counter，
  并简化了歌曲名称和背景信息。
- 当前实现已经提供无 JavaScript 首屏、reduced-motion、键盘导航、ARIA 控件和
  预加载失败兜底；这些能力必须继续保留。

## Requirements

### R1. Reference visual composition

- 三张背景的顺序、全视口覆盖和原页的暗色 overlay 保持一致。
- 背景进入 active slide 时从约 `scale(1.2)` 回到 `scale(1)`，持续约 10 秒；
  slide fade 切换约 1500 ms；slide 文案保留原页的横向 parallax 进入感。
- 页面正文使用接近原页的轻量、较小的中文标题/段落层级，不再使用当前过大的
  editorial `h1/h2` 标题比例。
- 底部 footer 恢复原页的黑色渐变、左侧短进度条、播放图标、曲目信息和三个
  圆点分页的构图。移除可见的 `MAJO / xx`、Scene 标签和 `01 / 03` 计数等当前
  添加但原页没有的装饰信息。
- 桌面和窄屏都保持原页的左侧文字安全区、footer 不遮挡核心文案、无横向溢出；
  不以引入远端字体为代价，使用本地/系统 fallback 逼近原页字体。

### R2. Reference copy and metadata

- 保持原页标题“魔女之旅”和三组中文文本的字词、标点、顺序与换行语义；首屏
  第一行保留原页粗体处理，两个 quote 仍按原页的渐进显示节奏出现。
- 播放器显示原始完整歌曲标签：
  - `陈致逸,HOYO-MiX - Reminiscence (Genshin Impact Main Theme Var.) 追忆`
  - `陈致逸,HOYO-MiX - Faraway Solicitude 遥远的嘱托`
  - `陈致逸,HOYO-MiX - The Fading Stories (Qingce Night) 不再年轻的村庄 (轻策夜间)`
- 背景信息恢复为原页的 `Background by Cost`（保留其 attribution link 的点击
  语义，但不得在页面加载时请求外部资源）以及其余两幕的 `Background by _`。
- 不凭空新增原页没有的场景名称、营销说明或版权声明；仓库已有的本地媒体权利
  警告和 Experiment license 继续保留在源码/发布边界中。

### R3. Behavior and accessibility compatibility

- 保留现有原生播放器行为：切幕换曲、播放/暂停、进度更新与 seek、播放结束进入
  下一幕、自动播放失败时页面仍可用。
- 保留可访问的 button/range、可见 focus、ARIA 状态、键盘左右/Home/End 导航、
  JavaScript 禁用时首屏内容可见，以及 `prefers-reduced-motion` 下跳过连续缩放和
  缩短切幕过渡。
- 五张图片仍参与本地预加载；图片失败时 loading mask 必须解除并暴露 degraded
  状态，不能回退到外链、占位媒体或永久遮罩。

### R4. Publication and dependency boundary

- 只修改 `experiments/majo/` 及其必要的 majo 测试/文档和本任务约定的本地开发入口
  文档/脚本；不把原参考目录的 sibling route、额外音乐、vendor CSS/JS、icon font
  或 Google Fonts 复制进发布物。
- 继续通过 Astro package-local `dist/` 和现有 assembler 发布到 `/lab/majo/`；
  页面加载时所有图片、音频、CSS、JS 请求都必须是当前 mount 内的本地资源。
- attribution link 可以作为用户主动导航的普通链接存在，但不得变成运行时资源、
  字体、脚本或媒体依赖。

### R5. Local development entry

- `./dev.sh`、`./dev.sh start` 和 `./dev.sh up` 默认直接提供已经构建好的完整装配
  发布物，不重复执行构建；因此本地默认访问 `/lab/majo/` 时不能再落到只包含主站的
  Astro dev server。
- 保留显式的 `./dev.sh dev` 作为主站快速热更新入口；`preview`/`build` 继续作为
  完整装配发布预览的兼容别名，并由这两个命令负责执行 `build:m4`。
- 默认完整站点模式必须预检已经存在的 assembled 输出；`preview`/`build` 才预检 majo
  及其构建链依赖。所有模式沿用现有 `./sam`、只读内容挂载、精确容器标签与退出清理边界。

## Acceptance Criteria

- [ ] 三张 slide 的背景顺序、原始中文文案、首屏粗体 quote、完整歌曲标签和背景
      信息与参考主入口一致；当前新增的 MAJO/Scene/counter 不再可见。
- [ ] 在 1440×900 和 375×812 的 Chromium 下，页面保持全视口构图、无横向溢出，
      footer/分页/进度条/文案的相对位置和层级接近参考；视觉检查确认没有明显的
      当前版大标题、强渐变或数字分页残留。
- [ ] 切幕仍为约 1500 ms fade 并带横向文案进入感，背景缩放约 10 秒；分页为
      三个可访问圆点，播放图标和进度条的显示状态接近原页。
- [ ] 原生播放器、自动播放拒绝、播放结束推进、键盘导航、reduced-motion、无 JS
      首屏和预加载失败兜底的既有测试继续通过，并补充文案/metadata 断言。
- [ ] `experiments/majo` 发布物仍只包含本 Experiment 的页面、代码、license 和
      八个本地媒体文件；没有 vendor/source map/source/dependency 目录或远端资源。
- [ ] `./sam npm run check:majo`、majo focused E2E、受影响的 publication/runtime
      检查和 `git diff --check` 通过；媒体保持 ignored，工作树不产生无关变更。

## Out of scope

- 不实现或迁移 `/genshin/`、`/screen/`、`header.html`、其他历史音频/图片或远端
  站点的通用登录/头尾逻辑。
- 不复制 Bootstrap、Swiper、jQuery、vendor bundle、icomoon 字体或 Google Fonts；
  视觉接近通过当前自有 HTML/CSS/原生 TypeScript 实现。
- 不修改生产站点、DNS、Nginx、远端目录、部署指针或 Firefly 主站 Experiment
  数据模型；本地 `dev.sh` 只是调整开发入口和预览方式。

## Risks and deferred items

- 不引入原站字体和 vendor 运行时会造成字形、图标和极少数浏览器排版差异；以
  本地/系统 fallback 和 CSS 图形近似为接受的边界。
- 原页 HTML 存在部分非语义标记和依赖 Swiper 的隐式 DOM 状态；复刻应优先匹配
  可观察视觉/交互，不回退当前的 accessibility 和错误处理。
- 真实媒体的版权仍由 owner 负责确认；本任务只调整显示内容，不改变媒体来源和
  权利声明。

## Open questions

None blocking. The user approved creating this task and selected visual/copy fidelity;
the next gate is approval of the completed planning summary before `task.py start`.
