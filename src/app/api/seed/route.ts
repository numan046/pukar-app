import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { scryptSync, randomBytes } from "node:crypto";

// ── Hrana helpers ──────────────────────────────────────────────
function toHrana(v: unknown): Record<string, unknown> {
  if (v === null || v === undefined) return { type: "null" };
  if (typeof v === "string") return { type: "text", value: v };
  if (typeof v === "number") return Number.isInteger(v) ? { type: "integer", value: String(v) } : { type: "float", value: v };
  if (typeof v === "boolean") return { type: "integer", value: v ? "1" : "0" };
  return { type: "text", value: String(v) };
}

let _baseUrl = "";
let _authToken = "";
function getConfig() {
  if (!_baseUrl) {
    let url = process.env.TURSO_DATABASE_URL || "";
    if (url.startsWith("libsql://")) url = url.replace("libsql://", "https://");
    _baseUrl = url;
    _authToken = process.env.TURSO_AUTH_TOKEN || "";
  }
  return { baseUrl: _baseUrl, authToken: _authToken };
}

async function exec(sql: string, args: unknown[] = []) {
  const { baseUrl, authToken } = getConfig();
  const body = JSON.stringify({
    requests: [{ type: "execute", stmt: { sql, args: args.map(toHrana) } }],
  });
  const res = await fetch(`${baseUrl}/v2/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
    body,
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`HTTP ${res.status}: ${t.substring(0, 300)}`); }
  const data = await res.json();
  const r = data.results?.[0];
  if (r?.type === "error") throw new Error(r.response?.error?.message || JSON.stringify(r));
  return r?.response?.result;
}

function newId(prefix = ""): string { const r = randomBytes(9).toString("base64url"); return prefix ? `${prefix}_${r}` : r; }
function complaintCodeFn(year: number, seq: number): string { return `PPR-${year}-${String(seq).padStart(5, "0")}`; }
function hashPassword(pw: string): string { const salt = randomBytes(16).toString("hex"); const h = scryptSync(pw, salt, 64).toString("hex"); return `${salt}:${h}`; }

const DEMO_PASSWORD = "Demo@1234";

export async function POST() {
  const log: string[] = [];
  try {
    // 1. Drop tables
    const drops = ["complaint_updates", "complaint_history", "notifications", "complaints", "issue_categories", "departments", "users", "districts"];
    for (const t of drops) {
      try { await exec(`DROP TABLE IF EXISTS ${t}`); } catch (e: any) { log.push(`Drop ${t}: ${e.message}`); }
    }
    log.push("Tables dropped.");

    // 2. Schema
    const schemaStatements = [
      `CREATE TABLE IF NOT EXISTS districts (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL, phone TEXT, department_id TEXT, district_id TEXT, designation TEXT, language TEXT NOT NULL DEFAULT 'EN', is_active INTEGER NOT NULL DEFAULT 1, must_change_password INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS departments (id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT, officer_id TEXT, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS issue_categories (id TEXT PRIMARY KEY, department_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (department_id) REFERENCES departments(id))`,
      `CREATE TABLE IF NOT EXISTS complaints (id TEXT PRIMARY KEY, complaint_code TEXT UNIQUE NOT NULL, citizen_id TEXT NOT NULL, title TEXT, description TEXT NOT NULL, language TEXT NOT NULL DEFAULT 'EN', category TEXT, sub_category TEXT, category_id TEXT, department_id TEXT, district_id TEXT, latitude REAL NOT NULL, longitude REAL NOT NULL, address TEXT, area TEXT, tehsil TEXT, has_image INTEGER NOT NULL DEFAULT 0, has_video INTEGER NOT NULL DEFAULT 0, media_urls TEXT NOT NULL DEFAULT '[]', ai_suggestion TEXT, ai_confidence REAL, ai_mode TEXT, status TEXT NOT NULL DEFAULT 'PENDING', assigned_officer_id TEXT, assigned_employee_id TEXT, deadline TEXT, assignment_instructions TEXT, resolved_at TEXT, resolution_note TEXT, resolution_proof TEXT, resolved_by_id TEXT, citizen_verification TEXT, citizen_remarks TEXT, verification_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
      `CREATE TABLE IF NOT EXISTS complaint_updates (id TEXT PRIMARY KEY, complaint_id TEXT NOT NULL, user_id TEXT NOT NULL, update_type TEXT NOT NULL, message TEXT, proof_data TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (complaint_id) REFERENCES complaints(id))`,
      `CREATE TABLE IF NOT EXISTS complaint_history (id TEXT PRIMARY KEY, complaint_id TEXT NOT NULL, user_id TEXT, action TEXT NOT NULL, old_status TEXT, new_status TEXT, description TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (complaint_id) REFERENCES complaints(id))`,
      `CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, complaint_id TEXT, type TEXT NOT NULL, title_en TEXT NOT NULL, title_ur TEXT NOT NULL, body_en TEXT NOT NULL, body_ur TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id))`,
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
      `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`,
      `CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id)`,
      `CREATE INDEX IF NOT EXISTS idx_users_district ON users(district_id)`,
      `CREATE INDEX IF NOT EXISTS idx_complaints_citizen ON complaints(citizen_id)`,
      `CREATE INDEX IF NOT EXISTS idx_complaints_department ON complaints(department_id)`,
      `CREATE INDEX IF NOT EXISTS idx_complaints_district ON complaints(district_id)`,
      `CREATE INDEX IF NOT EXISTS idx_complaints_employee ON complaints(assigned_employee_id)`,
      `CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status)`,
      `CREATE INDEX IF NOT EXISTS idx_complaints_officer ON complaints(assigned_officer_id)`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read)`,
      `CREATE INDEX IF NOT EXISTS idx_complaint_history ON complaint_history(complaint_id)`,
      `CREATE INDEX IF NOT EXISTS idx_complaint_updates ON complaint_updates(complaint_id)`,
      `CREATE INDEX IF NOT EXISTS idx_issue_categories_dept ON issue_categories(department_id)`,
    ];
    for (const s of schemaStatements) {
      try { await exec(s); } catch (e: any) { log.push(`Schema: ${e.message}`); }
    }
    log.push("Schema created.");

    // 3. Districts
    const districtNames = ["Sialkot", "Gujranwala", "Lahore", "Gujrat", "Faisalabad", "Multan", "Rawalpindi", "Islamabad"];
    const districts = districtNames.map(name => ({ id: newId("dst"), name }));
    const districtIds: Record<string, string> = {};
    for (const d of districts) {
      await exec("INSERT INTO districts (id, name) VALUES (?,?)", [d.id, d.name]);
      districtIds[d.name] = d.id;
    }
    log.push(`${districts.length} districts created.`);

    // 4. Departments
    const departments = [
      { id: newId("dept"), name: "Gas Department", slug: "gas-department", description: "Gas supply, leaks, and infrastructure" },
      { id: newId("dept"), name: "Electricity Department", slug: "electricity-department", description: "Power supply, wiring, and electrical infrastructure" },
      { id: newId("dept"), name: "Roads & Infrastructure Department", slug: "roads-department", description: "Road damage, potholes, and infrastructure" },
      { id: newId("dept"), name: "Water & Sanitation Department", slug: "water-drainage-department", description: "Waterlogging, drainage, and sanitation" },
    ];
    const deptIds: Record<string, string> = {};
    for (const d of departments) {
      await exec("INSERT INTO departments (id, name, slug, description) VALUES (?,?,?,?)", [d.id, d.name, d.slug, d.description]);
      deptIds[d.slug] = d.id;
    }
    log.push(`${departments.length} departments created.`);

    // 5. Categories
    const categories = [
      { s: "gas-department", n: "Gas Leak" }, { s: "gas-department", n: "Low Gas Pressure" },
      { s: "gas-department", n: "Gas Meter Issue" }, { s: "gas-department", n: "New Gas Connection" },
      { s: "electricity-department", n: "Power Outage" }, { s: "electricity-department", n: "Exposed Wiring" },
      { s: "electricity-department", n: "Damaged Electric Pole" }, { s: "electricity-department", n: "Transformer Issue" },
      { s: "roads-department", n: "Pothole" }, { s: "roads-department", n: "Cracked Road" },
      { s: "roads-department", n: "Road Collapse" },
      { s: "water-drainage-department", n: "Waterlogging" }, { s: "water-drainage-department", n: "Blocked Drainage" },
      { s: "water-drainage-department", n: "Sewage Overflow" }, { s: "water-drainage-department", n: "Pipeline Burst" },
    ];
    for (const c of categories) {
      await exec("INSERT INTO issue_categories (id, department_id, name) VALUES (?,?,?)", [newId("cat"), deptIds[c.s], c.n]);
    }
    log.push(`${categories.length} categories created.`);

    // 6. Users
    const passwordHash = hashPassword(DEMO_PASSWORD);
    const userIds: Record<string, string> = {};
    const seedUsers = [
      { name: "System Admin", email: "admin@ppr.ai", role: "SUPER_ADMIN" },
      { name: "CM Officer", email: "cm@ppr.ai", role: "CM", designation: "Chief Minister" },
      { name: "Gas CMO", email: "gas-cmo@ppr.ai", role: "CMO", department: "gas-department", designation: "Gas Chief Officer" },
      { name: "Electricity CMO", email: "electricity-cmo@ppr.ai", role: "CMO", department: "electricity-department", designation: "Electricity Chief Officer" },
      { name: "Roads CMO", email: "roads-cmo@ppr.ai", role: "CMO", department: "roads-department", designation: "Roads Chief Officer" },
      { name: "Water CMO", email: "water-cmo@ppr.ai", role: "CMO", department: "water-drainage-department", designation: "Water Chief Officer" },
      { name: "Tariq Mehmood", email: "gas-officer-sialkot@ppr.ai", role: "DEPARTMENT_OFFICER", department: "gas-department", district: "Sialkot" },
      { name: "Ahmed Gas", email: "gas-officer-gujranwala@ppr.ai", role: "DEPARTMENT_OFFICER", department: "gas-department", district: "Gujranwala" },
      { name: "Bilal Ahmed", email: "electricity-officer-sialkot@ppr.ai", role: "DEPARTMENT_OFFICER", department: "electricity-department", district: "Sialkot" },
      { name: "Naveed Electric", email: "electricity-officer-lahore@ppr.ai", role: "DEPARTMENT_OFFICER", department: "electricity-department", district: "Lahore" },
      { name: "Sana Malik", email: "roads-officer-sialkot@ppr.ai", role: "DEPARTMENT_OFFICER", department: "roads-department", district: "Sialkot" },
      { name: "Zubair Road", email: "roads-officer-faisalabad@ppr.ai", role: "DEPARTMENT_OFFICER", department: "roads-department", district: "Faisalabad" },
      { name: "Usman Ali", email: "water-officer-sialkot@ppr.ai", role: "DEPARTMENT_OFFICER", department: "water-drainage-department", district: "Sialkot" },
      { name: "Faisal Water", email: "water-officer-multan@ppr.ai", role: "DEPARTMENT_OFFICER", department: "water-drainage-department", district: "Multan" },
      { name: "Ahmed Khan", email: "gas-emp1-sialkot@ppr.ai", role: "EMPLOYEE", department: "gas-department", district: "Sialkot" },
      { name: "Farhan Saeed", email: "gas-emp2-sialkot@ppr.ai", role: "EMPLOYEE", department: "gas-department", district: "Sialkot" },
      { name: "Kashif Gas", email: "gas-emp1-gujranwala@ppr.ai", role: "EMPLOYEE", department: "gas-department", district: "Gujranwala" },
      { name: "Kamran Ali", email: "elec-emp1-sialkot@ppr.ai", role: "EMPLOYEE", department: "electricity-department", district: "Sialkot" },
      { name: "Nadeem Elec", email: "elec-emp2-sialkot@ppr.ai", role: "EMPLOYEE", department: "electricity-department", district: "Sialkot" },
      { name: "Lahore Elec", email: "elec-emp1-lahore@ppr.ai", role: "EMPLOYEE", department: "electricity-department", district: "Lahore" },
      { name: "Imran Worker", email: "road-emp1-sialkot@ppr.ai", role: "EMPLOYEE", department: "roads-department", district: "Sialkot" },
      { name: "Zahid Hussain", email: "road-emp2-sialkot@ppr.ai", role: "EMPLOYEE", department: "roads-department", district: "Sialkot" },
      { name: "Salman Raza", email: "water-emp1-sialkot@ppr.ai", role: "EMPLOYEE", department: "water-drainage-department", district: "Sialkot" },
      { name: "Waqas Ahmed", email: "water-emp2-sialkot@ppr.ai", role: "EMPLOYEE", department: "water-drainage-department", district: "Sialkot" },
      { name: "Ayesha Khan", email: "citizen@ppr.ai", role: "CITIZEN" },
    ];
    for (const u of seedUsers) {
      const uid = newId("usr");
      userIds[u.email] = uid;
      const deptId = (u as any).department ? deptIds[(u as any).department] : null;
      const distId = (u as any).district ? districtIds[(u as any).district] : null;
      await exec(
        `INSERT INTO users (id,name,email,password_hash,role,phone,department_id,district_id,designation,language,is_active,must_change_password) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [uid, u.name, u.email, passwordHash, u.role, "+92300" + Math.floor(1000000 + Math.random() * 8999999), deptId, distId, (u as any).designation ?? null, "EN", 1, 0]
      );
    }
    for (let i = 1; i <= 5; i++) {
      const uid = newId("usr");
      userIds[`citizen${i}@ppr.ai`] = uid;
      await exec(
        `INSERT INTO users (id,name,email,password_hash,role,phone,department_id,district_id,designation,language,is_active,must_change_password) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [uid, `Citizen ${i}`, `citizen${i}@ppr.ai`, passwordHash, "CITIZEN", "+92300" + Math.floor(1000000 + Math.random() * 8999999), null, null, null, "EN", 1, 0]
      );
    }
    log.push(`${seedUsers.length + 5} users created.`);

    // 7. Complaints
    const citizenIds = Object.entries(userIds).filter(([e]) => e.startsWith("citizen")).map(([, id]) => id);
    const samples = [
      { title: "Gas leak near mosque", desc: "Gas leak from the pipeline near the mosque.", cat: "Gas-related Issues", sub: "Gas Leak", dept: "gas-department", district: "Sialkot", status: "PENDING" },
      { title: "Low gas pressure", desc: "Gas pressure bohat low hai.", cat: "Gas-related Issues", sub: "Low Gas Pressure", dept: "gas-department", district: "Sialkot", status: "ASSIGNED" },
      { title: "Gas meter kharab", desc: "Gas meter kharab ho gaya.", cat: "Gas-related Issues", sub: "Gas Meter Issue", dept: "gas-department", district: "Sialkot", status: "IN_PROGRESS" },
      { title: "Power outage in area", desc: "Bijli 3 ghante se gayab hai.", cat: "Electricity-related Issues", sub: "Power Outage", dept: "electricity-department", district: "Sialkot", status: "PENDING" },
      { title: "Broken electricity pole", desc: "Electric pole toot kar girne wala hai.", cat: "Electricity-related Issues", sub: "Exposed Wiring", dept: "electricity-department", district: "Sialkot", status: "ASSIGNED" },
      { title: "Road pothole on main street", desc: "Sarak par bohat bara gaddha hai.", cat: "Road Damage", sub: "Pothole", dept: "roads-department", district: "Sialkot", status: "PENDING" },
      { title: "Cracked road near school", desc: "School ke samne sarak tooti hui hai.", cat: "Road Damage", sub: "Cracked Road", dept: "roads-department", district: "Sialkot", status: "IN_PROGRESS" },
      { title: "Waterlogging after rain", desc: "Barish ke baad pani jama hai.", cat: "Waterlogging / Standing Water", sub: "Water Accumulation", dept: "water-drainage-department", district: "Sialkot", status: "PENDING" },
      { title: "Sewage overflow", desc: "Nala block hai, ganda pani beh raha hai.", cat: "Waterlogging / Standing Water", sub: "Sewage Overflow", dept: "water-drainage-department", district: "Sialkot", status: "ASSIGNED" },
      { title: "Pipeline burst", desc: "Pani ki pipe phat gayi.", cat: "Waterlogging / Standing Water", sub: "Pipeline Burst", dept: "water-drainage-department", district: "Sialkot", status: "MARKED_RESOLVED" },
      { title: "Gas leak residential", desc: "Gas leak from underground pipeline.", cat: "Gas-related Issues", sub: "Gas Leak", dept: "gas-department", district: "Gujranwala", status: "PENDING" },
      { title: "Transformer burning", desc: "Transformer se aag lagne ki awaaz.", cat: "Electricity-related Issues", sub: "Transformer Issue", dept: "electricity-department", district: "Lahore", status: "ASSIGNED" },
      { title: "Road collapse", desc: "Sarak dhans gayi hai.", cat: "Road Damage", sub: "Road Collapse", dept: "roads-department", district: "Faisalabad", status: "PENDING" },
      { title: "Blocked drainage", desc: "Nala block hai.", cat: "Waterlogging / Standing Water", sub: "Blocked Drainage", dept: "water-drainage-department", district: "Multan", status: "IN_PROGRESS" },
    ];
    const officerLookup: Record<string, string> = {
      "gas-department:Sialkot": userIds["gas-officer-sialkot@ppr.ai"],
      "gas-department:Gujranwala": userIds["gas-officer-gujranwala@ppr.ai"],
      "electricity-department:Sialkot": userIds["electricity-officer-sialkot@ppr.ai"],
      "electricity-department:Lahore": userIds["electricity-officer-lahore@ppr.ai"],
      "roads-department:Sialkot": userIds["roads-officer-sialkot@ppr.ai"],
      "roads-department:Faisalabad": userIds["roads-officer-faisalabad@ppr.ai"],
      "water-drainage-department:Sialkot": userIds["water-officer-sialkot@ppr.ai"],
      "water-drainage-department:Multan": userIds["water-officer-multan@ppr.ai"],
    };
    const employeeLookup: Record<string, string[]> = {
      "gas-department:Sialkot": [userIds["gas-emp1-sialkot@ppr.ai"], userIds["gas-emp2-sialkot@ppr.ai"]],
      "gas-department:Gujranwala": [userIds["gas-emp1-gujranwala@ppr.ai"]],
      "electricity-department:Sialkot": [userIds["elec-emp1-sialkot@ppr.ai"], userIds["elec-emp2-sialkot@ppr.ai"]],
      "electricity-department:Lahore": [userIds["elec-emp1-lahore@ppr.ai"]],
      "roads-department:Sialkot": [userIds["road-emp1-sialkot@ppr.ai"], userIds["road-emp2-sialkot@ppr.ai"]],
      "water-drainage-department:Sialkot": [userIds["water-emp1-sialkot@ppr.ai"], userIds["water-emp2-sialkot@ppr.ai"]],
    };

    let seq = 1;
    const now = new Date();
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const cmpId = newId("cmp");
      const code = complaintCodeFn(now.getFullYear(), seq++);
      const citizenId = citizenIds[i % citizenIds.length];
      const officerId = officerLookup[`${s.dept}:${s.district}`];
      const emps = employeeLookup[`${s.dept}:${s.district}`] || [];
      const empId = emps.length > 0 ? emps[i % emps.length] : null;
      const hoursAgo = (samples.length - i) * 6;
      const createdAt = new Date(now.getTime() - hoursAgo * 3600000).toISOString();
      const deadline = s.status !== "PENDING" ? new Date(now.getTime() + 72 * 3600000).toISOString() : null;
      const districtId = districtIds[s.district];

      await exec(
        `INSERT INTO complaints (id,complaint_code,citizen_id,title,description,language,category,sub_category,department_id,district_id,latitude,longitude,address,status,assigned_officer_id,assigned_employee_id,deadline,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [cmpId, code, citizenId, s.title, s.desc, "EN", s.cat, s.sub, deptIds[s.dept], districtId, 32.5 + Math.random() * 0.1, 74.5 + Math.random() * 0.1, s.district, s.status, officerId, s.status !== "PENDING" ? empId : null, deadline, createdAt, createdAt]
      );
      await exec("INSERT INTO complaint_history (id,complaint_id,user_id,action,new_status,description,created_at) VALUES (?,?,?,?,?,?,?)",
        [newId("hist"), cmpId, citizenId, "COMPLAINT_SUBMITTED", "PENDING", `Complaint ${code} submitted`, createdAt]);
      if (s.status !== "PENDING") {
        await exec("INSERT INTO complaint_history (id,complaint_id,user_id,action,old_status,new_status,description,created_at) VALUES (?,?,?,?,?,?,?,?)",
          [newId("hist"), cmpId, officerId, "ASSIGNED", "PENDING", s.status, "Assigned to employee", new Date(new Date(createdAt).getTime() + 3600000).toISOString()]);
      }
      if (s.status === "IN_PROGRESS") {
        await exec("INSERT INTO complaint_history (id,complaint_id,user_id,action,old_status,new_status,description,created_at) VALUES (?,?,?,?,?,?,?,?)",
          [newId("hist"), cmpId, empId, "WORK_STARTED", "ASSIGNED", "IN_PROGRESS", "Started working", new Date(new Date(createdAt).getTime() + 7200000).toISOString()]);
      }
      if (s.status === "MARKED_RESOLVED") {
        const resolvedAt = new Date(new Date(createdAt).getTime() + 86400000).toISOString();
        await exec("UPDATE complaints SET resolution_note=?,resolution_proof=?,resolved_at=?,resolved_by_id=? WHERE id=?",
          ["Pipeline replaced and fixed", JSON.stringify({ text: "Replaced the burst pipeline section", images: [] }), resolvedAt, empId, cmpId]);
      }
    }
    log.push(`${samples.length} complaints created.`);
    log.push("Seed complete! Password: " + DEMO_PASSWORD);

    return NextResponse.json({ success: true, log });
  } catch (err: any) {
    log.push(`FATAL: ${err.message}`);
    return NextResponse.json({ success: false, log, error: err.message }, { status: 500 });
  }
}

// GET for easy browser trigger
export async function GET() {
  return POST();
}
