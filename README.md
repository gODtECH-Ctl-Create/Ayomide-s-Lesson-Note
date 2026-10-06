# Ayomide's Lesson Note

A small, single-purpose lesson-note app for **Basic 1 • First Term • 2026 • Weeks 1–10**.

The site is designed for GitHub Pages and reads the source lesson notes from one Google Doc through a Google Apps Script web app.

## Deploy the Google Apps Script

1. Open Google Apps Script: https://script.google.com/
2. Create a new project.
3. Add **gas/Code.gs**.
4. Set the project timezone to **Africa/Lagos** (or use the included manifest).
5. Deploy → **New deployment** → **Web app**.
6. Set **Execute as:** Me.
7. Set **Who has access:** Anyone.
8. Authorize the script when Google asks.
9. Copy the deployed URL ending in **/exec**.

The script is hard-wired to this single Google Doc ID:

`1tGks5xH6VpQvfbQG9CSYayHXY_vWygj1YyjMIXVIswI`

## Connect the app

Open **app.js** and set:

```
appsScriptUrl: "PASTE-YOUR-DEPLOYED-APPS-SCRIPT-URL-HERE"
```

Commit the change to `main`.

## GitHub Pages

The repository already contains **.github/workflows/pages.yml**.

In repository **Settings → Pages**, choose **GitHub Actions** as the deployment source. The workflow will then publish the site after pushes to `main`.

## App features

- Week 1–10 navigation
- Subject filter
- Search across lesson-note content
- Print-friendly current view
- Live Sync from the Google Doc
- Local browser cache when the live source is temporarily unavailable
- Mobile-friendly layout
- One dedicated source document, with no database or content management system
