import { addDays, format, isValid, parse, setHours, setMinutes, startOfDay, isAfter, isBefore } from 'date-fns';

export const TimeUtils = {
  parseVagueTime(input: string): { startHour: number; endHour: number } | null {
    const lower = input.toLowerCase();
    if (lower.includes('morning')) return { startHour: 9, endHour: 12 };
    if (lower.includes('afternoon')) return { startHour: 12, endHour: 16 };
    if (lower.includes('evening')) return { startHour: 16, endHour: 19 };
    return null;
  },

  parseDate(input: string): Date | null {
    const lower = input.toLowerCase();
    const today = startOfDay(new Date());

    if (lower.includes('today')) return today;
    if (lower.includes('tomorrow')) return addDays(today, 1);
    
    // Try parsing specific dates like "next Monday" or "2023-10-25"
    // For simplicity, we'll stick to basic keywords and simple formats
    // In a real NLP system, we'd use chrono-node or similar.
    
    // Simple check for YYYY-MM-DD
    const isoDate = parse(input, 'yyyy-MM-dd', new Date());
    if (isValid(isoDate)) return isoDate;

    return null;
  },

  formatSlot(dateStr: string): string {
    const date = new Date(dateStr);
    return format(date, 'EEEE, MMMM do @ h:mm a');
  }
};
