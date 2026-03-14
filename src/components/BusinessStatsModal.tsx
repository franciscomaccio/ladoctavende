import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Phone, MapPin, Globe, Eye } from 'lucide-react';

interface BusinessStatsModalProps {
    businessId: string;
    businessName: string;
    onClose: () => void;
}

interface Stats {
    views: number;
    whatsapp: number;
    map: number;
    web: number;
    total: number;
}

export const BusinessStatsModal: React.FC<BusinessStatsModalProps> = ({ businessId, businessName, onClose }) => {
    const [stats, setStats] = useState<Stats>({ views: 0, whatsapp: 0, map: 0, web: 0, total: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('business_analytics')
                    .select('event_type')
                    .eq('business_id', businessId);

                if (error) throw error;

                const newStats = { views: 0, whatsapp: 0, map: 0, web: 0, total: data.length };
                data.forEach(event => {
                    if (event.event_type === 'view') newStats.views++;
                    else if (event.event_type === 'whatsapp') newStats.whatsapp++;
                    else if (event.event_type === 'map') newStats.map++;
                    else if (event.event_type === 'web') newStats.web++;
                });

                setStats(newStats);
            } catch (err) {
                console.error('Error fetching stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [businessId]);

    const statCards = [
        { label: 'Vistas Perfil', value: stats.views, icon: Eye, color: '#3b82f6' },
        { label: 'WhatsApp', value: stats.whatsapp, icon: Phone, color: '#22c55e' },
        { label: 'Ubicación', value: stats.map, icon: MapPin, color: '#ef4444' },
        { label: 'Sitio Web', value: stats.web, icon: Globe, color: '#009ee3' },
    ];

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div style={{
                backgroundColor: 'var(--card-bg)',
                width: '100%',
                maxWidth: '500px',
                borderRadius: '24px',
                border: '1px solid var(--border-light)',
                overflow: 'hidden',
                animation: 'modalSlideIn 0.3s ease-out'
            }}>
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--border-light)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.02)'
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>Estadísticas</h2>
                        <p style={{ fontSize: '0.85rem', opacity: 0.6, margin: 0 }}>{businessName}</p>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: 'var(--text-main)',
                        padding: '8px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex'
                    }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '1.5rem' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando datos...</div>
                    ) : (
                        <>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '1rem',
                                marginBottom: '1.5rem'
                            }}>
                                {statCards.map((card, idx) => (
                                    <div key={idx} style={{
                                        padding: '1.25rem',
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '16px',
                                        border: '1px solid var(--border-light)',
                                        textAlign: 'center'
                                    }}>
                                        <card.icon size={24} style={{ color: card.color, marginBottom: '0.75rem' }} />
                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.25rem' }}>
                                            {card.value}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.6, fontWeight: '600', textTransform: 'uppercase' }}>
                                            {card.label}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{
                                padding: '1.25rem',
                                background: 'linear-gradient(135deg, rgba(127, 29, 29, 0.1), rgba(0, 0, 0, 0.2))',
                                borderRadius: '16px',
                                border: '1px solid rgba(127, 29, 29, 0.2)',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: '0.25rem' }}>Total Interacciones</div>
                                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary)' }}>{stats.total}</div>
                            </div>
                        </>
                    )}
                </div>

                <div style={{ padding: '1rem 1.5rem 1.5rem', textAlign: 'center' }}>
                    <button
                        onClick={onClose}
                        className="btn-primary"
                        style={{ width: '100%', padding: '12px' }}
                    >
                        Cerrar reporte
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes modalSlideIn {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};
