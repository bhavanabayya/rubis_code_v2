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

## 6) Dashboard Experience & Functional Flow (Detailed)
This section describes what each dashboard looks like from a user perspective, what modules it includes, and the exact functional flow.

### 6.1 Candidate Dashboard — Layout and Modules
The candidate dashboard is designed as a "job discovery + action center" with focus on visibility and quick decisions.

Typical screen blocks:
- **Profile Context Header**
  - Active job profile selector (if candidate has multiple profiles)
  - Profile completeness/state indicators
- **Recommended Jobs Feed**
  - Ranked list/cards of matched jobs with match %
  - Job snapshot: title, company, location, work type, salary range, role/domain
- **Action Controls per Job**
  - Like
  - Pass
  - Ask to Apply (candidate-initiated interest)
  - Apply now (formal application)
- **Recruiter Invites Panel**
  - Jobs where recruiter asked candidate to apply
  - Shows invite time and whether already applied
- **Applications Tracker**
  - Applied jobs with status (applied/reviewed/shortlisted/rejected/offered)
- **Matches & Mutual Interest View**
  - Jobs/companies where both sides show positive intent

### 6.2 Candidate Dashboard — Functional Flow
1. Candidate logs in and selects a job profile.
2. System fetches recommendations for that profile.
3. Candidate reviews ranked opportunities with match insights.
4. Candidate interacts (like/pass/ask-to-apply) or applies directly.
5. Dashboard updates action state (already swiped/applied/matched).
6. Candidate monitors recruiter invites and application statuses.

### 6.3 Candidate Dashboard — Main Functionalities
- Manage and switch job profiles
- Browse recommendations sorted by score
- Perform swipe-style actions on jobs
- Submit applications tied to a selected profile
- Track recruiter invites
- Track own application pipeline and match state

---

### 6.4 Recruiter Dashboard — Layout and Modules
The recruiter dashboard is a "hiring command center" oriented around requisitions, candidate quality, and pipeline execution.

Typical screen blocks:
- **Job Posting Selector / Job Tiles**
  - Active jobs list with quick metrics
  - Open/inactive state and ownership context
- **Recommended Candidates Panel (per job)**
  - Ranked candidates with match % and explanation snippets
  - Candidate profile info: skills, experience, work type, salary expectation
- **Shortlist / Interaction Board**
  - Candidates recruiter liked
  - Candidates invited (ask-to-apply)
  - Mutual matches
- **Applications Pipeline**
  - Candidate applications for selected job(s)
  - Status update controls (reviewed, shortlisted, rejected, offered)
- **Team/Operational View (if applicable)**
  - Shared visibility for company users
  - Cross-job workload and interaction snapshots

### 6.5 Recruiter Dashboard — Functional Flow
1. Recruiter logs in and opens a job posting (or creates one).
2. Dashboard shows top recommended candidates for that job.
3. Recruiter reviews candidate match details and profile fit.
4. Recruiter takes action (like/pass/ask-to-apply).
5. Candidate responses/applications feed into recruiter application board.
6. Recruiter updates application statuses through hiring stages.
7. Dashboard reflects conversion funnel: recommendations → interactions → applications → shortlist/offer.

### 6.6 Recruiter Dashboard — Main Functionalities
- Create/update/archive job postings
- View candidate recommendations by requisition
- Take interaction actions on candidates
- Build and manage shortlist
- Review applications and update hiring status
- Monitor high-level hiring funnel performance by role/job

---

### 6.7 Combined Dashboard Capability Matrix
| Capability | Candidate Dashboard | Recruiter Dashboard |
|---|---|---|
| Authentication & role access | ✅ | ✅ |
| Profile management | ✅ Candidate profile + job profiles | ✅ Company profile |
| Job posting management | ❌ | ✅ |
| Candidate recommendations | Job recommendations | Candidate recommendations by job |
| Swipe interactions | Like/Pass/Ask-to-Apply on jobs | Like/Pass/Ask-to-Apply on candidates |
| Invite handling | Receive & act on invites | Send invites to candidates |
| Application management | Submit + track own applications | Review + status updates |
| Match visibility | Mutual match view | Mutual match view |

---


## 7) Recommendation Engine Explained (How It Works in This App)
The recommendation engine is the ranking core that decides which candidates to show recruiters and which jobs to show candidates. It uses a weighted scoring model and interaction-aware filtering.

### 7.1 Scoring Objective
Generate a practical match percentage (0–100) for each candidate job profile against a job posting, then rank results by highest score.

### 7.2 Inputs Used by the Engine
- Job posting attributes: product vendor, product type, role, seniority, salary band, location, work type, required skills.
- Candidate job profile attributes: product vendor/type, role preference, experience years, salary expectations, work type, location preferences, profile skills.
- Interaction data: existing swipes and existing matches to flag already-contacted candidates.

### 7.3 Weighted Match Formula
The engine applies these core weighted dimensions:
- **Product/Role match:** 35%
- **Skills match:** 25%
- **Experience match:** 20%
- **Salary match:** 10%
- **Location match:** 10%

It then applies a small work-type alignment bonus and caps final score at 100.

### 7.4 Scoring Logic by Dimension
1. **Product/Role Fit (35%)**
   - Strongest weight.
   - Full score when vendor + product type + role align.
   - Partial score for partial overlap (e.g., same vendor but different type/role).

2. **Skills Fit (25%)**
   - Parses required job skills and compares them to candidate profile skills.
   - Calculates matched-skill ratio and converts it to a weighted skill score.
   - Stores matched skill names for recruiter explainability.

3. **Experience Fit (20%)**
   - Attempts to infer minimum years from posting seniority conventions.
   - Grants full/partial credit depending on candidate years-of-experience coverage.

4. **Salary Fit (10%)**
   - Compares candidate expected salary range and posting salary range.
   - Scores strongest when ranges overlap; partial credit if near-band.

5. **Location Fit (10%)**
   - Uses candidate location preferences vs job location string.
   - Treats remote alignment as a location-positive case.

### 7.5 Result Qualification and Ranking
After score calculation:
- Profiles below the threshold are filtered out (app uses a pragmatic cutoff for broad discoverability).
- Remaining recommendations are sorted descending by `match_percent`.
- Deduplication keeps the best profile per candidate when multiple profiles exist.

### 7.6 Recruiter-Facing Recommendation Output
Each recommendation payload can include:
- Candidate identity and profile context
- Match percent and match detail breakdown
- Matched skill list
- Already-swiped / already-matched flags
- Mutual-match indicator
- Salary/work-type summary

This supports fast recruiter decisions without opening every candidate profile manually.

### 7.7 Candidate-Side Recommendation Behavior
The candidate dashboard uses analogous scoring logic from the opposite direction (job relevance to a selected candidate profile):
- candidate selects profile
- jobs are scored and ranked
- candidate actions (like/pass/ask-to-apply/apply) feed back into interaction and application funnels

### 7.8 Why This Design Works for MVP Sales Demos
- **Explainable:** weighted components are easy to communicate.
- **Actionable:** each ranked row has immediate actions.
- **Measurable:** score + interaction data can be tied to funnel KPIs.
- **Extensible:** weights and rules can be configured in later phases.

---

## 8) Commercial Narrative for Sales
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

## 9) Demo Plan (7-minute Story)
1. Recruiter logs in and creates a posting.
2. System returns ranked candidate recommendations.
3. Recruiter sends interest (like / ask-to-apply).
4. Candidate sees opportunities/invites and applies.
5. Recruiter reviews application status in dashboard flow.

Outcome shown: closed loop from requirement definition to candidate pipeline movement.

---

## 10) Risks, Gaps, and Product Maturity Roadmap
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

## 11) What to Send to Sales Leadership
Include this package:
1. Executive one-pager (problem, solution, impact)
2. 8–10 slide narrative deck
3. API/architecture appendix
4. Pilot proposal with KPI baseline and timeline

This framing gives both commercial confidence and technical credibility for account-level progression.

---


