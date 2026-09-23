---
title: Mermaid diagrams
slug: mermaid-diagrams
date: 2026-09-23
description: Static diagrams, accessible source and safe fallback examples.
draft: false
layout: page
---

## Workflow diagram

This synthetic diagram exercises Chinese and multiline labels.

```mermaid
flowchart TD
  accTitle: Publishing workflow / 发布流程
  A[撰写文章] --> B["检查内容<br/>Review content"]
  B --> C{通过检查?}
  C -->|是| D[Publish]
  C -->|否| A
```

## Sequence diagram

```mermaid
sequenceDiagram
  accTitle: Local publication sequence
  participant Author
  participant Builder
  Author->>Builder: Build documents
  Builder-->>Author: Static HTML and SVG
```

## Invalid diagram

Invalid syntax remains readable and does not prevent other documents from building.

```mermaid
flowchart TD
  A[Unclosed
```

## Unsupported resource

External resources are not fetched.

```mermaid
flowchart TD
  A --> B
  click A "https://example.invalid/"
```
