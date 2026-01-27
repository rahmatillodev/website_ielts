import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, ChevronLeft, ArrowRight } from "lucide-react";
import { toast } from "react-toastify";
import LogoDesign from "@/components/LogoDesign";
import { motion } from "framer-motion";
import { MdAutoStories, MdInsights } from "react-icons/md";
import AnimatedPolygonDecoration from "@/components/auth/AnimatedPolygonDecoration";

// Public Login page
function LoginPage() {
  const navigate = useNavigate();
  const signIn = useAuthStore((state) => state.signIn);
  const loading = useAuthStore((state) => state.loading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    const result = await signIn(email, password);

    if (result?.success) {
      toast.success("Welcome back!");
      navigate("/dashboard");
    } else {
      toast.error(result?.error || "Invalid email or password");
    }
  };


  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Panel - Branding with Animation */}
      <AnimatedPolygonDecoration />
      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-3/5 p-8 min-h-screen flex flex-col justify-center items-center bg-white">
        {/* Mobile back button */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all duration-300 lg:hidden group self-start"
        >
          <ChevronLeft className="w-4 h-4 text-gray-700 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium text-gray-700">Back</span>
        </button>

        <div className="w-full max-w-md">
          {/* Logo - Mobile */}
          <div className="lg:hidden mb-8">
            <LogoDesign
              className="w-fit"
              iconColor="text-[#1990e6]"
              color="#1990e6"
            />
          </div>
          <div className="flex items-center gap-2 py-8">
            <div className="p-2 bg-[#1990e6] rounded-md">
              <MdAutoStories className="text-2xl text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">IELTSCORE</h1>
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
              to="/signup"
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
                  to="/signup"
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
