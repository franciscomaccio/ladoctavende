import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, MapPin, Phone, X, Tag, LayoutGrid } from 'lucide-react';
import type { Business, Promotion } from '../types/database';

interface PromotionWithBusiness extends Promotion {
    businesses: Business;
}

const CATEGORIES = ['Gastronomía', 'Moda', 'Salud', 'Para el hogar', 'Vehículo', 'Servicios', 'Otros'];

export default function Home() {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
    const [viewMode, setViewMode] = useState<'businesses' | 'promotions'>('businesses');
    const [promotions, setPromotions] = useState<PromotionWithBusiness[]>([]);
    const [filteredPromotions, setFilteredPromotions] = useState<PromotionWithBusiness[]>([]);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

    useEffect(() => {
        fetchBusinesses();
        fetchPromotions();
    }, []);

    useEffect(() => {
        filterContent();
    }, [searchTerm, selectedCategory, selectedDay, businesses, promotions, viewMode]);

    async function fetchPromotions() {
        try {
            const { data, error } = await supabase
                .from('promotions')
                .select('*, businesses(*)')
                .returns<PromotionWithBusiness[]>();

            if (error) throw error;
            // Only keep promotions from active businesses
            setPromotions(data?.filter(p => p.businesses.active) || []);
        } catch (error) {
            console.error('Error fetching promotions:', error);
        }
    }

    async function fetchBusinesses() {
        try {
            const { data, error } = await supabase
                .from('businesses')
                .select('*')
                .eq('active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBusinesses(data || []);
        } catch (error) {
            console.error('Error fetching businesses:', error);
        } finally {
            setLoading(false);
        }
    }

    function filterContent() {
        if (viewMode === 'businesses') {
            let filtered = businesses;
            if (searchTerm) {
                const lowerSearch = searchTerm.toLowerCase();
                filtered = filtered.filter(b =>
                    b.name.toLowerCase().includes(lowerSearch) ||
                    b.description?.toLowerCase().includes(lowerSearch)
                );
            }
            if (selectedCategory) {
                filtered = filtered.filter(b => b.category === selectedCategory);
            }
            setFilteredBusinesses(filtered);
        } else {
            let filtered = promotions;
            if (searchTerm) {
                const lowerSearch = searchTerm.toLowerCase();
                filtered = filtered.filter(p =>
                    p.title.toLowerCase().includes(lowerSearch) ||
                    p.description?.toLowerCase().includes(lowerSearch) ||
                    p.businesses.name.toLowerCase().includes(lowerSearch)
                );
            }
            if (selectedCategory) {
                filtered = filtered.filter(p => p.businesses.category === selectedCategory);
            }
            if (selectedDay !== null) {
                filtered = filtered.filter(p => p.days_of_week.includes(selectedDay));
            }
            setFilteredPromotions(filtered);
        }
    }

    const openInMaps = (lat: number, lng: number) => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };

    const openWhatsApp = (phone: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    return (
        <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem', background: 'linear-gradient(to right, var(--accent), #fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Descubrí Ladoctavende</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Encontrá los mejores emprendimientos y comercios en un solo lugar.</p>
            </div>

            {/* Mode Switcher */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button
                    className={`btn-primary ${viewMode === 'businesses' ? 'active' : ''}`}
                    style={{ background: viewMode === 'businesses' ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: viewMode === 'businesses' ? 'black' : 'white' }}
                    onClick={() => setViewMode('businesses')}
                >
                    <LayoutGrid size={20} /> Negocios
                </button>
                <button
                    className={`btn-primary ${viewMode === 'promotions' ? 'active' : ''}`}
                    style={{ background: viewMode === 'promotions' ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: viewMode === 'promotions' ? 'black' : 'white' }}
                    onClick={() => setViewMode('promotions')}
                >
                    <Tag size={20} /> Promociones
                </button>
            </div>

            {/* Search & Filters */}
            <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '3rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
                        <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            className="input-field"
                            style={{ paddingLeft: '45px' }}
                            placeholder={viewMode === 'businesses' ? "Buscar por nombre o descripción..." : "Buscar promos, negocios..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <select
                        className="input-field"
                        style={{ width: 'auto' }}
                        value={selectedCategory || ''}
                        onChange={(e) => setSelectedCategory(e.target.value || null)}
                    >
                        <option value="">Rubros</option>
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>

                    {viewMode === 'promotions' && (
                        <select
                            className="input-field"
                            style={{ width: 'auto' }}
                            value={selectedDay === null ? '' : selectedDay}
                            onChange={(e) => setSelectedDay(e.target.value === '' ? null : Number(e.target.value))}
                        >
                            <option value="">Cualquier día</option>
                            <option value="1">Lunes</option>
                            <option value="2">Martes</option>
                            <option value="3">Miércoles</option>
                            <option value="4">Jueves</option>
                            <option value="5">Viernes</option>
                            <option value="6">Sábado</option>
                            <option value="0">Domingo</option>
                        </select>
                    )}
                </div>
            </div>

            {/* Content List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
                {loading ? (
                    <p style={{ textAlign: 'center', gridColumn: '1/-1' }}>Cargando...</p>
                ) : viewMode === 'businesses' ? (
                    filteredBusinesses.length > 0 ? (
                        filteredBusinesses.map(business => (
                            <div
                                key={business.id}
                                className="glass-card"
                                style={{ overflow: 'hidden', cursor: 'pointer' }}
                                onClick={() => setSelectedBusiness(business)}
                            >
                                {business.image_url ? (
                                    <img src={business.image_url} alt={business.name} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '200px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Sin Imagen</span>
                                    </div>
                                )}
                                <div style={{ padding: '1.5rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>{business.category}</span>
                                    <h3 style={{ margin: '0.5rem 0' }}>{business.name}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {business.description || 'Sin descripción'}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p style={{ textAlign: 'center', gridColumn: '1/-1' }}>No se encontraron negocios.</p>
                    )
                ) : (
                    filteredPromotions.length > 0 ? (
                        filteredPromotions.map(promo => (
                            <div
                                key={promo.id}
                                className="glass-card"
                                style={{ overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--accent)' }}
                                onClick={() => setSelectedBusiness(promo.businesses)}
                            >
                                {promo.image_url ? (
                                    <img src={promo.image_url} alt={promo.title} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '180px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Tag size={40} style={{ color: 'var(--accent)', opacity: 0.3 }} />
                                    </div>
                                )}
                                <div style={{ padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 'bold' }}>PROMO</span>
                                        <div style={{ display: 'flex', gap: '3px' }}>
                                            {promo.days_of_week.map(d => (
                                                <span key={d} style={{ fontSize: '0.6rem', padding: '1px 4px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }}>
                                                    {['D', 'L', 'M', 'M', 'J', 'V', 'S'][d]}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <h3 style={{ margin: '0.5rem 0', color: 'var(--accent)' }}>{promo.title}</h3>
                                    <p style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{promo.businesses.name}</p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {promo.description}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p style={{ textAlign: 'center', gridColumn: '1/-1' }}>No hay promociones activos para estos filtros.</p>
                    )
                )}
            </div>

            {/* Detail Modal */}
            {selectedBusiness && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div className="glass-card" style={{ maxWidth: '600px', width: '100%', position: 'relative', overflow: 'hidden' }}>
                        <button
                            onClick={() => setSelectedBusiness(null)}
                            style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', padding: '5px', cursor: 'pointer', zIndex: 10 }}
                        >
                            <X size={24} />
                        </button>

                        {selectedBusiness.image_url && (
                            <img src={selectedBusiness.image_url} alt={selectedBusiness.name} style={{ width: '100%', maxHeight: '350px', objectFit: 'cover' }} />
                        )}

                        <div style={{ padding: '2rem' }}>
                            <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{selectedBusiness.category}</span>
                            <h2 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{selectedBusiness.name}</h2>
                            <p style={{ marginBottom: '2rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>{selectedBusiness.description}</p>

                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                {selectedBusiness.location_lat && selectedBusiness.location_lng && (
                                    <button className="btn-primary" onClick={() => openInMaps(selectedBusiness.location_lat!, selectedBusiness.location_lng!)}>
                                        <MapPin size={20} /> Ver en Mapa
                                    </button>
                                )}
                                {selectedBusiness.phone && (
                                    <button className="btn-primary" style={{ background: '#25D366' }} onClick={() => openWhatsApp(selectedBusiness.phone!)}>
                                        <Phone size={20} /> WhatsApp
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
