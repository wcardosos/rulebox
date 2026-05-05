# rulebox

> ⚠️ **Work in progress** — this project is under active development. APIs, commands, and behavior are subject to change. Not yet ready for production use.

A package manager for AI agent rules. Compose and install coding best practices for your stack, instead of copying monolithic rule files from somewhere else.

## What it does

`rulebox` lets you compose specific pieces of agent guidance (Cursor, Claude Code, Copilot, etc.) tailored to your stack, via a simple CLI:

```bash
rulebox init
rulebox add nextjs/app-router drizzle/sqlite typescript/strict
```

This generates a `.rules/` directory in your project, with one markdown file per rule. You then reference these files from your project's `AGENTS.md` / `CLAUDE.md` so your agent picks up the right guidance for the task at hand.

## Why

Most teams today copy-paste rules from repositories like `awesome-cursorrules`, ending up with bloated, hard-to-maintain instruction files. `rulebox` treats agent rules like packages: small, composable, versioned with your project, and easy to update.

## Status

The v0.1 is being designed and built. Planned commands:

- `rulebox init` — initialize `rulebox.json` in your project
- `rulebox add <rule>...` — add one or more rules
- `rulebox install` — materialize rules declared in `rulebox.json`
- `rulebox remove <rule>...` — remove rules
- `rulebox list` — list installed rules
- `rulebox update` — regenerate rule files from the registry

Stay tuned.

## License

TBD.