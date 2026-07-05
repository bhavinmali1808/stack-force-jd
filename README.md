# TalentForce JD — Recruiter Portal (Phase 1 MVP)

> **Hire Smarter, Faster.** Post roles → bulk upload resumes → get an AI-ready ranked shortlist.

Built with **MERN stack** (MongoDB · Express · React · Node.js), Vite, and a rule-based skill matcher designed to hot-swap for AI in Phase 3.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally on `mongodb://localhost:27017`

### 1. Backend
```bash
cd server
# Copy and configure env
cp .env.example .env
npm install
npm run dev
# → http://localhost:5000
```

### 2. Frontend
```bash
cd client
npm install
npm run dev
# → http://localhost:5173
```

---

## 📁 Project Structure

```
stack-force-jd/
├── server/
│   ├── src/
│   │   ├── config/db.js
│   │   ├── models/          Company · Role · Candidate
│   │   ├── routes/          auth · role · candidate
│   │   ├── controllers/     auth · role · candidate
│   │   ├── services/        resumeParser · skillMatcher · exportService · skillDictionary
│   │   └── middleware/      auth · upload · error
│   └── uploads/resumes/     (auto-created, gitignored)
└── client/
    └── src/
        ├── pages/           Landing · Auth · Dashboard · RoleCreate · RoleDetail · CandidateDetail · Upload
        ├── components/      Navbar · MatchBar · CandidateCard · SkillTagInput · BulkUploader · ResumeViewer · SkillBreakdown · StatusPipeline
        ├── context/         AuthContext
        ├── api/             Axios client
        └── data/            skills.js
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Company sign up |
| POST | `/api/auth/login` | Company sign in |
| GET | `/api/auth/me` | Get current company |
| GET | `/api/roles` | List all roles |
| POST | `/api/roles` | Create a role |
| GET | `/api/roles/:id` | Get role by ID |
| PATCH | `/api/roles/:id` | Update role |
| DELETE | `/api/roles/:id` | Delete role + candidates |
| POST | `/api/roles/:id/candidates/upload` | Bulk upload resumes (multipart) |
| GET | `/api/roles/:id/candidates` | Ranked candidate list |
| GET | `/api/roles/:id/export?format=csv\|pdf` | Export shortlist |
| GET | `/api/candidates/:id` | Candidate details |
| PATCH | `/api/candidates/:id/status` | Update status + notes |
| DELETE | `/api/candidates/:id` | Remove candidate |

---

## 🧠 Scoring Architecture

**Phase 1 (current) — Rule-based:**
```
matchScore = (extractedSkills ∩ requiredSkills).length / requiredSkills.length × 100
```

**Phase 3 (drop-in) — AI swap:**
Replace `server/src/services/skillMatcher.js` → same input/output shape.
Replace `server/src/services/resumeParser.js` → AI-powered extraction.

---

## 🗺️ Roadmap

| Phase | Status |
|-------|--------|
| Phase 1 — Rule-based MVP | ✅ Built |
| Phase 2 — Weighted skills, pipeline analytics | 🔜 |
| Phase 3 — AI match + reasoning | 🔜 |
| Phase 4 — ZIP bulk, email, scheduling | 🔜 |
