import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus } from 'lucide-react';

export default function PromoPopup() {
    const [promoConfig, setPromoConfig] = useState<{ enabled: boolean, text: string, imageUrl: string }>({ enabled: false, text: '', imageUrl: '' });
    const [showPromo, setShowPromo] = useState(false);

    useEffect(() => {
        const fetchPromo = async () => {
            const { data } = await supabase.from('config').select('key, value');
            if (data) {
                const enabled = data.find(c => c.key === 'promo_popup_enabled')?.value === 'true';
                const text = data.find(c => c.key === 'promo_popup_text')?.value || '';
                const imageUrl = data.find(c => c.key === 'promo_popup_image_url')?.value || '';
                setPromoConfig({ enabled, text, imageUrl });

                if (enabled) {
                    const seen = sessionStorage.getItem('promo_seen');
                    if (!seen) {
                        setShowPromo(true);
                    }
                }
            }
        };
        fetchPromo();
    }, []);

    if (!showPromo) return null;

    const handleClose = () => {
        setShowPromo(false);
        sessionStorage.setItem('promo_seen', 'true');
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem'
        }}>
            <div className="card" style={{
                maxWidth: '450px',
                width: '100%',
                padding: 0,
                overflow: 'hidden',
                position: 'relative',
                animation: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <button
                    onClick={handleClose}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 10,
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    <Plus size={24} style={{ transform: 'rotate(45deg)' }} />
                </button>

                {promoConfig.imageUrl && (
                    <div style={{ width: '100%', aspectRatio: '1/1', overflow: 'hidden' }}>
                        <img
                            src={promoConfig.imageUrl}
                            alt="Promoción"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                )}

                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--primary)', marginBottom: '1rem', lineHeight: '1.2' }}>
                        ¡Novedades para vos!
                    </h2>
                    <p style={{
                        fontSize: '1.1rem',
                        color: 'var(--text-main)',
                        lineHeight: '1.5',
                        marginBottom: '2rem',
                        whiteSpace: 'pre-wrap'
                    }}>
                        {promoConfig.text}
                    </p>
                    <button
                        onClick={handleClose}
                        className="btn-primary"
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '12px',
                            fontSize: '1rem',
                            fontWeight: '800',
                            boxShadow: '0 10px 15px -3px rgba(127, 29, 29, 0.2)'
                        }}
                    >
                        ¡Entendido!
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes popIn {
                    0% { opacity: 0; transform: scale(0.9) translateY(20px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}
