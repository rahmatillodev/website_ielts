import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAppearance } from "@/contexts/AppearanceContext";
import { FaCheck } from "react-icons/fa";

const WritingFinishModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  loading = false
}) => {
  const { themeColors } = useAppearance();

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent 
        className="rounded-[24px] max-w-[400px]"
        style={{ backgroundColor: themeColors.background }}
      >
        <AlertDialogHeader className="flex flex-col items-center text-center">
          <div className="size-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4">
            <FaCheck size={30} />
          </div>
          <AlertDialogTitle 
            className="text-xl font-black"
            style={{ color: themeColors.text }}
          >
            Finish Writing?
          </AlertDialogTitle>
          <AlertDialogDescription 
            className="font-medium pt-2 text-center"
            style={{ color: themeColors.text, opacity: 0.8 }}
          >
            Are you sure you want to finish writing?<br />
            <span className="font-bold text-red-600">
              Your data will <u>not</u> be saved and you will <u>not</u> be able to write again.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex gap-3 sm:justify-center pt-4">
          <AlertDialogCancel 
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl font-semibold h-12"
            style={{ 
              borderColor: themeColors.border,
              color: themeColors.text,
              backgroundColor: 'transparent'
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl font-semibold bg-green-600 hover:bg-green-700 text-white border-none h-12 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Finish'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default WritingFinishModal;

