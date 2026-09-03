export type Lang = "EN" | "UR";

export const dictionary = {
  appName: { EN: "Pukar", UR: "پکار" },
  appFullName: { EN: "Pukar", UR: "پکار" },
  tagline: { EN: "From Complaints to Action.", UR: "شکایات سے کارروائی تک۔" },
  subTagline: { EN: "Detect. Prioritize. Resolve. Prevent.", UR: "شناخت، ترجیح، حل، تدارک۔" },
  noticeTitle: { EN: "Important Notice", UR: "اہم اطلاع" },
  noticeBody: {
    EN: "This platform is designed to report, monitor and manage public problems. In life-threatening emergencies, users should also contact appropriate emergency services.",
    UR: "یہ پلیٹ فارم عوامی مسائل کی اطلاع دینے، نگرانی کرنے اور ان کا انتظام کرنے کے لیے بنایا گیا ہے۔ جان لیوا ہنگامی صورتحال میں، صارفین کو متعلقہ ہنگامی خدمات سے بھی رابطہ کرنا چاہیے۔",
  },
  iUnderstand: { EN: "I Understand", UR: "میں سمجھ گیا" },
  chooseLanguage: { EN: "Choose your language", UR: "اپنی زبان منتخب کریں" },
  english: { EN: "English", UR: "انگریزی" },
  urdu: { EN: "Urdu", UR: "اردو" },
  login: { EN: "Login", UR: "لاگ ان" },
  signup: { EN: "Sign up", UR: "سائن اپ" },
  email: { EN: "Email", UR: "ای میل" },
  password: { EN: "Password", UR: "پاسورڈ" },
  name: { EN: "Full name", UR: "پورا نام" },
  reportProblem: { EN: "Report a Problem", UR: "مسئلہ رپورٹ کریں" },
  myComplaints: { EN: "My Complaints", UR: "میری شکایات" },
  notifications: { EN: "Notifications", UR: "اطلاعات" },
  problemsNearMe: { EN: "Problems Near Me", UR: "قریبی مسائل" },
  safetyAlerts: { EN: "Safety Alerts", UR: "حفاظتی الرٹس" },
  trackComplaint: { EN: "Track Complaint", UR: "شکایت ٹریک کریں" },
  activeComplaints: { EN: "Active Complaints", UR: "فعال شکایات" },
  resolvedComplaints: { EN: "Resolved Complaints", UR: "حل شدہ شکایات" },
  pendingComplaints: { EN: "Pending Complaints", UR: "زیر التوا شکایات" },
  submit: { EN: "Submit Complaint", UR: "شکایت جمع کروائیں" },
  next: { EN: "Next", UR: "اگلا" },
  back: { EN: "Back", UR: "پیچھے" },
  description: { EN: "Describe the problem", UR: "مسئلے کی وضاحت کریں" },
  location: { EN: "Location", UR: "مقام" },
  impact: { EN: "Impact", UR: "اثر" },
  review: { EN: "Review", UR: "جائزہ" },
  whoIsAffected: { EN: "Who is affected?", UR: "کون متاثر ہے؟" },
  meOnly: { EN: "Me only", UR: "صرف میں" },
  myStreet: { EN: "My street", UR: "میری گلی" },
  multipleStreets: { EN: "Multiple streets", UR: "متعدد گلیاں" },
  largeArea: { EN: "Large area", UR: "بڑا علاقہ" },
  aiAnalyzing: { EN: "AI is analyzing your complaint...", UR: "اے آئی آپ کی شکایت کا تجزیہ کر رہا ہے..." },
  complaintRegistered: { EN: "Complaint Registered Successfully", UR: "شکایت کامیابی سے درج ہو گئی" },
  viewComplaint: { EN: "View Complaint", UR: "شکایت دیکھیں" },
  downloadReceipt: { EN: "Download Receipt", UR: "رسید ڈاؤن لوڈ کریں" },
  logout: { EN: "Log out", UR: "لاگ آؤٹ" },
  wasProblemSolved: { EN: "Was your problem actually solved?", UR: "کیا آپ کا مسئلہ واقعی حل ہو گیا؟" },
  yes: { EN: "Yes", UR: "جی ہاں" },
  no: { EN: "No", UR: "نہیں" },
  askPprAi: { EN: "Ask Pukar AI", UR: "پکار اے آئی سے پوچھیں" },
} as const;

export type DictKey = keyof typeof dictionary;

export function t(lang: Lang, key: DictKey): string {
  return dictionary[key]?.[lang] ?? dictionary[key]?.EN ?? String(key);
}

export const priorityLabel: Record<string, { EN: string; UR: string }> = {
  P0: { EN: "Emergency", UR: "ہنگامی" },
  P1: { EN: "Critical", UR: "نازک" },
  P2: { EN: "Normal", UR: "معمولی" },
  P3: { EN: "Low", UR: "کم" },
};

export const statusLabel: Record<string, { EN: string; UR: string }> = {
  SUBMITTED: { EN: "Submitted", UR: "جمع کروائی گئی" },
  AI_ANALYZED: { EN: "AI Analyzed", UR: "اے آئی تجزیہ شدہ" },
  ROUTED: { EN: "Routed", UR: "روانہ شدہ" },
  ASSIGNED: { EN: "Assigned", UR: "تفویض شدہ" },
  IN_PROGRESS: { EN: "In Progress", UR: "جاری ہے" },
  WAITING: { EN: "Waiting", UR: "منتظر" },
  RESOLVED: { EN: "Resolved", UR: "حل شدہ" },
  CLOSED: { EN: "Closed", UR: "بند" },
  OVERDUE: { EN: "Overdue", UR: "میعاد ختم" },
  ESCALATED: { EN: "Escalated", UR: "اعلیٰ سطح پر بھیجی گئی" },
  REOPENED: { EN: "Reopened", UR: "دوبارہ کھولی گئی" },
  NEEDS_REVIEW: { EN: "Needs Review", UR: "نظرثانی درکار" },
};

export const COOKIE_LANG = "ppr_lang";
