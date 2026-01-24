import React from "react";
import {
  FaFacebookF,
  FaTelegramPlane,
  FaInstagram,
  FaLinkedinIn,
} from "react-icons/fa";
import { HiAcademicCap } from "react-icons/hi2";
import LogoDesign from "../LogoDesign";

const LandingFooter = () => {
  return (
    <footer className="bg-white border-t border-gray-200  w-11/12 mx-auto">
      <div className="mx-auto px-4 py-16">
        {/* Top */}
        <div className="flex flex-col lg:flex-row gap-10 items-start justify-around w-full mx-auto">
          
          {/* Brand */}
          <div className="w-2/3">
            <div className="flex items-center gap-2 mb-4">
             
              <LogoDesign />
            </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3"> Know where you stand before test day</h2>

            <p className="text-sm text-gray-500">
              Computer-based IELTS practise that mirrors the real exam experience - from question types to timing, 
              no more guessing what to expect.
            </p>

            {/* Social icons */}
            <div className="flex gap-3 mt-6">
              {/* <a
                href="#"
                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-600 transition"
              >
                <FaFacebookF size={14} />
              </a> */}

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

              {/* <a
                href="#"
                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-600 transition"
              >
                <FaLinkedinIn size={14} />
              </a> */}
            </div>
          </div>

          {/* Useful Links */}
          <div className="md:justify-self-center flex flex-col items-center w-full">
            <ul className="space-y-3 text-sm text-gray-500">
            <li className="text-sm font-semibold text-gray-900 mb-4">
              {/* /// add link to sign up */}
              Useful Links
            </li>
              <li><a href="#why-choose" className="hover:text-blue-600">Why choose us?</a></li>
              {/* <li><a href="#our-impact" className="hover:text-blue-600">Our Impact</a></li> */}
              <li><a href="#stories" className="hover:text-blue-600">Stories</a></li>
            </ul>
          </div>

          {/* Empty space for balance */}
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-200 mt-14 pt-6 text-center text-sm text-gray-400">
          © 2026 IELTSCORE. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;