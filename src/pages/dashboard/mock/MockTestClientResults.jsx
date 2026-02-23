import React, { useState } from 'react';
import parse from 'html-react-parser';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Headset,
  BookOpen,
  PenTool,
  Clock,
  CheckCircle2,
  Trophy,
  Printer,
  Mic,
} from "lucide-react";
import { Button } from '@/components/ui/button';
import { generateMockTestPDF } from '@/utils/mockTestPdf';
import { useSettingsStore } from "@/store/systemStore";
import { toast } from 'sonner';

const MockTestClientResults = ({
  client,
  results = { listening: null, reading: null, writing: null, speaking: null },
}) => {
  const [openItems, setOpenItems] = useState(["client"]);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const settings = useSettingsStore((state) => state.settings);

  const handleOpenChange = (values) => {
    setOpenItems(values);
  };

  const handlePrintPDF = async () => {
    if (!client) {
      toast.error('Client information is required to generate PDF');
      return;
    }

    setIsPdfLoading(true);
    try {
      await generateMockTestPDF(client, results, settings);
      toast.success('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsPdfLoading(false);
    }
  };

  const formatTime = (timeInSeconds) => {
    if (!timeInSeconds || timeInSeconds <= 0) return 'N/A';
    
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    
    return parts.join(' ');
  };

  const ResultAccordionItem = ({ value, title, item, icon: Icon }) => {
    const showQuestionStats = title !== "Writing" && title !== "Speaking";
    
    return (
      <AccordionItem value={value} className="border-none mb-4 bg-white rounded-xl shadow-sm overflow-hidden">
        <AccordionTrigger className="px-6 hover:no-underline hover:bg-gray-50/50 transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Icon size={20} />
            </div>
            <span className="font-bold text-gray-700 text-lg">{title}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6">
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {item ? (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase font-bold mb-1">Score</p>
                      <p className="text-xl font-black text-indigo-600">
                        {item.score?.toFixed(1) ?? 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase font-bold mb-1">Time Taken</p>
                      <div className="flex items-center gap-1 text-gray-700">
                        <Clock size={14} />
                        <span className="font-semibold">
                          {formatTime(item.time_taken)}
                        </span>
                      </div>
                    </div>
                    {showQuestionStats && (
                      <>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 uppercase font-bold mb-1">Questions</p>
                          <p className="font-semibold text-gray-700">
                            {item.total_questions ?? 'N/A'}
                          </p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <p className="text-xs text-green-600 uppercase font-bold mb-1">Correct</p>
                          <div className="flex items-center gap-1 text-green-700">
                            <CheckCircle2 size={14} />
                            <span className="font-semibold">
                              {item.correct_answers ?? 'N/A'}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Feedback Section */}
                  {item.feedback && (
                    <div className="relative mt-4 p-5 bg-blue-50/50 border-l-4 border-blue-500 rounded-r-xl">
                      <h4 className="text-blue-800 font-bold flex items-center gap-2 mb-2">
                        Feedback
                      </h4>
                      <div
                        className="text-sm leading-relaxed prose prose-sm  prose prose-slate max-w-none 
                        [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4
                        [&_li]:mb-2 
                        text-gray-800" 
                        data-selectable="true"
                      >
                        {parse(item.feedback)}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 text-center border-2 border-dashed border-gray-100 rounded-xl">
                  <p className="text-gray-400 text-sm italic">
                    No data available for this section
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </AccordionContent>
      </AccordionItem>
    );
  };

  const getStatusBadgeClass = (status) => {
    return status === 'completed'
      ? 'bg-green-100 text-green-700'
      : 'bg-blue-100 text-blue-700';
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              Mock Test Result Dashboard
            </h1>
            <p className="text-gray-500">Detailed performance analysis per module</p>
          </div>
          <div className="flex items-center gap-4">
            {client?.total_score && (
              <div className="bg-white shadow-sm border border-indigo-100 p-4 rounded-2xl flex items-center gap-4">
                <div className="bg-indigo-600 p-2 rounded-lg text-white">
                  <Trophy size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase">Overall Score</p>
                  <p className="text-2xl font-black text-indigo-600">
                    {client.total_score.toFixed(1)}
                  </p>
                </div>
              </div>
            )}
            <Button
              onClick={handlePrintPDF}
              disabled={isPdfLoading}
            >
              {isPdfLoading ? 'Generating...' : 'Print PDF'}
              <Printer className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </header>

        <Accordion
          type="multiple"
          value={openItems}
          onValueChange={handleOpenChange}
          className="space-y-4"
        >
          {client && (
            <AccordionItem value="client" className="border-none bg-white rounded-xl shadow-sm overflow-hidden">
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                    <User size={20} />
                  </div>
                  <span className="font-bold text-gray-700 text-lg">Client Information</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <span className="text-xs font-bold text-gray-400 uppercase block mb-1">
                      Status
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusBadgeClass(
                        client.status
                      )}`}
                    >
                      {client.status}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <span className="text-xs font-bold text-gray-400 uppercase block mb-1">
                      User Name
                    </span>
                    <span className="font-mono text-sm text-gray-600">
                      {client.full_name || 'N/A'}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <span className="text-xs font-bold text-gray-400 uppercase block mb-1">
                      User Email
                    </span>
                    <span className="font-mono text-sm text-gray-600">
                      {client.email || 'N/A'}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <span className="text-xs font-bold text-gray-400 uppercase block mb-1">
                      User Phone
                    </span>
                    <span className="font-mono text-sm text-gray-600">
                      {client.phone_number || 'N/A'}
                    </span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          <ResultAccordionItem
            value="listening"
            title="Listening"
            item={results.listening}
            icon={Headset}
          />
          <ResultAccordionItem
            value="reading"
            title="Reading"
            item={results.reading}
            icon={BookOpen}
          />
          <ResultAccordionItem
            value="writing"
            title="Writing"
            item={results.writing}
            icon={PenTool}
          />
          <ResultAccordionItem
            value="speaking"
            title="Speaking"
            item={results.speaking}
            icon={Mic}
          />
        </Accordion>
      </div>
    </div>
  );
};

export default MockTestClientResults;