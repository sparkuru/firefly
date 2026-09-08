# Research: no-meta-frontmatter-design

- Query: 在当前 Astro content schema/materializer 约束下支持非空 Markdown 的缺失/空 front matter，并设计只覆盖 YAML 解析和写入边界的博客 metadata 整理 CLI。
- Scope: mixed（仓库代码、测试、Trellis 规格、任务历史、Astro/YAML 官方文档）
- Date: 2026-09-08

## Findings

### 1. Materializer fallback

#### 关键文件

- `apps/site/src/content.config.ts:5-21`：`posts`/`pages` 用 Astro `glob` loader 读取 `.generated-content`，分别绑定 `postSchema`/`pageSchema`。
- `apps/site/src/lib/content-schema.mjs:5-9,71-115`：`title`、`description`、`date`、`draft` 等文本/日期字段当前是必需的；页面还要求 `slug`，默认值仅覆盖部分 presentation/access 等字段。
- `apps/site/scripts/materialize-content.mjs:203-225`：只接受非空 `.md`，执行路径安全、virtual path 和 collision 检查；零字节 `.md` 当前忽略。
- `apps/site/scripts/materialize-content.mjs:274-323`：统一读取 source、检查 device/inode、复制到 stage，并执行既有 legacy `#`→`##` 标题兼容变换。
- `apps/site/scripts/materialize-content.mjs:325-362`：candidate stage 原子提升、备份和 rollback。
- `.trellis/spec/frontend/content-workspace-contract.md:207-230`：materializer 是 publication authority，stage 是 Astro 输入；普通工作区只发布非空 Markdown，stage 允许既有 legacy body normalization。
- `.trellis/spec/frontend/x-core-contract.md:43-61,103-142`：X Core 使用 guest document context，要求合法 collection/slug/layout/presentation 和完整 metadata/heading contract。
- `apps/site/src/lib/x-core-context.ts:28-58,60-108`：当前 resolver 从 `data.astro.frontmatter` 读取 layout，再结合 staged path 推导 collection/slug/route；无 front matter 时不能仅靠现有 resolver 得到 layout。
- `apps/site/src/lib/content.ts:85-117,155-222`：canonical model 已以 physical relative path/filename 作为目录和 post route 的基础；post 可用 filename stem 作为缺省 route，page 仍需要 slug。
- `apps/site/src/components/ContentDirectoryIndex.astro:29-38`：目录链接使用 physical `child.name`，并显示 `entry.data.title`；当前没有独立 filename-label fallback helper。
- `apps/site/tests/content-materializer.test.mjs:22-67,108-160`：覆盖复制、标题兼容、零字节忽略、unsafe/collision、atomic rollback，但没有 body-only/empty-frontmatter 正向 case。
- `apps/site/tests/content-schema.test.mjs:35-56,188-225`：覆盖有效 schema、默认值、未知字段 rejection 和真实内容约束。
- `apps/site/tests/x-core-context.test.mjs:7-52`、`x-core-integration.test.mjs:15-41,58-110`：覆盖 staged context 和真实 Markdown processor，但输入均有完整 metadata。

#### 结论

推荐在 materializer 的 copy/normalize 边界注入 stage-only 的完整默认 front matter，而不是把 schema 和下游 model 全部改成 optional。

理由是当前 Astro loader 对无 front matter 的 Markdown 本身可解析，但 schema parse 会失败；缺失 metadata 后，X Core resolver、页面/终端组件和 static projection 也都把 title/date/description 当作确定值。materializer 已经是 source→stage 的唯一发布边界，且已有正文兼容变换，把 fallback 放在这里可让 Astro、X Core 和各 presentation 接收到同一个稳定数据形状。

建议的最小规则：

1. 仅自动处理两类输入：没有 front matter，或 `---` 包住的空 YAML map。部分 front matter、malformed YAML、scalar/array root、unknown key 继续报错，由 CLI 显式整理，避免把 typo 静默改成另一份文档。
2. 对 post 注入合法的 `layout`、`title`、`description`、`date`、`draft`、`access`、`presentation`；对 page 另外注入由安全 filename stem 推导的 `slug`。已有合法字段保持不变。
3. `title` 的 fallback 可从 physical filename stem 派生；建议只移除扩展名和明确约定的开头 `index-` 排序前缀。物理 filename、relativePath、virtualPath、href 和 route 不得因显示 fallback 改变。`index-foo.md` 可以显示 `foo`，但仍链接和路由到 `index-foo`。
4. fallback date 不能每次 build 使用当前日期，也不应未经约定使用 mtime，否则相同 source 会产生非确定 stage。应选固定配置值或明确的项目级 default date。
5. `draft` 是必须先定下来的产品策略：`draft:false` 才能让文档进入 guest listing/read path；`draft:true` 更安全但会被 `apps/site/src/lib/content-access.mjs:3-16` 过滤，不能同时声称“公开可读”。不建议直接复用 `tooling/format-content.sh:457-495` 的编辑器默认。
6. 不把规范化写回 source。materializer 的输出即使有 fallback，也应保持现有 atomic candidate/rollback 和不泄漏 host path 的约束。

### 2. 为什么不采用全链路 optional schema/model 作为本任务方案

全链路 optional 化并不是只改 `content-schema.mjs`：

- `x-core-context.ts` 需要从 staged collection path 推断 collection/layout，再补 slug；现有 layout-from-frontmatter 规则要重写。
- `content.ts`、`ContentDirectoryIndex.astro`、阅读组件、终端 VFS 和静态输出都要定义自己的缺省 title/date/description 语义；若不集中到一个 canonical projection，会产生不同页面不同标签。
- X Core processor 仍要求合法 context/heading/metadata；schema optional 不会自动让 processor 或 date formatting 安全。
- optional 输入会削弱现有 unknown-key/required-metadata 合同，测试和错误边界都需重写。

因此本任务只建议“materializer 规范化，保留严格 schema”。如果将来必须保留 source/stage 中的缺失 metadata，应另起任务设计统一 normalized canonical metadata，而不是只把 Zod 字段改为 optional。

### 3. Materializer fallback 的验证范围

至少补充以下测试：

- body-only post：stage 生成完整 metadata，`postSchema` 通过，route 仍由 physical path/stem 决定。
- body-only page：stage 生成安全 `slug`，`pageSchema` 和 page route 通过。
- `---\n---\nbody` 与无 front matter 等价；不重复 delimiter。
- 空白 delimiter、BOM、CRLF 的行为固定，并能被 Astro 当前 YAML parser 重新读取。
- 合法已有 front matter 保持语义；正文只发生当前既有 heading normalization，不发生额外 body mutation。
- 部分 front matter、malformed YAML、scalar/array root、unknown key 失败且 candidate 不提升。
- 零字节文件继续忽略；unsafe path、hidden path、symlink、collision、source race、rollback 继续通过。
- x-core integration 使用生成 stage 实际 render，确认 post/page context、route、presentation、heading/metadata contract。
- 目录 label 测试 metadata title 优先、缺失时 filename stem fallback；`index-foo.md` 的 label 可为 `foo`，但 href/filename/route 不变。
- 使用与 site 输出同文件系统的 `apps/site/test-results/` fixture 跑真实 build，并检查静态产物无 source root/host path 泄漏。

### 4. Node YAML front-matter CLI：边界设计

#### 归属和基本写入模式

建议放在 `apps/site/scripts/organize-content.mjs`，由 `apps/site/package.json` 增加显式 script。现有 CLI 风格可参考 `tooling/validate-experiments/src/cli.ts:1-38` 和 `tooling/assemble-publication/src/cli.ts:1-57`：明确 flags、错误写 stderr、非零退出、`--help` 不修改文件。

必须默认另存为，只有 `--write`/`--in-place` 才允许写回 source。默认目标已存在时拒绝覆盖；如增加 `--force`，也必须显式指定。source 和 destination 相同但未给 `--write` 时应报错，而不是隐式覆盖。

#### 输入检测和 YAML 解析

1. 用 `lstat` 拒绝 symlink 输入，确认普通 `.md` 文件；以 `Buffer` 读取，单独保存 front matter 区段和正文区段。
2. 只把文件首部第一个 `---` delimiter 到 closing `---` 视为 front matter。没有 delimiter 时 metadata 是空 map，正文是整个原文件；空 delimiter 得到空 map。是否接受 BOM、CRLF 要固定并测试。
3. 推荐使用 `yaml@2` 的 `parseDocument`，检查 parser errors、multiple documents、非 map root、duplicate key/alias 等风险，再通过现有 schema/共享校验。不要只做 `JSON.parse` 式宽松对象合并。
4. 保留未覆盖的既有字段；未知字段不得静默删除。当前 `content-schema.mjs` 和 `content-schema.test.mjs:188-193` 将 unknown key 视为错误，CLI 应失败且不产生目标文件。
5. 输出只重写 front matter 区段，并把原正文 Buffer 原样追加；正文 byte hash 必须保持不变，包括 H1、代码围栏、空行、CRLF、链接、Unicode 和尾部换行。materializer 后续已有的 legacy heading demotion 是另一层有意的 stage 变换，不能混同为 CLI 的“正文保持”。
6. 使用同目录临时文件、保留 mode、关闭并 rename 的原子写入；写回前可重新 `lstat`/校验 inode，避免 source 在读取期间被替换。另存为使用 exclusive/no-clobber。

#### root、collection、category 路径约束

- root 优先级建议为显式 `--root`、`FIREFLY_CONTENT_ROOT`、仓库默认 `content`；root 必须包含受支持的 `posts/`、`pages/`。
- source 在 root 内时从 `root/posts/...` 或 `root/pages/...` 推断 collection，并保留现有相对 category/filename；source 在 root 外时要求显式 `--collection posts|pages`，不要依赖 cwd 猜测。
- `posts` 允许 nested category，但每段复用 materializer 的 safe segment、NFC、traversal、hidden/collision 规则；`pages` 按当前约定扁平化，传 `--category` 应拒绝。
- root 外的 posts 建议要求显式 `--category`（或在帮助中固定一个默认分类）；pages 目标为 `root/pages/<safe-slug>.md`。所有候选目标必须通过 `path.relative(root, target)` containment 检查。
- `--output` 也不能绕过 root；禁止 `..`、绝对路径注入、source root 泄漏、隐藏 segment 和 symlink parent。目标已存在默认失败。
- 页面必须写出安全 slug；post 可以不写 slug、让 canonical route 采用 physical stem，但显式 `--slug` 必须复用 `canonical-route.mjs` 的 unsafe segment 规则。

#### CLI 默认 metadata 和 materializer 的区分

CLI 可采用现有 `tooling/format-content.sh:51-76,199-285` 的编辑器语义：title 从首个非 fenced H1 或 filename stem 推断，页面 slug 从 filename 推断，date 可取用户执行时的 UTC date，新增文档默认 `draft:true`，并只在字段缺失时填充。它是用户显式运行的整理操作。

materializer 则是每次 build 的发布 transform，必须 deterministic；不能直接复用 CLI 的“今天”和 `draft:true`，否则 build 会随日期变化且可能把文档排除出公开列表。两者共用解析/安全路径 helper 可以，共用公开性和时间默认值不应未经决策直接复用。

### 5. 是否显式添加 `yaml`

当前 `apps/site/package.json` 没有直接声明 `yaml` 或 `js-yaml`。安装树中虽然存在 `yaml@2.9.0`（经 `@astrojs/check`/Vite 传递）和 `js-yaml@4.3.1`（经 Astro/Markdown integration 传递），但传递依赖不是 CLI 的稳定运行契约。

建议：如果实现采用 `parseDocument`，在 `apps/site` 的 runtime `dependencies` 显式添加当前兼容的 `yaml` 版本并更新 lockfile。`yaml` 的 Document API 适合有限修改、保留注释/字段结构；正文仍由 Buffer 单独保护。若优先与 Astro 当前 parser 完全同源，也可以显式添加 `js-yaml@4.3.1`，但不能省略直接依赖声明。两者都应做“CLI 输出 → Astro frontmatter parser → schema”互操作测试。

## Suggested validation commands

由实现/检查阶段运行：

```sh
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build
./sam npm --prefix apps/site run blog:meta -- --help
./sam node --test apps/site/tests/blog-meta-cli.test.mjs
git diff --check
```

CLI fixture 建议放任务临时目录；真实 Astro build fixture 放 `apps/site/test-results/`，遵守 `.trellis/spec/frontend/development-runtime.md:140-145` 的同文件系统约束。若 `test:content` 当前是固定文件列表，新增 CLI 测试后需更新 script 或单独用 `./sam node --test` 执行。

## External references

- Astro Content Collections：<https://docs.astro.build/en/guides/content-collections/>；用于确认 `glob` loader 的 `pattern`/`base`、schema validation 和 `render` 边界。
- YAML 官方文档：<https://eemeli.org/yaml/>；用于 `yaml@2` 的 `parseDocument`/Document 序列化能力。
- js-yaml 官方仓库/用法：<https://github.com/nodeca/js-yaml/>；用于 `load`/`dump` 语义和与 Astro 当前传递 parser 的比较。

## Related specs and task history

- `.trellis/spec/frontend/content-workspace-contract.md`：materializer publication authority、非空 Markdown、atomic stage、正文兼容变换和 canonical path 约束。
- `.trellis/spec/frontend/x-core-contract.md`：完整 context/metadata/heading contract；说明 fallback 不能只停在 schema 层。
- `.trellis/spec/frontend/development-runtime.md`：`./sam` 验证边界和同文件系统 build fixture。
- `.trellis/spec/guides/cross-layer-thinking-guide.md`：source → transform → store → retrieve → display 与 null/empty/invalid/roundtrip 测试要求。
- `.trellis/tasks/archive/2026-08/08-25-external-content-validation-data-independent/design.md`：现有 formatter 的 front-matter-only、默认不写回和正文保持边界。
- `.trellis/tasks/09-08-blog-meta-and-editor/prd.md`、`task.json`、`implement.jsonl`、`check.jsonl`：当前任务目标和工作流记录。

## Caveats / Not Found

- 未找到现成 Node organizer CLI；当前只有 `tooling/format-content.sh`，它不能替代 YAML/schema/build/render 验证。
- 未找到已有 `index-*.md` fixture 或 display-label helper；`index-` 去除规则仍需在实现中固定。
- 具体 synthetic date 和 draft policy 尚未由产品材料确定：固定 date/`draft:false` 满足可读性和 deterministic build，可能增加误发布风险；`draft:true` 更安全但不会进入 guest listing。
- 本研究未修改产品文件、lockfile 或 spec，也未执行完整 build/e2e；上述命令是后续验证清单。
