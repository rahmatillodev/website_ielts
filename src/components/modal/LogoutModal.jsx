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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LuLogOut } from "react-icons/lu";

const LogoutModal = ({ children, onConfirm }) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      
      <AlertDialogContent className="rounded-[24px] max-w-[400px]">
        <AlertDialogHeader className="flex flex-col items-center text-center">
          <div className="size-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
            <LuLogOut size={30} />
          </div>
          <AlertDialogTitle className="text-xl font-black text-gray-900">
            Confirm Log Out
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-500 font-medium pt-2">
            Are you sure you want to log out? You will need to login again to access your practice tests and analytics.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex gap-3 sm:justify-center pt-4">
          <AlertDialogCancel className="flex-1 rounded-xl font-semibold border-gray-100 hover:bg-gray-50 h-12">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="flex-1 rounded-xl font-semibold bg-red-500 hover:bg-red-600 text-white border-none h-12"
          >
            Yes, Log out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LogoutModal;