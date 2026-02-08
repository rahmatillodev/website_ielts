import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Komponentlar o'zgardi
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAppearance } from "@/contexts/AppearanceContext";
import { Loader } from "lucide-react";

export default function WritingSuccessModal({ 
  isOpen, 
  onClose, 
  onDownloadPDF,
  pdfLoading = false,
  onGoToHistory,
}) {
  const navigate = useNavigate();
  const { themeColors } = useAppearance();

  const handleGoToWriting = () => {
    onClose();
    navigate("/writing");
  };

  const handleGoToHistory = () => {
    if (onGoToHistory) {
      onClose();
      onGoToHistory();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent 
        className="sm:max-w-[625px] p-12" 
        style={{ backgroundColor: themeColors.background }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle style={{ color: themeColors.text }}>
            Writing Saved Successfully!
          </AlertDialogTitle>
          <AlertDialogDescription style={{ color: themeColors.text }} className="text-base pt-4">
            Your writing is ready! You can download the PDF version or return to the writing page.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex flex-col gap-3 sm:flex-row mt-6">
          {/* Bekor qilish yoki yopish tugmasi o'rnida Download */}
          <Button 
            variant="outline" 
            onClick={onDownloadPDF}
            disabled={pdfLoading}
            className="flex-1 h-11"
            style={{ 
              borderColor: themeColors.border,
              color: themeColors.text 
            }}
          >
            {pdfLoading ? (
              <><Loader className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
            ) : (
              'Download PDF'
            )}
          </Button>

          {/* Asosiy harakat tugmasi */}
          <AlertDialogAction 
            onClick={handleGoToWriting}
            className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white border-none"
          >
            Go to Writing
          </AlertDialogAction>

          {/* History button - enabled when route is available */}
          <Button 
            onClick={handleGoToHistory}
            disabled={!onGoToHistory}
            variant="outline"
            className={`flex-1 h-11 ${!onGoToHistory ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ 
              borderColor: themeColors.border,
              color: themeColors.text 
            }}
          >
            Go to History
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}