-- PPR AI — Problem Radar
-- Department-based citizen complaint management system
-- SQLite schema (zero external deps, uses Node's built-in node:sqlite)

-- ============================================================
-- DISTRICTS
-- Pre-seeded, CMO can manage
-- ============================================================
CREATE TABLE IF NOT EXISTS districts (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- USERS
-- Roles: SUPER_ADMIN | CM | CMO | DEPARTMENT_OFFICER | EMPLOYEE | CITIZEN
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  department_id TEXT,
  district_id TEXT,
  designation TEXT,
  language TEXT NOT NULL DEFAULT 'EN',
  is_active INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- DEPARTMENTS
-- Dynamic — Super Admin can create/update/deactivate
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  officer_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- ISSUE CATEGORIES
-- Per-department, managed by Super Admin
-- ============================================================
CREATE TABLE IF NOT EXISTS issue_categories (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- ============================================================
-- COMPLAINTS
-- Status workflow: PENDING → ASSIGNED → IN_PROGRESS → MARKED_RESOLVED → RESOLVED
--                                                         → OFFICER_REVIEW → (IN_PROGRESS | ASSIGNED | RESOLVED)
-- ============================================================
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  complaint_code TEXT UNIQUE NOT NULL,
  citizen_id TEXT NOT NULL,
  title TEXT,
  description TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'EN',

  -- Classification
  category TEXT,
  sub_category TEXT,
  category_id TEXT,
  department_id TEXT,
  district_id TEXT,

  -- Location
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  address TEXT,
  area TEXT,
  tehsil TEXT,

  -- Media
  has_image INTEGER NOT NULL DEFAULT 0,
  has_video INTEGER NOT NULL DEFAULT 0,
  media_urls TEXT NOT NULL DEFAULT '[]',

  -- AI analysis
  ai_suggestion TEXT,
  ai_confidence REAL,
  ai_mode TEXT,

  -- Status & assignment
  status TEXT NOT NULL DEFAULT 'PENDING',
  assigned_officer_id TEXT,
  assigned_employee_id TEXT,
  deadline TEXT,
  assignment_instructions TEXT,

  -- Resolution
  resolved_at TEXT,
  resolution_note TEXT,
  resolution_proof TEXT,
  resolved_by_id TEXT,

  -- Citizen verification
  citizen_verification TEXT,
  citizen_remarks TEXT,
  verification_at TEXT,

  -- AI-determined priority
  priority TEXT NOT NULL DEFAULT 'P2',

  -- Master Problem link (for duplicate clustering)
  master_problem_id TEXT,

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- COMPLAINT UPDATES (progress, resolution, assignments)
-- ============================================================
CREATE TABLE IF NOT EXISTS complaint_updates (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  update_type TEXT NOT NULL,
  message TEXT,
  proof_data TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (complaint_id) REFERENCES complaints(id)
);

-- ============================================================
-- COMPLAINT HISTORY (full audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS complaint_history (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (complaint_id) REFERENCES complaints(id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  complaint_id TEXT,
  type TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_ur TEXT NOT NULL,
  body_en TEXT NOT NULL,
  body_ur TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  valid_until TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================================
-- MASTER PROBLEMS (groups duplicate/similar complaints)
-- When multiple citizens report same issue, they merge here
-- ============================================================
CREATE TABLE IF NOT EXISTS master_problems (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  department_id TEXT NOT NULL,
  district_id TEXT,
  category TEXT,
  title TEXT NOT NULL,
  description TEXT,
  latitude REAL,
  longitude REAL,
  area TEXT,
  priority TEXT NOT NULL DEFAULT 'P2',
  status TEXT NOT NULL DEFAULT 'OPEN',
  assigned_employee_id TEXT,
  assigned_officer_id TEXT,
  deadline TEXT,
  complaint_count INTEGER NOT NULL DEFAULT 1,
  resolved_at TEXT,
  resolution_note TEXT,
  resolution_proof TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE INDEX IF NOT EXISTS idx_master_problems_dept ON master_problems(department_id);
CREATE INDEX IF NOT EXISTS idx_master_problems_district ON master_problems(district_id);
CREATE INDEX IF NOT EXISTS idx_master_problems_status ON master_problems(status);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_district ON users(district_id);
CREATE INDEX IF NOT EXISTS idx_complaints_citizen ON complaints(citizen_id);
CREATE INDEX IF NOT EXISTS idx_complaints_department ON complaints(department_id);
CREATE INDEX IF NOT EXISTS idx_complaints_district ON complaints(district_id);
CREATE INDEX IF NOT EXISTS idx_complaints_employee ON complaints(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_officer ON complaints(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_complaints_master_problem ON complaints(master_problem_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_complaint_history ON complaint_history(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_updates ON complaint_updates(complaint_id);
CREATE INDEX IF NOT EXISTS idx_issue_categories_dept ON issue_categories(department_id);

-- ============================================================
-- BROADCASTS (Government Announcements / Orders)
-- Hierarchical: CM → CMOs, CMO → Districts, Officer → Citizens
-- ============================================================
CREATE TABLE IF NOT EXISTS broadcasts (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_level TEXT NOT NULL,
  target_ids TEXT NOT NULL DEFAULT '[]',
  department_id TEXT,
  district_id TEXT,
  valid_from TEXT,
  valid_until TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_sender ON broadcasts(sender_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_active ON broadcasts(is_active, valid_until);
