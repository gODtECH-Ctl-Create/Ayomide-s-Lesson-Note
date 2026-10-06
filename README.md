# Ayomide's Lesson Note

A single-purpose **Basic 1 • First Term • 2026 • Weeks 1–10** lesson-note app for GitHub Pages.

## Important

The lesson notes are now **built directly into the app** as `lesson-data.json`.

The app does **not** depend on Google Apps Script or a live Google Doc to display lessons. This avoids the loading and cross-origin problems we were seeing.

The source used to build the bundled lesson data is the supplied lesson-note document:

`1tGks5xH6VpQvfbQG9CSYayHXY_vWygj1YyjMIXVIswI`

## Features

- Week 1–10 navigation
- Subject filter
- Search through the lesson note
- Full lesson-note sections
- Print-friendly view
- Mobile-friendly layout
- Built-in lesson data, so the app works without an external content service

## GitHub Pages

The repository contains `.github/workflows/pages.yml`.

In **Settings → Pages**, select **GitHub Actions** as the deployment source. Once enabled, pushes to `main` deploy the site.

Google Apps Script files may remain in the repository for reference, but the live app no longer uses them.
