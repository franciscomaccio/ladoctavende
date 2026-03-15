import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Tag, MessageCircle, MapPin, X, Globe } from 'lucide-react';
import type { Business, Promotion } from '../types/database';
import { recordBusinessEvent } from '../lib/analytics';

interface PromotionWithBusiness extends Promotion {
    businesses: Business;
}

import { useHorizontalScroll } from '../hooks/useHorizontalScroll';

{ id: 6, name: 'Sáb' }
];

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

export default function Promotions() {
    const scrollRef = useHorizontalScroll();
    const [promotions, setPromotions] = useState<PromotionWithBusiness[]>([]);
    const [filteredPromos, setFilteredPromos] = useState<PromotionWithBusiness[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDay());
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedPromotion, setSelectedPromotion] = useState<PromotionWithBusiness | null>(null);

    useEffect(() => {
        fetchPromotions();
    }, []);

    useEffect(() => {
        filterPromos();
    }, [searchTerm, promotions, selectedDay, selectedCategory]);

    function filterPromos() {
        const lowerSearch = searchTerm.toLowerCase();
        let filtered = promotions.filter(p =>
            p.title.toLowerCase().includes(lowerSearch) ||
            p.description?.toLowerCase().includes(lowerSearch) ||
            p.businesses.name.toLowerCase().includes(lowerSearch)
        );

        if (selectedDay !== null) {
            filtered = filtered.filter(p => p.days_of_week.includes(selectedDay));
        }

        if (selectedCategory) {
            filtered = filtered.filter(p => p.businesses.category === selectedCategory);
        }

        setFilteredPromos(filtered);
    }

    // Debounce view tracking to avoid flooding the DB
    useEffect(() => {
        if (filteredPromos.length === 0) return;

        const timer = setTimeout(() => {
            filteredPromos.forEach(p => recordBusinessEvent(p.businesses.id, 'view', p.id));
        }, 1000);

        return () => clearTimeout(timer);
    }, [filteredPromos]);

    async function fetchPromotions() {
        try {
            const { data, error } = await supabase
                .from('promotions')
                .select('*, businesses(*)')
                .returns<PromotionWithBusiness[]>();

            if (error) throw error;
            // Only show promos from active businesses
            setPromotions(data?.filter(p => p.businesses.active) || []);
        } catch (error) {
            console.error('Error fetching promotions:', error);
        } finally {
            setLoading(false);
        }
    }

    const openWhatsApp = (e: React.MouseEvent, businessId: string, phone: string, promoId?: string) => {
        e.stopPropagation();
        recordBusinessEvent(businessId, 'whatsapp', promoId);
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    const openMaps = (e: React.MouseEvent, businessId: string, lat: number, lng: number, promoId?: string) => {
        e.stopPropagation();
        recordBusinessEvent(businessId, 'map', promoId);
        window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    };

    return (
        <div className="container-wide" style={{ paddingTop: '1rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '1.5rem', color: 'var(--text-main)' }}>Promociones</h1>

            {/* Day Filter */}
            <div ref={scrollRef} style={{ display: 'flex', overflowX: 'auto', gap: '0.5rem', marginBottom: '1.5rem', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
                <div
                    className={`category-pill ${selectedDay === null ? 'active' : ''}`}
                    onClick={() => setSelectedDay(null)}
                    style={{ padding: '8px 16px', minWidth: 'auto' }}
                >
                    <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Todos</span>
                </div>
                {DAYS.map(day => (
                    <div
                        key={day.id}
                        className={`category-pill ${selectedDay === day.id ? 'active' : ''}`}
                        onClick={() => setSelectedDay(day.id)}
                        style={{ padding: '8px 16px', minWidth: 'auto' }}
                    >
                        <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{day.name}</span>
                    </div>
                ))}
            </div>

            {/* Category Filter */}
            <div ref={scrollRef} style={{ display: 'flex', overflowX: 'auto', gap: '0.5rem', marginBottom: '1.5rem', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
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

            <div style={{ position: 'relative', margin: '0 0 1.5rem' }}>
                <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                    type="text"
                    className="input-field"
                    style={{ paddingLeft: '50px', background: '#f3f4f6', border: 'none' }}
                    placeholder="Buscar ofertas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                        <p>Cargando promos...</p>
                    </div>
                ) : (
                    filteredPromos.length > 0 ? (
                        filteredPromos.map(promo => (
                            <div
                                key={promo.id}
                                className="business-card-h"
                                style={{ cursor: 'pointer', border: 'none', minHeight: '120px', background: '#7f1d1d', color: 'white' }}
                                onClick={() => {
                                    recordBusinessEvent(promo.businesses.id, 'open', promo.id);
                                    setSelectedPromotion(promo);
                                }}
                            >
                                <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                                    {(promo.image_url || promo.businesses.image_url) ? (
                                        <img
                                            src={promo.image_url || promo.businesses.image_url!}
                                            alt={promo.title}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', background: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Tag size={32} color="#fca5a5" />
                                        </div>
                                    )}
                                </div>
                                <div className="business-info" style={{ padding: '12px', justifyContent: 'flex-start' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#fca5a5', fontWeight: '700', marginBottom: '2px' }}>{promo.businesses.name}</span>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white', marginBottom: '4px', lineHeight: '1.2' }}>{promo.title}</h3>
                                    <p style={{
                                        fontSize: '0.85rem', color: '#fecaca',
                                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden', margin: '0 0 8px 0', lineHeight: '1.4'
                                    }}>
                                        {promo.description}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#f9fafb', borderRadius: '16px' }}>
                            <Tag size={48} color="#ccc" style={{ marginBottom: '1rem' }} />
                            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>No hay promos para este día</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Probá eligiendo otro día o buscando algo específico.</p>
                        </div>
                    )
                )}
            </div>

            {selectedPromotion && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    padding: '1rem'
                }} onClick={() => setSelectedPromotion(null)}>
                    <div
                        style={{
                            maxWidth: '500px', width: '100%', maxHeight: '90vh',
                            background: 'white', borderRadius: '20px', position: 'relative',
                            display: 'flex', flexDirection: 'column', overflow: 'hidden',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedPromotion(null)}
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
                            {(selectedPromotion.image_url || selectedPromotion.businesses.image_url) && (
                                <img
                                    src={selectedPromotion.image_url || selectedPromotion.businesses.image_url!}
                                    alt={selectedPromotion.title}
                                    style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }}
                                />
                            )}

                            <div style={{ padding: '1.5rem' }}>
                                <span style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '0.9rem' }}>{selectedPromotion.businesses.name}</span>
                                <h2 style={{ fontSize: '1.75rem', margin: '0.5rem 0', fontWeight: '800' }}>{selectedPromotion.title}</h2>
                                <p style={{ lineHeight: '1.6', color: 'var(--text-muted)', fontSize: '1rem' }}>{selectedPromotion.description}</p>
                            </div>
                        </div>

                        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '0.75rem', background: '#fff' }}>
                            <button
                                className="btn-whatsapp"
                                style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
                                onClick={(e) => openWhatsApp(e, selectedPromotion.businesses.id, selectedPromotion.businesses.phone || '', selectedPromotion.id)}
                            >
                                <MessageCircle size={20} fill="currentColor" /> WhatsApp
                            </button>

                            <button
                                className="btn-web"
                                style={{ flex: 1, padding: '12px', justifyContent: 'center', opacity: selectedPromotion.businesses.website_url ? 1 : 0.5 }}
                                onClick={() => {
                                    if (selectedPromotion.businesses.website_url) {
                                        recordBusinessEvent(selectedPromotion.businesses.id, 'web', selectedPromotion.id);
                                        window.open(selectedPromotion.businesses.website_url, '_blank');
                                    }
                                }}
                                disabled={!selectedPromotion.businesses.website_url}
                            >
                                <Globe size={20} /> Web
                            </button>

                            <button
                                className="btn-map"
                                style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
                                onClick={(e) => openMaps(e, selectedPromotion.businesses.id, selectedPromotion.businesses.location_lat || 0, selectedPromotion.businesses.location_lng || 0, selectedPromotion.id)}
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
