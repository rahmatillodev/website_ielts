import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Mic, BookOpen, Info, DollarSign, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatISO } from "date-fns";

// Components
import TestCalendar from "./components/TestCalendar";
import TimeSlotSelector from "./components/TimeSlotSelector";
import CenterInfoCard from "./components/CenterInfoCard";
import CenterMapCard from "./components/CenterMapCard";

// Utils
import { fetchAvailableSlots, fetchAvailableDates } from "./utils/mockTestApi";
import PaymentBotNotice from "./components/PaymentBotNotice";

// Center information data - will be fetched from API later
const centerInfo = {
  name: "Mock Test Center",
  address: "123 Education Street, Tashkent, Uzbekistan",
  phone: "+998 90 123 45 67",
  description: "Our mock test center provides a real exam environment with professional supervision, proper timing, and authentic test conditions to help you prepare for your actual exam.",
  mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d158857.839886527!2d-0.2664029401218982!3d51.52873980508681!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47d8a00baf21de75%3A0x52963a5addd52a99!2sLondon%2C%20Buyuk%20Britaniya!5e0!3m2!1suz!2s!4v1770445848812!5m2!1suz!2s",
};

// Pricing information - will be fetched from API later
const pricingInfo = {
  fullMockTest: 500000, // Price in UZS
  currency: "UZS",
};

const MockCenterPage = () => {
  const navigate = useNavigate();

  // Speaking test date/time selection
  const [speakingDate, setSpeakingDate] = useState(null);
  const [speakingSlot, setSpeakingSlot] = useState(null);
  const [speakingCurrentMonth, setSpeakingCurrentMonth] = useState(new Date().getMonth());
  const [speakingCurrentYear, setSpeakingCurrentYear] = useState(new Date().getFullYear());

  // Reading/Writing/Listening test date/time selection
  const [rwlDate, setRwlDate] = useState(null);
  const [rwlSlot, setRwlSlot] = useState(null);
  const [rwlCurrentMonth, setRwlCurrentMonth] = useState(new Date().getMonth());
  const [rwlCurrentYear, setRwlCurrentYear] = useState(new Date().getFullYear());

  const [showConfirmation, setShowConfirmation] = useState(false);

  // Time slots state
  const [speakingSlots, setSpeakingSlots] = useState([]);
  const [rwlSlots, setRwlSlots] = useState([]);
  const [loadingSpeakingSlots, setLoadingSpeakingSlots] = useState(false);
  const [loadingRwlSlots, setLoadingRwlSlots] = useState(false);

  // Available dates state (dates that have slots)
  const [speakingAvailableDates, setSpeakingAvailableDates] = useState(new Set());
  const [rwlAvailableDates, setRwlAvailableDates] = useState(new Set());
  const [loadingSpeakingDates, setLoadingSpeakingDates] = useState(false);
  const [loadingRwlDates, setLoadingRwlDates] = useState(false);

  // Calendar state
  const today = new Date();

  // Fetch available dates when month/year changes
  useEffect(() => {
    const loadSpeakingDates = async () => {
      setLoadingSpeakingDates(true);
      try {
        const dates = await fetchAvailableDates(speakingCurrentMonth, speakingCurrentYear, "speaking");
        const dateSet = new Set(dates.map(d => formatISO(d, { representation: 'date' })));
        setSpeakingAvailableDates(dateSet);
      } catch (error) {
        console.error("Error fetching speaking available dates:", error);
        setSpeakingAvailableDates(new Set());
      } finally {
        setLoadingSpeakingDates(false);
      }
    };

    loadSpeakingDates();
  }, [speakingCurrentMonth, speakingCurrentYear]);

  useEffect(() => {
    const loadRwlDates = async () => {
      setLoadingRwlDates(true);
      try {
        const dates = await fetchAvailableDates(rwlCurrentMonth, rwlCurrentYear, "readingWritingListening");
        const dateSet = new Set(dates.map(d => formatISO(d, { representation: 'date' })));
        setRwlAvailableDates(dateSet);
      } catch (error) {
        console.error("Error fetching RWL available dates:", error);
        setRwlAvailableDates(new Set());
      } finally {
        setLoadingRwlDates(false);
      }
    };

    loadRwlDates();
  }, [rwlCurrentMonth, rwlCurrentYear]);

  // Fetch time slots when date is selected
  useEffect(() => {
    if (!speakingDate) {
      setSpeakingSlots([]);
      setSpeakingSlot(null);
      return;
    }

    const loadSlots = async () => {
      setLoadingSpeakingSlots(true);
      try {
        const slots = await fetchAvailableSlots(speakingDate, "speaking");
        setSpeakingSlots(slots);
        // Clear selected slot if it's no longer available
        if (speakingSlot && !slots.find(s => s.time === speakingSlot && s.status === "available")) {
          setSpeakingSlot(null);
        }
      } catch (error) {
        console.error("Error fetching speaking slots:", error);
        setSpeakingSlots([]);
      } finally {
        setLoadingSpeakingSlots(false);
      }
    };

    loadSlots();
  }, [speakingDate]);

  useEffect(() => {
    if (!rwlDate) {
      setRwlSlots([]);
      setRwlSlot(null);
      return;
    }

    const loadSlots = async () => {
      setLoadingRwlSlots(true);
      try {
        const slots = await fetchAvailableSlots(rwlDate, "readingWritingListening");
        setRwlSlots(slots);
        // Clear selected slot if it's no longer available
        if (rwlSlot && !slots.find(s => s.time === rwlSlot && s.status === "available")) {
          setRwlSlot(null);
        }
      } catch (error) {
        console.error("Error fetching RWL slots:", error);
        setRwlSlots([]);
      } finally {
        setLoadingRwlSlots(false);
      }
    };

    loadSlots();
  }, [rwlDate]);

  // Navigation handlers for Speaking calendar
  const handleSpeakingPreviousMonth = () => {
    if (speakingCurrentMonth === 0) {
      setSpeakingCurrentMonth(11);
      setSpeakingCurrentYear(speakingCurrentYear - 1);
    } else {
      setSpeakingCurrentMonth(speakingCurrentMonth - 1);
    }
  };

  const handleSpeakingNextMonth = () => {
    if (speakingCurrentMonth === 11) {
      setSpeakingCurrentMonth(0);
      setSpeakingCurrentYear(speakingCurrentYear + 1);
    } else {
      setSpeakingCurrentMonth(speakingCurrentMonth + 1);
    }
  };

  // Navigation handlers for RWL calendar
  const handleRwlPreviousMonth = () => {
    if (rwlCurrentMonth === 0) {
      setRwlCurrentMonth(11);
      setRwlCurrentYear(rwlCurrentYear - 1);
    } else {
      setRwlCurrentMonth(rwlCurrentMonth - 1);
    }
  };

  const handleRwlNextMonth = () => {
    if (rwlCurrentMonth === 11) {
      setRwlCurrentMonth(0);
      setRwlCurrentYear(rwlCurrentYear + 1);
    } else {
      setRwlCurrentMonth(rwlCurrentMonth + 1);
    }
  };

  // Handle date selection
  const handleSpeakingDateClick = (date) => {
    setSpeakingDate(date);
    setSpeakingSlot(null); // Clear slot when date changes
  };

  const handleRwlDateClick = (date) => {
    setRwlDate(date);
    setRwlSlot(null); // Clear slot when date changes
  };

  const handleBookSlot = () => {
    if (speakingDate && speakingSlot && rwlDate && rwlSlot) {
      setShowConfirmation(true);
    }
  };

  return (
    <div className="w-full min-h-screen p-6 md:p-12">
      <div className="max-w-9xl mx-auto">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(`/mock/select`)}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Full Mock Test - Mock Center
          </h1>
          <p className="text-lg text-gray-600">
            Book your slot at our mock test center
          </p>
        </motion.div>

        {/* Flexible Scheduling Feature Info */}
       

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Right Side - Booking Section */}
          <div className="space-y-6 order-2 lg:order-1">
          
            {/* Speaking Test - Calendar */}
            <div className="grid lg:grid-cols-2 grid-cols-1 gap-6">


              {/* Reading/Writing/Listening Test - Calendar */}
              <div className="space-y-6">

                <TestCalendar
                  title="Reading, Writing & Listening"
                  icon={BookOpen}
                  iconColor="text-green-600"
                  selectedDate={rwlDate}
                  onDateSelect={handleRwlDateClick}
                  currentMonth={rwlCurrentMonth}
                  currentYear={rwlCurrentYear}
                  onPreviousMonth={handleRwlPreviousMonth}
                  onNextMonth={handleRwlNextMonth}
                  availableDates={rwlAvailableDates}
                  loadingDates={loadingRwlDates}
                  today={today}
                />

                {/* Reading/Writing/Listening Test - Time Slots */}
                <TimeSlotSelector
                  title="RWL Time Slot"
                  iconColor="text-green-600"
                  selectedDate={rwlDate}
                  selectedSlot={rwlSlot}
                  onSlotSelect={setRwlSlot}
                  slots={rwlSlots}
                  loading={loadingRwlSlots}
                />
              </div>

              <div className="space-y-6">
                <TestCalendar
                  title="Speaking Test"
                  icon={Mic}
                  iconColor="text-purple-600"
                  selectedDate={speakingDate}
                  onDateSelect={handleSpeakingDateClick}
                  currentMonth={speakingCurrentMonth}
                  currentYear={speakingCurrentYear}
                  onPreviousMonth={handleSpeakingPreviousMonth}
                  onNextMonth={handleSpeakingNextMonth}
                  availableDates={speakingAvailableDates}
                  loadingDates={loadingSpeakingDates}
                  today={today}
                />

                {/* Speaking Test - Time Slots */}
                <TimeSlotSelector
                  title="Speaking Time Slot"
                  iconColor="text-purple-600"
                  selectedDate={speakingDate}
                  selectedSlot={speakingSlot}
                  onSlotSelect={setSpeakingSlot}
                  slots={speakingSlots}
                  loading={loadingSpeakingSlots}
                />
              </div>
            </div>

            <PaymentBotNotice/>
            {/* Book Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <Button
                onClick={handleBookSlot}
                disabled={!speakingDate || !speakingSlot || !rwlDate || !rwlSlot}
                className={cn(
                  "w-full py-6 text-lg font-medium rounded-xl",
                  !speakingDate || !speakingSlot || !rwlDate || !rwlSlot
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600"
                )}
              >
                Book Slot
              </Button>
            </motion.div>
          </div>

          {/* Left Side - Center Info, Pricing, and Map */}
          <div className="space-y-6 order-1 lg:order-2">
          <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="rounded-2xl shadow-sm border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-1">
                  <Info className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span>Flexible Scheduling Feature</span>
                    <span className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                      NEW
                    </span>
                  </h3>
                  <div className="space-y-3">
                    <p className="text-gray-700 leading-relaxed">
                      With a <strong className="text-gray-900">single payment</strong>, you have the flexibility to complete your mock test in two parts:
                    </p>
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-blue-100">
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-gray-900 mb-1">Part 1: Reading, Writing & Listening</p>
                          <p className="text-sm text-gray-600">
                            Complete all three sections in one session on your chosen date and time.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-blue-100">
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-gray-900 mb-1">Part 2: Speaking Test</p>
                          <p className="text-sm text-gray-600">
                            Schedule your speaking test on the same day or come back at any time that suits you. Practice with our professional examiners.
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-3 italic">
                      * You can schedule both parts on the same day or split them across different dates - the choice is yours!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
            <CenterInfoCard centerInfo={centerInfo} />
            
            {/* Pricing Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="rounded-2xl shadow-sm border-2 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <DollarSign className="w-6 h-6 text-green-600" />
                    <h2 className="text-2xl font-semibold">Pricing</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-900">Full Mock Test</span>
                        <span className="text-2xl font-bold text-green-600">
                          {pricingInfo.fullMockTest.toLocaleString()} {pricingInfo.currency}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Includes Reading, Writing, Listening, and Speaking tests
                      </p>
                    </div>
                    <div className="pt-4 border-t space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>One-time payment for complete test</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Flexible scheduling - split into 2 parts</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Professional examiners for speaking test</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Real exam environment and conditions</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <CenterMapCard mapUrl={centerInfo.mapUrl} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockCenterPage;
