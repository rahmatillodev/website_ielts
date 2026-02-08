import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, User, ChevronLeft, ArrowRight } from "lucide-react";
import { toast } from "react-toastify";
import LogoDesign from "@/components/LogoDesign";
import AnimatedPolygonDecoration from "@/components/AnimatedPolygonDecoration";
import { motion } from "framer-motion";
import { MdAutoStories } from "react-icons/md";

// Public Sign Up page
function SignUpPage() {
  const navigate = useNavigate();
  const signUp = useAuthStore((state) => state.signUp);
  const loading = useAuthStore((state) => state.loading);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (!email || !password || !fullName) {
      toast.error("Please fill in all fields");
      return;
    }

    const result = await signUp(email, password, fullName);

    if (result?.success) {
      toast.success("Account created successfully!");
      navigate("/dashboard");
    } else {
      toast.error(result?.error || "Failed to create account");
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Panel - Branding with Animation */}
      <AnimatedPolygonDecoration />

      {/* Right Panel - Sign Up Form */}
      <div className="w-full lg:w-3/5 p-8 min-h-screen flex flex-col justify-center items-center bg-white relative">
        {/* Back Button - Responsive */}
        <button
          onClick={() => navigate(-1)}
          className="absolute lg:hidden top-9 left-8 flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors text-sm"
          aria-label="Go back"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

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
          
            Create an account
          </h1>
          <p className="text-gray-600 mb-8">
            Please enter your details to create an account.
          </p>
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 mb-8 bg-gray-100 rounded-lg p-1">
            <Link
              to="/login"
              className="flex-1 px-4 py-2 rounded-md text-gray-600 font-medium text-sm hover:text-gray-900 transition-all text-center"
            >
              Sign In
            </Link>
            <button className="flex-1 px-4 py-2 rounded-md bg-white text-gray-900 font-medium text-sm shadow-sm transition-all">
              Sign Up
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >

            <form onSubmit={handleSignUp} className="space-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Full name"
                    className="pl-10 bg-gray-50 border-gray-200 h-11"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

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
                <label className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="password"
                    placeholder="•••••••••"
                    className="pl-10 bg-gray-50 border-gray-200 h-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-dark text-white h-11 text-base font-medium"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Sign Up"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-primary hover:text-primary-dark font-medium"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default SignUpPage;
