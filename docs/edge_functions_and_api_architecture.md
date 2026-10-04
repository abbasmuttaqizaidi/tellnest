# Tellnest — Edge Functions, API Architecture & Database Query Efficiency

This document defines the backend and API architecture for Tellnest, detailing where Supabase Edge Functions are genuinely required versus where normal application operations belong in the TanStack Start server layer, alongside strict database query efficiency guidelines.

---

## 1. Architectural Philosophy: The Right Tool for the Job

1. **TanStack Start Server Layer (`src/server/`)**:
   - Handles standard synchronous/transactional request-response operations (fetching works, authors, chapter lists, creating/updating drafts, saving library items, tracking reading progress).
   - Colocated with routing, SSR, and client caching.
   - Operates with zero cold starts and direct integration with Clerk sessions.

2. **Supabase PostgreSQL & Row Level Security (RLS)**:
   - Enforces data integrity, relationships, and authorization at the database level.
   - All client queries use the anonymous key authenticated via Clerk JWT tokens.
   - `SELECT *` is strictly forbidden across all application queries.

3. **Supabase Edge Functions (`supabase/functions/`)**:
   - Reserved strictly for background processing, asynchronous workflows, external webhooks, scheduled batch jobs, and CPU-intensive moderation scanning.
   - **Never used for standard CRUD operations**.

---

## 2. Edge Function Decision Matrix (Section 6)

| Operation | Edge Function? | Architectural Justification | Alternative / Location |
|---|---|---|---|
| **Get Work Detail** | ❌ No | Standard read operation; belongs in page loader | `getPublicWorkServerFn` in `src/server/works.ts` |
| **Get Work Chapters (List)** | ❌ No | Lightweight metadata read without chapter body | `getWorkChaptersServerFn` in `src/server/chapters.ts` |
| **Read Chapter Content** | ❌ No | Specific chapter on-demand fetch | `getChapterContentServerFn` in `src/server/chapters.ts` |
| **Discover / Catalog Feed** | ❌ No | Direct paginated catalog query | `getDiscoverWorksServerFn` in `src/server/works.ts` |
| **Create / Update Work** | ❌ No | Standard transactional mutation with Clerk auth | `createWorkServerFn` / `updateWorkServerFn` |
| **Create / Update Chapter** | ❌ No | Author content editing with IDOR verification | `createChapterServerFn` / `updateChapterServerFn` |
| **Library Management** | ❌ No | Simple user-associated relation insert/delete | `saveWorkServerFn` / `removeWorkServerFn` |
| **Reading Progress Upsert** | ❌ No | High-frequency, lightweight coordinate write | `updateReadingProgressServerFn` in `src/server/reader.ts` |
| **Public Author Profile** | ❌ No | Read-only public identity view | `getPublicAuthorServerFn` in `src/server/authors.ts` |
| **Content Moderation Scan** | ✅ **Yes** | Asynchronous, non-blocking background CPU text scan | Edge Function: `content-moderation` |
| **Clerk Auth Webhook** | ✅ **Yes** | External webhook requiring Svix signature verification | Edge Function: `clerk-webhook` |
| **Analytics Rollup Aggregation** | ✅ **Yes** | Scheduled batch rollup from raw events to metric columns | Edge Function: `aggregate-analytics` |
| **Semantic Embeddings / AI** | ✅ **Yes** *(Future)* | External AI API latency isolation | Edge Function: `generate-embeddings` |

---

## 3. Implemented Edge Functions (Section 38 Audit)

### 1. `content-moderation`
- **Location**: `supabase/functions/content-moderation/index.ts`
- **Why**: Scans newly published manuscript titles, descriptions, and chapter texts for prohibited content (phishing, hate speech, severe violations). Runs asynchronously and does not block writer publishing.
- **Trigger**: Dispatched asynchronously via HTTP POST after `publishWorkServerFn` or `publishChapterServerFn`.
- **Secrets**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- **DB Tables Touched**: `moderation_reports`, `audit_logs`.

### 2. `clerk-webhook`
- **Location**: `supabase/functions/clerk-webhook/index.ts`
- **Why**: Handles external user lifecycle webhooks (`user.created`, `user.updated`, `user.deleted`) from Clerk with cryptographic Svix header verification.
- **Trigger**: Clerk Webhook endpoint delivery.
- **Secrets**: `CLERK_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- **DB Tables Touched**: `profiles`, `audit_logs`.

### 3. `aggregate-analytics`
- **Location**: `supabase/functions/aggregate-analytics/index.ts`
- **Why**: Scheduled background rollup. Aggregates granular `analytics_events` and `reading_history` into pre-computed `view_count` and read stats on `works`, ensuring catalog queries remain instant `O(1)` index lookups.
- **Trigger**: Periodic cron schedule (e.g. hourly or daily via pg_cron or external scheduler).
- **Secrets**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- **DB Tables Touched**: `analytics_events`, `works`, `audit_logs`.

---

## 4. Final API & Server Query Audit (Section 39)

Every query strictly eliminates `SELECT *` and requests only the exact projection needed:

| API / Server Function | Purpose | Tables Accessed | Fields Selected | Pagination | Authorization / RLS |
|---|---|---|---|---|---|
| `getPublicWorkBySlug` | Public Work Overview & Header | `works`, `profiles`, `categories`, `genres`, `tags`, `content_warnings` | `id`, `author_id`, `title`, `slug`, `description`, `cover_image_path`, `language`, `status`, `visibility`, `publication_status`, `content_rating`, `reading_time_minutes`, `word_count`, `chapter_count`, `view_count`, `like_count`, `save_count`, `published_at`, `author(id, username, display_name, avatar_path, bio, location, is_verified)`, `category(id, name, slug)`, `genres`, `tags`, `warnings` | Single record | Public visibility + published status filter |
| `getDiscoverWorks` | Discovery feed and catalog cards | `works`, `profiles`, `categories` | `id`, `title`, `slug`, `description`, `cover_image_path`, `status`, `word_count`, `chapter_count`, `reading_time_minutes`, `view_count`, `like_count`, `save_count`, `published_at`, `author(id, username, display_name, avatar_path, is_verified)`, `category(id, name, slug)` | Bounded limit (1-50, default 20), offset | Public visibility + published + `is_indexable` filter |
| `getWorkChapters` | Chapter drawer & table of contents | `chapters` | `id`, `work_id`, `chapter_number`, `title`, `slug`, `excerpt`, `word_count`, `reading_time_minutes`, `status`, `published_at`, `created_at` *(Strictly omits full chapter body)* | Ordered by `chapter_number ASC` | Published status for readers; author RLS for drafts |
| `getChapterByNumber` | Reader view full chapter | `chapters` | `id`, `work_id`, `chapter_number`, `title`, `slug`, `content`, `excerpt`, `word_count`, `reading_time_minutes`, `status`, `published_at` | Single chapter record | Published status for readers; author RLS for drafts |
| `getReaderLibrary` | Reader saved library items | `library_items`, `works`, `profiles` | `id`, `created_at`, `work(id, title, slug, description, cover_image_path, status, chapter_count, word_count, author(id, username, display_name, avatar_path))` | Bounded limit (1-50, default 20), offset | `user_id` equality check + RLS |
| `getReadingProgress` | Reading bookmark restore | `reading_progress` | `id`, `user_id`, `work_id`, `chapter_id`, `progress_percent`, `position`, `last_read_at` | Single record | `user_id` equality check + RLS |
| `getPublicAuthor` | Public author profile | `profiles`, `profile_links` | `id`, `username`, `display_name`, `bio`, `avatar_path`, `website_url`, `location`, `is_verified`, `created_at`, `links(platform, url, display_order)` *(Excludes Clerk ID, email, moderation)* | Single record | `is_public: true`, `account_status: active` |
| `getAuthorPublishedWorks`| Author profile published works list | `works`, `categories` | `id`, `title`, `slug`, `description`, `cover_image_path`, `status`, `word_count`, `chapter_count`, `reading_time_minutes`, `view_count`, `like_count`, `save_count`, `published_at`, `category(id, name, slug)` | Bounded limit (1-50, default 20), offset | Public visibility + published |

---

## 5. Deployment & Local Development Workflows

### Separation of Environments
- **Vercel**: Deploys the frontend application, TanStack Router, and TanStack Start SSR/Server Functions.
- **Supabase**: Hosts PostgreSQL database, Storage buckets, Realtime, and Supabase Edge Functions.

### Environment Variable Matrix
| Variable | Environment | Exposure | Purpose |
|---|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Vercel / Client | Public | Client-side Clerk authentication initialization |
| `CLERK_SECRET_KEY` | Vercel Server | Private Server | Server-side Clerk token verification |
| `VITE_SUPABASE_URL` | Vercel / Client | Public | Supabase API URL |
| `VITE_SUPABASE_ANON_KEY` | Vercel / Client | Public | Public anonymous key respecting PostgreSQL RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel Server / Supabase Edge Functions | **Private Server Only** | Admin client and Edge Function execution |
| `CLERK_WEBHOOK_SECRET` | Supabase Edge Functions | **Private Server Only** | Svix signature verification for webhooks |

### Local Development of Edge Functions
To develop and run Edge Functions locally using the Supabase CLI:

```bash
# 1. Start local Supabase container (optional if using cloud project)
supabase start

# 2. Serve Edge Functions locally
supabase functions serve --env-file .env

# 3. Test content-moderation locally
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/content-moderation' \
  --header "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  --header 'Content-Type: application/json' \
  --data '{"targetType":"work","targetId":"00000000-0000-0000-0000-000000000000","content":"Sample story text"}'
```

### Production Deployment of Edge Functions
Deploy functions individually with the Supabase CLI:

```bash
# Deploy content-moderation
supabase functions deploy content-moderation --no-verify-jwt

# Deploy clerk-webhook
supabase functions deploy clerk-webhook --no-verify-jwt

# Deploy aggregate-analytics
supabase functions deploy aggregate-analytics --no-verify-jwt

# Set remote secrets
supabase secrets set CLERK_WEBHOOK_SECRET="whsec_..."
```
