import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GraduationCap, Mail, Lock, ChevronLeft, BookOpen, Headphones, PenTool, ArrowRight } from 'lucide-react'
import { toast } from "react-toastify"
// Public Login page
function LoginPage() {
  const navigate = useNavigate()
  const signIn = useAuthStore((state) => state.signIn)
  const loading = useAuthStore((state) => state.loading)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }

    const result = await signIn(email, password)
    
    if (result?.success) {
      toast.success('Welcome back!')
      navigate('/dashboard')
    } else {
      toast.error(result?.error || 'Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen flex bg-white justify-center items-center">
      {/* Left Panel - Blue Background */}
      <div className="hidden lg:flex lg:w-2/5 text-white flex-col justify-between p-12 bg-primary min-h-screen">
        <div>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 mb-5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-300 group"
          >
            <ChevronLeft className="w-4 h-4 text-white group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium text-white">Back to Home</span>
          </button>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <GraduationCap className="w-8 h-8" />
            <span className="text-2xl font-semibold">IELTS Sim</span>
          </div>

          {/* Headline */}
          <h2 className="text-4xl font-bold mb-6">
            Achieve your dream band score.
          </h2>

          {/* Description */}
          <p className="text-white/90 text-lg leading-relaxed">
            Access premium reading, listening, and writing simulations designed to mirror the exact computer-delivered IELTS interface.
          </p>
        </div>

        {/* Features Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 max-w-sm">
          <p className="text-sm text-white/70 mb-4 font-medium">WHAT'S INCLUDED</p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-lg p-2.5">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Reading Practice</p>
                <p className="text-xs text-white/70">Full-length simulations</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-lg p-2.5">
                <Headphones className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Listening Practice</p>
                <p className="text-xs text-white/70">Audio-based exercises</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-lg p-2.5">
                <PenTool className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Writing Practice</p>
                <p className="text-xs text-white/70">Task 1 & 2 simulations</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - White Background */}
      <div className="w-full lg:w-3/5 p-8 min-h-screen flex flex-col justify-center items-center">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all duration-300 lg:hidden group"
        >
          <ChevronLeft className="w-4 h-4 text-gray-700 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium text-gray-700">Back</span>
        </button>
        <div className="w-full flex items-center justify-center mt-9">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
            <p className="text-gray-600 mb-8">Please enter your details to sign in.</p>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Input */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="pl-10 bg-gray-50 border-gray-200"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••"
                    className="pl-10 bg-gray-50 border-gray-200"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Login Button */}
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary-dark text-white h-11 text-base font-medium"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Log In'}
              </Button>
            </form>

            {/* Links */}
            <div className="mt-6 space-y-4">
              {/* <Link 
                to="/forgot-password" 
                className="block text-center text-sm text-gray-600 hover:text-primary transition-colors"
              >
                Forgot Password?
              </Link> */}
              
              {/* Sign Up CTA */}
              <div className="mt-6 p-4 bg-linear-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                <p className="text-sm text-gray-700 text-center mb-3">
                  New to IELTS Sim?
                </p>
                <Link to="/signup">
                  <Button 
                    type="button"
                    variant="outline"
                    className="w-full border-primary/30 text-primary hover:bg-primary hover:text-white transition-all duration-300 group"
                  >
                    Create an Account
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Legal Text */}
            {/* <p className="mt-8 text-xs text-gray-500 text-center">
              By logging in, you agree to our{' '}
              <Link to="/terms" className="text-primary underline hover:no-underline">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-primary underline hover:no-underline">
                Privacy Policy
              </Link>
              .
            </p> */}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage;