# CLAUDE.md — Fuel Trend Scout Agent

## Project Overview
Next.js 15 app that monitors fuel/gasoline trends in Chile for Copec.
Scrapes X trending topics, Google Trends, regulatory news, and competitor
activity. Scores trends with Claude against Copec brand guidelines.

## Key Commands
```
npm run dev     # Dev server localhost:3000
npm run build   # Production build
npm run start   # Start production
```

## Architecture
- Frontend: React dashboard with tabs (Tendencias, Competencia)
- Backend: API routes as proxies to Anthropic API + Playwright
- Scraping: Playwright for Google Trends, Claude web_search for X and news
- Scoring: Claude with Copec brand context

## API Routes
- `/api/scan-x`        → Claude + web_search → tendencias X Chile sobre combustible
- `/api/scan-trends`   → Playwright → Google Trends combustible Chile
- `/api/scan-news`     → Claude + web_search → noticias regulatorias (MEPCO, impuestos)
- `/api/competitors`   → Claude + web_search + Playwright → Shell, Aramco actividad
- `/api/brand-pulse`   → Playwright → Google Trends Copec vs Shell vs Aramco
- `/api/score`         → Claude + contexto de marca → scoring + propuestas

## Important
- ANTHROPIC_API_KEY must be set in .env.local
- Playwright is used for Google Trends scraping (serverless compatible via playwright-core)
- All API calls go through server-side routes (key NEVER exposed to client)
- Brand: Copec | Competitors: Shell Chile, Aramco Estaciones Chile
- Accent color: #F59E0B (amber/fuel)
