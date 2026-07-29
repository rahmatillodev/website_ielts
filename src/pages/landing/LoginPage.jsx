import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuthStore } from "@/store/authStore";
import { isMockTestRoute, getPostAuthTarget } from "@/lib/routeContext";
import AuthLayout from "./login/AuthLayout";
import LoginForm from "./login/LoginForm";
import { LOGIN_SLIDES } from "./login/loginSlides";

/**
 * Public sign-in screen.
 *
 * Owns authentication and nothing else — the split layout, showcase and back
 * control live in `AuthLayout`, the fields in `LoginForm`. The auth path
 * (`signIn`, the `redirect` param, the mock-test check, the toast copy) is
 * unchanged from the original page.
 */

const REMEMBERED_EMAIL_KEY = "edu_remembered_email";

const readRememberedEmail = () => {
  try {
    return localStorage.getItem(REMEMBERED_EMAIL_KEY) || "";
  } catch {
    return "";
  }
};

const persistRememberedEmail = (email, remember) => {
  try {
    if (remember) localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  } catch {
    /* storage blocked (private mode, quota) — remembering is a nicety, not a
       reason to fail a successful sign-in. */
  }
};

function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const signIn = useAuthStore((state) => state.signIn);

  /**
   * Submit state is local, deliberately not the store's `loading`.
   *
   * That flag is shared by every auth-store action — profile updates, avatar
   * uploads, session init — and `initializeSession` sets it without a try/catch,
   * so a single rejected `getSession()` leaves it stuck at `true` for the life of
   * the page. Every field and the button read it, so the whole form goes dead
   * with no error and no feedback. Owning the flag here means the form can only
   * be disabled by its own in-flight request.
   */
  const [submitting, setSubmitting] = useState(false);

  const [rememberedEmail] = useState(readRememberedEmail);

  const redirect = searchParams.get("redirect");
  const signupHref = redirect
    ? `/signup?redirect=${encodeURIComponent(redirect)}`
    : "/signup";

  // Hide the back button when the user was sent here from the mock test flow.
  // Derived from the redirect param only - the old session-flag fallback made
  // this sticky across unrelated later logins.
  const isMockTestMode = isMockTestRoute((redirect || "").split("?")[0]);

  const handleSubmit = async ({ email, password, remember }) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const result = await signIn(email, password);

      if (result?.success) {
        persistRememberedEmail(email, remember);
        navigate(getPostAuthTarget(redirect), { replace: true });
        toast.success("Welcome back!");
        return;
      }

      const message = result?.error?.toLowerCase().includes("invalid login credentials")
        ? "Invalid email or password"
        : result?.error || "Sign in failed";
      toast.error(message);
    } catch (error) {
      // `signIn` catches its own errors, but anything thrown outside that try —
      // or a rejected promise from a future change — must not leave the form
      // spinning with nothing on screen to explain it.
      toast.error(error?.message || "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout slides={LOGIN_SLIDES} showBackButton={!isMockTestMode}>
      <LoginForm
        onSubmit={handleSubmit}
        loading={submitting}
        initialEmail={rememberedEmail}
        initialRemember={Boolean(rememberedEmail)}
        signupHref={signupHref}
        forgotHref="/forgot-password"
      />
    </AuthLayout>
  );
}

export default LoginPage;
