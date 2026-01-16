import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LuCheck, LuCopy, LuLock, LuX } from "react-icons/lu";
import supabase from "@/lib/supabase";

const PricingPage = () => {
  const navigate = useNavigate();
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [premiumCost, setPremiumCost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("system_settings")
          .select("receiving_card_number, cardholder_name, premium_monthly_cost")
          .single();

        if (error) throw error;

        if (data) {
          setCardNumber(data.receiving_card_number || "");
          setCardHolder(data.cardholder_name || "");
          setPremiumCost(data.premium_monthly_cost);
        }
      } catch (error) {
        console.error("Error fetching system settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const copyToClipboard = () => {
    if (cardNumber) {
      navigator.clipboard.writeText(cardNumber.replace(/\s/g, ""));
      alert("Card number copied!");
    }
  };

  const handleClose = () => {
    // Check if there's browser history to go back
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Otherwise redirect to landing page
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-8 lg:px-10 lg:py-10 font-sans">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
          {/* LEFT: Marketing / Offer */}
          <section className="pt-2 lg:pt-4 flex flex-col">
            <div className="max-w-lg flex-1 flex flex-col">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#E8F2FF] text-[#1D4ED8] rounded-full text-[11px] font-black uppercase tracking-widest border border-blue-100">
                <span className="size-2 rounded-full bg-[#1D4ED8]" />
                Premium Access
              </span>

              <h1 className="mt-5 text-4xl sm:text-5xl font-black text-gray-900 leading-[1.05] tracking-tight">
                Maximize your band <br className="hidden sm:block" />
                score.
              </h1>

              <p className="mt-4 text-sm sm:text-base text-gray-500 font-medium leading-relaxed">
                Join 20,000+ students who achieved 7.5+ with realistic
                simulations and detailed analytics.
              </p>

              <ul className="mt-6 space-y-3 text-sm font-semibold text-gray-700">
                <li className="flex items-center gap-3">
                  <span className="size-6 rounded-full bg-blue-50 flex items-center justify-center">
                    <LuCheck className="text-[#1D4ED8]" size={14} />
                  </span>
                  Unlimited Mock Tests (50+)
                </li>
                <li className="flex items-center gap-3">
                  <span className="size-6 rounded-full bg-blue-50 flex items-center justify-center">
                    <LuCheck className="text-[#1D4ED8]" size={14} />
                  </span>
                  Detailed Explanations
                </li>
                <li className="flex items-center gap-3">
                  <span className="size-6 rounded-full bg-blue-50 flex items-center justify-center">
                    <LuCheck className="text-[#1D4ED8]" size={14} />
                  </span>
                  Advanced Analytics
                </li>
                <li className="flex items-center gap-3">
                  <span className="size-6 rounded-full bg-blue-50 flex items-center justify-center">
                    <LuCheck className="text-[#1D4ED8]" size={14} />
                  </span>
                  Ad-Free Experience
                </li>
              </ul>

              <div className="mt-10 lg:mt-auto pt-6 border-t border-gray-200">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400">
                  LIMITED OFFER
                </p>
                <div className="mt-2 flex items-end gap-3">
                  <span className="text-4xl sm:text-5xl font-black text-gray-900 leading-none">
                    {loading ? (
                      "Loading..."
                    ) : premiumCost !== null ? (
                      `Only $${premiumCost}`
                    ) : (
                      "Only $29"
                    )}
                  </span>
                  <span className="text-base sm:text-lg font-bold text-gray-400 line-through mb-1">
                    $49
                  </span>
                </div>
                <span className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                  <span className="size-2 rounded-full bg-green-600" />
                  {loading ? (
                    "Loading..."
                  ) : premiumCost !== null ? (
                    `You save $${49 - premiumCost} today`
                  ) : (
                    "You save $20 today"
                  )}
                </span>
              </div>
            </div>
          </section>

          {/* RIGHT: Manual Payment */}
          <section className="lg:-mt-4 flex flex-col">
            <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6 sm:p-8 flex-1 flex flex-col">
              {/* Header */}
              <header className="flex items-center justify-between">
                <h2 className="text-xl font-black text-gray-900 leading-none">
                  Manual Payment
                </h2>
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm hover:shadow-md"
                  aria-label="Close"
                >
                  <LuX size={18} className="text-gray-600" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                    CLOSE
                  </span>
                </button>
              </header>
              <p className="mt-2 text-sm text-gray-500 font-medium">
                Follow these 3 simple steps to activate your premium account
                immediately.
              </p>

              {/* Step 1 */}
              <div className="mt-6">
                <div className="flex items-center justify-between gap-3 text-[11px] font-black uppercase tracking-widest text-gray-400">
                  <span>STEP 1: TRANSFER</span>
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-[#1D4ED8] border border-blue-100">
                    ANY BANKING APP
                  </span>
                </div>

                <div className="mt-3 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/40 px-6 py-8 min-h-[120px] flex items-center">
                  <div className="flex items-center justify-between gap-4 w-full">
                    <div className="min-w-0">
                      <p className="font-mono text-xl sm:text-2xl font-black tracking-[0.2em] text-gray-900 whitespace-nowrap">
                        {loading ? "Loading..." : cardNumber || "Card number not available"}
                      </p>
                      <p className="mt-2 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                        {loading ? "Loading..." : cardHolder || "Cardholder name not available"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={copyToClipboard}
                      disabled={loading || !cardNumber}
                      className="shrink-0 inline-flex items-center justify-center size-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Copy card number"
                    >
                      <LuCopy size={16} className="text-[#1D4ED8]" />
                    </button>
                  </div>
                </div>

                <p className="mt-2 text-[11px] font-semibold text-gray-400 uppercase tracking-widest text-center">
                  Supported banks: any local bank app
                </p>
              </div>

              {/* Steps 2-3 */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <span className="size-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-black">
                      2
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-gray-900">
                        Screenshot
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        Capture the transaction receipt.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <span className="size-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-black">
                      3
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-gray-900">Verify</p>
                      <p className="text-xs text-gray-500 font-medium">
                        Send the photo to our Telegram bot.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="mt-6 lg:mt-auto w-full rounded-2xl bg-[#1D4ED8] hover:bg-blue-700 text-white font-black py-4 text-sm transition-colors"
              >
                Send Screenshot on Telegram
              </button>

              <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-gray-400 font-medium">
                <LuLock size={12} />
                <span>Secure transaction processed via Telegram</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
