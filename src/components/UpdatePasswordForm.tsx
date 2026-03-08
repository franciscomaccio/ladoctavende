import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, CheckCircle, Save, X } from 'lucide-react';

interface UpdatePasswordFormProps {
    onClose: () => void;
}

export default function UpdatePasswordForm({ onClose }: UpdatePasswordFormProps) {
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' });
            setPassword('');
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
            <div className="card" style={{ padding: '2rem', width: '100%', maxWidth: '400px', position: 'relative' }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    <X size={24} color="var(--text-muted)" />
                </button>

                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem', textAlign: 'center' }}>
                    Modificar Contraseña
                </h2>

                <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '500' }}>Nueva Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                className="input-field"
                                style={{ paddingLeft: '40px' }}
                                placeholder="Escribe tu nueva contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    {message && (
                        <div style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            background: message.type === 'success' ? '#dcfce7' : '#fff1f2',
                            color: message.type === 'success' ? '#166534' : 'var(--error)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.85rem'
                        }}>
                            {message.type === 'success' && <CheckCircle size={16} />}
                            {message.text}
                        </div>
                    )}

                    <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
                        {loading ? 'Guardando...' : <><Save size={18} /> Guardar Contraseña</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
