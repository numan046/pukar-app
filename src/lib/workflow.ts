// @ts-nocheck — workflow layer: all DB calls are now async
import {
  createComplaint, updateComplaint, addComplaintHistory, createComplaintUpdate,
  createNotification, getDepartmentBySlug, createDepartment, getComplaintYearSeq,
  getComplaintById, getOfficerForDepartment, getOfficerForDepartmentDistrict,
  getCmoForDepartment, getUserById, setCitizenVerification, getDistrictByName, listDistricts,
  listUnassignedComplaintsOlderThan24h, notificationExistsForComplaint,
} from "@/lib/db/repo";
import { analyzeComplaint, detectAndCluster } from "@/lib/ai";
import { newId, complaintCode } from "@/lib/id";
import type { ComplaintRow, ComplaintStatus, CitizenVerification, Language } from "@/types";

export interface SubmitComplaintInput {
  citizenId: string; title: string; description: string; language: Language;
  hasImage: boolean; hasVideo: boolean; mediaUrls: string[];
  latitude: number; longitude: number;
  address?: string; area?: string; tehsil?: string;
  confirmedDepartmentId?: string; categoryId?: string; subCategory?: string;
}

async function resolveDistrict(area?: string, tehsil?: string, latitude?: number, longitude?: number): Promise<{ districtId: string | null; isUnknown: boolean; matchedName?: string }> {
  const searchName = area || tehsil;
  if (searchName) {
    const exactMatch = await getDistrictByName(searchName);
    if (exactMatch) return { districtId: exactMatch.id, isUnknown: false, matchedName: exactMatch.name };
    const districts = await listDistricts();
    const lowerSearch = searchName.toLowerCase();
    for (const d of districts) {
      if (d.name.toLowerCase().includes(lowerSearch) || lowerSearch.includes(d.name.toLowerCase())) {
        return { districtId: d.id, isUnknown: false, matchedName: d.name };
      }
    }
  }

  // Fallback: reverse geocode from coordinates to find district
  if (latitude && longitude) {
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
        { headers: { "User-Agent": "Pukar-Complaint-App/1.0", "Accept-Language": "en" }, signal: AbortSignal.timeout(8000) }
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        const addr = geoData.address || {};
        // Try to match district from reverse geocoding result
        let geoDistrictName = addr.city || addr.town || addr.district || addr.county || addr.state_district;
        if (geoDistrictName) {
          // Translation map for Urdu/Roman names to English (Pakistani cities)
          const urduToEnglish: Record<string, string> = {
            "اسلام آباد": "Islamabad", "راولپنڈی": "Rawalpindi", "لاہور": "Lahore",
            "سیالکوٹ": "Sialkot", "گوجرانوالہ": "Gujranwala", "گجرات": "Gujrat",
            "فیصل آباد": "Faisalabad", "ملتان": "Multan", "کراچی": "Karachi",
            "پشاور": "Peshawar", "کوئٹہ": "Quetta", "بہاولپور": "Bahawalpur",
            "سکھر": "Sukkur", "حیدرآباد": "Hyderabad", "لاڑکانہ": "Larkana",
          };
          // If name is in Urdu script, try to translate
          if (/[\u0600-\u06FF]/.test(geoDistrictName)) {
            geoDistrictName = urduToEnglish[geoDistrictName] || geoDistrictName;
          }
          const exactMatch = await getDistrictByName(geoDistrictName);
          if (exactMatch) return { districtId: exactMatch.id, isUnknown: false, matchedName: exactMatch.name };
          // Fuzzy match
          const districts = await listDistricts();
          const lowerGeo = geoDistrictName.toLowerCase();
          for (const d of districts) {
            if (d.name.toLowerCase().includes(lowerGeo) || lowerGeo.includes(d.name.toLowerCase())) {
              return { districtId: d.id, isUnknown: false, matchedName: d.name };
            }
          }
        }
      }
    } catch {
      // Reverse geocoding failed — continue with unknown district
    }
  }

  // District not found — return null, complaint will be flagged as unknown district
  return { districtId: null, isUnknown: true };
}

async function resolveDepartmentId(slug: string, name: string): Promise<string> {
  const existing = await getDepartmentBySlug(slug);
  if (existing) return existing.id;
  return (await createDepartment(name, slug)).id;
}

export async function submitComplaint(input: SubmitComplaintInput): Promise<{
  complaint: ComplaintRow;
  aiSuggestion: { department: string; departmentSlug: string; category: string; confidence: number } | null;
}> {
  let departmentId: string | null = input.confirmedDepartmentId ?? null;
  let aiSuggestion: { department: string; departmentSlug: string; category: string; confidence: number } | null = null;

  // ── AI classification (only when citizen didn't confirm department) ─
  if (!departmentId) {
    const ai = await analyzeComplaint(input.description, "ME_ONLY");
    if (ai.mode === "NOT_UNDERSTOOD" || ai.confidence === 0) {
      throw new Error("AI could not understand your complaint. Please rephrase it and try again. We only handle: Gas issues, Electricity issues, Road Damage, and Waterlogging.");
    }
    departmentId = await resolveDepartmentId(ai.departmentSlug, ai.department);
    aiSuggestion = { department: ai.department, departmentSlug: ai.departmentSlug, category: ai.category, confidence: ai.confidence };

    const districtResult = await resolveDistrict(input.area, input.tehsil, input.latitude, input.longitude);
    const districtId = districtResult.districtId;
    const id = newId("cmp");
    const year = new Date().getFullYear();
    const seq = await getComplaintYearSeq(year);
    const code = complaintCode(year, seq);

    // Create complaint first (needed for all subsequent operations)
    await createComplaint({
      id, complaint_code: code, citizen_id: input.citizenId,
      title: input.title || ai.category, description: input.description, language: input.language,
      has_image: input.hasImage ? 1 : 0, has_video: input.hasVideo ? 1 : 0,
      media_urls: JSON.stringify(input.mediaUrls ?? []),
      category: ai.category, sub_category: input.subCategory ?? ai.subCategory,
      category_id: input.categoryId ?? null, department_id: departmentId, district_id: districtId,
      latitude: input.latitude, longitude: input.longitude,
      address: input.address ?? null, area: input.area ?? null, tehsil: input.tehsil ?? null,
      ai_suggestion: JSON.stringify(aiSuggestion), ai_confidence: ai.confidence, ai_mode: ai.mode, status: "PENDING",
      priority: ai.priority,
    });

    // Run all independent operations in parallel (Promise.all = parallel HTTP calls)
    const officerPromise = districtId
      ? getOfficerForDepartmentDistrict(departmentId, districtId)
      : Promise.resolve(undefined);
    const cmoPromise = getCmoForDepartment(departmentId);

    await Promise.all([
      addComplaintHistory({ complaint_id: id, user_id: input.citizenId, action: "COMPLAINT_SUBMITTED", new_status: "PENDING", description: `Complaint ${code} submitted` }),
      addComplaintHistory({ complaint_id: id, user_id: null, action: "AI_CLASSIFIED", description: `${ai.category} / ${Math.round(ai.confidence * 100)}% confidence` }),
      createNotification({
        user_id: input.citizenId, complaint_id: id, type: "SUBMITTED",
        title_en: "Complaint Submitted", title_ur: "شکایت جمع ہو گئی",
        body_en: `Your complaint ${code} has been received and classified as ${ai.category}.`,
        body_ur: `آپ کی شکایت ${code} موصول ہو گئی ہے اور اسے ${ai.category} کے طور پر درجہ بند کیا گیا ہے۔`,
      }),
      officerPromise, cmoPromise,
    ]);

    const officer = await officerPromise;
    const cmo = await cmoPromise;

    // Send routing notification
    if (districtResult.isUnknown && cmo) {
      await createNotification({
        user_id: cmo.id, complaint_id: id, type: "UNKNOWN_DISTRICT",
        title_en: "Complaint from Unrecognized District", title_ur: "نامعلوم ضلع سے شکایت",
        body_en: `Complaint ${code} was filed from area "${input.area || input.tehsil || 'unknown'}" which is not in our district list. Please review and assign manually.`,
        body_ur: `شکایت ${code} علاقے "${input.area || input.tehsil || 'نامعلوم'}" سے جمع کی گئی جو ہماری فہرست میں نہیں ہے۔ براہ کرم جائزہ لیں اور دستی طور پر تفویض کریں۔`,
      });
    } else if (officer) {
      await createNotification({
        user_id: officer.id, complaint_id: id, type: "NEW_COMPLAINT",
        title_en: "New Complaint Received", title_ur: "نئی شکایت موصول ہوئی",
        body_en: `A new complaint (${code}) has been received for your district.`,
        body_ur: `آپ کے ضلع کے لیے ایک نئی شکایت (${code}) موصول ہو گئی ہے۔`,
      });
    } else if (cmo) {
      await createNotification({
        user_id: cmo.id, complaint_id: id, type: "MISSING_OFFICER",
        title_en: "No Officer in District", title_ur: "ضلع میں کوئی افسر نہیں",
        body_en: `A new complaint (${code}) was filed but no officer is assigned to this district. Please assign an officer.`,
        body_ur: `ایک نئی شکایت (${code}) موصول ہوئی لیکن اس ضلع میں کوئی افسر مقرر نہیں ہے۔ براہ کرم افسر مقرر کریں۔`,
      });
    }

    // ── Duplicate Detection / Master Problem Clustering ──
    const createdComplaint = await getComplaintById(id);
    if (createdComplaint && ai.category && departmentId) {
      try {
        const duplicateResult = await detectAndCluster(createdComplaint, ai.category, departmentId);
        if (duplicateResult.masterProblemId) {
          // Notify citizen that their complaint is part of a larger problem
          if (duplicateResult.created) {
            await createNotification({
              user_id: input.citizenId, complaint_id: id, type: "MASTER_PROBLEM_CREATED",
              title_en: "Your complaint is part of a larger problem", title_ur: "آپ کی شکایت ایک بڑے مسئلے کا حصہ ہے",
              body_en: `Your complaint has been grouped with ${duplicateResult.similarComplaints.length} similar complaint(s) as Master Problem ${duplicateResult.masterProblemCode}. The department will address all affected citizens together.`,
              body_ur: `آپ کی شکایت کو ${duplicateResult.similarComplaints.length} مماثل شکایات کے ساتھ ماسٹر پرابلم ${duplicateResult.masterProblemCode} میں شامل کر دیا گیا ہے۔ محکمہ تمام متاثرہ شہریوں کو اکٹھا حل فراہم کرے گا۔`,
            });
          } else if (duplicateResult.linkedToExisting) {
            await createNotification({
              user_id: input.citizenId, complaint_id: id, type: "MASTER_PROBLEM_JOINED",
              title_en: "Your complaint joins an existing problem", title_ur: "آپ کی شکایت موجودہ مسئلے میں شامل ہو گئی",
              body_en: `Your complaint has been added to Master Problem ${duplicateResult.masterProblemCode} which already has ${duplicateResult.similarComplaints.length + 1} citizens affected.`,
              body_ur: `آپ کی شکایت ماسٹر پرابلم ${duplicateResult.masterProblemCode} میں شامل کر دی گئی ہے جس میں پہلے سے ${duplicateResult.similarComplaints.length + 1} شہری متاثر ہیں۔`,
            });
          }
        }
      } catch (e) {
        // Duplicate detection failed — continue without clustering
        console.error("[Workflow] Duplicate detection failed:", e);
      }
    }

    return { complaint: (await getComplaintById(id))!, aiSuggestion };
  }

  // ── Citizen confirmed department directly ──
  // Still run AI to determine category + priority for officer visibility
  const ai = await analyzeComplaint(input.description, "ME_ONLY");
  const resolvedCategory = (ai.mode !== "NOT_UNDERSTOOD" && ai.confidence > 0) ? ai.category : (input.subCategory ?? null);
  const resolvedPriority = (ai.mode !== "NOT_UNDERSTOOD" && ai.confidence > 0) ? ai.priority : "P2";

  const districtResult = await resolveDistrict(input.area, input.tehsil, input.latitude, input.longitude);
  const districtId = districtResult.districtId;
  const id = newId("cmp");
  const year = new Date().getFullYear();
  const seq = await getComplaintYearSeq(year);
  const code = complaintCode(year, seq);

  // Create complaint with AI-determined category and priority
  await createComplaint({
    id, complaint_code: code, citizen_id: input.citizenId,
    title: input.title || resolvedCategory || "Citizen Complaint", description: input.description, language: input.language,
    has_image: input.hasImage ? 1 : 0, has_video: input.hasVideo ? 1 : 0,
    media_urls: JSON.stringify(input.mediaUrls ?? []),
    category: resolvedCategory, sub_category: input.subCategory ?? (ai.mode !== "NOT_UNDERSTOOD" ? ai.subCategory : null),
    category_id: input.categoryId ?? null, department_id: departmentId, district_id: districtId,
    latitude: input.latitude, longitude: input.longitude,
    address: input.address ?? null, area: input.area ?? null, tehsil: input.tehsil ?? null,
    ai_suggestion: JSON.stringify({ department: "confirmed", category: resolvedCategory, confidence: ai.confidence }),
    ai_confidence: ai.confidence, ai_mode: ai.mode, status: "PENDING",
    priority: resolvedPriority,
  });

  // Run all independent operations in parallel
  const officerPromise = districtId
    ? getOfficerForDepartmentDistrict(departmentId, districtId)
    : Promise.resolve(undefined);
  const cmoPromise = getCmoForDepartment(departmentId);

  await Promise.all([
    addComplaintHistory({ complaint_id: id, user_id: input.citizenId, action: "COMPLAINT_SUBMITTED", new_status: "PENDING", description: `Complaint ${code} submitted` }),
    createNotification({
      user_id: input.citizenId, complaint_id: id, type: "SUBMITTED",
      title_en: "Complaint Submitted", title_ur: "شکایت جمع ہو گئی",
      body_en: `Your complaint ${code} has been received.`,
      body_ur: `آپ کی شکایت ${code} موصول ہو گئی ہے۔`,
    }),
    officerPromise, cmoPromise,
  ]);

  const officer = await officerPromise;
  const cmo = await cmoPromise;

  // Send routing notification
  if (districtResult.isUnknown && cmo) {
    await createNotification({
      user_id: cmo.id, complaint_id: id, type: "UNKNOWN_DISTRICT",
      title_en: "Complaint from Unrecognized District", title_ur: "نامعلوم ضلع سے شکایت",
      body_en: `Complaint ${code} was filed from area "${input.area || input.tehsil || 'unknown'}" which is not in our district list. Please review and assign manually.`,
      body_ur: `شکایت ${code} علاقے "${input.area || input.tehsil || 'نامعلوم'}" سے جمع کی گئی جو ہماری فہرست میں نہیں ہے۔ براہ کرم جائزہ لیں اور دستی طور پر تفویض کریں۔`,
    });
  } else if (officer) {
    await createNotification({
      user_id: officer.id, complaint_id: id, type: "NEW_COMPLAINT",
      title_en: "New Complaint Received", title_ur: "نئی شکایت موصول ہوئی",
      body_en: `A new complaint (${code}) has been received for your district.`,
      body_ur: `آپ کے ضلع کے لیے ایک نئی شکایت (${code}) موصول ہو گئی ہے۔`,
    });
  } else if (cmo) {
    await createNotification({
      user_id: cmo.id, complaint_id: id, type: "MISSING_OFFICER",
      title_en: "No Officer in District", title_ur: "ضلع میں کوئی افسر نہیں",
      body_en: `A new complaint (${code}) was filed but no officer is assigned to this district. Please assign an officer.`,
      body_ur: `ایک نئی شکایت (${code}) موصول ہوئی لیکن اس ضلع میں کوئی افسر مقرر نہیں ہے۔ براہ کرم افسر مقرر کریں۔`,
    });
  }

  // ── Duplicate Detection / Master Problem Clustering ──
  const createdComplaint = await getComplaintById(id);
  if (createdComplaint && resolvedCategory && departmentId) {
    try {
      const duplicateResult = await detectAndCluster(createdComplaint, resolvedCategory, departmentId);
      if (duplicateResult.masterProblemId) {
        if (duplicateResult.created) {
          await createNotification({
            user_id: input.citizenId, complaint_id: id, type: "MASTER_PROBLEM_CREATED",
            title_en: "Your complaint is part of a larger problem", title_ur: "آپ کی شکایت ایک بڑے مسئلے کا حصہ ہے",
            body_en: `Your complaint has been grouped with ${duplicateResult.similarComplaints.length} similar complaint(s) as Master Problem ${duplicateResult.masterProblemCode}.`,
            body_ur: `آپ کی شکایت کو ${duplicateResult.similarComplaints.length} مماثل شکایات کے ساتھ ماسٹر پرابلم ${duplicateResult.masterProblemCode} میں شامل کر دیا گیا ہے۔`,
          });
        } else if (duplicateResult.linkedToExisting) {
          await createNotification({
            user_id: input.citizenId, complaint_id: id, type: "MASTER_PROBLEM_JOINED",
            title_en: "Your complaint joins an existing problem", title_ur: "آپ کی شکایت موجودہ مسئلے میں شامل ہو گئی",
            body_en: `Your complaint has been added to Master Problem ${duplicateResult.masterProblemCode} which already has ${duplicateResult.similarComplaints.length + 1} citizens affected.`,
            body_ur: `آپ کی شکایت ماسٹر پرابلم ${duplicateResult.masterProblemCode} میں شامل کر دی گئی ہے جس میں پہلے سے ${duplicateResult.similarComplaints.length + 1} شہری متاثر ہیں۔`,
          });
        }
      }
    } catch (e) {
      console.error("[Workflow] Duplicate detection failed:", e);
    }
  }

  return { complaint: (await getComplaintById(id))!, aiSuggestion: null };
}

// ============================================================
// OFFICER ASSIGNS EMPLOYEE — PENDING → ASSIGNED
// ============================================================
export async function officerAssignEmployee(complaintId: string, officerId: string, employeeId: string, deadline: string, instructions?: string) {
  const complaint = await getComplaintById(complaintId);
  if (!complaint) throw new Error("Complaint not found");
  if (complaint.status !== "PENDING" && complaint.status !== "OFFICER_REVIEW") throw new Error("Complaint cannot be assigned in current status");
  const employee = await getUserById(employeeId);
  if (!employee) throw new Error("Employee not found");

  await updateComplaint(complaintId, { status: "ASSIGNED", assigned_employee_id: employeeId, assigned_officer_id: officerId, deadline, assignment_instructions: instructions ?? null });
  await addComplaintHistory({ complaint_id: complaintId, user_id: officerId, action: "ASSIGNED", old_status: complaint.status, new_status: "ASSIGNED", description: `Assigned to ${employee.name} with deadline ${deadline}${instructions ? `. Instructions: ${instructions}` : ""}` });
  await createComplaintUpdate({ complaint_id: complaintId, user_id: officerId, update_type: "ASSIGNMENT", message: instructions ?? `Complaint assigned to ${employee.name}` });

  await createNotification({ user_id: employeeId, complaint_id: complaintId, type: "ASSIGNED", title_en: "Complaint Assigned to You", title_ur: "شکایت آپ کے حوالے کر دی گئی", body_en: `Complaint ${complaint.complaint_code} has been assigned to you. Deadline: ${new Date(deadline).toLocaleDateString()}.`, body_ur: `شکایت ${complaint.complaint_code} آپ کے حوالے کر دی گئی ہے۔ آخری تاریخ: ${new Date(deadline).toLocaleDateString()}۔` });

  const empPhone = employee.phone ? ` Phone: ${employee.phone}.` : "";
  await createNotification({ user_id: complaint.citizen_id, complaint_id: complaintId, type: "ASSIGNED", title_en: "Complaint Assigned", title_ur: "شکایت تفویض ہو گئی", body_en: `Your complaint ${complaint.complaint_code} has been assigned to ${employee.name} (${employee.designation ?? "Employee"}) for resolution.${empPhone}`, body_ur: `آپ کی شکایت ${complaint.complaint_code} حل کے لیے ${employee.name} (${employee.designation ?? "ملازم"}) کے حوالے کر دی گئی ہے۔${employee.phone ? ` فون: ${employee.phone}` : ""}` });
}

// ============================================================
// EMPLOYEE STARTS WORK — ASSIGNED → IN_PROGRESS
// ============================================================
export async function employeeStartWork(complaintId: string, employeeId: string) {
  const complaint = await getComplaintById(complaintId);
  if (!complaint) throw new Error("Complaint not found");
  if (complaint.status !== "ASSIGNED") throw new Error("Complaint is not in ASSIGNED status");
  if (complaint.assigned_employee_id !== employeeId) throw new Error("This complaint is not assigned to you");

  await updateComplaint(complaintId, { status: "IN_PROGRESS" });
  await addComplaintHistory({ complaint_id: complaintId, user_id: employeeId, action: "WORK_STARTED", old_status: "ASSIGNED", new_status: "IN_PROGRESS", description: "Employee started working on the complaint" });
  await createComplaintUpdate({ complaint_id: complaintId, user_id: employeeId, update_type: "STATUS_CHANGE", message: "Started working on this complaint" });

  if (complaint.assigned_officer_id) {
    await createNotification({ user_id: complaint.assigned_officer_id, complaint_id: complaintId, type: "STATUS_CHANGE", title_en: "Work Started", title_ur: "کام شروع ہو گیا", body_en: `Employee has started working on complaint ${complaint.complaint_code}.`, body_ur: `ملازم نے شکایت ${complaint.complaint_code} پر کام شروع کر دیا ہے۔` });
  }
}

// ============================================================
// EMPLOYEE ADDS PROGRESS
// ============================================================
export async function employeeAddProgress(complaintId: string, employeeId: string, message: string, proofData?: string) {
  const complaint = await getComplaintById(complaintId);
  if (!complaint) throw new Error("Complaint not found");
  if (complaint.assigned_employee_id !== employeeId) throw new Error("This complaint is not assigned to you");
  if (complaint.status !== "IN_PROGRESS") throw new Error("Complaint is not in progress");

  await createComplaintUpdate({ complaint_id: complaintId, user_id: employeeId, update_type: "PROGRESS", message, proof_data: proofData ?? null });
  await addComplaintHistory({ complaint_id: complaintId, user_id: employeeId, action: "PROGRESS_UPDATE", description: message });
}

// ============================================================
// EMPLOYEE MARKS AS RESOLVED — IN_PROGRESS → MARKED_RESOLVED
// ============================================================
export async function employeeMarkResolved(complaintId: string, employeeId: string, resolutionNote: string, proofData: string) {
  const complaint = await getComplaintById(complaintId);
  if (!complaint) throw new Error("Complaint not found");
  if (complaint.assigned_employee_id !== employeeId) throw new Error("This complaint is not assigned to you");
  if (complaint.status !== "IN_PROGRESS") throw new Error("Complaint must be in progress to mark as resolved");
  if (!proofData || proofData === "[]" || proofData === "{}") throw new Error("You must provide proof (image or video) before marking as resolved");

  await updateComplaint(complaintId, { status: "MARKED_RESOLVED", resolution_note: resolutionNote, resolution_proof: proofData, resolved_at: new Date().toISOString(), resolved_by_id: employeeId });
  await addComplaintHistory({ complaint_id: complaintId, user_id: employeeId, action: "MARKED_RESOLVED", old_status: "IN_PROGRESS", new_status: "MARKED_RESOLVED", description: resolutionNote });
  await createComplaintUpdate({ complaint_id: complaintId, user_id: employeeId, update_type: "RESOLUTION", message: resolutionNote, proof_data: proofData });

  await createNotification({ user_id: complaint.citizen_id, complaint_id: complaintId, type: "MARKED_RESOLVED", title_en: "Complaint Marked as Resolved", title_ur: "شکایت حل شدہ قرار دی گئی", body_en: `Your complaint ${complaint.complaint_code} has been marked as resolved. Please verify whether the problem has been solved.`, body_ur: `آپ کی شکایت ${complaint.complaint_code} حل شدہ قرار دی گئی ہے۔ براہ کرم تصدیق کریں کہ مسئلہ واقعی حل ہوا ہے۔` });

  if (complaint.assigned_officer_id) {
    await createNotification({ user_id: complaint.assigned_officer_id, complaint_id: complaintId, type: "MARKED_RESOLVED", title_en: "Complaint Marked Resolved", title_ur: "شکایت حل شدہ نشان زد", body_en: `Complaint ${complaint.complaint_code} has been marked as resolved by the employee.`, body_ur: `شکایت ${complaint.complaint_code} ملازم نے حل شدہ نشان زد کی ہے۔` });
  }
}

// ============================================================
// CITIZEN VERIFICATION — MARKED_RESOLVED → RESOLVED / OFFICER_REVIEW
// ============================================================
export async function citizenVerify(complaintId: string, citizenId: string, response: "YES" | "NO", remarks?: string) {
  const complaint = await getComplaintById(complaintId);
  if (!complaint) throw new Error("Complaint not found");
  if (complaint.citizen_id !== citizenId) throw new Error("Not your complaint");
  if (complaint.status !== "MARKED_RESOLVED") throw new Error("Complaint is not awaiting verification");

  await setCitizenVerification(complaintId, citizenId, response, remarks ?? null);

  if (response === "YES") {
    await updateComplaint(complaintId, { status: "RESOLVED" });
    await addComplaintHistory({ complaint_id: complaintId, user_id: citizenId, action: "CITIZEN_VERIFIED_YES", old_status: "MARKED_RESOLVED", new_status: "RESOLVED", description: remarks ? `Citizen confirmed resolved. Remarks: ${remarks}` : "Citizen confirmed the problem is solved" });
    await createNotification({ user_id: complaint.assigned_officer_id!, complaint_id: complaintId, type: "CITIZEN_CONFIRMED", title_en: "Citizen Confirmed Resolution", title_ur: "شہری نے تصدیق کی", body_en: `Citizen has confirmed that complaint ${complaint.complaint_code} has been resolved.`, body_ur: `شہری نے تصدیق کی ہے کہ شکایت ${complaint.complaint_code} حل ہو گئی ہے۔` });
  } else {
    await updateComplaint(complaintId, { status: "OFFICER_REVIEW" });
    await addComplaintHistory({ complaint_id: complaintId, user_id: citizenId, action: "CITIZEN_VERIFIED_NO", old_status: "MARKED_RESOLVED", new_status: "OFFICER_REVIEW", description: remarks ? `Citizen disagrees. Remarks: ${remarks}` : "Citizen reported the problem is not resolved" });
    await createNotification({ user_id: complaint.assigned_officer_id!, complaint_id: complaintId, type: "CITIZEN_REJECTED", title_en: "Citizen Disagrees — Review Required", title_ur: "شہری متفق نہیں — نظرثانی ضروری", body_en: `Citizen has reported that complaint ${complaint.complaint_code} is NOT resolved. Please review.`, body_ur: `شہری نے اطلاع دی ہے کہ شکایت ${complaint.complaint_code} حل نہیں ہوئی۔ براہ کرم جائزہ لیں۔` });
    if (complaint.assigned_employee_id) {
      await createNotification({ user_id: complaint.assigned_employee_id, complaint_id: complaintId, type: "CITIZEN_REJECTED", title_en: "Citizen Reported Not Solved", title_ur: "شہری نے بتایا کہ حل نہیں ہوا", body_en: `The citizen has reported that complaint ${complaint.complaint_code} is not resolved. The officer will review.`, body_ur: `شہری نے بتایا ہے کہ شکایت ${complaint.complaint_code} حل نہیں ہوئی۔ افسر جائزہ لے گا۔` });
    }
  }
}

// ============================================================
// OFFICER HANDLES DISPUTE — OFFICER_REVIEW → ...
// ============================================================
export async function officerHandleDispute(complaintId: string, officerId: string, action: "RETURN_TO_IN_PROGRESS" | "REASSIGN" | "KEEP_UNDER_REVIEW" | "RESOLVE_MANUALLY", newEmployeeId?: string, note?: string) {
  const complaint = await getComplaintById(complaintId);
  if (!complaint) throw new Error("Complaint not found");
  if (complaint.status !== "OFFICER_REVIEW") throw new Error("Complaint is not under officer review");

  switch (action) {
    case "RETURN_TO_IN_PROGRESS":
      await updateComplaint(complaintId, { status: "IN_PROGRESS" });
      await addComplaintHistory({ complaint_id: complaintId, user_id: officerId, action: "OFFICER_RETURNED", old_status: "OFFICER_REVIEW", new_status: "IN_PROGRESS", description: note ?? "Officer returned complaint to employee for further work" });
      await createComplaintUpdate({ complaint_id: complaintId, user_id: officerId, update_type: "OFFICER_ACTION", message: note ?? "Returned to employee for further work" });
      if (complaint.assigned_employee_id) {
        await createNotification({ user_id: complaint.assigned_employee_id, complaint_id: complaintId, type: "OFFICER_ACTION", title_en: "Complaint Returned for Further Work", title_ur: "شکایت مزید کام کے لیے واپس", body_en: `The officer has returned complaint ${complaint.complaint_code} for further work.`, body_ur: `افسر نے شکایت ${complaint.complaint_code} مزید کام کے لیے واپس کر دی ہے۔` });
      }
      break;
    case "REASSIGN":
      if (!newEmployeeId) throw new Error("New employee is required for reassignment");
      const newEmployee = await getUserById(newEmployeeId);
      if (!newEmployee) throw new Error("Employee not found");
      await updateComplaint(complaintId, { status: "ASSIGNED", assigned_employee_id: newEmployeeId });
      await addComplaintHistory({ complaint_id: complaintId, user_id: officerId, action: "REASSIGNED", old_status: "OFFICER_REVIEW", new_status: "ASSIGNED", description: `Reassigned from previous employee to ${newEmployee.name}` });
      await createComplaintUpdate({ complaint_id: complaintId, user_id: officerId, update_type: "OFFICER_ACTION", message: note ?? `Reassigned to ${newEmployee.name}` });
      await createNotification({ user_id: newEmployeeId, complaint_id: complaintId, type: "REASSIGNED", title_en: "Complaint Reassigned to You", title_ur: "شکایت آپ کے حوالے کر دی گئی", body_en: `Complaint ${complaint.complaint_code} has been reassigned to you.`, body_ur: `شکایت ${complaint.complaint_code} آپ کے حوالے کر دی گئی ہے۔` });
      break;
    case "KEEP_UNDER_REVIEW":
      await addComplaintHistory({ complaint_id: complaintId, user_id: officerId, action: "KEEP_UNDER_REVIEW", description: note ?? "Officer keeping complaint under review" });
      await createComplaintUpdate({ complaint_id: complaintId, user_id: officerId, update_type: "OFFICER_ACTION", message: note ?? "Keeping under review" });
      break;
    case "RESOLVE_MANUALLY":
      await updateComplaint(complaintId, { status: "RESOLVED", resolved_at: new Date().toISOString(), resolved_by_id: officerId });
      await addComplaintHistory({ complaint_id: complaintId, user_id: officerId, action: "OFFICER_RESOLVED", old_status: "OFFICER_REVIEW", new_status: "RESOLVED", description: note ?? "Officer resolved the complaint after review" });
      await createComplaintUpdate({ complaint_id: complaintId, user_id: officerId, update_type: "OFFICER_ACTION", message: note ?? "Resolved after officer review" });
      await createNotification({ user_id: complaint.citizen_id, complaint_id: complaintId, type: "RESOLVED", title_en: "Complaint Resolved by Officer", title_ur: "شکایت افسر نے حل کر دی", body_en: `Your complaint ${complaint.complaint_code} has been resolved after officer review.`, body_ur: `آپ کی شکایت ${complaint.complaint_code} افسر کے جائزے کے بعد حل کر دی گئی ہے۔` });
      break;
  }
}

// ============================================================
// CHECK OVERDUE (pure function, no DB calls)
// ============================================================
export function checkOverdue(complaint: ComplaintRow): ComplaintRow {
  if (!complaint.deadline) return complaint;
  if (["RESOLVED"].includes(complaint.status)) return complaint;
  const isOverdue = new Date(complaint.deadline).getTime() < Date.now();
  if (!isOverdue) return complaint;
  return complaint;
}

// ============================================================
// CHECK UNASSIGNED COMPLAINTS (24h rule) — Notify CMO
// If a complaint is PENDING for more than 24 hours without being
// assigned to an employee, notify the department CMO.
// ============================================================
export async function checkAndNotifyUnassignedComplaints(departmentId: string): Promise<number> {
  const complaints = await listUnassignedComplaintsOlderThan24h(departmentId);
  if (complaints.length === 0) return 0;

  const cmo = await getCmoForDepartment(departmentId);
  if (!cmo) return 0;

  let notified = 0;
  for (const c of complaints) {
    // Avoid duplicate notifications
    const alreadyNotified = await notificationExistsForComplaint(c.id, "UNASSIGNED_24H");
    if (alreadyNotified) continue;

    const hoursPending = Math.round((Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60));
    await createNotification({
      user_id: cmo.id,
      complaint_id: c.id,
      type: "UNASSIGNED_24H",
      title_en: "Complaint Unassigned for 24+ Hours",
      title_ur: "شکایت 24 گھنٹے سے تفویض نہیں ہوئی",
      body_en: `Complaint ${c.complaint_code} (${c.category ?? "Uncategorized"}) has been pending for ${hoursPending} hours without being assigned to any employee. Please take action.`,
      body_ur: `شکایت ${c.complaint_code} (${c.category ?? "غیر درجہ بند"}) ${hoursPending} گھنٹے سے کسی ملازم کو تفویض نہیں ہوئی ہے۔ براہ کرم کارروائی کریں۔`,
    });
    notified++;
  }
  return notified;
}
