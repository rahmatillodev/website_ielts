import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Phone, Building2, Calendar, Clock, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, format } from "date-fns";

const mockTypeNames = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
};

const mockPrices = {
  reading: 150000,
  listening: 150000,
  writing: 200000,
  speaking: 200000,
};

const timeSlots = [
  { time: "09:00", status: "available" },
  { time: "11:00", status: "booked" },
  { time: "14:00", status: "available" },
  { time: "16:00", status: "pending" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MockCenterPage = () => {
  const navigate = useNavigate();
  const { type } = useParams();
  const mockTypeName = mockTypeNames[type] || type;
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Calendar state
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  // Get all days for the calendar view (including previous/next month days)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(new Date(currentYear, currentMonth));
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth, currentYear]);

  // Check if a date should be disabled (past dates)
  const isDateDisabled = (date) => {
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    return dateStart < todayStart;
  };

  // Navigation handlers
  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Handle date selection
  const handleDateClick = (date) => {
    if (!isDateDisabled(date)) {
      setSelectedDate(date);
    }
  };

  const handleBookSlot = () => {
    if (selectedDate && selectedSlot) {
      setShowConfirmation(true);
    }
  };

  const getSlotStatusColor = (status) => {
    switch (status) {
      case "available":
        return "bg-green-100 border-green-300 text-green-700 hover:bg-green-200";
      case "booked":
        return "bg-red-100 border-red-300 text-red-700 cursor-not-allowed opacity-60";
      case "pending":
        return "bg-yellow-100 border-yellow-300 text-yellow-700 hover:bg-yellow-200";
      default:
        return "bg-gray-100 border-gray-300 text-gray-700";
    }
  };

  return (
    <div className="w-full min-h-screen p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(`/mock/${type}`)}
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
            {mockTypeName} Test - Mock Center
          </h1>
          <p className="text-lg text-gray-600">
            Book your slot at our mock test center
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side - Center Info and Map */}
          <div className="lg:col-span-2 space-y-6">
            {/* Center Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Building2 className="w-6 h-6 text-blue-600" />
                    <h2 className="text-2xl font-semibold">Mock Test Center</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-500 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">Address</p>
                        <p className="text-gray-600">
                          123 Education Street, Tashkent, Uzbekistan
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-gray-500 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">Phone</p>
                        <p className="text-gray-600">+998 90 123 45 67</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-gray-600 leading-relaxed">
                        Our mock test center provides a real exam environment with professional supervision, 
                        proper timing, and authentic test conditions to help you prepare for your actual exam.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Map Placeholder */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="rounded-2xl shadow-sm p-0">
                <CardContent className="p-0 m-0 px-0 py-0">
                  <div className="overflow-hidden rounded-xl border-2 border-gray-300">
                    <iframe
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d158857.839886527!2d-0.2664029401218982!3d51.52873980508681!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47d8a00baf21de75%3A0x52963a5addd52a99!2sLondon%2C%20Buyuk%20Britaniya!5e0!3m2!1suz!2s!4v1770445848812!5m2!1suz!2s"
                      width="100%"
                      height="260"
                      style={{ border: 0, minHeight: "20rem", width: "100%" }}
                      allowFullScreen=""
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Mock Center Location Map"
                    ></iframe>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Side - Booking Section */}
          <div className="space-y-6">
            {/* Price Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="rounded-2xl shadow-sm border-2 border-blue-200">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-4">Pricing</h3>
                  <div className="space-y-3">
                    {Object.entries(mockPrices).map(([mockType, price]) => (
                      <div
                        key={mockType}
                        className={cn(
                          "flex justify-between items-center p-3 rounded-lg",
                          mockType === type
                            ? "bg-blue-50 border-2 border-blue-200"
                            : "bg-gray-50"
                        )}
                      >
                        <span className="font-medium capitalize">{mockType}</span>
                        <span className="font-semibold text-gray-900">
                          {price.toLocaleString()} UZS
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Payment Info Card */}
           

            {/* Calendar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <h3 className="text-xl font-semibold">Select Date</h3>
                  </div>
                  
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={handlePreviousMonth}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <motion.h4
                      key={`${currentMonth}-${currentYear}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-lg font-semibold text-gray-900"
                    >
                      {MONTH_NAMES[currentMonth]} {currentYear}
                    </motion.h4>
                    <button
                      onClick={handleNextMonth}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="Next month"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {/* Day headers */}
                    {DAY_NAMES.map((day) => (
                      <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                        {day}
                      </div>
                    ))}
                    
                    {/* Calendar days */}
                    <AnimatePresence mode="wait">
                      {calendarDays.map((date, index) => {
                        const isSelected = selectedDate && isSameDay(selectedDate, date);
                        const isToday = isSameDay(date, today);
                        const isCurrentMonth = isSameMonth(date, new Date(currentYear, currentMonth));
                        const isDisabled = isDateDisabled(date);
                        
                        return (
                          <motion.button
                            key={`${date.getTime()}-${currentMonth}-${currentYear}`}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2, delay: index * 0.01 }}
                            onClick={() => handleDateClick(date)}
                            disabled={isDisabled}
                            className={cn(
                              "p-2 rounded-lg text-sm font-medium transition-all aspect-square",
                              isDisabled
                                ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                                : isSelected
                                ? "bg-blue-500 text-white shadow-md hover:bg-blue-600"
                                : isToday
                                ? "bg-blue-100 text-blue-700 border-2 border-blue-300 hover:bg-blue-200"
                                : isCurrentMonth
                                ? "bg-gray-50 text-gray-700 hover:bg-gray-100"
                                : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                            )}
                          >
                            {format(date, "d")}
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Time Slots */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-gray-600" />
                    <h3 className="text-xl font-semibold">Select Time Slot</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {timeSlots.map((slot, index) => (
                      <button
                        key={index}
                        onClick={() =>
                          slot.status === "available" && setSelectedSlot(slot.time)
                        }
                        disabled={slot.status !== "available"}
                        className={cn(
                          "p-4 rounded-xl border-2 font-medium transition-all text-center",
                          getSlotStatusColor(slot.status),
                          selectedSlot === slot.time && "ring-4 ring-blue-300 ring-offset-2"
                        )}
                      >
                        {slot.time}
                        {slot.status === "booked" && (
                          <span className="block text-xs mt-1">Booked</span>
                        )}
                        {slot.status === "pending" && (
                          <span className="block text-xs mt-1">Pending</span>
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Book Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                onClick={handleBookSlot}
                disabled={!selectedDate || !selectedSlot}
                className={cn(
                  "w-full py-6 text-lg font-medium rounded-xl",
                  !selectedDate || !selectedSlot
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600"
                )}
              >
                Book Slot
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Confirmation Card */}
        <AnimatePresence>
          {showConfirmation && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowConfirmation(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-md w-full"
              >
                <Card className="rounded-2xl shadow-xl border-2 border-green-200 bg-green-50">
                  <CardContent className="p-8">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-semibold text-green-900 mb-3">
                        Booking Request Sent
                      </h3>
                      <p className="text-green-800 mb-6">
                        Your booking request has been sent to admin for approval. 
                        You will receive a notification once it's confirmed.
                      </p>
                      <Button
                        onClick={() => {
                          setShowConfirmation(false);
                          navigate(`/mock/${type}`);
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        Close
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MockCenterPage;

