import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime, getTimePeriod } from "../utils/dateHelpers";

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
  // Group slots by time period
  const groupedSlots = React.useMemo(() => {
    if (!slots || slots.length === 0) return {};
    
    return slots.reduce((acc, slot) => {
      const period = getTimePeriod(slot.time);
      if (!acc[period]) acc[period] = [];
      acc[period].push(slot);
      return acc;
    }, {});
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
          ) : slots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No time slots available for this date</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedSlots).map(([period, periodSlots]) => (
                <div key={period}>
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                    {period}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {periodSlots.map((slot, index) => (
                      <button
                        key={`${slot.time}-${index}`}
                        onClick={() =>
                          slot.status === "available" && onSlotSelect(slot.time)
                        }
                        disabled={slot.status !== "available"}
                        className={cn(
                          "p-4 rounded-xl border-2 font-medium transition-all text-center flex flex-col items-center justify-center",
                          getSlotStatusColor(slot.status),
                          selectedSlot === slot.time && `ring-4 ${iconColor.includes('purple') ? 'ring-purple-300' : 'ring-green-300'} ring-offset-2`
                        )}
                      >
                        <span className="text-lg font-semibold">
                          {formatTime(slot.time)}
                        </span>
                        {slot.status === "booked" && (
                          <span className="block text-xs mt-1 font-normal">Booked</span>
                        )}
                        {slot.status === "pending" && (
                          <span className="block text-xs mt-1 font-normal">Pending</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TimeSlotSelector;

