/**
 * Route context helpers.
 *
 * These replace the `accessMode` sessionStorage flag, which used to be written
 * in 26 places across App.jsx, both layouts, Login, SignUp and ProtectedRoute,
 * then read back in 16 others to decide redirects. Because several of those
 * writers ran as effects on the same render, correctness depended on effect
 * declaration order, and a stale flag could bounce a user between the two
 * dashboards or strand them away from a page they were entitled to.
 *
 * Nothing here is stored. Whether the user is in the mock-test flow is already
 * expressed by the URL: mock routes have their own paths, and the mock flow
 * hands practice pages an explicit `?mockTest=true` (see MockTestReading.jsx).
 * Deriving it means the answer cannot go stale or disagree with the address bar.
 */

/** Mock-test-only routes. */
export function isMockTestRoute(pathname) {
  if (!pathname) return false;
  return (
    pathname.startsWith("/mock-test") ||
    pathname.startsWith("/mock-tests") ||
    pathname.startsWith("/mock/") ||
    pathname === "/mock"
  );
}

/**
 * Practice pages are registered under both the mock and the regular layout at
 * the same paths, so the path alone cannot say which flow the user is in.
 */
export function isPracticePageRoute(pathname) {
  if (!pathname) return false;
  return [
    "/reading-practice",
    "/listening-practice",
    "/writing-practice",
    "/speaking-practice",
    "/equipment-check",
    "/reading-result",
    "/listening-result",
    "/speaking-result",
  ].some((segment) => pathname.includes(segment));
}

/**
 * True when the current location is part of a mock test run. For practice pages
 * this reads the `mockTest=true` query param that the mock flow always sets.
 */
export function isInMockTestFlow(pathname, search) {
  if (isMockTestRoute(pathname)) return true;
  if (!isPracticePageRoute(pathname)) return false;
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search ?? new URLSearchParams();
  return params.get("mockTest") === "true";
}

/**
 * Only allow same-origin relative paths through a `?redirect=` param, so a
 * crafted login link cannot bounce someone to another site after they sign in.
 */
export function isSafeRedirect(target) {
  return (
    typeof target === "string" &&
    target.startsWith("/") &&
    !target.startsWith("//") &&
    !target.startsWith("/\\")
  );
}

/**
 * Where to send someone once they are authenticated. The `?redirect=` param is
 * the single source of truth - previously this consulted the stored accessMode,
 * so a user who had once visited a mock page could be sent to /mock-tests on a
 * later, unrelated login.
 */
export function getPostAuthTarget(redirectParam, fallback = "/dashboard") {
  if (!isSafeRedirect(redirectParam)) return fallback;
  const pathname = redirectParam.split("?")[0];
  // There is no /mock-test route, only /mock-tests.
  if (pathname === "/mock-test") return "/mock-tests";
  return redirectParam;
}
