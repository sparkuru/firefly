---
title: Markdown template
slug: markdown-template
date: 2026-08-12
description: A small example page for the tracked content workspace.
draft: false
layout: page
---

## Markdown template

Write the page in Markdown and keep its front matter explicit.

## Reading layout samples

这是一段合成的中文排版样本，用来检查窄屏阅读时表格说明能否自然换行。这里不包含个人文章内容；每个单元格的说明应当保持完整并可以阅读。

| Item | Explanation | Reference | Expected result | Notes |
| --- | --- | --- | --- | --- |
| wrap | 这是一段较长的中文说明，窄屏上应该自然换行而不是迫使读者不断横向滚动。 | https://example.invalid/a-long-reference-path/with-several-segments/and-an-unbroken-identifier-abcdefghijklmnopqrstuvwxyz | Each row stays associated with its label. | Exact authored text remains available. |
| code | Inline `an_extremely_long_inline_identifier_used_to_verify_wrapping_in_cells` may wrap. | Local reference | Native table semantics | No content is deleted. |

<table>
  <thead><tr><th colspan="2">Grouped columns</th><th>Result</th></tr></thead>
  <tbody><tr><td>First</td><td>Second</td><td>Spanning cells keep their ordinary scrolling behavior.</td></tr></tbody>
</table>

<table>
  <thead><tr><th>Preformatted cell</th></tr></thead>
  <tbody><tr><td><pre><code>  first  line
    second   line</code></pre></td></tr></tbody>
</table>

```text
  exact  spacing\tstays literal
this_is_an_intentionally_long_unbroken_code_line_abcdefghijklmnopqrstuvwxyz_abcdefghijklmnopqrstuvwxyz_abcdefghijklmnopqrstuvwxyz_abcdefghijklmnopqrstuvwxyz
```
