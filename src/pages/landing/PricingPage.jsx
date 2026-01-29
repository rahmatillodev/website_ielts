import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  LuArrowLeft,
  LuLayoutDashboard,
  LuLightbulb,
  LuZap,
  LuCopy,
} from "react-icons/lu";
import { FaChartSimple } from "react-icons/fa6";
import { FiSend } from "react-icons/fi";
import { useSettingsStore } from "@/store/systemStore";
import { useAuthStore } from "@/store/authStore";
import { motion, AnimatePresence } from "framer-motion";

/* ================= Feature Item ================= */
const FeatureItem = ({ icon: Icon, title, description, disabled = false, index = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 32 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.18 + index * 0.09, type: 'spring', stiffness: 260, damping: 24 }}
    className={`flex gap-3 p-4 sm:p-5 lg:p-6 bg-white border border-gray-200 rounded-xl sm:rounded-2xl shadow-sm ${disabled ? "opacity-50" : ""
      }`}
  >
    <div
      className={`size-10 sm:size-12 lg:size-14 rounded-xl flex items-center justify-center shrink-0 ${disabled ? "bg-gray-100" : "bg-[#F0F7FF]"
        }`}
    >
      <Icon
        className={`size-5 sm:size-6 lg:size-7 ${disabled ? "text-gray-400" : "text-[#4A90E2]"
          }`}
      />
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-sm sm:text-[15px] lg:text-base font-black mb-1 text-gray-900">
        {title}
      </h3>
      <p className="text-xs sm:text-sm font-medium text-gray-500">
        {description}
      </p>
    </div>
  </motion.div>
);

const PricingPage = () => {

  const [pricing, setPricing] = useState({
    monthly_cost: "--",
    card_number: "—",
    cardholder_name: "—",
    telegram_admin: "#",
  });

  const [showCopySnackbar, setShowCopySnackbar] = useState(false);
  const copySnackbarTimeoutRef = useRef(null);

  const settings = useSettingsStore((state) => state.settings);
  const userProfile = useAuthStore((state) => state.userProfile);
  const calculateDiscount = () => {
    if (!settings?.premium_monthly_cost || !settings?.premium_old_price) {
      return 0;
    }
    const number = settings.premium_old_price - settings.premium_monthly_cost;
    const foiz = (number / settings.premium_old_price) * 100;
    return Math.floor(Math.abs(foiz));
  };

  const discountPercentage = calculateDiscount();

  useEffect(() => {
    if (settings) {
      setPricing({
        premium_old_price: settings.premium_old_price,
        monthly_cost: settings.premium_monthly_cost ?? 49000,
        card_number: settings.receiving_card_number ?? "—",
        cardholder_name: settings.cardholder_name ?? "—",
        telegram_admin: settings.telegram_admin_username ?? "#",
      });
    }
  }, [settings]);

  const copyToClipboard = useCallback(() => {
    const text = pricing.card_number?.replace(/\s/g, "") || "";
    if (!text || text === "—") return;
    navigator.clipboard.writeText(text).then(() => {
      if (copySnackbarTimeoutRef.current) clearTimeout(copySnackbarTimeoutRef.current);
      setShowCopySnackbar(true);
      copySnackbarTimeoutRef.current = setTimeout(() => {
        setShowCopySnackbar(false);
        copySnackbarTimeoutRef.current = null;
      }, 2500);
    });
  }, [pricing.card_number]);

  useEffect(() => {
    return () => {
      if (copySnackbarTimeoutRef.current) clearTimeout(copySnackbarTimeoutRef.current);
    };
  }, []);


  // Animation variants
  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.11,
      }
    }
  };

  const fadeUpVariant = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 250, damping: 30 } }
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 xl:p-12 font-sans flex items-center justify-center"
    >
      <div className="max-w-[1400px] mx-auto">
        {/* Back */}
        <motion.button
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.09, type: "spring", stiffness: 200, damping: 26 }}
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-[#4A90E2] font-black text-sm mb-4 sm:mb-6 lg:mb-8 uppercase"
        >
          <LuArrowLeft size={18} />
          Back to dashboard
        </motion.button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-12">
          {/* ================= LEFT ================= */}
          <motion.div
            className="lg:col-span-7 space-y-4 sm:space-y-6 lg:space-y-8 flex flex-col justify-center"
            variants={fadeUpVariant}
          >
            <motion.h1
              variants={fadeUpVariant}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-black text-gray-900 leading-[1.1]"
            >
              Maximize your band <br className="hidden sm:block" /> score potential.
            </motion.h1>

            <motion.div
              variants={fadeUpVariant}
              className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-6"
            >
              <motion.p
                variants={fadeUpVariant}
                className="text-sm sm:text-base lg:text-lg text-gray-500 font-medium max-w-xl lg:max-w-2xl"
              >
                Join thousands of students who achieved 7.5+ by practicing with
                our realistic simulations and detailed analytics.
              </motion.p>

              <motion.div
                variants={fadeUpVariant}
                className="shrink-0"
              >
                <div className="flex items-baseline gap-2">

                  <span className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-black text-gray-900">
                    {pricing.monthly_cost.toLocaleString()}
                  </span>
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-400">SO'M</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm sm:text-base lg:text-lg text-gray-500 font-medium text-end">
                    Early-access monthly
                  </span>
                  {pricing.premium_old_price && (
                    <>
                      {discountPercentage > 0 && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] sm:text-xs font-black rounded-full">
                          -{discountPercentage}%
                        </span>
                      )}
                      <span className="text-xs sm:text-sm text-gray-400 line-through">
                        {typeof pricing.premium_old_price === 'number'
                          ? pricing.premium_old_price.toLocaleString()
                          : pricing.premium_old_price}
                        {" "}
                        SO'M
                      </span>

                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>

            {/* FEATURES */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              <FeatureItem
                icon={LuLayoutDashboard}
                title="Unlimited Mock Tests"
                description="50+ Reading & Listening tests."
                index={0}
              />
              <FeatureItem
                icon={FaChartSimple}
                title="Advanced Analytics"
                description="Track progress and weak areas."
                index={1}
              />
              <FeatureItem
                icon={LuLightbulb}
                title="Detailed Explanations"
                description="In-depth breakdowns for every question."
                index={2}
              />
              <FeatureItem
                icon={LuZap}
                title="Distraction-Free"
                description="No ads. Real exam conditions."
                index={3}
              />
            </motion.div>
          </motion.div>

          {/* ================= RIGHT ================= */}
          <motion.div
            className="lg:col-span-5"
            initial={{ opacity: 0, x: 64 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.22, type: "spring", stiffness: 210, damping: 32 }}
          >
            <motion.div
              className="bg-white rounded-2xl lg:rounded-[28px] shadow-xl flex flex-col max-w-lg lg:max-w-none mx-auto lg:mx-0"
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.27, duration: 0.28, type: "spring", stiffness: 180 }}
            >
              <motion.div
                className="flex justify-between items-center p-4 lg:p-5 border-b"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.39, type: "spring", stiffness: 170, damping: 19 }}
              >
                <span className="text-xs font-black uppercase text-gray-500">
                  Account Status
                </span>
                <span className="px-2 py-1 bg-gray-200 text-[10px] font-black rounded">
                  ● {userProfile?.subscription_status === "premium" ? "PREMIUM" : "FREE"}
                </span>
              </motion.div>

              <motion.div
                className="flex-1 p-5 lg:p-6 xl:p-8 space-y-4 lg:space-y-5"
                initial="hidden"
                animate="show"
                variants={containerVariants}
              >
                <motion.div variants={fadeUpVariant}>
                  <h2 className="text-lg lg:text-xl font-black text-gray-900 mb-1">
                    Manual Payment
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Follow the steps below to activate your premium account.
                  </p>
                </motion.div>

                <motion.div
                  className="p-4 lg:p-5 bg-gray-100 rounded-xl border-dashed border-2 border-gray-400"
                  variants={fadeUpVariant}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] sm:text-xs font-black uppercase text-gray-600">
                      Local Bank Card
                    </span>
                    <div className="relative">
                      <AnimatePresence>
                        {showCopySnackbar && (
                          <motion.div
                            role="status"
                            aria-live="polite"
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            transition={{ duration: 0.25, type: "spring", stiffness: 300, damping: 22 }}
                            className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium whitespace-nowrap shadow-lg`}
                          >
                            Копирование успешно
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <button
                        onClick={copyToClipboard}
                        className="text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        <LuCopy size={18} />
                      </button>
                    </div>
                  </div>
                  <p className="font-mono tracking-widest text-base sm:text-lg lg:text-xl font-black text-gray-900 break-all">
                    {pricing.card_number}
                  </p>
                  <p className="text-xs sm:text-sm font-bold uppercase mt-2 text-gray-600">
                    {pricing.cardholder_name}
                  </p>
                </motion.div>

                <motion.p
                  variants={fadeUpVariant}
                  className="text-[10px] sm:text-[11px] text-center text-gray-400 font-bold uppercase"
                >
                  Supported banks: Any local bank app
                </motion.p>

                <motion.div
                  variants={fadeUpVariant}
                  className="flex gap-3 sm:gap-4 text-sm lg:text-base"
                >
                  <span className="size-6 sm:size-7 rounded-full bg-blue-50 text-[#4A90E2] flex items-center justify-center font-black shrink-0">
                    2
                  </span>
                  <p className="text-gray-600 font-bold">
                    Take a Screenshot
                    <br />
                    <span className="text-gray-400 font-medium text-sm">
                      Capture the successful transaction receipt.
                    </span>
                  </p>
                </motion.div>

                <motion.div
                  variants={fadeUpVariant}
                  className="flex gap-3 sm:gap-4 text-sm lg:text-base"
                >
                  <span className="size-6 sm:size-7 rounded-full bg-blue-50 text-[#4A90E2] flex items-center justify-center font-black shrink-0">
                    3
                  </span>
                  <p className="text-gray-600 font-bold">
                    Verify on Telegram
                    <br />
                    <span className="text-gray-400 font-medium text-sm">
                      Send the screenshot to our bot to upgrade.
                    </span>
                  </p>
                </motion.div>

                <a 
                  variants={fadeUpVariant}
                  href={`https://t.me/${pricing.telegram_admin}`}
                  target="_blank"
                  className="w-full bg-[#4A90E2] hover:bg-blue-600 text-white font-black py-3 sm:py-4 rounded-xl flex items-center justify-center gap-2 text-sm sm:text-base transition-colors"
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.04 }}
                >
                  <FiSend size={18} />
                  Send Screenshot on Telegram
                </a>
              </motion.div>
            </motion.div>
          </motion.div>
          {/* ================= END ================= */}
        </div>
      </div>
    </motion.div>
  );
};

export default PricingPage;