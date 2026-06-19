# Contributing to @buncord/builders

So you want to contribute? Great! Here is how to get your environment ready.

## Setup
We use Bun. Do not use npm or yarn.
Make sure you have Bun installed. If not, go install it.

Then, clone the repo and run:
```bash
bun install
```

## Running tests
We write tests for everything. Before making a PR, make sure your tests pass.
Run the tests using:
```bash
bun test
```
If you want to run tests with coverage:
```bash
bun test --coverage
```
We strive for 100% coverage on new features.

## Typechecking
We have type checking enabled. Run:
```bash
bun run typecheck
```
Your code must compile cleanly without errors or unused `@ts-expect-error` directives.

## Submitting Pull Requests
1. Create a new branch for your changes.
2. Code your changes. Keep it simple and clean.
3. Make sure to whitelist new keys in `toJSON()` to avoid payload pollution.
4. Run `bun test` and `bun run typecheck`.
5. Submit a PR. We will check it.
