import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

const STORAGE_KEY = "analytics_warning_seen";

const AnalyticsWarningModal = ({ isOpen, onClose }) => {
  const handleGotIt = () => {
    // Mark as seen in localStorage
    localStorage.setItem(STORAGE_KEY, "true");
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="rounded-[24px] max-w-[400px]">
        <AlertDialogHeader className="flex flex-col items-center text-center">
          <div className="size-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={30} />
          </div>
          <AlertDialogTitle className="text-xl font-black text-gray-900">
            Limited Analytics Data
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-500 font-medium pt-2">
            You need to complete at least 5 practice tests to see comprehensive analytics and insights. Keep practicing to unlock detailed performance tracking!
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex gap-3 sm:justify-center pt-4">
          <AlertDialogAction 
            onClick={handleGotIt}
            className="flex-1 rounded-xl font-semibold bg-blue-500 hover:bg-blue-600 text-white border-none h-12"
          >
            Got it
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Helper function to check if warning has been seen
export const hasSeenAnalyticsWarning = () => {
  return localStorage.getItem(STORAGE_KEY) === "true";
};

export default AnalyticsWarningModal;

