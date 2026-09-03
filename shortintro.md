# Pukar — AI-Powered Public Complaint Management System

## Project Overview

Pukar (پکار) is an intelligent public complaint management platform designed to modernize civic governance in Pakistan. The system bridges the communication gap between citizens and local government authorities by providing a structured, AI-assisted pipeline for reporting, classifying, routing, tracking, and resolving public service complaints.

## Problem Statement

In Pakistan's local government framework, citizens face significant barriers when attempting to report civic issues such as water supply failures, electricity outages, road damage, and sanitation problems. The existing complaint mechanisms are fragmented, lack transparency, and offer no systematic way to track resolution progress. Government departments, on the other hand, struggle with unstructured complaint intake, manual classification, duplicate reports, and no real-time visibility into service delivery performance across districts. This results in delayed responses, unresolved grievances, and eroded public trust in local governance.

## Solution Architecture

Pukar addresses these challenges through a multi-role platform that serves citizens, department officers, Chief Minister Officers (CMOs), Chief Ministers, and system administrators — each with tailored dashboards and capabilities.

### How the AI Component Works

The platform employs a dual-layer AI classification engine:

1. **Deterministic Offline Engine**: A rule-based classification system that analyzes complaint text using keyword matching, pattern recognition, and department-specific heuristics to automatically categorize complaints and assign them to the appropriate department. This ensures the system functions without external API dependencies.

2. **Optional LLM Integration**: When an OpenAI API key is configured, the system leverages large language models for more nuanced classification, sentiment analysis, and priority assessment. This layer handles ambiguous or complex complaints that fall outside deterministic rule boundaries.

3. **Duplicate Detection and Master Problem Clustering**: The system identifies geographically and semantically similar complaints, grouping them into "Master Problems." This prevents redundant work orders and gives officers a consolidated view of systemic issues affecting multiple citizens.

4. **Predictive Risk Analysis**: By analyzing complaint frequency, geographic concentration, and temporal patterns, the system generates risk signals that alert authorities to emerging problem areas before they escalate into crises.

### Workflow Intelligence

Every complaint follows a structured lifecycle: PENDING → ASSIGNED → IN_PROGRESS → MARKED_RESOLVED → RESOLVED. The system enforces Service Level Agreements (SLAs) with automatic escalation when deadlines approach or are breached. Citizens receive notifications at each stage and can verify whether a reported problem has been genuinely resolved, creating an accountability loop that is absent in traditional systems.

## Innovation and Utility

What distinguishes Pukar from conventional complaint portals is its integration of intelligence at every stage of the grievance lifecycle:

- **Zero-friction reporting**: Citizens can submit complaints via text, voice, photo, video, or map pin — accommodating varying literacy levels and technical capabilities.
- **Automatic routing**: AI eliminates the need for citizens to know which department handles their issue. The system classifies and routes complaints autonomously.
- **Geographic intelligence**: Interactive maps with complaint clustering allow officers and leadership to visualize problem density and allocate resources accordingly.
- **Hierarchical governance**: The platform mirrors Pakistan's administrative structure — from field employees to department officers to CMOs to the Chief Minister — ensuring each level has appropriate visibility and control.
- **Bilingual accessibility**: Full English and Urdu support with RTL layout ensures the platform is accessible to Pakistan's diverse population.
- **Executive decision support**: AI-generated executive briefs synthesize raw complaint data into actionable insights for leadership, enabling evidence-based policy decisions.

## Technology Stack

The platform is built on a modern, production-grade technology stack:

- **Frontend and Backend**: Next.js 14 with the App Router architecture, providing server-side rendering, API routes, and a unified development experience in TypeScript.
- **Database**: Turso Cloud SQLite — a serverless, edge-distributed database that ensures low-latency data access without requiring dedicated database infrastructure.
- **Geospatial Visualization**: Leaflet with OpenStreetMap tiles for interactive, API-key-free mapping.
- **Analytics**: Recharts for real-time data visualization in dashboards.
- **Styling**: Tailwind CSS for responsive, mobile-first design.
- **Authentication**: Custom session-based authentication using HTTP-only cookies with HMAC-SHA256 signing and scrypt password hashing.
- **Deployment**: Vercel serverless infrastructure for automatic scaling and global CDN distribution.

## Impact

Pukar demonstrates how AI can be applied to civic technology in resource-constrained environments. By combining deterministic AI (which requires no external services) with optional LLM enhancement, the platform remains functional in low-connectivity scenarios while offering advanced capabilities when infrastructure permits. The system's role-based architecture ensures that every stakeholder — from the citizen filing a complaint to the Chief Minister overseeing provincial governance — has the tools needed to participate effectively in the public service delivery chain.
