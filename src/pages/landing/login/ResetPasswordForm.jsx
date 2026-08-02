import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import LogoDesign from "@/components/LogoDesign";
import { cn } from "@/lib/utils";
import AuthSubmitButton from "./AuthSubmitButton";
import PasswordInput from "./PasswordInput";
import { formGroup, formItem } from "./motionVariants";

/**
 * Six characters — the same floor `SignUpForm` and `ChangePasswordModal` apply,
 * and the same one the old page enforced. Unchanged, only relocated.
 */
const MIN_PASSWORD_LENGTH = 6;

/**
 * The form behind a valid recovery link: choose a new password, twice.
 *
 * Both rules are the ones the page already had (a minimum length, and the two
 * entries matching); they now render inline under the field that failed rather
 * than as a toast, so the user can see which box is wrong while they fix it.
 *
 * Updating the password stays in the page.
 */
function ResetPasswordForm({ onSubmit, loading = false, loginHref = "/login", className }) {
  const [values, setValues] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});

  const setField = (field) => (event) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (loading) return;

    const nextErrors = {};
    if (!values.password) nextErrors.password = "Choose a new password.";
    else if (values.password.length < MIN_PASSWORD_LENGTH)
      nextErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;

    if (!values.confirmPassword)
      nextErrors.confirmPassword = "Re-enter your new password.";
    else if (values.confirmPassword !== values.password)
      nextErrors.confirmPassword = "Those passwords don't match.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({ password: values.password });
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
        Set a new password
      </motion.h1>

      <motion.p variants={formItem} className="mt-2 text-[15px] text-gray-600">
        Choose a new password for your account.
      </motion.p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
        <PasswordInput
          id="reset-password"
          label="New password"
          autoComplete="new-password"
          value={values.password}
          disabled={loading}
          error={errors.password}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          onChange={setField("password")}
        />

        <PasswordInput
          id="reset-confirm-password"
          label="Confirm password"
          autoComplete="new-password"
          value={values.confirmPassword}
          disabled={loading}
          error={errors.confirmPassword}
          onChange={setField("confirmPassword")}
        />

        <AuthSubmitButton
          loading={loading}
          label="Update password"
          pendingLabel="Updating…"
        />
      </form>

      <motion.p variants={formItem} className="mt-8 text-center text-sm text-gray-600">
        Back to{" "}
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

export default ResetPasswordForm;
