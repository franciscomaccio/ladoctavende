import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Tag, ShoppingBag, PlusCircle } from 'lucide-react';

const Index: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh',
            background: 'radial-gradient(circle at center, #111827 0%, #000000 100%)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '3rem 1rem 1rem 1rem',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Glow effect matching the image */}
            <div className="landing-glow" style={{ top: '20%', left: '50%', transform: 'translate(-50%, -50%)' }} />

            {/* Logo with entry animation */}
            <div className="animate-fade-in" style={{ marginBottom: '0.3rem', textAlign: 'center' }}>
                <img
                    src="landing-logo.png"
                    alt="La Docta Vende"
                    style={{
                        width: '100%',
                        maxWidth: '220px',
                        height: 'auto',
                        filter: 'drop-shadow(0 0 20px rgba(234, 179, 8, 0.3))'
                    }}
                />
            </div>

            {/* Slogan */}
            <div className="animate-slide-up" style={{ textAlign: 'center', marginBottom: '0.8rem', animationDelay: '0.3s', opacity: 0 }}>
                <h1 style={{
                    fontSize: '0.95rem',
                    fontWeight: '500',
                    lineHeight: '1.4',
                    maxWidth: '400px',
                    margin: '0 auto',
                    opacity: 0.7
                }}>
                    publicá tu negocio,<br />
                    encontrá el negocio
                </h1>
            </div>

            {/* Buttons Container */}
            <div className="animate-slide-up" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.7rem',
                width: '100%',
                maxWidth: '300px',
                animationDelay: '0.6s',
                opacity: 0
            }}>
                <button
                    onClick={() => navigate('/negocios')}
                    style={{
                        background: 'linear-gradient(135deg, #009b3a 0%, #007b2e 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '1.2rem',
                        borderRadius: '16px',
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        boxShadow: '0 10px 15px -3px rgba(0, 155, 58, 0.3)',
                        transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <Home size={22} /> Negocios
                </button>

                <button
                    onClick={() => navigate('/promos')}
                    style={{
                        background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '1.2rem',
                        borderRadius: '16px',
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        boxShadow: '0 10px 15px -3px rgba(127, 29, 29, 0.3)',
                        transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <Tag size={22} /> Promos
                </button>

                <button
                    onClick={() => navigate('/clasificados')}
                    style={{
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '1.2rem',
                        borderRadius: '16px',
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        boxShadow: '0 10px 15px -3px rgba(30, 58, 138, 0.3)',
                        transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <ShoppingBag size={22} /> Clasificados
                </button>

                <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                        background: 'linear-gradient(135deg, #ea1d7b 0%, #be123c 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '1.2rem',
                        borderRadius: '16px',
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        cursor: 'pointer',
                        boxShadow: '0 10px 15px -3px rgba(234, 29, 123, 0.3)',
                        transition: 'transform 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <PlusCircle size={22} /> Publicar
                </button>
            </div>

            {/* Bottom Credit */}
            <div style={{ position: 'absolute', bottom: '2rem', opacity: 0.5, fontSize: '0.8rem' }}>
                ladoctavende.com.ar
            </div>
        </div>
    );
};

export default Index;
