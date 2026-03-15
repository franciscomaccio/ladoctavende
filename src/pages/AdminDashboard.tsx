import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle, XCircle, Settings, LayoutDashboard, Calendar, Users, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { BusinessStatsModal } from '../components/BusinessStatsModal';
import { translateError } from '../utils/translateError';

interface Business {
    id: string;
    name: string;
    active: boolean;
    subscription_expires_at: string | null;
    category: string;
}

export default function AdminDashboard() {
    const { isAdmin } = useAuth();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [prices, setPrices] = useState<Record<string, { original: number, promo: number }>>({
        '1m': { original: 0, promo: 0 },
        '3m': { original: 0, promo: 0 },
        '6m': { original: 0, promo: 0 },
        '12m': { original: 0, promo: 0 },
    });
    const [promoDescription, setPromoDescription] = useState<string>('');
    const [selectedBusinessForStats, setSelectedBusinessForStats] = useState<{ id: string, name: string } | null>(null);
    const [generalStats, setGeneralStats] = useState({
        totalBusinesses: 0,
        activeBusinesses: 0,
        monthlyRevenue: 0,
        totalRevenue: 0,
        categoryDistribution: {} as Record<string, number>
    });
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    useEffect(() => {
        if (isAdmin) {
            fetchBusinesses();
            fetchPrice();
            fetchPayments();
        }
    }, [isAdmin, selectedMonth]);

    const fetchBusinesses = async () => {
        const { data } = await supabase
            .from('businesses')
            .select('id, name, active, subscription_expires_at, category')
            .order('created_at', { ascending: false });
        if (data) setBusinesses(data);
        setLoading(false);
    };

    const fetchPrice = async () => {
        const { data } = await supabase
            .from('config')
            .select('key, value');

        if (data) {
            const newPrices = { ...prices };
            ['1m', '3m', '6m', '12m'].forEach(tier => {
                const pVal = data.find(c => c.key === `subscription_price_${tier}`)?.value;
                const oVal = data.find(c => c.key === `original_price_${tier}`)?.value;
                if (pVal !== undefined) newPrices[tier].promo = Number(pVal);
                if (oVal !== undefined) newPrices[tier].original = Number(oVal);
            });
            setPrices(newPrices);

            const descVal = data.find(c => c.key === 'promo_description')?.value;
            if (descVal !== undefined) setPromoDescription(descVal);
        }
    };

    const fetchPayments = async () => {
        const { data: payments } = await supabase
            .from('payments')
            .select('*');

        const { data: bData } = await supabase
            .from('businesses')
            .select('active, category');

        if (payments && bData) {
            const [selYear, selMonth] = selectedMonth.split('-').map(Number);
            const startDate = new Date(selYear, selMonth - 1, 1);
            const endDate = new Date(selYear, selMonth, 0, 23, 59, 59);

            const mRev = payments
                .filter(p => {
                    const d = new Date(p.created_at);
                    return d >= startDate && d <= endDate;
                })
                .reduce((acc, p) => acc + Number(p.amount), 0);

            const tRev = payments.reduce((acc, p) => acc + Number(p.amount), 0);

            const cats: Record<string, number> = {};
            bData.forEach(b => {
                if (b.category) cats[b.category] = (cats[b.category] || 0) + 1;
            });

            setGeneralStats({
                totalBusinesses: bData.length,
                activeBusinesses: bData.filter(b => b.active).length,
                monthlyRevenue: mRev,
                totalRevenue: tRev,
                categoryDistribution: cats
            });
        }
    };

    const getMonthOptions = () => {
        const options = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            options.push({ val, label });
        }
        return options;
    };

    const toggleActive = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('businesses')
            .update({ active: !currentStatus })
            .eq('id', id);
        if (!error) fetchBusinesses();
    };

    const updatePrice = async () => {
        try {
            const updates = [
                { key: 'promo_description', value: promoDescription }
            ];

            ['1m', '3m', '6m', '12m'].forEach(tier => {
                updates.push({ key: `subscription_price_${tier}`, value: prices[tier].promo.toString() });
                updates.push({ key: `original_price_${tier}`, value: prices[tier].original.toString() });
            });

            for (const update of updates) {
                const { error } = await supabase
                    .from('config')
                    .upsert(update);
                if (error) throw error;
            }

            alert('Precios y promociones actualizados con éxito');
        } catch (error: any) {
            alert('Error al actualizar precios: ' + translateError(error.message));
        }
    };

    if (!isAdmin) {
        return <div className="container"><h1>Acceso Denegado</h1></div>;
    }

    return (
        <div className="container-wide">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#7f1d1d', flex: 1, minWidth: 'min-content' }}>
                    <LayoutDashboard size={32} />
                    <h1 style={{ color: '#7f1d1d', margin: 0 }}>Panel Administrador</h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Filtrar Mes:</span>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-main)',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            outline: 'none',
                            fontSize: '0.9rem'
                        }}
                    >
                        {getMonthOptions().map(opt => (
                            <option key={opt.val} value={opt.val} style={{ background: '#1a1a1a' }}>
                                {opt.label.charAt(0).toUpperCase() + opt.label.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    width: '100%',
                    marginBottom: '1rem'
                }}>
                    <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', opacity: 0.7 }}>Ingresos ({getMonthOptions().find(o => o.val === selectedMonth)?.label.split(' ')[0]})</span>
                            <TrendingUp size={18} color="var(--primary)" />
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>${generalStats.monthlyRevenue.toLocaleString()}</div>
                    </div>
                    <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', opacity: 0.7 }}>Negocios Totales</span>
                            <Users size={18} color="#3b82f6" />
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{generalStats.totalBusinesses}</div>
                    </div>
                    <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', opacity: 0.7 }}>Negocios Activos</span>
                            <CheckCircle size={18} color="#10b981" />
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{generalStats.activeBusinesses}</div>
                    </div>
                    <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #cb7f00' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', opacity: 0.7 }}>Recaudación Total</span>
                            <PieChart size={18} color="#cb7f00" />
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>${generalStats.totalRevenue.toLocaleString()}</div>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '600px' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem' }}>Suscripciones</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        {[
                            { id: '1m', label: '1 Mes' },
                            { id: '3m', label: '3 Meses' },
                            { id: '6m', label: '6 Meses' },
                            { id: '12m', label: '12 Meses' }
                        ].map((tier) => (
                            <div key={tier.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                                <h4 style={{ margin: '0 0 1rem', color: 'var(--accent)' }}>{tier.label}</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '0.85rem' }}>Precio Real ($):</span>
                                        <input
                                            type="number"
                                            value={prices[tier.id].original}
                                            onChange={(e) => setPrices(prev => ({ ...prev, [tier.id]: { ...prev[tier.id], original: Number(e.target.value) } }))}
                                            className="input-field"
                                            style={{ width: '100px', margin: 0, padding: '4px 8px' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '0.85rem' }}>Promo ($):</span>
                                        <input
                                            type="number"
                                            value={prices[tier.id].promo}
                                            onChange={(e) => setPrices(prev => ({ ...prev, [tier.id]: { ...prev[tier.id], promo: Number(e.target.value) } }))}
                                            className="input-field"
                                            style={{ width: '100px', margin: 0, padding: '4px 8px' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Descripción Promo General:</span>
                        <input
                            type="text"
                            value={promoDescription}
                            onChange={(e) => setPromoDescription(e.target.value)}
                            className="input-field"
                            placeholder="Ej: Oferta Lanzamiento"
                            style={{ margin: 0 }}
                        />
                    </div>

                    <button onClick={updatePrice} className="btn-primary" style={{ width: '100%' }}>
                        <Settings size={18} /> Actualizar Precios
                    </button>
                </div>
            </div>

            {loading ? (
                <p>Cargando negocios...</p>
            ) : (
                <div className="glass-card" style={{ padding: '1rem' }}>
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                    <th style={{ textAlign: 'left', padding: '1rem' }}>Negocio</th>
                                    <th style={{ textAlign: 'left', padding: '1rem' }}>Categoría</th>
                                    <th style={{ textAlign: 'left', padding: '1rem' }}>Vencimiento</th>
                                    <th style={{ textAlign: 'left', padding: '1rem' }}>Estado</th>
                                    <th style={{ textAlign: 'center', padding: '1rem' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {businesses.map((business) => {
                                    const isExpired = business.subscription_expires_at
                                        ? new Date(business.subscription_expires_at) < new Date()
                                        : true;

                                    return (
                                        <tr key={business.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '1rem' }}>{business.name}</td>
                                            <td style={{ padding: '1rem' }}>{business.category}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isExpired ? 'var(--error)' : 'var(--text-main)' }}>
                                                    <Calendar size={14} />
                                                    {business.subscription_expires_at
                                                        ? new Date(business.subscription_expires_at).toLocaleDateString()
                                                        : 'Sin fecha'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '20px',
                                                    fontSize: '0.8rem',
                                                    background: business.active ? 'rgba(0, 155, 58, 0.2)' : 'rgba(255, 92, 138, 0.2)',
                                                    color: business.active ? '#4ade80' : 'var(--error)'
                                                }}>
                                                    {business.active ? 'Visible' : 'Oculto'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => setSelectedBusinessForStats({ id: business.id, name: business.name })}
                                                        className="btn-primary"
                                                        style={{
                                                            padding: '6px 12px',
                                                            fontSize: '0.8rem',
                                                            background: 'rgba(255,255,255,0.05)',
                                                            color: 'var(--text-main)',
                                                            border: '1px solid var(--border-light)'
                                                        }}
                                                    >
                                                        <BarChart3 size={14} /> Stats
                                                    </button>
                                                    <button
                                                        onClick={() => toggleActive(business.id, business.active)}
                                                        className="btn-primary"
                                                        style={{
                                                            padding: '6px 12px',
                                                            fontSize: '0.8rem',
                                                            background: business.active ? 'var(--error)' : 'var(--primary)'
                                                        }}
                                                    >
                                                        {business.active ? <XCircle size={14} /> : <CheckCircle size={14} />}
                                                        {business.active ? ' Desactivar' : ' Activar'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedBusinessForStats && (
                <BusinessStatsModal
                    businessId={selectedBusinessForStats.id}
                    businessName={selectedBusinessForStats.name}
                    onClose={() => setSelectedBusinessForStats(null)}
                />
            )}
        </div>
    );
}

