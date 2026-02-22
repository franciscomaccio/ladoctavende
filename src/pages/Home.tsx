import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Business } from '../types/database';
import { Search, MapPin, Phone, X } from 'lucide-react';

const CATEGORIES = ['Gastronomía', 'Moda', 'Salud', 'Para el hogar', 'Vehículo', 'Servicios', 'Otros'];

export default function Home() {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

    useEffect(() => {
        fetchBusinesses();
    }, []);

    useEffect(() => {
        filterBusinesses();
    }, [searchTerm, selectedCategory, businesses]);

    async function fetchBusinesses() {
        try {
            const { data, error } = await supabase
                .from('businesses')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBusinesses(data || []);
        } catch (error) {
            console.error('Error fetching businesses:', error);
        } finally {
            setLoading(false);
        }
    }

    function filterBusinesses() {
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
                <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Descubrí Ladoctavende</h1>
                <p style={{ color: 'var(--text-muted)' }}>Encontrá los mejores emprendimientos y comercios en un solo lugar.</p>
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
                            placeholder="Buscar por nombre o descripción..."
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
                        <option value="">Todas las categorías</option>
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
            </div>

            {/* Business List */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
                {loading ? (
                    <p>Cargando negocios...</p>
                ) : filteredBusinesses.length > 0 ? (
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
