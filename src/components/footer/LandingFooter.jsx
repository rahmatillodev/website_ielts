import React from "react";
import { FaTelegramPlane, FaInstagram } from "react-icons/fa";
import LogoDesign from "../LogoDesign";
import { useSettingsStore } from "@/store/systemStore";

const LandingFooter = () => {
  const settings = useSettingsStore((state) => state.settings);
  const telegramUrl = settings?.telegram_channel || "#";
  const instagramUrl = settings?.instagram_channel || "#";

  return (
    <footer className="bg-white border-t border-gray-200 w-full">
      <div className="mx-auto px-4 sm:px-6 py-10 sm:py-16 max-w-7xl">
        {/* Top */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12 items-start">
          {/* Brand */}
          <div className="w-full min-w-0 max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <LogoDesign />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              Know where you stand before test day
            </h2>
            <p className="text-sm text-gray-500">
              Computer-based IELTS practise that mirrors the real exam experience — from question types to timing,
              no more guessing what to expect.
            </p>
            <div className="flex gap-3 mt-6">
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-600 transition"
                aria-label="Telegram"
              >
                <FaTelegramPlane size={14} />
              </a>
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-600 transition"
                aria-label="Instagram"
              >
                <FaInstagram size={14} />
              </a>
            </div>
          </div>

          {/* Useful Links */}
          <div className="flex flex-col sm:items-start">
            <span className="text-sm font-semibold text-gray-900 mb-4 block">
              Useful Links
            </span>
            <ul className="space-y-3 text-sm text-gray-500">
              <li>
                <a href="#why-choose" className="hover:text-blue-600 transition">
                  Why choose us?
                </a>
              </li>
              <li>
                <a href="#stories" className="hover:text-blue-600 transition">
                  Stories
                </a>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div className="flex flex-col sm:items-start">
            <span className="text-sm font-semibold text-gray-900 mb-4 block">
              Social
            </span>
            <ul className="space-y-3 text-sm text-gray-500">
              <li>
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition"
                >
                  Telegram
                </a>
              </li>
              <li>
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-200 mt-10 sm:mt-14 pt-6 text-center text-xs sm:text-sm text-gray-400">
          © 2026 IELTSCORE. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;