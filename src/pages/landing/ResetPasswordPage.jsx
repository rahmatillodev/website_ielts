import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { LinkIcon } from "lucide-react";
import supabase from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { AUTH_ERROR_TOAST_MS, getAuthErrorMessage } from "@/lib/authErrors";
import AuthLayout from "./login/AuthLayout";
import AuthNotice from "./login/AuthNotice";
import AuthPending from "./login/AuthPending";
import ResetPasswordForm from "./login/ResetPasswordForm";
import { LOGIN_SLIDES } from "./login/loginSlides";

/**
 * Choose a new password, after following a recovery link.
 *
 * Three states, all in the same shell so the page never changes shape under the
 * user: checking the link, the form, or the expired-link notice. Runs the
 * sign-in deck for the same reason `ForgotPasswordPage` does — this is the tail
 * of the returning-user journey, and it ends at /login.
 *
 * The session check and the update call are unchanged; only the surface is new.
 */
function ResetPasswordPage() {
  const navigate = useNavigate();
  const [hasRecoverySession, setHasRecoverySession] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasRecoverySession(!!session);
    });
  }, []);

  const handleSubmit = async ({ password }) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You can now sign in.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(getAuthErrorMessage(error, "Failed to update password"), {
        autoClose: AUTH_ERROR_TOAST_MS,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout slides={LOGIN_SLIDES}>
      {hasRecoverySession === null ? (
        <AuthPending label="Checking your link…" />
      ) : hasRecoverySession ? (
        <ResetPasswordForm onSubmit={handleSubmit} loading={submitting} />
      ) : (
        <AuthNotice
          icon={LinkIcon}
          tone="warning"
          title="Link expired"
          action={
            <Button asChild className="h-11 w-full text-[15px] font-medium">
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
          }
          footer={
            <>
              Back to{" "}
              <Link
                to="/login"
                className="rounded-sm font-medium text-primary-text underline-offset-4 outline-none transition-colors duration-200 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                Sign in
              </Link>
            </>
          }
        >
          This password reset link is invalid or has already expired. Request a
          new one and we&apos;ll email it straight over.
        </AuthNotice>
      )}
    </AuthLayout>
  );
}

export default ResetPasswordPage;
