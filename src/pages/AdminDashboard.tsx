import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle, XCircle, Settings, LayoutDashboard, Calendar, Users, TrendingUp, BarChart3, PieChart, UserPlus, Trash2, RotateCw, Upload, Scissors, Mail } from 'lucide-react';
import { BusinessStatsModal } from '../components/BusinessStatsModal';
import { TransferBusinessModal } from '../components/TransferBusinessModal';
import { RegisteredUsersModal } from '../components/RegisteredUsersModal';
import { translateError } from '../utils/translateError';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { isSubscriptionExpired, toEndOfDayISO } from '../utils/dateUtils';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/imageUtils';

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
    const [promoPopupEnabled, setPromoPopupEnabled] = useState(false);
    const [promoPopupText, setPromoPopupText] = useState('');
    const [promoPopupImageUrl, setPromoPopupImageUrl] = useState('');
    const [promoImageFile, setPromoImageFile] = useState<File | null>(null);
    const [promoImageSrc, setPromoImageSrc] = useState<string | null>(null);
    const [promoCrop, setPromoCrop] = useState({ x: 0, y: 0 });
    const [promoZoom, setPromoZoom] = useState(1);
    const [promoCroppedAreaPixels, setPromoCroppedAreaPixels] = useState<any>(null);
    const [isPromoCropping, setIsPromoCropping] = useState(false);
    
    // Email Management State
    const [emailConfigs, setEmailConfigs] = useState({
        signup: true,
        payment: true,
        expiry: true,
        deactivation: true
    });
    const [emailLogs, setEmailLogs] = useState<any[]>([]);
    const [emailStats, setEmailStats] = useState<Record<string, number>>({});

    const [selectedBusinessForStats, setSelectedBusinessForStats] = useState<{ id: string, name: string } | null>(null);
    const [selectedBusinessForTransfer, setSelectedBusinessForTransfer] = useState<{ id: string, name: string } | null>(null);
    const [generalStats, setGeneralStats] = useState({
        totalBusinesses: 0,
        activeBusinesses: 0,
        totalUsers: 0,
        monthlyRevenue: 0,
        totalRevenue: 0,
        totalVisits: 0,
        periodVisits: 0,
        categoryDistribution: {} as Record<string, number>,
        chartData: [] as any[]
    });
    const { user } = useAuth();
    const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
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
            fetchEmailData();
        }
    }, [isAdmin, dateRange]);

    const fetchEmailData = async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Fetch logs for today
        const { data: logs } = await supabase
            .from('email_logs')
            .select('*')
            .gte('sent_at', today.toISOString())
            .order('sent_at', { ascending: false });

        if (logs) {
            setEmailLogs(logs);
            const stats: Record<string, number> = {};
            logs.forEach(log => {
                stats[log.type] = (stats[log.type] || 0) + 1;
            });
            setEmailStats(stats);
        }
    };

    const fetchBusinesses = async () => {
        const { data } = await supabase
            .from('businesses')
            .select('id, name, active, subscription_expires_at, category, profiles(email)')
            .order('created_at', { ascending: false })
            .order('id', { ascending: false });
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

            const promoEnabled = data.find((c: any) => c.key === 'promo_popup_enabled')?.value;
            const promoText = data.find((c: any) => c.key === 'promo_popup_text')?.value;
            const promoUrl = data.find((c: any) => c.key === 'promo_popup_image_url')?.value;

            setPromoPopupEnabled(promoEnabled === 'true');
            if (promoText !== undefined) setPromoPopupText(promoText);
            if (promoUrl !== undefined) setPromoPopupImageUrl(promoUrl);

            // Fetch Email Configs
            const signupEb = data.find((c: any) => c.key === 'email_signup_enabled')?.value;
            const paymentEb = data.find((c: any) => c.key === 'email_payment_enabled')?.value;
            const expiryEb = data.find((c: any) => c.key === 'email_expiry_reminder_enabled')?.value;
            const deactivationEb = data.find((c: any) => c.key === 'email_deactivation_notice_enabled')?.value;

            setEmailConfigs({
                signup: signupEb !== 'false',
                payment: paymentEb !== 'false',
                expiry: expiryEb !== 'false',
                deactivation: deactivationEb !== 'false'
            });
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

        const { count: usersCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

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
                totalUsers: usersCount || 0,
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
        if (!error) {
            setBusinesses(prev => prev.map(b => b.id === id ? { ...b, active: !currentStatus } : b));
            setGeneralStats(prev => ({
                ...prev,
                activeBusinesses: prev.activeBusinesses + (!currentStatus ? 1 : -1)
            }));
        }
    };

    const handleUpdateExpiry = async (id: string, newDate: string) => {
        const isoDate = newDate ? toEndOfDayISO(newDate) : null;
        const { error } = await supabase
            .from('businesses')
            .update({ subscription_expires_at: isoDate })
            .eq('id', id);

        if (error) {
            alert('Error al actualizar fecha: ' + translateError(error.message));
        } else {
            setBusinesses(prev => prev.map(b => b.id === id ? { ...b, subscription_expires_at: isoDate } : b));
        }
    };

    const handleDeleteBusiness = async (id: string, name: string) => {
        if (window.confirm(`¿Estás seguro de que deseas eliminar DEFINITIVAMENTE el negocio "${name}"?\nEsta acción no se puede deshacer y borrará permanentemente sus estadísticas y registros de pago.`)) {
            const { error } = await supabase
                .from('businesses')
                .delete()
                .eq('id', id);

            if (error) {
                alert('Error al eliminar negocio: ' + translateError(error.message));
            } else {
                fetchBusinesses();
            }
        }
    };

    const handlePromoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);
            setPromoImageSrc(url);
            setIsPromoCropping(true);
        }
    };

    const applyPromoCrop = async () => {
        try {
            if (promoImageSrc && promoCroppedAreaPixels) {
                const croppedImageBlob = await getCroppedImg(promoImageSrc, promoCroppedAreaPixels);
                const file = new File([croppedImageBlob], 'promo-popup.jpg', { type: 'image/jpeg' });
                setPromoImageFile(file);
                setIsPromoCropping(false);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const onPromoCropComplete = (_croppedArea: any, croppedAreaPixels: any) => {
        setPromoCroppedAreaPixels(croppedAreaPixels);
    };

    const updatePrice = async () => {
        try {
            setLoading(true);
            let finalImageUrl = promoPopupImageUrl;

            if (promoImageFile && user) {
                const fileExt = promoImageFile.name.split('.').pop();
                const fileName = `system/promo_${Math.random()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('flyers')
                    .upload(fileName, promoImageFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('flyers').getPublicUrl(fileName);
                finalImageUrl = publicUrl;
                setPromoPopupImageUrl(finalImageUrl);
            }

            const updates = [
                { key: 'promo_description', value: promoDescription },
                { key: 'promo_popup_enabled', value: promoPopupEnabled.toString() },
                { key: 'promo_popup_text', value: promoPopupText },
                { key: 'promo_popup_image_url', value: finalImageUrl }
            ];

            ['1m', '3m', '6m', '12m'].forEach(tier => {
                updates.push({ key: `subscription_price_${tier}`, value: prices[tier].promo.toString() });
                updates.push({ key: `original_price_${tier}`, value: prices[tier].original.toString() });
                updates.push({ key: `subscription_active_${tier}`, value: prices[tier].active.toString() });
            });

            updates.push({ key: 'email_signup_enabled', value: emailConfigs.signup.toString() });
            updates.push({ key: 'email_payment_enabled', value: emailConfigs.payment.toString() });
            updates.push({ key: 'email_expiry_reminder_enabled', value: emailConfigs.expiry.toString() });
            updates.push({ key: 'email_deactivation_notice_enabled', value: emailConfigs.deactivation.toString() });

            for (const update of updates) {
                const { error } = await supabase
                    .from('config')
                    .upsert(update);
                if (error) throw error;
            }

            alert('Configuración actualizada con éxito');
            setPromoImageFile(null);
        } catch (error: any) {
            alert('Error al actualizar: ' + translateError(error.message));
        } finally {
            setLoading(false);
        }
    };

    if (!isAdmin) {
        return <div className="container"><h1>Acceso Denegado</h1></div>;
    }

    return (
        <div className="container-wide">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#7f1d1d' }}>
                    <LayoutDashboard size={32} />
                    <h1 style={{ color: '#7f1d1d', margin: 0 }}>Panel Administrador</h1>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button onClick={() => setIsUsersModalOpen(true)} className="btn-primary" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border-light)' }}>
                        <Users size={18} /> Usuarios Registrados
                    </button>
                    <img src="/landing-logo.png" alt="Logo" style={{ height: '40px', objectFit: 'contain' }} />
                </div>
            </div>

            {/* Email Management Section - Moved Outside Flex */}
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1000px', margin: '0 auto 2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Mail size={24} color="var(--primary)" />
                        <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem' }}>Gestión de Emails (Resend)</h3>
                    </div>
                    <div style={{ 
                        background: (Object.values(emailStats || {}).reduce((a: any, b: any) => a + b, 0)) > 90 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: (Object.values(emailStats || {}).reduce((a: any, b: any) => a + b, 0)) > 90 ? '#f87171' : '#34d399'
                    }}>
                        <TrendingUp size={14} />
                        Enviados hoy: {Object.values(emailStats || {}).reduce((a: any, b: any) => a + b, 0)} / 100
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    {[
                        { id: 'signup', label: 'Registros (Welcome)', key: 'signup' },
                        { id: 'payment', label: 'Confirmación Pago', key: 'payment' },
                        { id: 'expiry', label: 'Aviso Vencimiento', key: 'expiry' },
                        { id: 'deactivation', label: 'Aviso Desactivación', key: 'deactivation' }
                    ].map((type) => (
                        <div key={type.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{type.label}</span>
                                <input
                                    type="checkbox"
                                    checked={(emailConfigs as any)[type.key]}
                                    onChange={(e) => setEmailConfigs(prev => ({ ...prev, [type.key]: e.target.checked }))}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: (emailConfigs as any)[type.key] ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                {emailStats[type.id] || 0} <span style={{ fontSize: '0.7rem', fontWeight: '400', opacity: 0.6 }}>hoy</span>
                            </div>
                        </div>
                    ))}
                </div>

                {emailLogs.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Últimos envíos</h4>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#111', zIndex: 1 }}>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        <th style={{ padding: '8px' }}>Tipo</th>
                                        <th style={{ padding: '8px' }}>Destinatario</th>
                                        <th style={{ padding: '8px' }}>Estado</th>
                                        <th style={{ padding: '8px' }}>Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {emailLogs.map((log) => (
                                        <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                            <td style={{ padding: '8px', opacity: 0.8 }}>{log.type}</td>
                                            <td style={{ padding: '8px', opacity: 0.8 }}>{log.recipient}</td>
                                            <td style={{ padding: '8px' }}>
                                                {log.status === 'success' ? 
                                                    <span style={{ color: '#34d399' }}>Enviado</span> : 
                                                    <span style={{ color: '#f87171' }} title={log.error_message}>Error</span>
                                                }
                                            </td>
                                            <td style={{ padding: '8px', opacity: 0.6 }}>
                                                {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <button
                    onClick={updatePrice}
                    className="btn-primary"
                    style={{ width: '100%' }}
                    disabled={loading}
                >
                    <Settings size={18} /> {loading ? 'Guardando...' : 'Guardar Configuración de Emails'}
                </button>
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
                    <div 
                        className="glass-card" 
                        style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent)', cursor: 'pointer', transition: 'transform 0.2s' }}
                        onClick={() => setIsUsersModalOpen(true)}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', opacity: 0.7 }}>Usuarios Registrados</span>
                            <UserPlus size={18} color="var(--accent)" />
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{generalStats.totalUsers}</div>
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

                {/* Promo Pop-up Config */}
                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1000px', margin: '0 auto 2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <BarChart3 size={24} color="var(--primary)" />
                        <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem' }}>Pop-up Promocional</h3>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Configurá el anuncio que verán los usuarios al ingresar a su panel.</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={promoPopupEnabled}
                                onChange={(e) => setPromoPopupEnabled(e.target.checked)}
                                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                            />
                            <span style={{ fontWeight: '700' }}>Activar Pop-up Promocional</span>
                        </label>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Mensaje del Anuncio:</span>
                            <textarea
                                className="input-field"
                                value={promoPopupText}
                                onChange={(e) => setPromoPopupText(e.target.value)}
                                placeholder="Ej: ¡Publicá tu negocio hoy y obtené un mes gratis!"
                                style={{ height: '80px', resize: 'none', margin: 0 }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Imagen Promocional (1:1):</span>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <label className="btn-primary" style={{ fontSize: '0.85rem', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border-light)', margin: 0 }}>
                                    <Upload size={18} /> {promoImageFile || promoPopupImageUrl ? 'Cambiar Imagen' : 'Subir Imagen'}
                                    <input type="file" hidden accept="image/*" onChange={handlePromoFileChange} />
                                </label>

                                {(promoImageFile || promoPopupImageUrl) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPromoImageSrc(promoImageFile ? URL.createObjectURL(promoImageFile) : promoPopupImageUrl);
                                            setIsPromoCropping(true);
                                        }}
                                        className="btn-primary"
                                        style={{ fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                                    >
                                        <Scissors size={18} /> Recortar
                                    </button>
                                )}

                                {(promoImageFile || promoPopupImageUrl) && (
                                    <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-light)', background: 'rgba(0,0,0,0.2)' }}>
                                        <img
                                            src={promoImageFile ? URL.createObjectURL(promoImageFile) : promoPopupImageUrl}
                                            alt="Promo Preview"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={updatePrice}
                            className="btn-primary"
                            style={{ width: '100%' }}
                            disabled={loading}
                        >
                            <Settings size={18} /> {loading ? 'Guardando...' : 'Guardar Configuración Pop-up'}
                        </button>
                    </div>
                </div>

            {/* Cropper Modal for Promo Image */}
            {isPromoCropping && promoImageSrc && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', background: '#111', zIndex: 10000, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ position: 'relative', flex: 1, width: '100%', minHeight: 0 }}>
                        <Cropper
                            image={promoImageSrc}
                            crop={promoCrop}
                            zoom={promoZoom}
                            aspect={1 / 1}
                            onCropChange={setPromoCrop}
                            onCropComplete={onPromoCropComplete}
                            onZoomChange={setPromoZoom}
                        />
                    </div>
                    <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem', background: '#111', borderTop: '1px solid #333' }}>
                        <button type="button" className="btn-primary" style={{ background: '#333', color: 'white' }} onClick={() => setIsPromoCropping(false)}>Cancelar</button>
                        <button type="button" className="btn-primary" onClick={applyPromoCrop}>Confirmar Recorte</button>
                    </div>
                </div>
            )}

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
                        <button
                            onClick={() => {
                                fetchBusinesses();
                                fetchDashboardData();
                            }}
                            className="btn-primary"
                            title="Actualizar lista"
                            style={{
                                margin: 0,
                                padding: '0 1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--border-light)'
                            }}
                        >
                            <RotateCw size={18} />
                        </button>
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
                                    const isExpired = isSubscriptionExpired(business.subscription_expires_at);

                                    return (
                                        <tr key={business.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '1rem' }}>{business.name}</td>
                                            <td style={{ padding: '1rem', fontSize: '0.85rem', opacity: 0.8 }}>{business.profiles?.email || 'N/A'}</td>
                                            <td style={{ padding: '1rem' }}>{business.category}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isExpired ? 'var(--error)' : 'var(--text-main)' }}>
                                                    <Calendar size={14} />
                                                    <input
                                                        type="date"
                                                        defaultValue={business.subscription_expires_at ? business.subscription_expires_at.split('T')[0] : ''}
                                                        onChange={(e) => handleUpdateExpiry(business.id, e.target.value)}
                                                        style={{ background: 'transparent', border: 'none', color: 'inherit', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem' }}
                                                    />
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
                                                    <button
                                                        onClick={() => handleDeleteBusiness(business.id, business.name)}
                                                        className="btn-primary"
                                                        title="Eliminar"
                                                        style={{
                                                            padding: '6px 10px',
                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                            color: '#ef4444',
                                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
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
                    businessId={selectedBusinessForStats?.id || ''}
                    businessName={selectedBusinessForStats?.name || ''}
                    onClose={() => setSelectedBusinessForStats(null)}
                />
            )}
            {selectedBusinessForTransfer && (
                <TransferBusinessModal
                    businessId={selectedBusinessForTransfer?.id || ''}
                    businessName={selectedBusinessForTransfer?.name || ''}
                    onClose={() => setSelectedBusinessForTransfer(null)}
                    onSuccess={() => {
                        setSelectedBusinessForTransfer(null);
                        fetchBusinesses();
                    }}
                />
            )}
            {isUsersModalOpen && (
                <RegisteredUsersModal onClose={() => setIsUsersModalOpen(false)} />
            )}
        </div>
    );
}

