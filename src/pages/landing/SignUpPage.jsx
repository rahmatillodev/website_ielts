import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GraduationCap, Mail, Lock, User, Flame, ChevronLeft } from 'lucide-react'
import { toast } from "react-toastify"

// Public Sign Up page
function SignUpPage() {
  const navigate = useNavigate()
  const signUp = useAuthStore((state) => state.signUp)
  const loading = useAuthStore((state) => state.loading)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSignUp = async (e) => {
    e.preventDefault()
    
    if (!email || !password || !fullName) {
      toast.error('Please fill in all fields')
      return
    }

    const result = await signUp(email, password, fullName)
    
    if (result?.success) {
      toast.success('Account created successfully!')
      navigate('/dashboard')
    } else {
      toast.error(result?.error || 'Failed to create account')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Blue Background */}
      <div className="hidden lg:flex lg:w-2/5 text-white flex-col justify-between p-12 bg-primary" >
        <div>
          <div 
            className="flex items-center justify-center mb-5 w-10 h-10 cursor-pointer rounded-full hover:bg-white/80 bg-white/90 transition duration-300"
            onClick={() => navigate("/")}
            >
            <ChevronLeft className="text-gray-600"/>
          </div>
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

        {/* Streak Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 max-w-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-white/70 mb-1">CURRENT STREAK</p>
              <p className="text-3xl font-bold mb-2">12 Days</p>
              <p className="text-sm text-white/80">Keep it up! You're on a roll.</p>
            </div>
            <div className="bg-white rounded-full p-2">
              <Flame className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - White Background */}
      <div className="w-full lg:w-3/5 p-8 bg-white">
        <div
          className="w-10 h-10 flex items-center justify-center rounded-full bg-black/80 hover:bg-black/90 transition duration-300 lg:hidden cursor-pointer"
          onClick={() => navigate("/")}
        >
          <ChevronLeft className="text-white"/>
        </div>
        <div className="w-full flex items-center justify-center mt-5">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold mb-2">Create an account</h1>
            <p className="text-gray-600 mb-8">Please enter your details to create an account.</p>

            <form onSubmit={handleSignUp} className="space-y-6">
              {/* Username Input */}
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Full name"
                    className="pl-10 bg-gray-50 border-gray-200"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

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

              {/* Sign Up Button */}
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary-dark text-white h-11 text-base font-medium"
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Sign Up'}
              </Button>
            </form>

            {/* Links */}
            <div className="mt-6 space-y-4 text-center">
              <Link to="/forgot-password" className="block text-sm text-gray-600 hover:text-primary">
                Forgot Password?
              </Link>
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Log In
                </Link>
              </p>
            </div>

            {/* Legal Text */}
            <p className="mt-8 text-xs text-gray-500 text-center">
              By signing up, you agree to our{' '}
              <Link to="/terms" className="text-primary underline hover:no-underline">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-primary underline hover:no-underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignUpPage;

