import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { X, Search, Mail, Building2, Calendar, AlertCircle } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import { translateError } from '../utils/translateError';

interface UserDetail {
    id: string;
    email: string;
    totalBusinesses: number;
    activeBusinesses: number;
    lastExpiration: string | null;
}

interface RegisteredUsersModalProps {
    onClose: () => void;
}

export const RegisteredUsersModal = ({ onClose }: RegisteredUsersModalProps) => {
    const [loading, setLoading] = useState(true);
    const [userDetails, setUserDetails] = useState<UserDetail[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch profiles
                const { data: profiles, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, email');
                
                if (profileError) throw profileError;

                // Fetch businesses
                const { data: businesses, error: businessError } = await supabase
                    .from('businesses')
                    .select('owner_id, active, subscription_expires_at');
                
                if (businessError) throw businessError;

                // Aggregate data
                const aggregated: UserDetail[] = profiles.map(profile => {
                    const userBusinesses = businesses.filter(b => b.owner_id === profile.id);
                    const activeCount = userBusinesses.filter(b => b.active).length;
                    
                    let lastExp = null;
                    if (activeCount === 0 && userBusinesses.length > 0) {
                        const dates = userBusinesses
                            .map(b => b.subscription_expires_at)
                            .filter(Boolean) as string[];
                        
                        if (dates.length > 0) {
                            lastExp = dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
                        }
                    }

                    return {
                        id: profile.id,
                        email: profile.email || 'N/A',
                        totalBusinesses: userBusinesses.length,
                        activeBusinesses: activeCount,
                        lastExpiration: lastExp
                    };
                });

                setUserDetails(aggregated.sort((a, b) => b.totalBusinesses - a.totalBusinesses));
            } catch (error: any) {
                alert('Error al cargar usuarios: ' + translateError(error.message));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const filteredUsers = useMemo(() => {
        return userDetails.filter(user => 
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [userDetails, searchTerm]);

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
            <div className="card" style={{ maxWidth: '900px', width: '100%', padding: '1.5rem', height: 'fit-content', margin: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0 }}>Usuarios Registrados</h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Administración de cuentas y estados de suscripción</p>
                    </div>
                    <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={20} /></button>
                </div>

                <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        className="input-field"
                        style={{ paddingLeft: '40px', margin: 0 }}
                        placeholder="Buscar por email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando usuarios...</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                                    <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: '700' }}>Email</th>
                                    <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: '700', textAlign: 'center' }}>Negocios</th>
                                    <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: '700', textAlign: 'center' }}>Activos</th>
                                    <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: '700' }}>Último Vencimiento</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Mail size={14} color="var(--primary)" />
                                                <span style={{ fontSize: '0.9rem' }}>{user.email}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,0,0,0.05)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.85rem' }}>
                                                <Building2 size={12} /> {user.totalBusinesses}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                fontSize: '0.85rem',
                                                background: user.activeBusinesses > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                                color: user.activeBusinesses > 0 ? '#059669' : '#6b7280',
                                                fontWeight: '600'
                                            }}>
                                                {user.activeBusinesses}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {user.activeBusinesses === 0 && user.totalBusinesses > 0 ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error)' }}>
                                                    <Calendar size={14} />
                                                    <span style={{ fontSize: '0.85rem' }}>{user.lastExpiration ? formatDate(user.lastExpiration) : 'Sin vencimiento'}</span>
                                                </div>
                                            ) : user.activeBusinesses > 0 ? (
                                                <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontStyle: 'italic' }}>Cuenta Activa</span>
                                            ) : (
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sin negocios</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredUsers.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                <AlertCircle size={32} style={{ marginBottom: '0.5rem', opacity: 0.3 }} />
                                <p>No se encontraron usuarios que coincidan con la búsqueda.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
