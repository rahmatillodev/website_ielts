import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, User } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import LogoDesign from "@/components/LogoDesign";
import { cn } from "@/lib/utils";
import AuthInput from "./AuthInput";
import AuthSubmitButton from "./AuthSubmitButton";
import PasswordInput from "./PasswordInput";
import { formGroup, formItem } from "./motionVariants";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Six characters, matching what the rest of the app already enforces
 * (`ChangePasswordModal`, `ResetPasswordPage`) and what Supabase rejects below.
 * Checking it here turns a server round-trip and a red toast into an inline
 * message the user sees before they ever press the button.
 */
const MIN_PASSWORD_LENGTH = 6;
const MIN_NAME_LENGTH = 2;

/**
 * The sign-up form.
 *
 * Structurally the opposite of the sign-in form, on purpose: an eyebrow label
 * above the heading, four fields, a consent gate, and no "remember me" or
 * "forgot password" — neither means anything to someone who has no account yet.
 * Vertical rhythm is tighter (`space-y-4` against sign-in's `space-y-5`) so six
 * controls still fit a 768px-tall laptop without the page scrolling.
 *
 * Validation is per-field and inline. Every rule below either mirrors one the
 * app already enforces elsewhere or prevents a request that Supabase would
 * reject anyway; none of them silently swallow a submit.
 *
 * Account creation, redirects and failure copy stay in the page.
 */
function SignUpForm({ onSubmit, loading = false, loginHref = "/login", className }) {
  const [values, setValues] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState({});

  const setField = (field) => (event) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const validate = () => {
    const nextErrors = {};
    const fullName = values.fullName.trim();
    const email = values.email.trim();

    if (!fullName) nextErrors.fullName = "Enter your full name.";
    else if (fullName.length < MIN_NAME_LENGTH)
      nextErrors.fullName = `Your name must be at least ${MIN_NAME_LENGTH} characters.`;

    if (!email) nextErrors.email = "Enter your email address.";
    else if (!EMAIL_PATTERN.test(email))
      nextErrors.email = "That email address doesn't look right.";

    if (!values.password) nextErrors.password = "Choose a password.";
    else if (values.password.length < MIN_PASSWORD_LENGTH)
      nextErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;

    if (!values.confirmPassword)
      nextErrors.confirmPassword = "Re-enter your password.";
    else if (values.confirmPassword !== values.password)
      nextErrors.confirmPassword = "Those passwords don't match.";

    if (!accepted)
      nextErrors.terms = "Please accept the Terms and Privacy Policy to continue.";

    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (loading) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      fullName: values.fullName.trim(),
      // Lower-cased so the address stored on the profile matches what the user
      // types on any later sign-in, whatever case they use.
      email: values.email.trim().toLowerCase(),
      password: values.password,
    });
  };

  return (
    <motion.div
      variants={formGroup}
      initial="hidden"
      animate="visible"
      className={cn(
        "relative z-10 w-full max-w-[23rem] md:max-w-[20rem] lg:max-w-[23rem]",
        className
      )}
    >
      <motion.div variants={formItem}>
        <LogoDesign variant="red" className="h-8" />
      </motion.div>

      <motion.span
        variants={formItem}
        className="mt-7 block text-[11px] font-medium uppercase tracking-[0.12em] text-brand-700"
      >
        Create your profile
      </motion.span>

      <motion.h1
        variants={formItem}
        className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 sm:text-[1.75rem]"
      >
        Create your account
      </motion.h1>

      <motion.p variants={formItem} className="mt-2 text-[15px] text-gray-600">
        Start your IELTS preparation in a few minutes.
      </motion.p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <AuthInput
          id="signup-name"
          label="Full name"
          icon={User}
          type="text"
          autoComplete="name"
          placeholder="Your name"
          value={values.fullName}
          disabled={loading}
          error={errors.fullName}
          onChange={setField("fullName")}
        />

        <AuthInput
          id="signup-email"
          label="Email"
          icon={Mail}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          disabled={loading}
          error={errors.email}
          onChange={setField("email")}
        />

        <PasswordInput
          id="signup-password"
          label="Password"
          autoComplete="new-password"
          value={values.password}
          disabled={loading}
          error={errors.password}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          onChange={setField("password")}
        />

        <PasswordInput
          id="signup-confirm-password"
          label="Confirm password"
          autoComplete="new-password"
          value={values.confirmPassword}
          disabled={loading}
          error={errors.confirmPassword}
          onChange={setField("confirmPassword")}
        />

        {/* consent gate */}
        <motion.div variants={formItem} className="pt-0.5">
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="signup-terms"
              checked={accepted}
              disabled={loading}
              aria-invalid={Boolean(errors.terms)}
              aria-describedby={errors.terms ? "signup-terms-error" : undefined}
              className="mt-0.5"
              onCheckedChange={(value) => {
                setAccepted(value === true);
                setErrors((prev) => (prev.terms ? { ...prev, terms: undefined } : prev));
              }}
            />
            {/* "Terms of Service" and "Privacy Policy" are emphasised text, not
                links: the app has no /terms or /privacy route, so linking them
                would drop the user into the catch-all and bounce them back to
                /login. Add those routes and they become <Link>s. Keeping them as
                plain text also lets the whole string stay inside the <label> —
                an anchor nested in a label toggles the checkbox as well as
                navigating. */}
            <label
              htmlFor="signup-terms"
              className="cursor-pointer text-[12.5px] leading-snug text-gray-600"
            >
              I agree to the{" "}
              <span className="font-medium text-gray-900">Terms of Service</span> and{" "}
              <span className="font-medium text-gray-900">Privacy Policy</span>.
            </label>
          </div>

          <AnimatePresence initial={false}>
            {errors.terms && (
              <motion.p
                id="signup-terms-error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden pt-1.5 text-[12.5px] leading-snug text-destructive-text"
              >
                {errors.terms}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        <AuthSubmitButton
          loading={loading}
          label="Create account"
          pendingLabel="Creating account…"
        />
      </form>

      <motion.p variants={formItem} className="mt-5 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link
          to={loginHref}
          className="rounded-sm font-medium text-primary-text underline-offset-4 outline-none transition-colors duration-200 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Sign in
        </Link>
      </motion.p>
    </motion.div>
  );
}

export default SignUpForm;
