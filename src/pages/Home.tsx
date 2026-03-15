import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Tag, MessageCircle, MapPin, X, Globe } from 'lucide-react';
import type { Business, Promotion } from '../types/database';
import { recordBusinessEvent } from '../lib/analytics';

interface PromotionWithBusiness extends Promotion {
    businesses: Business;
}

import { useHorizontalScroll } from '../hooks/useHorizontalScroll';

const CATEGORIES = [
    { name: 'Belleza', icon: '💄' },
    { name: 'Deportes', icon: '⚽' },
    { name: 'Educación', icon: '📚' },
    { name: 'Gastronomía', icon: '🍔' },
    { name: 'Hogar', icon: '🏠' },
    { name: 'Inmobiliaria', icon: '🏢' },
    { name: 'Mascotas', icon: '🐾' },
    { name: 'Moda', icon: '👕' },
    { name: 'Salud', icon: '🏥' },
    { name: 'Servicios', icon: '🛠️' },
    { name: 'Tecnología', icon: '💻' },
    { name: 'Otros', icon: '✨' }
];

export default function Home({ type = 'business' }: { type?: 'business' | 'classified' }) {
    const scrollRef = useHorizontalScroll();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
    const [viewMode] = useState<'businesses' | 'promotions'>('businesses');
    const [promotions, setPromotions] = useState<PromotionWithBusiness[]>([]);
    const [selectedDay] = useState<number | null>(null);

    useEffect(() => {
        fetchBusinesses();
        fetchPromotions();
    }, [type]);

    useEffect(() => {
        filterContent();
    }, [searchTerm, selectedCategory, selectedDay, businesses, promotions, viewMode, type]);

    async function fetchPromotions() {
        try {
            const { data, error } = await supabase
                .from('promotions')
                .select('*, businesses(*)')
                .returns<PromotionWithBusiness[]>();

            if (error) throw error;
            // Only show promos from active businesses of the current type? 
            // Actually user asked for "promos" to have category filter, 
            // but didn't specify if they should be restricted by type.
            // Usually promos are for businesses, not classifieds.
            // Let's stick to what was there but maybe filter by type if needed?
            // "en la sección de promos, a lo que ya está, agregar el filtro por rubros como está en negocios."
            // For now, let's just make fetchBusinesses filter by type.
            const promos = data?.filter(p => p.businesses.active) || [];
            setPromotions(promos.sort(() => Math.random() - 0.5));
        } catch (error) {
            console.error('Error fetching promotions:', error);
        }
    }

    async function fetchBusinesses() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('businesses')
                .select('*')
                .eq('active', true)
                .eq('type', type);

            if (error) throw error;
            const shuffled = (data || []).sort(() => Math.random() - 0.5);
            setBusinesses(shuffled);
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
        }
    }

    // Debounce view tracking to avoid flooding the DB while typing
    useEffect(() => {
        if (filteredBusinesses.length === 0) return;

        const timer = setTimeout(() => {
            filteredBusinesses.forEach(b => recordBusinessEvent(b.id, 'view'));
        }, 1000);

        return () => clearTimeout(timer);
    }, [filteredBusinesses]);

    const openWhatsApp = (e: React.MouseEvent, businessId: string, phone: string) => {
        e.stopPropagation();
        recordBusinessEvent(businessId, 'whatsapp');
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    const openMaps = (e: React.MouseEvent, businessId: string, lat: number, lng: number) => {
        e.stopPropagation();
        recordBusinessEvent(businessId, 'map');
        if (lat && lng) {
            window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
        }
    };

    return (
        <div className="container-wide">
            {/* Search Bar */}
            <div style={{ position: 'relative', margin: '1rem 0 1.5rem' }}>
                <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                    id="search-input"
                    type="text"
                    className="input-field"
                    style={{ paddingLeft: '50px', background: '#f3f4f6', border: 'none' }}
                    placeholder={type === 'business' ? "Buscar negocios..." : "Buscar clasificados..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Categories */}
            <div ref={scrollRef} style={{ display: 'flex', overflowX: 'auto', gap: '0.5rem', marginBottom: '2rem', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
                {CATEGORIES.map(cat => (
                    <div
                        key={cat.name}
                        className={`category-pill ${selectedCategory === cat.name ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                    >
                        <div className="category-icon">{cat.icon}</div>
                        <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>{cat.name}</span>
                    </div>
                ))}
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {loading ? (
                    <p style={{ textAlign: 'center' }}>Cargando...</p>
                ) : (
                    filteredBusinesses.length > 0 ? (
                        filteredBusinesses.map(business => (
                            <div
                                key={business.id}
                                className="business-card-h"
                                onClick={() => {
                                    recordBusinessEvent(business.id, 'open');
                                    setSelectedBusiness(business);
                                }}
                                style={{ background: type === 'business' ? '#1f2937' : '#1e3a8a', color: 'white', border: 'none' }}
                            >
                                {business.image_url ? (
                                    <img src={business.image_url} alt={business.name} />
                                ) : (
                                    <div style={{ width: '120px', height: '120px', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Tag size={32} color="#9ca3af" />
                                    </div>
                                )}
                                <div className="business-info" style={{ padding: '12px', justifyContent: 'flex-start' }}>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '2px', color: 'white' }}>{business.name}</h3>
                                    <span style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '4px' }}>{business.category}</span>
                                    {business.description && (
                                        <p style={{
                                            fontSize: '0.85rem', color: '#d1d5db',
                                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden', margin: '0 0 8px 0', lineHeight: '1.4'
                                        }}>
                                            {business.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p style={{ textAlign: 'center' }}>No se encontraron {type === 'business' ? 'negocios' : 'clasificados'}.</p>
                    )
                )}
            </div>

            {/* Detail Modal */}
            {selectedBusiness && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    padding: '1rem'
                }} onClick={() => setSelectedBusiness(null)}>
                    <div
                        style={{
                            maxWidth: '500px', width: '100%', maxHeight: '90vh',
                            background: 'white', borderRadius: '20px', position: 'relative',
                            display: 'flex', flexDirection: 'column', overflow: 'hidden',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Close button inside and fixed */}
                        <button
                            onClick={() => setSelectedBusiness(null)}
                            style={{
                                position: 'absolute', right: '12px', top: '12px', background: 'rgba(255,255,255,0.8)',
                                border: 'none', color: 'var(--text-main)', cursor: 'pointer', zIndex: 10,
                                borderRadius: '50%', width: '36px', height: '36px', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
                            }}
                        >
                            <X size={24} />
                        </button>

                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {selectedBusiness.image_url && (
                                <img
                                    src={selectedBusiness.image_url}
                                    alt={selectedBusiness.name}
                                    style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }}
                                />
                            )}

                            <div style={{ padding: '1.5rem' }}>
                                <span style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.9rem' }}>{selectedBusiness.category}</span>
                                <h2 style={{ fontSize: '1.75rem', margin: '0.5rem 0' }}>{selectedBusiness.name}</h2>
                                <p style={{ lineHeight: '1.6', color: 'var(--text-muted)', fontSize: '1rem' }}>{selectedBusiness.description}</p>
                            </div>
                        </div>

                        {/* Footer always visible */}
                        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '0.75rem', background: '#fff' }}>
                            <button
                                className="btn-whatsapp"
                                style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
                                onClick={(e) => openWhatsApp(e, selectedBusiness.id, selectedBusiness.phone || '')}
                            >
                                <MessageCircle size={20} fill="currentColor" /> WhatsApp
                            </button>

                            <button
                                className="btn-web"
                                style={{ flex: 1, padding: '12px', justifyContent: 'center', opacity: selectedBusiness.website_url ? 1 : 0.5 }}
                                onClick={() => {
                                    if (selectedBusiness.website_url) {
                                        recordBusinessEvent(selectedBusiness.id, 'web');
                                        window.open(selectedBusiness.website_url, '_blank');
                                    }
                                }}
                                disabled={!selectedBusiness.website_url}
                            >
                                <Globe size={20} /> Web
                            </button>

                            <button
                                className="btn-map"
                                style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
                                onClick={(e) => openMaps(e, selectedBusiness.id, selectedBusiness.location_lat || 0, selectedBusiness.location_lng || 0)}
                            >
                                <MapPin size={20} /> Mapa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
