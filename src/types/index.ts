// ============================================================
// ROLES
// ============================================================
export type Role = "SUPER_ADMIN" | "CM" | "CMO" | "DEPARTMENT_OFFICER" | "EMPLOYEE" | "CITIZEN";

// ============================================================
// COMPLAINT STATUS WORKFLOW
// PENDING → ASSIGNED → IN_PROGRESS → MARKED_RESOLVED → RESOLVED
//                                                         → OFFICER_REVIEW → (IN_PROGRESS | ASSIGNED | RESOLVED)
// ============================================================
export type ComplaintStatus =
  | "PENDING"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "MARKED_RESOLVED"
  | "RESOLVED"
  | "OFFICER_REVIEW";

export type CitizenVerification = "YES" | "NO" | null;

export type ImpactLevel = "ME_ONLY" | "MY_STREET" | "MULTIPLE_STREETS" | "LARGE_AREA";

export type Language = "EN" | "UR";

export type Priority = "P0" | "P1" | "P2" | "P3";

// ============================================================
// DATABASE ROW TYPES
// ============================================================

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  phone: string | null;
  department_id: string | null;
  district_id: string | null;
  designation: string | null;
  language: Language;
  is_active: number;
  must_change_password: number;
  created_at: string;
  updated_at: string;
}

export interface DistrictRow {
  id: string;
  name: string;
  is_active: number;
  created_at: string;
}

export interface DepartmentRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  officer_id: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface IssueCategoryRow {
  id: string;
  department_id: string;
  name: string;
  description: string | null;
  is_active: number;
  created_at: string;
}

export interface ComplaintRow {
  id: string;
  complaint_code: string;
  citizen_id: string;
  title: string | null;
  description: string;
  language: Language;

  // Classification
  category: string | null;
  sub_category: string | null;
  category_id: string | null;
  department_id: string | null;
  district_id: string | null;

  // Location
  latitude: number;
  longitude: number;
  address: string | null;
  area: string | null;
  tehsil: string | null;

  // Media
  has_image: number;
  has_video: number;
  media_urls: string;

  // AI
  ai_suggestion: string | null;
  ai_confidence: number | null;
  ai_mode: string | null;

  // Status & assignment
  status: ComplaintStatus;
  assigned_officer_id: string | null;
  assigned_employee_id: string | null;
  deadline: string | null;
  assignment_instructions: string | null;

  // Resolution
  resolved_at: string | null;
  resolution_note: string | null;
  resolution_proof: string | null;
  resolved_by_id: string | null;

  // Citizen verification
  citizen_verification: CitizenVerification;
  citizen_remarks: string | null;
  verification_at: string | null;

  // AI-determined priority
  priority: Priority;

  // Master Problem link
  master_problem_id: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface ComplaintUpdateRow {
  id: string;
  complaint_id: string;
  user_id: string;
  update_type: "PROGRESS" | "RESOLUTION" | "ASSIGNMENT" | "STATUS_CHANGE" | "OFFICER_ACTION";
  message: string | null;
  proof_data?: string | null;
  created_at: string;
}

export interface ComplaintHistoryRow {
  id: string;
  complaint_id: string;
  user_id: string | null;
  action: string;
  old_status?: string | null;
  new_status?: string | null;
  description: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  complaint_id: string | null;
  type: string;
  title_en: string;
  title_ur: string;
  body_en: string;
  body_ur: string;
  is_read: number;
  valid_until: string | null;
  created_at: string;
}

export interface MasterProblemRow {
  id: string;
  code: string;
  department_id: string;
  district_id: string | null;
  category: string | null;
  title: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  area: string | null;
  priority: Priority;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  assigned_employee_id: string | null;
  assigned_officer_id: string | null;
  deadline: string | null;
  complaint_count: number;
  resolved_at: string | null;
  resolution_note: string | null;
  resolution_proof: string | null;
  created_at: string;
  updated_at: string;
}

export interface BroadcastRow {
  id: string;
  sender_id: string;
  sender_role: Role;
  title: string;
  message: string;
  target_level: "CMO" | "DISTRICT" | "CITIZENS";
  target_ids: string; // JSON array of CMO user IDs or district IDs
  department_id: string | null;
  district_id: string | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: number;
  created_at: string;
}

// ============================================================
// API / SESSION TYPES
// ============================================================

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId: string | null;
  districtId: string | null;
  language: Language;
}

export interface AiAnalysisResult {
  category: string;
  subCategory: string;
  department: string;
  departmentSlug: string;
  priority: Priority;
  confidence: number;
  summary: string;
  estimatedResolutionHours: number;
  priorityReason: string;
  mode: "LIVE" | "DEMO_FALLBACK" | "NOT_UNDERSTOOD";
}
