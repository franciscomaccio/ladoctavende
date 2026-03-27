import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, CheckCircle, Save, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { translateError } from '../utils/translateError';

interface ResetPasswordFormProps {
    onSuccess: () => void;
}

export default function ResetPasswordForm({ onSuccess }: ResetPasswordFormProps) {
    const [loading, setLoading] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setMessage({ type: 'success', text: '¡Contraseña actualizada! Redirigiendo al panel...' });
            
            // Wait a bit then notify parent
            setTimeout(() => {
                onSuccess();
            }, 2000);

        } catch (error: any) {
            setMessage({ type: 'error', text: translateError(error.message) });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                    Restablecer Contraseña
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Ingresa tu nueva contraseña para recuperar el acceso.
                </p>
            </div>

            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600' }}>Nueva Contraseña</label>
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type={showNewPassword ? "text" : "password"}
                            className="input-field"
                            style={{ paddingLeft: '40px', paddingRight: '40px' }}
                            placeholder="Mínimo 6 caracteres"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}
                            title={showNewPassword ? "Ocultar Contraseña" : "Ver Contraseña"}
                        >
                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600' }}>Confirmar Contraseña</label>
                    <div style={{ position: 'relative' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            className="input-field"
                            style={{ paddingLeft: '40px', paddingRight: '40px' }}
                            placeholder="Repite la nueva contraseña"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}
                            title={showConfirmPassword ? "Ocultar Contraseña" : "Ver Contraseña"}
                        >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                {message && (
                    <div style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        background: message.type === 'success' ? '#f0fdf4' : '#fff1f2',
                        color: message.type === 'success' ? '#166534' : 'var(--error)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.85rem'
                    }}>
                        {message.type === 'success' ? <CheckCircle size={16} /> : <ShieldAlert size={16} />}
                        {message.text}
                    </div>
                )}

                <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
                    {loading ? 'Actualizando...' : <><Save size={20} /> Guardar Contraseña</>}
                </button>
            </form>
        </div>
    );
}
