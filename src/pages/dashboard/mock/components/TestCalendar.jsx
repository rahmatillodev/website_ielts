import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, format, formatISO } from "date-fns";
import { cn } from "@/lib/utils";
import { MONTH_NAMES, DAY_NAMES, isDateDisabled } from "../utils/dateHelpers";

const TestCalendar = ({
  title,
  icon: Icon,
  iconColor,
  selectedDate,
  onDateSelect,
  currentMonth,
  currentYear,
  onPreviousMonth,
  onNextMonth,
  availableDates,
  loadingDates,
  today,
}) => {
  // Get all days for the calendar view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(new Date(currentYear, currentMonth));
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth, currentYear]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Icon className={`w-5 h-5 ${iconColor}`} />
            <h3 className="text-xl font-semibold">{title}</h3>
          </div>
          
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onPreviousMonth}
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
              onClick={onNextMonth}
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
                const isDisabled = isDateDisabled(date, availableDates, today);
                const dateStr = formatISO(date, { representation: 'date' });
                const hasSlots = availableDates.has(dateStr);
                
                return (
                  <motion.button
                    key={`${date.getTime()}-${currentMonth}-${currentYear}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2, delay: index * 0.01 }}
                    onClick={() => !isDisabled && onDateSelect(date)}
                    disabled={isDisabled}
                    className={cn(
                      "p-2 rounded-lg text-sm font-medium transition-all aspect-square relative",
                      isDisabled && "bg-gray-50 text-gray-300 cursor-not-allowed",
                      !isDisabled && isSelected && iconColor.includes('purple') && "bg-purple-500 text-white shadow-md hover:bg-purple-600",
                      !isDisabled && isSelected && iconColor.includes('green') && "bg-green-500 text-white shadow-md hover:bg-green-600",
                      !isDisabled && !isSelected && isToday && iconColor.includes('purple') && "bg-purple-100 text-purple-700 border-2 border-purple-300 hover:bg-purple-200",
                      !isDisabled && !isSelected && isToday && iconColor.includes('green') && "bg-green-100 text-green-700 border-2 border-green-300 hover:bg-green-200",
                      !isDisabled && !isSelected && !isToday && isCurrentMonth && hasSlots && "bg-gray-50 text-gray-700 hover:bg-gray-100",
                      !isDisabled && !isSelected && !isToday && isCurrentMonth && !hasSlots && "bg-gray-50 text-gray-400 hover:bg-gray-100 opacity-50",
                      !isDisabled && !isSelected && !isToday && !isCurrentMonth && "bg-gray-50 text-gray-400 hover:bg-gray-100"
                    )}
                    title={isDisabled && !hasSlots ? "No slots available" : ""}
                  >
                    {format(date, "d")}
                    {loadingDates && isCurrentMonth && (
                      <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TestCalendar;

