import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuthStore } from "@/store/authStore";
import { isMockTestRoute, getPostAuthTarget } from "@/lib/routeContext";
import AuthLayout from "./login/AuthLayout";
import SignUpForm from "./login/SignUpForm";
import SignUpSuccess from "./login/SignUpSuccess";
import { SIGNUP_SLIDES } from "./login/signupSlides";

/**
 * Public sign-up screen.
 *
 * Owns account creation and nothing else — the split layout, showcase and back
 * control come from `AuthLayout`, the fields and their validation from
 * `SignUpForm`. It runs its own showcase deck (`SIGNUP_SLIDES`), written for
 * someone starting out rather than returning.
 *
 * The one branch that matters is what happens after `signUp` succeeds:
 *
 *   session issued   -> confirmation is off; go where the user was headed
 *   no session       -> confirmation is on; show "check your email" instead of
 *                       parking them on a dashboard they cannot load
 *
 * The store reports which case it is via `needsEmailConfirmation`.
 */
function SignUpPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const signUp = useAuthStore((state) => state.signUp);

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
  const [pendingEmail, setPendingEmail] = useState(null);

  const redirect = searchParams.get("redirect");
  const loginHref = redirect
    ? `/login?redirect=${encodeURIComponent(redirect)}`
    : "/login";

  // Hide the back button when the user was sent here from the mock test flow.
  const isMockTestMode = isMockTestRoute((redirect || "").split("?")[0]);

  const handleSubmit = async ({ fullName, email, password }) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const result = await signUp(email, password, fullName);

      if (result?.success) {
        if (result.needsEmailConfirmation) {
          setPendingEmail(email);
          return;
        }

        navigate(getPostAuthTarget(redirect), { replace: true });
        toast.success("Account created successfully!");
        return;
      }

      toast.error(result?.error || "Failed to create account");
    } catch (error) {
      // `signUp` catches its own errors, but anything thrown outside that try —
      // or a rejected promise from a future change — must not leave the form
      // spinning with nothing on screen to explain it.
      toast.error(error?.message || "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout slides={SIGNUP_SLIDES} showBackButton={!isMockTestMode}>
      {pendingEmail ? (
        <SignUpSuccess email={pendingEmail} loginHref={loginHref} />
      ) : (
        <SignUpForm onSubmit={handleSubmit} loading={submitting} loginHref={loginHref} />
      )}
    </AuthLayout>
  );
}

export default SignUpPage;
