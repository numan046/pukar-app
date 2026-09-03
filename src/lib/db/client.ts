/**
 * Custom Turso client using direct fetch to Hrana /v2/pipeline API.
 * Replaces @libsql/client which fails on Vercel serverless functions.
 */

// ── Hrana value encoding/decoding ──────────────────────────────

type HranaValue =
  | { type: "null" }
  | { type: "text"; value: string }
  | { type: "integer"; value: string }
  | { type: "float"; value: number }
  | { type: "blob"; base64: string };

function toHranaValue(v: unknown): HranaValue {
  if (v === null || v === undefined) return { type: "null" };
  if (typeof v === "string") return { type: "text", value: v };
  if (typeof v === "number") {
    if (Number.isInteger(v)) return { type: "integer", value: String(v) };
    return { type: "float", value: v };
  }
  if (typeof v === "bigint") return { type: "integer", value: v.toString() };
  if (typeof v === "boolean") return { type: "integer", value: v ? "1" : "0" };
  if (v instanceof Uint8Array) {
    return { type: "blob", base64: btoa(String.fromCharCode(...v)) };
  }
  return { type: "text", value: JSON.stringify(v) };
}

function fromHranaValue(v: HranaValue): unknown {
  switch (v.type) {
    case "null":
      return null;
    case "text":
      return v.value;
    case "integer":
      return parseInt(v.value, 10);
    case "float":
      return v.value;
    case "blob":
      return v.base64;
  }
}

// ── Client interface matching repo.ts usage ────────────────────

type ExecuteInput = string | { sql: string; args: unknown[] };

interface ExecuteResult {
  rows: Record<string, unknown>[];
}

interface TursoClient {
  execute(input: ExecuteInput): Promise<ExecuteResult>;
  batchExecute(stmts: { sql: string; args: unknown[] }[]): Promise<ExecuteResult[]>;
}

// ── Turso Hrana HTTP transport ─────────────────────────────────

let _baseUrl: string;
let _authToken: string;

function getConfig() {
  if (!_baseUrl) {
    let url = process.env.TURSO_DATABASE_URL || "";
    if (url.startsWith("libsql://")) {
      url = url.replace("libsql://", "https://");
    }
    _baseUrl = url;
    _authToken = process.env.TURSO_AUTH_TOKEN || "";
  }
  return { baseUrl: _baseUrl, authToken: _authToken };
}

async function hranaExecute(sql: string, args: unknown[]): Promise<ExecuteResult> {
  const { baseUrl, authToken } = getConfig();
  const apiUrl = `${baseUrl}/v2/pipeline`;

  const hranaArgs = args.map(toHranaValue);

  const body = JSON.stringify({
    requests: [
      {
        type: "execute",
        stmt: { sql, args: hranaArgs },
      },
    ],
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

  let res: Response;
  try {
    res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body,
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") throw new Error("Turso database request timed out (15s). Please try again.");
    throw err;
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Turso HTTP ${res.status}: ${text.substring(0, 300)}`);
  }

  const data = await res.json();

  const result = data.results?.[0];
  if (!result || result.type !== "ok") {
    const errMsg = result?.response?.error?.message || JSON.stringify(result);
    throw new Error(`Turso query error: ${errMsg}`);
  }

  const execResult = result.response.result;
  const cols: string[] = execResult.cols.map((c: { name: string }) => c.name);
  const rawRows: HranaValue[][] = execResult.rows;

  const rows = rawRows.map((rawRow) => {
    const row: Record<string, unknown> = {};
    for (let i = 0; i < cols.length; i++) {
      row[cols[i]] = fromHranaValue(rawRow[i]);
    }
    return row;
  });

  return { rows };
}

async function hranaBatchExecute(stmts: { sql: string; args: unknown[] }[]): Promise<ExecuteResult[]> {
  const { baseUrl, authToken } = getConfig();
  const apiUrl = `${baseUrl}/v2/pipeline`;

  const body = JSON.stringify({
    requests: stmts.map(({ sql, args }) => ({
      type: "execute",
      stmt: { sql, args: args.map(toHranaValue) },
    })),
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

  let res: Response;
  try {
    res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body,
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") throw new Error("Turso database request timed out (15s). Please try again.");
    throw err;
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Turso HTTP ${res.status}: ${text.substring(0, 300)}`);
  }

  const data = await res.json();

  return data.results.map((result: any) => {
    if (result.type !== "ok") {
      const errMsg = result?.response?.error?.message || JSON.stringify(result);
      throw new Error(`Turso batch error: ${errMsg}`);
    }
    const execResult = result.response.result;
    const cols: string[] = execResult.cols.map((c: { name: string }) => c.name);
    const rawRows: HranaValue[][] = execResult.rows;
    const rows = rawRows.map((rawRow) => {
      const row: Record<string, unknown> = {};
      for (let i = 0; i < cols.length; i++) {
        row[cols[i]] = fromHranaValue(rawRow[i]);
      }
      return row;
    });
    return { rows };
  });
}

// ── Singleton client ───────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __pprDb: TursoClient | undefined;
}

function createTursoClient(): TursoClient {
  return {
    execute: (input: ExecuteInput) => {
      if (typeof input === "string") {
        return hranaExecute(input, []);
      }
      return hranaExecute(input.sql, input.args || []);
    },
    batchExecute: (stmts: { sql: string; args: unknown[] }[]) => {
      return hranaBatchExecute(stmts);
    },
  };
}

export function getDb(): TursoClient {
  if (!global.__pprDb) {
    global.__pprDb = createTursoClient();
  }
  return global.__pprDb;
}
