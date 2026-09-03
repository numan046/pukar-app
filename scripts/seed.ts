import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hashPassword } from "../src/lib/auth";
import { newId, complaintCode } from "../src/lib/id";

const DEMO_PASSWORD = "Demo@1234";

async function seed() {
  const url = process.env.TURSO_DATABASE_URL || "file:./data/ppr.db";
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
  const db = createClient({ url, authToken });

  // Drop existing tables (seed = fresh start)
  const dropTables = [
    "complaint_updates", "complaint_history", "notifications",
    "complaints", "issue_categories", "departments", "users", "districts",
  ];
  for (const t of dropTables) {
    await db.execute({ sql: `DROP TABLE IF EXISTS ${t}`, args: [] });
  }
  console.log("Existing tables dropped.");

  // Create schema
  const schema = readFileSync(join(process.cwd(), "scripts", "schema.sql"), "utf-8");
  const statements = schema.split(";").filter((s: string) => s.trim().length > 0);
  for (const stmt of statements) {
    try { await db.execute({ sql: stmt + ";", args: [] }); } catch (e) { console.warn("Warning:", (e as Error).message); }
  }
  console.log("Schema created.");

  // ---------- Districts ----------
  const districtNames = ["Sialkot", "Gujranwala", "Lahore", "Gujrat", "Faisalabad", "Multan", "Rawalpindi", "Islamabad"];
  const districts: { id: string; name: string }[] = districtNames.map(name => ({ id: newId("dst"), name }));

  const districtIds: Record<string, string> = {};
  for (const d of districts) {
    await db.execute({ sql: "INSERT INTO districts (id, name) VALUES (?,?)", args: [d.id, d.name] });
    districtIds[d.name] = d.id;
  }
  console.log(`✔ ${districts.length} districts created.`);

  // ---------- Departments ----------
  type Dept = { id: string; name: string; slug: string; description: string };
  const departments: Dept[] = [
    { id: newId("dept"), name: "Gas Department", slug: "gas-department", description: "Gas supply, leaks, and infrastructure" },
    { id: newId("dept"), name: "Electricity Department", slug: "electricity-department", description: "Power supply, wiring, and electrical infrastructure" },
    { id: newId("dept"), name: "Roads & Infrastructure Department", slug: "roads-department", description: "Road damage, potholes, and infrastructure" },
    { id: newId("dept"), name: "Water & Sanitation Department", slug: "water-drainage-department", description: "Waterlogging, drainage, and sanitation" },
  ];

  const deptIds: Record<string, string> = {};
  for (const d of departments) {
    await db.execute({ sql: "INSERT INTO departments (id, name, slug, description) VALUES (?,?,?,?)", args: [d.id, d.name, d.slug, d.description] });
    deptIds[d.slug] = d.id;
  }
  console.log(`✔ ${departments.length} departments created.`);

  // ---------- Issue Categories ----------
  const categories: { deptSlug: string; name: string }[] = [
    { deptSlug: "gas-department", name: "Gas Leak" },
    { deptSlug: "gas-department", name: "Low Gas Pressure" },
    { deptSlug: "gas-department", name: "Gas Meter Issue" },
    { deptSlug: "gas-department", name: "New Gas Connection" },
    { deptSlug: "electricity-department", name: "Power Outage" },
    { deptSlug: "electricity-department", name: "Exposed Wiring" },
    { deptSlug: "electricity-department", name: "Damaged Electric Pole" },
    { deptSlug: "electricity-department", name: "Transformer Issue" },
    { deptSlug: "roads-department", name: "Pothole" },
    { deptSlug: "roads-department", name: "Cracked Road" },
    { deptSlug: "roads-department", name: "Road Collapse" },
    { deptSlug: "water-drainage-department", name: "Waterlogging" },
    { deptSlug: "water-drainage-department", name: "Blocked Drainage" },
    { deptSlug: "water-drainage-department", name: "Sewage Overflow" },
    { deptSlug: "water-drainage-department", name: "Pipeline Burst" },
  ];

  for (const c of categories) {
    const id = newId("cat");
    await db.execute({ sql: "INSERT INTO issue_categories (id, department_id, name) VALUES (?,?,?)", args: [id, deptIds[c.deptSlug], c.name] });
  }
  console.log(`✔ ${categories.length} issue categories created.`);

  // ---------- Users ----------
  const passwordHash = hashPassword(DEMO_PASSWORD);
  const userIds: Record<string, string> = {};

  type SeedUser = { name: string; email: string; role: string; department?: string; district?: string; designation?: string };
  const seedUsers: SeedUser[] = [
    { name: "System Admin", email: "admin@ppr.ai", role: "SUPER_ADMIN" },
    { name: "CM Officer", email: "cm@ppr.ai", role: "CM", designation: "Chief Minister" },
    { name: "Gas CMO", email: "gas-cmo@ppr.ai", role: "CMO", department: "gas-department", designation: "Gas Chief Officer" },
    { name: "Electricity CMO", email: "electricity-cmo@ppr.ai", role: "CMO", department: "electricity-department", designation: "Electricity Chief Officer" },
    { name: "Roads CMO", email: "roads-cmo@ppr.ai", role: "CMO", department: "roads-department", designation: "Roads Chief Officer" },
    { name: "Water CMO", email: "water-cmo@ppr.ai", role: "CMO", department: "water-drainage-department", designation: "Water & Sanitation Chief Officer" },
    { name: "Tariq Mehmood", email: "gas-officer-sialkot@ppr.ai", role: "DEPARTMENT_OFFICER", department: "gas-department", district: "Sialkot", designation: "Gas Officer Sialkot" },
    { name: "Ahmed Gas", email: "gas-officer-gujranwala@ppr.ai", role: "DEPARTMENT_OFFICER", department: "gas-department", district: "Gujranwala", designation: "Gas Officer Gujranwala" },
    { name: "Bilal Ahmed", email: "electricity-officer-sialkot@ppr.ai", role: "DEPARTMENT_OFFICER", department: "electricity-department", district: "Sialkot", designation: "Electricity Officer Sialkot" },
    { name: "Naveed Electric", email: "electricity-officer-lahore@ppr.ai", role: "DEPARTMENT_OFFICER", department: "electricity-department", district: "Lahore", designation: "Electricity Officer Lahore" },
    { name: "Sana Malik", email: "roads-officer-sialkot@ppr.ai", role: "DEPARTMENT_OFFICER", department: "roads-department", district: "Sialkot", designation: "Roads Officer Sialkot" },
    { name: "Zubair Road", email: "roads-officer-faisalabad@ppr.ai", role: "DEPARTMENT_OFFICER", department: "roads-department", district: "Faisalabad", designation: "Roads Officer Faisalabad" },
    { name: "Usman Ali", email: "water-officer-sialkot@ppr.ai", role: "DEPARTMENT_OFFICER", department: "water-drainage-department", district: "Sialkot", designation: "Water Officer Sialkot" },
    { name: "Faisal Water", email: "water-officer-multan@ppr.ai", role: "DEPARTMENT_OFFICER", department: "water-drainage-department", district: "Multan", designation: "Water Officer Multan" },
    { name: "Ahmed Khan", email: "gas-emp1-sialkot@ppr.ai", role: "EMPLOYEE", department: "gas-department", district: "Sialkot", designation: "Gas Technician" },
    { name: "Farhan Saeed", email: "gas-emp2-sialkot@ppr.ai", role: "EMPLOYEE", department: "gas-department", district: "Sialkot", designation: "Pipeline Inspector" },
    { name: "Kashif Gas", email: "gas-emp1-gujranwala@ppr.ai", role: "EMPLOYEE", department: "gas-department", district: "Gujranwala", designation: "Gas Worker" },
    { name: "Kamran Ali", email: "elec-emp1-sialkot@ppr.ai", role: "EMPLOYEE", department: "electricity-department", district: "Sialkot", designation: "Electrician" },
    { name: "Nadeem Elec", email: "elec-emp2-sialkot@ppr.ai", role: "EMPLOYEE", department: "electricity-department", district: "Sialkot", designation: "Line Technician" },
    { name: "Lahore Elec", email: "elec-emp1-lahore@ppr.ai", role: "EMPLOYEE", department: "electricity-department", district: "Lahore", designation: "Electrician Lahore" },
    { name: "Imran Worker", email: "road-emp1-sialkot@ppr.ai", role: "EMPLOYEE", department: "roads-department", district: "Sialkot", designation: "Road Worker" },
    { name: "Zahid Hussain", email: "road-emp2-sialkot@ppr.ai", role: "EMPLOYEE", department: "roads-department", district: "Sialkot", designation: "Construction Worker" },
    { name: "Salman Raza", email: "water-emp1-sialkot@ppr.ai", role: "EMPLOYEE", department: "water-drainage-department", district: "Sialkot", designation: "Drainage Technician" },
    { name: "Waqas Ahmed", email: "water-emp2-sialkot@ppr.ai", role: "EMPLOYEE", department: "water-drainage-department", district: "Sialkot", designation: "Sewage Worker" },
    { name: "Ayesha Khan", email: "citizen@ppr.ai", role: "CITIZEN" },
  ];

  for (const u of seedUsers) {
    const uid = newId("usr");
    userIds[u.email] = uid;
    const deptId = u.department ? deptIds[u.department] : null;
    const distId = u.district ? districtIds[u.district] : null;
    await db.execute({
      sql: `INSERT INTO users (id, name, email, password_hash, role, phone, department_id, district_id, designation, language, is_active, must_change_password) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [uid, u.name, u.email, passwordHash, u.role, "+92300" + Math.floor(1000000 + Math.random() * 8999999), deptId, distId, u.designation ?? null, "EN", 1, 0],
    });
  }
  console.log(`✔ ${seedUsers.length} users created.`);

  for (let i = 1; i <= 5; i++) {
    const uid = newId("usr");
    userIds[`citizen${i}@ppr.ai`] = uid;
    await db.execute({
      sql: `INSERT INTO users (id, name, email, password_hash, role, phone, department_id, district_id, designation, language, is_active, must_change_password) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [uid, `Citizen ${i}`, `citizen${i}@ppr.ai`, passwordHash, "CITIZEN", "+92300" + Math.floor(1000000 + Math.random() * 8999999), null, null, null, "EN", 1, 0],
    });
  }

  // ---------- Sample Complaints ----------
  const citizenIds = Object.entries(userIds).filter(([email]) => email.startsWith("citizen")).map(([, id]) => id);

  type Sample = { desc: string; cat: string; sub: string; dept: string; district: string; status: string; title: string };
  const samples: Sample[] = [
    { title: "Gas leak near mosque", desc: "Gas leak from the pipeline near the mosque, strong smell everywhere. Very dangerous for residents.", cat: "Gas-related Issues", sub: "Gas Leak", dept: "gas-department", district: "Sialkot", status: "PENDING" },
    { title: "Low gas pressure", desc: "Gas pressure bohat low hai, heater nahi chal raha. Kitchen me gas bilkul nahi aati.", cat: "Gas-related Issues", sub: "Low Gas Pressure", dept: "gas-department", district: "Sialkot", status: "ASSIGNED" },
    { title: "Gas meter kharab", desc: "Gas meter kharab ho gaya, reading nahi aa rahi. Bill bohat zyada aa raha hai.", cat: "Gas-related Issues", sub: "Gas Meter Issue", dept: "gas-department", district: "Sialkot", status: "IN_PROGRESS" },
    { title: "Power outage in area", desc: "Bijli 3 ghante se gayab hai. Transformer se sparking ho rahi hai. Poora area dark hai.", cat: "Electricity-related Issues", sub: "Power Outage", dept: "electricity-department", district: "Sialkot", status: "PENDING" },
    { title: "Broken electricity pole", desc: "Electric pole toot kar girne wala hai. Wire latak rahi hai. Bachon ke liye khatra.", cat: "Electricity-related Issues", sub: "Exposed Wiring", dept: "electricity-department", district: "Sialkot", status: "ASSIGNED" },
    { title: "Road pothole on main street", desc: "Sarak par bohat bara gaddha hai. 2 gaariyan kharab ho chuki hain. Raat ko nazar nahi aata.", cat: "Road Damage", sub: "Pothole", dept: "roads-department", district: "Sialkot", status: "PENDING" },
    { title: "Cracked road near school", desc: "School ke samne sarak tooti hui hai. Bachon ka guzar mushkil hai. Barish me pani bhar jata hai.", cat: "Road Damage", sub: "Cracked Road", dept: "roads-department", district: "Sialkot", status: "IN_PROGRESS" },
    { title: "Waterlogging after rain", desc: "Barish ke baad pani jama hai, nikal nahi raha. Gharo me pani ghus raha hai.", cat: "Waterlogging / Standing Water", sub: "Water Accumulation", dept: "water-drainage-department", district: "Sialkot", status: "PENDING" },
    { title: "Sewage overflow", desc: "Nala block hai, ganda pani sarak par beh raha hai. Bohat badboo aa rahi hai.", cat: "Waterlogging / Standing Water", sub: "Sewage Overflow", dept: "water-drainage-department", district: "Sialkot", status: "ASSIGNED" },
    { title: "Pipeline burst", desc: "Pani ki pipe phat gayi, pani sadak par beh raha hai. Bohat waste ho raha hai.", cat: "Waterlogging / Standing Water", sub: "Pipeline Burst", dept: "water-drainage-department", district: "Sialkot", status: "MARKED_RESOLVED" },
    { title: "Gas leak in residential area", desc: "Gas leak from underground pipeline. Strong smell in the whole neighborhood.", cat: "Gas-related Issues", sub: "Gas Leak", dept: "gas-department", district: "Gujranwala", status: "PENDING" },
    { title: "Transformer burning", desc: "Transformer se aag lagne ki awaaz aa rahi hai. Poora block dark hai.", cat: "Electricity-related Issues", sub: "Transformer Issue", dept: "electricity-department", district: "Lahore", status: "ASSIGNED" },
    { title: "Road collapse", desc: "Sarak dhans gayi hai, bohat gehra gaddha ban gaya hai. Traffic jam rehta hai.", cat: "Road Damage", sub: "Road Collapse", dept: "roads-department", district: "Faisalabad", status: "PENDING" },
    { title: "Blocked drainage", desc: "Nala block hai, ganda pani gali me bhara hua hai. Machar bohat hain.", cat: "Waterlogging / Standing Water", sub: "Blocked Drainage", dept: "water-drainage-department", district: "Multan", status: "IN_PROGRESS" },
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
    const code = complaintCode(now.getFullYear(), seq++);
    const citizenId = citizenIds[i % citizenIds.length];
    const officerKey = `${s.dept}:${s.district}`;
    const officerId = officerLookup[officerKey];
    const emps = employeeLookup[officerKey] || [];
    const empId = emps.length > 0 ? emps[i % emps.length] : null;
    const hoursAgo = (samples.length - i) * 6;
    const createdAt = new Date(now.getTime() - hoursAgo * 3600000).toISOString();
    const deadline = s.status !== "PENDING" ? new Date(now.getTime() + 72 * 3600000).toISOString() : null;
    const districtId = districtIds[s.district];

    await db.execute({
      sql: `INSERT INTO complaints (id, complaint_code, citizen_id, title, description, language, category, sub_category, department_id, district_id, latitude, longitude, address, status, assigned_officer_id, assigned_employee_id, deadline, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [cmpId, code, citizenId, s.title, s.desc, "EN", s.cat, s.sub, deptIds[s.dept], districtId, 32.5 + Math.random() * 0.1, 74.5 + Math.random() * 0.1, s.district, s.status, officerId, s.status !== "PENDING" ? empId : null, deadline, createdAt, createdAt],
    });

    await db.execute({
      sql: "INSERT INTO complaint_history (id, complaint_id, user_id, action, new_status, description, created_at) VALUES (?,?,?,?,?,?,?)",
      args: [newId("hist"), cmpId, citizenId, "COMPLAINT_SUBMITTED", "PENDING", `Complaint ${code} submitted`, createdAt],
    });

    if (s.status !== "PENDING") {
      await db.execute({
        sql: "INSERT INTO complaint_history (id, complaint_id, user_id, action, old_status, new_status, description, created_at) VALUES (?,?,?,?,?,?,?,?)",
        args: [newId("hist"), cmpId, officerId, "ASSIGNED", "PENDING", s.status, `Assigned to employee`, new Date(new Date(createdAt).getTime() + 3600000).toISOString()],
      });
    }

    if (s.status === "IN_PROGRESS") {
      await db.execute({
        sql: "INSERT INTO complaint_history (id, complaint_id, user_id, action, old_status, new_status, description, created_at) VALUES (?,?,?,?,?,?,?,?)",
        args: [newId("hist"), cmpId, empId, "WORK_STARTED", "ASSIGNED", "IN_PROGRESS", "Started working", new Date(new Date(createdAt).getTime() + 7200000).toISOString()],
      });
    }

    if (s.status === "MARKED_RESOLVED") {
      const resolvedAt = new Date(new Date(createdAt).getTime() + 86400000).toISOString();
      await db.execute({
        sql: "UPDATE complaints SET resolution_note = ?, resolution_proof = ?, resolved_at = ?, resolved_by_id = ? WHERE id = ?",
        args: ["Pipeline replaced and fixed", JSON.stringify({ text: "Replaced the burst pipeline section", images: [] }), resolvedAt, empId, cmpId],
      });
    }
  }

  console.log(`✔ ${samples.length} sample complaints created.`);
  console.log("");
  console.log("✔ Seed complete.");
  console.log(`✔ Demo password for ALL seeded accounts: ${DEMO_PASSWORD}`);
  console.log("✔ Demo logins:");
  console.log("  - admin@ppr.ai (Super Admin)");
  console.log("  - cm@ppr.ai (Chief Minister)");
  console.log("  - gas-cmo@ppr.ai, electricity-cmo@ppr.ai, roads-cmo@ppr.ai, water-cmo@ppr.ai (CMOs)");
  console.log("  - gas-officer-sialkot@ppr.ai, electricity-officer-sialkot@ppr.ai, etc. (District Officers)");
  console.log("  - gas-emp1-sialkot@ppr.ai, etc. (Employees)");
  console.log("  - citizen@ppr.ai (Citizen)");
}

seed().catch(console.error);
