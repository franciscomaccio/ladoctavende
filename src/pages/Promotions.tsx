import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Tag, MessageCircle, MapPin, X, Globe } from 'lucide-react';
import type { Business, Promotion } from '../types/database';

interface PromotionWithBusiness extends Promotion {
    businesses: Business;
}

const DAYS = [
    { id: 0, name: 'Dom' },
    { id: 1, name: 'Lun' },
    { id: 2, name: 'Mar' },
    { id: 3, name: 'Mié' },
    { id: 4, name: 'Jue' },
    { id: 5, name: 'Vie' },
    { id: 6, name: 'Sáb' }
];

export default function Promotions() {
    const [promotions, setPromotions] = useState<PromotionWithBusiness[]>([]);
    const [filteredPromos, setFilteredPromos] = useState<PromotionWithBusiness[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDay());
    const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

    useEffect(() => {
        fetchPromotions();
    }, []);

    useEffect(() => {
        filterPromos();
    }, [searchTerm, promotions, selectedDay]);

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

        setFilteredPromos(filtered);
    }

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

    const openWhatsApp = (e: React.MouseEvent, phone: string) => {
        e.stopPropagation();
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    const openMaps = (e: React.MouseEvent, lat: number, lng: number) => {
        e.stopPropagation();
        if (lat && lng) {
            window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
        }
    };

    return (
        <div className="container" style={{ paddingTop: '1rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Promociones</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>Las mejores ofertas de hoy en Córdoba.</p>

            {/* Day Filter */}
            <div style={{ display: 'flex', overflowX: 'auto', gap: '0.5rem', marginBottom: '1.5rem', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
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
                                onClick={() => setSelectedBusiness(promo.businesses)}
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
                                    <div style={{
                                        position: 'absolute', top: '8px', left: '8px', background: 'var(--primary)',
                                        color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                    }}>
                                        OFERTA
                                    </div>
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

                        <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '0.75rem', background: '#fff' }}>
                            <button
                                className="btn-whatsapp"
                                style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
                                onClick={(e) => openWhatsApp(e, selectedBusiness.phone || '')}
                            >
                                <MessageCircle size={20} fill="currentColor" /> WhatsApp
                            </button>

                            <button
                                className="btn-web"
                                style={{ flex: 1, padding: '12px', justifyContent: 'center', opacity: selectedBusiness.website_url ? 1 : 0.5 }}
                                onClick={() => selectedBusiness.website_url && window.open(selectedBusiness.website_url, '_blank')}
                                disabled={!selectedBusiness.website_url}
                            >
                                <Globe size={20} /> Web
                            </button>

                            <button
                                className="btn-primary"
                                style={{ flex: 1, padding: '12px', background: '#f3f4f6', color: 'var(--text-main)', border: '1px solid var(--border-light)', justifyContent: 'center' }}
                                onClick={(e) => openMaps(e, selectedBusiness.location_lat || 0, selectedBusiness.location_lng || 0)}
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
