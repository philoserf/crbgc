# AGENTS.md

## Project Overview

Static website for the Common & Recent Bogey Golf Club (C&RBGC), hosted via GitHub Pages at crbgc.org. The README.md is auto-rendered as the website homepage.

## Development Commands

Uses Task runner (Taskfile.yml) with Bun:

- `task format` - Format markdown files (prettier)
- `task check` - Check formatting without changes
- `python -m http.server` - Serve site locally on <http://localhost:8000>

## Architecture

Static GitHub Pages site — no build step required. The README.md serves as the homepage content. CNAME maps the custom domain crbgc.org.

Configuration:

- `Taskfile.yml` - Task runner definitions (format, check)

## Important Notes

- Always run `task format` before committing markdown changes
- Keep copyright years current in README.md footer (currently 2022–2025, update to include current year)
- README uses `<abbr>` HTML tags for abbreviation tooltips (e.g., C&RBGC) — this is intentional
