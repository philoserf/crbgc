# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static website for the Common & Recent Bogey Golf Club (C&RBGC), hosted via GitHub Pages at crbgc.org. `README.md` is auto-rendered as the homepage; `CNAME` maps the custom domain. No build step.

The current next step for this repo is tracked in the workspace backlog at `../NEXT.md` (the `crbgc` row). Read it when starting work; update it when that step ships.

## Development Commands

Task runner (`Taskfile.yml`) with Bun:

- `task format` — Prettier (md, html/Hugo, yaml, toml) + Biome (css), write
- `task check` — same coverage, read-only check
- `task serve` — Hugo dev server with drafts
- `task build` — Hugo production build to `./public`

Prettier uses `prettier-plugin-go-template` for Hugo templates; CSS is delegated to Biome (which also lints). `task prettier` runs the formatter twice because the go-template plugin can need a second pass to converge.

## Conventions

- Run `task format` before committing.
- `<abbr>` HTML tags in `README.md` (e.g., C&RBGC tooltips) are intentional.
- Keep the copyright year range in the `README.md` footer current.
