import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle, XCircle, Settings, LayoutDashboard, Calendar, Users, TrendingUp, BarChart3, PieChart, UserPlus, Trash2, RotateCw, Upload, Scissors, Mail, CreditCard, MessageCircle, Pencil, Eye, EyeOff, Home, ShoppingBag } from 'lucide-react';
import { BusinessStatsModal } from '../components/BusinessStatsModal';
import { TransferBusinessModal } from '../components/TransferBusinessModal';
import { RegisteredUsersModal } from '../components/RegisteredUsersModal';
import BusinessForm from '../components/BusinessForm';
import UsefulNoteModal from '../components/UsefulNoteModal';
import { translateError } from '../utils/translateError';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell } from 'recharts';
import { isSubscriptionExpired, toEndOfDayISO } from '../utils/dateUtils';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/imageUtils';

interface Business {
    id: string;
    name: string;
    active: boolean;
    subscription_expires_at: string | null;
    category: string;
    phone?: string;
    owner_id: string;
    description?: string;
    image_url?: string;
    website_url?: string;
    location_lat?: number | null;
    location_lng?: number | null;
    type?: 'business' | 'classified';
    profiles?: { email: string };
}

interface Payment {
    id: string;
    business_id: string;
    amount: string | number;
    created_at: string;
}

interface UsefulNote {
    id: string;
    title: string;
    caption: string | null;
    content: string | null;
    image_url: string | null;
    whatsapp_url: string | null;
    website_url: string | null;
    map_url: string | null;
    is_visible: boolean;
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
    const [activeTab, setActiveTab] = useState('businesses');
    const [usefulNotes, setUsefulNotes] = useState<UsefulNote[]>([]);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [selectedNoteForEdit, setSelectedNoteForEdit] = useState<UsefulNote | null>(null);
    const [isUsefulNoteModalOpen, setIsUsefulNoteModalOpen] = useState(false);
    
    // Email Management State
    const [emailConfigs, setEmailConfigs] = useState({
        signup: true,
        payment: true,
        expiry: true,
        deactivation: true,
        recovery: true
    });
    const [emailLogs, setEmailLogs] = useState<any[]>([]);
    const [emailStats, setEmailStats] = useState<Record<string, number>>({});

    const [selectedBusinessForStats, setSelectedBusinessForStats] = useState<{ id: string, name: string } | null>(null);
    const [selectedBusinessForTransfer, setSelectedBusinessForTransfer] = useState<{ id: string, name: string } | null>(null);
    const [selectedBusinessForEdit, setSelectedBusinessForEdit] = useState<Business | null>(null);
    const [generalStats, setGeneralStats] = useState({
        totalBusinesses: 0,
        activeBusinesses: 0,
        totalUsers: 0,
        monthlyRevenue: 0,
        totalRevenue: 0,
        totalVisits: 0,
        periodVisits: 0,
        categoryDistribution: {} as Record<string, number>,
        chartData: [] as any[],
        categoryActivity: [] as any[],
        businessActivity: [] as any[],
        businessTableData: [] as any[],
        todayVisits: 0
    });
    const [statsFilterCategory, setStatsFilterCategory] = useState('all');
    const [statsInteractionFilter, setStatsInteractionFilter] = useState<'total' | 'view' | 'open' | 'whatsapp' | 'map' | 'web' | 'site_visits'>('total');
    const { user } = useAuth();
    const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
    const [dateRange, setDateRange] = useState({
        start: (() => {
            const d = new Date();
            d.setDate(1);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })(),
        end: (() => {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })()
    });

    const [filterOwner, setFilterOwner] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: '', direction: null });
    const [statsTableSortConfig, setStatsTableSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: 'open', direction: 'desc' });

    const uniqueCategories = useMemo(() => {
        const cats = new Set<string>();
        businesses.forEach(b => {
            if (b.category) {
                b.category.split(',').forEach(c => {
                    const trimmed = c.trim();
                    if (trimmed) cats.add(trimmed);
                });
            }
        });
        return Array.from(cats).sort();
    }, [businesses]);

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

    const sortedStatsTableData = useMemo(() => {
        // Merge with all businesses to include zeros as requested
        const fullData = businesses.map(b => {
            const activity = generalStats.businessTableData.find(a => a.id === b.id);
            return {
                id: b.id,
                name: b.name,
                open: activity?.open || 0,
                whatsapp: activity?.whatsapp || 0,
                map: activity?.map || 0,
                web: activity?.web || 0,
                total: activity?.total || 0
            };
        });

        if (statsTableSortConfig.key && statsTableSortConfig.direction) {
            fullData.sort((a: any, b: any) => {
                const aValue = a[statsTableSortConfig.key as keyof typeof a];
                const bValue = b[statsTableSortConfig.key as keyof typeof b];
                
                if (typeof aValue === 'string') {
                    const res = aValue.localeCompare(bValue as string);
                    return statsTableSortConfig.direction === 'asc' ? res : -res;
                }
                
                const res = (aValue as number) - (bValue as number);
                return statsTableSortConfig.direction === 'asc' ? res : -res;
            });
        }
        return fullData;
    }, [generalStats.businessTableData, businesses, statsTableSortConfig]);

    const handleStatsSort = (key: string) => {
        let direction: 'asc' | 'desc' | null = 'desc';
        if (statsTableSortConfig.key === key && statsTableSortConfig.direction === 'desc') direction = 'asc';
        else if (statsTableSortConfig.key === key && statsTableSortConfig.direction === 'asc') direction = null;

        setStatsTableSortConfig({ key, direction });
    };

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
            fetchUsefulNotes();
        }
    }, [isAdmin, dateRange, statsInteractionFilter]);

    const fetchUsefulNotes = async () => {
        setLoadingNotes(true);
        const { data } = await supabase
            .from('useful_notes')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setUsefulNotes(data as UsefulNote[]);
        setLoadingNotes(false);
    };

    const toggleNoteVisibility = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('useful_notes')
            .update({ is_visible: !currentStatus })
            .eq('id', id);

        if (!error) {
            setUsefulNotes(prev => prev.map(n => n.id === id ? { ...n, is_visible: !currentStatus } : n));
        } else {
            alert('Error al cambiar visibilidad: ' + translateError(error.message));
        }
    };

    const handleDeleteNote = async (id: string, title: string) => {
        if (window.confirm(`¿Estás seguro de que deseas eliminar la nota "${title}"?`)) {
            const { error } = await supabase
                .from('useful_notes')
                .delete()
                .eq('id', id);

            if (error) {
                alert('Error al eliminar nota: ' + translateError(error.message));
            } else {
                fetchUsefulNotes();
            }
        }
    };

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

    const CATEGORY_ICONS: Record<string, string> = {
        'Almacén/Súper': '🛒',
        'Belleza': '💄',
        'Casa/Construcción': '🏠',
        'Deportes': '⚽',
        'Educación': '📚',
        'Gastronomía': '🍔',
        'Inmobiliaria': '🏢',
        'Librería/Regalería': '🎁',
        'Mascotas': '🐾',
        'Moda': '👕',
        'Salud': '🏥',
        'Servicios': '🛠️',
        'Tecnología': '💻',
        'Vehículos': '🚗',
        'Otros': '✨'
    };

    const fetchBusinesses = async () => {
        const { data } = await supabase
            .from('businesses')
            .select('id, name, active, subscription_expires_at, category, phone, owner_id, description, image_url, website_url, location_lat, location_lng, type, profiles(email)')
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
            const recoveryEb = data.find((c: any) => c.key === 'email_recovery_enabled')?.value;

            setEmailConfigs({
                signup: signupEb !== 'false',
                payment: paymentEb !== 'false',
                expiry: expiryEb !== 'false',
                deactivation: deactivationEb !== 'false',
                recovery: recoveryEb !== 'false'
            });
        }
    };

    const fetchDashboardData = async () => {
        const { data: bData } = await supabase
            .from('businesses')
            .select('active, category');

        const { count: usersCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        const { data: paymentsAll } = await supabase
            .from('payments')
            .select('*');

        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);

        // Call the new RPC for aggregated stats
        const { data: aggregatedData, error: rpcError } = await supabase.rpc('get_admin_dashboard_stats', {
            p_from: startDate.toISOString(),
            p_to: endDate.toISOString()
        });

        if (rpcError) {
            console.error('Error fetching aggregated stats:', rpcError);
            return;
        }

        if (aggregatedData && bData) {
            const { revenue, visits, interactions_evolution, business_activity, category_activity } = aggregatedData;

            const filteredPayments = (paymentsAll || []).filter((p: any) => {
                const d = new Date(p.created_at);
                return d >= startDate && d <= endDate;
            });

            const mRev = filteredPayments.reduce((acc: number, p: any) => acc + Number(p.amount), 0);
            const tRev = (paymentsAll || []).reduce((acc: number, p: any) => acc + Number(p.amount), 0);

            // Process Evolution Chart Data
            const chartDataMap: Record<string, any> = {};
            const isSingleDay = dateRange.start === dateRange.end;
            const initItem = () => ({ revenue: 0, visits: 0, total: 0, view: 0, open: 0, whatsapp: 0, map: 0, web: 0 });

            if (isSingleDay) {
                for (let i = 0; i < 24; i++) {
                    const h = `${String(i).padStart(2, '0')}:00`;
                    chartDataMap[h] = initItem();
                }
            }

            // Map Revenue
            revenue?.forEach((r: any) => {
                const d = new Date(r.date);
                const key = isSingleDay ? `${String(d.getUTCHours()).padStart(2, '0')}:00` : r.date.split('T')[0];
                if (!chartDataMap[key]) chartDataMap[key] = initItem();
                chartDataMap[key].revenue = Number(r.total);
            });

            // Map Site Visits
            visits?.forEach((v: any) => {
                const d = new Date(v.date);
                const key = isSingleDay ? `${String(d.getUTCHours()).padStart(2, '0')}:00` : v.date.split('T')[0];
                if (!chartDataMap[key]) chartDataMap[key] = initItem();
                chartDataMap[key].visits = Number(v.count);
            });

            // Map Interactions Evolution
            interactions_evolution?.forEach((ie: any) => {
                const d = new Date(ie.date);
                const key = isSingleDay ? `${String(d.getUTCHours()).padStart(2, '0')}:00` : ie.date.split('T')[0];
                if (!chartDataMap[key]) chartDataMap[key] = initItem();
                
                const type = ie.event_type;
                if (type in chartDataMap[key]) {
                    chartDataMap[key][type] = Number(ie.count);
                }
                chartDataMap[key].total += Number(ie.count);
            });

            const chartData = Object.entries(chartDataMap)
                .map(([name, data]: [string, any]) => ({ 
                    name, 
                    revenue: data.revenue, 
                    visits: data.visits,
                    interactions: statsInteractionFilter === 'site_visits' ? data.visits : 
                                 statsInteractionFilter === 'total' ? data.total : 
                                 data[statsInteractionFilter] || 0
                }))
                .sort((a, b) => a.name.localeCompare(b.name));

            // Process Category Popularity
            const categoryActivity = category_activity
                ?.filter((ca: any) => {
                    if (statsInteractionFilter === 'total') return true;
                    if (statsInteractionFilter === 'site_visits') return false; // Site visits aren't tied to categories
                    return ca.event_type === statsInteractionFilter;
                })
                .reduce((acc: any[], ca: any) => {
                    const existing = acc.find(item => item.name === ca.category);
                    const val = Number(ca.count);
                    if (existing) {
                        existing.value += val;
                    } else {
                        acc.push({ name: ca.category, value: val });
                    }
                    return acc;
                }, [])
                .sort((a: any, b: any) => b.value - a.value);

            // Process Business Activity
            const businessActivity = business_activity
                ?.filter((ba: any) => {
                    if (statsFilterCategory !== 'all' && ba.category !== statsFilterCategory) return false;
                    if (statsInteractionFilter === 'site_visits') return false;
                    if (statsInteractionFilter === 'total') return true;
                    return ba.event_type === statsInteractionFilter;
                })
                .reduce((acc: any[], ba: any) => {
                    const existing = acc.find(item => item.id === ba.id);
                    const val = Number(ba.count);
                    if (existing) {
                        existing.currentValue += val;
                        existing[ba.event_type] = val;
                    } else {
                        acc.push({
                            id: ba.id,
                            name: ba.name,
                            category: ba.category,
                            currentValue: val,
                            [ba.event_type]: val
                        });
                    }
                    return acc;
                }, [])
                .sort((a: any, b: any) => b.currentValue - a.currentValue);

            const totalVisitsCount = visits?.reduce((acc: number, v: any) => acc + Number(v.count), 0) || 0;

            const cats: Record<string, number> = {};
            bData.forEach((b: any) => {
                if (b.category) cats[b.category] = (cats[b.category] || 0) + 1;
            });

            const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });
            const todayEntry = visits?.find((v: any) => v.date.startsWith(todayStr));
            const todayVisitsCount = todayEntry ? Number(todayEntry.count) : 0;

            setGeneralStats({
                totalBusinesses: bData.length,
                activeBusinesses: bData.filter((b: any) => b.active).length,
                totalUsers: usersCount || 0,
                monthlyRevenue: mRev,
                totalRevenue: tRev,
                totalVisits: totalVisitsCount, 
                periodVisits: totalVisitsCount,
                todayVisits: todayVisitsCount,
                categoryDistribution: cats,
                chartData,
                categoryActivity: categoryActivity || [],
                businessActivity: businessActivity || [],
                businessTableData: (businessActivity || [])
                    .reduce((acc: any[], ba: any) => {
                        const bId = ba.business_id || ba.id;
                        let existing = acc.find(item => item.id === bId);
                        if (!existing) {
                            existing = {
                                id: bId,
                                name: ba.name,
                                category: ba.category,
                                view: 0,
                                open: 0,
                                whatsapp: 0,
                                map: 0,
                                web: 0,
                                total: 0
                            };
                            acc.push(existing);
                        }
                        const val = Number(ba.count);
                        if (ba.event_type && ba.event_type in existing) {
                            existing[ba.event_type] = (existing[ba.event_type] || 0) + val;
                        }
                        existing.total += val;
                        return acc;
                    }, [])
            });
        }
    };

    const toggleActive = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('businesses')
            .update({ active: !currentStatus })
            .eq('id', id);

        if (!error) {
            const biz = businesses.find(b => b.id === id);
            
            // If we are activating (!currentStatus is true) and we have the business data
            if (!currentStatus && biz) {
                const userEmail = biz.profiles?.email;
                if (userEmail && emailConfigs.payment) {
                    console.log('Activating and sending confirmation email to:', userEmail);
                    supabase.functions.invoke('send-confirmation-email', {
                        body: {
                            email: userEmail,
                            businessName: biz.name,
                            expiryDate: biz.subscription_expires_at
                        }
                    }).catch(err => console.error('Error sending manual activation email:', err));
                }
            }

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
            updates.push({ key: 'email_recovery_enabled', value: emailConfigs.recovery.toString() });

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#7f1d1d' }}>
                    <LayoutDashboard size={24} />
                    <h1 style={{ color: '#7f1d1d', margin: 0, fontSize: '1.25rem' }}>Panel Administrador</h1>
                    <div style={{ 
                        background: '#fef2f2', 
                        color: '#991b1b', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '20px', 
                        fontSize: '0.85rem', 
                        fontWeight: '700',
                        border: '1px solid #fee2e2',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 2px 4px rgba(127, 29, 29, 0.05)'
                    }}>
                        <Users size={14} />
                        Hoy: {generalStats.todayVisits}
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="glass-card" style={{ 
                display: 'flex', 
                gap: '0.25rem', 
                padding: '0.4rem', 
                marginBottom: '2rem', 
                overflowX: 'auto',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                WebkitOverflowScrolling: 'touch'
            }}>
                {[
                    { id: 'businesses', label: 'Negocios', icon: <LayoutDashboard size={18} /> },
                    { id: 'stats', label: 'Evolución e Ingresos', icon: <TrendingUp size={18} /> },
                    { id: 'prices', label: 'Precios', icon: <CreditCard size={18} /> },
                    { id: 'promo', label: 'Pop-up Promo', icon: <Settings size={18} /> },
                    { id: 'emails', label: 'Gestión Emails', icon: <Mail size={18} /> },
                    { id: 'useful_info', label: 'Información Útil', icon: <MessageCircle size={18} /> }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            padding: '0.6rem 1.25rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                            color: activeTab === tab.id ? 'white' : 'var(--text-main)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab: Useful Info */}
            {activeTab === 'useful_info' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                        <button 
                            onClick={() => {
                                setSelectedNoteForEdit(null);
                                setIsUsefulNoteModalOpen(true);
                            }} 
                            className="btn-primary"
                        >
                            <MessageCircle size={18} /> Nueva Nota Informativa
                        </button>
                    </div>

                    {loadingNotes ? (
                        <p>Cargando notas...</p>
                    ) : (
                        <div className="glass-card" style={{ padding: '1rem' }}>
                            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                                    <thead style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '1rem' }}>Título</th>
                                            <th style={{ textAlign: 'center', padding: '1rem' }}>Fecha</th>
                                            <th style={{ textAlign: 'center', padding: '1rem' }}>Estado</th>
                                            <th style={{ textAlign: 'center', padding: '1rem' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usefulNotes.map((note) => (
                                            <tr key={note.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        {note.image_url && (
                                                            <img 
                                                                src={note.image_url} 
                                                                alt={note.title} 
                                                                style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} 
                                                            />
                                                        )}
                                                        <span>{note.title}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem', opacity: 0.8 }}>
                                                    {new Date(note.created_at).toLocaleDateString()}
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => toggleNoteVisibility(note.id, note.is_visible)}
                                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                                                        title={note.is_visible ? 'Visible' : 'Oculto'}
                                                    >
                                                        {note.is_visible ? <Eye size={20} color="#10b981" /> : <EyeOff size={20} color="#ef4444" />}
                                                    </button>
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedNoteForEdit(note);
                                                                setIsUsefulNoteModalOpen(true);
                                                            }}
                                                            className="btn-primary"
                                                            style={{
                                                                padding: '8px',
                                                                background: 'rgba(255,255,255,0.05)',
                                                                color: 'var(--text-main)',
                                                                border: '1px solid var(--border-light)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteNote(note.id, note.title)}
                                                            className="btn-primary"
                                                            style={{
                                                                padding: '8px',
                                                                background: 'rgba(239, 68, 68, 0.1)',
                                                                color: '#ef4444',
                                                                border: '1px solid rgba(239, 68, 68, 0.2)',
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
                                        ))}
                                        {usefulNotes.length === 0 && (
                                            <tr>
                                                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>No hay notas informativas cargadas.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Tab: Emails */}
            {activeTab === 'emails' && (
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
                            { id: 'recovery', label: 'Recuperar Clave', key: 'recovery' },
                            { id: 'payment_confirmation', label: 'Confirmación Pago', key: 'payment' },
                            { id: 'expiry_reminder', label: 'Aviso Vencimiento', key: 'expiry' },
                            { id: 'deactivation_notice', label: 'Aviso Desactivación', key: 'deactivation' }
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
            )}

            {/* Tab: Stats */}
            {activeTab === 'stats' && (
                <>
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
                        <button
                            onClick={() => fetchDashboardData()}
                            className="btn-primary"
                            title="Actualizar Estadísticas"
                            style={{
                                height: '38px',
                                padding: '0 1rem',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--border-light)',
                                margin: 0,
                                marginLeft: '0.5rem'
                            }}
                        >
                            <RotateCw size={18} />
                        </button>
                    </div>

                    <div style={{ 
                        background: 'rgba(0,0,0,0.2)', 
                        padding: '1rem', 
                        borderRadius: '12px', 
                        border: '1px solid var(--glass-border)',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <TrendingUp size={18} color="var(--primary)" />
                            <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>Filtrar por interacción:</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {[
                                { id: 'total', label: 'Todas las Interacciones' },
                                { id: 'site_visits', label: 'Visitas Generales' },
                                { id: 'view', label: 'Impresiones (En Lista)' },
                                { id: 'open', label: 'Vistas de Perfil' },
                                { id: 'whatsapp', label: 'WhatsApp' },
                                { id: 'map', label: 'Ubicación' },
                                { id: 'web', label: 'Sitio Web' }
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setStatsInteractionFilter(filter.id as any)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '20px',
                                        fontSize: '0.8rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        border: '1px solid',
                                        background: statsInteractionFilter === filter.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                        color: statsInteractionFilter === filter.id ? 'white' : 'var(--text-main)',
                                        borderColor: statsInteractionFilter === filter.id ? 'var(--primary)' : 'var(--border-light)',
                                    }}
                                >
                                    {filter.label}
                                </button>
                            ))}
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

                    {/* Main Evolution Chart - TOP 100% width */}
                    <div className="glass-card" style={{ padding: '1.5rem', width: '100%', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <BarChart3 size={20} color="var(--primary)" />
                                <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem' }}>Evolución: Ingresos e {
                                    statsInteractionFilter === 'total' ? 'Interacciones' : 
                                    statsInteractionFilter === 'site_visits' ? 'Visitas Generales' : 
                                    statsInteractionFilter === 'view' ? 'Impresiones' : 
                                    statsInteractionFilter === 'open' ? 'Vistas de Perfil' :
                                    statsInteractionFilter === 'whatsapp' ? 'WhatsApp' : 
                                    statsInteractionFilter === 'map' ? 'Ubicación' : 'Sitio Web'
                                }</h3>
                            </div>
                        </div>
                        <div style={{ width: '100%', height: '350px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={generalStats.chartData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f26522" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f26522" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="var(--text-main)"
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
                                            name === 'revenue' ? 'Ingresos' : (
                                                statsInteractionFilter === 'total' ? 'Interacciones' : 
                                                statsInteractionFilter === 'site_visits' ? 'Visitas Generales' : 
                                                statsInteractionFilter === 'view' ? 'Impresiones' :
                                                statsInteractionFilter === 'open' ? 'Vistas de Perfil' :
                                                statsInteractionFilter.charAt(0).toUpperCase() + statsInteractionFilter.slice(1)
                                            )
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
                                        dataKey="interactions"
                                        stroke="#f26522"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorInteractions)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        {/* Category Popularity Chart */}
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                <BarChart3 size={20} color="var(--primary)" />
                                <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem' }}>Popularidad por {
                                    statsInteractionFilter === 'total' ? 'Categorías' : 
                                    statsInteractionFilter === 'site_visits' ? 'Visitas Generales' : 
                                    statsInteractionFilter === 'view' ? 'Impresiones' : 
                                    statsInteractionFilter === 'open' ? 'Vistas de Perfil' :
                                    statsInteractionFilter === 'whatsapp' ? 'WhatsApp' : 
                                    statsInteractionFilter === 'map' ? 'Ubicación' : 'Sitio Web'
                                }</h3>
                            </div>
                            <div style={{ width: '100%', height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={generalStats.categoryActivity}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" vertical={false} />
                                        <XAxis dataKey="name" stroke="var(--text-main)" fontSize={11} tickLine={false} axisLine={false} />
                                        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            contentStyle={{ background: '#ffffff', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-main)' }}
                                            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                        />
                                        <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]}>
                                            {generalStats.categoryActivity.map((_entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fillOpacity={0.8 - (Math.min(index, 10) * 0.05)} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Business Activity Chart */}
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <TrendingUp size={20} color="var(--primary)" />
                                    <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem' }}>Top {
                                        statsInteractionFilter === 'total' ? 'Actividad' : 
                                        statsInteractionFilter === 'site_visits' ? 'Tráfico' : 
                                        statsInteractionFilter === 'view' ? 'Impresiones' :
                                        statsInteractionFilter === 'open' ? 'Vistas de Perfil' :
                                        statsInteractionFilter === 'whatsapp' ? 'WhatsApp' : 
                                        statsInteractionFilter === 'map' ? 'Ubicación' : 'Sitio Web'
                                    } por Negocio</h3>
                                </div>
                                <select
                                    value={statsFilterCategory}
                                    onChange={(e) => setStatsFilterCategory(e.target.value)}
                                    className="input-field"
                                    style={{ margin: 0, fontSize: '0.8rem', padding: '4px 8px', width: 'auto', background: 'rgba(0,0,0,0.3)' }}
                                >
                                    <option value="all">Todas las Categorías</option>
                                    {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div style={{ width: '100%', height: '300px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart 
                                        data={generalStats.businessActivity
                                            .filter(b => statsFilterCategory === 'all' || b.category === statsFilterCategory)
                                            .slice(0, 15)
                                        }
                                        layout="vertical"
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" horizontal={false} />
                                        <XAxis type="number" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis dataKey="name" type="category" stroke="var(--text-main)" fontSize={10} width={100} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            contentStyle={{ background: '#ffffff', border: '1px solid var(--border-light)', borderRadius: '8px', color: 'var(--text-main)' }}
                                            formatter={(value: any) => [value, 
                                                statsInteractionFilter === 'total' ? 'Interacciones' : 
                                                statsInteractionFilter === 'view' ? 'Impresiones' :
                                                statsInteractionFilter === 'open' ? 'Vistas de Perfil' :
                                                statsInteractionFilter.charAt(0).toUpperCase() + statsInteractionFilter.slice(1)
                                            ]}
                                            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                        />
                                        <Bar dataKey="currentValue" fill="#d97706" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <TrendingUp size={20} color="var(--primary)" />
                            <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem' }}>Detalle de Actividad por Negocio</h3>
                        </div>
                        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <th onClick={() => handleStatsSort('name')} style={{ textAlign: 'left', padding: '1rem', cursor: 'pointer' }}>
                                            Negocio {statsTableSortConfig.key === 'name' ? (statsTableSortConfig.direction === 'asc' ? '↑' : statsTableSortConfig.direction === 'desc' ? '↓' : '') : ''}
                                        </th>
                                        <th onClick={() => handleStatsSort('open')} style={{ textAlign: 'center', padding: '1rem', cursor: 'pointer' }}>
                                            Vistas Perfil {statsTableSortConfig.key === 'open' ? (statsTableSortConfig.direction === 'asc' ? '↑' : statsTableSortConfig.direction === 'desc' ? '↓' : '') : ''}
                                        </th>
                                        <th onClick={() => handleStatsSort('whatsapp')} style={{ textAlign: 'center', padding: '1rem', cursor: 'pointer' }}>
                                            WhatsApp {statsTableSortConfig.key === 'whatsapp' ? (statsTableSortConfig.direction === 'asc' ? '↑' : statsTableSortConfig.direction === 'desc' ? '↓' : '') : ''}
                                        </th>
                                        <th onClick={() => handleStatsSort('map')} style={{ textAlign: 'center', padding: '1rem', cursor: 'pointer' }}>
                                            Ubicación {statsTableSortConfig.key === 'map' ? (statsTableSortConfig.direction === 'asc' ? '↑' : statsTableSortConfig.direction === 'desc' ? '↓' : '') : ''}
                                        </th>
                                        <th onClick={() => handleStatsSort('web')} style={{ textAlign: 'center', padding: '1rem', cursor: 'pointer' }}>
                                            Sitio Web {statsTableSortConfig.key === 'web' ? (statsTableSortConfig.direction === 'asc' ? '↑' : statsTableSortConfig.direction === 'desc' ? '↓' : '') : ''}
                                        </th>
                                        <th onClick={() => handleStatsSort('total')} style={{ textAlign: 'center', padding: '1rem', cursor: 'pointer' }}>
                                            Total {statsTableSortConfig.key === 'total' ? (statsTableSortConfig.direction === 'asc' ? '↑' : statsTableSortConfig.direction === 'desc' ? '↓' : '') : ''}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedStatsTableData.map((row) => (
                                        <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '0.75rem 1rem', fontWeight: '500' }}>{row.name}</td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{row.open || 0}</td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{row.whatsapp || 0}</td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{row.map || 0}</td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{row.web || 0}</td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 'bold', color: 'var(--primary)' }}>{row.total || 0}</td>
                                        </tr>
                                    ))}
                                    {sortedStatsTableData.length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', opacity: 0.6 }}>No hay datos de actividad para este periodo.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}


            {/* Tab: Prices */}
            {activeTab === 'prices' && (
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
            )}

                {/* Promo Pop-up Config */}
            {/* Tab: Promo Pop-up */}
            {activeTab === 'promo' && (
                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1000px', margin: '0 auto 2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <BarChart3 size={24} color="var(--primary)" />
                        <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem' }}>Pop-up Promocional</h3>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Configurá el anuncio que verán los usuarios al ingresar a su panel.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
            )}

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

            {activeTab === 'businesses' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                        <button 
                            onClick={() => setIsUsersModalOpen(true)} 
                            className="btn-primary" 
                            style={{ 
                                background: 'rgba(255,255,255,0.05)', 
                                color: 'var(--text-main)', 
                                border: '1px solid var(--border-light)',
                                padding: '0.5rem 1rem',
                                fontSize: '0.85rem'
                            }}
                        >
                            <Users size={18} /> Ver Usuarios Registrados
                        </button>
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
                                            <th onClick={() => handleSort('type')} style={{ textAlign: 'center', padding: '1rem', cursor: 'pointer' }}>
                                                Tipo {sortConfig.key === 'type' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '') : ''}
                                            </th>
                                            <th onClick={() => handleSort('category')} style={{ textAlign: 'center', padding: '1rem', cursor: 'pointer' }}>
                                                Rubro {sortConfig.key === 'category' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '') : ''}
                                            </th>
                                            <th onClick={() => handleSort('subscription_expires_at')} style={{ textAlign: 'left', padding: '1rem', cursor: 'pointer' }}>
                                                Vencimiento {sortConfig.key === 'subscription_expires_at' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '') : ''}
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
                                                     <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                         <div title={business.type === 'classified' ? 'Clasificado' : 'Negocio'} style={{ display: 'flex', justifyContent: 'center' }}>
                                                             {business.type === 'classified' ? <ShoppingBag size={18} color="#1e3a8a" /> : <Home size={18} color="#009b3a" />}
                                                         </div>
                                                     </td>
                                                     <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                         <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                                                             {business.category.split(',').map((cat, idx) => (
                                                                 <span key={idx} title={cat.trim()} style={{ fontSize: '1.2rem', cursor: 'help' }}>
                                                                     {CATEGORY_ICONS[cat.trim()] || '✨'}
                                                                 </span>
                                                             ))}
                                                         </div>
                                                     </td>

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
                                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                                            <button
                                                                onClick={() => setSelectedBusinessForStats({ id: business.id, name: business.name })}
                                                                className="btn-primary"
                                                                title="Estadísticas"
                                                                style={{
                                                                    padding: '8px',
                                                                    background: 'rgba(255,255,255,0.05)',
                                                                    color: 'var(--text-main)',
                                                                    border: '1px solid var(--border-light)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}
                                                            >
                                                                <BarChart3 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => setSelectedBusinessForEdit(business)}
                                                                className="btn-primary"
                                                                title="Editar Información"
                                                                style={{
                                                                    padding: '8px',
                                                                    background: 'rgba(255,255,255,0.05)',
                                                                    color: 'var(--text-main)',
                                                                    border: '1px solid var(--border-light)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}
                                                            >
                                                                <Pencil size={16} />
                                                            </button>
                                                            {business.phone && (
                                                                <a
                                                                    href={`https://wa.me/${business.phone.replace(/\D/g, '')}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="btn-primary"
                                                                    title="WhatsApp Dueño"
                                                                    style={{
                                                                        padding: '8px',
                                                                        background: 'var(--whatsapp)',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}
                                                                >
                                                                    <MessageCircle size={16} />
                                                                </a>
                                                            )}
                                                            <button
                                                                onClick={() => setSelectedBusinessForTransfer({ id: business.id, name: business.name })}
                                                                className="btn-primary"
                                                                title="Transferir Negocio"
                                                                style={{
                                                                    padding: '8px',
                                                                    background: 'rgba(255,255,255,0.05)',
                                                                    color: 'var(--text-main)',
                                                                    border: '1px solid var(--border-light)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}
                                                            >
                                                                <UserPlus size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => toggleActive(business.id, business.active)}
                                                                className="btn-primary"
                                                                title={business.active ? 'Ocultar Negocio' : 'Mostrar Negocio'}
                                                                style={{
                                                                    padding: '8px',
                                                                    background: 'rgba(255,255,255,0.05)',
                                                                    color: business.active ? '#22c55e' : '#ef4444',
                                                                    border: `1px solid ${business.active ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}
                                                            >
                                                                {business.active ? <Eye size={18} /> : <EyeOff size={18} />}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteBusiness(business.id, business.name)}
                                                                className="btn-primary"
                                                                title="Eliminar DEFINITIVAMENTE"
                                                                style={{
                                                                    padding: '8px',
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
                </>
            )}

            {isUsefulNoteModalOpen && (
                <UsefulNoteModal
                    note={selectedNoteForEdit}
                    onClose={() => setIsUsefulNoteModalOpen(false)}
                    onSave={() => {
                        setIsUsefulNoteModalOpen(false);
                        fetchUsefulNotes();
                    }}
                />
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
            {selectedBusinessForEdit && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="glass-card" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', position: 'relative' }}>
                        <button 
                            onClick={() => setSelectedBusinessForEdit(null)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
                        >
                            <XCircle size={24} />
                        </button>
                        <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent)' }}>Editar Negocio: {selectedBusinessForEdit.name}</h2>
                        <BusinessForm 
                            business={selectedBusinessForEdit as any}
                            userId={selectedBusinessForEdit.owner_id}
                            onClose={() => setSelectedBusinessForEdit(null)}
                            onSave={() => {
                                setSelectedBusinessForEdit(null);
                                fetchBusinesses();
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

