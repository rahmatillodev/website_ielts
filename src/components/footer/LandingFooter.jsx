import React from "react";
import {
  FaFacebookF,
  FaTelegramPlane,
  FaInstagram,
  FaLinkedinIn,
} from "react-icons/fa";
import { HiAcademicCap } from "react-icons/hi2";

const LandingFooter = () => {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Top */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                <HiAcademicCap size={20} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">IELTS SIM</h2>
            </div>

            <p className="text-sm text-gray-500 max-w-xs">
              The world’s most advanced IELTS preparation platform. Empowering
              students to achieve their dreams.
            </p>

            {/* Social icons */}
            <div className="flex gap-3 mt-6">
              <a
                href="#"
                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-600 transition"
              >
                <FaFacebookF size={14} />
              </a>

              <a
                href="#"
                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-600 transition"
              >
                <FaTelegramPlane size={14} />
              </a>

              <a
                href="#"
                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-600 transition"
              >
                <FaInstagram size={14} />
              </a>

              <a
                href="#"
                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-600 transition"
              >
                <FaLinkedinIn size={14} />
              </a>
            </div>
          </div>

          {/* Useful Links */}
          <div className="md:justify-self-center">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Useful Links
            </h3>
            <ul className="space-y-3 text-sm text-gray-500">
              <li><a href="#why-choose" className="hover:text-blue-600">Why choose us?</a></li>
              <li><a href="#our-impact" className="hover:text-blue-600">Our Impact</a></li>
              <li><a href="#stories" className="hover:text-blue-600">Stories</a></li>
            </ul>
          </div>

          {/* Empty space for balance */}
          <div></div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-200 mt-14 pt-6 text-center text-sm text-gray-400">
          © 2025 IELTS SIM. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
