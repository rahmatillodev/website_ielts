import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formGroup, formItem } from "./motionVariants";

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
 */
function SignUpSuccess({ email, loginHref = "/login", className }) {
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
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-50 ring-1 ring-brand-100">
          <MailCheck className="size-5 text-brand-600" />
        </span>
      </motion.div>

      <motion.h1
        variants={formItem}
        className="mt-7 text-2xl font-semibold tracking-tight text-gray-900 sm:text-[1.75rem]"
      >
        Check your email
      </motion.h1>

      <motion.p variants={formItem} className="mt-3 text-[15px] leading-relaxed text-gray-600">
        We&apos;ve sent a confirmation link to{" "}
        <span className="font-medium text-gray-900">{email}</span>. Open it to
        confirm your account, then sign in.
      </motion.p>

      <motion.div variants={formItem} className="mt-7">
        <Button asChild className="h-11 w-full text-[15px] font-medium">
          <Link to={loginHref}>Go to sign in</Link>
        </Button>
      </motion.div>

      <motion.p variants={formItem} className="mt-6 text-center text-[13px] text-gray-500">
        No email after a minute or two? Check your spam folder.
      </motion.p>
    </motion.div>
  );
}

export default SignUpSuccess;
