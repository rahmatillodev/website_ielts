import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { clearReadingPracticeData, loadReadingPracticeData, saveReadingResultData } from "@/store/readingStorage";

export default function FinishModal({ isOpen, onClose, link, testId, onSubmit }) {
  const navigate = useNavigate();
  
  const handleSubmit = async () => {
    // If onSubmit callback is provided, use it (this will handle test submission)
    if (onSubmit) {
      await onSubmit();
    } else {
      // Legacy behavior: Save result data before clearing practice data
      if (testId) {
        const practiceData = loadReadingPracticeData(testId);
        if (practiceData) {
          // Calculate elapsed time
          const elapsedTime = practiceData.startTime 
            ? Math.floor((Date.now() - practiceData.startTime) / 1000)
            : 0;
          
          // Save to result storage
          saveReadingResultData(testId, {
            ...practiceData,
            elapsedTime,
          });
        }
        // Clear practice data
        clearReadingPracticeData(testId);
      }
    }
    navigate(link);
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Quiz Finished</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          You have completed the quiz! Your answers have been submitted
          successfully.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleSubmit}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
