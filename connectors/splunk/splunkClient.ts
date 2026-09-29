/**
 * Minimal Splunk REST client — streams results from the export endpoint.
 * Works with Splunk Enterprise / Free / Cloud (management port 8089).
 *
 * Env:
 *   SPLUNK_URL          https://localhost:8089
 *   SPLUNK_TOKEN        auth token (preferred)   — or —
 *   SPLUNK_USERNAME / SPLUNK_PASSWORD
 *   SPLUNK_VERIFY_TLS   "false" for a local instance with the default self-signed cert
 */
import http from 'http';
import https from 'https';
import readline from 'readline';

export interface SplunkConfig {
  url: string;
  token?: string;
  username?: string;
  password?: string;
  verifyTls: boolean;
}

export type SplunkRow = Record<string, string | string[] | undefined>;

export function splunkConfigFromEnv(): SplunkConfig {
  return {
    url: (process.env.SPLUNK_URL || 'https://localhost:8089').replace(/\/$/, ''),
    token: process.env.SPLUNK_TOKEN || undefined,
    username: process.env.SPLUNK_USERNAME || undefined,
    password: process.env.SPLUNK_PASSWORD || undefined,
    verifyTls: process.env.SPLUNK_VERIFY_TLS !== 'false',
  };
}

function authHeader(cfg: SplunkConfig): string {
  if (cfg.token) return `Bearer ${cfg.token}`;
  if (cfg.username && cfg.password) {
    return `Basic ${Buffer.from(`${cfg.username}:${cfg.password}`).toString('base64')}`;
  }
  throw new Error('Set SPLUNK_TOKEN or SPLUNK_USERNAME + SPLUNK_PASSWORD');
}

/**
 * Runs a search through /services/search/v2/jobs/export and yields each result row as it streams in.
 * `spl` must start with a generating command, e.g. "search index=botsv3 ...".
 */
export async function* exportSearch(
  cfg: SplunkConfig,
  spl: string,
  opts: { earliest?: string; latest?: string } = {}
): AsyncGenerator<SplunkRow> {
  const body = new URLSearchParams({
    search: spl,
    output_mode: 'json',
    earliest_time: opts.earliest ?? '0',
    latest_time: opts.latest ?? 'now',
  }).toString();

  const url = new URL(`${cfg.url}/services/search/v2/jobs/export`);
  const client = url.protocol === 'http:' ? http : https;

  const res: http.IncomingMessage = await new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader(cfg),
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
        rejectUnauthorized: cfg.verifyTls,
      },
      resolve
    );
    req.on('error', reject);
    req.setTimeout(10 * 60 * 1000, () => req.destroy(new Error('Splunk export timed out')));
    req.end(body);
  });

  if (res.statusCode !== 200) {
    let text = '';
    for await (const chunk of res) text += chunk;
    throw new Error(`Splunk export HTTP ${res.statusCode}: ${text.slice(0, 500)}`);
  }

  // Export streams one JSON object per line: {"preview":false,"result":{...}} plus occasional message lines
  const rl = readline.createInterface({ input: res, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj: any;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (obj.messages?.length) {
      for (const m of obj.messages) {
        if (m.type === 'FATAL' || m.type === 'ERROR') throw new Error(`Splunk search error: ${m.text}`);
      }
    }
    if (obj.result && obj.preview !== true) yield obj.result as SplunkRow;
  }
}

/** Quick connectivity/auth check. */
export async function ping(cfg: SplunkConfig): Promise<string> {
  for await (const row of exportSearch(cfg, '| makeresults | eval ok="spectra"', {})) {
    return String(row.ok ?? 'ok');
  }
  return 'no-rows';
}
