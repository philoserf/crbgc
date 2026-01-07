# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static website for the Common & Recent Bogey Golf Club (C&RBGC), hosted via GitHub Pages at crbgc.org. The README.md is auto-rendered as the website homepage.

## Development Commands

Uses Task runner (taskfile.yml) with Bun:

- `task format` - Format and fix markdown files (prettier + markdownlint)
- `task check` - Check formatting without changes
- `python -m http.server` - Serve site locally on <http://localhost:8000>

## Architecture

Static GitHub Pages site - no build step required. The README.md serves as the homepage content.

Configuration:

- `.markdownlint.json` - Disables MD013 (line length), allows `<abbr>` tags in MD033

## Important Notes

- Always run `task format` before committing markdown changes
- Keep copyright years current in README.md footer (currently 2022-2025)
