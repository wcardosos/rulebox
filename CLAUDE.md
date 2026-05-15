# CLAUDE.md

Instructions for AI agents working on **rulebox** — a package manager for AI-agent rules, distributed as a Node.js CLI on npm.

## Project at a glance

- **What it is:** a CLI that lets developers compose stack-specific rule files into a project's `.rules/` directory by running commands like `rulebox add nextjs/app-router drizzle/sqlite`.
- **Repo layout:** monorepo with `cli/` (the published npm package) and `rules/` (the registry, copied into `cli/` at build time).
- **Status:** v0.1.

## Stack — non-negotiable

| Concern | Choice |
|---|---|
| Runtime | Node ≥ 20 |
| Module format | ESM only (no CJS, no dual builds) |
| Language | TypeScript |
| CLI argument parser | `commander` |
| UI renderer | `ink` + `react` |
| Prebuilt UI components | `@inkjs/ui` (Spinner, ConfirmInput, Alert, StatusMessage, Select, ProgressBar) |
| Schema validation | `zod` |
| YAML parser | `yaml` |
| Build | `tsup` (esbuild wrapper) |
| Dev runner | `tsx` |
| Tests | `vitest` + `ink-testing-library` |
| Lint/format | `biome` (do not introduce ESLint or Prettier) |

Hard rules:

- `package.json` must declare `"type": "module"` and `"engines": { "node": ">=20" }`.
- `tsup` config: `entry: 'src/index.tsx'`, `format: ['esm']`, `target: 'node20'`, `banner: { js: '#!/usr/bin/env node' }`, `clean: true`, `sourcemap: true`, `dts: false`.
- `package.json` must include `"files": ["dist", "rules"]` so the registry ships with the package.
- Do not add a CommonJS build. Do not add a dual ESM/CJS setup.
- Do not introduce monorepo tooling (pnpm workspaces, Turborepo, Nx). The repo is intentionally a "raw" monorepo.

## Repository layout

```
rulebox/
├── cli/                      # the only published npm package (name: "rulebox")
│   ├── src/                  # source code (see layered architecture below)
│   ├── rules/                # registry, copied here at build (gitignored)
│   ├── scripts/copy-rules.ts # copies ../rules → ./rules before build
│   ├── dist/                 # build output (gitignored)
│   ├── package.json
│   ├── tsup.config.ts
│   ├── tsconfig.json
│   └── biome.json
├── rules/                    # registry source of truth: <scope>/<name>/{rule.md,package.yml}
└── docs/                     # documentation site (future)
```

### How the registry reaches the user

- The registry lives in `rules/` at the monorepo root.
- At build time, a script copies `rules/` into `cli/rules/`. The published npm package contains it.
- At runtime, `infrastructure/registry-repository.ts` resolves the registry path in this order: `RULEBOX_REGISTRY` env var → `./rules` next to `dist/` (production) → `../../rules` (dev). First existing wins.
- Never hardcode the registry path elsewhere. All registry access goes through `registry-repository.ts`.

## Layered architecture

The CLI source under `cli/src/` is organized into **five layers** with strict, one-way dependency rules. Crossing them in the wrong direction is an architectural bug — refactor instead of working around it.

```
index.tsx
   ↓
cli/            ← terminal adapter (commander, exit codes, render)
   ↓
presentation/   ← Ink components, views, theme
   ↓
application/    ← cores: pure use cases, return Result
   ↓                 ↓
domain/      infrastructure/   (infrastructure depends on domain)
```

### Physical structure

```
cli/src/
├── index.tsx
├── shared/           error-codes.ts
├── domain/           config.ts, rule.ts, package-meta.ts, result.ts
├── infrastructure/   config-repository.ts, registry-repository.ts, composer.ts, fs-utils.ts, tty.ts
├── application/      add.ts, init.ts, install.ts, remove.ts, list.ts, update.ts
├── presentation/
│   ├── theme.ts
│   ├── shared/       ErrorBlock.tsx, RuleStatusLine.tsx, ConfirmPrompt.tsx, useConfirm.ts
│   └── views/        AddView.tsx, InitView.tsx, InstallView.tsx, RemoveView.tsx, ListView.tsx, UpdateView.tsx
└── cli/
    ├── exit-codes.ts
    └── commands/     add.ts, init.ts, install.ts, remove.ts, list.ts, update.ts
```

### Layer responsibilities and import rules

**`shared/`** — pure utilities and cross-cutting constants with no dependencies on other layers. May only import Node builtins (pure ones) and pure libraries. May not import from `domain/`, `infrastructure/`, `application/`, `presentation/`, or `cli/`. Every other layer may import from here. Currently contains only `error-codes.ts` (single source of truth for `ERROR_CODES` and the `ErrorCode` type).

**`domain/`** — types, zod schemas, pure rules. No I/O. May only import Node builtins (pure ones) and pure libraries like zod. May not import from any other layer.

- `config.ts` — `Config` type, zod schema, constants (`CONFIG_VERSION`, `DEFAULT_OUTPUT`).
- `rule.ts` — `RuleName` type, `isValidRuleName`, pure mapping `<scope>/<name>` ↔ `<scope>-<name>.md`.
- `package-meta.ts` — `PackageMeta` type and zod schema for `package.yml`.
- `result.ts` — generic `Result<T, E>` discriminated union (`{ kind: 'ok', value } | { kind: 'error', error }`), helpers `ok()` / `err()`.
- Zod schemas live here because they describe domain invariants, not parsing details.

**`infrastructure/`** — concrete adapters for the outside world (filesystem, environment). May import from `domain/`. May not import from `application/`, `presentation/`, or `cli/`.

- `config-repository.ts` — `readConfig(cwd)`, `writeConfig(cwd, config)`. Reads/parses/validates JSON, writes atomically (temp file + rename).
- `registry-repository.ts` — `listRuleNames()`, `readRule(name)`, `getRegistryRoot()`.
- `composer.ts` — writes/removes rule files in the user's output directory. Owns the in-memory snapshot/rollback primitives (`takeSnapshot`, `rollback`).
- `fs-utils.ts` — `writeAtomic`, `readSafe`, etc.
- `tty.ts` — `isTTY()`, `noColor()` (checks `process.stdout.isTTY` and `NO_COLOR` env var per [no-color.org](https://no-color.org)).
- **Return convention:** return `Result<T, SpecificError>` for predictable failures (file missing, invalid JSON, schema invalid). Throw for genuinely unexpected failures (system I/O, revoked permissions). The application layer catches throws and maps them.

**`application/`** — use cases. One file per command. May import from `domain/` and `infrastructure/`. May not import from `presentation/` or `cli/`.

- Each file exports: a core function (`addCore`, `removeCore`, …) with signature `(args, deps) => Promise<Result>`, the case-specific `Result` type, and a `Deps` type for injected dependencies (`cwd`, UI callbacks, etc.).
- Cores must be pure functions of their inputs and `deps`. They must not know about Ink, commander, or the terminal. Treat them as if they could be called from an HTTP API tomorrow.
- The phase machine (validate → confirm → execute → rollback on failure) lives **linearly inside the core**, not split across core and component.
- Destructive commands (`remove`, `update`) receive a `confirm: () => Promise<boolean>` callback in `deps` and invoke it when they need to pause for confirmation.

**`presentation/`** — Ink components, views, hooks, theme. May import from `application/` and `domain/`. May not import from `infrastructure/` or `cli/`. Components must not touch the filesystem.

- `theme.ts` — centralized palette (colors, symbols, spacing). Visual changes happen here, nowhere else.
- `shared/` — `ErrorBlock` (exhaustive switch on error codes → message), `RuleStatusLine` (e.g. "✓ Added X"), `ConfirmPrompt`, `useConfirm` (the hook that bridges the core's `confirm` callback to the Ink component via a pending promise).
- `views/` — one per command, each following this skeleton: discriminated state `{ kind: 'running' } | { kind: 'done', result }`; one `useEffect` that fires the core; conditional render on `state.kind`; `useApp().exit()` when done; Result reported via `onComplete(result)` prop.
- **Views must not decide the exit code.** They report; `cli/` decides.

**`cli/`** — adapter between terminal world and the rest. May import from `presentation/` and `domain/`. Should not import from `application/` or `infrastructure/` (importing application Result types only for typing `onComplete` is the one acceptable exception).

- `exit-codes.ts` — `exitCodeFor(errorCode)` with an exhaustive switch (TypeScript will complain when a new error code is added without updating the mapping).
- `commands/<name>.ts` — exports `register<Name>(program)` that defines the subcommand on commander and implements the action handler.

**Action handler pattern** (every command follows this):

1. commander parses args.
2. `render(<XView ... onComplete={r => result = r} />)`.
3. `await waitUntilExit()`.
4. If `result.kind === 'error'`, set `process.exitCode = exitCodeFor(result.code)`.
5. Return. Let the event loop drain.

Use `process.exitCode = N`, **never** `process.exit(N)`. The latter kills the process during Ink's terminal cleanup.

## Cross-cutting conventions

### Error handling — Result + throw fallback

- **Predictable errors** (config missing, rule not in registry, no TTY, validation failed) are returned as a discriminated `Result` from the core.
- **Unexpected errors** (bugs, OOM, unknown filesystem failures) are thrown and caught by a global `try/catch` in `index.tsx` around `program.parseAsync()`, which prints the stack trace to stderr and sets exit code 99.

Each core defines its own Result. Example shape:

```ts
type AddResult =
  | { kind: 'success'; ... }
  | { kind: 'error'; code: 'CONFIG_NOT_FOUND' }
  | { kind: 'error'; code: 'INVALID_CONFIG'; details: string }
  | { kind: 'error'; code: 'UNKNOWN_RULES'; rules: string[] }
  | { kind: 'error'; code: 'IO_ERROR'; message: string; rolledBack: boolean };
```

The view's `ErrorBlock` does an exhaustive `switch` on `result.code` to render the right message. Specific messages per cause — never a generic "an error occurred".

### Atomicity and rollback

- Order of operations in any writing command: **validate everything → confirm (if applicable) → write**. If validation fails, nothing is written.
- Before any write, `composer.ts` takes an in-memory snapshot: `Map<filepath, content | null>` (`null` means "file did not exist").
- On mid-execution I/O failure, the core invokes rollback: delete files whose snapshot is `null`; restore content otherwise. Best-effort — record paths that fail to roll back in `partialFailures` on the Result and move on. **No retry loops.**
- Snapshot covers all `.md` files that will be touched, plus `rulebox.json` when modified.

### `rulebox.json` writes are atomic

- Always write via temp file + rename. Use `writeAtomic` from `infrastructure/fs-utils.ts`. All `rulebox.json` writes go through `config-repository.ts`.
- `install`, `update`, and `list` must **never** modify `rulebox.json`, under any circumstance.

### Exit codes

| Category | Code |
|---|---|
| Success | 0 |
| Cancellation via prompt | 0 |
| Input validation (config missing/invalid, no TTY) | 2 |
| Registry validation (unknown rule) | 3 |
| I/O failure | 4 |
| Unexpected bug (global catch) | 99 |

Set via `process.exitCode` in `cli/commands/<name>.ts` only. The `exitCodeFor` switch must be exhaustive.

### Interactive confirmation

- Destructive commands (`remove`, `update`) prompt by default. Default answer is **no**. Accept `y`, `Y`, `yes`, `YES`; anything else cancels.
- `--yes` / `-y` flag skips the prompt.
- If stdin is not a TTY and `--yes` was not passed: **fail** with a specific message. Do not silently proceed and do not silently abort.
- Cancellation prints `Aborted` to stdout and exits 0 (intentional user action, not an error).
- The core receives `confirm: () => Promise<boolean>` in `deps`. The Ink view supplies it via the `useConfirm` hook (pending promise resolved when the user answers). Tests mock the callback directly.

### Output channels and language

- All messages in **English**.
- Success → **stdout**. Errors → **stderr** (use Ink's `stderr: true` option in `render()` or `useStderr()`).
- The choice of channel is made in `cli/commands/<name>.ts`.

### View skeleton (recap)

- Discriminated state only — no scattered booleans.
- One `useEffect` to dispatch the core.
- Success rows use the consolidated vocabulary: `Added`, `Updated`, `Installed`, `Removed`, `Removed <rule> (file was already missing)`.
- Errors delegate to `<ErrorBlock>`.
- `useApp().exit()` when done.
- Report Result through `onComplete(result)`.

## Out of scope for v0.1 — do not build

These were explicitly deferred. Do not introduce them without an explicit request:

- Plain (non-Ink) renderer for CI/pipes.
- Biome lint rule enforcing layer dependency direction.
- A separate `@rulebox/registry` package.
- pnpm workspaces, Turborepo, Nx, or any monorepo tool.
- `--json` or `--plain` output flags.
- User-configurable theme.
- Rule versioning (`name@version` syntax, version directories in the registry, etc.).
- Multiple output formats (Cursor `.mdc`, single `CLAUDE.md`, etc.).
- `search`, `info`, `sync` commands.
- `--dry-run`, `--filter`, `--verbose`, `--all`, `--keep-files`, `--keep-config` flags.
- Diff between disk content and registry in `update`.
- Detection of manual edits before overwriting/deleting.
- Whitelist of non-rule files in the output directory.
- Templates/presets in `init`.
- Interactive mode in `init`.
- Validation that "this is a valid project" (presence of `package.json`, etc.).
- Other config formats (yaml, toml).
- Positional argument for working directory (`rulebox init ./somewhere`). Always use `cwd`.
- Editing the agent's main instruction file (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`).

## Quick reference

| Aspect | Convention |
|---|---|
| Language | TypeScript |
| Runtime | Node ≥ 20 |
| Modules | ESM only |
| CLI parser | `commander` |
| UI | `ink` + `react` + `@inkjs/ui` |
| Validation | `zod` |
| Build | `tsup` |
| Tests | `vitest` + `ink-testing-library` |
| Lint/format | `biome` |
| Repo layout | raw monorepo: `cli/`, `rules/`, `docs/` (future) |
| Published package | `cli/` only, with `rules/` copied at build |
| Internal layers | `domain` ← `infrastructure` ← `application` ← `presentation` ← `cli` |
| Error handling | Discriminated `Result` in cores; throw for bugs |
| Interactive confirmation | Callback injected into core deps |
| Atomicity | In-memory snapshot + best-effort rollback |
| `rulebox.json` writes | Atomic via temp + rename |
| Exit code | Set in `cli/commands/<name>.ts` via `process.exitCode` |
| Terminal cleanup | Through Ink; never `process.exit()` |