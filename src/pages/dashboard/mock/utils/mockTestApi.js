import { startOfMonth, endOfMonth, eachDayOfInterval, formatISO } from "date-fns";
import supabase from "@/lib/supabase";

// Mock function to fetch available dates and time slots
// TODO: Replace with actual API call to fetch from database
export const fetchAvailableSlots = async (date, testType) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Format date as YYYY-MM-DD
  const dateStr = formatISO(date, { representation: 'date' });
  
  // TODO: Replace this with actual Supabase query:
  // const { data, error } = await supabase
  //   .from('mock_test_slots')
  //   .select('*')
  //   .eq('date', dateStr)
  //   .eq('test_type', testType)
  //   .order('time', { ascending: true });
  
  // Mock data - some dates have slots, some don't
  const dayOfMonth = date.getDate();
  
  // Simulate: Some days have no slots available
  if (dayOfMonth % 7 === 0) {
    return [];
  }
  
  // Simulate: Different slots for different dates
  const baseSlots = testType === "speaking" 
    ? ["09:00", "11:00", "14:00", "16:00"]
    : ["09:00", "11:00", "14:00", "16:00", "18:00"];
  
  // Vary availability based on date
  return baseSlots.map((time, index) => {
    let status = "available";
    // Simulate some slots being booked or pending
    if ((dayOfMonth + index) % 3 === 0) {
      status = "booked";
    } else if ((dayOfMonth + index) % 5 === 0) {
      status = "pending";
    }
    return { time, status };
  });
};

// Fetch available dates for a month (dates that have at least one available slot)
export const fetchAvailableDates = async (month, year, testType) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // TODO: Replace with actual Supabase query:
  // const monthStart = startOfMonth(new Date(year, month));
  // const monthEnd = endOfMonth(monthStart);
  // const { data, error } = await supabase
  //   .from('mock_test_slots')
  //   .select('date')
  //   .gte('date', formatISO(monthStart, { representation: 'date' }))
  //   .lte('date', formatISO(monthEnd, { representation: 'date' }))
  //   .eq('test_type', testType)
  //   .eq('status', 'available')
  //   .order('date', { ascending: true });
  
  // Mock: Return array of dates that have available slots
  const monthStart = startOfMonth(new Date(year, month));
  const monthEnd = endOfMonth(monthStart);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Simulate: Some days don't have slots
  return allDays.filter((date) => {
    const dayOfMonth = date.getDate();
    // Exclude days that are multiples of 7 (simulating no data)
    return dayOfMonth % 7 !== 0;
  });
};

