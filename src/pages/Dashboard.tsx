import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import type { Business } from '../types/database';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
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
            <div className="container" style={{ textAlign: 'center', marginTop: '2rem' }}>
                <p>Debes iniciar sesión para ver tu panel.</p>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingBottom: '100px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Panel de Control</h1>
                <button
                    style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    onClick={() => { setEditingBusiness(null); setIsFormOpen(true); }}
                >
                    <Plus size={24} />
                </button>
            </div>

            {paymentStatus === 'success' && (
                <div style={{ padding: '1rem', background: '#dcfce7', color: '#166534', borderRadius: '12px', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                    ¡Tu pago fue procesado con éxito!
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {loading ? (
                    <p style={{ textAlign: 'center' }}>Cargando tus negocios...</p>
                ) : businesses.length > 0 ? (
                    businesses.map(business => (
                        <div key={business.id} className="card" style={{ padding: '12px', display: 'flex', gap: '12px' }}>
                            {business.image_url ? (
                                <img src={business.image_url} alt={business.name} style={{ width: '80px', height: '100px', borderRadius: '8px', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '80px', height: '100px', background: '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Tag size={24} color="#ccc" />
                                </div>
                            )}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1rem', marginBottom: '2px' }}>{business.name}</h3>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{business.category}</span>
                                    </div>
                                    {(() => {
                                        const isExpired = business.subscription_expires_at ? new Date(business.subscription_expires_at) < new Date() : false;
                                        const status = !business.active ? 'Oculto' : isExpired ? 'Vencido' : 'Visible';
                                        const color = status === 'Visible' ? 'var(--success)' : 'var(--error)';
                                        return (
                                            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: color, textTransform: 'uppercase' }}>
                                                {status}
                                            </span>
                                        );
                                    })()}
                                </div>

                                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {business.subscription_expires_at && (
                                            <div>Expira: {new Date(business.subscription_expires_at).toLocaleDateString()}</div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => { setEditingBusiness(business); setIsFormOpen(true); }}
                                            style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => deleteBusiness(business.id)}
                                            style={{ background: '#fef2f2', border: 'none', borderRadius: '6px', padding: '6px', color: 'var(--error)', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                        <p style={{ color: 'var(--text-muted)' }}>Todavía no has registrado ningún negocio.</p>
                        <button className="btn-primary" style={{ margin: '1rem auto' }} onClick={() => setIsFormOpen(true)}>
                            Registrar mi primer negocio
                        </button>
                    </div>
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
