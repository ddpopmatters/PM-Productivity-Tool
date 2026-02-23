# PM Productivity Tool (Momentum Hub)

React + Vite + Tailwind + Supabase productivity app for Population Matters.

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS + PostCSS
- **Backend**: Supabase (auth, database, storage)
- **Icons**: Lucide React | **Charts**: Recharts | **Virtualisation**: react-window

## Commands

```bash
npm run dev      # Dev server (http://localhost:5173)
npm run build    # Production build
npm run preview  # Preview production build
```

## Structure

```
src/
├── components/  # React components (PascalCase)
├── lib/         # Utilities and Supabase client
├── styles/      # Global CSS
└── main.jsx     # Entry point
```

## Styling

Consult `docs/STYLING-GUIDE.md` for PM colour system. PM Primary Green: `#00A651`.
This is an **internal tool** — font is Neue Haas Grotesk, NOT BG Neue Plak (that's website only).

## Supabase

Client in `src/lib/supabase.js`. Auth state managed at app level.
Environment: copy `.env.example` to `.env`. Never commit `.env`.

## Before Committing

- `npm run build` succeeds
- No console errors
- Key user flows tested
