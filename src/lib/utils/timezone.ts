import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { addDays, differenceInDays, parseISO } from 'date-fns';

/**
 * Timezone utility functions for invoice date calculations
 * Prevents invoices from being due at wrong times for international customers
 */

// Default timezone if not specified
const DEFAULT_TIMEZONE = 'America/Chicago'; // Server default

/**
 * Get timezone for a location
 * @param locationId - Location ID to get timezone for
 * @returns timezone string (e.g., 'America/New_York')
 */
export async function getLocationTimezone(locationId?: string): Promise<string> {
  // TODO: Fetch from location settings when implemented
  // For now, return default
  return DEFAULT_TIMEZONE;
}

/**
 * Calculate invoice due date in customer's timezone
 * @param invoiceDate - Invoice creation date
 * @param paymentTermDays - Number of days until payment is due
 * @param timezone - Customer's timezone
 * @returns Due date in customer's timezone
 */
export function calculateDueDate(
  invoiceDate: Date,
  paymentTermDays: number,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  // Convert invoice date to customer's timezone
  const zonedInvoiceDate = toZonedTime(invoiceDate, timezone);
  
  // Add payment term days
  const zonedDueDate = addDays(zonedInvoiceDate, paymentTermDays);
  
  // Convert back to UTC for storage
  return fromZonedTime(zonedDueDate, timezone);
}

/**
 * Calculate days overdue in customer's timezone
 * @param dueDate - Invoice due date (UTC)
 * @param timezone - Customer's timezone
 * @returns Number of days overdue (negative if not yet due)
 */
export function calculateDaysOverdue(
  dueDate: Date,
  timezone: string = DEFAULT_TIMEZONE
): number {
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  const zonedDueDate = toZonedTime(dueDate, timezone);
  
  // Set both to start of day for accurate comparison
  zonedNow.setHours(0, 0, 0, 0);
  zonedDueDate.setHours(0, 0, 0, 0);
  
  return differenceInDays(zonedNow, zonedDueDate);
}

/**
 * Format date for display in customer's timezone
 * @param date - Date to format (UTC)
 * @param timezone - Customer's timezone
 * @param format - Format string (default: 'yyyy-MM-dd')
 * @returns Formatted date string
 */
export function formatDateInTimezone(
  date: Date,
  timezone: string = DEFAULT_TIMEZONE,
  format: string = 'yyyy-MM-dd'
): string {
  return formatInTimeZone(date, timezone, format);
}

/**
 * Get current date at start of day in timezone
 * @param timezone - Timezone to use
 * @returns Date object at 00:00:00 in specified timezone
 */
export function getTodayInTimezone(timezone: string = DEFAULT_TIMEZONE): Date {
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  zonedNow.setHours(0, 0, 0, 0);
  return fromZonedTime(zonedNow, timezone);
}
