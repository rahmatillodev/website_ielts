import React from "react"
import { FaStar } from "react-icons/fa"

const PremiumBanner = ({
  title = "Unlock 50+ Premium Reading Tests",
  description = "Get access to our complete library of academic and general training reading practice tests with detailed explanations and instant AI scoring.",
  buttonText = "Upgrade to Pro",
  onAction,
}) => {
  return (
    <div className="relative overflow-hidden rounded-xl bg-primary text-primary-foreground shadow-lg">
      {/* Decorative shapes */}
      <div className="absolute right-0 top-0 h-full w-2/3 bg-white/10 skew-x-12 translate-x-12 pointer-events-none" />
      <div className="absolute -left-10 -bottom-10 h-32 w-32 bg-white/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-6 p-6 md:p-8 md:flex-row md:items-center md:justify-between">
        {/* LEFT */}
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="icon-filled text-yellow-300">
              <FaStar/>
            </span>
            <span className="text-xs font-bold uppercase tracking-wide opacity-90">
              Premium Access
            </span>
          </div>

          <h3 className="text-xl md:text-2xl font-bold mb-2">
            {title}
          </h3>

          <p className="text-sm md:text-base opacity-90">
            {description}
          </p>
        </div>

        {/* RIGHT */}
        <div className="shrink-0">
          <button
            onClick={onAction}
            className="w-full md:w-auto bg-white text-primary font-bold px-6 md:px-8 py-3 rounded-lg shadow hover:bg-white/90 hover:scale-105 transition-all"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PremiumBanner
