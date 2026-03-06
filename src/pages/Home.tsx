import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, MapPin, X, Tag, MessageCircle } from 'lucide-react';
import type { Business, Promotion } from '../types/database';

interface PromotionWithBusiness extends Promotion {
    businesses: Business;
}

const CATEGORIES = [
    { name: 'Gastronomía', icon: '🍔' },
    { name: 'Moda', icon: '👕' },
    { name: 'Servicios', icon: '🛠️' },
    { name: 'Vehículo', icon: '🚗' },
    { name: 'Hogar', icon: '🏠' },
    { name: 'Belleza', icon: '💄' },
    { name: 'Otros', icon: '✨' }
];

export default function Home() {
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
        }
    }

    const openWhatsApp = (e: React.MouseEvent, phone: string) => {
        e.stopPropagation();
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    return (
        <div className="container">
            {/* Search Bar */}
            <div style={{ position: 'relative', margin: '1rem 0 1.5rem' }}>
                <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                    type="text"
                    className="input-field"
                    style={{ paddingLeft: '50px', background: '#f3f4f6', border: 'none' }}
                    placeholder="Buscar negocios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Categories */}
            <div style={{ display: 'flex', overflowX: 'auto', gap: '0.5rem', marginBottom: '2rem', paddingBottom: '0.5rem', scrollbarWidth: 'none' }}>
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

            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Negocios cerca tuyo</h2>

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
                                onClick={() => setSelectedBusiness(business)}
                            >
                                {business.image_url ? (
                                    <img src={business.image_url} alt={business.name} />
                                ) : (
                                    <div style={{ width: '120px', height: '120px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Tag size={32} color="#ccc" />
                                    </div>
                                )}
                                <div className="business-info">
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '2px' }}>{business.name}</h3>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{business.category}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        <MapPin size={14} />
                                        <span>Nueva Córdoba</span> {/* Placeholder as in design */}
                                    </div>
                                    <div style={{ marginTop: 'auto', alignSelf: 'flex-end' }}>
                                        <button
                                            className="btn-whatsapp"
                                            onClick={(e) => openWhatsApp(e, business.phone || '')}
                                        >
                                            <MessageCircle size={18} fill="currentColor" />
                                            WhatsApp
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p style={{ textAlign: 'center' }}>No se encontraron negocios.</p>
                    )
                )}
            </div>

            {/* Detail Modal */}
            {selectedBusiness && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(255,255,255,0.98)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div style={{ maxWidth: '600px', width: '100%', position: 'relative' }}>
                        <button
                            onClick={() => setSelectedBusiness(null)}
                            style={{ position: 'absolute', right: '0', top: '-40px', background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
                        >
                            <X size={32} />
                        </button>

                        {selectedBusiness.image_url && (
                            <img src={selectedBusiness.image_url} alt={selectedBusiness.name} style={{ width: '100%', borderRadius: '12px', marginBottom: '1.5rem' }} />
                        )}

                        <div style={{ padding: '0 1rem' }}>
                            <span style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.9rem' }}>{selectedBusiness.category}</span>
                            <h2 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{selectedBusiness.name}</h2>
                            <p style={{ marginBottom: '2rem', lineHeight: '1.6', color: 'var(--text-muted)' }}>{selectedBusiness.description}</p>

                            <button
                                className="btn-primary"
                                style={{ width: '100%', padding: '15px' }}
                                onClick={(e) => openWhatsApp(e, selectedBusiness.phone || '')}
                            >
                                <MessageCircle size={20} /> Contactar por WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
