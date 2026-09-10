# 统一多端首次访问 boot-like 动画

## Goal

让访问首页 `/` 的访客在首次完整页面加载时，都能看到同一套可感知、顺序稳定的 Linux boot-like 启动动画，再进入可交互的 Terminal shell。动画不应因为浏览器、网络速度、缓存命中或橙云/CDN 代理把静态 HTML 与客户端脚本以不同节奏交付而被直接跳过。

## Background and confirmed facts

- 首页是 Astro 静态输出；`TerminalHome.astro` 在 HTML 中直接渲染 12 行 boot 文本与启动 prompt（`apps/site/src/components/TerminalHome.astro:40-60,126-151`）。
- Terminal 关键 CSS 以内联方式进入 `TerminalLayout.astro` 的 `<head>`，因此启动面板可以在外部客户端脚本到达前参与首屏渲染（`apps/site/src/layouts/TerminalLayout.astro:24-42`）。
- 页面内联 marker 在解析到首页时设置 `data-terminal-startup-state="connecting"`；如果控制器没有在 `DOMContentLoaded` 前完成启动，则转为 `failed`，保留 no-JS/加载失败 recovery（`apps/site/src/components/TerminalHome.astro:72-122`）。
- 首页客户端控制器是由 `<script>` 引入的外部 module。控制器成功初始化后立即执行 `preserveBootLog()`：移除启动 prompt，把 boot surface 搬进 transcript，并显示交互 session（`apps/site/src/components/TerminalHome.astro:349-356`; `apps/site/src/scripts/terminal-home.ts:191-199,1234-1245`）。
- 当前 CSS 在 boot surface 中按延迟显示行；一旦节点进入 `.terminal-boot-record`，规则会关闭行动画，避免 DOM relocation 后重播（`apps/site/src/styles/terminal.css:220-259`）。因此 controller 在首次可见绘制前快速执行时，访客可能只看到已经完成的 Terminal，而不是动画过程；人为延迟 module 的现有 Playwright 测试只能证明慢加载时面板存在，不能证明正常快速加载也发生过可见首帧动画（`apps/site/tests/terminal.spec.ts:149-211,231-259`）。
- Nginx 只对 `_astro/` 和字体设置 immutable 缓存，HTML 默认没有静态缓存策略；仓库没有橙云生产规则或 Service Worker，因此 CDN 对 HTML/module 的实际缓存与边缘重验证仍是部署侧变量（`nginx.conf:27-43`）。本任务应让客户端时序在这些变量下仍具有确定的首访视觉行为，同时记录部署验证边界。
- no-JS recovery、early controller failure、`prefers-reduced-motion` 和键盘/屏幕阅读器语义已有测试与产品约束，不能因保证动画而退化（`apps/site/src/components/TerminalHome.astro:155-281`; `apps/site/src/styles/terminal.css:247-259`; `apps/site/tests/terminal.spec.ts:213-229`）。

## Requirements

### R1. 首访启动体验

在首页每次完整文档加载的正常 motion 模式下，boot 行按固定顺序和固定时间线出现，启动 prompt 在 boot 序列结束后出现；controller/module 的快慢不能使整段动画在用户可见前被替换为最终 Terminal。boot 序列完成前不开放交互 shell 输入。

### R2. 运行时状态与动画分离

启动动画的播放与 controller 对文档索引、模板和命令状态的初始化应有明确边界。controller 可以在 connecting 阶段准备运行时，但最终状态切换、boot log relocation 和交互 prompt 开放只能在约定的动画生命周期后发生；出现解析、资源或 controller 错误时仍进入原有 recovery，不得卡在启动面板。

### R3. 多端与缓存稳定性

在至少桌面 Chromium、移动 Chromium、快速 module 命中、module 延迟、缓存 HTML + 新 module、完整刷新和首次打开等可测试条件下，首访都满足同一 DOM 状态顺序和 boot 时间线。静态资产的版本化、HTML/module 缓存约束若需要调整，必须保持发布物可回滚。

### R4. 现有降级与可访问性

禁用 JavaScript 时继续直接显示 native recovery；controller 早期失败时继续显示 recovery；`prefers-reduced-motion: reduce` 不等待装饰动画即可进入可用状态；动画不能造成横向溢出、焦点丢失或额外的全局键盘抢占。

### R5. 可验证的部署边界

补充自动化证据，区分“静态 HTML/CSS 已正确交付”“客户端控制器时序正确”和“真实橙云/生产边缘缓存规则”的责任边界；不在没有目标地址、凭据或 owner 授权时修改远程部署。

## Acceptance Criteria

- [ ] 在正常 motion 的快速加载测试中，页面不会在第一次可见绘制前从 boot surface 直接变为最终 Terminal；可观察到 boot 动画事件/阶段顺序，且顺序与延迟 module 测试一致。
- [ ] 12 行 boot 文本、每行延迟、prompt 出现时机和最终 ready 状态有明确断言；移动到 transcript 后不发生第二次动画。
- [ ] 正常 motion 下，在 boot 序列完成前交互 session 和可输入 prompt 保持不可用；序列完成后只开放一个 prompt，且不引入额外的可感知等待。
- [ ] 桌面与移动 Chromium 覆盖快速加载、module 延迟、缓存/刷新路径；各路径最终都只产生一个 boot record、一个交互 prompt，且无 fallback 误显示。
- [ ] no-JS、early failure、reduced-motion、Escape 生命周期、焦点和无横向溢出回归测试保持通过。
- [ ] `./sam` 项目规定的相关 check、build、静态输出和 focused Playwright gate 通过；`git diff --check` 通过。
- [ ] 任务记录明确哪些行为可由仓库自动化保证，哪些仍需在真实橙云域名上由 owner 进行 cache header/DevTools 与真实设备复核。

## Out of scope

- 不引入 Service Worker、动态 SSR、第三方动画库或改变 Terminal 命令/内容模型。
- 不在本任务中修改真实生产 DNS、橙云缓存规则、TLS、远程服务器或提交任何凭据。
- 不以牺牲 no-JS recovery、reduced-motion 或可访问性为代价追求装饰性动画。

## Key decision

Owner approved the recommended hard gate for the boot experience: in normal
motion, the controller may initialize while the page is `connecting`, but the
boot surface remains visible and the interactive session remains unavailable
until the approximately 1.5–1.6 second boot sequence completes. This sacrifices
one animation cycle of first-input latency in exchange for a deterministic
visible intro even when the HTML and module are served from a fast CDN cache.
Reduced-motion keeps the existing immediate usable behavior.

The boot scope targets each full document load of `/` (including reloads under
the current static navigation model); it does not add per-user `sessionStorage`
state or a client-side router.
