import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Calendar, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "../utils/dateHelpers";

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

const TimeSlotSelector = ({
  title,
  iconColor,
  selectedDate,
  selectedSlot,
  onSlotSelect,
  slots,
  loading,
}) => {
  const [showCustomNote, setShowCustomNote] = useState(false);
  const noteTimeoutRef = useRef(null);

  const handleCustomFocus = () => {
    setShowCustomNote(true);

    if (noteTimeoutRef.current) clearTimeout(noteTimeoutRef.current);
    noteTimeoutRef.current = setTimeout(() => {
      setShowCustomNote(false);
    }, 7000);
  };

  // Hide the note immediately if input loses focus
  const handleCustomBlur = () => {
    setShowCustomNote(false);
    if (noteTimeoutRef.current) clearTimeout(noteTimeoutRef.current);
  };

  useEffect(() => {
    return () => {
      if (noteTimeoutRef.current) clearTimeout(noteTimeoutRef.current);
    };
  }, []);

  const sortedSlots = React.useMemo(() => {
    if (!slots || slots.length === 0) return [];
    return [...slots].sort((a, b) => a.time.localeCompare(b.time));
  }, [slots]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className={`w-5 h-5 ${iconColor}`} />
            <h3 className="text-xl font-semibold">{title}</h3>
          </div>
          {/* Slots section */}
          {!selectedDate ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Please select a date first</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className={`w-6 h-6 animate-spin ${iconColor}`} />
              <span className="ml-2 text-gray-600">Loading time slots...</span>
            </div>
          ) : sortedSlots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No time slots available for this date</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {sortedSlots.map((slot, index) => (
                <button
                  key={`${slot.time}-${index}`}
                  onClick={() =>
                    slot.status === "available" && onSlotSelect(slot.time)
                  }
                  disabled={slot.status !== "available"}
                  className={cn(
                    "p-4 rounded-xl border-2 font-medium transition-all text-center flex flex-col items-center justify-center",
                    getSlotStatusColor(slot.status),
                    selectedSlot === slot.time &&
                      `ring-4 ${
                        iconColor.includes("purple") ? "ring-purple-300" : "ring-green-300"
                      } ring-offset-2`
                  )}
                >
                  <span className="text-lg font-semibold">{formatTime(slot.time)}</span>
                  {slot.status === "booked" && (
                    <span className="block text-xs mt-1 font-normal">Booked</span>
                  )}
                  {slot.status === "pending" && (
                    <span className="block text-xs mt-1 font-normal">Pending</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Custom time input */}
          {selectedDate && (
            <div className="mt-6 relative w-full max-w-sm">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enter your preferred time
              </label>
              <input
                type="text"
                placeholder="e.g., 14:30"
                onFocus={handleCustomFocus}
                onBlur={handleCustomBlur}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />

              {showCustomNote && (
                <div className="absolute top-full mt-2 left-0 bg-yellow-50 border-l-4 border-yellow-300 text-yellow-700 p-3 rounded-lg text-sm shadow-md">
                  The time you enter may change depending on our speakers availability or
                  the number of available spots. If any changes occur, we will contact you
                  to confirm and discuss the new schedule.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TimeSlotSelector;
