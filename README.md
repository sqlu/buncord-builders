<div align="center">
  <img src="./assets/logo.svg" alt="@discordts/builders logo" width="260" />

  <h3>Type-safe Discord Components builders for Bun</h3>

  [![npm](https://img.shields.io/npm/v/@discordts/builders?color=FF3B92&style=flat-square)](https://npmjs.com/package/@discordts/builders)
  [![Bun](https://img.shields.io/badge/bun-%3E%3D1.1.0-orange?style=flat-square&logo=bun)](https://bun.sh)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
  [![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)
</div>

---

`@discordts/builders` gives Bun developers a clean, zero-dependency way to build Discord Components payloads. No hand-written JSON, no runtime schema libraries.

> [!NOTE]
> The logo design is inspired by discord.js.

## Why this package

| Feature | Detail |
|:--------|:-------|
| **Bun-first** | Import TypeScript source directly and no build step required |
| **Components V2** | Full coverage of layout, content, and modal types |
| **Runtime validation** | Catches Discord API limit violations before payloads are sent |
| **Type-level safety** | String lengths and structures checked via TypeScript template types |
| **Deserialization** | Rebuild any builder from an existing raw Discord payload |

## Installation

```bash
bun add @discordts/builders
```

**Requirements:** Bun ≥ 1.1.0 · TypeScript 5.x

TypeScript source files are published directly no pre-transpiled output.

## Benchmarks

This package is optimized for speed. It runs close to 0ms overhead by using direct manual loops and avoiding heavy validation schemas. 

![Benchmark Graph](./assets/benchmark.svg)

> [!TIP]
> **Performance Boost:** With over **6.8x performance** (more than 576% faster processing), `@discordts/builders` eliminates instantiation and serialization bottlenecks entirely, running close to 0ms overhead.

Below are the detailed results comparing **50,000 iterations** of component construction and serialization against `@discordjs/builders`.

*Last Benchmarked: June 19, 2026*

| Task | `@discordjs/builders` | `@discordts/builders` | Speed Comparison |
| :--- | :--- | :--- | :---: |
| **Instantiation** | ~171.7 ms | **~16.2 ms** | **10.6x faster** |
| **Serialization** | ~40.0 ms | **~15.2 ms** | **2.6x faster** |
| **Total** | ~211.8 ms | **~31.3 ms** | **6.8x faster** |

To run the benchmark yourself:
```bash
bun run benchmark:ci
```
> The SVG and README table are only regenerated automatically by CI on push. Running locally outputs results to the console only.

## Component Architecture

```mermaid
graph LR
    classDef msgRoot fill:#5865F2,color:#fff,stroke:none,font-weight:bold,rx:5px,ry:5px
    classDef modRoot fill:#FF3B92,color:#fff,stroke:none,font-weight:bold,rx:5px,ry:5px
    classDef layout fill:#2b2d2f,color:#fff,stroke:#4f545c,stroke-width:2px
    classDef content fill:#202225,color:#dcddde,stroke:#36393f,stroke-width:1px
    classDef selectGroup fill:#2f3136,color:#fff,stroke:#FF3B92,stroke-width:2px,stroke-dasharray: 5 5

    MSG([Messages]):::msgRoot --> Cont[ContainerBuilder]:::layout
    MSG --> RowMsg[ActionRowBuilder]:::layout

    Cont --> Sec[SectionBuilder]:::layout
    Cont --> RowCont[ActionRowBuilder]:::layout
    Cont --> Media[MediaGalleryBuilder]:::content
    Cont --> Sep[SeparatorBuilder]:::content
    Cont --> File[FileBuilder]:::content
    Cont --> TxtMsg[TextDisplayBuilder]:::content

    Sec --> Thumb[ThumbnailBuilder]:::content
    Sec --> BtnSec[ButtonBuilder]:::content
    Sec --> TxtSec[TextDisplayBuilder]:::content
    
    RowMsg --> BtnRowMsg[ButtonBuilder]:::content
    RowMsg --> SelMsg[[Select Menus]]:::selectGroup

    RowCont --> BtnRowCont[ButtonBuilder]:::content
    RowCont --> SelCont[[Select Menus]]:::selectGroup

    MOD([Modals]):::modRoot --> Lbl[LabelBuilder]:::layout
    MOD --> RowMod[ActionRowBuilder]:::layout
    MOD --> TxtMod[TextDisplayBuilder]:::content

    Lbl --> TxtInLbl[TextInputBuilder]:::content
    Lbl --> Rad[RadioGroupBuilder]:::content
    Lbl --> ChkGrp[CheckboxGroupBuilder]:::content
    Lbl --> Chk[CheckboxBuilder]:::content
    Lbl --> FileUp[FileUploadBuilder]:::content
    Lbl --> SelLbl[[Select Menus]]:::selectGroup

    RowMod --> TxtInRow[TextInputBuilder]:::content
    RowMod --> SelMod[[Select Menus]]:::selectGroup
```

## Discord Component Flags

Components V2 messages must be sent with the `IS_COMPONENTS_V2` message flag:

```ts
import { MessageFlags } from '@discordts/builders';
const flags = MessageFlags.IsComponentsV2;
```

When this flag is set, Discord treats components as the message body. Use `TextDisplayBuilder` and `ContainerBuilder` instead of relying on `content` or `embeds`.

## Component Coverage

| Type | ID | Available in |
|:-----|:--:|:------------|
| ActionRow | 1 | Messages · Modals |
| Button | 2 | Messages · Section accessory |
| StringSelect | 3 | Messages · Modals |
| TextInput | 4 | Modals |
| UserSelect | 5 | Messages · Modals |
| RoleSelect | 6 | Messages · Modals |
| MentionableSelect | 7 | Messages · Modals |
| ChannelSelect | 8 | Messages · Modals |
| Section | 9 | Messages |
| TextDisplay | 10 | Messages · Modals |
| Thumbnail | 11 | Messages |
| MediaGallery | 12 | Messages |
| File | 13 | Messages |
| Separator | 14 | Messages |
| Container | 17 | Messages |
| Label | 18 | Modals |
| FileUpload | 19 | Modals |
| RadioGroup | 21 | Modals |
| CheckboxGroup | 22 | Modals |
| Checkbox | 23 | Modals |

## Quick Start

See [`exemples/quick-start.ts`](./exemples/quick-start.ts) for a full runnable example.

## Examples

All runnable examples live in [`/exemples`](./exemples):

| Example | Description |
|:--------|:------------|
| [`quick-start.ts`](./exemples/quick-start.ts) | Full Components V2 message payload |
| [`smart-layout.ts`](./exemples/smart-layout.ts) | Auto-packing buttons and select menus into rows |
| [`modals.ts`](./exemples/modals.ts) | Modal with text inputs, radio groups, checkboxes, and file upload |
| [`validation.ts`](./exemples/validation.ts) | Runtime validation and `auditTree()` diagnostics |
| [`webhook.ts`](./exemples/webhook.ts) | Sending a payload to a Discord webhook |

## Smart Layout

`SmartLayoutBuilder` automatically packs buttons (up to 5 per row) and gives select menus their own dedicated rows. See [`exemples/smart-layout.ts`](./exemples/smart-layout.ts).

## Modals

Modals support `LabelBuilder`, `TextInputBuilder`, `RadioGroupBuilder`, `CheckboxGroupBuilder`, `FileUploadBuilder`, and all five select menu types. See [`exemples/modals.ts`](./exemples/modals.ts).

## Validation & Auditing

Use `toJSON()` for eager throwing on violations. Use `BaseComponent.auditTree()` for non-blocking diagnostics with structured codes, paths, and fix suggestions. See [`exemples/validation.ts`](./exemples/validation.ts).

```ts
import { BaseComponent } from '@discordts/builders';
const warnings = BaseComponent.auditTree(payload);

const issues = BaseComponent.auditTree(payload, { structured: true });
for (const issue of issues) {
  console.warn(`[${issue.code}] ${issue.message} → ${issue.fix}`);
}
```

The auditor checks: component limits, duplicate `customId`s, missing required fields, character length overflows, and mixed ActionRow contents.

## Development

```bash
bun install          # install dependencies
bun test             # run tests
bun test --coverage  # run tests with coverage
bun run typecheck    # run TypeScript type checks
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for more details.

---

*Note: The tests, JSDocs, and code comments in this repository were generated by an AI and subsequently reviewed and reworked by a human.*
