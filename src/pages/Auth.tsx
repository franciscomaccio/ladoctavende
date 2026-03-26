import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, UserPlus, LogIn, CheckCircle } from 'lucide-react';
import { translateError } from '../utils/translateError';
import PromoPopup from '../components/PromoPopup';
import ResetPasswordForm from '../components/ResetPasswordForm';

export default function Auth() {
    const navigate = useNavigate();
    const [isSignUp, setIsSignUp] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    React.useEffect(() => {
        // Manual check for recovery tokens in the hash (fail-safe for HashRouter)
        const checkRecovery = async () => {
            const hash = window.location.hash;
            console.log('Current Hash:', hash);
            if (hash.includes('type=recovery') || hash.includes('access_token=')) {
                console.log('Recovery tokens detected in hash');
                setIsResettingPassword(true);
                setIsForgotPassword(false);
                setIsSignUp(false);

                try {
                    const paramsStr = hash.substring(hash.indexOf('access_token='));
                    const params = new URLSearchParams(paramsStr);
                    const access_token = params.get('access_token');
                    const refresh_token = params.get('refresh_token');

                    if (access_token && refresh_token) {
                        console.log('Configurando sesión manual para recuperación...');
                        const { error } = await supabase.auth.setSession({
                            access_token,
                            refresh_token
                        });
                        
                        if (error) {
                            console.error('Error configurando sesión:', error.message);
                        } else {
                            console.log('Sesión recuperación configurada correctamente');
                        }
                    } else {
                        console.log('No se encontraron tokens completos en el hash');
                    }
                } catch (err) {
                    console.error('Error parseando tokens del hash:', err);
                }
            }
        };

        checkRecovery();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
            console.log('Auth Event:', event);
            if (event === 'PASSWORD_RECOVERY') {
                console.log('PASSWORD_RECOVERY event received');
                setIsResettingPassword(true);
                setIsForgotPassword(false);
                setIsSignUp(false);
            } else if (event === 'SIGNED_IN' && isResettingPassword) {
                // If we are already in resetting mode, stay there
                console.log('Signed in during reset mode');
            }
        });

        return () => subscription.unsubscribe();
    }, [isResettingPassword]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (isForgotPassword) {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/#/dashboard`,
                });
                if (error) throw error;
                setMessage({ type: 'success', text: 'Te enviamos un enlace de recuperación. Revisa tu correo.' });
            } else if (isSignUp) {
                if (password !== confirmPassword) {
                    throw new Error("Las contraseñas no coinciden.");
                }
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/#/dashboard`,
                    },
                });
                if (error) throw error;
                setMessage({ type: 'success', text: '¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.' });
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                navigate('/dashboard');
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: translateError(error.message) });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div className="card" style={{ padding: '2rem', maxWidth: '400px', width: '100%' }}>
                <h1 style={{ marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.5rem', fontWeight: '800' }}>
                    {isResettingPassword ? 'Nueva Contraseña' : isForgotPassword ? 'Recuperar Contraseña' : isSignUp ? 'Crea tu cuenta' : 'Iniciar Sesión'}
                </h1>

                {isResettingPassword ? (
                    <ResetPasswordForm onSuccess={() => {
                        setIsResettingPassword(false);
                        navigate('/dashboard');
                    }} />
                ) : (
                    <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '500' }}>Correo Electrónico</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="email"
                                className="input-field"
                                style={{ paddingLeft: '40px' }}
                                placeholder="tu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {!isForgotPassword && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '500' }}>Contraseña</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="password"
                                    className="input-field"
                                    style={{ paddingLeft: '40px' }}
                                    placeholder="********"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {isSignUp && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '500' }}>Confirmar Contraseña</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="password"
                                    className="input-field"
                                    style={{ paddingLeft: '40px' }}
                                    placeholder="********"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {!isSignUp && !isForgotPassword && (
                        <div style={{ textAlign: 'right' }}>
                            <button
                                type="button"
                                onClick={() => { setIsForgotPassword(true); setMessage(null); }}
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                                ¿Has olvidado tu contraseña?
                            </button>
                        </div>
                    )}

                    {message && (
                        <div style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            background: message.type === 'success' ? '#fefce8' : '#fff1f2',
                            color: message.type === 'success' ? '#a16207' : 'var(--error)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.85rem'
                        }}>
                            {message.type === 'success' && <CheckCircle size={16} />}
                            {message.text}
                        </div>
                    )}

                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
                        {loading ? 'Cargando...' : isForgotPassword ? (
                            <><Mail size={20} /> Enviar Enlace</>
                        ) : isSignUp ? (
                            <><UserPlus size={20} /> Registrarme</>
                        ) : (
                            <><LogIn size={20} /> Entrar</>
                        )}
                    </button>
                </form>
            )}

                {!isResettingPassword && (
                    <p style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {isForgotPassword ? (
                            <button
                                onClick={() => { setIsForgotPassword(false); setMessage(null); }}
                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }}
                            >
                                Volver a Iniciar Sesión
                            </button>
                        ) : (
                            <>
                                {isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
                                <button
                                    onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--primary)',
                                        marginLeft: '0.4rem',
                                        cursor: 'pointer',
                                        fontWeight: '600'
                                    }}
                                >
                                    {isSignUp ? 'Inicia Sesión' : 'Regístrate'}
                                </button>
                            </>
                        )}
                    </p>
                )}
            </div>
            <PromoPopup />
        </div>
    );
}
