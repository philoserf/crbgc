# CRBGC Development Guide

## Build & Deployment

- This is a static website hosted via GitHub Pages at crbgc.org
- No build commands required - GitHub Pages auto-renders README.md as index.html
- Test site locally using: `python -m http.server` then visit <http://localhost:8000>

## Formatting & Linting

- Format markdown: `task format`
- Check formatting: `task check`
- Individual commands:
  - Prettier: `task prettier`
  - Markdownlint: `task markdownlint`
- Uses default Prettier and markdownlint configurations

## Code Style Guidelines

- Keep markdown syntax clean and consistent
- Follow consistent indentation (2 spaces)
- Images should include descriptive alt text for accessibility
- Use relative links for internal navigation
- Keep copyright and trademark notices updated
- Ensure all content is responsive (viewable on mobile devices)
- Use descriptive, semantic filenames (e.g., golf-ball-in-grass.jpeg)

## Repository Structure

- Root directory contains primary markdown content and assets
- CNAME file provides GitHub Pages custom domain configuration
- README.md serves as the main website content (auto-rendered by GitHub Pages)
- LICENSE contains the Unlicense (public domain) declaration
- taskfile.yml - Task runner for formatting and linting

## Versioning & Updates

- Use clear commit messages describing changes
- Update copyright years in both README.md and LICENSE
- Maintain consistent branding (trademark symbols, etc.)
- Keep file sizes optimized for web viewing
