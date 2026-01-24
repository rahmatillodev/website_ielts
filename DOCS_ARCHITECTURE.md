# Architecture Documentation

## Data Fetching Strategy

**DashboardStore** (`src/store/dashboardStore.js`): Handles all dashboard-related data (stats, attempts, activity heatmap). Uses single optimized query with join: `.select('*, test:test_id(id, title, type, difficulty)')` to fetch attempts and test metadata together. Builds `completions` cache (test_id -> status) from attempts data.

**TestStore** (`src/store/testStore.js`): Manages test data. `fetchTests()` uses specific columns. `fetchTestById()` attempts nested selects first, falls back to parallel queries with `Promise.all` if relations aren't configured. All queries use specific columns instead of `select('*')`.

**AuthStore** (`src/store/authStore.js`): Handles authentication, user profile, and session management only. Dashboard logic removed.

## Completion Status Caching

Test completion status is cached in `dashboardStore.completions` object, populated from user attempts in a single batch query. `CardOpen` components read from this cache (no individual API calls). Cache invalidates after 5 minutes or on manual refresh.

## Single-Query Rule

Nested test data (`fetchTestById`) uses one query with nested selects when possible. If Supabase relations aren't configured, falls back to parallel queries with `Promise.all` (still faster than sequential). All selects use specific columns to minimize payload size.

