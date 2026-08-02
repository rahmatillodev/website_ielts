import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthNotice from "./AuthNotice";

/**
 * Shown when Supabase created the account but issued no session — i.e. email
 * confirmation is enabled on the project.
 *
 * This screen exists because the alternative is a lie: dropping someone on a
 * dashboard they have no session for, where every query fails. It states plainly
 * what happened, which address to check, and gives one way forward.
 *
 * It replaces the form in place rather than routing somewhere new, so the
 * address bar still reads /signup and a browser back gesture behaves.
 *
 * The panel itself is `AuthNotice`, shared with the two recovery screens.
 */
function SignUpSuccess({ email, loginHref = "/login", className }) {
  return (
    <AuthNotice
      icon={MailCheck}
      tone="brand"
      title="Check your email"
      className={className}
      action={
        <Button asChild className="h-11 w-full text-[15px] font-medium">
          <Link to={loginHref}>Go to sign in</Link>
        </Button>
      }
      footer="No email after a minute or two? Check your spam folder."
    >
      We&apos;ve sent a confirmation link to{" "}
      <span className="font-medium text-gray-900">{email}</span>. Open it to
      confirm your account, then sign in.
    </AuthNotice>
  );
}

export default SignUpSuccess;
