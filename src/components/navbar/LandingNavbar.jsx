import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import LogoDesign from "@/components/LogoDesign";

const LandingNavbar = () => {
  return (
    <nav className="w-full h-16 bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <LogoDesign />
        </Link>

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-8">
          <a
            href="#why-choose"
            className=" text-gray-700 hover:text-[#4A90E2] transition-colors"
          >
            Why choose us?
          </a>
          <a
            href="#our-impact"
            className=" font-medium text-gray-700 hover:text-[#4A90E2] transition-colors"
          >
            Our Impact
          </a>
          <a
            href="#stories"
            className="text-gray-700 hover:text-[#4A90E2] transition-colors"
          >
            Stories
          </a>
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