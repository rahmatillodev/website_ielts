import React, { useState, useEffect } from "react";
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

/* ================= Feature Item ================= */
const FeatureItem = ({ icon: Icon, title, description, disabled = false }) => (
  <div
    className={`flex gap-3 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm ${
      disabled ? "opacity-50" : ""
    }`}
  >
    <div
      className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
        disabled ? "bg-gray-100" : "bg-[#F0F7FF]"
      }`}
    >
      <Icon
        className={`size-5 ${
          disabled ? "text-gray-400" : "text-[#4A90E2]"
        }`}
      />
    </div>
    <div className="flex-1">
      <h3 className="text-[15px] font-black mb-1 text-gray-900">
        {title}
      </h3>
      <p className="text-xs font-medium text-gray-500">
        {description}
      </p>
    </div>
  </div>
);

const LandingPricing = () => {

  const [pricing, setPricing] = useState({
    monthly_cost: 49000,
    card_number: "—",
    cardholder_name: "—",
    telegram_admin: "#",
  });

  const [loading, setLoading] = useState(true);

 
  const settings = useSettingsStore((state) => state.settings);


  console.log(settings?.cardholder_name);
  console.log(settings?.receiving_card_number);
  console.log(settings?.premium_monthly_cost);
  console.log(settings?.telegram_admin_username);
  console.log(settings?.support_link);
  console.log(settings?.premium_old_price);

  const number = settings?.premium_monthly_cost - settings?.premium_old_price;
  const foiz = number / settings.premium_old_price * 100


  useEffect(() => {
    if (settings) {
      setPricing({
        premium_old_price: settings.premium_old_price,
        monthly_cost: settings.premium_monthly_cost ?? 49000,
        card_number: settings.receiving_card_number ?? "—",
        cardholder_name: settings.cardholder_name ?? "—",
        telegram_admin: settings.telegram_admin_username ?? "#",
      });

      setLoading(false);
    }
  }, [settings]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(
      pricing.card_number.replace(/\s/g, "")
    );
  };

  const handleTelegramRedirect = () => {
    window.open(pricing.telegram_admin, "_blank");
  };

  return (
    <div className="h-screen overflow-hidden bg-[#F8FAFC] p-4 sm:p-6 lg:p-12 font-sans">
      <div className="max-w-[1400px] mx-auto h-full">
        {/* Back */}
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-[#4A90E2] font-black text-sm mb-6 uppercase"
        >
          <LuArrowLeft size={18} />
          Back to dashboard
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100%-48px)]">
          {/* ================= LEFT ================= */}
          <div className="lg:col-span-7 space-y-6">
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black text-gray-900 leading-[1.1]">
              Maximize your band <br /> score potential.
            </h1>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <p className="text-base text-gray-500 font-medium max-w-xl">
                Join thousands of students who achieved 7.5+ by practicing with
                our realistic simulations and detailed analytics.
              </p>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl xl:text-6xl font-black text-gray-900">
                    {pricing.monthly_cost.toLocaleString()}
                  </span>
                  <span className="text-xl font-bold text-gray-400">UZS</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 line-through">
                    
                      {pricing.premium_old_price}
                    {" "}
                    UZS
                  </span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-black rounded-full">
                    {Math.floor(foiz)}%
                  </span>
                </div>
              </div>
            </div>

            {/* FEATURES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FeatureItem
                icon={LuLayoutDashboard}
                title="Unlimited Mock Tests"
                description="50+ Reading & Listening tests."
              />
              <FeatureItem
                icon={FaChartSimple}settings
                title="Advanced Analytics"
                description="Track progress and weak areas."
              />
              <FeatureItem
                icon={LuLightbulb}
                title="Detailed Explanations"
                description="In-depth breakdowns for every question."
                disabled
              />
              <FeatureItem
                icon={LuZap}
                title="Distraction-Free"
                description="No ads. Real exam conditions."
                disabled
              />
            </div>
          </div>

          {/* ================= RIGHT ================= */}
          <div className="lg:col-span-5 h-full">
            <div className="h-full bg-white rounded-[28px] shadow-xl flex flex-col">
              <div className="flex justify-between items-center p-4 border-b">
                <span className="text-xs font-black uppercase text-gray-500">
                  Account Status
                </span>
                <span className="px-2 py-1 bg-gray-200 text-[10px] font-black rounded">
                  ● FREE
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                  <h2 className="font-black text-gray-900">
                    Manual Payment
                  </h2>
                  <p className="text-sm text-gray-500">
                    Follow the steps below to activate your premium account.
                  </p>
                </div>

                <div className="p-4 bg-gray-100 rounded-xl border-dashed border-2 border-gray-400">
                  <div className="flex justify-between mb-3">
                    <span className="text-[10px] font-black uppercase text-gray-600">
                      Local Bank Card
                    </span>
                    <button onClick={copyToClipboard}>
                      <LuCopy />
                    </button>
                  </div>

                  <p className="font-mono tracking-widest text-lg font-black text-gray-900">
                    {pricing.card_number}
                  </p>
                  <p className="text-xs font-bold uppercase mt-1 text-gray-600">
                    {pricing.cardholder_name}
                  </p>
                </div>

                <p className="text-[11px] text-center text-gray-400 font-bold uppercase">
                  Supported banks: Any local bank app
                </p>

                <div className="flex gap-3 text-sm">
                  <span className="size-6 rounded-full bg-blue-50 text-[#4A90E2] flex items-center justify-center font-black">
                    2
                  </span>
                  <p className="text-gray-600 font-bold">
                    Take a Screenshot
                    <br />
                    <span className="text-gray-400 font-medium">
                      Capture the successful transaction receipt.
                    </span>
                  </p>
                </div>

                <div className="flex gap-3 text-sm">
                  <span className="size-6 rounded-full bg-blue-50 text-[#4A90E2] flex items-center justify-center font-black">
                    3
                  </span>
                  <p className="text-gray-600 font-bold">
                    Verify on Telegram
                    <br />
                    <span className="text-gray-400 font-medium">
                      Send the screenshot to our bot to upgrade.
                    </span>
                  </p>
                </div>

                <button
                  onClick={handleTelegramRedirect}
                  className="w-full bg-[#4A90E2] hover:bg-blue-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2"
                >
                  <FiSend />
                  Send Screenshot on Telegram
                </button>
              </div>
            </div>
          </div>
          {/* ================= END ================= */}
        </div>
      </div>
    </div>
  );
};

export default LandingPricing;
