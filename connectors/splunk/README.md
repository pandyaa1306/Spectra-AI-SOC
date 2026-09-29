# Splunk connector + BOTS v3 test data

This connector pulls detections out of Splunk and turns them into Spectra alerts and incidents. You can test it with **Boss of the SOC v3**, Splunk's free (CC0) dataset of a staged attack on the fictional company "Frothly". The same connector later works against a real client Splunk: point `SPLUNK_URL` at it and add your own detections.

```
Splunk (index=botsv3)
   │  REST /services/search/v2/jobs/export (8 SPL detections)
   ▼
scripts/ingest-splunk.ts
   ├─ normalize → security_events (Common Event Model, original time kept)
   ├─ group → alerts   (one per detection + entity, e.g. per host / user / bucket)
   ├─ route → Low/Medium: FusionAI + rule-based report · High/Critical: least-loaded analyst on that client
   └─ correlate → incidents (alerts from different detections sharing a user, host or IP)
   ▼
PostgreSQL → /api/bootstrap → Spectra UI
```

## 1. Run Splunk with BOTS v3 (one time)

You need Docker on an x86-64 machine with about 4 GB RAM and 10 GB of free disk.

```bash
export SPLUNK_PASSWORD='YourStrongPass1!'
bash connectors/splunk/setup-botsv3.sh
```

The script:

1. Downloads `botsv3_data_set.tgz` (320 MB) and verifies its MD5.
2. Starts `splunk/splunk` on `127.0.0.1:8000` (web) and `127.0.0.1:8089` (API).
3. Installs the pre-indexed app and prints event counts by sourcetype.

To check it yourself, open http://localhost:8000 and search `index=botsv3 earliest=0`.

Notes:

- **No add-ons needed.** The Splunk add-ons that BOTS lists (AWS, O365, Sysmon, …) aren't required by the connector, because the detections parse JSON with `spath` and Sysmon XML with `rex`. Install them only if you want to explore the data comfortably in Splunk Web.
- **License.** Pre-indexed data isn't counted against the license's daily ingest limit, so the 60-day trial or Splunk Free both work.
- **Windows.** Run the script from WSL or Git Bash.

## 1b. Windows without Docker (Splunk Enterprise trial, installed natively)

1. **Install Splunk.** Download Splunk Enterprise for Windows from splunk.com (free account, 60-day trial) and run the `.msi`. Choose "Local System" and set an admin password.
2. **Install the BOTS v3 data.** In PowerShell as Administrator:
   ```powershell
   cd $HOME\Downloads
   Invoke-WebRequest https://botsdataset.s3.amazonaws.com/botsv3/botsv3_data_set.tgz -OutFile botsv3.tgz
   tar -xzf botsv3.tgz -C "C:\Program Files\Splunk\etc\apps"
   & "C:\Program Files\Splunk\bin\splunk.exe" restart
   ```
3. **Check the data.** In http://localhost:8000, search `index=botsv3 earliest=0 | stats count by sourcetype`.
4. **Configure Spectra.** Put these lines in `.env.local` in the project folder, using any Postgres (Neon free tier needs no install):
   ```
   DATABASE_URL=postgres://USER:PASS@HOST/DB?sslmode=require
   SPLUNK_URL=https://localhost:8089
   SPLUNK_USERNAME=admin
   SPLUNK_PASSWORD=your-splunk-password
   SPLUNK_VERIFY_TLS=false
   ```
5. **Load and run.** In PowerShell, in the project folder:
   ```powershell
   npm run db:seed
   npm run ingest:splunk -- --client c1 --dry-run
   npm run ingest:splunk -- --client c1
   npm run dev
   ```

After 60 days the trial becomes Splunk Free: 500 MB/day, no login, no users or roles, no alerting. The pre-indexed BOTS data keeps working, but reinstall the trial or get a developer license if you need logins or REST authentication.

## 2. Ingest into Spectra

```bash
export SPLUNK_URL=https://localhost:8089 SPLUNK_USERNAME=admin SPLUNK_VERIFY_TLS=false
export DATABASE_URL=postgres://spectra:change-me@localhost:5432/spectra   # or your Neon/Supabase URL

npm run ingest:splunk -- --client c1 --dry-run   # hits per detection, nothing written
npm run ingest:splunk -- --client c1             # write events, alerts, incidents
npm run dev                                      # alerts appear in Command Center / My SOC
```

- **Client mapping.** `--client` chooses which Spectra client owns the data (c1 Apex, c2 Nexus, c3 AeroTech).
- **Time rebase.** Event times are shifted so the newest BOTS event (Aug 2018) lands at "now". Without this, SLA and aging views would show 8-year-old alerts. Use `--no-rebase` to keep real times; the original timestamp is always stored in `raw_event.original_time`.
- **Re-runs are safe.** Alerts are upserted by detection + entity, and status or assignment changes made by analysts are kept.
- **Other options:** `--only id1,id2`, `--max 2000` (events per detection), `--index botsv3`.

## 3. Detections (`botsv3Detections.ts`)

| id | What it finds | Severity | MITRE |
|---|---|---|---|
| aws-s3-public-acl | S3 bucket ACL granted to AllUsers | High | T1530 |
| aws-create-access-key | New IAM access key issued | Medium | T1098.001 |
| aws-access-denied-burst | 5+ AccessDenied from one identity and IP | Medium | T1580 |
| guardduty-finding | GuardDuty findings (severity from score) | Low–High | varies |
| dns-cryptominer | DNS lookups of Coinhive or mining pools | Medium | T1496 |
| o365-macro-file-upload | .xlsm/.docm/.pptm uploaded to O365 | Medium | T1204.002 |
| sysmon-local-account-created | `net user/localgroup … /add` | High | T1136.001 |
| sysmon-encoded-powershell | `powershell -enc …` | High | T1059.001 |

These searches are behaviour-based starting points, not the BOTS answer key.

- **Tuning.** The first `--dry-run` shows which ones hit. If a detection returns 0, open its SPL in Splunk Web and adjust the field names to what your data actually contains.
- **Adding a detection.** Add an object to the array. The SPL just needs to output any of `hostname user src_ip dest_ip domain file_hash process cmdline object action` (and optionally `spectra_severity` / `spectra_title`).

## 4. Using it for correlation testing

- **Queries to start with:**
  - `SELECT * FROM incidents WHERE id LIKE 'SPL-INC-%'` lists the incidents built from alerts that share entities across detections.
  - `details->'affectedEntities'` and `details->'timeline'` on those rows show why the alerts were linked.
- **Identity matching.** Usernames are normalized, so `FROTHLY\user`, `user@froth.ly` and `user` count as one identity. Generic values such as `aws:*`, `SYSTEM` and localhost are ignored.
- **Next step: Gemini.** Send each incident's timeline plus its linked `security_events` to `/api/gemini/investigate` and store the result in `ai_reports` with `model = GEMINI_MODEL`. The rule-based reports already present use `model = 'spectra-rules'`, so you can compare the two.
