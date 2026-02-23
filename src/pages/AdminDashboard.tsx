import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle, XCircle, Settings, LayoutDashboard, Calendar, DollarSign } from 'lucide-react';

interface Business {
    id: string;
    name: string;
    active: boolean;
    subscription_expires_at: string | null;
    category: string;
}

export default function AdminDashboard() {
    const { isAdmin } = useAuth();
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [price, setPrice] = useState<number>(0);

    useEffect(() => {
        if (isAdmin) {
            fetchBusinesses();
            fetchPrice();
        }
    }, [isAdmin]);

    const fetchBusinesses = async () => {
        const { data } = await supabase
            .from('businesses')
            .select('id, name, active, subscription_expires_at, category')
            .order('created_at', { ascending: false });
        if (data) setBusinesses(data);
        setLoading(false);
    };

    const fetchPrice = async () => {
        const { data } = await supabase
            .from('config')
            .select('value')
            .eq('key', 'subscription_price')
            .single();
        if (data) setPrice(data.value);
    };

    const toggleActive = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('businesses')
            .update({ active: !currentStatus })
            .eq('id', id);
        if (!error) fetchBusinesses();
    };

    const updatePrice = async () => {
        const { error } = await supabase
            .from('config')
            .update({ value: price })
            .eq('key', 'subscription_price');
        if (!error) alert('Precio actualizado con éxito');
    };

    if (!isAdmin) {
        return <div className="container"><h1>Acceso Denegado</h1></div>;
    }

    return (
        <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--accent)' }}>
                    <LayoutDashboard size={32} />
                    <h1>Panel Administrador</h1>
                </div>
                <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <DollarSign size={20} style={{ color: 'var(--accent)' }} />
                    <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="input-field"
                        style={{ width: '100px', margin: 0 }}
                    />
                    <button onClick={updatePrice} className="btn-primary" style={{ padding: '8px 16px' }}>
                        <Settings size={18} /> Actualizar Precio
                    </button>
                </div>
            </div>

            {loading ? (
                <p>Cargando negocios...</p>
            ) : (
                <div className="glass-card" style={{ padding: '1rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Negocio</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Categoría</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Vencimiento</th>
                                <th style={{ textAlign: 'left', padding: '1rem' }}>Estado</th>
                                <th style={{ textAlign: 'center', padding: '1rem' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {businesses.map((business) => {
                                const isExpired = business.subscription_expires_at
                                    ? new Date(business.subscription_expires_at) < new Date()
                                    : true;

                                return (
                                    <tr key={business.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem' }}>{business.name}</td>
                                        <td style={{ padding: '1rem' }}>{business.category}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isExpired ? 'var(--error)' : 'var(--text-main)' }}>
                                                <Calendar size={14} />
                                                {business.subscription_expires_at
                                                    ? new Date(business.subscription_expires_at).toLocaleDateString()
                                                    : 'Sin fecha'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '20px',
                                                fontSize: '0.8rem',
                                                background: business.active ? 'rgba(0, 155, 58, 0.2)' : 'rgba(255, 92, 138, 0.2)',
                                                color: business.active ? '#4ade80' : 'var(--error)'
                                            }}>
                                                {business.active ? 'Visible' : 'Oculto'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <button
                                                onClick={() => toggleActive(business.id, business.active)}
                                                className="btn-primary"
                                                style={{
                                                    padding: '6px 12px',
                                                    fontSize: '0.8rem',
                                                    background: business.active ? 'var(--error)' : 'var(--primary)'
                                                }}
                                            >
                                                {business.active ? <XCircle size={14} /> : <CheckCircle size={14} />}
                                                {business.active ? ' Desactivar' : ' Activar'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
