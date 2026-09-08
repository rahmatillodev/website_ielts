import { X } from "lucide-react";

/**
 * Tells the student their premium has run out.
 *
 * Deliberately text and a close button, nothing else: there is no self-serve
 * renewal to link to, so an "Upgrade" button would lead nowhere and a support
 * link would be one more thing to keep correct. Whether it should appear at all
 * is decided by usePremiumExpiryNotice.
 */
export default function PremiumExpiredModal({ isOpen, onDismiss }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-expired-title"
    >
      <div className="fixed inset-0 bg-black/50" />

      <div className="relative z-50 w-full max-w-[425px] mx-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex items-start justify-between gap-3 p-4 border-b">
            <h2 id="premium-expired-title" className="text-lg font-semibold text-gray-900">
              Your premium has ended
            </h2>
            <button
              type="button"
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 shrink-0"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            <p className="text-sm text-gray-600">
              Your premium subscription has expired. Please contact your admin or teacher to
              continue.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
