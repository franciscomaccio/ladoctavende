import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Search, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { translateError } from '../utils/translateError';

interface Profile {
    id: string;
    email: string;
}

interface TransferBusinessModalProps {
    businessId: string;
    businessName: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function TransferBusinessModal({ businessId, businessName, onClose, onSuccess }: TransferBusinessModalProps) {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [transferring, setTransferring] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email')
                .order('email');

            if (error) throw error;
            if (data) setProfiles(data);
        } catch (err: any) {
            console.error('Error fetching profiles:', err);
            setError(translateError(err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleTransfer = async () => {
        if (!selectedUserId) return;

        const confirmTransfer = window.confirm(`¿Estás seguro de que quieres transferir el negocio "${businessName}" a este usuario? Ya no aparecerá en tu listado si no eres administrador.`);
        if (!confirmTransfer) return;

        setTransferring(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from('businesses')
                .update({ owner_id: selectedUserId })
                .eq('id', businessId);

            if (updateError) throw updateError;

            onSuccess();
        } catch (err: any) {
            console.error('Error transferring business:', err);
            setError(translateError(err.message));
        } finally {
            setTransferring(false);
        }
    };

    const filteredProfiles = profiles.filter(p =>
        p.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
            <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>Transferir Negocio</h2>
                    <button onClick={onClose} className="btn-icon" style={{ padding: '0.5rem' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem' }}>
                        Selecciona el nuevo dueño para <strong>{businessName}</strong>:
                    </p>

                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                        <input
                            type="text"
                            placeholder="Buscar por email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field"
                            style={{ paddingLeft: '2.5rem', marginBottom: '1rem' }}
                        />
                    </div>

                    {error && (
                        <div style={{ color: 'var(--error)', background: 'rgba(255, 92, 138, 0.1)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div style={{
                        maxHeight: '300px',
                        overflowY: 'auto',
                        borderRadius: '12px',
                        border: '1px solid var(--border-light)',
                        background: 'rgba(0,0,0,0.2)'
                    }}>
                        {loading ? (
                            <p style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Cargando usuarios...</p>
                        ) : filteredProfiles.length === 0 ? (
                            <p style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No se encontraron usuarios.</p>
                        ) : (
                            filteredProfiles.map(profile => (
                                <div
                                    key={profile.id}
                                    onClick={() => setSelectedUserId(profile.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '0.75rem 1rem',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        background: selectedUserId === profile.id ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: 'rgba(255,255,255,0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'var(--primary)'
                                        }}>
                                            <User size={16} />
                                        </div>
                                        <span style={{ fontSize: '0.9rem', fontWeight: selectedUserId === profile.id ? '600' : '400' }}>
                                            {profile.email}
                                        </span>
                                    </div>
                                    {selectedUserId === profile.id && (
                                        <CheckCircle2 size={18} color="var(--primary)" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={onClose}
                        className="btn-secondary"
                        style={{ flex: 1 }}
                        disabled={transferring}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleTransfer}
                        className="btn-primary"
                        style={{ flex: 1 }}
                        disabled={!selectedUserId || transferring}
                    >
                        {transferring ? 'Transferiendo...' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
