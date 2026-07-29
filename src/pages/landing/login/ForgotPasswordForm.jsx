import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Mail } from "lucide-react";
import LogoDesign from "@/components/LogoDesign";
import { cn } from "@/lib/utils";
import AuthInput from "./AuthInput";
import AuthSubmitButton from "./AuthSubmitButton";
import { formGroup, formItem } from "./motionVariants";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The "email me a reset link" form.
 *
 * One field, and the same two rules the page enforced before — an address must
 * be present and must look like an address. What changed is where the answer
 * appears: inline under the field, as on sign-in and sign-up, instead of a toast
 * that fires and vanishes two seconds later.
 *
 * Sending the link stays in the page.
 */
function ForgotPasswordForm({
  onSubmit,
  loading = false,
  initialEmail = "",
  loginHref = "/login",
  className,
}) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState(undefined);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (loading) return;

    const trimmed = email.trim();
    let nextError;
    if (!trimmed) nextError = "Enter your email address.";
    else if (!EMAIL_PATTERN.test(trimmed))
      nextError = "That email address doesn't look right.";

    setError(nextError);
    if (nextError) return;

    onSubmit({ email: trimmed });
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

      <motion.h1
        variants={formItem}
        className="mt-9 text-2xl font-semibold tracking-tight text-gray-900 sm:text-[1.75rem]"
      >
        Forgot your password?
      </motion.h1>

      <motion.p variants={formItem} className="mt-2 text-[15px] text-gray-600">
        Enter your email and we&apos;ll send you a link to reset it.
      </motion.p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        <AuthInput
          id="forgot-email"
          label="Email"
          icon={Mail}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          disabled={loading}
          error={error}
          onChange={(event) => {
            setEmail(event.target.value);
            if (error) setError(undefined);
          }}
        />

        <AuthSubmitButton
          loading={loading}
          label="Send reset link"
          pendingLabel="Sending…"
        />
      </form>

      {/*
        The way back was easy to miss: 14px, the same weight as the sentence
        carrying it, and the only route out of this screen for someone who
        landed here by mistake.

        It is now its own line rather than the tail of one — 15px, semibold, with
        a chevron that nudges on hover and a permanent underline so it reads as a
        control rather than as emphasis. Deliberately still a text link: no fill,
        no border, no box. The filled button on this screen is "Send reset link",
        and a second filled control would compete with it.
      */}
      <motion.div variants={formItem} className="mt-8 text-center">
        <p className="text-[13px] text-gray-500">Remembered it?</p>
        <Link
          to={loginHref}
          className="group mt-1.5 inline-flex items-center gap-1.5 rounded-sm text-[15px] font-semibold text-primary-text underline decoration-primary-text/25 underline-offset-4 outline-none transition-colors duration-200 hover:decoration-primary-text focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <ChevronLeft
            className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
            aria-hidden="true"
          />
          Back to sign in
        </Link>
      </motion.div>
    </motion.div>
  );
}

export default ForgotPasswordForm;
