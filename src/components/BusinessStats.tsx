import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Legend, LineChart, Line
} from 'recharts';
import { X, Calendar, TrendingUp, Eye, MessageCircle, MapPin, Globe } from 'lucide-react';

interface StatsProps {
    businessId: string;
    businessName: string;
    promotionId?: string;
    promotionTitle?: string;
    onClose: () => void;
}

interface AnalyticsRow {
    created_at: string;
    event_type: string;
}

export default function BusinessStats({ businessId, businessName, promotionId, promotionTitle, onClose }: StatsProps) {
    const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState<any[]>([]);
    const [totals, setTotals] = useState({
        view: 0,
        open: 0,
        whatsapp: 0,
        map: 0,
        web: 0
    });

    useEffect(() => {
        fetchStats();
    }, [timeRange, businessId, promotionId]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const now = new Date();
            let startDate = new Date();

            if (timeRange === 'day') startDate.setHours(now.getHours() - 24);
            else if (timeRange === 'week') startDate.setDate(now.getDate() - 7);
            else if (timeRange === 'month') startDate.setDate(now.getDate() - 30);

            let query = supabase
                .from('business_analytics')
                .select('event_type, created_at')
                .eq('business_id', businessId)
                .gte('created_at', startDate.toISOString());

            if (promotionId) {
                query = query.eq('promotion_id', promotionId);
            }

            const { data, error } = await query.order('created_at', { ascending: true });

            if (error) throw error;

            processData(data || []);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const processData = (data: AnalyticsRow[]) => {
        const newTotals = { view: 0, open: 0, whatsapp: 0, map: 0, web: 0 };
        const grouped: { [key: string]: any } = {};

        data.forEach(row => {
            const date = new Date(row.created_at).toLocaleDateString();
            if (!grouped[date]) {
                grouped[date] = { date, view: 0, open: 0, whatsapp: 0, map: 0, web: 0 };
            }

            const type = row.event_type as keyof typeof newTotals;
            grouped[date][type]++;
            newTotals[type]++;
        });

        setTotals(newTotals);
        setChartData(Object.values(grouped));
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
            padding: '1rem'
        }} onClick={onClose}>
            <div
                style={{
                    maxWidth: '800px', width: '100%', maxHeight: '90vh',
                    background: 'white', borderRadius: '24px', position: 'relative',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>
                            {promotionId ? `Estadísticas Promo: ${promotionTitle}` : `Estadísticas: ${businessName}`}
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                            {promotionId ? `Rendimiento de esta promoción específica` : `Rendimiento de tu negocio en la plataforma`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>
                    {/* Time Range Filter */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem', justifyContent: 'center' }}>
                        {(['day', 'week', 'month'] as const).map(range => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                style={{
                                    padding: '8px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '600',
                                    border: '1px solid var(--border-light)', cursor: 'pointer',
                                    background: timeRange === range ? 'var(--primary)' : 'white',
                                    color: timeRange === range ? 'white' : 'var(--text-main)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {range === 'day' ? '24 Horas' : range === 'week' ? '7 Días' : '30 Días'}
                            </button>
                        ))}
                    </div>

                    {/* KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        <StatCard icon={<Eye size={18} />} label="Visto" value={totals.view} color="#6366f1" />
                        <StatCard icon={<TrendingUp size={18} />} label="Abierto" value={totals.open} color="#22c55e" />
                        <StatCard icon={<MessageCircle size={18} />} label="WhatsApp" value={totals.whatsapp} color="#128c7e" />
                        <StatCard icon={<MapPin size={18} />} label="Mapa" value={totals.map} color="#f26522" />
                        <StatCard icon={<Globe size={18} />} label="Web" value={totals.web} color="#3b82f6" />
                    </div>

                    {/* Charts */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando datos...</div>
                    ) : chartData.length > 0 ? (
                        <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border-light)' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={18} /> Tendencia en el tiempo
                            </h3>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="date" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                                        <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                            itemStyle={{ fontSize: '0.8rem', fontWeight: '600' }}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '0.8rem' }} />
                                        <Line type="monotone" dataKey="view" name="Visto en lista" stroke="#6366f1" strokeWidth={3} dot={false} />
                                        <Line type="monotone" dataKey="open" name="Tarjetas abiertas" stroke="#22c55e" strokeWidth={3} dot={false} />
                                        <Line type="monotone" dataKey="whatsapp" name="Clicks WhatsApp" stroke="#128c7e" strokeWidth={3} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#f9fafb', borderRadius: '20px' }}>
                            <TrendingUp size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                            <p style={{ color: 'var(--text-muted)' }}>No hay interacciones registradas en este período.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color }: { icon: any, label: string, value: number, color: string }) {
    return (
        <div style={{
            background: 'white', padding: '1rem', borderRadius: '16px',
            border: `1px solid ${color}20`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            display: 'flex', flexDirection: 'column', gap: '8px'
        }}>
            <div style={{ color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {icon}
                <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>{label}</span>
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: '800' }}>{value}</span>
        </div>
    );
}
