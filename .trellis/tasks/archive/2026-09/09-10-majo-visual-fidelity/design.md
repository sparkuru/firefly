# majo 视觉与文案贴近原页：技术设计

## 设计目标

本任务只调整现有 `experiments/majo` 的主入口，把已经确认的原页可观察契约
映射到当前 Astro + 原生 TypeScript 实现。资源仍使用当前 Experiment 内的八个
本地媒体文件，页面仍由 package-local build 产出并挂载到 `/lab/majo/`。

设计采用“保留可访问 DOM、替换视觉实现”的路线：不复制原站的 Bootstrap、Swiper、
jQuery、vendor bundle、icomoon 或 Google Fonts，只复现它们在主入口上产生的布局、
状态和动效。

## 边界与数据流

```text
Astro 静态页面
  ├─ 三个 slide 的本地图片 src + 原始中文文案
  ├─ 首幕的静态播放器元数据 + 背景署名
  └─ accessible button / range / audio 控件
        ↓ 页面加载
majo-player.ts
  ├─ 预加载 5 张本地图片并汇总 ready/degraded 状态
  ├─ 维护 active slide 与对应 track 的唯一状态
  ├─ 更新 copy、播放器标签、署名、分页 ARIA 状态
  └─ 驱动 audio 与 CSS data-state
        ↓ package-local build
experiments/majo/dist/
        ↓ 既有 assembler
/lab/majo/
```

唯一的运行时数据源是 `majo-player.ts` 内的 `TRACKS`：每项包含完整显示标签、
本地音频路径和背景署名类型。Astro 负责首屏可用的静态 fallback；播放器脚本只
负责在切幕时把同一项数据投影到 DOM，不让模板、脚本各自维护一份歌曲文案。

## 页面 DOM 设计

### Slide 区域

- 保留三个 `[data-majo-slide]` section 和初始 `is-active`，确保 JavaScript 禁用时
  第一幕仍可见。
- 背景继续使用 `<img data-majo-background>`，但改为 `inset: 0; object-fit: cover`
  的全屏层，覆盖层使用原页单层 `rgba(0, 0, 0, .3)`；这样既保留已有图片错误
  事件和预加载测试，也不需要把路径改成 style attribute。
- 第一幕的无障碍标题使用“魔女之旅”，但不增加原页没有的可见大标题。可见内容
  只保留原始两行 quote，第一行的“`“ 请别在意。`”粗体边界与原页一致。
- 第二、三幕保留原页每一行的中文文本和顺序，用语义化的 heading/paragraph 组合
  表达原来的 `h3 > p` 分组；不加入 kicker、scene note、营销说明或数字计数。
- `data-majo-quote` 继续作为两行首幕文案的行为钩子。未增强时第一行保持静态
  可见，第二行由初始 CSS 预先隐藏；增强后第一行立即显示，第二行延迟 2000 ms
  淡入，避免 SSR 可见状态在控制器初始化时先反向淡出。

### Footer 播放器

footer 的 DOM 顺序对齐参考页：短进度条、播放控件与两行元数据、底部左侧分页。

- 进度控件继续使用原生 `input[type=range]`，以便键盘、ARIA 和现有 seek 行为
  保持不变；视觉上限制为原页约 `30%` 宽度、至少 `200px`，不铺满整个 footer。
- 播放按钮保持真实 `button`，图标改由本地 CSS 绘制圆形播放/暂停符号，避免复制
  icon font；按钮的 `aria-label`、`aria-pressed` 和 live status 继续由脚本更新。
- `[data-majo-track-title]` 显示完整原始歌曲标签，不再显示人为添加的英文标题与
  subtitle。`[data-majo-bginfo]` 显示 `Background by Cost` 或 `Background by _`。
  首幕 attribution 使用普通 `<a>`，只有用户点击时才会导航，不作为页面加载资源。
- 分页仍是三个真实 button，文字节点为空，利用 `::after` 绘制 `0.625rem` 圆点，
  button 命中区约 `1.875rem`；激活态、hover/focus 和 `aria-current` 对齐参考页。
  不再渲染 `01/02/03` 数字、scene 标签或 `01 / 03` 计数。

## CSS 视觉系统

### 版式

- 以 `15px` 水平 gutter 和 Bootstrap 容器的关键断点（`540/720/1170/1300px`）
  复现原页的文字安全区；桌面正文最大宽度约为 `col-lg-8`，移动端使用全宽 gutter。
- 视口层使用 `100svh`/`100vh` fallback，slide 内容垂直居中，footer 以绝对层
  覆盖底部但不扩大页面高度。所有可变宽文本使用 `min-width: 0`、可换行规则，
  避免长歌曲标签在 375px 视口造成横向溢出。
- 正文回到原页接近 `h3 1.875rem / font-weight 300 / line-height 1.25` 的层级；
  使用系统 fallback（中文优先覆盖 PingFang SC、Microsoft YaHei 等），不声明远端
  `@import` 或字体 URL。颜色以白色及 `rgba(255,255,255,.75)` 为主。

### 图像、切幕与文字进入

- inactive slide 为 `opacity: 0; visibility: hidden`，active slide 为 `opacity: 1`，
  淡入/淡出时长固定为 `1500ms`。
- 背景层在进入 active 时从 `scale(1.2)` 过渡到 `scale(1)`，时长 `10000ms`，与
  原页 `.image-zoom` 一致。脚本仍在切幕时强制 reflow/reset，保证每次进入都会
  重新开始缩放。
- 增强模式下正文从 `translateX(-100%)` 进入 `translateX(0)`，使用与 fade 相同的
  过渡，近似原页 `data-swiper-parallax-x="-100%"`；无 JS 时不应用离屏 transform。
- footer 使用原页的 `linear-gradient(rgba(0,0,0,0) 30%, rgba(0,0,0,.2) 55%,
  rgba(0,0,0,1) 100%)`，删除当前较重的左右/上下双层渐变。
- 进度条在播放时淡入、暂停时淡出，保持原页的低存在感；获得键盘 focus 时仍暴露
  清晰 focus ring。加载遮罩的可见文案改为原页“加载中...”，失败时解除遮罩并将
  degraded 状态留在页面数据属性上。

### 响应式与动效偏好

- `max-width: 767.98px` 时沿用原页移动端全宽 slide 语义，减小正文字号和 footer
  gutter；播放器标签允许自然换行，分页保持左侧排列。
- `prefers-reduced-motion: reduce` 时取消背景连续缩放、正文位移和长 fade，保留
  状态变化、内容可读性及控件功能。
- focus 样式只作用于真实 button/range/link；不通过隐藏视觉文字或远端图标补充
  交互信息。

## TypeScript 状态与兼容性

- 扩展 `MajoTrack` 为完整 label + `backgroundCredit` + `src`，删除
  `subtitle`、`SCENE_LABELS`、scene/counter DOM 依赖。
- `updateSlideState` 只更新 active class、`aria-hidden`、分页 `aria-current` 和
  `data-majo-active-slide`；`updateTrack` 同时更新 audio src、完整标题和署名。
  署名节点使用 `textContent`/属性赋值，不把 attribution HTML 字符串交给
  `innerHTML`。
- 保留当前的 autoplay Promise rejection 处理、audio 事件、seek、ended 推进、
  键盘导航、pagehide 清理和五张图的 load/error 聚合；图片失败永远只影响
  `data-majo-preload-state="degraded"`，不能阻塞 ready。
- 切幕和播放事件仍以 `data-*` 状态作为 CSS 边界，避免在 TS 中直接操纵一套与
  CSS 不一致的视觉规则。

## 取舍、风险与回滚

原页依赖未打包的 Muli 字体、icomoon glyph、Bootstrap 容器和 Swiper 状态。复制这些
依赖会破坏 Experiment 的隔离发布约束，因此这里接受极少数字形差异，以系统字体和
CSS 图标换取零外链、较小发布物和可访问控件。

majo 变更集中在 `experiments/majo/src/layouts/Layout.astro`、
`src/pages/index.astro`、`src/styles/majo.css`、`src/scripts/majo-player.ts` 及其测试；
本地完整站点入口另涉及 `dev.sh`、`readme.md` 和 frontend runtime contract。
若视觉回归或媒体加载回归，只需回滚 majo 源码和对应测试；不触碰 ignored
`public/media`，也不执行远端写入或生产部署。

## 根开发入口

为使本地默认入口与发布路由一致，`dev.sh` 的模式映射调整为：

```text
./dev.sh [start|up]  -> existing assembled dist -> assembled publication server
./dev.sh preview     -> build:m4 -> assembled publication server
./dev.sh build       -> build:m4 -> assembled publication server
./dev.sh dev         -> apps/site astro dev (main-site hot reload)
```

默认完整站点模式复用最近一次 `build:m4` 产生的不可变 assembled `dist/`，由
`tooling/assemble-publication` 的 release server 提供 `/`、`/lab/` 与
`/lab/majo/`，不重复构建；若发布物不存在则在启动前提示执行构建命令。
`preview`/`build` 负责显式重新产生 assembled `dist/`。这些模式都不把 Experiment
源码或运行时依赖接入主站 dev graph。
`dev` 是保留的显式快速开发模式，避免把主站热更新误认为完整发布路由。
