import * as React from "react";
import { RotateCw, X } from "lucide-react";

export const DISMISS_KEY = "rotation_modal_dismissed";

export default function RotationModal({ isOpen, onDismiss }) {
  const handleContinue = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    onDismiss();
  };

  const handleClose = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    onDismiss();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50" />
      
      {/* Modal */}
      <div className="relative z-50 w-full max-w-[425px] mx-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <RotateCw className="h-5 w-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Please Rotate Your Device
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              For the best experience, please rotate your device to landscape mode.
            </p>
            <p className="text-sm text-gray-600">
              This test is optimized for horizontal viewing on mobile devices.
            </p>
          </div>

          {/* Footer Button */}
          <div className="px-6 pb-6">
            <button
              onClick={handleContinue}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Continue Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
