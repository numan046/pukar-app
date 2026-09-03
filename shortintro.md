# Pukar — AI-Powered Public Complaint Management System

## Short Introduction

---

## The Problem

In Pakistan's local government system, citizens face significant challenges when reporting public problems like broken gas pipelines, electricity failures, road damage, and waterlogging. Complaints often get lost, misrouted, or ignored. There's no intelligent system to prioritize urgent issues, detect duplicate reports from the same area, or predict emerging problems before they become crises. Government officers lack real-time visibility into complaint patterns, and leadership has no way to proactively identify risk areas.

---

## The Solution

**Pukar** (پکار — meaning "Call" or "Voice" in Urdu) is an AI-powered platform that transforms how citizens report problems and how authorities respond. It doesn't just collect complaints — it understands them, routes them intelligently, tracks them against deadlines, and predicts emerging risks before they escalate.

---

## How Our AI Works

### 1. Intelligent Classification
When a citizen submits a complaint (via text, voice, photo, or video), our AI engine analyzes the content and automatically:
- **Classifies** the issue into one of four categories: Gas, Electricity, Road Damage, or Waterlogging
- **Assigns priority** (P0-Emergency to P3-Low) based on severity indicators
- **Routes** the complaint to the correct department and district
- **Confidence scoring** tells officers how certain the AI is about its classification

### 2. Duplicate Detection & Master Problems
The AI detects when multiple citizens report the same underlying issue (e.g., 17 people reporting potholes on the same road). Instead of treating these as separate complaints, it clusters them into a **"Master Problem"** — giving officers a unified view of the real-world issue and its scale.

### 3. Predictive Risk Radar
By analyzing complaint frequency, geographic clustering, and temporal patterns, the AI identifies **emerging risk signals** — alerting leadership to problems that are growing before they become crises (e.g., rising flood risk in a specific area).

### 4. AI Executive Briefs
For Chief Ministers and senior leadership, the AI generates **data-driven executive summaries** from real complaint data — answering questions like "Which district has the highest overdue rate?" without requiring manual analysis.

---

## What Makes Pukar Innovative

| Feature | Traditional Systems | Pukar |
|---------|-------------------|-------|
| **Routing** | Manual assignment | AI auto-routes to correct department |
| **Prioritization** | First-come-first-served | AI-based priority scoring |
| **Duplicates** | Treated as separate | Clustered into Master Problems |
| **Risk Detection** | Reactive (after crisis) | Predictive (before crisis) |
| **Language** | English only | Bilingual (English + Urdu with RTL) |
| **Accessibility** | Desktop-only | Mobile-first, works on any device |
| **Transparency** | Black box | Citizens track status in real-time |
| **Accountability** | No deadlines | SLA tracking with automatic escalation |

---

## Technology Stack

### Frontend
- **Next.js 14** with App Router for server-side rendering and fast page loads
- **React 18** with TypeScript for type-safe, maintainable code
- **Tailwind CSS** for responsive, mobile-first design
- **Leaflet + OpenStreetMap** for interactive complaint maps (no API key needed)
- **Recharts** for analytics visualization

### Backend
- **Next.js API Routes** — serverless functions, no separate backend server
- **Turso Cloud SQLite** — cloud-hosted database that works seamlessly with serverless deployment
- **Custom authentication** — scrypt password hashing + HMAC-signed session cookies

### AI Engine
- **Deterministic offline engine** — keyword/heuristic-based classification that works without internet or API keys
- **Optional OpenAI integration** — upgrade to real LLM classification when `OPENAI_API_KEY` is set
- **Graceful fallback** — if AI service is unavailable, the system continues working with rule-based logic

### Deployment
- **Vercel** — serverless deployment with automatic scaling
- **Zero-downtime deployments** — every push to GitHub triggers automatic builds

---

## Impact

Pukar bridges the gap between citizens and government by:
- **Reducing response time** through intelligent routing and prioritization
- **Preventing duplicate work** by clustering similar complaints
- **Enabling proactive governance** through predictive risk analysis
- **Increasing transparency** with real-time status tracking
- **Supporting local languages** to serve all citizens equally

The platform is designed for Pakistani local government but can be adapted for any municipality or public service organization worldwide.

---

## Live Demo

**Website**: [https://ppr-ai.vercel.app](https://ppr-ai.vercel.app)  
**Source Code**: [https://github.com/numan046/pukar-app](https://github.com/numan046/pukar-app)

---

*Pukar — آپ کی آواز ، ایک بہتر کل کی بنیاد*  
*(Your voice, the foundation of a better tomorrow)*
