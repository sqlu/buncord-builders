<div align="center">
  <img src="./assets/logo.svg" alt="@buncord/builders logo" width="320" />

  <h3>Type-safe Discord Components builders for Bun</h3>

  <p>
    <a href="https://npmjs.com/package/@buncord/builders"><img src="https://img.shields.io/npm/v/@buncord/builders?color=FF3B92&style=flat-square" alt="npm" /></a>
    <a href="https://bun.sh"><img src="https://img.shields.io/badge/bun-%3E%3D1.1.0-orange?style=flat-square&logo=bun" alt="Bun" /></a>
    <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript" alt="TypeScript" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-22c55e?style=flat-square" alt="License: MIT" /></a>
  </p>

  <p>
    <img src="./assets/badge-speed.svg" alt="Performance Badge" />
    <img src="./assets/badge-safety.svg" alt="Type Safety Badge" />
    <img src="./assets/badge-deps.svg" alt="Zero Dependencies Badge" />
  </p>
</div>

---

## Why is your bot wasting CPU cycles on heavy validation?

Traditional Discord component builders process and transpile complex validation logic *at runtime* on every single serialization. This creates noticeable bottlenecks in high-scale bots.

`@buncord/builders` solves this by shifting safety checks to the **type level (compile-time)**. You get a frictionless, zero-dependency, ultra-lightweight library designed natively for Bun that serializes components **and is way faster**.

---

## Key Benefits for Developers

- **Zero Dependency Footprint:** Standard lockfiles shouldn't require dozens of transitives just to build a payload. We ship with **zero dependencies**.
- **Compile-Time Safety:** Invalid component structures, overflow lengths, and mismatched options fail *while you type*, not in production.
- **Drop-in Migration:** Easily swap `@discordjs/builders` imports out and enjoy near-zero overhead without rewriting your logic.
- **Next-Gen Component Support:** Only support for Discord's latest component.

---

## Get Started in 30 Seconds

### Install
```bash
bun add @buncord/builders
```
*Requirements: Bun ≥ 1.1.0 and TypeScript 5.x*

## Benchmarks

This package is optimized for speed. It runs close to 0ms overhead by using direct manual loops and avoiding heavy validation schemas. 

![Benchmark Graph](./assets/benchmark.svg)

> [!TIP]
> **Performance Boost:** With over **6.9x performance** (more than 593% faster processing), `@buncord/builders` eliminates instantiation and serialization bottlenecks entirely, running close to 0ms overhead.

Below are the detailed results comparing **50,000 iterations** of component construction and serialization against `@discordjs/builders`.

*Last Benchmarked: June 19, 2026*

| Task | `@discordjs/builders` | `@buncord/builders` | Speed Comparison |
| :--- | :--- | :--- | :---: |
| **Instantiation** | ~162.5 ms | **~17.7 ms** | **9.2x faster** |
| **Serialization** | ~47.0 ms | **~12.6 ms** | **3.7x faster** |
| **Total** | ~209.5 ms | **~30.2 ms** | **6.9x faster** |

## Component Architecture

```mermaid
graph LR
    classDef msgRoot fill:#5865F2,color:#fff,stroke:none,font-weight:bold,rx:5px,ry:5px
    classDef modRoot fill:#FF3B92,color:#fff,stroke:none,font-weight:bold,rx:5px,ry:5px
    classDef layout fill:#2b2d2f,color:#fff,stroke:#4f545c,stroke-width:2px
    classDef content fill:#202225,color:#dcddde,stroke:#36393f,stroke-width:1px

    MSG([Messages]):::msgRoot --> Cont[ContainerBuilder]:::layout
    MSG --> RowMsg[ActionRowBuilder]:::layout

    Cont --> Sec[SectionBuilder]:::layout
    Cont --> RowCont[ActionRowBuilder]:::layout
    Cont --> ContContent["MediaGalleryBuilder<br>SeparatorBuilder<br>FileBuilder<br>TextDisplayBuilder"]:::content

    Sec --> SecContent["ThumbnailBuilder<br>ButtonBuilder<br>TextDisplayBuilder"]:::content
    
    RowMsg --> RowMsgContent["ButtonBuilder<br>StringSelectMenuBuilder<br>UserSelectMenuBuilder<br>RoleSelectMenuBuilder<br>MentionableSelectMenuBuilder<br>ChannelSelectMenuBuilder"]:::content

    RowCont --> RowContContent["ButtonBuilder<br>StringSelectMenuBuilder<br>UserSelectMenuBuilder<br>RoleSelectMenuBuilder<br>MentionableSelectMenuBuilder<br>ChannelSelectMenuBuilder"]:::content

    MOD([Modals]):::modRoot --> Lbl[LabelBuilder]:::layout
    MOD --> RowMod[ActionRowBuilder]:::layout
    MOD --> TxtMod[TextDisplayBuilder]:::content

    Lbl --> LblContent["TextInputBuilder<br>RadioGroupBuilder<br>CheckboxGroupBuilder<br>CheckboxBuilder<br>FileUploadBuilder<br>StringSelectMenuBuilder<br>UserSelectMenuBuilder<br>RoleSelectMenuBuilder<br>MentionableSelectMenuBuilder<br>ChannelSelectMenuBuilder"]:::content

    RowMod --> RowModContent["TextInputBuilder<br>StringSelectMenuBuilder<br>UserSelectMenuBuilder<br>RoleSelectMenuBuilder<br>MentionableSelectMenuBuilder<br>ChannelSelectMenuBuilder"]:::content
```

Components V2 messages must be sent with the `IS_COMPONENTS_V2` message flag:

```ts
import { MessageFlags } from '@buncord/builders';
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

## Examples & Demos

All runnable examples live in [`/exemples`](./exemples):

| Example | Description |
|:--------|:------------|
| [`quick-start.ts`](./exemples/quick-start.ts) | Full Components V2 message payload |
| [`smart-layout.ts`](./exemples/smart-layout.ts) | Auto-packing buttons and select menus into rows |
| [`modals.ts`](./exemples/modals.ts) | Modal with text inputs, radio groups, checkboxes, and file upload |
| [`validation.ts`](./exemples/validation.ts) | Runtime validation and `auditTree()` diagnostics |
| [`webhook.ts`](./exemples/webhook.ts) | Sending a payload to a Discord webhook |

## Validation & Auditing

Use `toJSON()` for eager throwing on violations. Use `BaseComponent.auditTree()` for non-blocking diagnostics with structured codes, paths, and fix suggestions. See [`exemples/validation.ts`](./exemples/validation.ts).

```ts
import { BaseComponent } from '@buncord/builders';
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
