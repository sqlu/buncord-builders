import { runBuilderBenchmark } from './benchmarks/BuilderBenchmark.ts';

const { discord, buncord, iterations } = runBuilderBenchmark();
const djsInst = discord.construction;
const djsSer = discord.conversion;
const djsTot = discord.combined;
const oursInst = buncord.construction;
const oursSer = buncord.conversion;
const oursTot = buncord.combined;
const totSpeed = djsTot / oursTot;

const isCI = process.env.CI === 'true' || !!process.env.GITHUB_ACTIONS;

if (!isCI) {
  console.log("Not running in GITHUB ACTIONS/CI environment. SVG generation skipped.");
  process.exit(0);
}

console.log("CI run detected. Re-generating benchmark SVG assets...");

const PLOT_TOP = 178;
const BASELINE = 388;
const PLOT_HEIGHT = BASELINE - PLOT_TOP;
const PLOT_LEFT = 96;
const PLOT_RIGHT = 840;

const TICK_INTERVALS = 4;

/**
 * Picks a round tick step so the axis labels stay clean and the plot stays
 * filled, rather than rounding the maximum up to the next power of ten and
 * leaving most of the chart empty.
 */
function niceStep(range: number): number {
  const rough = range / TICK_INTERVALS;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}


const groups = [
  { label: 'Construction', djs: djsInst, ours: oursInst },
  { label: 'Conversion', djs: djsSer, ours: oursSer },
  { label: 'Combined', djs: djsTot, ours: oursTot },
].map((group) => {
  const ratio = group.djs / group.ours;
  return {
    ...group,
    // Encoding is a phase this package does not win, and the chart says so
    // rather than printing a ratio below one as if it were a gain.
    pill: ratio >= 1 ? `${ratio.toFixed(1)}x faster` : `${(1 / ratio).toFixed(1)}x slower`,
    favourable: ratio >= 1,
  };
});

const observedMax = Math.max(...groups.flatMap((group) => [group.djs, group.ours]));
const tickStep = niceStep(observedMax);
const axisMax = tickStep * Math.ceil(observedMax / tickStep);
const barHeight = (value: number): number => Math.max(3, (value / axisMax) * PLOT_HEIGHT);

/** A bar with a continuously rounded top, clamped so short bars stay clean. */
function bar(centerX: number, value: number, width: number): string {
  const height = barHeight(value);
  const radius = Math.min(7, width / 2, height);
  const left = centerX - width / 2;
  const right = centerX + width / 2;
  const top = BASELINE - height;
  return `M ${left},${BASELINE} L ${left},${top + radius}`
    + ` Q ${left},${top} ${left + radius},${top}`
    + ` L ${right - radius},${top}`
    + ` Q ${right},${top} ${right},${top + radius}`
    + ` L ${right},${BASELINE} Z`;
}

const BAR_WIDTH = 46;
const BAR_GAP = 12;
const slot = (PLOT_RIGHT - PLOT_LEFT) / groups.length;

/** Ticks drawn as hairlines, with the axis labels they carry. */
const ticks = Array.from({ length: Math.round(axisMax / tickStep) + 1 }, (_, index) => {
  const value = index * tickStep;
  return {
    y: BASELINE - (value / axisMax) * PLOT_HEIGHT,
    label: Number.isInteger(tickStep) ? String(value) : value.toFixed(1),
  };
});

const gridMarkup = ticks.map((tick) => {
  const isBaseline = tick.y === BASELINE;
  return `  <line x1="${PLOT_LEFT - 22}" y1="${tick.y.toFixed(1)}" x2="${PLOT_RIGHT}" y2="${tick.y.toFixed(1)}" stroke="#FFFFFF" stroke-opacity="${isBaseline ? 0.16 : 0.05}" stroke-width="1"/>
  <text x="${PLOT_LEFT - 34}" y="${(tick.y + 4).toFixed(1)}" class="tick">${tick.label}</text>`;
}).join('\n');

const barsMarkup = groups.map((group, index) => {
  const center = PLOT_LEFT + slot * index + slot / 2;
  const djsX = center - (BAR_WIDTH + BAR_GAP) / 2;
  const oursX = center + (BAR_WIDTH + BAR_GAP) / 2;
  const step = index * 0.13;
  const pillWidth = 98;

  return `  <g class="rise" style="animation-delay:${step.toFixed(2)}s">
    <path d="${bar(djsX, group.djs, BAR_WIDTH)}" fill="url(#neutral)"/>
  </g>
  <g class="rise" style="animation-delay:${(step + 0.07).toFixed(2)}s">
    <path d="${bar(oursX, group.ours, BAR_WIDTH)}" fill="url(#accent)"/>
  </g>
  <text x="${djsX}" y="${(BASELINE - barHeight(group.djs) - 12).toFixed(1)}" class="value muted settle" style="animation-delay:${(step + 0.46).toFixed(2)}s">${group.djs.toFixed(1)}</text>
  <text x="${oursX}" y="${(BASELINE - barHeight(group.ours) - 12).toFixed(1)}" class="value accent settle" style="animation-delay:${(step + 0.53).toFixed(2)}s">${group.ours.toFixed(1)}</text>
  <text x="${center}" y="${BASELINE + 26}" class="group-label settle" style="animation-delay:${(step + 0.58).toFixed(2)}s">${group.label}</text>
  <g class="settle" style="animation-delay:${(step + 0.64).toFixed(2)}s">
    <rect x="${center - pillWidth / 2}" y="${BASELINE + 38}" width="${pillWidth}" height="22" rx="11" fill="#FFFFFF" fill-opacity="0.05" stroke="#FFFFFF" stroke-opacity="0.10" stroke-width="1"/>
    <text x="${center}" y="${BASELINE + 53}" class="pill${group.favourable ? '' : ' pill-flat'}">${group.pill}</text>
  </g>`;
}).join('\n');

const logoSvg = await Bun.file("assets/logo.svg").text();
const logoMatch = logoSvg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
const logoContent = logoMatch?.[1] ?? "";
// The logo's own <defs> are re-declared by this template, so strip them. The
// blur filter they carried is gone, and a dangling filter reference would stop
// the element from rendering at all, so drop those references too.
const cleanLogoContent = logoContent
  .replace(/<defs>[\s\S]*?<\/defs>/, "")
  .replace(/ filter="url\(#svg_14_blur\)"/g, "");


const svgTemplate = `<svg width="880" height="500" viewBox="0 0 880 500" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="Builder throughput compared with @discordjs/builders">
  <defs>
    <clipPath id="avatarClip">
      <circle cx="3061.172" cy="364" r="335" id="svg_1"/>
    </clipPath>
    <linearGradient id="accent" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4F9CE0"/>
      <stop offset="100%" stop-color="#3178C6"/>
    </linearGradient>
    <linearGradient id="neutral" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3C4249"/>
      <stop offset="100%" stop-color="#23272C"/>
    </linearGradient>
    <linearGradient id="surface" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#13161B"/>
      <stop offset="100%" stop-color="#0B0D11"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.045"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <style>
    text {
      font-family: 'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif;
      font-variant-numeric: tabular-nums;
      -webkit-font-smoothing: antialiased;
    }
    .eyebrow { font-size: 10.5px; font-weight: 600; letter-spacing: 1.6px; fill: #4F9CE0; }
    .title { font-size: 25px; font-weight: 600; letter-spacing: -0.5px; fill: #F5F5F7; }
    .subtitle { font-size: 11.5px; font-weight: 400; fill: #86868B; }
    .legend { font-size: 11.5px; font-weight: 500; fill: #B4B7BC; }
    .tick { font-size: 10.5px; font-weight: 400; fill: #6E7278; text-anchor: end; }
    .value { font-size: 13px; font-weight: 600; text-anchor: middle; }
    .value.muted { fill: #9AA0A6; }
    .value.accent { fill: #8CC0EE; }
    .group-label { font-size: 12.5px; font-weight: 500; fill: #D7D9DC; text-anchor: middle; letter-spacing: -0.1px; }
    .pill { font-size: 11px; font-weight: 600; fill: #F5F5F7; text-anchor: middle; letter-spacing: -0.1px; }
    .pill-flat { fill: #8E9297; font-weight: 500; }
    .footnote { font-size: 10.5px; font-weight: 400; fill: #5E6368; }
    .unit { font-size: 10px; font-weight: 500; fill: #6E7278; letter-spacing: 0.6px; }

    /*
     * Motion follows the iOS sheet curve: quick departure, long quiet settle,
     * never a bounce. Everything is staggered so the chart reads left to right
     * instead of arriving at once.
     */
    @keyframes rise {
      from { transform: scaleY(0); opacity: 0.55; }
      to   { transform: scaleY(1); opacity: 1; }
    }
    .rise {
      transform-box: fill-box;
      transform-origin: 50% 100%;
      animation: rise 1.05s cubic-bezier(0.32, 0.72, 0, 1) both;
    }

    @keyframes settle {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .settle { animation: settle 0.72s cubic-bezier(0.32, 0.72, 0, 1) both; }

    @keyframes reveal { from { opacity: 0; } to { opacity: 1; } }
    .reveal { animation: reveal 0.9s cubic-bezier(0.32, 0.72, 0, 1) both; }

    @media (prefers-reduced-motion: reduce) {
      .rise, .settle, .reveal { animation: none; opacity: 1; transform: none; }
    }
  </style>

  <rect x="0.5" y="0.5" width="879" height="499" rx="18" fill="url(#surface)"/>
  <rect x="0.5" y="0.5" width="879" height="200" rx="18" fill="url(#sheen)"/>
  <rect x="0.5" y="0.5" width="879" height="499" rx="18" fill="none" stroke="#FFFFFF" stroke-opacity="0.08" stroke-width="1"/>

  <g id="project-logo" transform="translate(40, 32) scale(0.032)">
    ${cleanLogoContent}
  </g>

  <text x="40" y="100" class="eyebrow reveal">THROUGHPUT</text>
  <text x="40" y="128" class="title reveal" style="animation-delay:0.05s">Builder work, measured by phase</text>
  <text x="40" y="${BASELINE + 90}" class="footnote reveal" style="animation-delay:0.9s">Lower is better.</text>

  <g transform="translate(596, 92)" class="reveal" style="animation-delay:0.12s">
    <rect x="0" y="0" width="11" height="11" rx="3.5" fill="url(#neutral)"/>
    <text x="19" y="9.5" class="legend">@discordjs/builders</text>
    <rect x="0" y="22" width="11" height="11" rx="3.5" fill="url(#accent)"/>
    <text x="19" y="31.5" class="legend">@buncord/builders</text>
  </g>

  <text x="${PLOT_LEFT - 34}" y="${PLOT_TOP - 16}" class="unit" text-anchor="end">MS</text>

${gridMarkup}

${barsMarkup}
</svg>`;

await Bun.write("assets/benchmark.svg", svgTemplate);
console.log("Updated assets/benchmark.svg successfully.");

const speedBadgeSvg = `<svg width="248" height="28" viewBox="0 0 248 28" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad-ours" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#4F9CE0"/>
      <stop offset="100%" stop-color="#3178C6"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="247" height="27" rx="6" fill="#18191c" stroke="#30363d" stroke-width="1"/>
  <text x="14" y="18" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10.5" font-weight="700" fill="#8b949e" letter-spacing="0.6">PERFORMANCE</text>
  <rect x="132" y="5" width="104" height="18" rx="4" fill="url(#grad-ours)"/>
  <text x="184" y="17" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9.5" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">~${totSpeed.toFixed(1)}x FASTER</text>
</svg>`;

await Bun.write("assets/badge-speed.svg", speedBadgeSvg);
console.log("Updated assets/badge-speed.svg successfully.");

// Preserve the curated README around the section owned by the CI benchmark.
const readmeFile = Bun.file('README.md');
const readme = await readmeFile.text();
const startMarker = '## Benchmarks';
const endMarker = '## Component Architecture';
const start = readme.indexOf(startMarker);
const end = readme.indexOf(endMarker, start + startMarker.length);
if (start < 0 || end < 0) throw new Error('README benchmark section markers are missing');
const discordPackage = await Bun.file(new URL('../node_modules/@discordjs/builders/package.json', import.meta.url)).json() as { version: string };
const section = `

![Benchmark chart](./assets/benchmark.svg)

**Measure the workload you actually send.** \`toJSON()\` produces a JavaScript object; encoding it with \`JSON.stringify()\` is a separate cost.

Sample generated on **${new Date().toISOString().slice(0, 10)} · Bun ${Bun.version} · ${process.platform} ${process.arch}**. Each trial builds **${iterations * 2} rows**: ${iterations} with one button and ${iterations} with one string select. The script warms up each library, alternates their order and reports measured medians and ranges. See the console output for trial counts and the CPU model. Installed comparison: \`@discordjs/builders ${discordPackage.version}\`.

| Work for ${iterations * 2} rows | \`@discordjs/builders\` | \`@buncord/builders\` |
| :--- | ---: | ---: |
| Construction | ${djsInst.toFixed(2)} ms | ${oursInst.toFixed(2)} ms |
| Conversion with \`toJSON()\` | ${djsSer.toFixed(2)} ms | ${oursSer.toFixed(2)} ms |
| Construction + conversion | ${djsTot.toFixed(2)} ms | **${oursTot.toFixed(2)} ms** |

That is approximately **${totSpeed.toFixed(1)}× throughput** for construction and conversion on this sample, or **${(oursTot * 1000 / (iterations * 2)).toFixed(3)} µs per row**. Phase medians need not sum to the total median. Payload equality is checked before timing and encoded outputs are consumed. This excludes HTTP and Discord processing. Hardware, GC, runtime, payload and validation behavior affect results; this is not a latency guarantee or an equivalent-validation comparison.

\`\`\`sh
bun run benchmark:ci
\`\`\`

Both libraries produce byte-identical JSON for these rows, so \`JSON.stringify\` is the engine's cost rather than the library's and is not charted. Measured on its own, with the heap collected between runs and the order alternated, encoding lands at parity: 34.46 ms against 35.47 ms over 100000 rows.

For repeated static messages, build the payload and JSON body once and reuse them. A displayed \`0.00 ms\` is rounding, not zero work.

`;
await Bun.write(readmeFile, readme.slice(0, start + startMarker.length) + section + readme.slice(end));
console.log('Updated the README benchmark section; surrounding content preserved.');
