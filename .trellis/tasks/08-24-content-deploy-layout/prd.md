# 修复 content 目录与 Firefly 部署结构

## Goal

让 Firefly 同时满足两个启动场景：clone 后使用仓库内可提交的 demo 内容快速启动；日常开发和发布时通过一个目录参数直接使用完整的 `blog/` Markdown 工作区。修复当前外部 blog 因文章 front matter 不兼容而无法构建的问题，并把服务器目录整理为内容、当前发布、历史发布和插件运行时各自清晰的边界。

## Confirmed Facts

- 当前仓库的 `content` 是软链接，目标为外部完整 blog 根目录；用户已明确要求改为普通 demo 目录，不再保留该软链接。
- `sam` 和 `apps/site/scripts/materialize-content.mjs` 当前把 `FIREFLY_CONTENT_ROOT` 解释为 `blog/posts` 目录；`apps/site/src/content.config.ts` 的 pages collection 仍固定读取仓库内 `content/pages`。
- 当前外部 blog 的 120 篇文章中，47 篇携带旧内容系统用于记录来源的 `source` 字段，另有 1 篇的 `slug` 含空格；9 个页面中有 1 个携带 `source` 字段。现有严格 schema 会拒绝这些 front matter。
- `content` 目标目前只包含 Markdown 文件；外部 blog 的结构包含 `posts/` 与 `pages/`。
- `content/` 当前被 `.gitignore` 忽略，因此 demo 内容若要随 clone 可用，必须调整忽略规则并纳入版本控制。
- `tooling/sync-server/sync-server.sh` 当前只同步静态 `dist/` 到 `<deploy-root>/releases/`，不会同步 Markdown 工作区。
- 远端当前 `<deploy-root>/current` 是指向 `releases/` 的软链接，历史 releases 已存在；`<deploy-root>/blog` 尚不存在。
- 远端当前仍存在顶层 `<deploy-root>/comments-runtime/`，其中已有 `config/plugins/comments/`、Compose 文件和受保护 secrets；旧的 `config/site.toml` 与 `config/secrets.env` 也仍在，形成遗留配置边界。
- 远端 comments 服务已使用 SQLite：`core.db`、WAL/SHM、outbox 和 outbox state 位于 `<comments-data-root>`；容器通过 bind mount 使用该目录，当前服务健康。
- 仓库已经定义了 core SQLite、插件 storage catalog、`plugins/<plugin-id>/<relative-path>` 和 backup/restore 约束；MariaDB/MySQL 目前只是未来 dialect 边界，当前运行时实际只支持 SQLite。
- `config/site.toml` 是 owner-local 的静态构建输入；`tooling/sync-server` 在本地构建后只上传已组装的 `dist/`，不会把该源文件单独放入 production。当前远端 `comments-runtime/config/site.toml` 不在显式 `COMMENTS_CONFIG_PATH` Compose 读取链路中，属于遗留文件。

## Requirements

### R1. Blog workspace input

- `FIREFLY_CONTENT_ROOT` 表示一个 blog 根目录，而不是只表示 `posts/`；该目录包含 `posts/` 和 `pages/` 子目录。
- 未设置参数时使用仓库内 `content/`；开发、检查、构建和发布命令都使用同一套 root 语义。
- 外部 blog 以只读方式接入，构建产物中只出现内容文件和解析后的公开文档，不泄露宿主绝对路径、软链接或私有/草稿文档。
- 保留现有对不安全路径、损坏/循环软链接、特殊文件和 race 的拒绝与普通文件 materialize 约束。

### R2. Clone-ready demo content

- 删除仓库内 `content` 软链接，创建普通目录 `content/posts/` 和 `content/pages/`。
- demo 至少包含一个可公开访问的 page、一个可公开访问的 post，以及现有 draft/private 访问控制 fixture；所有 demo front matter 必须通过 schema 和静态构建。
- demo 不包含外部 blog 的私有文章、宿主路径、批量文章内容或软链接。
- README、配置说明、测试 fixture 与实际默认路径一致；fresh clone 在恢复 owner-local 配置后可按现有 `./sam` 流程启动/构建。

### R3. Article metadata compatibility

- 外部 blog 中已有的 `source` provenance 字段不得再被当作未知字段导致整站构建失败；该字段必须有明确的安全边界，且不作为公开路由或页面内容输出。它属于旧内容迁移字段，不是新文章必填项。
- 现有含空格的文章 slug 必须得到确定、稳定、无歧义的 canonical route；兼容层把连续空白规范化为 `-`，不能生成含未编码空格的 href，也不能放宽路径安全检查到可注入路径。
- 旧 Markdown 文件名即使含空格，也保留为物理 source identity；新文章文件名仍按无空格 safe-slug 规范创建，canonical route 只使用规范化后的 slug。
- 外部 workspace 中的零字节 `.md` 占位文件不视为文章，构建时跳过；非空文件仍必须通过完整 metadata schema。
- 其他未知、危险或结构错误的 front matter 仍需失败，并保留可定位的文章路径与字段错误。

### R7. New article authoring contract

- 新文章使用 `posts/<category>/<safe-slug>.md`；页面使用 `pages/<safe-slug>.md`。路径和 slug 使用 NFC，不含空格、`/`、反斜杠、`?`、`#`、`%`、控制字符、点段或隐藏段；推荐小写 ASCII kebab-case，并保持文件名 stem 与显式 `slug` 一致。
- 新 post 至少包含 `title`、`description`、`date`、`draft`、`layout: post`；新 page 至少包含 `title`、`description`、`date`、`draft`、`layout: page`、`slug`。`updated` 不得早于 `date`。
- 新文章默认不写 `source`；若保留迁移来源，只能使用 schema 规定的安全相对 Markdown 引用和可选 fragment。
- `./sam` 的 site build 是文章规范门禁；不符合字段、路径、日期、slug 或 access 约束的文章应在构建阶段以文件和字段定位失败。

### R4. Production content and release layout

- `<deploy-root>/blog/` 只保存与本地 blog root 对应的 Markdown 工作区，不混入静态 HTML、构建产物、运行时 secrets 或宿主路径。
- `<deploy-root>/current` 必须继续是正式发布入口，并原子指向 `<deploy-root>/releases/<release-id>/`。
- `releases/` 保留正常迭代和旧版本回滚能力；发布失败不得改变已有 `current`。
- `tooling/sync-server` 的验证、上传和文档必须同时覆盖 Markdown blog 与静态 release，且不能把 demo 内容误同步到生产完整 blog。

### R5. Comments plugin runtime layout

- comments 运行时目录应表现为插件目录，而不是顶层 `comments-runtime` 特例；建议迁移为 `<deploy-root>/plugins/comments/`。
- Compose、comments plugin config 和 owner-only secrets 应归属于该目录；持久化数据也跟随 plugin，但放在独立的 `<deploy-root>/plugins/comments/data/` 子目录，不与 Compose/config/secrets 混放。
- 数据使用现有 SQLite 设计：`data/core.db` 保存 core/comments 与 storage catalog，`data/plugins/<plugin-id>/...` 保存各插件独立数据库，outbox/state 也位于 data 根目录；不在本任务引入 MariaDB/MySQL。
- `plugins/comments/data/` 必须是 owner-only 可写目录，不属于 `current`、`releases`、`blog`，也不能被静态 Nginx root 暴露。
- 迁移必须保留旧配置和数据的可回滚路径，不读取、打印或覆盖真实 secrets；清理遗留 `config/site.toml` / `config/secrets.env` 前必须确认新 Compose 不再引用它们。

### R6. Site configuration placement

- 本地 `config/site.toml` 继续作为构建输入，默认不纳入 Git；其值在本地 build 时嵌入静态 publication。
- production 的 `current` / `releases/<release-id>/` 只保存构建结果，不额外保存原始 `site.toml`。
- production comments plugin 只读取 `<deploy-root>/plugins/comments/config.toml` 与 `<deploy-root>/plugins/comments/secrets.env`；不再复制或依赖 `<deploy-root>/comments-runtime/config/site.toml`。
- `site.toml` 中的 `[plugins.comments]` 只负责静态站点构建期的插件 activation/public projection；runtime 的非秘密配置以 plugin config 为准，部署前由本地验证检查两者一致性所需的公开边界。

## Acceptance Criteria

- [x] `content` 是普通目录而非软链接，demo 文件被 Git 跟踪，且 demo 的 page/post/draft/private fixture 结构完整。
- [x] 未设置 `FIREFLY_CONTENT_ROOT` 时，`./sam` 相关 site 命令从 `content/` 构建成功；设置为外部 blog 根目录时，posts 和 pages 都从该目录读取。
- [x] 对当前外部 blog 的 metadata audit 不再出现 `source` 未知字段错误或含空格 slug 的非法 route；危险未知字段测试仍失败。
- [x] 文档给出新 post/page 的 front matter 模板和路径规则；新增含空格、危险字符、未知字段或错误日期的文章会被构建门禁拒绝或规范化到明确 canonical route。
- [x] 内容物化结果只含普通 Markdown 文件，构建/静态输出不含外部绝对路径、软链接目标、draft 或 private sentinel。
- [x] `tooling/sync-server` 在验证后能把完整 blog 同步到 `<deploy-root>/blog/`，并把 assembled publication 发布到新的 `releases/<release-id>/` 后原子切换 `current`；失败时 current 保持原目标。
- [x] 远端最终目录满足 `<deploy-root>/blog/`、`current -> releases/...`、`releases/`、`plugins/comments/{compose,config,secrets,data}` 的边界；SQLite 数据、comments 健康检查、配置路径和数据路径保持可用。
- [x] production 不再依赖独立的 `site.toml` 源文件；静态站点配置来自 release 内嵌结果，comments 服务来自 plugin config；旧 `comments-runtime/config/site.toml` 经引用确认后可安全清理。
- [x] 相关 shell、TypeScript/JavaScript、内容 schema、构建和部署文档检查通过；无法执行的 Docker/远端门禁必须记录精确原因，不得宣称已验证。

## Validation evidence

- 默认 demo 与外部 blog 均完成 materialize、静态构建和 assembled publication 构建；`./sam npm run check:m4` 与 `./sam npm run test:m4` 通过。
- 外部 blog 已验证为 120 个非空 post、9 个 page，另有 1 个零字节占位 Markdown 被镜像但不参与构建；生产 blog manifest 与本地一致。
- 生产已切换到新的 release，`current` 保持原子 release 入口；comments 已迁移至 plugin-local SQLite data，健康检查和 SQLite integrity check 通过。
- Docker Compose 配置、shell 语法和 `git diff --check` 通过；生产同步失败回滚路径由脚本保留并在 staging 逻辑中验证。

## Decisions

- 已确认采用插件本地 SQLite 数据布局：`<deploy-root>/plugins/comments/` 放 Compose、plugin config 和 secrets，`<deploy-root>/plugins/comments/data/` 放 `core.db`、WAL/SHM、outbox/state 与 `plugins/<plugin-id>/` 数据；现有 `<comments-data-root>` 数据需在停服、备份和完整性校验后迁移。
- 已确认 `site.toml` 不作为 production runtime 文件部署：它只在本地构建阶段使用，静态结果进入 release；comments runtime 使用 plugin-owned config。
- 已确认兼容边界：`source` 仅作为受限的旧内容 provenance 字段接受；slug 空白仅做确定性 `-` 规范化，新文章按无空格 safe-slug 规范创建，不依赖兼容层。
