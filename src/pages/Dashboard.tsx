import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import type { Business, Promotion } from '../types/database';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import BusinessForm from '../components/BusinessForm';
import PromotionForm from '../components/PromotionForm';
import BusinessStats from '../components/BusinessStats';
import UpdatePasswordForm from '../components/UpdatePasswordForm';
import { BarChart2, Key } from 'lucide-react';
import { translateError } from '../utils/translateError';
import { formatDate, isSubscriptionExpired } from '../utils/dateUtils';

interface BusinessWithPromos extends Business {
    promotions: Promotion[];
}

export default function Dashboard() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [businesses, setBusinesses] = useState<BusinessWithPromos[]>([]);
    const [paymentDetails, setPaymentDetails] = useState<{ status: string, businessId?: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
    const [isPromoFormOpen, setIsPromoFormOpen] = useState(false);
    const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);
    const [statsBusiness, setStatsBusiness] = useState<{ id: string, name: string, promoId?: string, promoTitle?: string } | null>(null);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
    const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/auth');
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        const hash = window.location.hash;
        if (hash.includes('?')) {
            const params = new URLSearchParams(hash.split('?')[1]);
            const status = params.get('status');
            const businessId = params.get('external_reference');
            if (status) {
                setPaymentDetails({ status, businessId: businessId || undefined });
                window.history.replaceState(null, '', hash.split('?')[0]);

                if (status === 'success') {
                    // Refresh multiple times to ensure we catch the webhook update
                    setTimeout(() => fetchUserBusinesses(), 2000);
                    setTimeout(() => fetchUserBusinesses(), 5000);
                }
            }
        }
        if (user) fetchUserBusinesses();
    }, [user]);

    async function fetchUserBusinesses() {
        try {
            const { data, error } = await supabase
                .from('businesses')
                .select('*, promotions(*)')
                .eq('owner_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBusinesses(data as BusinessWithPromos[] || []);
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
            alert(translateError(error.message));
        }
    }

    async function deletePromotion(id: string) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta promoción?')) return;
        try {
            const { error } = await supabase.from('promotions').delete().eq('id', id);
            if (error) throw error;
            fetchUserBusinesses();
        } catch (error: any) {
            alert(translateError(error.message));
        }
    }

    if (authLoading) {
        return (
            <div className="container-wide" style={{ textAlign: 'center', marginTop: '2rem' }}>
                <p>Cargando...</p>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    return (
        <div className="container-wide" style={{ paddingBottom: '100px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Panel de Control</h1>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <button
                        className="btn-primary"
                        style={{ padding: '8px 16px', background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-light)' }}
                        onClick={() => setIsPasswordFormOpen(true)}
                        title="Cambiar Contraseña"
                    >
                        <Key size={20} /> <span className="hide-mobile">Cambiar Clave</span>
                    </button>
                    <button
                        style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        onClick={() => { setEditingBusiness(null); setIsFormOpen(true); }}
                        title="Agregar Negocio"
                    >
                        <Plus size={24} />
                    </button>
                </div>
            </div>

            {paymentDetails && (
                <div style={{
                    padding: '1.5rem',
                    background: paymentDetails.status === 'success' ? '#dcfce7' : paymentDetails.status === 'pending' ? '#fef9c3' : '#fee2e2',
                    color: paymentDetails.status === 'success' ? '#166534' : paymentDetails.status === 'pending' ? '#854d0e' : '#991b1b',
                    borderRadius: '16px',
                    marginBottom: '1.5rem',
                    textAlign: 'center',
                    border: '1px solid',
                    borderColor: paymentDetails.status === 'success' ? '#bbf7d0' : paymentDetails.status === 'pending' ? '#fef08a' : '#fecaca',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '0.5rem' }}>
                        {paymentDetails.status === 'success' ? '¡Pago Aprobado!' :
                            paymentDetails.status === 'pending' ? 'Pago Pendiente' : 'Hubo un error con el pago'}
                    </h3>
                    <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                        {paymentDetails.status === 'success' ? 'Tu suscripción ha sido activada/renovada exitosamente.' :
                            paymentDetails.status === 'pending' ? 'Estamos esperando la confirmación de Mercado Pago. El negocio se activará automáticamente en unos minutos.' :
                            'No pudimos procesar tu pago. Por favor, intentá nuevamente o contactanos si el problema persiste.'}
                    </p>
                    {paymentDetails.status === 'success' && paymentDetails.businessId && (
                        <div style={{ marginTop: '0.75rem', fontWeight: '700', fontSize: '0.9rem' }}>
                            {(() => {
                                const b = businesses.find(bus => bus.id === paymentDetails.businessId);
                                if (b?.subscription_expires_at) {
                                    return `Nueva fecha de vencimiento: ${formatDate(b.subscription_expires_at)}`;
                                }
                                return 'Actualizando fecha de vencimiento...';
                            })()}
                        </div>
                    )}
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
                                        const isExpired = isSubscriptionExpired(business.subscription_expires_at);
                                        const status = !business.active ? 'Oculto' : isExpired ? 'Vencido' : 'Visible';
                                        const color = status === 'Visible' ? 'var(--success)' : 'var(--error)';
                                        return (
                                            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: color, textTransform: 'uppercase' }}>
                                                {status}
                                            </span>
                                        );
                                    })()}
                                </div>

                                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {business.subscription_expires_at && (
                                            <div>
                                                {isSubscriptionExpired(business.subscription_expires_at) ? 'Expiró: ' : 'Expira: '}
                                                {formatDate(business.subscription_expires_at)}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
                                        <button
                                            onClick={() => {
                                                if (business.promotions && business.promotions.length >= 2) {
                                                    alert('Sólo se permiten 2 promos por negocio.');
                                                    return;
                                                }
                                                setActiveBusinessId(business.id);
                                                setIsPromoFormOpen(true);
                                            }}
                                            style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px 12px', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '700' }}
                                        >
                                            <Plus size={18} /> Promo
                                        </button>
                                        <button
                                            onClick={() => setStatsBusiness({ id: business.id, name: business.name })}
                                            style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '8px 12px', color: '#7c3aed', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '700' }}
                                        >
                                            <BarChart2 size={18} /> Estadísticas
                                        </button>
                                        <button
                                            onClick={() => { setEditingBusiness(business); setIsFormOpen(true); }}
                                            style={{ background: '#f3f4f6', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Edit2 size={22} />
                                        </button>
                                        <button
                                            onClick={() => deleteBusiness(business.id)}
                                            style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '10px', color: 'var(--error)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <Trash2 size={22} />
                                        </button>
                                    </div>
                                </div>

                                {/* Promotions List */}
                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Tag size={12} /> Promociones
                                    </div>
                                    {business.promotions && business.promotions.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {business.promotions.map(promo => (
                                                <div key={promo.id} style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: '600', flex: 1, minWidth: '120px' }}>{promo.title}</span>
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                        <button
                                                            onClick={() => { setEditingPromotion(promo); setActiveBusinessId(business.id); setIsPromoFormOpen(true); }}
                                                            style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            title="Editar Promo"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => deletePromotion(promo.id)}
                                                            style={{ background: 'white', border: '1px solid #fee2e2', borderRadius: '6px', padding: '6px', color: 'var(--error)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            title="Eliminar Promo"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => setStatsBusiness({
                                                                id: business.id,
                                                                name: business.name,
                                                                promoId: promo.id,
                                                                promoTitle: promo.title
                                                            })}
                                                            style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 8px', color: '#7c3aed', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '600' }}
                                                        >
                                                            <BarChart2 size={14} /> Ver Stats
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                                            No hay promociones activas.
                                        </div>
                                    )}
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
                    promotion={editingPromotion}
                    onClose={() => { setIsPromoFormOpen(false); setActiveBusinessId(null); setEditingPromotion(null); }}
                    onSave={() => { fetchUserBusinesses(); setIsPromoFormOpen(false); setActiveBusinessId(null); setEditingPromotion(null); }}
                />
            )}

            {statsBusiness && (
                <BusinessStats
                    businessId={statsBusiness.id}
                    businessName={statsBusiness.name}
                    promotionId={statsBusiness.promoId}
                    promotionTitle={statsBusiness.promoTitle}
                    onClose={() => setStatsBusiness(null)}
                />
            )}

            {isPasswordFormOpen && (
                <UpdatePasswordForm onClose={() => setIsPasswordFormOpen(false)} />
            )}
        </div>
    );
}
