# firefly 产品需求与架构设计

## 1. 产品定义

`firefly` 是一个以 Markdown 为长期内容源、以静态 HTML 为发布结果的个人博客，同时也是彼此隔离的前端实验集合。

系统必须同时支持两类变化：

1. 同一份文章内容通过不同 Presentation Adapter 呈现，例如语义阅读页或 Terminal 界面。
2. 与文章渲染无关的独立页面体验以 Experiment 形式存在，例如 landing page、Canvas、WebGL、交互叙事或不同框架生成的静态页面。

核心原则：

> 内容保持稳定，表现允许激进；博客负责长期可读，实验负责自由探索。

`firefly` 是站点与仓库名称，不是准备独立商业化的静态站点框架。可复用边界只服务于内容可迁移、表现可替换和实验可隔离。

## 2. 已确认现状

| 状态 | 事实 | 架构影响 |
| --- | --- | --- |
| 历史输入 | 原博客运行 Typecho 1.3.0 | 迁移完成后不保留 PHP、MySQL 或 CMS 运行时 |
| 历史输入 | 原始 SQL 导出有 93 篇 post、7 个 page；正文是需规范化的 HTML/Markdown 混合输入 | 这是迁移输入基线，不等同于当前 authored workspace 或发布库存 |
| 已确认 | 1 个 page 使用 `cross.php`、1 个 page 使用 `files.php` | 记录为模板语义候选，不自动重建 timeline/files 特殊路由 |
| 已确认 | 有 189 条已批准评论，另有独立 memo 数据 | M5 只做私有 handoff；公开评论与动态身份服务进入 M5.1 |
| 已确认 | 数据库备份已通过 SHA-256 校验 | 私有备份不得进入公开 Git 历史 |
| 已确认 | 已有 Typecho Terminal 原型 | 作为 Terminal Presentation 的交互和视觉参考，不作为运行时依赖 |
| 已确认 | 当前仓库包含主站、Semantic/Terminal Presentation、NERV Experiment、发布汇编与不可变发布工具 | 各 Experiment 独立构建，Publication Assembler 只消费已验证静态产物 |
| 已确认 | 当前 authored workspace 包含 95 篇 post、8 个 page；原始 SQL 的 93/7 仍作为历史输入保留 | 当前发布库存以受管 Markdown 和页面清单为准，不能用历史数量替代现状 |
| 已确认 | M0–M5 已完成；M6 本地 TLS 方案已 superseded，M7 反向隧道 staging rehearsal 已完成 | M7 是当前主线的 staging 证据，M6 仅保留历史记录 |
| 已确认 | v1.0.0 静态发布已通过构建、汇编、原子 promotion、公开路由、错误页、安全响应头和静态缓存验证 | 当前生产边界是静态发布；上一份不可变 release 保留为 rollback 目标 |
| 待后续决策 | M5.1 动态评论与身份服务 | 保持 deferred；不得因此把主站改为 SSR 或直读数据库 |

数据库备份保存在新工作区的 `.private/backups/`，由 `.gitignore` 排除。公开仓库只记录备份存在、时间和校验状态，不记录数据库内容。

## 3. 目标与成功标准

### 3.1 作者目标

- 日常写作只维护 Markdown、Front Matter 和资源。
- 普通文章不导入 Astro、React、Vue、Tailwind class 或实验组件。
- 更换站点主题或 Presentation Adapter 时不修改正文。
- 新增独立前端实验时不修改主站内容管道，也不把实验依赖带入普通文章。
- 每个实验可选择自己的框架、依赖、构建命令和发布子路径。
- 整个生产站点最终仍是一组可由任意静态服务器托管的文件。

### 3.2 读者目标

- 每篇文章都有可直接访问、分享、索引和长期保留的 URL。
- JavaScript 失效时，博客正文和导航仍可阅读。
- 实验页面可以拥有独立、沉浸式的视觉语言。
- 从实验页面能够返回主站，不把实验错误扩散到博客主体。

### 3.3 成功标准

- 默认文章输出完整语义 HTML，不在浏览器解析 Markdown。
- 同一 Markdown 可选择默认阅读表现或 Terminal 表现。
- Terminal 支持 `ls`、`cat`、`help`、`about` 等核心命令。
- `nerv` 可独立构建并发布到 `/lab/nerv/`。
- 新增第二个 Experiment 不需要修改主站渲染核心。
- 普通文章 bundle 不包含 xterm、WebGL 或其他实验专属依赖。
- 生产环境不依赖 PHP、MySQL、Node 服务或动态 CMS。

## 4. 非目标

MVP 不包含：

- 自研 Markdown parser 或静态站点生成器。
- 浏览器端实时解析 Markdown。
- 通用主题市场、实验插件市场或第三方扩展平台。
- 所见即所得编辑器、Web 管理后台、多用户权限和审核系统。
- 新评论提交服务。
- 把 X Core 发布为独立 npm 框架。
- 强制所有 Experiment 使用 Astro、Tailwind 或同一依赖版本。
- 将独立 landing page 伪装成 Markdown Presentation Adapter。
- 将已购 Typecho 主题源码或授权资源复制到公开仓库。

## 5. 架构原则

### 5.1 内容与实现分离

- 正文默认使用 `.md`，不使用 `.mdx`。
- Front Matter 只描述内容语义、路由和表现意图。
- 内容中禁止出现组件路径、框架 hydration 指令和表现型 CSS class。
- `content/` 不依赖 Astro 的目录约定，由显式 loader 载入。

### 5.2 两种扩展机制不得混淆

| 机制 | 输入 | 输出 | 适用对象 |
| --- | --- | --- | --- |
| Presentation Adapter | 标准化文档树与内容上下文 | 语义 HTML 与增强清单 | 同一文章的不同表现 |
| Experiment | 自有源码、资产与依赖 | 独立静态目录 | landing、Canvas、WebGL、交互作品 |

判断规则：需要消费统一 Markdown 内容契约的实现属于 Presentation；拥有完整页面、全局样式或独立运行时的实现属于 Experiment。

### 5.3 构建时优先

- Markdown 解析、标题 ID、目录、链接、代码高亮和 HTML 生成在构建时完成。
- 浏览器只执行终端交互、动画、Canvas、WebGL 和必要事件逻辑。
- 博客页面先提供可读静态 HTML，再加载渐进增强。
- Experiment 可以是强交互页面，但必须提供可识别的标题、返回路径和 reduced-motion 策略。

### 5.4 依赖隔离

- 主站和各 Experiment 分别声明依赖与构建命令。
- Experiment 不得从主站源码目录做相对导入。
- 主站不得直接导入 Experiment 的组件和全局 CSS。
- 发布层只消费构建产物与 `experiment.json`，不理解实验内部框架。

### 5.5 失败隔离

- 单个实验构建失败时，不得产生部分覆盖后的生产目录。
- 实验客户端异常不得影响博客路由。
- Presentation 增强失败时保留静态正文。
- 未识别的必需 layout 或 presentation 应使构建失败。

## 6. 总体架构

```text
                         content/posts, pages, assets
                                      │
                                      ▼
                          Astro Content Collections
                                      │
                                      ▼
                    X Core: normalize / validate / transform
                                      │
                          ┌───────────┴───────────┐
                          ▼                       ▼
                 Semantic Presentation   Terminal Presentation
                          │                       │
                          └───────────┬───────────┘
                                      ▼
                              apps/site artifact

 experiments/*/experiment.json + independent source
                          │
                          ▼
                 per-experiment build command
                          │
                          ▼
              artifacts/experiments/<experiment-id>

 apps/site artifact + experiment artifacts
                          │
                          ▼
                    Publication Assembler
                          │
                          ▼
                         dist/
```

发布汇编层只执行四件事：验证清单、检测路径冲突、复制静态产物、生成实验公开索引。它不重写实验 HTML，不把实验 bundle 合并进主站。

## 7. 当前目录结构

```text
firefly/
├── prd.md
├── package.json
├── content/
│   ├── posts/
│   ├── pages/
│   └── assets/
├── apps/
│   └── site/
│       ├── src/
│       │   ├── content.config.ts
│       │   ├── pages/
│       │   ├── layouts/
│       │   ├── components/
│       │   └── styles/
│       └── public/
├── packages/
│   ├── content-contract/
│   └── x-core/
├── presentations/
│   ├── semantic/
│   └── terminal/
├── experiments/
│   └── nerv/
│       ├── experiment.json
│       ├── package.json
│       ├── astro.config.mjs
│       ├── src/
│       ├── public/
│       ├── reference/
│       └── license
├── prototypes/
│   └── typecho-terminal/
├── tooling/
│   ├── validate-content/
│   ├── validate-experiments/
│   └── assemble-publication/
├── artifacts/
├── dist/
└── .private/
    └── backups/
```

上面的边界已经在当前仓库落地：`content/`、`apps/`、`packages/`、`presentations/`、`experiments/`、`tooling/` 与 `.trellis/` 分别承担内容、主站、核心契约、表现层、独立实验、发布验证和工作流职责。`artifacts/`、`dist/` 与 `.private/` 只保存生成物或私有备份，不作为公开源代码契约。

## 8. 技术决策

### 8.1 主站

- 使用实施时的 Astro 7 稳定版本并固定 lockfile。
- 输出模式为纯静态 `output: 'static'`。
- 使用 Content Collections 与显式 loader 校验内容。
- 使用 Unified processor 承接现有 remark/rehype 生态；Astro 7 中通过 `@astrojs/markdown-remark` 显式启用。
- Tailwind 4 通过 Vite 插件接入，只服务主站布局和 Presentation 静态样式。
- RSS、Sitemap、Open Graph 和 canonical 从统一内容 schema 生成。

不要求已存在的 Experiment 同步升级 Astro。框架版本由实验自身锁定，只有浏览器安全、构建失效或发布兼容性问题才触发升级。

### 8.2 X Core

X 是内容与 Presentation 之间的薄层，不是第二套站点生成器。

职责：

- 接收已加载并通过 schema 的文档。
- 标准化 mdast/hast。
- 生成稳定 heading ID、目录、摘要、内部链接和资源引用。
- 根据 `presentation` 选择实现。
- 为可增强节点生成稳定 `nodeId`。
- 输出 HTML、诊断和 Enhancement Manifest。

不负责：

- 页面颜色、动画时间线、Canvas/WebGL。
- Astro 文件路由和部署。
- Terminal 状态机。
- Experiment 构建、组件或全局 CSS。

概念接口：

```ts
interface PresentationAdapter {
  id: string
  supports(context: DocumentContext): boolean
  transform(tree: HastRoot, context: DocumentContext): HastRoot
  enhancements(context: DocumentContext): Enhancement[]
}

interface Enhancement {
  nodeId: string
  feature: string
  module: string
  load: 'eager' | 'idle' | 'visible'
  props: Record<string, unknown>
}
```

### 8.3 Presentation

MVP 包含：

- `semantic`：默认文章与页面的可读表现；特殊页面语义需有独立产品决定后再扩展。
- `terminal`：站点首页与可选文章表现，支持命令浏览内容。

Presentation 必须输出合法语义 HTML，不修改源 Markdown，不读取生产数据库。客户端 props 必须安全序列化，未使用的增强模块不得进入页面 bundle。

### 8.4 Experiment

每个 `experiments/<id>/` 是自治静态子项目，必须包含 `experiment.json`。最小契约：

```json
{
  "schemaVersion": 1,
  "id": "example",
  "title": "Example",
  "kind": "landing",
  "visibility": "listed",
  "mountPath": "/lab/example",
  "entryPath": "/index.html",
  "build": {
    "command": "npm run build",
    "outputDir": "dist"
  }
}
```

约束：

- `id` 与目录名一致并全局唯一。
- `mountPath` 必须位于 `/lab/` 下，不得声明 `/`、文章路径或其他实验路径。
- `outputDir` 必须位于当前实验目录内。
- 构建产物不得包含源码映射、凭据、本地绝对路径或越界 symlink。
- 所有根绝对资源 URL 必须包含 `mountPath`，或使用相对 URL。
- `visibility: listed` 的实验进入主站实验索引；`unlisted` 仅通过直链访问。
- 实验可有多个 HTML entry，但必须指定一个默认入口。
- 实验自己的许可证、免责声明和第三方归属应保留在实验目录内。

## 9. 内容模型

### 9.1 Front Matter

```yaml
---
title: Hello, terminal
slug: hello-terminal
date: 2026-08-11
updated: 2026-08-12
description: 一段摘要
tags:
  - Linux
  - Notes
draft: false
layout: post
presentation: firefly
aliases:
  - /archives/123/
---
```

| 字段 | 必需 | 说明 |
| --- | --- | --- |
| `title` | 是 | 文档标题 |
| `slug` | 是 | 稳定且全局唯一 |
| `date` | 是 | 首次发布时间 |
| `updated` | 否 | 最后实质更新日期 |
| `description` | 是 | 索引、SEO 与 RSS 摘要 |
| `tags` | 否 | 语义标签 |
| `draft` | 是 | 草稿不进入生产构建 |
| `layout` | 是 | 当前公开迁移使用 `post`、`page`；`timeline`、`files` 仅保留为未来扩展能力 |
| `presentation` | 否 | 省略时默认使用 `firefly`；也可以显式指定 `semantic` 或其他已注册 Presentation |
| `aliases` | 否 | 旧 URL 和历史路径 |

Experiment 不通过文章 Front Matter 声明。主站实验索引从 `experiment.json` 生成，避免内容 schema 与独立构建系统耦合。

### 9.2 表现意图

普通 Markdown 语法由 Presentation 解释。需要额外语义时，只允许框架无关的 directive：

```md
:::hero
# Welcome to firefly
:::
```

允许的 directive 必须进入 schema、fixture 和构建测试。正文不得引用具体 Astro 组件或 Experiment。

## 10. 路由模型

| 路径 | 所有者 | 说明 |
| --- | --- | --- |
| `/` | Terminal Presentation | 首屏终端入口，提供静态 fallback |
| `/posts/<category>/<slug>/` | 主站 | 按源分类文件夹组织的文章永久链接 |
| `/pages/<slug>/` | 主站 | 独立页面 |
| `/tags/` | 主站 | 仅在使用中的标签经过审核后生成索引与详情 |
| `/lab/` | 主站 | 从实验清单生成的索引 |
| `/lab/<experiment-id>/...` | Experiment | 独立静态产物 |

旧 Typecho URL 只作为私有迁移证据或经审核的可选 alias，不为兼容性重建 Typecho URL 语法。slug 不随标题自动变化，构建时检测重复 slug、canonical 和 alias。

## 11. Terminal Presentation

首屏只显示终端界面，同时在初始 HTML 中提供可访问的站点说明和导航 fallback。

MVP 命令：

| 命令 | 行为 |
| --- | --- |
| `help` | 显示命令帮助 |
| `ls` | 列出公开文档 |
| `ls posts` | 列出文章 |
| `ls pages` | 列出页面 |
| `ls lab` | 列出已公开 Experiment |
| `cat <path>` | 按当前 cwd 打开并渲染文档；跨 cwd 使用 `~/blog/<path>` |
| `open <path>` | 按当前 cwd 打开已列出的 Experiment；支持 cwd-relative 路径或显式 `~/blog` 虚拟绝对路径 |
| `about` | 显示站点说明 |
| `pwd`、`whoami`、`date`、`history`、`clear` | 终端基础行为 |

用户可见路径统一采用两种形式：相对当前 cwd 的路径，或以 `~/blog` 开头的虚拟绝对路径。例如在仓库根目录可使用 `open lab/nerv`，在 `~/blog/lab` 下可使用 `open nerv`；`/lab/nerv` 和裸 `~` 不属于用户命令语法。内部 VFS key、HTTP route 和生成的 href 仍使用 slash-rooted 形式。

`prototypes/typecho-terminal` 只作为参考。可复用视觉 token、命令状态机、键盘历史和补全；不可复用 PHP 模板、Typecho Widget、数据库读取和评论表单。

## 12. NERV 集成基线

### 12.1 实验范围

| 对象 | 位置 | 处理 |
| --- | --- | --- |
| NERV 页面源码 | `experiments/nerv/src/` | 保留 landing 的组件结构与视觉行为 |
| NERV 页面 | `/lab/nerv/` | 实验根路径即默认 landing |
| 404 页面 | 实验构建输出 | 保留独立错误视觉 |
| 运行资产 | `public/` | 保留 favicon 与 SVG |
| 参考截图 | `reference/screenshot.webp` | 不进入运行时资源 |
| 授权声明 | `license` | 原样保留 |

### 12.2 构建边界

- 初始保留 Astro `^4.16.18` 并重新锁定 NERV 实际使用的依赖。
- `base` 固定为 `/lab/nerv`，资源 URL 使用 `import.meta.env.BASE_URL`。
- 输出采用静态 file format，实验根入口为 `index.html`，另保留独立 `404.html`。
- 主站只读取 `experiment.json` 中的公开元数据，不导入 NERV 组件。
- NERV 页面继续显示非官方同人免责声明。

## 13. 构建与发布

### 13.1 构建阶段

```text
1. validate content and experiment manifests
2. build apps/site -> artifacts/site
3. build each listed experiment -> artifacts/experiments/<id>
4. validate output paths, links and secrets
5. assemble into a fresh release directory
6. run smoke and browser tests
7. publish the immutable release
```

不得直接让多个构建任务向同一个 `dist/` 写入。Publication Assembler 在空目录中汇编：

```text
dist/
├── index.html
├── posts/
├── pages/
├── lab/
│   ├── index.html
│   └── nerv/
│       ├── index.html
│       ├── 404.html
│       └── _astro/
└── media/
```

### 13.2 生产发布

当前生产基线是 v1.0.0 的完整静态 publication，而不是早期仅包含单个实验的 runtime：

- 主站与已列出的 Experiment 分别构建，Publication Assembler 在 fresh release 中验证清单、路径、链接和敏感信息后汇编。
- 发布前通过静态输出、路由与 404、浏览器、响应头、缓存、文件清单和运行时约束检查；候选通过后才进行原子 promotion。
- 生产只需要能够托管已汇编的静态文件，不依赖 PHP、MySQL、Node 服务或动态 CMS；容器 runtime 是可复现的验证边界，不是产品运行时的唯一形态。
- 当前公开验证覆盖主站、文章、页面、实验和缺失路由；此前的不可变 release 保留为 rollback 目标，详细操作记录留在本地私有执行记录。

不可变发布采用下列逻辑结构：

```text
publication-root/
├── releases/<release-id>/
└── current -> releases/<release-id>/
```

外部 TLS、反向代理和边缘缓存属于部署环境边界；仓库只记录可验证的静态发布契约，不记录 operational endpoint、SSH、DNS 或凭据。旧 Typecho 仅作为迁移历史和私有回退参考，当前生产流量由静态 publication 承担。

## 14. 质量要求

### 14.1 性能

- 普通文章只加载阅读 CSS 和最小客户端脚本。
- Experiment 不得被预加载到普通页面。
- 重型交互按显式进入、`visible` 或 `idle` 策略加载。
- 图片具有稳定尺寸或占位，静态资源使用内容 hash 和长期缓存。

### 14.2 可访问性

- 博客标题、正文、链接、列表和代码块保持语义 HTML。
- 终端交互可通过键盘完成，输入有 label，输出使用克制的 live-region。
- 动画遵守 `prefers-reduced-motion`。
- Canvas/WebGL Experiment 提供标题、文字说明或静态 fallback。
- Experiment 必须提供离开当前体验并返回 `/lab/` 或 `/` 的途径；沉浸式页面可将其设计为非显眼入口。

### 14.3 安全与隐私

- 默认禁止 Markdown 原始 HTML；例外内容必须清理。
- Enhancement props 使用安全 JSON 序列化。
- 构建产物不得包含数据库、邮箱、IP、用户代理、管理字段、凭据、本地绝对路径和草稿。
- 身份映射默认只存在私有迁移/服务边界；公开别名必须逐项批准，最多包含显示名和明确批准的网址。
- `.private/` 永不进入 Git；CI 不依赖其中数据。
- fan work 和第三方资产的许可证、归属与免责声明保持可见。

### 14.4 SEO 与分发

- 每篇文章拥有独立 HTML、title、description 和 canonical。
- 生成 RSS、Sitemap 和 Open Graph 元数据。
- Experiment 是否进入 Sitemap 由 `visibility` 与 manifest 控制。
- 实验页面不冒充文章，不进入 RSS 正文流。

## 15. 测试策略

### 15.1 内容与 X

- Front Matter schema、重复 slug、日期和未知 layout 检测。
- 内部链接、图片、附件和 alias 检测；分类文件夹和标签命名空间不得冲突。
- mdast/hast 变换 fixture 与快照。
- Heading、code、image、table、blockquote 和 directive 覆盖。
- Presentation 输出合法 HTML，Enhancement Manifest 与 DOM `nodeId` 一致。

### 15.2 主站

- 首页、文章、页面、已审核 tags、lab index 与 404 构建测试。
- 禁用 JavaScript 后的正文阅读测试。
- Terminal 命令、键盘、移动端和 reduced-motion E2E。
- bundle 检查确保普通文章不包含实验依赖。

### 15.3 Experiment

- `experiment.json` schema 与路径边界检查。
- 每个声明 entry 在构建产物中存在。
- HTML 引用的本地 CSS、JS、图片和字体存在。
- 根绝对 URL 不越过 `mountPath`。
- 浏览器 smoke test 覆盖桌面、移动端和 reduced-motion。
- `nerv` 至少验证实验根入口、`404.html` 和 favicon 请求。

### 15.4 迁移验收与现状对照

- 原始 SQL 输入的 93 篇文章和 7 个页面作为历史基线保留；当前 authored workspace 的 95 篇文章和 8 个页面已纳入受管清单并通过发布验证。
- 标题、slug、日期、分类文件夹、标签和正文规范化结果一致。
- 私有 memo 导出保留权限/删除状态，私有评论 handoff 保留不透明对应关系；两者均不进入公开构建。
- 资源清单不存在未解释缺失项；旧 URL 只在选择兼容 alias 时逐条验证。

## 16. 里程碑

| 里程碑 | 交付物 | 状态 | 完成标准 / 当前解释 |
| --- | --- | --- | --- |
| M0 架构基线 | 本 PRD、目录边界、首个 Experiment | complete | 设计、Trellis 工作流与实际仓库结构一致 |
| M1 静态基座 | Astro 7 主站、Content Collections、基础路由 | complete | 示例 Markdown 生成可读 HTML，静态路由与浏览器证据已归档 |
| M2 X Core | contracts、AST 管道、registry、diagnostics | complete | 同一内容可切换 Presentation，核心契约与测试已归档 |
| M3 Terminal MVP | Terminal Presentation 与内容索引 | complete | 核心命令、静态 fallback、键盘和浏览器回归通过 |
| M4 Experiment pipeline | manifest 校验、独立构建、发布汇编 | complete | `nerv` 挂载成功，普通 bundle 无污染，汇编与运行时检查通过 |
| M5 全量迁移 | 当前 95 篇 post、8 个 page、私有 memo/comment handoff、资源与原生 folder routes | complete | 当前清单、正文、元数据、资源和隐私边界通过验证；93/7 仅是历史 SQL 输入基线 |
| M6 Staging | 本地 TLS 方案 | superseded / historical | 原计划被 M7 实际 staging rehearsal 取代，记录保留但不再是当前路径 |
| M7 Staging rehearsal | 反向隧道、边缘代理、静态发布验证与 rollback | complete | 公开/direct-origin 路由、TLS、Basic Auth、浏览器和独立清理证据已归档 |
| P0 Production | v1.0.0 不可变发布与原子切换 | complete | 构建、汇编、promotion、公开路由、错误页、安全头、缓存和 rollback 目标均已验证 |

原 PRD 曾把 M7 直接写作 Production；当前主线将实际 staging rehearsal 与 P0 production rollout 分开记录，以免把 staging 证据和生产授权混为一谈。

## 17. MVP 验收标准

- [x] `content/` 不含 Astro import、client 指令或表现型 class。
- [x] 所有公开 Markdown 通过 schema 校验。
- [x] 原始 SQL 的 93 篇文章与 7 个页面已完成迁移对照；当前 authored workspace 的 95 篇文章与 8 个页面生成受管静态页面。
- [x] 189 条评论只进入私有 handoff；M5 不公开渲染评论或身份字段。
- [x] memo discovery 导出保留权限/删除状态但不生成公开路由。
- [x] 默认文章禁用 JavaScript 后仍完整可读。
- [x] Terminal 支持全部 MVP 命令，并采用 cwd-relative 或 `~/blog` 用户路径语法。
- [x] `experiment.json` 可生成 `/lab/` 索引。
- [x] `nerv` 默认入口可从 `/lab/` 进入。
- [x] NERV 根页面与错误页在挂载路径下无资源 404。
- [x] 新增第二个 Experiment 不需要修改 X Core。
- [x] 普通文章 bundle 不包含 xterm 或实验 CSS。
- [x] RSS、Sitemap、canonical、404 正确；可选 alias 有明确清单和验证结果。
- [x] 构建产物不包含凭据、私有备份、绝对路径和草稿。
- [x] M7 staging 验收完成后才允许生产切换，且该 gate 已通过。
- [x] v1.0.0 生产发布具有已验证 rollback 路径。

## 18. 风险与控制

| 风险 | 判断 | 控制措施 |
| --- | --- | --- |
| Astro 主版本变化 | 真实、可控 | 主站与实验分别锁版本；升级通过独立构建和浏览器回归 |
| Astro 7 默认 Markdown processor 变化 | 已确认 | 显式安装 `@astrojs/markdown-remark` 并选择 Unified |
| NERV 的 Astro 4 lockfile 存在已知依赖漏洞 | 已确认 | 多阶段构建不把 Node 依赖带入运行镜像；单独规划 Astro 升级，不执行破坏性 `audit fix --force` |
| Experiment CSS/依赖污染主站 | 较高 | 独立构建、独立 mount、禁止源码互相导入 |
| 多构建覆盖同一 `dist/` | 较高 | 先输出 artifacts，再由汇编器写入空 release |
| 实验根绝对 URL 在子路径失效 | 较高 | manifest mount 校验、BASE_URL、链接 smoke test |
| fan work 的 IP 与归属问题 | 中等 | 非商业、保留免责声明、许可证与来源；不把实验包装成官方内容 |
| 数据库备份进入公共 Git | 高 | `.private/` 全目录忽略，构建和 CI 不读取备份 |
| Adapter 污染正文 | 中等 | 内容 schema 禁止组件路径与表现 class |
| 旧资源和 URL 丢失 | 遗留、非当前发布阻断 | 全量资源清单、可选 alias、M7 staging 与生产 smoke 证据；未承诺的旧 URL 不自动重建 |
| 评论或身份泄露 | 高 | M5 只生成私有 handoff；公开产物扫描邮箱、IP、用户代理、身份字段和 memo |
| 发布候选与生产内容不一致 | 已控制 | fresh release 汇编、不可变 promotion、文件清单、公开路由与 hashed-asset 检查；上一份 release 保留为 rollback 目标 |

## 19. 默认决策与后续决策

默认决策：

- 项目与仓库统一命名为 `firefly`。
- Astro 作为主站静态外壳，Unified 作为显式 Markdown 管道。
- X Core 只处理内容与 Presentation，不管理独立 Experiment。
- Terminal 是首个非默认 Presentation。
- Experiment 是可独立构建的完整静态子项目，统一挂载到 `/lab/<id>/`。
- `nerv` 是首个 Experiment，也是其唯一公开身份。
- Experiment 可保留自己的框架版本和 lockfile。
- M5 不公开历史评论；M5.1 单独决定公开读模型、新评论、审核与身份服务。
- M5 保留 `views`、`stars`、`commentsNum` 为私有历史统计；未来展示必须另行设计 schema、隐私边界和回归覆盖。
- 私有数据库备份不进入公开 Git。
- M7 是当前主线认可的 staging rehearsal；P0 生产发布已经完成，生产只消费通过 guard 的静态 publication。

历史迁移与后续产品决策：

- 原 Typecho permalink、Web 服务和重写规则仅作为迁移证据，不构成当前发布的兼容承诺。
- 上传附件、本地图片和外链资源清单继续按受管资源边界维护；未解释例外必须逐项记录。
- `cross.php`、`files.php` 对应页面的最终语义仍可作为后续页面设计输入。
- 分类关系按源结构生成文章文件夹；使用中的 tags 是否公开由元数据候选审查决定。
- `cross.php` 与 `files.php` 先作为 page/template 候选记录，不自动生成 `/timeline/` 或 `/files/` 特殊路由。
- 原站本地上传资源迁入受管静态资源，可信第三方链接保留为外链，其余逐项记录例外；当前 v1.0.0 不因未迁移的历史特殊语义回退到 CMS。
- 后续 M5.1 单独实现动态评论与身份服务：独立写 API/数据库、审核和公开读模型导出，不让主站 SSR 或直读数据库。该事项保持 deferred，需重新授权。
- 仓库 owner、canonical 元数据和未来内容统计展示属于独立产品决策，不写入当前生产部署细节。

## 20. 技术依据

- [Astro configuration: base, output and build format](https://docs.astro.build/en/reference/configuration-reference/)
- [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [Astro v7 migration and Unified processor](https://docs.astro.build/en/guides/upgrade-to/v7/)
- [Astro styling and Tailwind 4](https://docs.astro.build/en/guides/styling/)
- [Astro Islands architecture](https://docs.astro.build/en/concepts/islands/)
