# Dueable Extension

This Chrome side-panel extension connects Canvas to the Dueable web app.

## Production Origin

Set the packaged extension origin explicitly before you build it:

```bash
VITE_DUEABLE_WEB_ORIGIN=https://your-domain.com
```

That origin is used for:

- login and signup handoff
- extension overview requests
- semester import requests
- assignment completion requests

## Local Development Override

To point the extension at a local web app during development, create an env file for Vite and override the origin:

```bash
VITE_DUEABLE_WEB_ORIGIN=http://localhost:3000
```

You can also use `VITE_DUEABLE_DASHBOARD_URL`, but `VITE_DUEABLE_WEB_ORIGIN` is the preferred setting.

The root `manifest.json` keeps localhost host permissions so an unpacked local extension can talk to the local web app.

## Build

```bash
npm run build --workspace @dueable/extension
```

## Chrome Web Store Packaging

```bash
VITE_DUEABLE_WEB_ORIGIN=https://your-domain.com npm run package:store --workspace @dueable/extension
```

This creates `apps/extension/dueable-extension-production.zip`.

`package:store` now requires `VITE_DUEABLE_WEB_ORIGIN` so the packaged build and generated manifest both point at the same deployed domain.

Before upload, keep `manifest.json` production-only. Do not add localhost host permissions to the store build.
