import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import ComingSoonPage from "../ComingSoonPage";

const sections = [
  { id: "reading", title: "Reading", videoId: "VIDEO_ID_READING", desc: "Academic reading comprehension." },
  { id: "listening", title: "Listening", videoId: "VIDEO_ID_LISTENING", desc: "Audio understanding & details." },
  { id: "writing", title: "Writing", videoId: "VIDEO_ID_WRITING", desc: "Essay & task structures." },
  { id: "speaking", title: "Speaking", videoId: "VIDEO_ID_SPEAKING", desc: "Interview & fluency practice." },
];

const fullMockTest = {
  title: "Full Mock Test",
  videoId: "VIDEO_ID_FULL",
  desc: "Complete exam simulation covering all sections with real-time pressure."
};

const MockTestsPage = () => {

  return (
    <div>
      <ComingSoonPage title="Mock Tests Center" description="Master the exam with targeted section practice or a full-length simulation." type="mock" headerAction="/mock/select" headerActionText="Start Full Test" />
    </div>
  )
  const navigate = useNavigate();
  const [videoModal, setVideoModal] = useState({ open: false, title: "", videoId: "" });

  const openAboutModal = (title, videoId) => {
    setVideoModal({ open: true, title, videoId });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 md:p-8 lg:p-12">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="text-center mb-8 max-w-2xl"
      >
        <h1 className="text-3xl md:text-5xl font-extrabold mb-3 text-slate-900">Mock Tests Center</h1>
        <p className="text-gray-500 text-base md:text-lg">
          Master the exam with targeted section practice or a full-length simulation.
        </p>
      </motion.div>

      {/* 1. Katta Card (Hero Section) */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        className="w-full max-w-7xl mb-6"
      >
        <Card className="overflow-hidden border-none shadow-xl bg-white">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row">
              <div className="p-8 md:p-12 flex-1 flex flex-col justify-center">
                <span className="text-blue-600 font-bold tracking-widest uppercase text-sm mb-2">Professional Mode</span>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">{fullMockTest.title}</h2>
                <p className="text-gray-600 text-lg mb-8 max-w-xl leading-relaxed">{fullMockTest.desc}</p>
                <div className="flex flex-wrap gap-4">
                  <Button 
                    size="lg"
                    variant="outline" 
                    className="px-8 border-2 hover:bg-slate-50"
                    onClick={() => openAboutModal(fullMockTest.title, fullMockTest.videoId)}
                  >
                    About this test
                  </Button>
                  <Button 
                    size="lg"
                    className="px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200" 
                    onClick={() => navigate('/mock/select')}
                  >
                    Start Full Test
                  </Button>
                </div>
              </div>
              <div className="hidden lg:flex w-1/3 bg-blue-600 items-center justify-center p-12 text-white">
                <div className="text-center">
                  <div className="text-6xl font-bold mb-2">100%</div>
                  <p className="opacity-80 uppercase tracking-tighter">Full Simulation</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 2. Pastdagi 4 ta Card (Yonma-yon) */}
      <div className="w-full max-w-7xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {sections.map((section, index) => (
          <motion.div 
            key={section.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full hover:border-blue-300 transition-all duration-300 group shadow-sm bg-white">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="mb-4 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {section.title[0]}
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-800">{section.title}</h3>
                <p className="text-gray-500 text-sm mb-6 flex-grow leading-relaxed">
                  {section.desc}
                </p>
                <Button 
                  variant="ghost" 
                  className="w-full bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-200"
                  onClick={() => openAboutModal(section.title, section.videoId)}
                >
                  About Section
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Video Modal */}
      <Dialog open={videoModal.open} onOpenChange={(val) => setVideoModal({ ...videoModal, open: val })}>
        <DialogContent className="max-w-4xl p-4 overflow-hidden border-none">
          <DialogHeader className="p-4 bg-white border-b">
            <DialogTitle className="text-xl">{videoModal.title}</DialogTitle>
            <DialogDescription className="text-gray-500">This is a video description</DialogDescription>
          </DialogHeader>
          <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${videoModal.videoId}?autoplay=1`}
              title={videoModal.title}
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MockTestsPage;