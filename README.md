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

<details>
<summary><b>Click to reveal benchmark graphs</b></summary>
<br>

![Benchmark Graph](./assets/benchmark.svg)

</details>

> [!TIP]
> **Performance Boost:** With over **7.1x performance** (more than 612% faster processing), `@discordts/builders` eliminates instantiation and serialization bottlenecks entirely, running close to 0ms overhead.

Below are the detailed results comparing **50,000 iterations** of component construction and serialization against `@discordjs/builders`.

*Last Benchmarked: June 19, 2026*

| Task | `@discordjs/builders` | `@discordts/builders` | Speed Comparison |
| :--- | :--- | :--- | :---: |
| **Instantiation** | ~171.6 ms | **~18.8 ms** | **9.1x faster** |
| **Serialization** | ~43.1 ms | **~11.3 ms** | **3.8x faster** |
| **Total** | ~214.7 ms | **~30.1 ms** | **7.1x faster** |

To run the benchmark yourself:
```bash
bun run benchmark:ci
```
> The SVG and README table are only regenerated automatically by CI on push. Running locally outputs results to the console only.

## Component Architecture

```mermaid
graph TD
    A[Messages] --> B[ContainerBuilder]
    A --> C[ActionRowBuilder]

    B --> C
    B --> D[SectionBuilder]
    B --> E[MediaGalleryBuilder]
    B --> F[SeparatorBuilder]
    B --> G[TextDisplayBuilder]
    B --> H[FileBuilder]

    D --> G
    D --> I[ThumbnailBuilder]
    D --> J[ButtonBuilder]

    C --> J
    C --> K[Select Menus]
    C --> L[TextInputBuilder]

    K --> K1[StringSelectMenuBuilder]
    K --> K2[UserSelectMenuBuilder]
    K --> K3[RoleSelectMenuBuilder]
    K --> K4[MentionableSelectMenuBuilder]
    K --> K5[ChannelSelectMenuBuilder]

    M[Modals] --> N[LabelBuilder]
    M --> G
    M --> C

    N --> L
    N --> O[RadioGroupBuilder]
    N --> P[CheckboxGroupBuilder]
    N --> Q[CheckboxBuilder]
    N --> R[FileUploadBuilder]
    N --> K

    style A fill:#5865F2,color:#fff
    style M fill:#FF3B92,color:#fff
    style B fill:#2b2d2f,color:#fff
```

## Discord Component Flags

Components V2 messages must be sent with the `IS_COMPONENTS_V2` message flag:

```ts
import { MessageFlags } from '@discordts/builders';
const flags = MessageFlags.IsComponentsV2;
```

When this flag is set, Discord treats components as the message body. Use `TextDisplayBuilder` and `ContainerBuilder` instead of relying on `content` or `embeds`.

## Component Coverage

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': {'primaryColor': '#5865F2'}}}%%
pie title Discord's Component Support
    "Message Components" : 14
    "Modal-only Components" : 5
    "Non-bot Types (enum only)" : 2
```

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
