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
import { useAppearance } from "@/contexts/AppearanceContext";

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Exit Test", 
  description = "Are you sure you want to exit? Your progress may be lost.",
  cancelLabel = "Stay",
  confirmLabel = "Yes, Leave",
  icon: Icon = FaArrowLeft,
  iconBgColor = "bg-orange-50",
  iconColor = "text-orange-500"
}) => {
  const { themeColors } = useAppearance();
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="rounded-[24px] max-w-[400px]" style={{ backgroundColor: themeColors.background }}>
        <AlertDialogHeader className="flex flex-col items-center text-center"
         style={{
          backgroundColor: themeColors.background,
         }}
        >
          <div className={`size-16 ${iconBgColor} ${iconColor} rounded-full flex items-center justify-center mb-4`}>
            <Icon size={30} />
          </div>
          <AlertDialogTitle className="text-xl font-black text-gray-900" style={{ color: themeColors.text }}>
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-500 font-medium pt-2" style={{ color: themeColors.text }}>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex gap-3 sm:justify-center pt-4">
          <AlertDialogCancel 
            onClick={onClose}
            className="flex-1 rounded-xl font-semibold hover:bg-gray-50 h-12 border border-gray-300"
            style={{
              backgroundColor: themeColors.background,
              color: themeColors.text,
            }}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="flex-1 rounded-xl font-semibold bg-blue-500 hover:bg-blue-600 text-white border-none h-12"
           
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmModal;

