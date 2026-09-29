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
