/**
 * Date utilities with test override support
 *
 * Environment Variables:
 * - TEST_DATE_OVERRIDE: Override the current date (format: YYYY-MM-DD)
 *   Example: TEST_DATE_OVERRIDE=2025-01-25 (a Saturday)
 *   Example: TEST_DATE_OVERRIDE=2025-01-26 (a Sunday)
 *
 * Usage:
 *   import { getCurrentDate, getDayOfWeek, isWeekend } from "@/lib/date-utils";
 *
 *   const today = getCurrentDate();
 *   const dayOfWeek = getDayOfWeek(); // 0=Sunday, 1=Monday, ..., 6=Saturday
 *   if (isWeekend()) { ... }
 */

/**
 * Get the current date, respecting TEST_DATE_OVERRIDE if set
 */
export function getCurrentDate(): Date {
  const override = process.env.TEST_DATE_OVERRIDE;

  if (override) {
    const parsed = new Date(override);
    if (!isNaN(parsed.getTime())) {
      // Set to midnight in local timezone
      parsed.setHours(0, 0, 0, 0);
      return parsed;
    }
    console.warn(`Invalid TEST_DATE_OVERRIDE value: "${override}". Using actual date.`);
  }

  return new Date();
}

/**
 * Get the day of the week (0=Sunday, 1=Monday, ..., 6=Saturday)
 */
export function getDayOfWeek(): number {
  return getCurrentDate().getDay();
}

/**
 * Check if today is a weekend (Saturday or Sunday)
 */
export function isWeekend(): boolean {
  const day = getDayOfWeek();
  return day === 0 || day === 6;
}

/**
 * Get the current day name for the weekend system (SATURDAY or SUNDAY)
 * Returns SATURDAY for all non-Sunday days (useful for testing on weekdays)
 */
export function getCurrentWeekendDay(): "SATURDAY" | "SUNDAY" {
  return getDayOfWeek() === 0 ? "SUNDAY" : "SATURDAY";
}

/**
 * Calculate the Saturday date for the current weekend
 * - If Sunday: returns yesterday (Saturday)
 * - If Saturday: returns today
 * - If weekday: returns the previous Saturday (for testing purposes)
 */
export function getWeekendSaturdayDate(): Date {
  const today = getCurrentDate();
  today.setHours(0, 0, 0, 0);

  const dayOfWeek = today.getDay();

  if (dayOfWeek === 0) {
    // Sunday - go back 1 day to Saturday
    const saturday = new Date(today);
    saturday.setDate(today.getDate() - 1);
    return saturday;
  } else if (dayOfWeek === 6) {
    // Saturday - use today
    return new Date(today);
  } else {
    // Weekday - calculate previous Saturday (dayOfWeek days ago + 1 more)
    const saturday = new Date(today);
    saturday.setDate(today.getDate() - dayOfWeek - 1);
    return saturday;
  }
}
