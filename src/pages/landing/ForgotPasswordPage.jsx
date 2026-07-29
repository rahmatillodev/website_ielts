import { useState } from "react";
import { toast } from "react-toastify";
import { useAuthStore } from "@/store/authStore";
import { AUTH_ERROR_TOAST_MS, getAuthErrorMessage } from "@/lib/authErrors";
import AuthLayout from "./login/AuthLayout";
import ForgotPasswordForm from "./login/ForgotPasswordForm";
import ForgotPasswordSuccess from "./login/ForgotPasswordSuccess";
import { LOGIN_SLIDES } from "./login/loginSlides";

/**
 * Request a password reset link.
 *
 * Runs the sign-in deck rather than a deck of its own: recovery is a detour
 * inside the returning-user journey — it is reached from the sign-in form and
 * ends back at it — so the showcase should read as the same conversation, not a
 * separate one.
 *
 * Sending the link is unchanged; only the surface around it is new.
 */
function ForgotPasswordPage() {
  const resetPasswordForEmail = useAuthStore((state) => state.resetPasswordForEmail);

  /**
   * Submit state is local, deliberately not the store's `loading`.
   *
   * That flag is shared by every auth-store action, and `initializeSession` sets
   * it without a try/catch, so a single rejected `getSession()` leaves it stuck
   * at `true` for the life of the page — a dead form with nothing on screen to
   * explain why.
   */
  const [submitting, setSubmitting] = useState(false);

  /**
   * The last address submitted, kept separately from `sent` so returning from
   * the notice re-mounts the form with it still filled in.
   */
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async ({ email: submittedEmail }) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const result = await resetPasswordForEmail(submittedEmail);

      if (result?.success) {
        setEmail(submittedEmail);
        setSent(true);
        return;
      }

      toast.error(result?.error || "Failed to send reset link", {
        autoClose: AUTH_ERROR_TOAST_MS,
      });
    } catch (error) {
      // The store catches its own errors, but a rejection thrown outside that
      // try must not leave the button spinning with no explanation.
      toast.error(getAuthErrorMessage(error, "Failed to send reset link"), {
        autoClose: AUTH_ERROR_TOAST_MS,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout slides={LOGIN_SLIDES}>
      {sent ? (
        <ForgotPasswordSuccess email={email} onResend={() => setSent(false)} />
      ) : (
        <ForgotPasswordForm
          onSubmit={handleSubmit}
          loading={submitting}
          initialEmail={email}
        />
      )}
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
