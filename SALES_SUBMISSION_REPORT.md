# TalentGraph V2 — Sales & Product Submission Report

## 1) Executive Summary
TalentGraph V2 is a two-sided talent marketplace designed to improve hiring outcomes by combining candidate intent, recruiter requirements, and interaction signals into a practical recommendation and application workflow.

The product supports:
- Structured candidate profiles and multi-profile job intent capture.
- Recruiter job posting and skill-based requirement definition.
- Match scoring, swipe-style engagement, invite flows, and direct applications.
- Role-based access with candidate and company user journeys.

This makes the concept viable for pilot deployment as an MVP with measurable outcomes around time-to-shortlist, invite-to-apply conversion, and match quality.

---

## 2) Problem Statement
Recruiting teams often face:
- High screening overhead due to low-fit inbound applicants.
- Fragmented workflows between sourcing, shortlisting, and candidate engagement.
- Weak signal quality when deciding whom to contact first.

Candidates similarly face:
- Low response rates.
- Poor role-fit visibility before applying.
- Limited feedback on recruiter interest.

TalentGraph V2 addresses this with transparent match scoring and interaction pathways that reduce ambiguity on both sides.

---

## 3) Product Concept
### Core value proposition
"Help recruiting teams focus on the right candidates faster by combining profile, skill, compensation, and location signals into ranked recommendations and actionable outreach workflows."

### Primary personas
- Candidate (job seeker with one or more job profiles)
- Recruiter / HR / Admin (company-side hiring users)

### Key product capabilities
1. Candidate account + profile creation
2. Candidate job profile(s) with skills and location preferences
3. Company account + profile
4. Job posting creation with skill definitions
5. Candidate and recruiter interaction (like/pass/ask-to-apply)
6. Recommendation ranking and dashboard insights
7. Application lifecycle management

---

## 4) Technical Architecture Overview
### Backend
- FastAPI application with modular routers for auth, candidates, company, postings, matches, recommendations, swipes, dashboard, and applications.
- SQLModel ORM models for core entities: User, Candidate, Company, JobProfile, JobPosting, Swipe, Match, Application.
- JWT-based authentication with role-bearing claims.

### Frontend
- React + React Router for role-based route gating.
- Axios API client with automatic bearer token injection.
- Distinct recruiter and candidate dashboard routes.

### Data / execution model
- Request-driven transactional API patterns.
- Startup DB initialization via metadata table creation.
- Relationship-rich schema suitable for recommendation and funnel analytics.

---

## 5) End-to-End Flow (Business + Technical)
### Candidate journey
1. Candidate signs up and authenticates.
2. Candidate creates core profile.
3. Candidate creates one or more job profiles with preferences.
4. Candidate browses recommendations, swipes, and applies to jobs.

### Recruiter journey
1. Recruiter/HR/Admin signs up and authenticates.
2. Company profile is created/updated.
3. Recruiter creates and manages job postings.
4. Recruiter sees ranked candidate recommendations per job.
5. Recruiter likes/invites candidates and reviews applications.

### Interaction model
- Swipes act as engagement events.
- Match records consolidate bilateral interest signals.
- Applications capture formal pipeline transition from intent to process.

---

## 6) Commercial Narrative for Sales
### Why this matters to buyers
- **Faster hiring decisions:** ranked recommendations reduce first-pass screening time.
- **Higher conversion potential:** invite flows and mutual-interest indicators improve engagement quality.
- **Operational visibility:** dashboard-level metrics across recommendations, interactions, and applications.

### Suggested target segments
- Mid-size staffing firms
- Technology services companies hiring project-based talent
- Internal TA teams with high requisition volume

### Pilot success metrics (first 60–90 days)
- Time-to-shortlist reduction
- Invite-to-application conversion rate
- Application-to-shortlist ratio
- Recruiter action rate per open job

---

## 7) Demo Plan (7-minute Story)
1. Recruiter logs in and creates a posting.
2. System returns ranked candidate recommendations.
3. Recruiter sends interest (like / ask-to-apply).
4. Candidate sees opportunities/invites and applies.
5. Recruiter reviews application status in dashboard flow.

Outcome shown: closed loop from requirement definition to candidate pipeline movement.

---

## 8) Risks, Gaps, and Product Maturity Roadmap
### Current strengths
- Functional MVP architecture is already present.
- Clear domain boundaries and API-led implementation.
- Recommendation engine with weighted scoring dimensions.

### Risks / alignment items
- Consistent tenant/authorization scope should be standardized across all modules.
- Database migration strategy should be formalized beyond startup table creation.
- Shared scoring logic should be centralized to avoid drift across endpoints.

### Recommended roadmap
- **Phase 1 (Pilot Hardening):** authz normalization, migration tooling, event instrumentation.
- **Phase 2 (Scale):** analytics layer, recruiter collaboration workflows, configurable scoring.
- **Phase 3 (Enterprise):** audit/compliance controls, SSO, integration connectors.

---

## 9) What to Send to Sales Leadership
Include this package:
1. Executive one-pager (problem, solution, impact)
2. 8–10 slide narrative deck
3. API/architecture appendix
4. Pilot proposal with KPI baseline and timeline

This framing gives both commercial confidence and technical credibility for account-level progression.

---

## 10) Suggested Email Template (Ready to Use)
**Subject:** TalentGraph V2 Concept Submission — Commercial + Technical Pilot Proposal

Hi Team,

I’m sharing a proposed TalentGraph V2 concept that combines recommendation-driven talent matching with workflow-level recruiter/candidate engagement.

Attached:
1. Executive summary
2. Product + architecture overview
3. Pilot plan with measurable KPIs

Why this is compelling:
- Improves candidate-job fit prioritization
- Reduces manual screening overhead
- Increases recruiter actionability through scored recommendations and invite/apply workflows

If approved, we can run a scoped pilot with defined success metrics in 60–90 days.

Thanks,
[Your Name]
