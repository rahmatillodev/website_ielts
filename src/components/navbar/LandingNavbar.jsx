import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import LogoDesign from "../LogoDesign";
import { LuMenu, LuX } from "react-icons/lu";
import { FaTelegramPlane, FaInstagram } from "react-icons/fa";
import { useSettingsStore } from "@/store/systemStore";

const LandingNavbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const settings = useSettingsStore((state) => state.settings);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="w-full h-14 sm:h-16 bg-white border-b border-gray-200 fixed top-0 z-50 shadow-sm">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 h-full flex items-center justify-between md:justify-around gap-2 sm:gap-4">
        {/* Logo */}
        <a href="#home" className="flex items-center gap-3" onClick={closeMenu}>
         <LogoDesign />
         <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">
              Beta
            </span>
        </a> 

        {/* Center Links - Desktop */}
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

        {/* Right Buttons - Desktop */}
        <div className="hidden md:flex items-center gap-2 sm:gap-3 shrink-0">
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

        {/* Burger Menu Button - Mobile */}
        <button
          onClick={toggleMenu}
          className="md:hidden inline-flex items-center justify-center size-9 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <LuX className="w-5 h-5" />
          ) : (
            <LuMenu className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="md:hidden fixed inset-0 bg-black/20 z-40 top-14 sm:top-16"
            onClick={closeMenu}
          />
          
          {/* Menu Panel */}
          <div className="md:hidden fixed top-14 sm:top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-xl z-50 animate-in slide-in-from-top-2">
            <div className="px-4 py-5 space-y-1 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
              {/* Navigation Links */}
              <a
                href="#why-choose"
                onClick={closeMenu}
                className="block py-3 px-3 rounded-lg font-medium text-gray-700 hover:text-[#4A90E2] hover:bg-blue-50 transition-all"
              >
                Why choose us?
              </a>
              <a
                href="#stories"
                onClick={closeMenu}
                className="block py-3 px-3 rounded-lg font-medium text-gray-700 hover:text-[#4A90E2] hover:bg-blue-50 transition-all"
              >
                Stories
              </a>
              
              {/* Divider */}
              <div className="pt-3 pb-2 border-t border-gray-200">
                <div className="space-y-2">
                  <Link to="/login" onClick={closeMenu} className="block">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sm font-medium text-gray-700 hover:text-[#4A90E2] hover:bg-blue-50 h-10 rounded-lg"
                    >
                      Login
                    </Button>
                  </Link>
                  <Link to="/signup" onClick={closeMenu} className="block">
                    <Button
                      size="sm"
                      className="w-full bg-[#4A90E2] hover:bg-[#3A7BC8] text-white font-medium h-10 rounded-lg shadow-[0_4px_20px_rgba(74,144,226,0.4)] text-sm"
                    >
                      Get Started
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Social Media Links */}
              <div className="pt-3 pb-2 border-t border-gray-200">
                <div className="flex items-center justify-center gap-4">
                  <a
                    href={`https://t.me/${settings?.telegram_channel || "#"}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeMenu}
                    className="flex items-center gap-2 text-gray-700 hover:text-[#4A90E2] transition-colors"
                    aria-label="Telegram"
                  >
                    <FaTelegramPlane size={18} />
                    <span className="text-sm font-medium">Telegram</span>
                  </a>
                  <a
                    href={`https://www.instagram.com/${settings?.instagram_channel || "#"}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeMenu}
                    className="flex items-center gap-2 text-gray-700 hover:text-[#4A90E2] transition-colors"
                    aria-label="Instagram"
                  >
                    <FaInstagram size={18} />
                    <span className="text-sm font-medium">Instagram</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  );
};

export default LandingNavbar;