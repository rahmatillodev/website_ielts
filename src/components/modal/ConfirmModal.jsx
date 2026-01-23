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
import { FaArrowLeft } from "react-icons/fa";

const ConfirmModal = ({ isOpen, onClose, onConfirm, title = "Exit Test", description = "Are you sure you want to exit? Your progress may be lost." }) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="rounded-[24px] max-w-[400px]">
        <AlertDialogHeader className="flex flex-col items-center text-center">
          <div className="size-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-4">
            <FaArrowLeft size={30} />
          </div>
          <AlertDialogTitle className="text-xl font-black text-gray-900">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-500 font-medium pt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex gap-3 sm:justify-center pt-4">
          <AlertDialogCancel 
            onClick={onClose}
            className="flex-1 rounded-xl font-semibold border-gray-100 hover:bg-gray-50 h-12"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="flex-1 rounded-xl font-semibold bg-red-500 hover:bg-red-600 text-white border-none h-12"
          >
            Yes, Exit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmModal;

