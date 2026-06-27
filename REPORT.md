# MyPartners — Build Report
> Executive Operating Assistant Platform · June 2026

---

## What Was Built

A full-stack AI-powered workspace for executives: message triage, task extraction, business memory, daily briefs, and an admin console — running locally on Llama 3.1 8B.

| | |
|---|---|
| **Repo** | kumarsuraj84/mypartners |
| **Branch** | claude/executive-operating-assistant-hewsiu |
| **AI Model** | llama3.1:8b via Ollama (local) |
| **Database** | PostgreSQL 18 (local) |
| **Status** | All three apps running |

---

## Stats

| Metric | Count |
|---|---|
| Apps | 3 (web, api, console) |
| API Endpoints | 34 |
| Prisma Models | 16 |
| AI Pipeline Stages | 4 |
| Console Pages | 12 |
| TypeScript Errors | 0 |

---

## Applications

### 1. Executive Web App — `apps/web` · port 3000
The daily interface for the executive. Surfaces AI-generated context, prioritized messages, and tracked commitments.

**Pages:**
- `/` — Dashboard (brief, signals, tasks overview)
- `/inbox` — Message triage with priority & sentiment
- `/tasks` — Commitments, follow-ups, waiting-for tracker
- `/knowledge` — Notes & decisions knowledge base
- `/mission-control` — AI job monitor & replay timeline
- `/settings` — User preferences

**Stack:** Next.js 14, React 18, TanStack Query 5, Radix UI, Tailwind CSS

---

### 2. Fastify API — `apps/api` · port 3001
TypeScript backend. All business logic, AI orchestration, and data access lives here.

**Stack:** Fastify 4, TypeScript 5, Prisma 5, PostgreSQL 18, Redis, Ollama

---

### 3. Admin Console — `apps/console` · port 3002
Operations dashboard for owners/admins. Requires role: owner or administrator.

**Pages:**
- `/health` — Live status (API, DB, AI provider)
- `/jobs` — AI job monitor
- `/users` & `/tenants` — User/tenant management
- `/plans` & `/connectors` — Plan config, integration management
- `/config` — Per-tenant KV config editor
- `/audit` — Full audit log viewer
- `/cost` — AI cost tracking
- `/flags` — Feature flags

**Stack:** Next.js 14, TanStack Query, Tailwind CSS

---

## API Endpoints (34 total)

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Dev-mode login, auto-creates user |
| GET | `/api/auth/me` | Current user + permissions |

### Messages
| Method | Path | Description |
|---|---|---|
| GET | `/api/messages` | Paginated inbox, filterable |
| GET | `/api/messages/:id` | Message detail with suggestions |
| PATCH | `/api/messages/:id/read` | Mark as read |
| PATCH | `/api/messages/:id/archive` | Archive message |
| POST | `/api/messages/:id/summarize` | AI quick-review summary |
| GET | `/api/messages/stats/overview` | Unread/urgent counts |

### Tasks
| Method | Path | Description |
|---|---|---|
| GET | `/api/tasks` | List tasks (filter by status/priority/category) |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| GET | `/api/tasks/stats` | Task stats by category |
| GET | `/api/tasks/commitments` | Open commitments |
| GET | `/api/tasks/follow-ups` | Pending follow-ups |
| GET | `/api/tasks/waiting-for` | Waiting-for items |

### AI
| Method | Path | Description |
|---|---|---|
| POST | `/api/ai/process-message/:id` | Full 4-stage AI pipeline |
| GET | `/api/ai/jobs` | 20 most recent AI jobs |
| GET | `/api/ai/activity` | Dashboard stats (unread, overdue, queue depth) |
| GET | `/api/ai/replay/:messageId` | Processing lifecycle timeline |

### Brief
| Method | Path | Description |
|---|---|---|
| GET | `/api/brief/today` | Daily brief (cached per user per day) |
| POST | `/api/brief/generate` | Force-regenerate brief |

### Signals
| Method | Path | Description |
|---|---|---|
| GET | `/api/signals` | Active proactive signals |
| PATCH | `/api/signals/:id/dismiss` | Dismiss signal |
| PATCH | `/api/signals/:id/snooze` | Snooze 1–168 hours |

### Knowledge
| Method | Path | Description |
|---|---|---|
| GET | `/api/knowledge` | List notes (filter by type/tag/search) |
| POST | `/api/knowledge` | Create note |
| PATCH | `/api/knowledge/:id` | Update note |
| DELETE | `/api/knowledge/:id` | Delete note |

### Memory
| Method | Path | Description |
|---|---|---|
| GET | `/api/memory/search` | Unified entity search |
| GET | `/api/memory/persons` | All persons in Business Memory |
| GET | `/api/memory/organizations` | All organizations |

### Config / Admin / Health
| Method | Path | Description |
|---|---|---|
| GET | `/api/config` | Full merged tenant config |
| PATCH | `/api/config/:category/:key` | Set config value |
| GET | `/api/admin/overview` | Platform stats (users, jobs, errors) |
| GET | `/health/ready` | Readiness: DB + AI provider |

---

## Database Schema — 16 Prisma Models

### Foundation
| Model | Purpose |
|---|---|
| `Tenant` | Organization/workspace with plan tier (free → enterprise) |
| `User` | Individual with role: owner, executive, manager, assistant, administrator |
| `TenantConfig` | Versioned KV config per tenant, organized by category |
| `AuditLog` | Append-only log with before/after state |

### Business Memory
| Model | Purpose |
|---|---|
| `Person` | Contact — email, role, company, linked to Organization |
| `Organization` | Company with domain; links to persons and projects |
| `Project` | Work item associated with an organization |
| `Decision` | Decision record extracted from messages |
| `MessageEntity` | Junction table — links messages to extracted entities |

### Communication
| Model | Purpose |
|---|---|
| `Integration` | Connected provider (Gmail, WhatsApp, SMS) with OAuth tokens |
| `Message` | Email/chat with priority, category, sentiment, action items |
| `SuggestedAction` | AI-recommended action: reply / delegate / schedule / follow_up / archive / create_task |

### Productivity
| Model | Purpose |
|---|---|
| `Task` | To-do with category: task, commitment, follow_up, waiting_for |
| `KnowledgeNote` | Note with type: note, meeting, decision, vendor, project, contact |

### AI Layer
| Model | Purpose |
|---|---|
| `AIJob` | Async job (email_processing, brief_generation, task_creation) with stage times |
| `ExecutiveBrief` | Daily brief cached per user per date |
| `Signal` | Proactive observation: overdue_commitment, unacknowledged_urgent, waiting_overdue |

---

## AI Engine

### Message Processing Pipeline (4 stages)

```
[1] Understand → [2] Extract → [3] Record → [4] Remember
```

| Stage | What happens |
|---|---|
| **Understand** | Read and comprehend the full message context, sender role, urgency signals |
| **Extract** | Pull action items, commitments, follow-ups, waiting-for items, and named entities |
| **Record** | Create SuggestedActions and Tasks; set priority, category, due dates |
| **Remember** | Store KnowledgeNotes, resolve and update Business Memory (Person → Org → Project → Decision) |

Each stage's execution time is tracked for the UI replay timeline.

### Other AI Features
- **Daily Brief** — Gathers urgent messages, pending tasks, commitments, follow-ups, signals, and recent decisions. Enriches with Business Memory context. Generates personalized morning brief in JSON. Cached per user per day.
- **Signal Generator** — Deterministic (no AI prompt). Scans for overdue commitments, unacknowledged urgent messages, overdue waiting-for items. Throttled to once per 5 min per user.
- **Entity Resolver** — Auto-matches email domains to organizations. Creates and deduplicates Person → Organization records.
- **Provider Registry** — Swappable via `AI_PROVIDER` env var. Currently: **Ollama (llama3.1:8b)** — local, private, no API costs. Groq remains registered as fallback.

---

## Full Technology Stack

| Layer | Technologies |
|---|---|
| Executive UI | Next.js 14, React 18, TanStack Query 5, Radix UI, Tailwind CSS |
| Admin Console | Next.js 14, TanStack Query, Tailwind CSS |
| API Backend | Fastify 4, TypeScript 5, @fastify/jwt, @fastify/rate-limit, @fastify/cors |
| Database | PostgreSQL 18, Prisma 5 ORM |
| Cache / Queue | Redis 7, ioredis, BullMQ |
| AI Inference | Ollama (local), Llama 3.1 8B, Groq SDK (standby) |
| Monorepo | Turborepo 2, pnpm workspaces |
| OAuth Ready | Gmail/Google, WhatsApp (stub), SMS (stub) |

---

## Environment Configuration

```env
DATABASE_URL=postgresql://postgres:***@localhost:5432/mypartners
JWT_SECRET=<secret>
AI_PROVIDER=ollama
OLLAMA_MODEL=llama3.1:8b
OLLAMA_URL=http://localhost:11434
FRONTEND_URL=http://localhost:3000,http://localhost:3002
PORT=3001
NODE_ENV=development
```

---

## Issues Resolved This Session

| Issue | Fix |
|---|---|
| TypeScript build (9 errors) | Fixed Prisma JSON field type errors with `as unknown as any` casts in ai, brief, knowledge, and messages routes. Removed conflicting `include`/`select` on person query. |
| IORedis constructor error | Used `(IORedis as any).default ?? IORedis` to handle ESM default export |
| Windows ESM path error | Created `scripts/start.mjs` with `file:///` URL construction for Windows drive paths |
| Groq startup crash | Lazy-initialized Groq client — only created when `GROQ_API_KEY` is needed |
| Supabase → local PostgreSQL | Supabase pooler "tenant/user not found" — switched to local PG 18, reset password via pg_hba.conf trust mode |
| Health page crash | Added optional chaining on `overview.jobs?.running`; made `memory` and `uptime` optional in HealthRes interface |
| Groq → Ollama | Added OllamaProvider to AI registry, set `AI_PROVIDER=ollama` in .env |
| Llama 3.2 3B → 3.1 8B | Updated `OLLAMA_MODEL=llama3.1:8b` — better quality, fits in 32GB RAM |

---

## Roadmap — What's Next

### Built but not wired (high value, low effort)
1. **Gmail OAuth end-to-end** — Routes exist, flow needs testing. First real messages into the system.
2. **Background job worker** — Wire BullMQ to auto-process incoming messages without manual API calls.
3. **Seed demo data** — Makes the web app immediately usable for demos and testing.

### Core hardening
4. **Auth** — Real passwords or Google SSO. Currently dev-mode (no password required).
5. **Role enforcement** — Model and permissions exist; API-level enforcement is partial.

### Intelligence upgrades
6. **Vector search** — `KnowledgeNote` has an `embedding` field ready. Plug in pgvector for semantic memory retrieval.
7. **Auto-brief scheduler** — Cron job to generate brief every morning automatically.
8. **Connector polling** — Gmail sync job that pulls new messages on a schedule.

### Experience
9. **Mobile-friendly UI** — Web app is currently desktop-only layout.
10. **Notification system** — Surface signals and urgent messages as browser/push notifications.

---

*Generated June 2026 · Branch: `claude/executive-operating-assistant-hewsiu`*
