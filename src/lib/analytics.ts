import { supabase } from './supabase';

export type AnalyticsEventType = 'view' | 'open' | 'whatsapp' | 'map' | 'web';

let ignoreTracking = false;

/**
 * Sets whether the current session should ignore analytics tracking (e.g., for admins)
 */
export const setIgnoreTracking = (value: boolean) => {
    ignoreTracking = value;
};

export async function recordBusinessEvent(businessId: string, eventType: AnalyticsEventType, promotionId?: string) {
    if (ignoreTracking) return;

    try {
        const { error } = await supabase
            .from('business_analytics')
            .insert([
                {
                    business_id: businessId,
                    event_type: eventType,
                    promotion_id: promotionId
                }
            ]);

        if (error) {
            console.error('Error recording analytics event:', error);
        }
    } catch (err) {
        console.error('Unexpected error recording analytics:', err);
    }
}

/**
 * Centrally records a site visit (navigation to the main page or sections)
 */
export async function recordSiteVisit(path: string = '/') {
    if (ignoreTracking) return;

    try {
        const { error } = await supabase
            .from('site_visits')
            .insert([{ path }]);

        if (error) {
            console.error('Error logging site visit:', error);
        }
    } catch (err) {
        console.error('Unexpected error logging site visit:', err);
    }
}
