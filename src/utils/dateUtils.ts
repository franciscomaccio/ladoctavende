/**
 * Utility functions for consistent date handling across the application.
 * Specifically designed to handle "expiration dates" without timezone shifts.
 */

/**
 * Formats an ISO date string to a localized format (e.g., DD/MM/YYYY)
 * ignoring the timezone offset to avoid "one day off" errors.
 */
export const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    
    try {
        // We take only the YYYY-MM-DD part to avoid timezone shifts
        const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
        
        // Create a local date object using these parts
        // Note: Month is 0-indexed in JS Date constructor
        const date = new Date(year, month - 1, day);
        
        return date.toLocaleDateString();
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Fecha Inválida';
    }
};

/**
 * Checks if a subscription has expired.
 * Ensures consistent handling of null/undefined dates.
 */
export const isSubscriptionExpired = (dateString: string | null | undefined): boolean => {
    if (!dateString) return true; // No date means expired or no subscription
    
    try {
        const expiryDate = new Date(dateString);
        const now = new Date();
        
        // If it was saved as UTC midnight, we should probably check against UTC "now"
        // or just compare the day parts.
        // For safety, we compare the absolute timestamp.
        return expiryDate < now;
    } catch (error) {
        return true;
    }
};

/**
 * Returns a date string set to the end of the day (23:59:59) in UTC
 * for a given YYYY-MM-DD input. This prevents immediate expiration 
 * in local timezones when saving from the admin panel.
 */
export const toEndOfDayISO = (dateInput: string): string => {
    if (!dateInput) return '';
    try {
        // If dateInput is '2024-03-24', we want '2024-03-24T23:59:59.999Z'
        return `${dateInput}T23:59:59.999Z`;
    } catch (error) {
        return new Date(dateInput).toISOString();
    }
};
