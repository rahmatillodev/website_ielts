import { Link } from "react-router-dom";
import { FaTelegramPlane, FaInstagram } from "react-icons/fa";
import { useSettingsStore } from "@/store/systemStore";

/**
 * The landing footer, from the prototype.
 *
 * The prototype declares a `1.4fr 1fr 1fr 1fr` grid but leaves the last three
 * columns empty — the link columns were never filled in. Rendering three empty
 * grid tracks would just push the brand block to a third of the width and leave
 * a visible void, so this renders the one authored column and the copyright
 * line, which is exactly what the prototype actually paints.
 *
 * The social buttons are the prototype's 30px bordered squares, wired to the
 * real channels from the settings store and hidden when a channel is unset.
 */
function LandingFooter() {
  const settings = useSettingsStore((state) => state.settings);
  const telegram = settings?.telegram_channel;
  const instagram = settings?.instagram_channel;

  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto w-full max-w-[1180px] px-6 pb-7 pt-14 sm:px-8">
        <div>
          <Link to="/" className="text-xl font-extrabold text-primary">
            EDU
          </Link>
          <p className="mt-3.5 max-w-[30ch] text-pretty text-[13px] leading-[1.65] text-gray-500">
            Computer-based IELTS practice that mirrors the real exam experience —
            from question types to timing.
          </p>

          <div className="mt-[18px] flex gap-2.5">
            {telegram && (
              <a
                href={`https://t.me/${telegram}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram"
                className="flex size-[30px] items-center justify-center rounded-lg border border-border text-gray-400 outline-none transition-colors duration-200 hover:border-primary hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <FaTelegramPlane size={13} aria-hidden="true" />
              </a>
            )}
            {instagram && (
              <a
                href={`https://www.instagram.com/${instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex size-[30px] items-center justify-center rounded-lg border border-border text-gray-400 outline-none transition-colors duration-200 hover:border-primary hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <FaInstagram size={13} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1180px] px-6 pb-7 text-center text-[12px] text-gray-500 sm:px-8">
        © {new Date().getFullYear()} EDU. All rights reserved.
      </div>
    </footer>
  );
}

export default LandingFooter;
