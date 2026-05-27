# Secrets and environment variables

**Never commit** `.env` to Git.

## Local development

1. Copy: `cp .env.example .env`
2. Set `VITE_API_PROXY_TARGET` (and optional `VITE_API_BASE_URL`) in `.env` only.

The frontend has no database or mail credentials — only API URL settings.

## Production

Configure `VITE_API_BASE_URL` in your hosting provider (Vercel, Netlify, Azure Static Web Apps, etc.) as an environment variable, not in source code.
