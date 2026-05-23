# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static website for the Common & Recent Bogey Golf Club (C&RBGC), hosted via GitHub Pages at crbgc.org. `README.md` is auto-rendered as the homepage; `CNAME` maps the custom domain. No build step.

The current next step for this repo is tracked in the workspace backlog at `../NEXT.md` (the `crbgc` row). Read it when starting work; update it when that step ships.

## Development Commands

Task runner (`Taskfile.yml`) with Bun:

- `task format` — Format markdown with Prettier (`bunx prettier --write "**/*.md"`)
- `task check` — Check formatting without writing (`bunx prettier --check "**/*.md"`)

## Conventions

- Run `task format` before committing markdown changes.
- `<abbr>` HTML tags in `README.md` (e.g., C&RBGC tooltips) are intentional — allowed in `.markdownlint.json` via the `MD033` allowlist.
- Keep the copyright year range in the `README.md` footer current.
