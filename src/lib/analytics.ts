import { supabase } from './supabase';

export type AnalyticsEventType = 'view' | 'open' | 'whatsapp' | 'map' | 'web';

export async function recordBusinessEvent(businessId: string, eventType: AnalyticsEventType) {
    try {
        const { error } = await supabase
            .from('business_analytics')
            .insert([
                { business_id: businessId, event_type: eventType }
            ]);

        if (error) {
            console.error('Error recording analytics event:', error);
        }
    } catch (err) {
        console.error('Unexpected error recording analytics:', err);
    }
}
