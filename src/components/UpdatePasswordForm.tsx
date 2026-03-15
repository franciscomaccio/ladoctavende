import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, CheckCircle, Save, X, KeyRound, ShieldAlert } from 'lucide-react';
import { translateError } from '../utils/translateError';

interface UpdatePasswordFormProps {
    onClose: () => void;
}

export default function UpdatePasswordForm({ onClose }: UpdatePasswordFormProps) {
    const [loading, setLoading] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'La nueva contraseña y su confirmación no coinciden.' });
            setLoading(false);
            return;
        }

        try {
            // 1. Verificar la contraseña actual obteniendo el email del usuario logueado
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) throw new Error("No se pudo obtener la información del usuario.");

            // Intentamos hacer un login rápido para verificar la contraseña actual
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword,
            });

            if (signInError) {
                throw new Error("La contraseña actual es incorrecta.");
            }

            // 2. Si el login fue exitoso, actualizamos a la nueva contraseña
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) throw updateError;

            setMessage({ type: 'success', text: 'Contraseña actualizada correctamente. Cerrando ventana...' });

            // Limpiar campos
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

            // Cerrar automáticamente tras 2 segundos
            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (error: any) {
            setMessage({ type: 'error', text: translateError(error.message) });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
            <div className="card" style={{ padding: '2rem', width: '100%', maxWidth: '400px', position: 'relative', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', borderRadius: '50%', padding: '4px', display: 'flex' }}
                >
                    <X size={20} color="var(--text-muted)" />
                </button>

                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.5rem', textAlign: 'center', color: 'var(--text-main)' }}>
                    Actualizar Contraseña
                </h2>

                <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Contraseña Actual</label>
                        <div style={{ position: 'relative' }}>
                            <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                className="input-field"
                                style={{ paddingLeft: '40px' }}
                                placeholder="Ingresá tu contraseña actual"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ width: '100%', height: '1px', background: 'var(--border-light)', margin: '0.5rem 0' }}></div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Nueva Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                className="input-field"
                                style={{ paddingLeft: '40px' }}
                                placeholder="Escribí la nueva contraseña"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Confirmar Nueva Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                className="input-field"
                                style={{ paddingLeft: '40px' }}
                                placeholder="Repetid la nueva contraseña"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    {message && (
                        <div style={{
                            padding: '1rem',
                            borderRadius: '12px',
                            background: message.type === 'success' ? '#ecfdf5' : '#fff1f2',
                            color: message.type === 'success' ? '#065f46' : '#991b1b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            fontSize: '0.9rem',
                            border: `1px solid \${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`
                        }}>
                            {message.type === 'success' ? <CheckCircle size={20} /> : <ShieldAlert size={20} />}
                            <span style={{ lineHeight: '1.4' }}>{message.text}</span>
                        </div>
                    )}

                    <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '0.5rem', padding: '14px', borderRadius: '14px' }}>
                        {loading ? 'Procesando...' : <><Save size={20} /> Actualizar Contraseña</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
