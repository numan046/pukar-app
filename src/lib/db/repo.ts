// @ts-nocheck — DB adapter layer: Row→Domain type casts are safe at runtime
import { getDb } from "./client";
import { newId } from "@/lib/id";
import type {
  UserRow, DepartmentRow, DistrictRow, IssueCategoryRow,
  ComplaintRow, ComplaintUpdateRow, ComplaintHistoryRow,
  NotificationRow, Role, ComplaintStatus, CitizenVerification,
  MasterProblemRow, BroadcastRow,
} from "@/types";

// ============================================================
// USERS
// ============================================================
export async function getUserByEmail(email: string): Promise<UserRow | undefined> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM users WHERE email = ?", args: [email.toLowerCase()] });
  return rows[0] as UserRow | undefined;
}

export async function getUserById(id: string): Promise<UserRow | undefined> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM users WHERE id = ?", args: [id] });
  return rows[0] as UserRow | undefined;
}

export async function listAllUsers(): Promise<UserRow[]> {
  const { rows } = await getDb().execute("SELECT * FROM users ORDER BY created_at DESC");
  return rows as UserRow[];
}

export async function listUsersByRole(role: Role): Promise<UserRow[]> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM users WHERE role = ? AND is_active = 1 ORDER BY name", args: [role] });
  return rows as UserRow[];
}

export async function createUser(u: Omit<UserRow, "id" | "created_at" | "updated_at">): Promise<UserRow> {
  const id = newId("usr");
  await getDb().execute({
    sql: `INSERT INTO users (id, name, email, password_hash, role, phone, department_id, district_id, designation, language, is_active, must_change_password) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [id, u.name, u.email.toLowerCase(), u.password_hash, u.role, u.phone, u.department_id, u.district_id, u.designation, u.language, u.is_active, u.must_change_password],
  });
  return (await getUserById(id))!;
}

export async function updateUserPassword(userId: string, newPasswordHash: string) {
  await getDb().execute({ sql: "UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime('now') WHERE id = ?", args: [newPasswordHash, userId] });
}

export async function updateUser(userId: string, fields: Partial<Pick<UserRow, "name" | "email" | "role" | "phone" | "department_id" | "district_id" | "designation" | "language" | "is_active" | "must_change_password">>) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => (fields as any)[k]);
  await getDb().execute({ sql: `UPDATE users SET ${setClause}, updated_at = datetime('now') WHERE id = ?`, args: [...values, userId] });
}

export async function deactivateUser(userId: string) {
  await getDb().execute({ sql: "UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = ?", args: [userId] });
}

export async function reactivateUser(userId: string) {
  await getDb().execute({ sql: "UPDATE users SET is_active = 1, updated_at = datetime('now') WHERE id = ?", args: [userId] });
}

// ============================================================
// DEPARTMENTS
// ============================================================
export async function listDepartments(): Promise<DepartmentRow[]> {
  const { rows } = await getDb().execute("SELECT * FROM departments WHERE is_active = 1 ORDER BY name");
  return rows as DepartmentRow[];
}

export async function listAllDepartments(): Promise<DepartmentRow[]> {
  const { rows } = await getDb().execute("SELECT * FROM departments ORDER BY name");
  return rows as DepartmentRow[];
}

export async function getDepartment(id: string): Promise<DepartmentRow | undefined> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM departments WHERE id = ?", args: [id] });
  return rows[0] as DepartmentRow | undefined;
}

export async function getDepartmentBySlug(slug: string): Promise<DepartmentRow | undefined> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM departments WHERE slug = ?", args: [slug] });
  return rows[0] as DepartmentRow | undefined;
}

export async function createDepartment(name: string, slug: string, description?: string): Promise<DepartmentRow> {
  const id = newId("dept");
  await getDb().execute({ sql: "INSERT INTO departments (id, name, slug, description) VALUES (?,?,?,?)", args: [id, name, slug, description ?? null] });
  return (await getDepartment(id))!;
}

export async function updateDepartment(id: string, fields: Partial<Pick<DepartmentRow, "name" | "slug" | "description" | "officer_id" | "is_active">>) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => (fields as any)[k]);
  await getDb().execute({ sql: `UPDATE departments SET ${setClause}, updated_at = datetime('now') WHERE id = ?`, args: [...values, id] });
}

export async function setDepartmentOfficer(deptId: string, officerId: string | null) {
  await getDb().execute({ sql: "UPDATE departments SET officer_id = ?, updated_at = datetime('now') WHERE id = ?", args: [officerId, deptId] });
}

export async function getOfficerForDepartment(deptId: string): Promise<UserRow | undefined> {
  const dept = await getDepartment(deptId);
  if (!dept?.officer_id) return undefined;
  return getUserById(dept.officer_id);
}

export async function getOfficerForDepartmentDistrict(deptId: string, districtId: string): Promise<UserRow | undefined> {
  const { rows } = await getDb().execute({
    sql: "SELECT * FROM users WHERE department_id = ? AND district_id = ? AND role = 'DEPARTMENT_OFFICER' AND is_active = 1 LIMIT 1",
    args: [deptId, districtId],
  });
  return rows[0] as UserRow | undefined;
}

export async function getCmoForDepartment(deptId: string): Promise<UserRow | undefined> {
  const { rows } = await getDb().execute({
    sql: "SELECT * FROM users WHERE department_id = ? AND role = 'CMO' AND is_active = 1 LIMIT 1",
    args: [deptId],
  });
  return rows[0] as UserRow | undefined;
}

// ============================================================
// DISTRICTS
// ============================================================
export async function listDistricts(): Promise<DistrictRow[]> {
  const { rows } = await getDb().execute("SELECT * FROM districts WHERE is_active = 1 ORDER BY name");
  return rows as DistrictRow[];
}

export async function listAllDistricts(): Promise<DistrictRow[]> {
  const { rows } = await getDb().execute("SELECT * FROM districts ORDER BY name");
  return rows as DistrictRow[];
}

export async function getDistrict(id: string): Promise<DistrictRow | undefined> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM districts WHERE id = ?", args: [id] });
  return rows[0] as DistrictRow | undefined;
}

export async function getDistrictByName(name: string): Promise<DistrictRow | undefined> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM districts WHERE LOWER(name) = LOWER(?)", args: [name] });
  return rows[0] as DistrictRow | undefined;
}

export async function createDistrict(name: string): Promise<DistrictRow> {
  const id = newId("dst");
  await getDb().execute({ sql: "INSERT INTO districts (id, name) VALUES (?,?)", args: [id, name] });
  return (await getDistrict(id))!;
}

export async function updateDistrict(id: string, fields: Partial<Pick<DistrictRow, "name" | "is_active">>) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => (fields as any)[k]);
  await getDb().execute({ sql: `UPDATE districts SET ${setClause} WHERE id = ?`, args: [...values, id] });
}

export async function listOfficersByDistrict(districtId: string): Promise<UserRow[]> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM users WHERE district_id = ? AND role = 'DEPARTMENT_OFFICER' AND is_active = 1 ORDER BY name", args: [districtId] });
  return rows as UserRow[];
}

export async function listOfficersByDepartment(deptId: string): Promise<UserRow[]> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM users WHERE department_id = ? AND role = 'DEPARTMENT_OFFICER' AND is_active = 1 ORDER BY name", args: [deptId] });
  return rows as UserRow[];
}

// ============================================================
// ISSUE CATEGORIES
// ============================================================
export async function listIssueCategories(departmentId?: string): Promise<IssueCategoryRow[]> {
  if (departmentId) {
    const { rows } = await getDb().execute({ sql: "SELECT * FROM issue_categories WHERE department_id = ? AND is_active = 1 ORDER BY name", args: [departmentId] });
    return rows as IssueCategoryRow[];
  }
  const { rows } = await getDb().execute("SELECT * FROM issue_categories WHERE is_active = 1 ORDER BY department_id, name");
  return rows as IssueCategoryRow[];
}

export async function listAllIssueCategories(): Promise<IssueCategoryRow[]> {
  const { rows } = await getDb().execute("SELECT * FROM issue_categories ORDER BY department_id, name");
  return rows as IssueCategoryRow[];
}

export async function createIssueCategory(departmentId: string, name: string, description?: string): Promise<IssueCategoryRow> {
  const id = newId("cat");
  await getDb().execute({ sql: "INSERT INTO issue_categories (id, department_id, name, description) VALUES (?,?,?,?)", args: [id, departmentId, name, description ?? null] });
  const { rows } = await getDb().execute({ sql: "SELECT * FROM issue_categories WHERE id = ?", args: [id] });
  return rows[0] as IssueCategoryRow;
}

export async function updateIssueCategory(id: string, fields: Partial<Pick<IssueCategoryRow, "name" | "description" | "is_active">>) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => (fields as any)[k]);
  await getDb().execute({ sql: `UPDATE issue_categories SET ${setClause} WHERE id = ?`, args: [...values, id] });
}

// ============================================================
// COMPLAINTS
// ============================================================
export async function getComplaintYearSeq(year: number): Promise<number> {
  const { rows } = await getDb().execute({ sql: "SELECT COUNT(*) as c FROM complaints WHERE complaint_code LIKE ?", args: [`PPR-${year}-%`] });
  return (rows[0] as any).c + 1;
}

export async function createComplaint(c: Partial<ComplaintRow> & {
  id: string; complaint_code: string; citizen_id: string; description: string; latitude: number; longitude: number;
}): Promise<ComplaintRow> {
  await getDb().execute({
    sql: `INSERT INTO complaints (id, complaint_code, citizen_id, title, description, language, category, sub_category, category_id, department_id, district_id, latitude, longitude, address, area, tehsil, has_image, has_video, media_urls, ai_suggestion, ai_confidence, ai_mode, status, assigned_officer_id, deadline, priority) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [c.id, c.complaint_code, c.citizen_id, c.title ?? null, c.description, c.language ?? "EN", c.category ?? null, c.sub_category ?? null, c.category_id ?? null, c.department_id ?? null, c.district_id ?? null, c.latitude, c.longitude, c.address ?? null, c.area ?? null, c.tehsil ?? null, c.has_image ?? 0, c.has_video ?? 0, c.media_urls ?? "[]", c.ai_suggestion ?? null, c.ai_confidence ?? null, c.ai_mode ?? null, c.status ?? "PENDING", c.assigned_officer_id ?? null, c.deadline ?? null, c.priority ?? "P2"],
  });
  return (await getComplaintById(c.id))!;
}

export async function getComplaintById(id: string): Promise<ComplaintRow | undefined> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM complaints WHERE id = ?", args: [id] });
  return rows[0] as ComplaintRow | undefined;
}

export async function getComplaintByCode(code: string): Promise<ComplaintRow | undefined> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM complaints WHERE complaint_code = ?", args: [code] });
  return rows[0] as ComplaintRow | undefined;
}

export async function listComplaintsByCitizen(citizenId: string): Promise<ComplaintRow[]> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM complaints WHERE citizen_id = ? ORDER BY created_at DESC", args: [citizenId] });
  return rows as ComplaintRow[];
}

export async function listComplaintsByDepartment(departmentId: string): Promise<ComplaintRow[]> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM complaints WHERE department_id = ? ORDER BY CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END, created_at DESC", args: [departmentId] });
  return rows as ComplaintRow[];
}

export async function listComplaintsByDepartmentAndDistrict(departmentId: string, districtId: string): Promise<ComplaintRow[]> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM complaints WHERE department_id = ? AND district_id = ? ORDER BY CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END, created_at DESC", args: [departmentId, districtId] });
  return rows as ComplaintRow[];
}

export async function listComplaintsByEmployee(employeeId: string): Promise<ComplaintRow[]> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM complaints WHERE assigned_employee_id = ? ORDER BY created_at DESC", args: [employeeId] });
  return rows as ComplaintRow[];
}

export async function listAllComplaints(): Promise<ComplaintRow[]> {
  const { rows } = await getDb().execute("SELECT * FROM complaints ORDER BY created_at DESC");
  return rows as ComplaintRow[];
}

// Find PENDING complaints older than 24 hours that haven't been assigned
export async function listUnassignedComplaintsOlderThan24h(departmentId: string): Promise<ComplaintRow[]> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { rows } = await getDb().execute({
    sql: "SELECT * FROM complaints WHERE department_id = ? AND status = 'PENDING' AND created_at < ? AND assigned_employee_id IS NULL ORDER BY created_at ASC",
    args: [departmentId, twentyFourHoursAgo],
  });
  return rows as ComplaintRow[];
}

// Check if a notification of a specific type already exists for a complaint
export async function notificationExistsForComplaint(complaintId: string, type: string): Promise<boolean> {
  const { rows } = await getDb().execute({
    sql: "SELECT id FROM notifications WHERE complaint_id = ? AND type = ? LIMIT 1",
    args: [complaintId, type],
  });
  return rows.length > 0;
}

export async function updateComplaint(id: string, fields: Partial<ComplaintRow>) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => (fields as any)[k]);
  await getDb().execute({ sql: `UPDATE complaints SET ${setClause}, updated_at = datetime('now') WHERE id = ?`, args: [...values, id] });
}

export async function listOverdueComplaints(departmentId?: string): Promise<ComplaintRow[]> {
  const now = new Date().toISOString();
  if (departmentId) {
    const { rows } = await getDb().execute({ sql: "SELECT * FROM complaints WHERE department_id = ? AND deadline < ? AND status NOT IN ('RESOLVED','MARKED_RESOLVED') ORDER BY deadline ASC", args: [departmentId, now] });
    return rows as ComplaintRow[];
  }
  const { rows } = await getDb().execute({ sql: "SELECT * FROM complaints WHERE deadline < ? AND status NOT IN ('RESOLVED','MARKED_RESOLVED') ORDER BY deadline ASC", args: [now] });
  return rows as ComplaintRow[];
}

// ============================================================
// COMPLAINT UPDATES
// ============================================================
export async function createComplaintUpdate(u: Omit<ComplaintUpdateRow, "id" | "created_at">): Promise<ComplaintUpdateRow> {
  const id = newId("upd");
  await getDb().execute({ sql: "INSERT INTO complaint_updates (id, complaint_id, user_id, update_type, message, proof_data) VALUES (?,?,?,?,?,?)", args: [id, u.complaint_id, u.user_id, u.update_type, u.message ?? null, u.proof_data ?? null] });
  const { rows } = await getDb().execute({ sql: "SELECT * FROM complaint_updates WHERE id = ?", args: [id] });
  return rows[0] as ComplaintUpdateRow;
}

export async function getComplaintUpdates(complaintId: string): Promise<ComplaintUpdateRow[]> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM complaint_updates WHERE complaint_id = ? ORDER BY created_at ASC", args: [complaintId] });
  return rows as ComplaintUpdateRow[];
}

// ============================================================
// COMPLAINT HISTORY
// ============================================================
export async function addComplaintHistory(h: Omit<ComplaintHistoryRow, "id" | "created_at">): Promise<ComplaintHistoryRow> {
  const id = newId("hist");
  await getDb().execute({ sql: "INSERT INTO complaint_history (id, complaint_id, user_id, action, old_status, new_status, description) VALUES (?,?,?,?,?,?,?)", args: [id, h.complaint_id, h.user_id ?? null, h.action, h.old_status ?? null, h.new_status ?? null, h.description ?? null] });
  const { rows } = await getDb().execute({ sql: "SELECT * FROM complaint_history WHERE id = ?", args: [id] });
  return rows[0] as ComplaintHistoryRow;
}

export async function getComplaintHistory(complaintId: string): Promise<ComplaintHistoryRow[]> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM complaint_history WHERE complaint_id = ? ORDER BY created_at ASC", args: [complaintId] });
  return rows as ComplaintHistoryRow[];
}

// ============================================================
// CITIZEN VERIFICATION
// ============================================================
export async function setCitizenVerification(complaintId: string, citizenId: string, verification: CitizenVerification, remarks: string | null) {
  await getDb().execute({ sql: "UPDATE complaints SET citizen_verification = ?, citizen_remarks = ?, verification_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND citizen_id = ?", args: [verification, remarks, complaintId, citizenId] });
}

// ============================================================
// NOTIFICATIONS
// ============================================================
export async function createNotification(n: Omit<NotificationRow, "id" | "created_at" | "is_read" | "valid_until"> & { valid_until?: string | null }): Promise<NotificationRow> {
  const id = newId("notif");
  await getDb().execute({ sql: "INSERT INTO notifications (id, user_id, complaint_id, type, title_en, title_ur, body_en, body_ur, valid_until) VALUES (?,?,?,?,?,?,?,?,?)", args: [id, n.user_id, n.complaint_id ?? null, n.type, n.title_en, n.title_ur, n.body_en, n.body_ur, n.valid_until ?? null] });
  const { rows } = await getDb().execute({ sql: "SELECT * FROM notifications WHERE id = ?", args: [id] });
  return rows[0] as NotificationRow;
}

export async function listNotifications(userId: string): Promise<NotificationRow[]> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM notifications WHERE user_id = ? AND (valid_until IS NULL OR valid_until > datetime('now')) ORDER BY created_at DESC LIMIT 50", args: [userId] });
  return rows as NotificationRow[];
}

export async function getNotificationById(id: string): Promise<NotificationRow | undefined> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM notifications WHERE id = ?", args: [id] });
  return rows[0] as NotificationRow | undefined;
}

export async function markNotificationRead(id: string) {
  await getDb().execute({ sql: "UPDATE notifications SET is_read = 1 WHERE id = ?", args: [id] });
}

export async function markAllNotificationsRead(userId: string) {
  await getDb().execute({ sql: "UPDATE notifications SET is_read = 1 WHERE user_id = ?", args: [userId] });
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  const { rows } = await getDb().execute({ sql: "SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0 AND (valid_until IS NULL OR valid_until > datetime('now'))", args: [userId] });
  return (rows[0] as any).c as number;
}

// ============================================================
// EMPLOYEES
// ============================================================
export async function listEmployeesByDepartment(deptId: string): Promise<UserRow[]> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM users WHERE department_id = ? AND role = 'EMPLOYEE' ORDER BY name", args: [deptId] });
  return rows as UserRow[];
}

export async function listEmployeesByDepartmentAndDistrict(deptId: string, districtId: string): Promise<UserRow[]> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM users WHERE department_id = ? AND district_id = ? AND role = 'EMPLOYEE' ORDER BY name", args: [deptId, districtId] });
  return rows as UserRow[];
}

export async function countEmployeesByDepartment(deptId: string): Promise<number> {
  const { rows } = await getDb().execute({ sql: "SELECT COUNT(*) as c FROM users WHERE department_id = ? AND role = 'EMPLOYEE' AND is_active = 1", args: [deptId] });
  return (rows[0] as any).c as number;
}

export async function countComplaintsByDepartment(deptId: string): Promise<number> {
  const { rows } = await getDb().execute({ sql: "SELECT COUNT(*) as c FROM complaints WHERE department_id = ?", args: [deptId] });
  return (rows[0] as any).c as number;
}

// ============================================================
// MASTER PROBLEMS
// ============================================================
export async function createMasterProblem(m: Omit<MasterProblemRow, "created_at" | "updated_at">): Promise<MasterProblemRow> {
  const id = newId("mst");
  await getDb().execute({
    sql: `INSERT INTO master_problems (id, code, department_id, district_id, category, title, description, latitude, longitude, area, priority, status, assigned_employee_id, assigned_officer_id, deadline, complaint_count) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [id, m.code, m.department_id, m.district_id ?? null, m.category ?? null, m.title, m.description ?? null, m.latitude ?? null, m.longitude ?? null, m.area ?? null, m.priority ?? "P2", m.status ?? "OPEN", m.assigned_employee_id ?? null, m.assigned_officer_id ?? null, m.deadline ?? null, m.complaint_count ?? 1],
  });
  return (await getMasterProblemById(id))!;
}

export async function getMasterProblemById(id: string): Promise<MasterProblemRow | undefined> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM master_problems WHERE id = ?", args: [id] });
  return rows[0] as MasterProblemRow | undefined;
}

export async function getMasterProblemByCode(code: string): Promise<MasterProblemRow | undefined> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM master_problems WHERE code = ?", args: [code] });
  return rows[0] as MasterProblemRow | undefined;
}

export async function listMasterProblemsByDepartment(departmentId: string): Promise<MasterProblemRow[]> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM master_problems WHERE department_id = ? ORDER BY created_at DESC", args: [departmentId] });
  return rows as MasterProblemRow[];
}

export async function listMasterProblemsByDepartmentAndDistrict(departmentId: string, districtId: string): Promise<MasterProblemRow[]> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM master_problems WHERE department_id = ? AND district_id = ? ORDER BY created_at DESC", args: [departmentId, districtId] });
  return rows as MasterProblemRow[];
}

export async function listAllMasterProblems(): Promise<MasterProblemRow[]> {
  const { rows } = await getDb().execute("SELECT * FROM master_problems ORDER BY created_at DESC");
  return rows as MasterProblemRow[];
}

export async function updateMasterProblem(id: string, fields: Partial<MasterProblemRow>) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => (fields as any)[k]);
  await getDb().execute({ sql: `UPDATE master_problems SET ${setClause}, updated_at = datetime('now') WHERE id = ?`, args: [...values, id] });
}

export async function getMasterProblemYearSeq(year: number): Promise<number> {
  const { rows } = await getDb().execute({ sql: "SELECT COUNT(*) as c FROM master_problems WHERE code LIKE ?", args: [`MP-${year}-%`] });
  return (rows[0] as any).c + 1;
}

// Find similar complaints for duplicate detection (same category + nearby location within ~500m)
export async function findSimilarComplaints(category: string, latitude: number, longitude: number, departmentId: string, excludeComplaintId?: string, radiusKm: number = 0.5): Promise<ComplaintRow[]> {
  // Get all complaints with same category and department that don't have a master_problem_id yet
  const { rows } = await getDb().execute({
    sql: `SELECT * FROM complaints WHERE category = ? AND department_id = ? AND master_problem_id IS NULL AND status != 'RESOLVED' ORDER BY created_at DESC LIMIT 50`,
    args: [category, departmentId],
  });
  
  // Filter by distance (Haversine approximation for small distances)
  const similar = (rows as ComplaintRow[]).filter(c => {
    if (excludeComplaintId && c.id === excludeComplaintId) return false;
    const latDiff = Math.abs(c.latitude - latitude);
    const lonDiff = Math.abs(c.longitude - longitude);
    // Rough conversion: 1 degree ~ 111km
    const distanceKm = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111;
    return distanceKm <= radiusKm;
  });
  
  return similar;
}

// Link complaint to master problem
export async function linkComplaintToMasterProblem(complaintId: string, masterProblemId: string) {
  await getDb().execute({ sql: "UPDATE complaints SET master_problem_id = ?, updated_at = datetime('now') WHERE id = ?", args: [masterProblemId, complaintId] });
}

// Get all complaints linked to a master problem
export async function getComplaintsByMasterProblem(masterProblemId: string): Promise<ComplaintRow[]> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM complaints WHERE master_problem_id = ? ORDER BY created_at ASC", args: [masterProblemId] });
  return rows as ComplaintRow[];
}

// Get master problems assigned to an employee
export async function listMasterProblemsByEmployee(employeeId: string): Promise<MasterProblemRow[]> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM master_problems WHERE assigned_employee_id = ? ORDER BY created_at DESC", args: [employeeId] });
  return rows as MasterProblemRow[];
}

// ============================================================
// BROADCASTS (Government Announcements / Orders)
// ============================================================
export async function createBroadcast(b: Omit<BroadcastRow, "created_at">): Promise<BroadcastRow> {
  const id = b.id || newId("bc");
  await getDb().execute({
    sql: `INSERT INTO broadcasts (id, sender_id, sender_role, title, message, target_level, target_ids, department_id, district_id, valid_from, valid_until, is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [id, b.sender_id, b.sender_role, b.title, b.message, b.target_level, b.target_ids, b.department_id ?? null, b.district_id ?? null, b.valid_from ?? null, b.valid_until ?? null, b.is_active ?? 1],
  });
  return (await getBroadcastById(id))!;
}

export async function getBroadcastById(id: string): Promise<BroadcastRow | undefined> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM broadcasts WHERE id = ?", args: [id] });
  return rows[0] as BroadcastRow | undefined;
}

export async function listBroadcastsBySender(senderId: string): Promise<BroadcastRow[]> {
  const { rows } = await getDb().execute({ sql: "SELECT * FROM broadcasts WHERE sender_id = ? ORDER BY created_at DESC", args: [senderId] });
  return rows as BroadcastRow[];
}

export async function listAllBroadcasts(): Promise<BroadcastRow[]> {
  const { rows } = await getDb().execute("SELECT * FROM broadcasts ORDER BY created_at DESC");
  return rows as BroadcastRow[];
}

export async function listActiveBroadcasts(): Promise<BroadcastRow[]> {
  const { rows } = await getDb().execute({
    sql: "SELECT * FROM broadcasts WHERE is_active = 1 AND (valid_until IS NULL OR valid_until > datetime('now')) ORDER BY created_at DESC",
    args: [],
  });
  return rows as BroadcastRow[];
}

// Safe JSON parse helper for target_ids
function safeParseTargets(raw: string | null | undefined): string[] {
  try { return JSON.parse(raw || "[]"); } catch { return []; }
}

// Broadcasts targeted at specific CMOs (by user ID)
export async function listBroadcastsForCmo(cmoUserId: string): Promise<BroadcastRow[]> {
  const all = await listActiveBroadcasts();
  return all.filter(b => {
    if (b.target_level === "CMO") {
      const targets = safeParseTargets(b.target_ids);
      return targets.includes(cmoUserId) || targets.length === 0;
    }
    return false;
  });
}

// Broadcasts targeted at specific districts (for CMO to see what's sent to their districts)
export async function listBroadcastsForDistricts(districtIds: string[]): Promise<BroadcastRow[]> {
  const all = await listActiveBroadcasts();
  return all.filter(b => {
    if (b.target_level === "DISTRICT" || b.target_level === "CITIZENS") {
      const targets = safeParseTargets(b.target_ids);
      return targets.some(t => districtIds.includes(t));
    }
    return false;
  });
}

// Broadcasts visible to a citizen: district-level broadcasts for their district + citizen-level broadcasts
export async function listBroadcastsForCitizen(districtId: string | null, citizenComplaintDistricts: string[]): Promise<BroadcastRow[]> {
  const all = await listActiveBroadcasts();
  const allDistricts = districtId ? [...new Set([...citizenComplaintDistricts, districtId])] : citizenComplaintDistricts;
  
  return all.filter(b => {
    if (b.target_level === "CITIZENS") {
      const targets = safeParseTargets(b.target_ids);
      return targets.some(t => allDistricts.includes(t));
    }
    if (b.target_level === "DISTRICT") {
      const targets = safeParseTargets(b.target_ids);
      return targets.some(t => allDistricts.includes(t));
    }
    return false;
  });
}

// Get all citizens who have complained in a specific district
export async function listCitizensByDistrict(districtId: string): Promise<{ id: string; name: string; email: string }[]> {
  const { rows } = await getDb().execute({
    sql: `SELECT DISTINCT u.id, u.name, u.email FROM users u INNER JOIN complaints c ON c.citizen_id = u.id WHERE c.district_id = ? AND u.role = 'CITIZEN'`,
    args: [districtId],
  });
  return rows as { id: string; name: string; email: string }[];
}

// Get all CMOs (optionally filtered by department)
export async function listCmos(departmentId?: string): Promise<UserRow[]> {
  if (departmentId) {
    const { rows } = await getDb().execute({ sql: "SELECT * FROM users WHERE role = 'CMO' AND department_id = ? AND is_active = 1 ORDER BY name", args: [departmentId] });
    return rows as UserRow[];
  }
  const { rows } = await getDb().execute({ sql: "SELECT * FROM users WHERE role = 'CMO' AND is_active = 1 ORDER BY name" });
  return rows as UserRow[];
}
