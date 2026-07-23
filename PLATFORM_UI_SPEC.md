# Platform UI Spec

Content and functionality reference for the platform redesign (Stage 2). Everything here was read
out of `platform/src` on **18 July 2026** at commit `00ad8a5`. It describes what the code does
today, not what it is supposed to do — where the two differ, the difference is called out.

**How to use this.** Each page section lists what the screen must *show* and *do*, plus the states
it has to cover. Where a page is missing a state, that is marked explicitly so the redesign adds it
rather than inheriting the gap. Nothing was omitted silently; §11 lists what was skipped and why.

---

## Table of contents

- [0. Read this first — five findings that change the brief](#0-read-this-first)
- [1. Architecture — the two-world model](#1-architecture)
- [2. Navigation map](#2-navigation-map)
- [3. Public and auth pages](#3-public-and-auth-pages)
- [4. Core dashboard pages](#4-core-dashboard-pages)
- [5. Reading and Listening](#5-reading-and-listening)
- [6. Writing](#6-writing)
- [7. Speaking](#7-speaking)
- [8. Mock tests](#8-mock-tests)
- [9. Shared components](#9-shared-components)
- [10. Content density guide](#10-content-density-guide)
- [11. Known UX debt](#11-known-ux-debt)
- [12. What was skipped, and why](#12-what-was-skipped-and-why)

---

<a name="0-read-this-first"></a>
## 0. Read this first — five findings that change the brief

These contradict assumptions in the redesign brief. Each was verified against the working tree.

### 0.1 There is no unified dashboard — `accessMode` is fully alive

The brief refers to "the now-unified single dashboard from the accessMode removal work". **That work
is not in this codebase.** `accessMode` is read or written in nine files, the app still has two
separate layouts (`DashboardLayout` and `MockTestLayout`) with two separate route guards, and
`App.jsx` carries ~190 lines of logic that writes `accessMode` on every navigation and force-
redirects users out of the opposite world. No branch in the repo contains a removal.

Design against the two-world model described in §1, or treat unifying it as in-scope work for this
redesign — but it cannot be assumed done.

### 0.2 Dark mode does not currently work

The redesign targets a dark theme. Today:

- `next-themes` is installed, but **no provider is mounted**. Its only consumer is `ui/sonner.jsx`,
  which has zero importers.
- `index.css` defines a `.dark` block with a full token set, but **`.dark` is never applied to any
  element**, so that block is inert.
- Roughly 50 `dark:` Tailwind utilities are scattered through the app as dead CSS.
- A *separate* bespoke theming system does exist — `AppearanceContext` — but it is applied through
  inline `style={{}}` rather than classes, offers three IELTS-accessibility presets (black-on-white,
  white-on-black, yellow-on-black) rather than a product theme, and is reachable **only** from the
  hamburger inside the practice-test header. Dashboard, landing, analytics, cards, sidebars and
  navbars are hard-coded light.

Dark mode is therefore a **build**, not a re-skin, and there are two theming systems to reconcile.

### 0.3 `tailwind.config.js` is ignored, so design tokens will not apply

The project is on Tailwind 4 (CSS-first config) and there is no `@config` directive, so
`tailwind.config.js` has never been read. Proof it never ran: two invalid colour values,
`'#ff33333'` and `'#ffff'`, sit unnoticed in that file. A knock-on effect is that
**every skeleton loader is frozen** — `animate-shimmer` is defined only in the dead config, so all
shimmer components render as static grey blocks.

Any token system from Stage 1 must ship as CSS-first `@theme`, or it will silently do nothing.

### 0.4 The mock-test "staff activation" model is about one-third built

The brief describes a "staff-activated redesign — booking status / start / history". In reality:

- **History** — exists and works.
- **Booking status** — **has no user-facing surface at all.** The five statuses (`booked`,
  `started`, `completed`, `checked`, `notified`) are written by the flow and read only by history
  badges. `useMockTests` computes a complete status map that **no component renders**.
- **Start** — a password textbox, not a status-driven "your test is ready" affordance.
- **Activation** — there is no staff-activation code path in this repo, and **no "you are not
  activated yet" screen anywhere**. A user who is not a mock-test client sees the same page as one
  who is, and the flow silently creates their client row when they start.

### 0.5 Three flows advertise grading that does not exist

- **Writing** — submissions insert with `score: null`; a code comment reads "Writing doesn't have
  automated scoring". No TA/CC/LR/GRA anywhere. The only "feedback" is a static admin-authored blob
  attached to the *task*, identical for every user.
- **Speaking** — no grading, no transcript, no criteria, and **nothing is ever uploaded**;
  recordings live in memory and die on refresh.
- **Mock tests** — bands and feedback are produced entirely in the separate admin app. The platform
  is read-only on grading.

Meanwhile the landing page sells "AI Evaluation", and the (dead) speaking library promised "instant
AI scoring and detailed feedback". **Do not design score breakdowns for writing or speaking** unless
the backend is also in scope.

---

<a name="1-architecture"></a>
## 1. Architecture — the two-world model

### 1.1 `accessMode`

A `sessionStorage` key, either `'regular'` or `'mockTest'`, selects which half of the app the user
is in.

- `'regular'` → `RegularDashboardRoute` + `DashboardLayout`
- `'mockTest'` → `MockTestRoute` + `MockTestLayout`

One effect **writes** it on every navigation; a second **reads** it and force-redirects the user out
of the other world. In `mockTest` mode any regular route redirects to `/mock-tests`; in `regular`
mode any mock route redirects to `/dashboard`, except history/results when the user is a confirmed
mock-test client.

Exempt from redirect: `/`, `/login`, `/signup`, all practice and result routes (which *preserve*
rather than overwrite the mode), and `/profile`.

**`/profile` is the only page shared by both worlds.** It is registered only under the regular
layout, so a mock-test client who opens it gets the full regular sidebar — effectively an escape
hatch out of the mock-only shell.

Two caveats for the redesign: the redirect logic is **duplicated** between `App.jsx` and
`DashboardLayout` with subtly different route lists, and `RegularDashboardRoute` is a **no-op** that
returns its children unconditionally despite being named and positioned as a guard.

### 1.2 Layouts

| | DashboardLayout | MockTestLayout | LandingLayout |
|---|---|---|---|
| Sidebar | `DashboardSidebar`; `Sheet` drawer under 768px | **none** | none |
| Navbar | `DashboardNavbar` | `DashboardNavbar flow="mockTest"` (adds a red "Mock Test" pill, hides Profile Settings) | `LandingNavbar` |
| Footer | none | none | `LandingFooter` |
| Chrome hidden on | 11 paths, or any URL with `?mockTest=true` | 7 paths | the 4 auth routes |
| Rotation prompt | yes | yes | no |

When chrome is hidden the layout **early-returns a bare `<Outlet>`** — nav is unmounted, not
CSS-hidden. Consequence worth noting: `/own-writing` is a normal dashboard route whose path is in
the hide list, so it loses all navigation with no back affordance.

`MockTestSidebar` exists (194 lines) but **no layout mounts it** — the mock world has no sidebar.

### 1.3 Duplicate route registration

Five routes are registered under **both** layouts, so the same component renders with different
chrome depending on which world the user is in: `/reading-practice/:id`, `/listening-practice/:id`,
`/writing-practice/:id`, `/reading-result/:id`, `/listening-result/:id`.

Two more are registered twice with a differentiating prop: `MockTestHistoryPage`
(`/mock-test/history` vs `/mock-test/history-regular`) and `MockTestClientResultsPage`
(`/mock-test/results/:clientId` vs `/mock-test/results-regular/:clientId`).

Real behavioural differences inside practice pages come from the **`?mockTest=true` query param**,
not from the layout.

### 1.4 Catch-all

- Logged out → `/login?redirect=<encoded path>`, after inferring `accessMode` from the attempted path.
- Logged in on `/login` or `/signup` with a `redirect` param → validates it is a same-origin
  relative path, normalises `/mock-test` to `/mock-tests`, and navigates there.
- Logged in otherwise → `/mock-tests` or `/dashboard` by `accessMode`.

### 1.5 App-level chrome

- **Global toast container** (`react-toastify`). Note two toast libraries are in play across the
  app — `sonner` is used in a few places, which the redesign should consolidate.
- **`FeedbackModal`** is mounted globally and is **self-triggering**: it opens once per browser,
  unprompted, over whatever page the user is on, when they have completed 3+ tests that day.
- **A "powered by AhsanLabs" badge** renders fixed bottom-right at `z-index: 9999` on every
  non-practice page. The JSX element is empty; the text is injected by CSS `::before`/`::after`.
- **Boot state** — while auth initialises the entire app is a centred spinner + "Loading...".

---

<a name="2-navigation-map"></a>
## 2. Navigation map

```
LOGGED OUT
  /  (LandingPage)
   ├─ nav "Login" ─────────────► /login ──┐
   ├─ nav/hero/CTA "Get Started"─► /signup ─┤ (both accept ?redirect=)
   └─ anchors #why-choose, #stories        │
                                            ▼
  /login ⇄ /signup  (switcher preserves ?redirect)
     └─ "Forgot password?" ──► /forgot-password ──► (email) ──► /reset-password ──► /login
        (NOTE: drops ?redirect)

  any other URL ──► /login?redirect=<original>

LOGGED IN — accessMode 'regular'                    LOGGED IN — accessMode 'mockTest'
  DashboardLayout: sidebar + navbar                   MockTestLayout: navbar only
  ├─ /dashboard          (dead end — no CTAs)         ├─ /mock-tests ─► password modal
  ├─ /reading  ──► /reading-practice/:id              │     └─► /mock-test/flow/:id
  │                  └─► /reading-result/:id          │            ├─ audio check
  │                        ├─► review mode            │            ├─ listening ─► ListeningPractice
  │                        └─► retake                 │            ├─ reading   ─► ReadingPractice
  ├─ /listening ──► (same shape as reading)           │            ├─ writing   ─► WritingPractice
  ├─ /writing  ──► /writing-practice/:id              │            └─ results (DEAD END: no nav)
  │     ├─► /writing/writing-history                  ├─ /mock-tests/local-archive
  │     └─► /own-writing  (isolated, no persistence)  ├─ /mock-test/history ─► /mock-test/results/:id
  ├─ /speaking                                         └─ /mock/select ─► /mock/online   ⚠ FACADE
  │     ├─ "Speaking" card ─► /speaking-library ✗DEAD              └─► /mock/center  ⚠ FACADE
  │     ├─ /shadowing-library ─► shadowing player
  │     ├─ /speaking/podcasts ─► podcast player       Shared by both worlds:
  │     └─ /speaking/tips[/:tipId]                      /profile  (only page exempt from redirect)
  ├─ /analytics
  ├─ /profile
  └─ /mock-test/history-regular ─► /mock-test/results-regular/:clientId
        (visible only when isMockTestClient === true)

ORPHANED — reachable only by typing a URL:
  /equipment-check/:id ─► /speaking-practice/:id/session ─► /speaking-result/:id
  (their only inbound link was the speaking library, whose route is commented out)
```

**Dead ends worth fixing.** `/dashboard` has no outbound CTA of any kind. `MockTestResults` renders
no navigation at all while its navbar is hidden. Five `navigate("/speaking-library")` calls land on
a commented-out route and silently bounce to `/dashboard`.

---

<a name="3-public-and-auth-pages"></a>
## 3. Public and auth pages

Shell: `LandingLayout`. Navbar and footer render **only on `/`** — all four auth routes suppress
them. The four auth pages share one skeleton: a dark animated brand panel on the left
(`AnimatedPolygonDecoration`, hidden below `lg`) and the form on the right.

There is **no OAuth/social login, no "remember me", and no resend-email flow** anywhere.

### 3.1 LandingPage — `/`

- **Purpose:** Marketing home selling mock tests + AI evaluation; funnels to `/signup`.
- **Who sees it:** logged-out visitors only. The route does not exist for authed users.
- **Content**
  - **Navbar** — logo + red "Beta" pill; anchors "Why choose us?" and "Stories"; Login and
    Get Started buttons. Telegram + Instagram icons appear **in the mobile menu only**.
  - **Hero** — badge "NEW: AI Evaluated Mock Tests"; H1 "Build Skills, / Boost Scores, /
    Master IELTS."; sub-copy about Band 8.0+; CTA "Start Free Practice"; a row of four stacked
    avatars as social proof.
  - **Hero "My Progress" card** — an "Active Session" pill, a 2×2 band grid (L 8.5 / R 7.5 / W 7.0 /
    S 8.0) and "AVERAGE SCORE — Band 8.0". **All hard-coded.**
  - **Trusted by** — five institution wordmarks as plain text: WIUT, TUIT, MDIS, WEBSTER, TSUL.
  - **Why choose** — three cards: Full Mock Tests, AI Evaluation, Score Predictor.
  - **Success Stories** — an infinite CSS marquee of **12 hard-coded testimonials** (avatar, name,
    institution, quote, emoji, result), each rendered twice via duplicated map blocks.
  - **CTA band** — "Ready to finally get the band score you actually want?", "Join 1,000+ students…".
  - **Footer** — logo, "Know where you stand before test day", blurb, socials, "Useful Links"
    (only the two anchors), "© 2026 IELTSCORE".
- **Actions:** three separate routes to `/signup`; Login; two in-page anchors; social links built
  from settings.
- **States:** scroll-reveal animations and lazy images are present. **Missing:** a loading state —
  social links render as `https://t.me/#` until settings resolve, so an early click opens a dead
  link; and an error state — a failed settings fetch only logs to console.
- **Density:** medium.

> **Redesign notes.** The "My Progress" card is logged-in dashboard content shown exclusively to
> logged-out visitors, unlabelled as a preview — the biggest honesty gap on the page. All 12
> testimonials, the five institutions and "Join 1,000+ students" are invented while the navbar says
> "Beta". Hero social proof currently reads "Trusted by students from planet Earth (maybe Mars
> someday)" — placeholder copy in the primary conversion path. The marquee has no pause control and
> no `prefers-reduced-motion` guard.

### 3.2 LoginPage — `/login`

- **Purpose:** Email/password sign-in, redirect-aware into either world.
- **Content:** brand panel ("Master Your Core Skills", "Joined by 20,000+ students worldwide");
  H1 "Welcome Back"; a Sign In | Sign Up segmented switcher; Email; Password with eye toggle;
  "Forgot password?" inline with the password label; submit; "Don't have an account? Sign Up".
- **Actions:** email validated on submit (non-empty, then regex); password non-empty only — **no
  length rule**; submit → toast "Welcome back!" and redirect, or a mapped
  "Invalid email or password". Sign-up links preserve `?redirect`; **"Forgot password?" drops it.**
- **States:** submitting (button "Signing in…", inputs disabled); errors are **toast-only**.
  **Missing:** inline field errors, `aria-invalid`, any persistent cue.
- **Density:** light.

### 3.3 SignUpPage — `/signup`

- **Content:** same skeleton; H1 "Create an account"; Full Name, Email, Password.
  **No terms/privacy consent, no confirm-password, no strength meter.**
- **Actions:** all three fields are **truthiness-checked only** — no email regex (unlike Login), no
  password minimum (unlike Reset). Submit also links any pre-existing `mock_test_clients` row
  matching the email and syncs phone/telegram into the user record.
- **States:** submitting; errors surface raw Supabase strings ("User already registered") verbatim.
  - **Missing — email-confirmation state.** Success is reported on the user object alone. If
    Supabase email confirmation is enabled there is no session, yet the page toasts success and
    navigates to `/dashboard` where the user may not be authenticated. **There is no "check your
    inbox" screen and no resend flow anywhere in the codebase.**
- **Density:** light.

### 3.4 ForgotPasswordPage — `/forgot-password`

- **Who sees it:** mounted unconditionally — a logged-in user can reach it.
- **Content:** H1 "Forgot password?"; one Email field; "Send reset link"; "Back to Sign in".
- **States:** submitting ("Sending…"). **Success is a toast only — the form stays populated and
  immediately re-submittable.** Missing: a success screen echoing the address, any resend or
  cooldown control, and enumeration-safe copy.
- **Density:** light.

### 3.5 ResetPasswordPage — `/reset-password`

- **Three mutually exclusive views:**
  1. **Checking** — a full-screen white page with the bare text "Loading…": no logo, no brand panel,
     no spinner.
  2. **Valid session** — H1 "Set new password"; New password + Confirm password, each with an eye
     toggle; "Update password".
  3. **Invalid** — H1 "Invalid or expired link", explanatory body, "Request new link" and
     "Back to Sign in". *This is the best-formed error state in the auth flow — use it as the model.*
- **Actions:** validation order is both non-empty → at least 6 characters → passwords match. **The
  6-character rule exists nowhere else in the product**, so a user can create a 3-character password
  at signup and then be blocked from resetting to it.
- **States:** **the session check is not recovery-specific** — it accepts *any* session, so a
  normally logged-in user visiting this URL gets the change-password form with no re-authentication.
  After success the copy says "You can now sign in" but the session is never cleared.
- **Density:** light.

---

<a name="4-core-dashboard-pages"></a>
## 4. Core dashboard pages

### 4.1 DashboardPage — `/dashboard`

- **Purpose:** Practice home — latest bands, cumulative counters, daily target, activity calendar.
- **Who sees it:** authenticated, `accessMode !== 'mockTest'`. **It does not branch on `accessMode`
  at all** — there is no mock variant; separation is by redirect only.
- **Content**
  - Header — "Welcome {firstName} 👋" / "Let's improve your band score today."
  - **My Progress card** — a green **"Active Session"** pill (hard-coded, not derived from state)
    and a 2×2 grid: Listening, Reading, Writing, and **Speaking rendered as the literal string
    "Coming Soon"** in a disabled tile. Below: "AVERAGE SCORE — Band {n}".
  - **Tests Completed** — count + "Total questions: {n}".
  - **Study Time** — `Xh Ym` + "Last session: {relative}" or "No sessions yet".
  - **Daily Target** — a circular progress donut, "{n}/3 Tests Done", "Keep going! 💪" or
    "Target achieved! 🎉" with an orbiting-sparkles celebration. The target of 3 is hard-coded.
  - **Activity calendar** — month grid, today highlighted, days tinted by attempt volume with a
    flame badge, hover tooltip "{n} test(s) completed", footer "{n} Day Streak".
- **Actions:** calendar prev/next month **only**. No CTA to start a test, no link to any skill, no
  drill-down on any stat.
- **States:** loading uses `DashboardShimmer`, whose grid does not match the real layout, so the page
  shifts on load. **Empty is not a distinct state** — a new user sees the full dashboard of zeros
  with no onboarding and no first-test CTA. **Error is missing** — a failed fetch is pixel-identical
  to a genuine zero.
- **Density:** medium.

> **Redesign notes.** The Writing tile is permanently `0.0` because the store never computes a
> writing score. Speaking is a permanent dead tile taking a quarter of the hero card. The user's
> real `target_band_score` appears nowhere, while an unrelated hard-coded "3 tests/day" target gets
> the most prominent widget. Only the first 50 attempts are fetched, so heavy users see completed
> tests as un-attempted and their streak understated.

### 4.2 ProfilePage — `/profile`

- **Purpose:** Account settings — profile summary, premium status, password, support, feedback.
- **Who sees it:** authenticated users from **both worlds** (see §1.1).
- **Content**
  - **Personal Information** — 96px avatar (amber ring if premium) with a pencil FAB; display name
    with a lightning chip if premium; email; a **Premium panel** when applicable showing "Expires on
    {date}", "{n} Days Remaining" and a progress bar; then a 2-column grid: Full Name, telegram
    username, Email Address, Phone Number, **Target Band Score** with the help text
    "Set your target IELTS band score (0-9)".
  - **Security** — a Password row + Change button.
  - **Contact support** — Telegram handle (new tab), support email and phone (both **copy to
    clipboard** on click, despite rendering an external-link icon), and a **Send Feedback**
    textarea + Submit.
- **Actions:** the avatar pencil opens `ProfileModal` — **the only way to edit anything**.
  **Logout is not on this page** — only in the sidebar footer and navbar dropdown.
- **Field editability**

  | Field | On page | In modal | Validation |
  |---|---|---|---|
  | Full Name | read-only | editable | trimmed |
  | Telegram username | read-only | editable | none |
  | Email | read-only | **absent** | immutable |
  | Phone | read-only | editable | auto-prefixes `+998`, must be 13 chars |
  | **Target Band Score** | **read-only** | editable | 0–9, step 0.5; empty defaults to 7.5 |

- **States:** **loading is missing** (empty inputs with placeholders); page-level error is missing.
- **Density:** medium.

> **Redesign notes.** The target-band input is the one field styled to look *enabled* (white
> background where every other read-only field is grey) while being read-only with its save handler
> commented out — and the help text still tells the user to set it. This is not cosmetic: Analytics
> reads `target_band_score` as the goal line on its headline card. Separately, the premium countdown
> displays total plan length rather than days remaining. Avatar cache-busting is applied in the
> navbar but not here, so this page shows a stale avatar for up to a year after replacement.

### 4.3 AnalyticsPage — `/analytics`

- **Purpose:** Reading and Listening performance.
- **Content**
  - **Test-limit selector** — "Show last: 5 days / 10 days / All days".
  - **4 KPI cards** — Est. Overall Band (with a target progress bar and "On Track" /
    "Needs Improvement"), Reading Avg (delta chip vs the last 2 tests), Listening Avg (sub-7.0
    warning), Total Practice (`Xh Ym` + tests completed).
  - **Score Progression** — grouped vertical bar chart. X = day (`DD.MM`), Y = band 0–9 (ticks
    0/2/4/6/8/9), series Reading (blue) and Listening (red), metric = **best score that day**.
    Horizontally scrollable in "All" mode.
  - **Key Insights** — a Both/Reading/Listening filter, then exactly **two** cards (best and worst
    question type) with a category chip, "Top Strength" or "Needs Focus", accuracy percentage, and a
    coaching tip drawn from a fixed 28-string dictionary.
  - **Reading Breakdown** and **Listening Breakdown** — each a 500px radar chart (angle = question
    type, radius = accuracy %) plus a sorted list of every question type with `{accuracy}%` and
    `{correct}/{total}`, colour-coded green/yellow/red.
  - **AnalyticsWarningModal** — opens once ever when the user has fewer than 5 tests.
- **Actions:** day filter, insights tabs, chart tooltips, chart scroll. **No drill-down anywhere** —
  nothing links back to an attempt or result.
- **States:** loading borrows `DashboardShimmer`, which looks nothing like this page.
  - **Empty is additive rather than exclusive** — a zero-state user simultaneously sees four
    `0.0`/`N/A` KPI cards captioned **"On Track"** (the "needs improvement" branch requires a real
    score), a "No data available" chart, "No insights available yet", two empty 500px radar voids,
    *and then* a "No Analytics Data Yet" block underneath, *and* the warning modal on top.
  - **Error is missing** — a failed fetch renders as "No Analytics Data Yet".
  - **Writing and Speaking are absent entirely.** Writing attempts are fetched and inflate the
    "Total Practice" and "Tests" counters while contributing to no score or breakdown.
- **Density:** **dense** — the tallest page in the app.

> **Redesign notes.** The day filter is labelled in *days* but slices the last N **attempts**.
> "Est. Overall Band" uses only the *latest* reading and listening while the two cards beside it show
> *averages* — three headline numbers in one row with inconsistent semantics. The store fetches only
> the last 90 days / 100 attempts, so "All days" is not all.

---

<a name="5-reading-and-listening"></a>
## 5. Reading and Listening

These two flows are ~95% the same code. Both libraries are thin wrappers over the shared
`TestsLibraryPage`; both practice pages are near-duplicates that have drifted apart; both result
pages diff to about 40 cosmetic lines. **Treat each pair as one design parameterised by skill.**

### 5.1 ReadingPage — `/reading` · ListeningPage — `/listening`

- **Purpose:** Browse tests with filters, search and per-test completion state.
- **Who sees it:** authenticated, regular mode only (these are *not* registered under the mock
  layout). Premium gating is **per card**, not per page.
- **Content**
  - Title + description. Voice is inconsistent between the two: "Master Your Reading Skills" vs
    "Listening Library".
  - Tab pills: All Tests | Free | Premium.
  - Filter popover with an active-count badge: **Parts** checkboxes (Part 1…N + "Full reading"),
    **Question Types** from the 7-group taxonomy (multiple choice, matching, summary,
    true/false/not given, yes/no/not given, map, table completion), and a Newest/Oldest sort.
  - Search input; grid/list toggle persisted to `localStorage`.
  - **Per card:** title, Premium/Free badge with crown, part label, difficulty as a 3-bar glyph,
    duration in minutes, question count, "Created on {date}" or "Completed on {date}", and when
    completed a band score circle, `{correct}/{total} Correct`, and a green border.
- **Actions:** tab filter; search; filter apply/cancel/clear; sort; grid⇄list; infinite scroll
  (12 per page). Card: **Start Practice** → the practice route (clearing localStorage first); when
  completed, **Review** → `?mode=review` and **Retake**.
- **States:** loading → 9 card skeletons; empty (no data) and empty (filtered) with filter-aware
  copy naming the selected types and parts. **Error is missing entirely** — a failed fetch renders
  the generic empty state.
- **Density:** medium.

### 5.2 ReadingPracticePage · ListeningPracticePage

Full-screen split-pane exam runners, each serving three modes: taking, mock-test section, and
review. Registered under **both** layouts; the real behavioural switch is `?mockTest=true`.

- **Content — shared chrome**
  - **Header:** Back (hidden in mock mode), an "IELTS | Reading" wordmark, a **"Show Correct
    Answers"** switch (review only), a centred `MM:SS` timer that turns red under 60 s,
    Start/Pause/Resume (hidden in mock mode), the caption "This test will automatically end when the
    allotted time expires.", a network-status wifi icon with a speed tooltip, a fullscreen toggle,
    a settings hamburger (theme + font size), and a notes toggle with a blue dot when notes exist.
  - **Footer:** part tabs showing `answered/total` for inactive parts; for the active part a
    **progress-dot strip** above a **question-number palette** (blue ring on the active question, a
    red bookmark pip above bookmarked ones, tooltip showing the stored answer); a bottom bar with
    the "IELTSCORE.UZ" label, a live wall clock, a battery indicator, wifi, and Submit (or **Redo
    Test** in review). Floating prev/next arrows sit above the footer and cross part boundaries.
- **Reading-specific:** a part banner ("Part {n}: Read the text and answer questions {a}-{b}."); a
  left pane with the part title, an optional image and the passage split into paragraphs, all
  selectable for highlight/note; a draggable resizer clamped 20–80%; a right pane of question groups.
- **Listening-specific:**
  - **No part banner**, and while taking, the question column is constrained to half width with the
    **left pane completely empty** — roughly half the viewport is blank.
  - The audio player is mounted but **`hidden`**, so during the test there is **no visible playback
    UI, no progress indicator, and no way to tell how far through the recording you are**. The only
    audio control is a volume popup in the footer.
  - Single-play is enforced and persisted per test, so a refresh cannot buy a second listen.
  - In **review** the left pane becomes the **transcript** and the audio player becomes visible with
    play/pause, a seekable bar, mute, volume and a **speed selector (1x / 1.2x / 1.5x)**.
  - When the audio ends outside mock mode the test **auto-submits**; in mock mode it waits for the timer.
- **States**
  - *Loading* — Reading shows the literal string `"LoadingTest..."` (an unformatted internal
    variable name leaking to users).
  - *Error* — Reading renders its error card **in the left pane only**, so the right pane still
    shows questions. Listening's error heading is **untranslated Uzbek**: "⚠️ Xatolik yuz berdi".
  - *Waiting* — five distinct developer-facing fallback panes exist, some printing debug ids.
  - *Submitting* — the body is replaced by "Loading test..." copy, which is wrong for a submit.
  - *Review* — seeded synchronously from the URL to avoid a flash of the taking UI; timer and
    Start/Pause hidden, Submit replaced by Redo Test, all inputs read-only, correct answers fetched.
  - **Missing:** an empty state distinct from loading; any offline or save-failure indicator (the
    network icon is decorative); an inline "your answers could not be loaded" state; an unanswered-
    question warning before submit; any autosave confirmation.
- **Density:** dense (Listening: dense content in half the canvas).

### 5.3 Question types — the atoms to restyle

Dispatched by lowercased substring match, **in this order** (order matters: `multiple_answers`
before `multiple`, `matching_information` before `matching`, `table_completion` before `table`):

| Renderer | Renders |
|---|---|
| `UniversalQuestionView` | Arbitrary sanitized HTML with inline numbered blanks |
| `CompletionGapFill` | Sentence/summary completion; inline blanks |
| `DragAndDrop` | **react-dnd** word bank + in-text drop zones; click a filled zone to clear |
| `TrueFalseNotGiven` | Statement + TRUE/FALSE/NOT GIVEN radio row |
| `YesNoNotGiven` | Statement + YES/NO/NOT GIVEN radio row |
| `MultipleAnswers` | Checkbox multi-select capped at N; at the cap a new pick **silently evicts the oldest** |
| `MultipleChoice` | Single-select radio list (plus an alternate table layout) |
| `MatchingInformation` | A dropdown per statement, matching to paragraph letters |
| `MatchingHeadings` | Heading bank + per-paragraph selection |
| `TypeMap` | Map image + a row×column letter-selection grid |
| `TableCompletion` | Table with gap inputs in cells |
| `Table` | Table whose cells are group-level option selectors |
| `FillInTheBlank` | **Fallback** — any unrecognised type silently becomes a plain text box, with no "unsupported type" state |

**Drag-and-drop is desktop-only.** Only the HTML5 backend is mounted, with no touch backend and no
tap fallback, so on a phone or tablet these questions cannot be answered and auto-score 0. The word
bank is also shuffled with `Math.random()` on every memo evaluation, and greys out any word used
anywhere in the test with no way to recover it.

### 5.4 Review mode, bookmarks and reporting

- **Correct/incorrect indicators** — green/red backgrounds and borders, a check or X glyph, the
  unselected correct option tinted green when "Show Correct Answers" is on, and a `Correct: {answer}`
  chip beside wrong answers.
- **Explanations do not exist** anywhere in the codebase.
- **`QuestionActionIcons`** is the single source of truth for the two per-question controls, imported
  by all 13 question components:
  - **Bookmark** — shown in every mode; red when set. It is `opacity-0 group-hover:opacity-100`
    unless already bookmarked, so **it is untappable on touch**.
  - **Report flag** — rendered **only in review mode**; always visible. Opens `ReportQuestionModal`,
    which auto-fills "Question {n} · {testTitle} · Part {n}", shows a 300-character read-only preview
    of the question, and takes a 1000-character description. Submits to the `feedbacks` table.
- The result pages have a **separate** report implementation as a dedicated table column — and
  unlike the practice-page version, it correctly attaches the attempt id.

> **Redesign notes on review.** Two things undermine the whole screen. First, the footer navigation
> dots colour green purely on "answered", and in review every question is answered, so **every dot is
> green regardless of correctness** — there is no at-a-glance right/wrong map, which is the single
> most useful thing a review screen can offer. Second, answer fields render `[5] myanswer`, and
> `[undefined] ` for blanks, instead of the clean answer. Also note bookmarks are a half-feature:
> no list, no count, no filter, no jump, the footer marker renders only for the active part, and
> every bookmark is wiped at submit so **none survive into review**.

### 5.5 ReadingResultPage · ListeningResultPage — `/{skill}-result/:id`

`:id` is the **attempt** id, not the test id.

- **Content:** a back link; "Exam Results" + test title + completion date; three stat cards —
  **Overall Band Score** `{score} / 9.0` with a proportional bar, **Correct Answers**
  `{correct}/{total}` + percentage, **Time Taken** + average per question; a `ResultBanner` with one
  of six tiers keyed off the band (the lowest titled "Poor Performance"); a **Detailed Answer
  Review** table with `#`, Status, Your Answer, Correct Answer and Report columns, covering **every**
  question including unanswered ones; correct/total counters; a "© 2026 IELTSCORE" footer.
- **Actions:** PDF export; the Show-Correct-Answers switch (which also hides the table column);
  per-row report; Go Home; **Review Test** → the practice page in review mode; **Retake Exam**.
- **States:** loading; "No results found" — which doubles as the **de facto error state**, so a
  network failure, a 404 and a forbidden attempt all look identical.
  - **Missing: there is no per-section or per-part breakdown.** The table is a flat list with no
    Part 1/2/3 grouping and no per-part accuracy. This is the largest content gap in the flow.
  - Also missing: any question-type breakdown, any explanation, any comparison to previous attempts.
- **Density:** medium.

> **Redesign notes.** There is **no ownership check** — the page fetches by attempt id without
> comparing it to the session user. Every PDF export prints `Completed: NaN.NaN`. The two files have
> drifted: Reading's back link goes to `/reading` while Listening's goes to `/dashboard`, unanswered
> rows render `-` vs `N/A`, and only Reading has a PDF spinner.

---

<a name="6-writing"></a>
## 6. Writing

> **There is no writing grading of any kind** — see §0.5. Do not design a criterion breakdown.

### 6.1 WritingPage — `/writing`

A thin shell over the shared `TestsLibraryPage` (see §5.1). Differences: title "Writing Library"; a
**Writing History** link; a **Practice Now →** button to `/own-writing`; the filter offers Task 1 /
Task 2 / Both plus nine task types (tables, line graph, bar chart, pie chart, map, process diagram,
formal letter, semi-formal, informal). **The card CTA reads "View Sample", not "Start Practice".**

> **Redesign notes.** Review and Retake on writing cards are **dead buttons** — the card's handlers
> have no writing branch, so clicking does nothing. The primary CTA markets the model answer rather
> than practice. Cards display a question count that is always 1 for writing.

### 6.2 WritingPracticePage — `/writing-practice/:id`

One screen serving **four** jobs, forked by query params: sample preview (the default), timed
practice (`?mode=practice`), mock-test writing section, and review (`?mode=review&attemptId=`).

- **Content:** a header with "IELTS | Writing" and either a **"Try Your Self"** button (preview) or
  a countdown with Start/Pause/Resume; network status; fullscreen; appearance settings; notes.
  Left pane: task title, prompt HTML, the **Task 1 image** (a plain `<img>` — no zoom, pan or
  fullscreen), and an optional static Feedback block. Right pane: the answer textarea, the read-only
  saved answer in review, or the model `sample` in preview. A word bar shows "WORD COUNT: n" and
  "MINIMUM: 150 WORDS" (Task 1) / "250 WORDS" (Task 2). Footer: task tabs, brand, wall clock,
  battery and wifi icons, Finish or Retake.
- **Actions:** Try Your Self; type (auto-starts the timer); pause/resume; switch task; drag the
  resizer; select text to highlight or note; notes sidebar; theme and font size; fullscreen; Finish →
  confirm → submit; a success modal offering Download PDF / Go to Writing / Go to History.
- **Editor:** a plain `<textarea>` with spellcheck off. No formatting. Drafts persist to
  `localStorage` on every keystroke, on state change **and** on a 5-second interval — three
  overlapping writers. **Paste is unrestricted in normal practice**; in **mock mode only**,
  copy/cut/paste, the context menu, devtools shortcuts and refresh are blocked and fullscreen forced.
- **States:** loading, error, several degenerate-data states, preview, in-progress, submitting (a
  full-screen overlay reading "Saving Your Writing… Do not close or refresh this page!… You'll see
  your results in just a moment!"), auto-submit on timeout, submitted, review.
  - **Missing:** any "awaiting grading" state, any per-attempt score, any criterion breakdown, any
    annotation of the user's own text, any "you have an unsaved draft — resume?" prompt.
- **Density:** very dense — split panes, header, footer, status strip, four modal layers.

> **Redesign notes.** The default landing state shows the **model answer**, and the word counter
> counts *the sample*, so "WORD COUNT: 312" reads as the user's own. The finish confirmation tells
> the user "Your data will **not** be saved" — which is false. Every loading/error/empty branch is
> duplicated in *both* panes, so the same error card appears twice side by side. The 150/250 minimum
> shows in permanent red regardless of the count and is never enforced. Starting practice on one test
> **silently destroys the in-progress drafts of every other writing test.** The submit overlay
> promises results the product never delivers.

### 6.3 WritingHistoryPage — `/writing/writing-history`

- **Content:** header + "Back to Writing Library"; tabs; a filter popover; search; grid/list toggle.
  Each row: title, Premium/Free badge, "Completed on {date}", difficulty bars, time taken, **a score
  circle rendering the literal string `--`**, and Review / Retake.
- **States:** loading is plain text, not a skeleton; three distinct empty messages. **A failed fetch
  falls back to the generic empty state.** **No pagination or lazy-load** — every attempt renders at
  once.
- **Density:** medium.

> **Redesign notes.** Default sort is **oldest first**, so the page opens on the user's very first
> attempt. Every card shows a score circle promising a number the system never produces.

### 6.4 OwnWritingPage — `/own-writing`

- **Purpose:** A scratchpad where the user supplies **their own prompt** and answer, times
  themselves, and exports a PDF. Nothing is sent to the server.
- **Content:** a header with a count-**up** stopwatch, Start/Pause, fullscreen, settings and a
  "save as PDF" button. Left pane: an auto-growing prompt textarea with a Task 1 image preview.
  Right pane: the answer textarea and a "Words: n / Minimum: 150" strip that turns green when met.
  Bottom: Task 1 / Task 2 tabs and Save.
- **Actions:** stopwatch; task switch; drag-drop or paste an image (**Task 1 only**); resize panes;
  export PDF at any time; Save → confirm modal.
- **States:** in-progress, and a "submitted" lock that disables the editor.
  - **Broken:** the success modal is imported and its open-state is set, but **it is never rendered**,
    so confirming Save locks the editor with no confirmation and no way back except a reload.
  - **No persistence at all.** A refresh destroys the prompt, the answer, the image and the elapsed
    time. This is the one page where the user authors *both* prompt and essay, and the only one with
    no autosave.
- **Density:** medium.

> **Redesign notes.** The concept is sound — bring a prompt from a Cambridge book, time yourself,
> export a PDF for a tutor — but it is a disconnected island: it writes nothing, remembers nothing,
> never appears in history, and its completion path dead-ends. It also reuses the practice flow's
> finish modal, whose copy discusses database saving that is irrelevant here.

### 6.5 Cross-cutting writing facts

- **Task 1 vs Task 2** is a data convention, not a code branch. Prompts render identically; only the
  presence of an image distinguishes them. There is no chart zoom for Task 1.
- **Three different word-count algorithms** exist across the practice page, the own-writing page and
  the PDF exporter — the last returns 1 for an empty string.
- Minimums (150/250) are **displayed but never enforced**; the only submit gate is "at least one word".

---

<a name="7-speaking"></a>
## 7. Speaking

> **Only three of the seven speaking surfaces are actually reachable** — Shadowing, Podcasts and
> Tips, all of which are *content consumption*, not speaking practice. The AI-graded speaking funnel
> is severed: its entry point (`SpeakingLibraryPage`) has its route commented out, orphaning
> EquipmentCheck, SpeakingPracticePage and SpeakingResultPage behind direct URLs. Five live
> `navigate("/speaking-library")` calls currently bounce the user to `/dashboard`.
>
> **This is the section's first design decision: restore the funnel, or delete it.**

### 7.1 SpeakingPage — `/speaking`

- **Content:** H1 "Speaking"; "Choose a practice mode to get started."; four static cards, each an
  icon + title + one line:
  1. **Speaking** — "Practice real conversations with AI voice assistant." — **disabled, "Coming
     soon" pill**, and its target route is dead anyway.
  2. **Shadowing** — "Listen and repeat with video practice." → `/shadowing-library`
  3. **Podcasts** — "Listen to podcasts and practice." → `/speaking/podcasts`
  4. **Tips** — "Learn effective speaking strategies." → `/speaking/tips`
- **Content missing:** no counts, no progress, no last attempt, no band, no recommended next action.
- **States:** static only — no loading, empty or error state exists.
- **Density:** light.

### 7.2 SpeakingPracticePage — `/speaking-practice/:id/session` *(orphaned)*

Two entirely separate screens behind one state flag, defaulting to **sample**.

- **Sample mode (the default):** a full stepper strip (one dot per part, one per question, all
  clickable); left pane shows the part label and question; right pane shows **"Sample Answer"** with
  the model answer; a "Next Question" button that **wraps silently** with no end-of-list state.
- **Practice mode:** the same stepper, now non-interactive; the question on the left; a fixed right
  rail with a mic glyph, the status heading **"Listen"** or **"Recording"**, helper copy, a large
  `MM:SS` countdown, a canvas waveform, "Submit Recording", and a red "Finish Exam".
- **Actions:** "Try Your Self" enters practice mode; Submit advances; timer expiry auto-advances;
  Finish navigates to the result page carrying recordings in router state.
- **States:** loading, error and empty are plain centred text. Recording and Listen states exist.
  - **Missing:** in-session playback, re-record, any submitted state, any graded state — and
    critically **no mic-permission-denied state**: a denial is logged to console only, leaving the
    user on a frozen screen with a stopped clock and no message.
- **Density:** dense — and styled entirely with inline styles and a hard-coded blue, so it shares no
  visual language with the rest of the app.

### 7.3 IELTS fidelity gaps in the speaking test

These matter more than styling:

- **No cue card.** Part 2 renders as a single heading identical to Part 1 — no card, no bullet list,
  no "You should say:". The database *does* carry an `instruction` field (the natural cue-card body)
  and the code **discards it**.
- **No preparation timer.** IELTS Part 2 gives one minute to prepare; there is no prep phase and no
  note-taking area anywhere in the codebase.
- **No structural difference between Parts 1, 2 and 3** — only the timer length changes, and that
  length is looked up by **exact match on the database part title**. A row titled "Part 2 – Long
  Turn" or "Cue Card" misses the lookup and silently gives the candidate 30 seconds for a two-minute
  long turn.
- The countdown hard-advances at zero with no warning state.

### 7.4 Recording and EquipmentCheck

- **Nothing is ever uploaded.** There is no storage call anywhere in the speaking flow. Blobs live
  in a ref and are passed in memory to the result page, so **a refresh or a closed tab destroys
  everything**. There is consequently no upload progress, no failure handling and no retry.
- The waveform is hand-rolled (the installed `react-audio-visualize` is not used here). On the
  practice page it draws roughly three times past the canvas edge, clipping most of the spectrum.
- **EquipmentCheck** (`/equipment-check/:id`) is the better-built page: microphone and speaker
  dropdowns, a DPR-aware visualizer, test-record-then-play-back, a readiness checkbox, and genuinely
  distinct error copy for permission-denied vs generic failure. **It can be skipped trivially** —
  the gate is client-side only and the session route has no guard.
  - Gaps: device labels are empty until permission is granted, so the user picks blind; there is no
    level meter verdict, so a dead mic looks identical to a quiet one; and there is no speaker test
    tone.

### 7.5 SpeakingResultPage — `/speaking-result/:id` *(orphaned)*

- **Content:** "Your Recordings"; per part, a label and question count; per question, a "QUESTION n"
  eyebrow, the question text and a native audio player.
- **States:** the empty state — "No recordings found." — **is what a user gets on any refresh**,
  since recordings live only in router state.
- **Missing:** any band, any criteria, any transcript, any submitted or graded state.
- **Density:** medium.

### 7.6 ShadowingLibrary · SpeakingPodcast — `/shadowing-library` · `/speaking/podcasts`

Two ~95% duplicated pages. Both: a back link, H1 + description, a search box, and a responsive card
grid. **Per card:** a 16:9 thumbnail (or a grey "No thumbnail" block), a hover play-circle, an amber
"Premium" crown badge, a "{duration} min" capsule, a date, a 2-line-clamped title, and a CTA
("Start Shadowing" / "Start Practice") or an amber "Upgrade to Pro".

- **Not shown:** level, accent, topic tag, watched/unwatched, progress, view count.
- **States:** loading is plain text; error shows the **raw Supabase message**; two empty states, one
  of which **ships developer instructions to end users** — *"No shadowing content yet. Add `test`
  rows with type "shadowing", `image_url`, `duration`, and `part.video_url`."*
- **Density:** medium.
- No filters and no sort control, despite being libraries.

### 7.7 SpeakingShadowing · PodcastPlayer — the players

Near-identical twins. Each is a black full-viewport overlay containing an Exit button and a YouTube
iframe. **No title, no duration, no description, no transcript, no subtitles.** All transport control
is YouTube's own chrome.

- **Premium gate:** non-subscribers on premium content are **silently redirected back** to the
  library with no explanation and no upgrade prompt — inconsistent with the card layer, which does
  show an `UpgradeModal`.
- **States:** while the premium check resolves the page renders `null` — a blank white screen with no
  spinner. There is no error state for a dead or region-blocked video.
- Shadowing is meant to be *listen-and-repeat*, but there is **no record button, no A/B loop, no
  speed control and no transcript to shadow from**. It is a plain video page.

### 7.8 SpeakingTipsPage — `/speaking/tips[/:tipId]`

- **Content:** a list view with All / Parts / Strategy tabs, search, and a list/grid toggle, over
  **exactly four hard-coded tips**; and a detail view with the tip body, a numbered "Steps" card and
  a "Model Answer" card showing a labelled question and answer.
- **States:** no loading and no error (the data is a module constant); an empty-filter state and a
  "Tip not found." state exist.
- **Density:** light as a list — the chrome (search + tabs + view toggle) outweighs four items, and
  the "Strategy" tab yields a single card.
- Content is hard-coded in a component, so it cannot be edited without a deploy — unlike every other
  library, which is database-backed. The page is also registered under two URL namespaces
  (`/speaking/tips` and `/dashboard/speaking/tips`) with asymmetric back-links.

---

<a name="8-mock-tests"></a>
## 8. Mock tests

### 8.1 MockTestsPage — `/mock-tests`, `/mock`

- **Purpose:** Landing for the mock world. Its only real function is opening the password modal.
- **Who sees it:** **every authenticated user.** There is no client gate here — visiting the URL
  sets `accessMode = 'mockTest'`, which defeats the redirect that would otherwise bounce a regular
  user. A non-client sees the identical page minus the History link.
- **Content:** H1 "Mock Tests" + "Practice with full-length mock tests. Each test can only be taken
  once."; a "Local answer archive" button (when this browser holds archived runs); a "History" link
  (only when the user is a confirmed client); and **a single full-width button, "Enter Password to
  Start Test"**. The mock test list is fetched but **never rendered** — it is used only to decide
  between the empty state and the button.
- **States:** loading, and an empty state. **Not-yet-activated, booked, in-progress and completed are
  all missing** — the page renders identically regardless of status. Completion is only discovered
  *after* the user types a password.
- **Density:** light — three interactive elements on a full-height canvas.

> **Redesign notes.** This is where §0.4 bites hardest. The page fetches a complete status map and
> renders none of it. There is no booking status, no date, no "your test is ready", and no
> explanation for a user who is not activated.

### 8.2 The booking facade — `/mock/select`, `/mock/online`, `/mock/center`

> ⚠️ **All three pages are finished UI over a backend that was never written.** They make **zero**
> database calls. They are still routed and still navigable, and they link to one another, so a user
> who reaches any one of them can walk the whole flow. Nothing else in the app links *in*.

- **MockTypeSelectionPage** — a fork between "Take Online Mock" and "Visit Mock Center". Fully
  static; no price, duration or availability shown at the decision point.
- **MockOnlinePage** — a status card, an explainer ("Your request will be reviewed by the admin
  before approval…"), and a request button whose handler only sets local state. **No network call
  exists.** The user believes a request was filed; no staff member will ever see it, and a refresh
  discards it silently.
- **MockCenterPage** — the densest page in the section: two calendars and two time-slot pickers
  (one for Reading/Writing/Listening, one for Speaking), a payment notice, a "Book Slot" button, a
  flexible-scheduling explainer, a centre info card, a pricing card, and an embedded map.
  - Centre name, address, phone and the 500,000 UZS price are **hard-coded in the component**.
  - The embedded map **points at London, UK**.
  - Slot availability is **fabricated from day-of-month modulo arithmetic**; the real queries are
    commented out as TODO.
  - "Book Slot" sets a confirmation flag that **nothing ever reads** — clicking it does nothing
    observable.
  - Errors are swallowed to empty sets, so a failure looks like an empty calendar.

### 8.3 MockTestFlow — `/mock-test/flow/:mockTestId`

The real exam orchestrator. **Gated by password, not by client status** — the flow creates a client
row for the user if none exists.

- **Sequence:** audio check → *(video)* → **Listening** → *(video)* → **Reading** → *(video)* →
  **Writing** → results. **There is no speaking section**; speaking is graded in the admin app and
  appears in results as a read-only fourth column.
- **Screens:** a mic/speaker audio check that blocks until both pass; an **unskippable** fullscreen
  instructional video before each section; then the real practice page for that section.
- **Timers:** 2400 s listening, 3600 s reading, 3600 s writing. Owned by the practice pages,
  auto-started, and **cannot be paused** — start/pause controls are hidden in mock mode.
- **Security:** blocks F11/F12, copy/paste/cut/select-all/save/print/view-source, devtools
  shortcuts and the context menu; forces fullscreen and shows an exit modal if it is left.
- **Exit:** "Continue Test" / "I Want to Finish", where Finish submits only the current section —
  remaining sections are never written.
- **Refresh and disconnect:** survivable. The run id lives in sessionStorage, section position is
  derived from completion flags, and the audio check is skipped if already passed. **But the timer
  resumes from the last persisted value rather than wall-clock elapsed time, so refreshing donates
  time back to the candidate.**
- **States:** loading and error exist. **Missing:** any cross-section progress indicator (the
  candidate never sees "section 2 of 3"), any deliberate pause/resume, any offline banner.
- **Density:** medium per screen.

> **Redesign notes.** Section transitions are implemented as real route navigations plus **two
> independent 1-second localStorage polling loops**. A failed completion write surfaces as a
> non-dismissible toast telling the student to "contact support before leaving", with no retry.

### 8.4 MockTestResults — the post-exam screen

- **Content:** a clock icon; "Your Mock Test Has Been Submitted"; "Your answers have been
  successfully recorded. The evaluation process is currently in progress."; a card reading "Results
  will be available within 2 days"; a Telegram card promising a bot notification; and a footer note
  "No scores are displayed at this stage."
- **Actions: none. There is no button of any kind** — and the navbar is hidden on this route, so the
  user is stranded. A back handler is passed in and never used.
- **Missing:** per-section confirmation, so a student who exited early cannot tell what was captured.
- **Density:** light.

### 8.5 MockTestHistoryPage — `/mock-test/history` · `/mock-test/history-regular`

**The one place the mock-test-client check actually gates a page** — non-clients are redirected to
`/dashboard` with **no explanation**.

- **Content:** a back button and a list of cards. **There is no page heading.** Each card: a status
  icon, "Mock Test Submitted/Completed" + date, a four-column results grid (Listening / Reading /
  Writing / Speaking) showing band to one decimal and correct counts (writing shows the literal
  string "Writed 2 Tasks and Submitted"), a Total Score row, a status badge — "Waiting for Review",
  "Evaluated" or "Results Viewed" — and a "View Results" button only once graded.
- **States:** loading and an empty state with a "Browse Mock Tests" CTA. **Error is missing** — a
  failed load renders as empty. **Bookings are invisible**: the query filters to completed/checked/
  notified only, so an active booking appears nowhere in the product.
- **Known bug:** the label is inverted — a merely submitted test reads "Submitted" while a fully
  graded one reads "Completed", and the icon colours read backwards.
- **Density:** medium.

### 8.6 MockTestClientResultsPage — `/mock-test/results/:clientId`

The real graded report, available once staff mark the booking checked.

- **Content:** an "Overall Score" trophy tile; a "Print PDF" button; and a multi-open accordion with
  **Client Information** (status badge, name, email, phone) and four section panels — Listening,
  Reading, Writing, Speaking — each showing band (1 dp), time taken, correct/total for
  listening and reading, and **examiner feedback rendered as HTML**.
- **States:** loading and error exist; empty sections show "No data available for this section".
  **Missing:** a not-yet-graded state — reaching this page before grading shows empty panels with no
  "awaiting review" explanation.
- **Density:** dense.

> **Redesign notes.** A legitimate overall score of **0 is hidden** by a truthiness check. The
> ownership query has **no user check**, so any mock-test client could read another client's name,
> email, phone and bands by changing the URL unless database policies prevent it. The page also
> violates hooks ordering and can white-screen when the client check resolves false.

### 8.7 MockTestLocalArchivePage — `/mock-tests/local-archive`

- **Purpose:** Staff review of every mock session archived in **this browser's** IndexedDB — a local
  safety net so answers can be recovered if the server write fails.
- **What is stored:** per run, the user's id/email/username, the mock test, and per section every
  question's text snapshot and the candidate's answer. Written debounced while they type and flushed
  before submit. Scoring material (correct answers, explanations, answer keys) is **stripped** on the
  way in. Runs survive completion and persist until manually cleared.
- **Content:** a list of runs, each expandable into listening/reading/writing blocks listing every
  question and "Your answer: {text}" or "No answer".
- **Actions:** "Clear local archive" — a native `window.confirm`, then wipes the **entire store for
  all candidates**. There is no per-run delete, no search and no date filter.
- **States:** loading, error and empty exist; in-progress vs completed is shown only as a raw enum
  string.
- **Density:** dense — an unbounded list of every question of every run.

> ⚠️ **Redesign note.** This page has **no access control of any kind** — no client check, no staff
> check, no role check. Its entry button appears on `/mock-tests` for anyone whose browser holds an
> archived run, **including the candidate who just sat the test on that shared machine**. It exposes
> other candidates' names, emails and full answer texts.

### 8.8 The password gate

One plain-text input, Cancel/Submit, Enter-to-submit, inline error and a "Verifying..." spinner.
**No rate limiting, no attempt counter, no masking.** Server-side enforcement was added recently: the
password is verified through database functions that never return it, and the verified value is held
in sessionStorage only so the flow survives a reload — forging it buys nothing.

---

<a name="9-shared-components"></a>
## 9. Shared components

These are the atoms worth designing once and reusing. Question-type renderers are covered in §5.3.

### 9.1 Cards

| Component | Used by | Renders |
|---|---|---|
| `CardOpen` | every library page | Unlocked test card, grid **and** list variants: title, Premium/Free badge, part label, difficulty bars, duration, question count, date, completion score, CTA |
| `CardLocked` | every library page | Premium lock: amber border, crown, CTA wrapped in `UpgradeModal` |
| `ComplatedCard` *(sic)* | writing history | Completed attempt: same anatomy plus Review/Retake. ~90% duplicated from `CardOpen` |

A `SignalBars` difficulty glyph is copy-pasted identically into all three — consolidate.

### 9.2 Practice chrome

- **`QuestionHeader`** — the exam top bar: back, wordmark, "Show Correct Answers" switch (review),
  timer + Start/Pause, network icon, fullscreen, settings, notes toggle.
- **`PracticeFooter`** — part tabs with answered counts, the progress-dot strip, the question-number
  palette, prev/next, wall clock, volume popup (listening), Submit / Redo.
- **`QuestionActionIcons`** — the shared bookmark + report pair; single source of truth, imported by
  all 13 question renderers.
- **`TextSelectionTooltip`** + **`NoteSidebar`** — highlight and note-taking on passages.
- **`AudioPlayer`** — listening only; hidden during the test, full controls in review.

### 9.3 Modals

All live in `components/modal/`. Every one below is live except where noted.

| Modal | Trigger | Purpose |
|---|---|---|
| `FeedbackModal` | **self-triggering**, once per browser, after 3 tests in a day | "Help us improve" + textarea |
| `UpgradeModal` | non-premium users, from the sidebar card, locked cards, shadowing/podcast cards | Premium pitch; CTA deep-links to **Telegram**, not a pricing page |
| `ReportQuestionModal` | the per-question flag, review mode only | Report a problem with a question |
| `AppearanceSettingsModal` | the practice-header hamburger | **The only theme switcher in the app** — contrast preset + font size |
| `ConfirmModal` | exit attempts | Generic parameterised confirm |
| `FinishModal` | reading/listening Finish | "Finish Test?" |
| `WritingFinishModal` / `WritingSuccessModal` | writing Finish / after save | Confirm, then post-save actions |
| `MockTestExitModal` | exit during a mock section | "Continue Test" / "I Want to Finish" |
| `MockTestPasswordModal` | entering a mock test | Password entry |
| `LogoutModal` | sidebar + navbar | Confirm log out |
| `ChangePasswordModal` | Profile → Security | 3 fields with reveal toggles |
| `ProfileModal` | the avatar pencil | The real profile editor |
| `AnalyticsWarningModal` | Analytics with <5 attempts | "Limited Analytics Data" |
| `RotationModal` | small screens | "Please Rotate Your Device" |
| `NetworkModal` | — | **DEAD** — zero importers |

### 9.4 Navigation chrome

**`DashboardSidebar`** — collapsible 280px ↔ 80px, persisted; forced expanded on small screens where
it becomes a `Sheet` drawer.

| Section | Items |
|---|---|
| — | Dashboard |
| **PRACTICE** | Reading, Listening, Writing, Speaking |
| **TESTS & ANALYTICS** | Analytics; **Mock Tests History** *(only when the user is a confirmed mock-test client)* |
| **ACCOUNT** | Profile Settings |
| footer | **Upgrade to Pro** card *(hidden for premium)*; **Log out** |

**`DashboardNavbar`** — shared by both dashboard layouts; a `flow` prop adds a red "Mock Test" pill
and hides Profile Settings in the mock world. Contains a mobile-only hamburger and an avatar
dropdown. **It renders no page title**, so on mobile the header is just a hamburger and an avatar
with no context.

**There is no help, support, notification or search affordance in either shell.** The only feedback
surface in the whole regular app is the textarea at the bottom of `/profile`.

### 9.5 Theming — read §0.2 first

Two parallel systems:

1. **`AppearanceContext`** (live, but scoped to the test-taking flow only) — three presets:
   `light` (black on `#f2f2f2`), `dark` (white on black), `high-contrast` (gold on black); three font
   sizes (14/16/20px). Persisted to localStorage. Applied via **inline styles**, consumed by ~13
   files, all inside the practice flow.
2. **CSS tokens + `.dark`** — written in `index.css`, complete, and **entirely inert** because
   `.dark` is never applied.

Everything outside the practice flow — dashboard, landing, analytics, cards, sidebars, navbars,
footers — is hard-coded light.

### 9.6 Loading states

`DashboardShimmer` (used by Dashboard, and borrowed by Analytics where it does not match the layout)
and `LibraryCardShimmer` (all four library pages) are the only designed skeletons — **and both are
frozen, per §0.3.**

**Pages with no loading design at all:** both result pages, every mock-test page, Profile, Writing
History, and all speaking pages.

---

<a name="10-content-density-guide"></a>
## 10. Content density guide

For applying Stage 1's density guidance per page.

| Density | Pages | Design implication |
|---|---|---|
| **Very dense** | WritingPracticePage | Split panes + header + footer + status strip + 4 modal layers. Needs the tightest type scale and the calmest surface treatment; decoration competes with the task. |
| **Dense** | Reading/ListeningPracticePage, AnalyticsPage, MockCenterPage, MockTestLocalArchivePage, MockTestClientResultsPage, all four library pages, SpeakingPracticePage | Sustained-attention or high-scan-rate screens. Analytics is the tallest page in the app; the practice runners are timed and must not add cognitive load. |
| **Medium** | ProfilePage, DashboardPage, both result pages, WritingHistoryPage, OwnWritingPage, shadowing/podcast libraries, MockTestHistoryPage, MockTestFlow screens, SpeakingResultPage, EquipmentCheck | Room for generous spacing and larger type. |
| **Light** | LandingPage, all four auth pages, SpeakingPage, SpeakingTipsPage (list), MockTestsPage, MockTypeSelectionPage, MockOnlinePage, MockTestResults | Marketing-weight. Several are currently *too* sparse — `/mock-tests` is three controls on a full-height canvas, and the Tips list wraps four items in search + tabs + a view toggle. |

Two notes. **Listening practice is dense content in half a canvas** — the left pane is empty during
the test, so it reads as broken rather than spacious; a redesign should either use that space (a
visible player, a progress indicator) or rebalance the columns. And **`/dashboard` is medium-density
but zero-interaction** — it has the visual weight of a control centre with none of the affordances.

---

<a name="11-known-ux-debt"></a>
## 11. Known UX debt

Cross-referenced from `AUDIT_REPORT.md` and `PRACTICE_REVIEW_MODE_REPORT.md`, then **re-verified
against the current tree** — items those documents raised that have since been fixed are excluded,
so everything below is genuinely outstanding. Pointer list, not a re-audit; detail sits in the page
sections above.

**Blocking, environment-level** — see §0.2 and §0.3: dark mode is unwired, `tailwind.config.js` is
ignored, and every skeleton loader is frozen.

**Missing states**
- Analytics and Dashboard: a failed fetch is indistinguishable from a genuine zero.
- Dashboard: the Writing band card is hard-wired to 0.0 forever.
- Dashboard: only the first 50 attempts are fetched, so counts and streaks understate for heavy users.
- Listening audio: no error listener — a dead URL sits at `0:00 / 0:00` during a timed test.
- App boot: a network rejection leaves the app on the loading spinner permanently.
- Both result pages: no per-section breakdown at all.

**Misleading UI**
- Profile: the target-band field looks editable, is not, and the help text still says to set it.
- Analytics: the filter says "days" and slices *attempts*.
- Review mode: **every navigation dot is green regardless of correctness.**
- Review mode: answers render as `[5] myanswer` and `[undefined] ` for blanks.
- Review mode: "Show Correct Answers" off still shows red/green on the user's own answers.
- Writing: the finish modal claims data will **not** be saved; it is.
- Landing: a fake "My Progress" card with invented band scores, shown only to logged-out visitors.
- Mock history: "Submitted" and "Completed" labels are inverted.
- App-wide: raw Postgres/RLS error strings are toasted verbatim to students.

**Broken interactions**
- Change Password: the field remounts every keystroke, so **focus is lost after every character**.
- **All drag-and-drop questions are unanswerable on touch** and auto-score 0.
- The drag-and-drop word bank greys out used words with no recovery.
- Reading/Listening split panes: inline widths no media query can override; mouse-only resizer.
- The review-mode bookmark button is hover-revealed, so untappable on touch.
- Bookmarks never survive submit, so none reach review.
- Mock exam: typing `!` then `2` ejects the candidate and loses unsaved answers.
- Mock flow: "I Want to Finish" advances to the next section instead of finishing.
- Mock client results: white-screens on a hooks-order violation.
- Listening: `?duration=` is unclamped — a non-numeric value disables auto-submit entirely.
- OwnWriting: the success modal is never rendered, so Save dead-ends.

**Accessibility**
- **The core test UI has no accessibility layer** — zero `aria-*` and zero `<label>` in the question
  renderers; the primary answer input has only a placeholder, so a screen reader announces
  "edit text, blank" forty times.
- Auth forms: no `htmlFor`/`id`, no `autoComplete`, no `name`; all errors are toasts with no
  `aria-live`.
- The landing marquee animates continuously with no pause and no `prefers-reduced-motion` guard.

**Data-loss risks**
- Practice drafts grow localStorage unbounded, then fail silently; keys are not namespaced per user,
  so on a shared browser one student can resume another's draft.
- Speaking recordings are never uploaded — a refresh destroys them.
- OwnWriting has no persistence whatsoever.
- Passage annotations corrupt text nodes, never restore, and leave undeletable ghost entries.
- Every result PDF prints `Completed: NaN.NaN`.

**Privacy**
- The mock local archive has no access control and exposes other candidates' names, emails and full
  answers on a shared machine.
- Result pages have no ownership check on the attempt id.

**Do not "fix" these while redesigning.** `analyticsStore.js` has `USE_MOCK_DATA = true` with a
comment telling you to set it to `false`, but the guard reads `if (!USE_MOCK_DATA)` — following the
comment ships `Math.random()` scores to every user. The same inverted-flag pattern exists in
`userAnswersStore.js`.

---

<a name="12-what-was-skipped-and-why"></a>
## 12. What was skipped, and why

Nothing was omitted silently.

| Item | Status | Why not specified |
|---|---|---|
| `PricingPage` | **Already deleted** | No `/pricing` route ever existed; the upgrade path is `UpgradeModal` → Telegram |
| `PremiumBanner` | **Already deleted** | Never rendered; carried a dead link and an inverted gate |
| `components/questions/Map.jsx` | **Already deleted** | Fully commented out; `map` dispatches to `TypeMap` |
| `PricingRoute.jsx` | Present, 100% commented out, zero importers | Dead file awaiting deletion |
| `NetworkModal.jsx` | Present, zero importers | Never mounted; offline state is shown inline instead |
| `MockTestSidebar.jsx` | Present, zero importers | The mock layout renders no sidebar |
| `DashboardFooter.jsx` | Present, **empty file** | Zero bytes, zero importers |
| `speakingSessionStore.js`, `LocalStorage/speakingStore.js` | Present, zero importers | Orphaned from an unshipped design |
| `ComingSoonPage.jsx` | Present, no live usage | Its only two usages are commented out |
| `MockTypeSelector.jsx` | Present, zero importers | An AI-vs-human pricing selector that is never rendered |
| `ui/scroll-area`, `separator`, `sidebar`, `skeleton`, `sonner` | Present, zero importers | Unused shadcn primitives |

### Two that need a product decision, not a design decision

**`SpeakingLibraryPage` — restore the route or remove the links.** The page file exists and **five
live `navigate("/speaking-library")` calls point at it**, but its route is commented out, so all
five dead-end at `/dashboard`. Leaving both is what produces today's silent bounce. Restoring it
also un-orphans EquipmentCheck, SpeakingPracticePage and SpeakingResultPage — which would then need
the grading backend that §0.5 says does not exist.

**The mock booking flow is a facade — decide before designing it.** `/mock/select`, `/mock/online`
and `/mock/center` are specified in §8.2 for completeness, but they make zero database calls, the
calendar is fabricated, the confirmation view is never rendered, the map points at the wrong country,
and the user is told to await an approval that can never arrive. **Do not design these as though
they work.** Either they get a backend, or they should be removed along with their routes.
