import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle, XCircle, Settings, LayoutDashboard, Calendar, Users, TrendingUp, BarChart3, PieChart, UserPlus } from 'lucide-react';
import { BusinessStatsModal } from '../components/BusinessStatsModal';
import { TransferBusinessModal } from '../components/TransferBusinessModal';
import { translateError } from '../utils/translateError';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface Business {
    id: string;
    name: string;
    active: boolean;
    subscription_expires_at: string | null;
    category: string;
    profiles?: { email: string };
}

interface Payment {
    id: string;
    business_id: string;
    amount: string | number;
    created_at: string;
}

export default function AdminDashboard() {
    const { isAdmin } = useAuth();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [prices, setPrices] = useState<Record<string, { original: number, promo: number, active: boolean }>>({
        '1m': { original: 0, promo: 0, active: true },
        '3m': { original: 0, promo: 0, active: true },
        '6m': { original: 0, promo: 0, active: true },
        '12m': { original: 0, promo: 0, active: true },
    });
    const [promoDescription, setPromoDescription] = useState<string>('');
    const [selectedBusinessForStats, setSelectedBusinessForStats] = useState<{ id: string, name: string } | null>(null);
    const [selectedBusinessForTransfer, setSelectedBusinessForTransfer] = useState<{ id: string, name: string } | null>(null);
    const [generalStats, setGeneralStats] = useState({
        totalBusinesses: 0,
        activeBusinesses: 0,
        monthlyRevenue: 0,
        totalRevenue: 0,
        totalVisits: 0,
        periodVisits: 0,
        categoryDistribution: {} as Record<string, number>,
        chartData: [] as any[]
    });
    const [dateRange, setDateRange] = useState({
        start: (() => {
            const d = new Date();
            d.setDate(1);
            return d.toISOString().split('T')[0];
        })(),
        end: (() => {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            return d.toISOString().split('T')[0];
        })()
    });

    const [filterOwner, setFilterOwner] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: '', direction: null });

    const uniqueCategories = useMemo(() => Array.from(new Set(businesses.map(b => b.category))).sort(), [businesses]);

    const processedBusinesses = useMemo(() => {
        let result = [...businesses];

        if (filterOwner) {
            const term = filterOwner.toLowerCase();
            result = result.filter(b => b.profiles?.email?.toLowerCase().includes(term));
        }
        if (filterStatus !== 'all') {
            const isActive = filterStatus === 'active';
            result = result.filter(b => b.active === isActive);
        }
        if (filterCategory !== 'all') {
            result = result.filter(b => b.category === filterCategory);
        }

        if (sortConfig.key && sortConfig.direction) {
            result.sort((a, b) => {
                let aValue: any = a[sortConfig.key as keyof Business];
                let bValue: any = b[sortConfig.key as keyof Business];

                if (sortConfig.key === 'owner') {
                    aValue = a.profiles?.email || '';
                    bValue = b.profiles?.email || '';
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [businesses, filterOwner, filterStatus, filterCategory, sortConfig]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' | null = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;

        setSortConfig({ key, direction });
    };

    useEffect(() => {
        if (isAdmin) {
            fetchBusinesses();
            fetchPrice();
            fetchDashboardData();
        }
    }, [isAdmin, dateRange]);

    const fetchBusinesses = async () => {
        const { data } = await supabase
            .from('businesses')
            .select('id, name, active, subscription_expires_at, category, profiles(email)')
            .order('created_at', { ascending: false });
        if (data) setBusinesses(data as unknown as Business[]);
        setLoading(false);
    };

    const fetchPrice = async () => {
        const { data } = await supabase
            .from('config')
            .select('key, value');

        if (data) {
            const newPrices = { ...prices };
            ['1m', '3m', '6m', '12m'].forEach(tier => {
                const pVal = data.find((c: any) => c.key === `subscription_price_${tier}`)?.value;
                const oVal = data.find((c: any) => c.key === `original_price_${tier}`)?.value;
                const aVal = data.find((c: any) => c.key === `subscription_active_${tier}`)?.value;
                if (pVal !== undefined) newPrices[tier as keyof typeof prices].promo = Number(pVal);
                if (oVal !== undefined) newPrices[tier as keyof typeof prices].original = Number(oVal);
                if (aVal !== undefined) newPrices[tier as keyof typeof prices].active = aVal === 'true';
            });
            setPrices(newPrices);

            const descVal = data.find((c: any) => c.key === 'promo_description')?.value;
            if (descVal !== undefined) setPromoDescription(descVal);
        }
    };

    const fetchDashboardData = async () => {
        const { data: payments } = await supabase
            .from('payments')
            .select('*') as { data: Payment[] | null };

        const { data: bData } = await supabase
            .from('businesses')
            .select('active, category');

        const { data: vData } = await supabase
            .from('site_visits')
            .select('created_at');

        if (payments && bData && vData) {
            const startDate = new Date(dateRange.start);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(dateRange.end);
            endDate.setHours(23, 59, 59, 999);

            const filteredPayments = payments.filter((p: Payment) => {
                const d = new Date(p.created_at);
                return d >= startDate && d <= endDate;
            });

            const filteredVisits = vData.filter((v: any) => {
                const d = new Date(v.created_at);
                return d >= startDate && d <= endDate;
            });

            const mRev = filteredPayments.reduce((acc: number, p: Payment) => acc + Number(p.amount), 0);
            const tRev = payments.reduce((acc: number, p: Payment) => acc + Number(p.amount), 0);

            // Group data for chart
            const chartDataMap: Record<string, { revenue: number, visits: number }> = {};
            const isSingleDay = dateRange.start === dateRange.end;

            // Initialize map with empty values
            if (isSingleDay) {
                for (let i = 0; i < 24; i++) {
                    const h = `${String(i).padStart(2, '0')}:00`;
                    chartDataMap[h] = { revenue: 0, visits: 0 };
                }
            }

            filteredPayments.forEach((p: Payment) => {
                const d = new Date(p.created_at);
                let key: string;
                if (isSingleDay) {
                    key = `${String(d.getHours()).padStart(2, '0')}:00`;
                } else {
                    key = d.toISOString().split('T')[0];
                }
                if (!chartDataMap[key]) chartDataMap[key] = { revenue: 0, visits: 0 };
                chartDataMap[key].revenue += Number(p.amount);
            });

            filteredVisits.forEach((v: any) => {
                const d = new Date(v.created_at);
                let key: string;
                if (isSingleDay) {
                    key = `${String(d.getHours()).padStart(2, '0')}:00`;
                } else {
                    key = d.toISOString().split('T')[0];
                }
                if (!chartDataMap[key]) chartDataMap[key] = { revenue: 0, visits: 0 };
                chartDataMap[key].visits += 1;
            });

            const chartData = Object.entries(chartDataMap)
                .map(([name, data]) => ({ name, revenue: data.revenue, visits: data.visits }))
                .sort((a, b) => a.name.localeCompare(b.name));

            const cats: Record<string, number> = {};
            bData.forEach((b: any) => {
                if (b.category) cats[b.category] = (cats[b.category] || 0) + 1;
            });

            setGeneralStats({
                totalBusinesses: bData.length,
                activeBusinesses: bData.filter((b: any) => b.active).length,
                monthlyRevenue: mRev,
                totalRevenue: tRev,
                totalVisits: vData.length,
                periodVisits: filteredVisits.length,
                categoryDistribution: cats,
                chartData
            });
        }
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
                updates.push({ key: `subscription_active_${tier}`, value: prices[tier].active.toString() });
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

                <div className="date-filter-container">
                    <div className="date-filter-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={16} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Desde:</span>
                        </div>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                        />
                    </div>
                    <div className="date-filter-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Hasta:</span>
                        </div>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                        />
                    </div>
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
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', opacity: 0.7 }}>Ingresos Periodo</span>
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
                    <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid #f26522' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', opacity: 0.7 }}>Visitas (Total / Periodo)</span>
                            <Users size={18} color="#f26522" />
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{generalStats.totalVisits} / {generalStats.periodVisits}</div>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem', width: '100%', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <BarChart3 size={20} color="var(--primary)" />
                        <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Evolución de Ingresos y Tráfico</h3>
                    </div>
                    <div style={{ width: '100%', height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={generalStats.chartData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f26522" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#f26522" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="rgba(255,255,255,0.5)"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    yAxisId="left"
                                    stroke="var(--primary)"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `$${val}`}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    stroke="#f26522"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ background: '#1a1a1a', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                                    formatter={(val: any, name: any) => [
                                        name === 'revenue' ? `$${Number(val).toLocaleString()}` : val,
                                        name === 'revenue' ? 'Ingresos' : 'Visitas'
                                    ]}
                                />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="var(--primary)"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                />
                                <Area
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="visits"
                                    stroke="#f26522"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorVisits)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1000px', margin: '0 auto 2rem' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem' }}>Suscripciones</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        {[
                            { id: '1m', label: '1 Mes' },
                            { id: '3m', label: '3 Meses' },
                            { id: '6m', label: '6 Meses' },
                            { id: '12m', label: '12 Meses' }
                        ].map((tier) => (
                            <div key={tier.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', opacity: prices[tier.id].active ? 1 : 0.6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <h4 style={{ margin: 0, color: 'var(--accent)' }}>{tier.label}</h4>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={prices[tier.id].active}
                                            onChange={(e) => setPrices((prev: any) => ({ ...prev, [tier.id]: { ...prev[tier.id], active: e.target.checked } }))}
                                        />
                                        <span style={{ fontSize: '0.85rem' }}>Visible</span>
                                    </label>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '0.85rem' }}>Precio Real ($):</span>
                                        <input
                                            type="number"
                                            value={prices[tier.id].original}
                                            onChange={(e) => setPrices((prev: any) => ({ ...prev, [tier.id]: { ...prev[tier.id], original: Number(e.target.value) } }))}
                                            className="input-field"
                                            style={{ width: '100px', margin: 0, padding: '4px 8px' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '0.85rem' }}>Promo ($):</span>
                                        <input
                                            type="number"
                                            value={prices[tier.id].promo}
                                            onChange={(e) => setPrices((prev: any) => ({ ...prev, [tier.id]: { ...prev[tier.id], promo: Number(e.target.value) } }))}
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
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            placeholder="Buscar por dueño..."
                            value={filterOwner}
                            onChange={(e) => setFilterOwner(e.target.value)}
                            className="input-field"
                            style={{ margin: 0, minWidth: '200px', flex: 1 }}
                        />
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="input-field"
                            style={{ margin: 0, minWidth: '200px', flex: 1 }}
                        >
                            <option value="all">Todas las Categorías</option>
                            {uniqueCategories.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="input-field"
                            style={{ margin: 0, minWidth: '200px', flex: 1 }}
                        >
                            <option value="all">Todos los Estados</option>
                            <option value="active">Activos</option>
                            <option value="inactive">Inactivos</option>
                        </select>
                    </div>
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                    <th onClick={() => handleSort('name')} style={{ textAlign: 'left', padding: '1rem', cursor: 'pointer' }}>
                                        Negocio {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '') : ''}
                                    </th>
                                    <th onClick={() => handleSort('owner')} style={{ textAlign: 'left', padding: '1rem', cursor: 'pointer' }}>
                                        Dueño {sortConfig.key === 'owner' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '') : ''}
                                    </th>
                                    <th onClick={() => handleSort('category')} style={{ textAlign: 'left', padding: '1rem', cursor: 'pointer' }}>
                                        Categoría {sortConfig.key === 'category' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '') : ''}
                                    </th>
                                    <th onClick={() => handleSort('subscription_expires_at')} style={{ textAlign: 'left', padding: '1rem', cursor: 'pointer' }}>
                                        Vencimiento {sortConfig.key === 'subscription_expires_at' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '') : ''}
                                    </th>
                                    <th onClick={() => handleSort('active')} style={{ textAlign: 'left', padding: '1rem', cursor: 'pointer' }}>
                                        Estado {sortConfig.key === 'active' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '') : ''}
                                    </th>
                                    <th style={{ textAlign: 'center', padding: '1rem' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedBusinesses.map((business) => {
                                    const isExpired = business.subscription_expires_at
                                        ? new Date(business.subscription_expires_at) < new Date()
                                        : true;

                                    return (
                                        <tr key={business.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '1rem' }}>{business.name}</td>
                                            <td style={{ padding: '1rem', fontSize: '0.85rem', opacity: 0.8 }}>{business.profiles?.email || 'N/A'}</td>
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
                                                        onClick={() => setSelectedBusinessForTransfer({ id: business.id, name: business.name })}
                                                        className="btn-primary"
                                                        style={{
                                                            padding: '6px 12px',
                                                            fontSize: '0.8rem',
                                                            background: 'rgba(255,255,255,0.05)',
                                                            color: 'var(--text-main)',
                                                            border: '1px solid var(--border-light)'
                                                        }}
                                                    >
                                                        <UserPlus size={14} /> Transferir
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
            {selectedBusinessForTransfer && (
                <TransferBusinessModal
                    businessId={selectedBusinessForTransfer.id}
                    businessName={selectedBusinessForTransfer.name}
                    onClose={() => setSelectedBusinessForTransfer(null)}
                    onSuccess={() => {
                        setSelectedBusinessForTransfer(null);
                        fetchBusinesses();
                    }}
                />
            )}
        </div>
    );
}

