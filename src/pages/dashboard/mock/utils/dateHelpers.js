import { formatISO } from "date-fns";

// Helper function to format time in user-friendly format (e.g., "9:00 AM")
export const formatTime = (timeString) => {
  const [hours, minutes] = timeString.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};



// Check if a date should be disabled (past dates or no available slots)
export const isDateDisabled = (date, availableDates, today) => {
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  
  // Disable if past date
  if (dateStart < todayStart) return true;
  
  // Disable if date has no available slots
  const dateStr = formatISO(dateStart, { representation: 'date' });
  return !availableDates.has(dateStr);
};

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

