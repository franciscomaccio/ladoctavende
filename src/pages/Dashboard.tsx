import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import type { Business } from '../types/database';
import { Plus, Edit2, Trash2, LayoutDashboard, Tag } from 'lucide-react';
import BusinessForm from '../components/BusinessForm';
import PromotionForm from '../components/PromotionForm';

export default function Dashboard() {
    const { user } = useAuth();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
    const [isPromoFormOpen, setIsPromoFormOpen] = useState(false);
    const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);

    useEffect(() => {
        const hash = window.location.hash;
        if (hash.includes('?')) {
            const params = new URLSearchParams(hash.split('?')[1]);
            const status = params.get('status');
            if (status) {
                setPaymentStatus(status);
                // Clear params from URL
                window.history.replaceState(null, '', hash.split('?')[0]);
            }
        }
        if (user) fetchUserBusinesses();
    }, [user]);

    async function fetchUserBusinesses() {
        try {
            const { data, error } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBusinesses(data || []);
        } catch (error) {
            console.error('Error fetching businesses:', error);
        } finally {
            setLoading(false);
        }
    }

    async function deleteBusiness(id: string) {
        if (!confirm('¿Estás seguro de que quieres eliminar este negocio?')) return;

        try {
            const { error } = await supabase.from('businesses').delete().eq('id', id);
            if (error) throw error;
            setBusinesses(businesses.filter(b => b.id !== id));
        } catch (error: any) {
            alert(error.message);
        }
    }

    if (!user) {
        return (
            <div className="container" style={{ textAlign: 'center' }}>
                <p>Debes iniciar sesión para ver tu panel.</p>
            </div>
        );
    }

    return (
        <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--accent)' }}>
                    <LayoutDashboard size={32} />
                    <h1>Mis Negocios</h1>
                </div>
                <button className="btn-primary" onClick={() => { setEditingBusiness(null); setIsFormOpen(true); }}>
                    <Plus size={20} /> Crear Nuevo
                </button>
            </div>

            {paymentStatus === 'success' && (
                <div className="glass-card" style={{ padding: '1rem', background: 'rgba(0, 155, 58, 0.2)', color: '#4ade80', marginBottom: '2rem', textAlign: 'center' }}>
                    ¡Tu pago fue procesado con éxito! Tu negocio estará visible en breve.
                </div>
            )}
            {paymentStatus === 'pending' && (
                <div className="glass-card" style={{ padding: '1rem', background: 'rgba(254, 223, 0, 0.1)', color: 'var(--accent)', marginBottom: '2rem', textAlign: 'center' }}>
                    Tu pago está pendiente de aprobación. Se activará automáticamente al confirmarse.
                </div>
            )}
            {paymentStatus === 'failure' && (
                <div className="glass-card" style={{ padding: '1rem', background: 'rgba(255, 92, 138, 0.1)', color: 'var(--error)', marginBottom: '2rem', textAlign: 'center' }}>
                    Hubo un problema con tu pago. Por favor, intenta nuevamente.
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                {loading ? (
                    <p>Cargando tus negocios...</p>
                ) : businesses.length > 0 ? (
                    businesses.map(business => (
                        <div key={business.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                {business.image_url && (
                                    <img src={business.image_url} alt={business.name} style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover' }} />
                                )}
                                <div style={{ flex: 1 }}>
                                    <span style={{
                                        fontSize: '0.7rem',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        background: business.active ? 'rgba(0, 155, 58, 0.2)' : 'rgba(255, 92, 138, 0.2)',
                                        color: business.active ? '#4ade80' : 'var(--error)',
                                        fontWeight: 'bold'
                                    }}>
                                        {business.active ? 'Visible' : 'Oculto'}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 'bold' }}>{business.category}</span>
                                    <h3 style={{ margin: '0.2rem 0' }}>{business.name}</h3>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{business.phone || 'Sin teléfono'}</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', flexWrap: 'wrap' }}>
                                <button
                                    className="btn-primary"
                                    style={{ flex: '1 1 100%', padding: '8px', fontSize: '0.8rem', background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', border: '1px solid #34d399' }}
                                    onClick={() => { setActiveBusinessId(business.id); setIsPromoFormOpen(true); }}
                                >
                                    <Tag size={16} /> Administrar Promos
                                </button>
                                <button
                                    className="btn-primary"
                                    style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}
                                    onClick={() => { setEditingBusiness(business); setIsFormOpen(true); }}
                                >
                                    <Edit2 size={16} /> Editar
                                </button>
                                <button
                                    className="btn-primary"
                                    style={{ background: 'rgba(255, 92, 138, 0.2)', color: 'var(--error)', flex: 1, padding: '8px', fontSize: '0.8rem' }}
                                    onClick={() => deleteBusiness(business.id)}
                                >
                                    <Trash2 size={16} /> Borrar
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)' }}>Todavía no has registrado ningún negocio.</p>
                )}
            </div>

            {isFormOpen && (
                <BusinessForm
                    userId={user.id}
                    business={editingBusiness}
                    onClose={() => setIsFormOpen(false)}
                    onSave={() => { fetchUserBusinesses(); setIsFormOpen(false); }}
                />
            )}

            {isPromoFormOpen && activeBusinessId && (
                <PromotionForm
                    businessId={activeBusinessId}
                    onClose={() => { setIsPromoFormOpen(false); setActiveBusinessId(null); }}
                    onSave={() => { setIsPromoFormOpen(false); setActiveBusinessId(null); }}
                />
            )}
        </div>
    );
}
