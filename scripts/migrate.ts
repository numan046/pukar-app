import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "ppr.db");
const db = new DatabaseSync(dbPath);
const schema = fs.readFileSync(path.join(process.cwd(), "scripts", "schema.sql"), "utf-8");
db.exec(schema);
db.close();

console.log(`✔ Migrated schema into ${dbPath}`);
