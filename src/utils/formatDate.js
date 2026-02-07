import { format } from "date-fns";

export const formatDateToDayMonth = (dateString) => {
  if (!dateString) return "";
  return format(new Date(dateString), "MMM d HH:mm");
};
