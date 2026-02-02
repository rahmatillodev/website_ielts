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
import { clearReadingPracticeData, loadReadingPracticeData, saveReadingResultData } from "@/store/LocalStorage/readingStorage";

export default function FinishModal({ isOpen, onClose, link, testId, onSubmit, loading = false }) {
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      if (onSubmit) {
        const result = await onSubmit();
        if (result && result.success !== false) {
          onClose();
          navigate(link);
        }
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
        navigate(link);
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('An error occurred while submitting the test. Please try again.');
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