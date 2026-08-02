import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import LogoDesign from "@/components/LogoDesign";
import { cn } from "@/lib/utils";
import AuthInput from "./AuthInput";
import AuthSubmitButton from "./AuthSubmitButton";
import PasswordInput from "./PasswordInput";
import { formGroup, formItem } from "./motionVariants";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The sign-in form: two fields and a way back in.
 *
 * Kept deliberately short. It is the returning user's path, so it validates the
 * bare minimum needed to avoid a pointless round trip — is there an email, does
 * it look like one, is there a password — and lets the server be the authority
 * on whether the credentials are right. Anything more (strength rules, a confirm
 * field) belongs on sign-up, where the account is actually being created.
 *
 * Authentication, redirects and failure copy stay in the page.
 */
function LoginForm({
  onSubmit,
  loading = false,
  initialEmail = "",
  initialRemember = false,
  signupHref = "/signup",
  forgotHref = "/forgot-password",
  className,
}) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(initialRemember);
  const [errors, setErrors] = useState({});

  const clearError = (field) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (loading) return;

    const nextErrors = {};
    if (!email.trim()) nextErrors.email = "Enter your email address.";
    else if (!EMAIL_PATTERN.test(email.trim()))
      nextErrors.email = "That email address doesn't look right.";
    if (!password) nextErrors.password = "Enter your password.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({ email: email.trim(), password, remember });
  };

  return (
    <motion.div
      variants={formGroup}
      initial="hidden"
      animate="visible"
      className={cn(
        // Narrower through the tablet range: at 768px the form column is only
        // ~460px wide, and the full 23rem leaves it wedged between its gutters.
        "relative z-10 w-full max-w-[23rem] md:max-w-[20rem] lg:max-w-[23rem]",
        className
      )}
    >
      <motion.div variants={formItem}>
        <LogoDesign variant="red" className="h-8" />
      </motion.div>

      <motion.h1
        variants={formItem}
        className="mt-9 text-2xl font-semibold tracking-tight text-gray-900 sm:text-[1.75rem]"
      >
        Welcome back
      </motion.h1>

      <motion.p variants={formItem} className="mt-2 text-[15px] text-gray-600">
        Sign in to continue your preparation.
      </motion.p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        <AuthInput
          id="login-email"
          label="Email"
          icon={Mail}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          disabled={loading}
          error={errors.email}
          onChange={(event) => {
            setEmail(event.target.value);
            clearError("email");
          }}
        />

        <PasswordInput
          id="login-password"
          label="Password"
          autoComplete="current-password"
          value={password}
          disabled={loading}
          error={errors.password}
          onChange={(event) => {
            setPassword(event.target.value);
            clearError("password");
          }}
        />

        <motion.div variants={formItem} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="login-remember"
              checked={remember}
              onCheckedChange={(value) => setRemember(value === true)}
              disabled={loading}
            />
            <Label
              htmlFor="login-remember"
              className="text-[13px] font-normal text-gray-600"
            >
              Remember me
            </Label>
          </div>
          <Link
            to={forgotHref}
            className="rounded-sm text-[13px] font-medium text-primary-text underline-offset-4 outline-none transition-colors duration-200 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Forgot password?
          </Link>
        </motion.div>

        <AuthSubmitButton loading={loading} label="Sign in" pendingLabel="Signing in…" />
      </form>

      <motion.p variants={formItem} className="mt-8 text-center text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <Link
          to={signupHref}
          className="rounded-sm font-medium text-primary-text underline-offset-4 outline-none transition-colors duration-200 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Create account
        </Link>
      </motion.p>
    </motion.div>
  );
}

export default LoginForm;
