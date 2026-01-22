import React from "react"
import { FaArrowRight, FaStar } from "react-icons/fa"
import { Link } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"
const PremiumBanner = ({
  title = "Unlock 50+ Premium Reading Tests",
  description = "Get access to our complete library of academic and general training reading practice tests with detailed explanations and instant AI scoring.",
  buttonText = "Upgrade to Pro",
}) => {
  const authUser = useAuthStore((state) => state.userProfile);
  if (!authUser?.subscription_status) {
    return null;
  }
  return (
    <div className="relative overflow-hidden rounded-xl bg-black text-primary-foreground shadow-lg border border-primary/20">
      {/* Decorative shapes */}
      <div className="absolute right-0 top-0 h-full w-2/3 bg-white/10 skew-x-12 translate-x-12 pointer-events-none" />
      <div className="absolute -left-10 -bottom-10 h-32 w-32 bg-white/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-6 p-6 md:p-8 md:flex-row md:items-center md:justify-between">
        {/* LEFT */}
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            {/* BLACK BADGE START */}
            <div className="bg-white flex items-center gap-1.5 px-2.5 py-1 rounded-md shadow-md border border-white/10">
              <FaStar className="text-yellow-400 text-[10px]" />
              <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">
                Premium Access
              </span>
            </div>
            {/* BLACK BADGE END */}
          </div>

          <h3 className="text-xl md:text-2xl font-semibold mb-2">
            {title}
          </h3>

          <p className="text-sm md:text-base opacity-90 leading-relaxed">
            {description}
          </p>
        </div>

        {/* RIGHT */}
        <div className="shrink-0">
          <Link
            to="/pricing"
            className="w-full md:w-auto bg-white text-yellow-400 font-semibold px-8 py-3.5 rounded-xl shadow-xl hover:bg-gray-50 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
          >
             {buttonText} <FaArrowRight className="text-yellow-400 text-[16px] ml-1 mb-0.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default PremiumBanner