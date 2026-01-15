import * as React from "react";
import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCw, X } from "lucide-react";

export default function NetworkModal({ isOpen }) {
  const handleRetry = () => {
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50" />
      
      {/* Modal */}
      <div className="relative z-50 w-full max-w-[425px] mx-4">
        <div className="bg-white dark:bg-gray-950 rounded-lg p-6 shadow-lg">
          {/* Заголовок и иконка */}
          <div className="flex flex-col items-center mb-6">
            <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
              <WifiOff className="h-8 w-8 text-gray-600 dark:text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Connection Lost
            </h2>
          </div>
          
          {/* Контент */}
          <div className="space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
              You're currently offline. Please check your internet connection and try again.
            </p>
            
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">No internet connection</span>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Some features may be unavailable</span>
              </div>
            </div>
          </div>

          {/* Кнопка */}
          <div className="flex justify-center mt-8">
            <Button
              className="flex items-center justify-center gap-2 min-w-[200px] cursor-pointer"
              onClick={handleRetry}
            >
              <RefreshCw className="h-4 w-4" />
              Retry Connection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}