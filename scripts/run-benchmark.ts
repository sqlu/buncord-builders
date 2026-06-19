import { ActionRowBuilder as DjsActionRowBuilder, ButtonBuilder as DjsButtonBuilder, StringSelectMenuBuilder as DjsStringSelectMenuBuilder } from '@discordjs/builders';
import { ButtonStyle as DjsButtonStyle } from 'discord-api-types/v10';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from '../src/index.ts';

const ITERATIONS = 50000;
const TRIALS = 5;

let djsInstSum = 0;
let djsSerSum = 0;
let oursInstSum = 0;
let oursSerSum = 0;

for (let trial = 0; trial < 2; trial++) {
  const djsRows: unknown[] = [];
  for (let i = 0; i < 5000; i++) {
    djsRows.push(
      new DjsActionRowBuilder().addComponents(
        new DjsButtonBuilder().setCustomId(`btn_${i}`).setLabel('Click me').setStyle(DjsButtonStyle.Primary),
        new DjsStringSelectMenuBuilder().setCustomId(`select_${i}`).setPlaceholder('Choose something').addOptions({ label: 'Option 1', value: 'opt_1' })
      )
    );
  }
  for (let i = 0; i < 5000; i++) {
    (djsRows[i] as { toJSON(): unknown }).toJSON();
  }

  const ourRows: unknown[] = [];
  for (let i = 0; i < 5000; i++) {
    ourRows.push(
      new ActionRowBuilder({
        components: [
          new ButtonBuilder({ customId: `btn_${i}`, label: 'Click me', style: ButtonStyle.Primary }),
          new StringSelectMenuBuilder({
            customId: `select_${i}`,
            placeholder: 'Choose something',
            options: [{ label: 'Option 1', value: 'opt_1' }],
          }),
        ],
      })
    );
  }
  for (let i = 0; i < 5000; i++) {
    (ourRows[i] as { toJSON(): unknown }).toJSON();
  }
}

for (let trial = 0; trial < TRIALS; trial++) {
  const startDjsInst = performance.now();
  const djsRows: DjsActionRowBuilder<DjsButtonBuilder | DjsStringSelectMenuBuilder>[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const row = new DjsActionRowBuilder<DjsButtonBuilder | DjsStringSelectMenuBuilder>()
      .addComponents(
        new DjsButtonBuilder()
          .setCustomId(`btn_${i}`)
          .setLabel('Click me')
          .setStyle(DjsButtonStyle.Primary),
        new DjsStringSelectMenuBuilder()
          .setCustomId(`select_${i}`)
          .setPlaceholder('Choose something')
          .addOptions({
            label: 'Option 1',
            value: 'opt_1',
          })
      );
    djsRows.push(row);
  }
  const endDjsInst = performance.now();
  djsInstSum += (endDjsInst - startDjsInst);

  const startDjsSer = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    djsRows[i].toJSON();
  }
  const endDjsSer = performance.now();
  djsSerSum += (endDjsSer - startDjsSer);

  const startOursInst = performance.now();
  const ourRows: ActionRowBuilder[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const row = new ActionRowBuilder({
      components: [
        new ButtonBuilder({
          customId: `btn_${i}`,
          label: 'Click me',
          style: ButtonStyle.Primary,
        }),
        new StringSelectMenuBuilder({
          customId: `select_${i}`,
          placeholder: 'Choose something',
          options: [
            {
              label: 'Option 1',
              value: 'opt_1',
            },
          ],
        }),
      ],
    });
    ourRows.push(row);
  }
  const endOursInst = performance.now();
  oursInstSum += (endOursInst - startOursInst);

  const startOursSer = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    ourRows[i].toJSON();
  }
  const endOursSer = performance.now();
  oursSerSum += (endOursSer - startOursSer);
}

const djsInst = djsInstSum / TRIALS;
const djsSer = djsSerSum / TRIALS;
const oursInst = oursInstSum / TRIALS;
const oursSer = oursSerSum / TRIALS;

const djsTot = djsInst + djsSer;
const oursTot = oursInst + oursSer;

const instSpeed = djsInst / oursInst;
const serSpeed = djsSer / oursSer;
const totSpeed = djsTot / oursTot;

console.log(`[Instantiation] @discordjs/builders : ${djsInst.toFixed(2)} ms`);
console.log(`[Instantiation] @discordts/builders : ${oursInst.toFixed(2)} ms`);
console.log(`Ratio Instantiation                 : ${instSpeed.toFixed(1)}x faster!`);
console.log(`\n[Serialization] @discordjs/builders : ${djsSer.toFixed(2)} ms`);
console.log(`[Serialization] @discordts/builders : ${oursSer.toFixed(2)} ms`);
console.log(`Ratio Serialization                 : ${serSpeed.toFixed(1)}x faster!`);
console.log(`\n[Total] @discordjs/builders         : ${djsTot.toFixed(2)} ms`);
console.log(`[Total] @discordts/builders         : ${oursTot.toFixed(2)} ms`);
console.log(`Ratio Total                         : ${totSpeed.toFixed(1)}x faster!\n`);

const isCI = process.env.CI === 'true' || !!process.env.GITHUB_ACTIONS;

if (!isCI) {
  console.log("Not running in GITHUB ACTIONS/CI environment. SVG and README changes skipped.");
  process.exit(0);
}

console.log("CI run detected. Re-generating benchmark.svg and README.md...");

const maxVal = Math.max(djsInst, djsSer, djsTot, oursInst, oursSer, oursTot);
const maxBarHeight = 220;

function getBarHeight(val: number): number {
  return Math.max(16, Math.round((val / maxVal) * maxBarHeight));
}

const hDjsInst = getBarHeight(djsInst);
const hOursInst = getBarHeight(oursInst);
const hDjsSer = getBarHeight(djsSer);
const hOursSer = getBarHeight(oursSer);
const hDjsTot = getBarHeight(djsTot);
const hOursTot = getBarHeight(oursTot);

const yDjsInst = 350 - hDjsInst;
const yOursInst = 350 - hOursInst;
const yDjsSer = 350 - hDjsSer;
const yOursSer = 350 - hOursSer;
const yDjsTot = 350 - hDjsTot;
const yOursTot = 350 - hOursTot;

function roundedTopBar(x1: number, x2: number, y: number): string {
  const r = 8;
  return `M ${x1},${y + r} A ${r},${r} 0 0 1 ${x1 + r},${y} L ${x2 - r},${y} A ${r},${r} 0 0 1 ${x2},${y + r} L ${x2},350 L ${x1},350 Z`;
}

const cInst = 155;
const cSer  = 400;
const cTot  = 645;

const pathDjsInst  = roundedTopBar(cInst - 61, cInst - 5,  yDjsInst);
const pathOursInst = roundedTopBar(cInst + 5,  cInst + 61, yOursInst);
const pathDjsSer   = roundedTopBar(cSer  - 61, cSer  - 5,  yDjsSer);
const pathOursSer  = roundedTopBar(cSer  + 5,  cSer  + 61, yOursSer);
const pathDjsTot   = roundedTopBar(cTot  - 61, cTot  - 5,  yDjsTot);
const pathOursTot  = roundedTopBar(cTot  + 5,  cTot  + 61, yOursTot);

const xDjsInstLbl  = cInst - 33;
const xOursInstLbl = cInst + 33;
const xDjsSerLbl   = cSer  - 33;
const xOursSerLbl  = cSer  + 33;
const xDjsTotLbl   = cTot  - 33;
const xOursTotLbl  = cTot  + 33;

const logoSvg = await Bun.file("assets/logo.svg").text();
const logoMatch = logoSvg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
const logoContent = logoMatch ? logoMatch[1] : "";
const cleanLogoContent = logoContent.replace(/<defs>[\s\S]*?<\/defs>/, "");

const delay = 0.3;

const svgTemplate = `<svg width="800" height="460" viewBox="0 0 800 460" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <clipPath id="avatarClip">
      <circle cx="2562" cy="364" r="335" id="svg_1"/>
    </clipPath>
    <filter id="svg_14_blur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2.1"/>
    </filter>
    <linearGradient id="grad-ours" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FF3B92"/>
      <stop offset="100%" stop-color="#FF85B6"/>
    </linearGradient>
    <linearGradient id="grad-djs" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4E5154"/>
      <stop offset="100%" stop-color="#2B2D2F"/>
    </linearGradient>
    <filter id="glow-ours" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#FF3B92" flood-opacity="0.25"/>
    </filter>
    <filter id="glow-pulse" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="4" stdDeviation="10" flood-color="#FF3B92">
        <animate attributeName="flood-opacity" values="0.18;0.55;0.18" dur="2.4s" begin="${1.3 + delay}s" repeatCount="indefinite"/>
      </feDropShadow>
    </filter>
  </defs>

  <style>
    .font-base { font-family: 'SF Pro', 'SF Pro Display', -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif; }
    .legend-djs { font-size: 11px; font-weight: 600; fill: #8b949e; }
    .legend-ours { font-size: 11px; font-weight: 600; fill: #ffffff; }
    .group-title { font-size: 13px; font-weight: 700; fill: #ffffff; text-anchor: middle; }
    .group-speed { font-size: 10px; font-weight: 800; fill: #58a6ff; text-anchor: middle; letter-spacing: 0.5px; }
    .val-djs { font-size: 12px; font-weight: 700; fill: #8b949e; text-anchor: middle; }
    .val-ours { font-size: 12px; font-weight: 800; fill: #FF85B6; text-anchor: middle; }
    .footer-text { font-size: 10px; font-weight: 500; fill: #8b949e; }

    /* ── Bar grow-up from baseline ── */
    @keyframes growBar {
      from { transform: scaleY(0); }
      to   { transform: scaleY(1); }
    }
    .bar-grow {
      transform-box: fill-box;
      transform-origin: 50% 100%;
      animation: growBar 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    /* ── Fade-in for labels and titles ── */
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .fade-in {
      animation: fadeIn 0.4s ease-out both;
    }

    /* ── Pop-in spring for speed badges ── */
    @keyframes popIn {
      0%   { opacity: 0; transform: scale(0.55); }
      65%  { transform: scale(1.12); }
      100% { opacity: 1; transform: scale(1); }
    }
    .badge-pop {
      transform-box: fill-box;
      transform-origin: 50% 50%;
      animation: popIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
  </style>

  <line x1="40" y1="110" x2="760" y2="110" stroke="#30363d" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4,4"/>
  <line x1="40" y1="190" x2="760" y2="190" stroke="#30363d" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4,4"/>
  <line x1="40" y1="270" x2="760" y2="270" stroke="#30363d" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="4,4"/>
  <line x1="40" y1="350" x2="760" y2="350" stroke="#30363d" stroke-width="1.5"/>

  <g id="project-logo" transform="translate(40, 20) scale(0.045)">
    ${cleanLogoContent}
  </g>
  <text x="40" y="68" class="font-base" font-size="11" font-weight="900" letter-spacing="1.5" fill="#5865F2">BENCHMARKS</text>

  <g transform="translate(440, 0)">
    <rect x="0" y="32" width="12" height="12" rx="3" fill="url(#grad-djs)"/>
    <text x="18" y="42" class="font-base legend-djs">@discordjs/builders</text>
    <rect x="155" y="32" width="12" height="12" rx="3" fill="url(#grad-ours)"/>
    <text x="173" y="42" class="font-base legend-ours">@discordts/builders (ours)</text>
  </g>

  <text x="${cInst}" y="385" class="font-base group-title fade-in" style="animation-delay:${1.05 + delay}s">Instantiation</text>
  <g class="badge-pop" style="animation-delay:${1.2 + delay}s">
    <rect x="${cInst - 45}" y="394" width="90" height="18" rx="9" fill="#58a6ff" fill-opacity="0.1" stroke="#58a6ff" stroke-width="1"/>
    <text x="${cInst}" y="407" class="font-base group-speed">${instSpeed.toFixed(1)}x FASTER</text>
  </g>

  <text x="${xDjsInstLbl}" y="${yDjsInst - 8}" class="font-base val-djs fade-in" style="animation-delay:${0.6 + delay}s">${djsInst.toFixed(1)}ms</text>
  <path class="bar-grow" style="animation-delay:${0 + delay}s" d="${pathDjsInst}" fill="url(#grad-djs)"/>

  <text x="${xOursInstLbl}" y="${yOursInst - 8}" class="font-base val-ours fade-in" style="animation-delay:${0.7 + delay}s">${oursInst.toFixed(1)}ms</text>
  <path class="bar-grow" style="animation-delay:${0.1 + delay}s" d="${pathOursInst}" fill="url(#grad-ours)" filter="url(#glow-pulse)"/>

  <text x="${cSer}" y="385" class="font-base group-title fade-in" style="animation-delay:${1.1 + delay}s">Serialization</text>
  <g class="badge-pop" style="animation-delay:${1.25 + delay}s">
    <rect x="${cSer - 45}" y="394" width="90" height="18" rx="9" fill="#58a6ff" fill-opacity="0.1" stroke="#58a6ff" stroke-width="1"/>
    <text x="${cSer}" y="407" class="font-base group-speed">${serSpeed.toFixed(1)}x FASTER</text>
  </g>

  <text x="${xDjsSerLbl}" y="${yDjsSer - 8}" class="font-base val-djs fade-in" style="animation-delay:${0.8 + delay}s">${djsSer.toFixed(1)}ms</text>
  <path class="bar-grow" style="animation-delay:${0.2 + delay}s" d="${pathDjsSer}" fill="url(#grad-djs)"/>

  <text x="${xOursSerLbl}" y="${yOursSer - 8}" class="font-base val-ours fade-in" style="animation-delay:${0.9 + delay}s">${oursSer.toFixed(1)}ms</text>
  <path class="bar-grow" style="animation-delay:${0.3 + delay}s" d="${pathOursSer}" fill="url(#grad-ours)" filter="url(#glow-pulse)"/>

  <text x="${cTot}" y="385" class="font-base group-title fade-in" style="animation-delay:${1.15 + delay}s">Total Time</text>
  <g class="badge-pop" style="animation-delay:${1.3 + delay}s">
    <rect x="${cTot - 45}" y="394" width="90" height="18" rx="9" fill="#58a6ff" fill-opacity="0.1" stroke="#58a6ff" stroke-width="1"/>
    <text x="${cTot}" y="407" class="font-base group-speed">${totSpeed.toFixed(1)}x FASTER</text>
  </g>

  <text x="${xDjsTotLbl}" y="${yDjsTot - 8}" class="font-base val-djs fade-in" style="animation-delay:${1.0 + delay}s">${djsTot.toFixed(1)}ms</text>
  <path class="bar-grow" style="animation-delay:${0.4 + delay}s" d="${pathDjsTot}" fill="url(#grad-djs)"/>

  <text x="${xOursTotLbl}" y="${yOursTot - 8}" class="font-base val-ours fade-in" style="animation-delay:${1.1 + delay}s">${oursTot.toFixed(1)}ms</text>
  <path class="bar-grow" style="animation-delay:${0.5 + delay}s" d="${pathOursTot}" fill="url(#grad-ours)" filter="url(#glow-pulse)"/>
</svg>`;

await Bun.write("assets/benchmark.svg", svgTemplate);
console.log("Updated assets/benchmark.svg successfully.");

const readmeContent = await Bun.file("README.md").text();
const startMarker = "## Benchmarks";
const endMarker = "To run the benchmark yourself:";

const startIdx = readmeContent.indexOf(startMarker);
const endIdx = readmeContent.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const before = readmeContent.substring(0, startIdx + startMarker.length);
  const after = readmeContent.substring(endIdx);
  const percentage = Math.round((totSpeed - 1) * 100);

  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = new Date().toLocaleDateString('en-US', options);

  const newSection = `

This package is optimized for speed. It runs close to 0ms overhead by using direct manual loops and avoiding heavy validation schemas. 

![Benchmark Graph](./assets/benchmark.svg)

> [!TIP]
> **Performance Boost:** With over **${totSpeed.toFixed(1)}x performance** (more than ${percentage}% faster processing), \`@discordts/builders\` eliminates instantiation and serialization bottlenecks entirely, running close to 0ms overhead.

Below are the detailed results comparing **50,000 iterations** of component construction and serialization against \`@discordjs/builders\`.

*Last Benchmarked: ${formattedDate}*

| Task | \`@discordjs/builders\` | \`@discordts/builders\` | Speed Comparison |
| :--- | :--- | :--- | :---: |
| **Instantiation** | ~${djsInst.toFixed(1)} ms | **~${oursInst.toFixed(1)} ms** | **${instSpeed.toFixed(1)}x faster** |
| **Serialization** | ~${djsSer.toFixed(1)} ms | **~${oursSer.toFixed(1)} ms** | **${serSpeed.toFixed(1)}x faster** |
| **Total** | ~${djsTot.toFixed(1)} ms | **~${oursTot.toFixed(1)} ms** | **${totSpeed.toFixed(1)}x faster** |

`;

  await Bun.write("README.md", before + newSection + after);
  console.log("Updated README.md successfully.");
} else {
  console.error("Could not find Benchmark section markers in README.md");
}