# Allow unresolved local references with warnings

## Goal

让文章中的占位链接、尚未迁移的本地图片和其他缺失本地资源不再阻断静态发布；发布时仍输出清晰警告，方便后续清理死链。

## Background and confirmed facts

- `tooling/assemble-publication/src/index.ts` 的 `validateTextAndReferences()` 会扫描最终 release 中的 HTML、SVG 和 CSS 引用。
- 当本地引用没有对应的 emitted file 时，当前逻辑在 `validateTextAndReferences()` 中抛出 `does not resolve to an emitted file`，导致 `validateRelease()` 和整个 `assemblePublication()` 失败。
- 发布装配采用候选目录和回滚式 promotion；因此该错误会保留旧 release，但也阻止所有包含占位引用的版本上线。
- 引用越界、跨 Experiment mount、协议相对地址、非法编码、反斜杠或 NUL、私有/凭据内容、符号链接和必需文件缺失属于独立的安全或完整性校验，不应因本需求被放宽。

## Requirements

### R1. 缺失本地目标只产生警告

当引用经过现有安全和 mount 边界校验，但没有对应的 emitted file 时，发布器必须输出 warning，至少包含来源文件和原始引用；不得抛出阻断发布的异常。

### R2. 警告不改变发布结果

存在一个或多个缺失本地引用时，`validateRelease()` 和 `assemblePublication()` 仍应成功返回并 promotion 候选 release；最终发布文件内容不因警告被自动改写。

### R3. 保留安全阻断边界

以下情况仍必须失败并阻止 promotion：

- 引用解析失败、协议相对地址、反斜杠或 NUL 等不安全引用；
- 引用逃出 release 根目录或 Experiment mount；
- 禁止的私有/凭据/源路径文本；
- 符号链接、路径大小写冲突、必需入口或 manifest 声明文件缺失。

### R4. 回归覆盖

测试必须覆盖：

- 缺失图片或链接只输出 warning 且 `validateRelease()` 成功；
- 缺失引用场景下 `assemblePublication()` 成功并替换候选 release；
- 现有安全和完整性失败用例仍然失败。

## Acceptance Criteria

- [ ] 含有不存在本地目标的公开文章可以完成 publication assembly。
- [ ] 构建输出中能看到包含来源和引用的 warning。
- [ ] 缺失引用不会被静默改写、删除或转换成外链。
- [ ] 越界、非法引用、敏感内容、符号链接和必需文件缺失仍然阻断发布。
- [ ] `tooling/assemble-publication` 的检查和测试通过，现有静态发布回归不退化。

## Out of scope

- 自动修复、删除或重写缺失链接。
- 自动上传或补齐本地图片。
- 放宽路径越界、私有内容扫描、Experiment 隔离或 artifact 安全校验。
- 改变 Astro Markdown 解析规则。

## Open questions

无。warning 默认写入发布命令的 stderr/console，保持现有 CLI 调用方式不变。
