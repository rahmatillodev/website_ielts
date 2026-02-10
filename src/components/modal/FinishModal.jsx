import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { clearReadingPracticeData, loadReadingPracticeData, saveReadingResultData } from "@/store/LocalStorage/readingStorage";

export default function FinishModal({ isOpen, onClose, link, testId, onSubmit, loading = false, isMockTest = false }) {
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      if (onSubmit) {
        const result = await onSubmit();
        // Only navigate if submission was explicitly successful
        if (result && result.success === true) {
          onClose();
          
          // For mock test, show "Saved" toast and don't navigate
          if (isMockTest) {
            toast.success('Saved');
            // Don't navigate - let the parent component handle the transition
          } else {
            navigate(link);
          }
        } else if (result && result.success === false) {
          // Don't navigate on failure, let the user see the error
          console.error('Submission failed:', result.error);
          // The error is already handled in the submit function, just don't navigate
        }
        // If result is undefined or doesn't have success property, don't navigate
      } else {
        if (testId) {
          const practiceData = loadReadingPracticeData(testId);
          if (practiceData) {
            const elapsedTime = practiceData.startTime
              ? Math.floor((Date.now() - practiceData.startTime) / 1000)
              : 0;

            saveReadingResultData(testId, {
              ...practiceData,
              elapsedTime,
            });
          }
          clearReadingPracticeData(testId);
        }
        onClose();
        
        // For mock test, show "Saved" toast and don't navigate
        if (isMockTest) {
          toast.success('Saved');
        } else {
          navigate(link);
        }
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      // Don't navigate on error, let the user see what happened
      // The error is already logged, and the modal will stay open
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          {/* Sarlavha o'zgartirildi */}
          <DialogTitle>Finish Test?</DialogTitle>
        </DialogHeader>
        {/* Matn ko'rinishi o'zgartirildi */}
        <div className="py-2">
          <p className="text-base text-gray-700 dark:text-gray-300">
            Are you sure you want to finish the test?
          </p>
          <p className="text-sm text-gray-500 mt-1">
            You can still go back and review your answers if you have time left.
          </p>
        </div>
        <DialogFooter className="flex gap-2">
          {/* Davom etish tugmasi */}
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Continue Test
          </Button>
          {/* Yakunlash tugmasi */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Submitting...' : 'Yes, Finish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}