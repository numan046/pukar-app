import type { AiAnalysisResult, Priority } from "@/types";

interface CategoryRule {
  category: string;
  subCategory: string;
  department: string;
  departmentSlug: string;
  keywords: string[];
  basePriority: Priority;
  emergencyKeywords?: string[];
}

// Only 4 categories — AI must be smart enough to understand
// different wordings from citizens in English, Roman Urdu, and Urdu script.
const RULES: CategoryRule[] = [
  {
    category: "Gas-related Issues",
    subCategory: "Gas Leak",
    department: "Gas Department",
    departmentSlug: "gas-department",
    keywords: [
      // English
      "gas", "gas leak", "gas smell", "gas cylinder", "gas pipeline", "gas pressure",
      "gas shortage", "no gas", "low gas", "gas supply", "gas meter", "gas connection",
      "gas line", "gas odor", "gas explosion", "gas burner", "gas heater",
      // Roman Urdu
      "gas nahi", "gas ki smell", "gas leak ho rahi", "gas ka pressure", "gas nahi aa rahi",
      "gas cylinder kharab", "gas meter kharab", "gas ki pipe", "gas line toot",
      "gas ka masla", "gas nahi aa rahi", "gas low hai", "gas shortage",
      // Urdu script
      "گیس", "گیس لیک", "گیس کی بو", "گیس نہیں", "گیس کا مسلہ", "گیس پریشر",
      "گیس سلنڈر", "گیس میٹر", "گیس پائپ",
    ],
    basePriority: "P1",
    emergencyKeywords: ["gas explosion", "gas blast", "gas leak spreading", "گیس دھماکہ", "گیس لیک بہت تیز"],
  },
  {
    category: "Electricity-related Issues",
    subCategory: "Power Outage",
    department: "Electricity Department",
    departmentSlug: "electricity-department",
    keywords: [
      // English
      "electricity", "electric", "power", "power outage", "load shedding", "loadshedding",
      "no electricity", "no power", "power cut", "wire", "live wire", "electric wire",
      "sparking", "transformer", "meter", "electric pole", "pole", "breaker",
      "street light", "streetlight", "short circuit", "voltage", "blackout",
      "flickering", "electric shock", "faulty wire",
      // Roman Urdu
      "bijli", "bijli nahi", "bijli ka masla", "bijli gayab", "bijli ki tar",
      "bijli ka kamba", "bijli ka khamba", "bijli ka meter", "load shedding",
      "batti", "batti nahi", "batti kharab", "batti gayab", "bijli ka pole",
      "transformer kharab", "bijli ka masla", "power nahi hai",
      // Urdu script
      "بجلی", "بجلی نہیں", "بجلی کا مسلہ", "بجلی کی تار", "بجلی کا کھمبا",
      "بجلی کا میٹر", "لوڈ شیڈنگ", "بتی", "بتی نہیں", "بتی خراب",
      "ٹرانسفارمر", "بجلی کا پول",
    ],
    basePriority: "P1",
    emergencyKeywords: ["live wire exposed", "electric shock", "sparking danger", "بجلی کا جھٹکا", "تار ننگی"],
  },
  {
    category: "Road Damage",
    subCategory: "Pothole",
    department: "Roads Department",
    departmentSlug: "roads-department",
    keywords: [
      // English
      "road", "road damage", "pothole", "potholes", "broken road", "road crack",
      "road repair", "road construction", "damaged road", "road condition",
      "street damage", "asphalt", "road surface", "road broken", "road cave",
      "road sinkhole", "road maintenance", "road work", "patchwork",
      "road quality", "uneven road", "road collapsed",
      // Roman Urdu
      "sarak", "sarak kharab", "sarak par gaddha", "gaddha", "gaddhay",
      "road kharab hai", "road par pani", "sarak tooti", "road ka masla",
      "sarak ki halat", "sarak banani hai", "road banana", "sarak mein gaddha",
      "road repair karna", "street kharab", "gali kharab",
      // Urdu script
      "سڑک", "سڑک خراب", "گڈھا", "گڈھے", "سڑک ٹوٹی", "سڑک کی حالت",
      "سڑک کا مسلہ", "گلی خراب", "سڑک بنانی", "سڑک پر پانی",
    ],
    basePriority: "P2",
    emergencyKeywords: ["road completely blocked", "bridge collapsed", "سڑک مکمل بند", "پل گر گیا"],
  },
  {
    category: "Waterlogging / Standing Water",
    subCategory: "Water Accumulation",
    department: "Water & Drainage Department",
    departmentSlug: "water-drainage-department",
    keywords: [
      // English
      "waterlogging", "standing water", "water accumulation", "flood", "flooding",
      "waterlogged", "stagnant water", "drainage", "drain blocked", "sewer overflow",
      "sewage", "water overflow", "water on road", "rain water", "rainwater",
      "water stuck", "water not draining", "blocked drain", "nala", "nullah",
      "overflow", "water pipe burst", "water leak", "pipeline burst",
      // Roman Urdu
      "pani jama", "pani bhara", "pani jama hai", "pani khara", "seelab",
      "pani nikal nahi raha", "nala block", "nala band", "nullah",
      "pani ka masla", "pani bhar gaya", "barish ka pani", "gutter block",
      "sewerage", "ganda pani", "pani leak", "pipeline phat", "drain block",
      // Urdu script
      "پانی جمع", "پانی بھرا", "سیلاب", "پانی نہیں نکل رہا", "نالہ بند",
      "نالہ", "نالا", "بارش کا پانی", "پانی کا مسلہ", "گٹر",
    ],
    basePriority: "P1",
    emergencyKeywords: ["rising water fast", "flood entering homes", "severe flooding", "پانی تیزی سے بڑھ رہا", "گھروں میں پانی"],
  },
];

const IMPACT_BOOST: Record<string, number> = {
  ME_ONLY: 0,
  MY_STREET: 0,
  MULTIPLE_STREETS: 1,
  LARGE_AREA: 1,
};

const PRIORITY_ORDER: Priority[] = ["P0", "P1", "P2", "P3"];

function bump(priority: Priority, steps: number): Priority {
  const idx = Math.max(0, PRIORITY_ORDER.indexOf(priority) - steps);
  return PRIORITY_ORDER[idx];
}

const ESTIMATED_HOURS: Record<Priority, number> = { P0: 1, P1: 12, P2: 48, P3: 168 };

/**
 * Deterministic, offline, keyword-based "Demo AI Analysis".
 * Only recognizes 4 categories. If nothing matches, returns NOT_UNDERSTOOD
 * so the citizen can rephrase their complaint.
 */
export function classifyDemo(description: string, impactLevel: string): AiAnalysisResult {
  const text = description.toLowerCase();
  let matched: CategoryRule | null = null;
  let matchCount = 0;

  for (const rule of RULES) {
    const hits = rule.keywords.filter((k) => text.includes(k.toLowerCase())).length;
    if (hits > 0 && hits >= matchCount) {
      matched = rule;
      matchCount = hits;
    }
  }

  // If no category matched at all, return NOT_UNDERSTOOD
  if (!matched) {
    return {
      category: "Not Understood",
      subCategory: "Unclassified",
      department: "None",
      departmentSlug: "none",
      priority: "P2",
      confidence: 0,
      summary: "AI could not understand this complaint. Please rephrase and try again.",
      estimatedResolutionHours: 0,
      priorityReason: "No matching category found. The complaint description does not match any of the supported issue types: Gas, Electricity, Road Damage, or Waterlogging.",
      mode: "NOT_UNDERSTOOD",
    };
  }

  const rule = matched;
  const isEmergency = rule.emergencyKeywords?.some((k) => text.includes(k.toLowerCase())) ?? false;

  // Determine sub-category based on keywords found
  let subCategory = rule.subCategory;
  if (rule.category === "Gas-related Issues") {
    if (text.includes("leak") || text.includes("smell") || text.includes("بو") || text.includes("لیک")) subCategory = "Gas Leak";
    else if (text.includes("pressure") || text.includes("low") || text.includes("pressure") || text.includes("کم")) subCategory = "Low Gas Pressure";
    else if (text.includes("meter") || text.includes("میٹر")) subCategory = "Gas Meter Issue";
    else if (text.includes("connection") || text.includes("نیا")) subCategory = "New Connection Required";
    else subCategory = "General Gas Issue";
  } else if (rule.category === "Electricity-related Issues") {
    if (text.includes("wire") || text.includes("تار") || text.includes("live")) subCategory = "Exposed/Dangerous Wiring";
    else if (text.includes("pole") || text.includes("کھمبا") || text.includes("khamba")) subCategory = "Damaged Electric Pole";
    else if (text.includes("transformer") || text.includes("ٹرانسفارمر")) subCategory = "Transformer Issue";
    else if (text.includes("meter") || text.includes("میٹر")) subCategory = "Meter Problem";
    else if (text.includes("street light") || text.includes("streetlight") || text.includes("بتی")) subCategory = "Street Light Issue";
    else if (text.includes("outage") || text.includes("nahi") || text.includes("gayab") || text.includes("نہیں") || text.includes("غائب")) subCategory = "Power Outage";
    else subCategory = "General Electricity Issue";
  } else if (rule.category === "Road Damage") {
    if (text.includes("pothole") || text.includes("gaddha") || text.includes("گڈھا")) subCategory = "Pothole";
    else if (text.includes("crack") || text.includes("tooti") || text.includes("ٹوٹی")) subCategory = "Cracked Road";
    else if (text.includes("collapsed") || text.includes("sunken") || text.includes("دھنس")) subCategory = "Road Collapse";
    else subCategory = "General Road Damage";
  } else if (rule.category === "Waterlogging / Standing Water") {
    if (text.includes("drain") || text.includes("nala") || text.includes("nullah") || text.includes("نالہ") || text.includes("gutter")) subCategory = "Blocked Drainage";
    else if (text.includes("sewer") || text.includes("sewage") || text.includes("گندا")) subCategory = "Sewage Overflow";
    else if (text.includes("pipe") || text.includes("pipeline") || text.includes("پائپ")) subCategory = "Pipeline Burst/Leak";
    else if (text.includes("flood") || text.includes("seelab") || text.includes("سیلاب")) subCategory = "Flooding";
    else subCategory = "Standing Water";
  }

  let priority = rule.basePriority;
  const boost = IMPACT_BOOST[impactLevel] ?? 0;
  if (boost) priority = bump(priority, boost);
  if (isEmergency) priority = "P0";

  // Confidence heuristic
  const lengthScore = Math.min(description.trim().split(/\s+/).length / 25, 1);
  const base = 0.58 + Math.min(matchCount, 3) * 0.12;
  const confidence = Math.round(Math.min(0.97, base + lengthScore * 0.1) * 100) / 100;

  const reasonParts: string[] = [];
  reasonParts.push(`Description matches "${rule.category}" indicators.`);
  if (boost) reasonParts.push("Impact area affects multiple citizens, raising urgency.");
  if (isEmergency) reasonParts.push("Language indicates an immediate public-safety hazard.");

  return {
    category: rule.category,
    subCategory,
    department: rule.department,
    departmentSlug: rule.departmentSlug,
    priority,
    confidence,
    summary: summarize(description, rule.category),
    estimatedResolutionHours: ESTIMATED_HOURS[priority],
    priorityReason: reasonParts.join(" "),
    mode: "DEMO_FALLBACK",
  };
}

function summarize(description: string, category: string): string {
  const trimmed = description.trim();
  const short = trimmed.length > 160 ? trimmed.slice(0, 157) + "..." : trimmed;
  return `${category} reported: ${short}`;
}

/**
 * Live analysis via an LLM API (used only if OPENAI_API_KEY or GROQ_API_KEY is set).
 * Falls back to classifyDemo on any error so the app never breaks.
 */
export async function classifyLive(description: string, impactLevel: string): Promise<AiAnalysisResult> {
  // Try Groq first, then OpenAI
  const groqKey = process.env.GROQ_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  if (!groqKey && !openAiKey) return classifyDemo(description, impactLevel);

  const validSlugs = "gas-department, electricity-department, roads-department, water-drainage-department";
  const prompt = `You are the AI triage engine for a Pakistani civic-complaints platform called Pukar.
This platform ONLY handles these 4 categories:
1. Gas-related Issues (gas leak, gas pressure, gas meter, gas supply)
2. Electricity-related Issues (power outage, wiring, transformer, street light, pole)
3. Road Damage (pothole, broken road, cracked road, road collapse)
4. Waterlogging / Standing Water (flood, drainage blocked, sewage overflow, standing water)

If the complaint does NOT fit any of these 4 categories, respond with:
{"category":"Not Understood","subCategory":"Unclassified","department":"None","departmentSlug":"none","priority":"P2","confidence":0,"summary":"AI could not understand this complaint. Please rephrase.","estimatedResolutionHours":0,"priorityReason":"Does not match supported categories: Gas, Electricity, Road Damage, Waterlogging."}

Otherwise classify the complaint. Respond with ONLY compact JSON, no prose:
{"category":string,"subCategory":string,"department":string,"departmentSlug":string,"priority":"P0"|"P1"|"P2"|"P3","confidence":number(0-1),"summary":string,"estimatedResolutionHours":number,"priorityReason":string}
departmentSlug must be one of: ${validSlugs}.
The citizen may write in English, Roman Urdu, or Urdu script. Understand the meaning, not exact words.
Impact level: ${impactLevel}.
Complaint: """${description}"""`;

  try {
    let res: Response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    if (groqKey) {
      res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        }),
        signal: controller.signal,
      });
    } else {
      res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAiKey}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        }),
        signal: controller.signal,
      });
    }
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`LLM API error ${res.status}`);
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return { ...parsed, mode: "LIVE" } as AiAnalysisResult;
  } catch (err) {
    console.error("Live AI classification failed, using demo fallback:", err);
    return classifyDemo(description, impactLevel);
  }
}

export async function analyzeComplaint(description: string, impactLevel: string): Promise<AiAnalysisResult> {
  return classifyLive(description, impactLevel);
}
