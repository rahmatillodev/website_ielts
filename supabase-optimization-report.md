# Supabase Optimization Report

## 1. 🚨 Problem Overview

### What is Cached Egress?
Cached Egress in Supabase is outbound bandwidth served through Supabase Storage/CDN and APIs. Even when content is cacheable, egress still increases when many users request large files (images/audio/video), when cache is bypassed, or when repeated calls happen.

### What is Storage Size?
Storage Size is the total disk usage of objects in Supabase Storage buckets (plus growth patterns from replacing files, generating variants externally, and retaining historical assets). It grows quickly when uploads are frequent, files are large, and lifecycle/cleanup is missing.

### Why these increase quickly in Supabase
- Repeated API reads from large tables increase API egress (JSON payload size + request frequency).
- Media payloads (especially audio/video) dominate bandwidth compared to JSON responses.
- Public URLs with cache-busting query strings can force extra CDN/browser misses.
- Missing strong `cacheControl` headers on upload reduce cache hit duration.
- N+1 query patterns multiply payload and request count as data grows.

### CDN + browser behavior (important)
- CDN/browser cache helps only when URLs and cache headers are stable.
- If URL changes every render (`?t=${Date.now()}`), cache effectiveness drops.
- Browser revalidation and partial fetches still contribute to egress.

### Streaming + range requests behavior
Audio/video playback typically uses HTTP range requests (`206 Partial Content`) instead of one full response. This is normal, but frequent seeks/replays and multiple players can create many partial requests that significantly raise cached egress.

---

## 2. 📊 Current Implementation (What is already done)

### ✅ Store-level request caching in dashboard analytics
**Description:** Dashboard/analytics stores already include staleness windows and in-flight guards to reduce duplicate requests.

**Code example:**
```js
// dashboardStore.js
const isStale = !state.lastFetched || state.lastFetched < fiveMinutesAgo;
if (!shouldFetch && !state.loading) return { attempts: state.attempts, ... };
if (state.loading) return { attempts: state.attempts, ... };
```

**Status:** ✅ Implemented  
**🔗 Feature/Component:** Dashboard metrics (`src/store/dashboardStore.js`), Analytics (`src/store/analyticsStore.js`)

---

### ✅ Selective column selection in heavy queries
**Description:** Many queries explicitly select required columns instead of `*`, reducing response payload size.

**Code example:**
```js
// dashboardStore.js
.select('id, test_id, score, time_taken, total_questions, correct_answers, created_at, completed_at')
```

**Status:** ✅ Implemented  
**🔗 Feature/Component:** Dashboard data fetch (`src/store/dashboardStore.js`), Mock history/result loaders (`src/hooks/useMockTestHistory.js`, `src/pages/dashboard/mock/MockTestClientResultsPage.jsx`)

---

### ✅ Audio preload is reduced in speaking result list
**Description:** Speaking result audio elements explicitly use `preload="metadata"` to avoid immediate full-file preload.

**Code example:**
```jsx
<audio controls src={item.audioUrl} preload="metadata" ... />
```

**Status:** ✅ Implemented  
**🔗 Feature/Component:** Speaking Result page (`src/pages/dashboard/speaking/SpeakingResultPage.jsx`)

---

### ✅ Client-side persistence reduces repeated recovery fetches
**Description:** Mock flow persists progress in local storage/session storage, reducing repeated recovery calls after navigation or refresh.

**Code example:**
```js
saveMockTestData(effectiveMockTestId, { currentSection, sectionResults, mockTestId: effectiveMockTestId });
```

**Status:** ✅ Implemented  
**🔗 Feature/Component:** Mock Test Flow (`src/pages/dashboard/mock/MockTestFlow.jsx`)

---

### ✅ Avatar upload uses deterministic path and upsert
**Description:** Avatar upload path is deterministic per user, preventing uncontrolled file path explosion.

**Code example:**
```js
const filePath = `${userId}/avatar.${fileExt}`;
supabase.storage.from('avatar-image').upload(filePath, file, { upsert: true });
```

**Status:** ✅ Implemented  
**🔗 Feature/Component:** Profile Avatar Upload (`src/store/authStore.js`)

---

## 3. 🔍 Detected Issues (CRITICAL)

### ❌ Missing `cacheControl` on storage upload
- **💥 Why it increases egress/storage:** Without explicit long-lived cache headers, CDN/browser may revalidate more frequently and produce more origin/CDN traffic.
- **📍 Where:** `src/store/authStore.js` (`uploadAvatar`)
- **🔗 Feature:** Profile Avatar Upload

---

### ❌ Cache-busting avatar URL forces re-downloads
- **💥 Why it increases egress/storage:** `?t=${Date.now()}` changes every render/open, defeating cache reuse and triggering repeated downloads.
- **📍 Where:** `src/components/navbar/DashboardNavbar.jsx`
- **🔗 Feature:** Dashboard Navbar Avatar

---

### ❌ N+1 fan-out query pattern in mock history
- **💥 Why it increases egress/storage:** For each client row, additional calls fetch attempts/tests/writings/mock_test. Request count and payload grow linearly with history.
- **📍 Where:** `src/hooks/useMockTestHistory.js`
- **🔗 Feature:** Mock Test History

---

### ❌ Duplicated heavy query logic in client results page
- **💥 Why it increases egress/storage:** Similar fan-out queries are repeated in page-level loader; duplicates transfer and maintenance complexity.
- **📍 Where:** `src/pages/dashboard/mock/MockTestClientResultsPage.jsx`
- **🔗 Feature:** Mock Test Client Results

---

### ❌ Unbounded attempt reads in dashboard/analytics path
- **💥 Why it increases egress/storage:** Pulling entire attempt history eventually transfers large payloads for long-term users.
- **📍 Where:** `src/store/dashboardStore.js`, `src/store/analyticsStore.js`
- **🔗 Feature:** Dashboard Overview, Analytics

---

### ❌ Render-time state update in fallback branch
- **💥 Why it increases egress/storage:** `setCurrentSection(...)` in render path can trigger unnecessary rerender loops and indirect repeated fetch logic in section components.
- **📍 Where:** `src/pages/dashboard/mock/MockTestFlow.jsx` (default switch branch)
- **🔗 Feature:** Mock Test Flow Orchestrator

---

### ❌ Media players missing conservative explicit preload in key components
- **💥 Why it increases egress/storage:** Default browser preload behavior can vary; absence of explicit `preload="none"` / `metadata` can create unnecessary media transfer.
- **📍 Where:** `src/components/AudioPlayer.jsx`, `src/components/mock/InstructionalVideo.jsx`
- **🔗 Feature:** Listening Audio Player, Mock Instructional Video

---

## 4. 📉 Egress Analysis

### Estimated bandwidth contributors (highest to lower risk)
1. **API payload egress (high):**  
   - `user_attempts` + `user_answers` analytics reads are the strongest long-term risk because they grow with usage volume.  
   - Features: Analytics (`src/store/analyticsStore.js`), Dashboard (`src/store/dashboardStore.js`), Mock history/results (`src/hooks/useMockTestHistory.js`, `src/pages/dashboard/mock/MockTestClientResultsPage.jsx`).

2. **Audio/video streaming egress (high):**  
   - Audio/video usually produce range requests (`206`) and fragmented downloads. Multiple starts/seeks/retries multiply requests.
   - Features: Speaking results audio, listening player, instructional videos.

3. **Image/avatar egress (medium):**  
   - Avatar refresh strategy and lack of strong cache settings can trigger repeated image downloads.
   - Features: Profile + Navbar avatar.

### Audio streaming/range-request note
Range requests are expected for media but should be monitored. If many `206` requests occur for the same URL in short intervals, this indicates replays/seeks/re-initialization patterns causing high cached egress.

---

## 5. 🧠 Best Practices Applied

- ✅ **Store stale-time caching** is used to avoid frequent refetches (`lastFetched`, cache duration checks).  
  **Feature:** Dashboard/Analytics stores.
- ✅ **Concurrent fetch guard** (`if (state.loading) return`) prevents duplicate in-flight requests.  
  **Feature:** Dashboard/Analytics stores.
- ✅ **Selective field projection** in many Supabase queries lowers payload size versus broad `*`.  
  **Feature:** Dashboard/Mock loaders.
- ✅ **User-scoped filters** (`.eq('user_id', ...)`, status filters) reduce unnecessary row transfer.  
  **Feature:** Mock history/results/auth.
- ✅ **Metadata-only preload** exists in speaking result audio list.  
  **Feature:** Speaking Result page.

---

## 6. 🚀 Additional Improvements (HIGH PRIORITY)

### 💡 Add long-lived cache headers to uploaded avatars
- **🧩 Related Feature:** Profile Avatar Upload (`src/store/authStore.js`)
- **⚙️ Implementation example:**
```js
await supabase.storage
  .from('avatar-image')
  .upload(filePath, file, {
    upsert: true,
    cacheControl: '31536000, immutable',
  });
```

---

### 💡 Replace timestamp cache-busting with versioned avatar URLs
- **🧩 Related Feature:** Dashboard Navbar Avatar (`src/components/navbar/DashboardNavbar.jsx`)
- **⚙️ Implementation example:**
```jsx
// Store avatar_version in users table and increment on successful upload
<img src={`${userProfile.avatar_image}?v=${userProfile.avatar_version ?? 1}`} alt="avatar" />
```

---

### 💡 Consolidate mock history/result fan-out into a server-side view/RPC
- **🧩 Related Feature:** Mock Test History + Client Results
- **⚙️ Implementation example:**
```js
// Replace per-client Promise.all fan-out with one RPC/view query
const { data, error } = await supabase.rpc('get_mock_history_compact', { p_user_id: userId });
```

---

### 💡 Enforce pagination/limits for attempt-heavy queries
- **🧩 Related Feature:** Dashboard and Analytics
- **⚙️ Implementation example:**
```js
.from('user_attempts')
.select('id,test_id,score,completed_at')
.eq('user_id', userId)
.order('completed_at', { ascending: false })
.limit(50);
```

---

### 💡 Fetch analytics incrementally and aggregate server-side
- **🧩 Related Feature:** Analytics
- **⚙️ Implementation example:**
```js
// Ask DB for already aggregated stats by date/type instead of raw answer rows
const { data } = await supabase.rpc('get_user_analytics_summary', { p_user_id: userId, p_days: 90 });
```

---

### 💡 Explicitly set preload policies for media elements
- **🧩 Related Feature:** Audio Player, Instructional Video
- **⚙️ Implementation example:**
```jsx
<audio src={audioUrl} preload="metadata" />
<video src={videoSrc} preload="none" playsInline />
```

---

### 💡 Compress/normalize media before upload and playback
- **🧩 Related Feature:** Speaking recordings, avatars
- **⚙️ Implementation example:**
```js
// Example strategy: transcode to lower bitrate before upload
// audio target: mono ~64kbps AAC/Opus; image target: WebP/AVIF with size cap
```

---

### 💡 Adopt request deduplication layer (React Query/SWR)
- **🧩 Related Feature:** Dashboard + Mock pages with overlapping fetches
- **⚙️ Implementation example:**
```js
useQuery(['dashboard', userId], () => fetchDashboardData(userId), { staleTime: 180000 });
```

---

## 7. 🧪 Debugging Guide

### Chrome DevTools (Network tab)
1. Open Network, enable **Disable cache** only for testing baseline.
2. Filter by file type: `mp3`, `m4a`, `mp4`, `jpg`, `png`, `webp`.
3. Sort by **Transferred** and **Waterfall** to find heavy and repeated requests.
4. Watch status codes:
   - `200` full response
   - `206` partial content (range requests)
   - Frequent repeated `206` for same media = possible streaming replay overhead.
5. Compare same-route navigation to detect duplicated API fetches.

### Detect repeated requests quickly
- Look for identical Supabase query signatures firing multiple times within seconds.
- Verify whether query parameters changed or just component rerender caused refetch.
- Focus first on mock history/client results and dashboard analytics screens.

### Supabase Logs Explorer ideas
- Filter storage/API logs by route patterns and largest byte responses.
- Group by endpoint/table to find top egress producers (`user_attempts`, `user_answers`, storage object GETs).
- Track before/after when applying cache headers, limits, and consolidation.

---

## 8. 📌 Feature-Based Summary

| Feature | Problem | Fix Applied | Further Optimization |
|--------|--------|------------|---------------------|
| Profile Avatar Upload | Missing cache headers on uploaded images | Deterministic path + `upsert` already used | Add `cacheControl: '31536000, immutable'`; optional image compression |
| Dashboard Navbar Avatar | Cache busting with `?t=${Date.now()}` | Avatar fallback and centralized avatar source exists | Use stable versioned URL (`?v=`) tied to avatar update version |
| Mock Test History | N+1 per-client query fan-out | User/status filters and selected fields | Replace with one RPC/view, paginate history results |
| Mock Test Client Results | Duplicated heavy query chain | Scoped by `clientId`, ordered attempts | Reuse consolidated history/result service or RPC |
| Dashboard Overview | Unbounded attempts fetch over time | Store cache window + loading guard | Add `.limit()`/pagination and incremental fetch |
| Analytics | Large raw reads (`user_attempts` + `user_answers`) | Cache duration + scoped by user | Server-side aggregation RPC + time window + pagination |
| Speaking Result Audio | Media can drive range-request egress | `preload="metadata"` already implemented | Ensure recording compression and reuse stable media URLs |
| Listening Audio Player | No explicit preload policy | Local position persistence reduces replay friction | Set `preload="metadata"` and avoid unnecessary `.load()` triggers |
| Mock Instructional Video | No explicit preload policy | Single video flow with controlled playback | Use `preload="none"` and verify no duplicate source resets |
| Mock Test Flow Orchestrator | Render-time `setState` in fallback branch | Local persistence and completion checks exist | Move section correction logic to `useEffect` to avoid rerender loops |

---

## 9. ✅ Final Summary

- **Main bottleneck:** API egress from attempt/answer-heavy query patterns (especially mock history fan-out and analytics raw scans), followed by media streaming range requests.
- **What improved already:** Existing cache windows, loading guards, selective field selection, and some preload/local persistence patterns already reduce avoidable traffic.
- **What remains risky:** Missing storage cache headers, timestamp cache-busting avatar URLs, unbounded historical reads, duplicated query logic, and media preload defaults in key components.
- **Most impactful next actions:**  
  1) add strong `cacheControl` + stable versioned image URLs,  
  2) consolidate and paginate heavy mock/analytics queries,  
  3) enforce explicit media preload and compression strategy.

