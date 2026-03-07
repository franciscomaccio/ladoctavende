import { supabase } from './supabase';

export type AnalyticsEventType = 'view' | 'open' | 'whatsapp' | 'map' | 'web';

export async function recordBusinessEvent(businessId: string, eventType: AnalyticsEventType, promotionId?: string) {
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
