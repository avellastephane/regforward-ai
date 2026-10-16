# RegForward AI

Website for RegForward AI and its CMC regulatory consultant tools. This repository contains the published static site as of October 16, 2026.

## View locally

Serve this directory with any static web server, then open `index.html`. The page uses `styles.css`, `script.js`, and `assets/`; no build step is required.

## Publishing

The current public preview is hosted separately. Pushing this repository does not automatically deploy the preview or the Bolt.new site. Copy these files into the chosen production host when ready.

## Inquiry form

The inquiry form sends submissions to the existing Supabase project using a browser-side public anonymous key and calls its notification function. Before using a new deployment for live traffic, verify the destination, database permissions, notification delivery, and an end-to-end test inquiry. Do not submit confidential client data in a test.
