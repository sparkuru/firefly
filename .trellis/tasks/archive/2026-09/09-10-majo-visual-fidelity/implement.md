# majo 视觉与文案贴近原页：执行计划

## 实施顺序

### 1. 先锁定参考契约与当前边界

- [x] 复读本任务 `prd.md`、`design.md`、前端 publication contract、validation
      profile 和已归档的 majo observation；确认只改主入口，不迁移 sibling route。
- [x] 检查当前工作树，记录实现前的 `git status --short`；确保 ignored 媒体不会被
      格式化、重命名或纳入本次 diff。
- [x] 搜索现有 majo 的视觉钩子（kicker、scene、counter、subtitle、数字分页）和
      远端 URL，形成修改后的残留检查清单。

### 2. 调整静态页面 DOM 与文案

- [x] 修改 `experiments/majo/src/layouts/Layout.astro` 与 `src/pages/index.astro`：将
      lang、keywords、description、PWA viewport metadata 和页面结构对齐参考，同时
      保持三张本地背景及五张 preload 资源顺序，保留 `Layout title="魔女之旅"`、无 JS
      首屏和可访问结构。
- [x] 用原页精确的三组中文文本替换当前 editorial 版 heading 结构；首幕第一行
      保留 `<b>` 语义和原始标点，去除 MAJO/Scene/计数等非参考内容。
- [x] 将 loading 可见文案恢复为“加载中...”，并为播放器预置首幕完整歌曲标签与
      背景署名；首幕 Cost attribution 保留为普通用户点击链接。
- [x] 保留 range、button、audio、live region 的可访问标记，删除不再需要的
      subtitle/scene/counter 专用节点，并让分页按钮只保留圆点视觉层。

### 3. 重做原页近似的 CSS

- [x] 在 `experiments/majo/src/styles/majo.css` 中以本地 token 重建原页的容器
      gutter、正文字号/字重、单层图片 veil 和全视口层，移除当前大标题和强 editorial
      渐变。
- [x] 实现 `1500ms` slide fade、`-100% -> 0` copy parallax、`120% -> 100%`
      的 `10000ms` 背景缩放；保证未增强页面仍能看到静态首幕。
- [x] 将 footer 对齐参考顺序和空间：黑色底部渐变、约 30% 宽/至少 200px 的进度条、
      无边框 CSS 播放图标、两行音乐/署名文字，以及三个 `30px` hit area 的白色圆点。
- [x] 增加长中文/歌曲标签的移动端换行规则、`375px` 无溢出约束、可见 focus 和
      reduced-motion 覆盖；禁止新增字体、图片、CSS import 或 data URL 资源。

### 4. 收敛播放器状态逻辑

- [x] 在 `majo-player.ts` 将 `TRACKS` 改为完整原始三条 label、准确本地音频路径和
      三条背景署名数据，删掉 invented subtitle/scene/counter 状态。
- [x] 让 `updateTrack` 在切幕和初始加载时更新完整标题及 attribution DOM；使用安全
      的节点属性赋值，不将 HTML 文案拼进 `innerHTML`。
- [x] 保留并复核 autoplay rejection、play/pause、timeupdate/durationchange、seek、
      ended 自动进入下一幕、pagination/keyboard、pagehide、preload error fallback。
- [x] 将视觉状态统一收敛到现有 `data-majo-*` 属性，确保 progress 的显示/隐藏与
      原页播放状态接近，同时 range 获得 focus 时仍可操作。

### 5. 更新 focused E2E 与边界断言

- [x] 更新 `experiments/majo/tests/majo.spec.ts` 中的旧标题、subtitle、scene 断言，
      增加三幕精确中文文案、三条完整歌曲标签、Cost/`_` attribution 和首幕粗体
      标记断言。
- [x] 增加“没有 MAJO、Scene、数字分页、counter”以及“首屏视觉参数为 1500ms fade /
      10s zoom / 30% progress”断言；避免依赖脆弱的动画中间帧。
- [x] 保留并验证本地请求白名单、五图预加载、音频可访问、自动播放拒绝、ended 推进、
      reduced-motion、无 JS 首屏和桌面/移动无横向溢出测试；确认 attribution 链接
      不在页面加载时产生外部请求。

### 6. 逐层验证与视觉复核

- [x] 运行 `./sam npm run check:majo`。
- [x] 运行 `./sam npm run build:majo`，确认 package-local `dist/` 仍只有页面、代码、
      license 与八个本地媒体输出。
- [x] 在固定 Playwright Chromium 环境运行 majo focused E2E，至少覆盖
      `1440x900` 与 `375x812`；查看截图或 DOM 几何，确认 footer、文案、分页和背景
      相对位置没有明显偏离参考。
- [x] 运行受影响的 publication/runtime 检查（assembler 输出、mount-local URL、
      非 majo 外链扫描），并用 `git diff --check` 检查空白错误。
- [x] 最后检查 `git status --short --ignored`：只允许 majo 源码/测试、本地开发入口文档/
      脚本和本任务规划记录变化，媒体仍为 ignored，不产生其他 Experiment 的无关文件。

## 验证命令

优先使用仓库约定的 `./sam` 边界：

```text
./sam npm run check:majo
./sam npm run build:majo
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix experiments/majo run test:e2e
./sam npm run validate:experiments
git diff --check
```

若 focused E2E 已经包含 build，则记录实际执行的去重命令和结果；不得因为本地快捷
命令成功而跳过 package-local build 或 assembled publication 检查。

## 每阶段回滚点

- 页面 DOM 完成后：若 Astro check 失败，先回退 DOM 变化，不继续调 CSS。
- CSS 完成后：若移动端 overflow 或截图明显偏离，回退 CSS token/布局层，不改媒体
  和播放器数据。
- TS 完成后：若音频/切幕行为回归，回退 `TRACKS` 投影和事件改动，保留已验证的
  静态视觉修正。
- 所有验证通过后：只保留 majo 相关源码、测试、任务记录和本地开发入口同步；不执行
  远端目录写操作、不改 Firefly 主站 Experiment 注册、不部署。

## 完成门槛

实现完成必须同时满足 PRD 的 R1-R4 和 acceptance criteria；尤其是视觉复核、完整
歌曲/署名文案、无外链运行时请求、无 JS/reduced-motion/失败预加载回归，以及
package-local publication inventory 均有命令输出或 focused E2E 证据。未获得用户对
本规划摘要的明确确认前，不执行 `task.py start`，也不进入代码实现。

## 执行记录

- `./sam npm run check:majo`：通过，9 个 Astro 文件 0 errors / 0 warnings / 0 hints。
- 固定 Chromium 下 majo focused E2E：16/16 通过，覆盖桌面与移动视口、播放器、切幕、reduced-motion、无 JS 和无横向溢出。
- `./sam npm run build:m4`：通过；majo 与 NERV 均完成构建，majo 发布物保留 8 个本地媒体文件。
- 装配后的 publication E2E：4/4 通过。
- `python3 ./.trellis/scripts/task.py validate .trellis/tasks/09-10-majo-visual-fidelity` 与 `git diff --check`：通过。
- 已对 1440×900 与 375×812 做临时视觉截图复核，截图未保留在工作树；运行时外链扫描仅保留用户主动点击的背景署名链接。
- 默认 `dev.sh` 临时 publication 服务的 `/`、`/lab/`、`/lab/majo/`、`/lab/nerv/` 均返回 200，且本次启动日志没有 `build:m4`；显式 `dev` 模式保持 `/` 与 `/lab/` 为 200、`/lab/majo/` 为 404。
- 缺少 assembled 输出时，默认入口在停止服务前失败，并提示 `./sam npm run build:m4` 或
  `./dev.sh preview`；独立临时容器已清理，原有 `sam.scope=dev.sh` 容器未受影响。
- `bash -n dev.sh sam package-runtime.sh verify.sh`、ShellCheck、shfmt 和 `./dev.sh --help`：通过。
- 首屏第二行 quote 修复：`data-majo-enhanced=false` 的 SSR 样式已与控制器的延迟淡入
  状态对齐，避免初始化时出现可见→淡出→淡入；focused E2E 仍为 16/16。

### 7. 调整默认完整站点开发入口

- [x] 修改 `dev.sh`：无参数、`start`、`up` 默认复用已有 assembled publication 且不
      重建；增加显式 `dev` 保留主站 Astro 热更新，`preview`/`build` 才执行重建；补充
      默认发布物和 majo 构建链预检。
- [x] 同步 `readme.md` 与 frontend development-runtime contract，明确默认命令、
      快速热更新命令和完整站点预览命令的差异。
- [x] 运行 `bash -n`、ShellCheck（若可用）、`shfmt -d`（若可用），并检查现有
      dev.sh 容器确认其为主站 dev 模式；使用独立标签的临时副本验证默认 publication
      服务和显式 `dev` 模式，未中断用户正在使用的容器。
