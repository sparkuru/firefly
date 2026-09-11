# 支持 Ctrl+L 映射 clear 与 grep 上下文参数

## Goal

让 Terminal 首页具备熟悉的 shell 清屏快捷键，并让 `grep` 能查看匹配行前后有限范围的上下文，提升长文档和管道输出的可读性。

## Background and confirmed facts

- 终端输入控制器已在 `apps/site/src/scripts/terminal-home.ts:1212-1224` 拦截未修饰的 `Ctrl+L`，清空当前 transcript、草稿和补全状态，并将焦点留在输入框。
- `clear` 命令及 `cls` 别名已在 `presentations/terminal/src/commands/session.ts:240-283` 实现；浏览器端已有 `apps/site/tests/terminal.spec.ts:995-1018` 和 `1057-1071` 的 Ctrl+L 回归覆盖。因此第一项当前行为已满足，本 task 只需保留回归保证。
- `grep` 当前只支持 `-i/-n/-F/-w/-E` 及对应长选项，定义于 `presentations/terminal/src/commands/grep.ts:526-538`；匹配结果模型只有匹配行（`presentations/terminal/src/shell/contracts.ts:68-80`），站点渲染也只展示这些行（`apps/site/src/scripts/terminal-home.ts:489-501`）。
- `grep` 同时支持 stdin、公共文档和受限 scratch 资源，并有资源数、扫描行数、输出行数和文本大小限制（`presentations/terminal/src/commands/grep.ts:470-523`）；上下文实现必须继续遵守这些边界。
- 现有单元测试位于 `presentations/terminal/tests/neutral-shell.test.ts` 与 `presentations/terminal/tests/terminal.test.ts`，浏览器级 Terminal 测试位于 `apps/site/tests/terminal.spec.ts`。

## Requirements

### R1. Ctrl+L 清屏回归

保持未组合的 `Ctrl+L` 等价于执行 `clear` 的用户可见效果：清空 transcript、输入草稿和补全面板，保留 shell 状态与命令历史，并将焦点恢复到命令输入框。组合键（Alt/Meta/Shift）和输入法组合期间不应误触发该快捷键。

### R2. grep 上下文选项

为 `grep` 增加 `-A <NUM>`、`-B <NUM>`、`-C <NUM>`，以及对应的 `--after-context`、`--before-context`、`--context` 长选项，以请求匹配行之后、之前或前后指定数量的上下文行。参数应经过有界、可诊断的校验，并可与现有匹配选项及 stdin/命名资源输入协同工作。

上下文行需要在结构化 grep 结果、纯文本管道输出和 Terminal 展示中保持可区分且顺序稳定；匹配行仍保留高亮范围，未匹配的上下文行不应伪装成匹配。连续或重叠的上下文范围应合并，避免重复输出。

已确认采用 GNU grep 风格：

- `NUM` 是非负十进制整数；实现使用有界上限，拒绝负数、非数字、缺少值和超限值。
- `-C NUM` 同时提供前后文；若同时指定 `-A` 或 `-B`，显式的对应方向值覆盖 `-C` 的该方向，另一方向仍取 `-C` 的值。重复指定同一选项时沿用现有 argv parser 的最后值。
- 匹配行使用 `:` 分隔位置与内容，上下文行使用 `-`；不同的非连续上下文块之间输出单独的 `--` 行。无 `-n` 时保留现有无行号输出形式；结构化 Terminal 行额外携带上下文和块分隔标记，以便 UI 区分。
- `grep` 的摘要统计匹配行，不把上下文行计入 match 数；`noResults` 只表示没有匹配行。现有资源、扫描、输出行数和文本大小上限继续生效。

## Acceptance Criteria

- [x] 未组合的 `Ctrl+L` 清空 Terminal transcript 和当前输入状态，保留历史，并有现有浏览器回归测试覆盖。
- [x] `grep -A NUM pattern` 输出每个匹配行及其后最多 `NUM` 行上下文。
- [x] `grep -B NUM pattern` 输出每个匹配行及其前最多 `NUM` 行上下文。
- [x] `grep -C NUM pattern` 同时输出匹配行前后最多 `NUM` 行上下文；`-C` 与显式 `-A/-B` 的覆盖规则明确并有测试。
- [x] 上下文结果在单文件、多文件、stdin、重叠匹配和边界（文件首尾、连续匹配）场景下不重复、不乱序，并遵守既有输出上限。
- [x] `grep --help`、命令 usage、类型模型、文本输出和站点渲染准确反映上下文结果。
- [x] `presentations/terminal` 类型检查与测试通过，相关站点 Terminal 测试通过。

## Out of scope

- 不改变已有 `Ctrl+L`、`clear`、`cls` 的用户语义，不新增全局快捷键配置系统。
- 不实现 GNU grep 的其他未请求功能（例如 `-v`、`-e`、文件名头部控制或 `-NUM` 的快捷语法）。
- 不改变公共文档过滤、虚拟文件系统边界、命令替换或管道的既有安全策略。
