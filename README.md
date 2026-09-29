# Spectra AI SOC

This is a demo of an AI-assisted SOC operations platform. It covers 3 enterprise clients (Apex Financial Group, Nexus Health Systems, AeroTech Defense Corp) and 9 Shift 1 analysts, plus FusionAI, the virtual investigator.

## Run locally

Prerequisite: Node.js 20+

```bash
npm install
cp .env.example .env.local     # optional: GEMINI_API_KEY, GEMINI_MODEL, DATABASE_URL
npm run dev                    # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

- **Without `GEMINI_API_KEY`:** the investigation endpoint returns a built-in rule-based answer instead of calling Gemini.
- **Without `DATABASE_URL`:** the UI uses the bundled demo data.

To run against PostgreSQL and connect real security data (Google SecOps, CrowdStrike, Defender, Zscaler), see [db/README.md](db/README.md).

To test with realistic attack data, load Splunk's free BOTS v3 dataset and ingest it through the Splunk connector. See [connectors/splunk/README.md](connectors/splunk/README.md).

## Deploy to Vercel (from GitHub)

1. Push this folder to a **private** GitHub repository. `.env.local` is git-ignored, so keep secrets out of the repo.
2. In Vercel, click **Add New → Project**, import the repo, and check that **Framework Preset = Express** (`vercel.json` sets this). Vercel runs `npm run build`, serves the UI from `public/`, and runs `server.ts` as a function for `/api/*`.
3. Under **Settings → Environment Variables**, add `GEMINI_API_KEY` (optional) and `DATABASE_URL`. Use a cloud Postgres such as Neon, with its **pooled** connection string.
4. Under **Settings → Deployment Protection**, choose **All Deployments + Vercel Authentication**. The app has no login of its own, and without this anyone with the URL can open it.

**Splunk with Vercel:** Vercel can't reach a Splunk running on your PC, and you shouldn't expose port 8089 to the internet. Run `npm run ingest:splunk` on your PC instead: it reads from local Splunk and writes to Neon, and the Vercel app reads from Neon.
