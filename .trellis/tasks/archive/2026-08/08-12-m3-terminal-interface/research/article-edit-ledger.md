# Article edit ledger — `llm-workflow-with-trellis`

## Provenance and scope

- Authorized source: `/home/wkyuu/cargo/repo/04-flyMe2theStar/03-genshin/online/41-llm-workflow-with-trellis.md`.
- Destination: `content/posts/llm-workflow-with-trellis.md`.
- Source repository access remained read-only.
- Original date: `2026-05-28`; updated date: `2026-07-03`.
- Editorial mode: preservation-first. The source has a recognizable author
  voice, so edits were limited to schema normalization, Markdown correctness,
  the known typo, and workflow facts verified against this repository's current
  task, hooks, scripts, and workflow documents.

## Mechanical normalization

| Source | Replacement | Reason |
| --- | --- | --- |
| Body H1 `# llm workflow with trellis` | Strict front matter `title` plus required slug, dates, description, tags, draft, layout, and `presentation: terminal` | The content schema owns the route H1 and metadata. |
| Bare `https://github.com/mindfold-ai/Trellis.git` | `[Trellis repository](https://github.com/mindfold-ai/Trellis.git)` | Make the public source dependency an explicit Markdown link. |
| `trellis-spec-bootstarp` and its typo annotation | `trellis-spec-bootstrap` | Correct the known skill-name typo. |
| Blockquote line containing only `> ` | `>` | Normalize Markdown whitespace without changing prose. |

## Evidence-backed factual edits

| Source wording | Replacement | Reason |
| --- | --- | --- |
| `四块基础设施（都落在 .trellis/ 目录，进仓库版本管理）` | `四块基础设施（主要落在 .trellis/ 目录，其中项目共享知识进仓库版本管理，开发者身份和运行时状态留在本地）` | `.trellis/.developer` and runtime/session state are local, while task/spec knowledge is versioned. |
| Breadcrumb statement made all three statuses correspond to injected workflow-state text | planning/in-progress are described as injected states; completed is described as archive state | Current workflow injection is active for planning/in-progress, while completed records task completion. |
| Plan summary ended at `prd.md` | Added `design.md + implement.md` for complex tasks | This approved M3 task requires both artifacts before implementation. |
| `主要流程详细表达如下` | Added one dated scope sentence: the article describes default sub-agent mode and inline mode may execute the same steps directly | Current Trellis supports both execution modes; this preserves the article's default-mode argument. |
| Mermaid planning only filled PRD and confirmed PRD | Added complex-task `design.md` / `implement.md` and confirmation | Verified by this task's start gate and current workflow. |
| Mermaid implement/check language stated delegation without scope | Added `默认模式` and clarified injected JSONL specs + PRD + task design/plan | Avoid claiming delegation is universal while retaining the default sub-agent explanation. |
| Mermaid `3.1 最终验证 / PM 本地查看 demo` | `最后一轮 2.2 全量检查 / 按任务做人工 review` | Current workflow has no separate Phase 3.1 step; human review is task-specific. |
| Mermaid final artifacts omitted design/implement | Added both artifacts and renumbered output nodes | Complex-task artifacts are durable deliverables. |
| `主 agent 默认不直接写代码...主线程拿不到` | Scoped to default sub-agent mode and listed actual injected inputs | Inline mode exists; sub-agent context includes curated specs and task documents rather than an absolute main-thread incapability. |
| Unqualified directory tree | Added `文章写作时的 Claude 平台快照` | The tree is useful provenance but is not the current cross-platform shape. |
| `workflow.md # 4 阶段循环` | `3 阶段循环：Plan → Execute → Finish` | Matches the article's retained three-phase framing and current workflow. |
| PM example used obsolete `B 类·实现任务` | Removed the category label | Current task routing no longer uses that label. |
| Task creation always wrote a session pointer; PRD was an empty template | Made pointer conditional on initialized session and called PRD a default skeleton | Current task/session behavior is conditional and the PRD seed is structured. |
| Brainstorm and completion gates only mentioned PRD | Added design/implement plus both real JSONL manifests for complex tasks | Verified by this task's approved start gate. |
| Example spec path `.trellis/spec/frontend/ui/index.md` | `.trellis/spec/frontend/index.md` | The former path does not exist; the latter is the current frontend index. |
| Research, implementation, checking, and prompt injection claims were unconditional | Added `在默认的 sub-agent 模式下` and enumerated task-specific design/plan context | Preserves the default workflow while acknowledging inline execution. |
| `### 3.1 最终验证` and PM demo claim | `最后一轮 2.2 全量检查` and task-specific review gate | Aligns the worked example with current phase numbering and human review policy. |
| Change trace only mentioned PRD and unconditional sub-agents | Added design/implement by complexity and default-mode qualifiers | Matches the current durable-artifact and execution contracts. |
| Closing `人只做四件事...其余...全由工作流自动完成` | People own intent, task documents, commit plan, and targeted residual review; workflow assists with remaining mechanics | Avoids an obsolete absolute automation claim while preserving the author's conclusion. |

## Deliberately retained

- The first-person blockquote, mixed Chinese/English diction, terse `install`
  and `usage` headings, and opinionated conclusion remain unchanged in voice.
- The three-phase framing and design-philosophy list remain intact.
- The Mermaid fence remains inert readable source; no Mermaid runtime was added.
- Concrete `pm-alice`, `unitree-g1-tests`, demo, retention, and onboarding
  examples remain because they are authored examples, not private data.
- Finish-work archive/journal statements remain because current repository
  evidence supports them broadly.

## Post-edit voice check

Only changed prose was inspected. No promotional language, invented scene,
new metaphor, slogan, artificial three-part cadence, or generic future-facing
conclusion was introduced. The edits use the article's existing vocabulary and
sentence rhythm where possible.
