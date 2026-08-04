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
import { useTransientErrors } from "./useTransientErrors";

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
 * Vertical rhythm is tighter than sign-in's, and tightens one more step below
 * 800px of viewport height, so six controls plus the button and the sign-in
 * link fit a 768px laptop without the panel scrolling.
 *
 * Validation is per-field and inline. Every rule below either mirrors one the
 * app already enforces elsewhere or prevents a request that Supabase would
 * reject anyway; none of them silently swallow a submit.
 *
 * Each message rides in its field's label row, right-aligned. That is what
 * makes an error cost zero height: the row is there either way, so nothing
 * below it — least of all the Create account button — can be pushed down.
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
  // Messages expire on their own after a few seconds, per field. See
  // `useTransientErrors` for why the timers are per field and not per form.
  const { errors, showErrors, clearError } = useTransientErrors();

  const setField = (field) => (event) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [field]: value }));
    // Typing is the user answering the message, so it goes immediately — along
    // with its pending timer. Only this field's; the others stand until they
    // are answered or expire on their own.
    clearError(field);
  };

  const validate = () => {
    const nextErrors = {};
    const fullName = values.fullName.trim();
    const email = values.email.trim();

    // The rules are unchanged; only the wording is, because each message now
    // shares one line with its label and has to stay short enough to read at a
    // glance without truncating on a phone.
    if (!fullName) nextErrors.fullName = "Enter your full name.";
    else if (fullName.length < MIN_NAME_LENGTH)
      nextErrors.fullName = `At least ${MIN_NAME_LENGTH} characters.`;

    if (!email) nextErrors.email = "Enter your email.";
    else if (!EMAIL_PATTERN.test(email))
      nextErrors.email = "Enter a valid email.";

    if (!values.password) nextErrors.password = "Choose a password.";
    else if (values.password.length < MIN_PASSWORD_LENGTH)
      nextErrors.password = `At least ${MIN_PASSWORD_LENGTH} characters.`;

    if (!values.confirmPassword)
      nextErrors.confirmPassword = "Re-enter your password.";
    else if (values.confirmPassword !== values.password)
      nextErrors.confirmPassword = "Passwords don't match.";

    if (!accepted) nextErrors.terms = "Accept the Terms to continue.";

    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (loading) return;

    // Always goes through showErrors, including the empty set on success: it
    // both publishes the messages and restarts every countdown, so submitting
    // bad data twice gives the second set its full time on screen.
    const nextErrors = validate();
    showErrors(nextErrors);
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
        className="mt-5 block text-[11px] font-medium uppercase tracking-[0.12em] text-brand-700 [@media(max-height:800px)]:mt-3"
      >
        Create your profile
      </motion.span>

      <motion.h1
        variants={formItem}
        className="mt-1.5 text-2xl font-semibold tracking-tight text-gray-900 sm:text-[1.75rem]"
      >
        Create your account
      </motion.h1>

      <motion.p variants={formItem} className="mt-1.5 text-[15px] text-gray-600">
        Start your IELTS preparation in a few minutes.
      </motion.p>

      {/* Compact but comfortable, and one step tighter again on short
          viewports, so a 768px-tall laptop shows the whole form — button and
          sign-in link included — without the panel scrolling. */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-5 space-y-3 [@media(max-height:800px)]:mt-4 [@media(max-height:800px)]:space-y-2"
      >
        <AuthInput
          id="signup-name"
          label="Full name"
          icon={User}
          type="text"
          autoComplete="name"
          placeholder="Your name"
          value={values.fullName}
          disabled={loading}
          inlineError
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
          inlineError
          error={errors.email}
          onChange={setField("email")}
        />

        <PasswordInput
          id="signup-password"
          label="Password"
          autoComplete="new-password"
          value={values.password}
          disabled={loading}
          inlineError
          error={errors.password}
          onChange={setField("password")}
        />

        <PasswordInput
          id="signup-confirm-password"
          label="Confirm password"
          autoComplete="new-password"
          value={values.confirmPassword}
          disabled={loading}
          inlineError
          error={errors.confirmPassword}
          onChange={setField("confirmPassword")}
        />

        {/* consent gate */}
        <motion.div variants={formItem}>
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
                clearError("terms");
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

          {/* The consent gate is the one control with no label row to share:
              its own label is a full sentence that already fills the line. So
              it keeps a single reserved line instead — always present, 16px,
              never grown — and the message is indented to sit under the text
              rather than under the box. */}
          <div className="mt-1 h-4">
            <AnimatePresence initial={false}>
              {errors.terms && (
                <motion.p
                  id="signup-terms-error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="truncate pl-[26px] text-[12px] leading-none text-destructive-text"
                >
                  {errors.terms}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <AuthSubmitButton
          loading={loading}
          label="Create account"
          pendingLabel="Creating account…"
        />
      </form>

      <motion.p
        variants={formItem}
        className="mt-4 text-center text-sm text-gray-600 [@media(max-height:800px)]:mt-3"
      >
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
