import { describe, expect, it } from 'bun:test';

interface PackageMetadata {
  bin?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  scripts?: Record<string, string>;
}

const metadata = await Bun.file(new URL('../package.json', import.meta.url)).json() as PackageMetadata;

describe('package metadata', () => {
  it('publishes the component CLI from the shipped source tree', () => {
    expect(metadata.bin?.['buncord-builders']).toBe('./src/cli/BuncordCli.ts');
  });

  it('declares Bun as an engine without installing the unrelated bun npm package', () => {
    expect(metadata.engines?.bun).toBe('>=1.1.0');
    expect(metadata.peerDependencies?.bun).toBeUndefined();
  });

  it('runs TypeScript through Bun without requiring a Node executable', () => {
    expect(metadata.scripts?.typecheck).toBe('bun node_modules/typescript/bin/tsc --noEmit');
  });
});
