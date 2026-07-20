import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, ChevronLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import LogoDesign from "@/components/LogoDesign";
import { motion } from "framer-motion";
import AnimatedPolygonDecoration from "@/components/AnimatedPolygonDecoration";
import { isMockTestRoute, getPostAuthTarget } from "@/lib/routeContext";

// Public Login page
function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const signIn = useAuthStore((state) => state.signIn);
  const loading = useAuthStore((state) => state.loading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Hide the back button when the user was sent here from the mock test flow.
  // Derived from the redirect param only - the old session-flag fallback made
  // this sticky across unrelated later logins.
  const isMockTestMode = isMockTestRoute(
    (searchParams.get("redirect") || "").split("?")[0]
  );

  const handleLogin = async (e) => {
    e.preventDefault();


    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Invalid email format");
      return;
    }


    const result = await signIn(email, password);

    if (result?.success) {
      const targetPath = getPostAuthTarget(searchParams.get("redirect"));

      navigate(targetPath, { replace: true });
      toast.success("Welcome back!");
    } else {
      const message = result?.error?.toLowerCase().includes('invalid login credentials')
        ? "Invalid email or password"
        : (result?.error || "Sign in failed");
      toast.error(message);
    }
  };


  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Panel - Branding with Animation */}
      <AnimatedPolygonDecoration />
      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-3/5 p-8 min-h-screen flex flex-col justify-center items-center bg-white relative">
        {/* Back Button - Responsive (hidden in mock test flow) */}
        {!isMockTestMode && (
          <button
            onClick={() => navigate(-1)}
            className="absolute lg:hidden top-9 left-8 flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors text-sm"
            aria-label="Go back"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        )}

        <div className="w-full max-w-md">
          {/* Logo - Mobile */}
          <div className="lg:hidden mb-8">
            <LogoDesign
              className="w-fit"
              iconColor="text-white"
              color="#1990e6"
            />
          </div>
          {/* Logo - Desktop */}
          <div className="hidden lg:flex items-center gap-2 mb-8">
            <LogoDesign
              className="w-fit"
              iconColor="text-white"
              color="#1990e6"
            />
          </div>
          <h1 className="text-3xl font-semibold mb-2 text-gray-900">
            Welcome Back
          </h1>
          <p className="text-gray-600 mb-8">
            Please enter your details to sign in.
          </p>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 mb-8 bg-gray-100 rounded-lg p-1">
            <button
              className="flex-1 px-4 py-2 rounded-md bg-white text-gray-900 font-medium text-sm shadow-sm transition-all"
            >
              Sign In
            </button>
            <Link
              to={searchParams.get("redirect") ? `/signup?redirect=${encodeURIComponent(searchParams.get("redirect"))}` : "/signup"}
              className="flex-1 px-4 py-2 rounded-md text-gray-600 font-medium text-sm hover:text-gray-900 transition-all text-center"
            >
              Sign Up
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >


            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    className="pl-10 bg-gray-50 border-gray-200 h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-[#136dec] hover:text-[#136dec]/90 font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="•••••••••"
                    className="pl-10 pr-10 bg-gray-50 border-gray-200 h-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#136dec] hover:bg-[#136dec]-dark text-white h-11 text-base font-medium"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link
                  to={searchParams.get("redirect") ? `/signup?redirect=${encodeURIComponent(searchParams.get("redirect"))}` : "/signup"}
                  className="text-[#136dec] hover:text-[#136dec]-dark font-medium"
                >
                  Sign Up
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
