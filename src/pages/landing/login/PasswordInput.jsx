import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import AuthInput from "./AuthInput";

/**
 * A password field with its own show/hide toggle.
 *
 * Split out of the forms because both auth pages need it and the sign-up page
 * needs it twice — and each instance has to own its own reveal state, or
 * toggling "Password" would also unmask "Confirm password", which is precisely
 * the field the mask is there to make you re-type carefully.
 *
 * Everything else — label, icon, focus halo, error slot — comes from
 * `AuthInput`, so a password field is visually identical to any other.
 */
function PasswordInput({ id, label = "Password", autoComplete = "current-password", ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <AuthInput
      id={id}
      label={label}
      icon={Lock}
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      placeholder="••••••••"
      trailing={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 outline-none transition-colors duration-200 hover:text-gray-600 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
      {...props}
    />
  );
}

export default PasswordInput;
