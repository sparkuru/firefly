# 在 lab 中自研 majo 静态复刻

## Goal

在 Firefly 中增加一个独立的静态 Experiment `/lab/majo/`，根据已观察到的
`SOURCE-URL` 行为协议复刻三屏全屏图文页、切屏动画和音乐控制。
源码必须由仓库重新编写，发布后的页面可以表现得像目标页，但不能依赖目标页的
HTML/CSS/JS、第三方 CDN 或运行时远程资源。

实际图片和音乐由 owner 放入本地 ignored 输入；构建后将它们复制进独立的
`/lab/majo/` 发布物，因此源码仓库不提交二进制媒体，但本地构建和发布仍能使用
真实媒体。

## Confirmed facts

### Target behavior

- 目标路由是独立的静态 HTML 页面，包含三张 full-viewport slide、隐藏加载遮罩、
  三段中文文本、底部音乐区、一个 `<audio>` 元素和分页。
- 目标的自定义行为协议是：Swiper 风格 fade/loop 切换，过渡约 1500 ms，点击分页，
  禁止触摸拖拽；背景图放大后约 10 秒回到正常比例；第一屏的两个 quote 段落在
  约 2 秒节奏上以约 4 秒淡入。
- 页面会预加载五张图片，加载完成后解除遮罩；其中三张作为 slide 背景，另外两张
  只参与预加载。三张音乐与当前 slide 绑定，支持播放/暂停、进度、点击跳转，
  播放结束后切换到下一张。
- 原页面尝试自动播放音乐，但浏览器策略可能拒绝；复刻应保留“尝试播放”语义，
  同时保证显式播放按钮可用。
- 公开页面使用大型 vendor bundle、Bootstrap/theme CSS 和 custom `app.js`、`z.js`。
  本任务只复刻可观察行为，不复制这些源文件。

### Repository constraints

- Firefly 通过 `experiments/<id>/experiment.json` 发现独立 Experiment；listed
  manifest 的 catalog、`/lab/` 索引和 Terminal 目录由现有 validator 消费。
- 发布构建在 Experiment 自己的 `dist/` 中完成，assembler 只接受 contained regular
  files，拒绝 source/dependency/private artifacts，并检查本地引用不能逃出 mount。
- `experiments/nerv` 是当前独立 Astro Experiment 的参考；通用发布路由已经能提供
  `/lab/<id>/` 下的普通静态文件，Firefly 主站不应导入 Experiment 源码或样式。
- 目标服务器中的其他历史 sibling route 和额外媒体不属于默认 `/majo/` 入口范围。

### Owner decisions already confirmed

- 目标是 `lab` 下的单个目录/单个 Experiment，不把 majo 逻辑并入主站 Terminal。
- 必须使用真实图片和音乐；它们作为本地未跟踪输入并加入 `.gitignore`，而不是提交
  到 Git。
- HTML/CSS/JS 只能参考目标行为，必须自己实现并由构建流程生成发布物。

## Requirements

### R1. Independent publication boundary

创建 listed `majo` manifest，canonical mount 为 `/lab/majo/`，拥有一个默认入口。
构建输出必须只包含 majo 自己的 HTML/CSS/JS、声明的本地媒体和必要的许可证/说明
文件；不得修改目标站点的 `/majo/` 路由、生产 DNS、Nginx、Cloudflare 或远端文件。

### R2. Own implementation

页面源码必须是仓库内新写的 HTML/Astro、局部 CSS 和原生浏览器 JavaScript。不得
直接复制目标页的 `vendor.min.js`、`style.css`、`app.js`、`z.js`、Bootstrap/Swiper
发行包或其他原始源码，也不得在运行时从目标站点、CDN 或远端音视频地址取资源。

### R3. Visual and interaction behavior

复刻三张 full-viewport 背景 slide、中文文本、底部渐变 footer、加载遮罩、分页、
背景缩放和文字渐显。分页切换采用 fade/loop 语义，过渡约 1500 ms；背景层保持约
10 秒的缩放过渡；默认行为不依赖触摸拖拽。页面应暴露稳定的语义状态和事件钩子，
使自动化测试可以验证当前 slide、加载状态和当前曲目。

### R4. Media input and output

使用五张实际图片和三首实际音乐：三张显示背景、两张与目标一致的 preload-only 图片、
三首与目标默认入口对应的曲目。媒体只能从 ignored 的本地输入进入构建；缺少必需
媒体时构建必须明确失败，不得退回外链或占位媒体。构建成功后，发布 `dist/` 必须
包含运行所需媒体，并在发布物中使用 mount 内的本地引用。媒体边界固定为
`experiments/majo/public/media/` → Astro 的 `dist/media/` → assembled
`/lab/majo/media/`；构建脚本只验证输入和 Astro 的输出，不手工复制媒体。

### R5. Player behavior and browser policy

当前 slide 变化时载入对应曲目并更新标题/背景说明；播放按钮切换播放状态，进度条
反映 `timeupdate` 并支持点击跳转，`ended` 推进到下一首/下一张。实现可以尝试初始
自动播放，但必须处理 `play()` 被浏览器拒绝的情况，不得因此阻塞页面或加载遮罩。

### R6. No-JS, accessibility, and responsive behavior

JavaScript 禁用时第一张 slide 的文字和背景仍可见，加载遮罩不能永久遮住内容；JS
增强后分页、播放按钮、进度控制具备键盘可操作性、可读的 aria 状态和焦点样式。
`prefers-reduced-motion: reduce` 时停止连续缩放/装饰动画并缩短或跳过切屏过渡。
桌面和移动 Chromium 下不得出现横向溢出，中文文本和音乐信息不能把 footer 推出
视口。

### R7. Repository integration

把 majo 的依赖安装、检查、构建和发布接入现有 `./sam`/root build graph；更新
发布级 Playwright 或等价测试以验证 `/lab/majo/`、`/lab/` catalog、assembled
release 和 runtime 路径，同时保持 NERV、主站 Terminal 和既有 publication contract
测试通过。

## Acceptance Criteria

- [ ] `./sam npm run validate:experiments` 发现并接受 `majo` manifest；`./sam npm run build:majo` 在本地媒体缺失时以可读错误失败，在媒体齐全时生成 package-local `dist/`。
- [ ] `./sam npm run assemble:publication` 后存在 `/lab/majo/index.html`（或等价 canonical entry），`/lab/` 列出 majo，Terminal 的 experiment catalog 仍只使用 validator 提供的 canonical href。
- [ ] assembled `/lab/majo/` 只请求 mount 内的 HTML/CSS/JS/图片/音频；自动化 network 断言不出现目标站点、CDN、协议相对 URL 或其他外部资源请求。
- [ ] 页面包含三张可识别的 slide、三组目标文本、分页和底部音乐区；测试可观察到当前 slide 的 fade 切换、背景缩放状态、首屏文字渐显和加载遮罩从 loading 到 ready 的状态变化。
- [ ] 五张图片都参与本地预加载，三首本地音频可以被选中；播放/暂停、进度更新、点击跳转、当前曲目更新和播放结束推进都有可验证行为。
- [ ] JS 禁用时首屏内容可见；reduced-motion 下连续动画停止；桌面与移动 Chromium 无横向溢出，关键控件具有可访问名称、键盘路径和焦点状态。
- [ ] majo 源码不包含目标 vendor/custom 文件的直接拷贝或运行时远程资源依赖；发布输出不含源码、依赖目录、source map、symlink 或 `public/media` 输入目录。
- [ ] root `check/build/test`、majo focused tests、assembled publication tests、`git diff --check` 通过；媒体二进制仍被 `.gitignore` 忽略且未出现在 Git diff 中。

## Out of scope

- 不复制目标站点的其他 `/genshin/`、`/screen/` 等 sibling route，不制作多页 majo 应用。
- 不把目标页面直接挂到生产 `/majo/`，不修改真实服务器、DNS、Cloudflare、TLS、Nginx 或部署指针。
- 不承诺第三方画作、角色图或游戏音乐的再发布权；发布前由 owner 负责确认其权利和使用范围。
- 不引入 vendor bundle、Swiper、Bootstrap 或其他第三方运行时库来完成这一个页面。
- 不为实现目标页面而改造主站 Terminal 的内容模型、Experiment validator schema 或通用发布事务。

## Risks and deferred items

- 真实媒体约 35 MiB，首次构建和移动端加载成本明显高于普通 Experiment；不在本任务
  中通过压缩/替换媒体改变用户指定的“实际图片和音乐”范围。
- 浏览器 autoplay 政策会让初始音乐状态与目标页不完全一致；验收以“尝试自动播放且
  被拒绝时页面仍可用、显式播放可用”为准。
- 远端页面可能在未来改变；本 task 以本次观察记录中的行为协议和固定本地媒体输入
  为复刻基线，而不是承诺持续跟随远端变化。

## Open questions

None blocking. The latest owner response approved creation of this isolated task; the
next gate is review and explicit approval of the completed planning summary before
`task.py start`.
