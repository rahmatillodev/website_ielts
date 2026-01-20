import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { LuBookOpen } from "react-icons/lu";

const LandingNavbar = () => {
  return (
    <nav className="w-full h-16 bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#4A90E2] rounded-full flex items-center justify-center">
            <LuBookOpen className="text-white size-5" />
          </div>
          <span className="text-xl font-black text-gray-900 tracking-tight">IELTS SIM</span>
        </Link>

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            to="/courses"
            className="text-sm font-medium text-gray-700 hover:text-[#4A90E2] transition-colors"
          >
            Courses
          </Link>
          <Link
            to="/practice-tests"
            className="text-sm font-medium text-gray-700 hover:text-[#4A90E2] transition-colors"
          >
            Practice Tests
          </Link>
          <Link
            to="/resources"
            className="text-sm font-medium text-gray-700 hover:text-[#4A90E2] transition-colors"
          >
            Resources
          </Link>
          <Link
            to="/pricing"
            className="text-sm font-medium text-gray-700 hover:text-[#4A90E2] transition-colors"
          >
            Pricing
          </Link>
        </div>

        {/* Right Buttons */}
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button
              variant="ghost"
              className="text-sm font-medium text-gray-700 hover:text-[#4A90E2] hover:bg-transparent"
            >
              Login
            </Button>
          </Link>
          <Link to="/signup">
            <Button className="bg-[#4A90E2] hover:bg-[#3A7BC8] text-white font-medium px-6 py-2 rounded-md shadow-sm">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default LandingNavbar;