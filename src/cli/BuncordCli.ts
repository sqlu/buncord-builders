import { runComponentCli } from './ComponentCli.ts';

process.exitCode = await runComponentCli(Bun.argv.slice(2));
