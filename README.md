# Daily Grace

Daily Grace is a Korean devotional journaling app for daily Q.T, prayer, gratitude, diary entries, custom records, and verse card creation.

## Tech Stack

- React 18, Vite, TypeScript
- Tailwind CSS and shadcn/ui components
- React Router
- localStorage-first record storage
- Cloudflare Pages Functions and D1 for authenticated cloud sync
- OpenAI image generation endpoint for verse card backgrounds

## Main Features

- Daily dashboard with goal progress and streaks
- Q.T, prayer, gratitude, and diary CRUD flows
- Custom record categories
- Calendar, search, and unified record views
- Login modal and cookie-based session auth
- Verse card designer and card vault
- Notification settings

## Project Structure

```text
src/
  pages/                 Route screens
  components/            Shared UI and app components
  components/ui/         shadcn/ui primitives
  hooks/                 Auth, sync, and UI hooks
  utils/                 Storage, query, export, notification helpers
  config/                Routes and menu config
functions/api/           Cloudflare Pages API routes
db/                      Database schema
```

## Development

Install dependencies:

```bash
npm install
```

Start the Vite dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run checks:

```bash
npm run lint
npx tsc --noEmit
```

## Environment

Cloudflare Pages Functions require production secrets and bindings such as `DB`, `APP_ORIGIN`, Google OAuth credentials, Resend, and `OPENAI_API_KEY`.

## Deployment Notes

The Cloudflare Pages output directory is `dist`, configured in `wrangler.toml`.

Records are written locally first and then synced to `/api/data/*` when the user is authenticated. Be careful when changing sync behavior, because empty cloud responses and local-only records need an explicit merge policy.
