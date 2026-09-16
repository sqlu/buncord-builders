import { cpus } from 'node:os';
import { isDeepStrictEqual } from 'node:util';
import {
  ActionRowBuilder as DiscordRow,
  ButtonBuilder as DiscordButton,
  StringSelectMenuBuilder as DiscordSelect,
} from '@discordjs/builders';
import { ButtonStyle as DiscordButtonStyle } from 'discord-api-types/v10';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from '../../src/index.ts';

interface Serializable {
  toJSON(): unknown;
}

interface Measurements {
  construction: number;
  conversion: number;
  encoding: number;
  combined: number;
  total: number;
}

interface BenchmarkMethod {
  name: string;
  create: (index: number) => Serializable[];
}

const methods: BenchmarkMethod[] = [
  {
    name: '@discordjs/builders',
    create: index => [
      new DiscordRow().addComponents(
        new DiscordButton().setCustomId(`btn_${index}`).setLabel('Click me').setStyle(DiscordButtonStyle.Primary),
      ),
      new DiscordRow().addComponents(
        new DiscordSelect().setCustomId(`select_${index}`).setPlaceholder('Choose something')
          .addOptions({ label: 'Option 1', value: 'opt_1' }),
      ),
    ],
  },
  {
    name: '@buncord/builders',
    create: index => [
      new ActionRowBuilder({
        components: [new ButtonBuilder({ customId: `btn_${index}`, label: 'Click me', style: ButtonStyle.Primary })],
      }),
      new ActionRowBuilder({
        components: [new StringSelectMenuBuilder({
          customId: `select_${index}`, placeholder: 'Choose something', options: [{ label: 'Option 1', value: 'opt_1' }],
        })],
      }),
    ],
  },
];

function readCount(name: string, fallback: number): number {
  const argument = process.argv.find(value => value.startsWith(`--${name}=`));
  const result = argument === undefined ? fallback : Number(argument.slice(name.length + 3));
  if (!Number.isSafeInteger(result) || result < 1) throw new Error(`${name} must be a positive integer`);
  return result;
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

let checksum = 0;

function measure(method: BenchmarkMethod, iterations: number): Measurements {
  const rows: Serializable[] = [];
  const start = performance.now();
  for (let index = 0; index < iterations; index++) rows.push(...method.create(index));
  const constructed = performance.now();
  const payloads = rows.map(row => row.toJSON());
  const converted = performance.now();
  for (let index = 0; index < payloads.length; index++) {
    const json = JSON.stringify(payloads[index]);
    checksum = (Math.imul(checksum, 33) ^ json.length ^ json.charCodeAt(index % json.length)) >>> 0;
  }
  const encoded = performance.now();
  return {
    construction: constructed - start,
    conversion: converted - constructed,
    encoding: encoded - converted,
    combined: converted - start,
    total: encoded - start,
  };
}

export function runBuilderBenchmark(): { discord: Measurements; buncord: Measurements; iterations: number } {
  const iterations = readCount('iterations', 50_000);
  const trials = readCount('trials', 7);
  const warmup = readCount('warmup', 5_000);

  for (const index of [0, 1, 10, 1000]) {
    const payloads = methods.map(method => method.create(index).map(row => row.toJSON()));
    if (!isDeepStrictEqual(payloads[0], payloads[1])) throw new Error(`Different payloads for fixture ${index}`);
  }
  for (const method of methods) measure(method, warmup);

  const samples: Measurements[][] = methods.map(() => []);
  for (let trial = 0; trial < trials; trial++) {
    for (let offset = 0; offset < methods.length; offset++) {
      const index = (trial + offset) % methods.length;
      samples[index]!.push(measure(methods[index]!, iterations));
    }
  }

  console.log(`Bun ${Bun.version}; ${process.platform} ${process.arch}; ${cpus()[0]?.model ?? 'unknown CPU'}`);
  console.log(`${iterations * 2} valid rows/trial; ${trials} trials; ${warmup * 2} warm-up rows/method; alternating order`);
  const summaries = samples.map((sample, index) => {
    const summary = {} as Measurements;
    console.log(methods[index]!.name);
    for (const phase of ['construction', 'conversion', 'encoding', 'combined', 'total'] as const) {
      const values = sample.map(value => value[phase]);
      summary[phase] = median(values);
      console.log(`  ${phase}: ${summary[phase].toFixed(2)} ms median (${Math.min(...values).toFixed(2)} to ${Math.max(...values).toFixed(2)})`);
    }
    return summary;
  });
  console.log(`Checksum: ${checksum}; conversion produces objects, encoding produces JSON; no network measured.`);
  return { discord: summaries[0]!, buncord: summaries[1]!, iterations };
}
