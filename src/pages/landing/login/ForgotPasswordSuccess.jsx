import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthNotice from "./AuthNotice";

/**
 * Shown once the reset link has been sent.
 *
 * The old page confirmed this with a two-second toast on a form that still
 * looked ready to submit, which left no trace of what had just happened. This
 * replaces the form in place — same URL, same layout, back gesture intact — so
 * the confirmation is the screen rather than a notification that has already
 * gone.
 *
 * `onResend` returns to the form with the address still filled in, for the two
 * cases that actually happen: a typo in the address, or nothing arriving.
 */
function ForgotPasswordSuccess({ email, loginHref = "/login", onResend, className }) {
  return (
    <AuthNotice
      icon={MailCheck}
      tone="brand"
      title="Check your email"
      className={className}
      action={
        <Button asChild className="h-11 w-full text-[15px] font-medium">
          <Link to={loginHref}>Back to sign in</Link>
        </Button>
      }
      footer={
        <>
          No email after a minute or two? Check your spam folder, or{" "}
          <button
            type="button"
            onClick={onResend}
            className="rounded-sm font-medium text-primary-text underline-offset-4 outline-none transition-colors duration-200 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            try another address
          </button>
          .
        </>
      }
    >
      We&apos;ve sent a password reset link to{" "}
      <span className="font-medium text-gray-900">{email}</span>. Open it to
      choose a new password.
    </AuthNotice>
  );
}

export default ForgotPasswordSuccess;
