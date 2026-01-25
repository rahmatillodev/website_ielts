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
import { clearReadingPracticeData, loadReadingPracticeData, saveReadingResultData } from "@/store/LocalStorage/readingStorage";

export default function FinishModal({ isOpen, onClose, link, testId, onSubmit,loading = false }) {
  const navigate = useNavigate();
  
  const handleSubmit = async () => {
    try {
      // If onSubmit callback is provided, use it (this will handle test submission)
      if (onSubmit) {
        const result = await onSubmit();
        // Only navigate if submission was successful
        if (result && result.success !== false) {
          onClose(); // Close modal first
          navigate(link);
        } else {
          // Show error message if submission failed
          if (result && result.error) {
            alert(`Failed to submit test: ${result.error}`);
          } else {
            alert('Failed to submit test. Please try again.');
          }
          // Modal stays open so user can try again
        }
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
        onClose(); // Close modal
        navigate(link);
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('An error occurred while submitting the test. Please try again.');
      // Don't navigate on error, modal stays open
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Test Finished</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          You have completed the test! Your answers have been submitted
          successfully.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Submitting...' : 'Submit'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
