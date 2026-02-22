import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import type { Business } from '../types/database';
import { Plus, Edit2, Trash2, LayoutDashboard } from 'lucide-react';
import BusinessForm from '../components/BusinessForm';

export default function Dashboard() {
    const { user } = useAuth();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);

    useEffect(() => {
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <LayoutDashboard size={32} />
                    <h1>Mis Negocios</h1>
                </div>
                <button className="btn-primary" onClick={() => { setEditingBusiness(null); setIsFormOpen(true); }}>
                    <Plus size={20} /> Crear Nuevo
                </button>
            </div>

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
                                    <span style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>{business.category}</span>
                                    <h3 style={{ margin: '0.2rem 0' }}>{business.name}</h3>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{business.phone || 'Sin teléfono'}</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
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
        </div>
    );
}
