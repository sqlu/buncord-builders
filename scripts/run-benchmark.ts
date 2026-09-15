import { runBuilderBenchmark } from './benchmarks/BuilderBenchmark.ts';

const { discord, buncord, iterations } = runBuilderBenchmark();
const djsInst = discord.construction;
const djsSer = discord.conversion;
const djsTot = discord.combined;
const oursInst = buncord.construction;
const oursSer = buncord.conversion;
const oursTot = buncord.combined;
const instSpeed = djsInst / oursInst;
const serSpeed = djsSer / oursSer;
const totSpeed = djsTot / oursTot;

const isCI = process.env.CI === 'true' || !!process.env.GITHUB_ACTIONS;

if (!isCI) {
  console.log("Not running in GITHUB ACTIONS/CI environment. SVG generation skipped.");
  process.exit(0);
}

console.log("CI run detected. Re-generating benchmark SVG assets...");

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
const logoContent = logoMatch?.[1] ?? "";
// The logo's own <defs> are re-declared by this template, so strip them. The
// blur filter they carried is gone, and a dangling filter reference would stop
// the element from rendering at all, so drop those references too.
const cleanLogoContent = logoContent
  .replace(/<defs>[\s\S]*?<\/defs>/, "")
  .replace(/ filter="url\(#svg_14_blur\)"/g, "");

const delay = 0.9;

const svgTemplate = `<svg width="800" height="460" viewBox="0 0 800 460" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <clipPath id="avatarClip">
      <circle cx="3061.172" cy="364" r="335" id="svg_1"/>
    </clipPath>
    <linearGradient id="grad-ours" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FF3B92"/>
      <stop offset="100%" stop-color="#FF85B6"/>
    </linearGradient>
    <linearGradient id="grad-djs" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4E5154"/>
      <stop offset="100%" stop-color="#2B2D2F"/>
    </linearGradient>
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

    @keyframes growBar {
      from { transform: scaleY(0); }
      to   { transform: scaleY(1); }
    }
    .bar-grow {
      transform-box: fill-box;
      transform-origin: 50% 100%;
      animation: growBar 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    .fade-in {
      animation: fadeIn 0.4s ease-out both;
    }

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
    <text x="173" y="42" class="font-base legend-ours">@buncord/builders (ours)</text>
  </g>

  <text x="${cInst}" y="385" class="font-base group-title fade-in" style="animation-delay:${1.05 + delay}s">Instantiation</text>
  <g class="badge-pop" style="animation-delay:${1.2 + delay}s">
    <rect x="${cInst - 45}" y="394" width="90" height="18" rx="9" fill="#58a6ff" fill-opacity="0.1" stroke="#58a6ff" stroke-width="1"/>
    <text x="${cInst}" y="407" class="font-base group-speed">${instSpeed.toFixed(1)}x FASTER</text>
  </g>

  <text x="${xDjsInstLbl}" y="${yDjsInst - 8}" class="font-base val-djs fade-in" style="animation-delay:${0.6 + delay}s">${djsInst.toFixed(1)}ms</text>
  <path class="bar-grow" style="animation-delay:${0 + delay}s" d="${pathDjsInst}" fill="url(#grad-djs)"/>

  <text x="${xOursInstLbl}" y="${yOursInst - 8}" class="font-base val-ours fade-in" style="animation-delay:${0.7 + delay}s">${oursInst.toFixed(1)}ms</text>
  <path class="bar-grow" style="animation-delay:${0.1 + delay}s" d="${pathOursInst}" fill="url(#grad-ours)"/>

  <text x="${cSer}" y="385" class="font-base group-title fade-in" style="animation-delay:${1.1 + delay}s">Serialization</text>
  <g class="badge-pop" style="animation-delay:${1.25 + delay}s">
    <rect x="${cSer - 45}" y="394" width="90" height="18" rx="9" fill="#58a6ff" fill-opacity="0.1" stroke="#58a6ff" stroke-width="1"/>
    <text x="${cSer}" y="407" class="font-base group-speed">${serSpeed.toFixed(1)}x FASTER</text>
  </g>

  <text x="${xDjsSerLbl}" y="${yDjsSer - 8}" class="font-base val-djs fade-in" style="animation-delay:${0.8 + delay}s">${djsSer.toFixed(1)}ms</text>
  <path class="bar-grow" style="animation-delay:${0.2 + delay}s" d="${pathDjsSer}" fill="url(#grad-djs)"/>

  <text x="${xOursSerLbl}" y="${yOursSer - 8}" class="font-base val-ours fade-in" style="animation-delay:${0.9 + delay}s">${oursSer.toFixed(1)}ms</text>
  <path class="bar-grow" style="animation-delay:${0.3 + delay}s" d="${pathOursSer}" fill="url(#grad-ours)"/>

  <text x="${cTot}" y="385" class="font-base group-title fade-in" style="animation-delay:${1.15 + delay}s">Total Time</text>
  <g class="badge-pop" style="animation-delay:${1.3 + delay}s">
    <rect x="${cTot - 45}" y="394" width="90" height="18" rx="9" fill="#58a6ff" fill-opacity="0.1" stroke="#58a6ff" stroke-width="1"/>
    <text x="${cTot}" y="407" class="font-base group-speed">${totSpeed.toFixed(1)}x FASTER</text>
  </g>

  <text x="${xDjsTotLbl}" y="${yDjsTot - 8}" class="font-base val-djs fade-in" style="animation-delay:${1.0 + delay}s">${djsTot.toFixed(1)}ms</text>
  <path class="bar-grow" style="animation-delay:${0.4 + delay}s" d="${pathDjsTot}" fill="url(#grad-djs)"/>

  <text x="${xOursTotLbl}" y="${yOursTot - 8}" class="font-base val-ours fade-in" style="animation-delay:${1.1 + delay}s">${oursTot.toFixed(1)}ms</text>
  <path class="bar-grow" style="animation-delay:${0.5 + delay}s" d="${pathOursTot}" fill="url(#grad-ours)"/>
</svg>`;

await Bun.write("assets/benchmark.svg", svgTemplate);
console.log("Updated assets/benchmark.svg successfully.");

const speedBadgeSvg = `<svg width="220" height="28" viewBox="0 0 220 28" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad-ours" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FF3B92"/>
      <stop offset="100%" stop-color="#FF85B6"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="219" height="27" rx="6" fill="#18191c" stroke="#30363d" stroke-width="1"/>
  <!-- Left Side Label -->
  <text x="12" y="18" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#8b949e" letter-spacing="0.5">PERFORMANCE</text>
  <!-- Divider -->
  <line x1="110" y1="4" x2="110" y2="24" stroke="#30363d" stroke-width="1"/>
  <!-- Right Side Value -->
  <rect x="116" y="5" width="98" height="18" rx="4" fill="url(#grad-ours)"/>
  <text x="165" y="17" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">~${totSpeed.toFixed(1)}x FASTER</text>
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

**Measure the workload you actually send.** \`toJSON()\` produces a JavaScript object; encoding it with \`JSON.stringify()\` is a separate cost.

Sample generated on **${new Date().toISOString().slice(0, 10)} · Bun ${Bun.version} · ${process.platform} ${process.arch}**. Each trial builds **${iterations * 2} rows**: ${iterations} with one button and ${iterations} with one string select. The script warms up each library, alternates their order and reports measured medians and ranges. See the console output for trial counts and the CPU model. Installed comparison: \`@discordjs/builders ${discordPackage.version}\`.

| Work for ${iterations * 2} rows | \`@discordjs/builders\` | \`@buncord/builders\` |
| :--- | ---: | ---: |
| Construction | ${djsInst.toFixed(2)} ms | ${oursInst.toFixed(2)} ms |
| Conversion with \`toJSON()\` | ${djsSer.toFixed(2)} ms | ${oursSer.toFixed(2)} ms |
| Construction + conversion | ${djsTot.toFixed(2)} ms | **${oursTot.toFixed(2)} ms** |
| JSON encoding | ${discord.encoding.toFixed(2)} ms | ${buncord.encoding.toFixed(2)} ms |
| Construction + conversion + encoding | ${discord.total.toFixed(2)} ms | **${buncord.total.toFixed(2)} ms** |

That is approximately **${totSpeed.toFixed(1)}× throughput** for construction and conversion on this sample, or **${(oursTot * 1000 / (iterations * 2)).toFixed(3)} µs per row**. Phase medians need not sum to the total median. Payload equality is checked before timing and encoded outputs are consumed. This excludes HTTP and Discord processing. Hardware, GC, runtime, payload and validation behavior affect results; this is not a latency guarantee or an equivalent-validation comparison.

\`\`\`sh
bun run benchmark:ci
\`\`\`

For repeated static messages, build the payload and JSON body once and reuse them. A displayed \`0.00 ms\` is rounding, not zero work.

`;
await Bun.write(readmeFile, readme.slice(0, start + startMarker.length) + section + readme.slice(end));
console.log('Updated the README benchmark section; surrounding content preserved.');
