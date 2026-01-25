import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import LogoDesign from "../LogoDesign";

const LandingNavbar = () => {
  return (
    <nav className="w-full h-14 sm:h-16 bg-white border-b border-gray-200 fixed top-0 z-50 shadow-sm">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 h-full flex items-center justify-between md:justify-around gap-2 sm:gap-4">
        {/* Logo */}
        <a href="#home" className="flex items-center gap-3">
         <LogoDesign />
         <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">
              Beta
            </span>
        </a> 

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8 shrink-0">
          <a
            href="#why-choose"
            className="font-medium text-gray-700 hover:text-[#4A90E2] transition-colors whitespace-nowrap"
          >
            Why choose us?
          </a>
          <a
            href="#stories"
            className="font-medium text-gray-700 hover:text-[#4A90E2] transition-colors whitespace-nowrap"
          >
            Stories
          </a>
        </div>

        {/* Right Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link to="/login">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm font-medium text-gray-700 hover:text-[#4A90E2] hover:bg-transparent h-8 sm:h-9 px-2.5 sm:px-3"
            >
              Login
            </Button>
          </Link>
          <Link to="/signup">
            <Button
              size="sm"
              className="bg-[#4A90E2] hover:bg-[#3A7BC8] text-white font-medium h-8 sm:h-9 px-3 sm:px-5 rounded-full shadow-[0_4px_20px_rgba(74,144,226,0.4)] text-xs sm:text-sm"
            >
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default LandingNavbar;