import React from 'react';
import { Target, TrendingUp, MessageCircle, Mail, Search, Award, Instagram } from 'lucide-react';

const About: React.FC = () => {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)', padding: '2rem 1rem 5rem' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>

                {/* Hero Section */}
                <div className="glass-card" style={{ padding: '3rem 2rem', textAlign: 'center', marginBottom: '2rem', borderRadius: '24px' }}>
                    <img src="header-logo.png" alt="La Docta Vende" style={{ height: '80px', marginBottom: '1.5rem' }} />
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '1rem', background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Potenciamos el Comercio Local
                    </h1>
                    <p style={{ fontSize: '1.2rem', opacity: 0.8, lineHeight: '1.6' }}>
                        La Docta Vende es la plataforma en Córdoba para conectar negocios locales con clientes cercanos.
                        Simplificamos la búsqueda de servicios y productos, dándole a cada emprendimiento el lugar que merece.
                    </p>
                </div>

                {/* Benefits Section */}
                <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '1.5rem', textAlign: 'center' }}>¿Por qué publicar con nosotros?</h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px' }}>
                        <div style={{ color: 'var(--primary)', marginBottom: '1rem' }}><Search size={32} /></div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Visibilidad 24/7</h3>
                        <p style={{ opacity: 0.7, fontSize: '0.95rem' }}>Tu negocio estará disponible para miles de usuarios que buscan servicios en Córdoba a toda hora.</p>
                    </div>

                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px' }}>
                        <div style={{ color: '#25D366', marginBottom: '1rem' }}><MessageCircle size={32} /></div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Contacto Directo</h3>
                        <p style={{ opacity: 0.7, fontSize: '0.95rem' }}>Sin intermediarios. Los clientes te contactan directamente a tu WhatsApp con un solo clic.</p>
                    </div>

                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px' }}>
                        <div style={{ color: '#3b82f6', marginBottom: '1rem' }}><TrendingUp size={32} /></div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Estadísticas Reales</h3>
                        <p style={{ opacity: 0.7, fontSize: '0.95rem' }}>Accedé a métricas de visualizaciones y clicks para entender el impacto de tu presencia en la plataforma.</p>
                    </div>

                    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '20px' }}>
                        <div style={{ color: '#f59e0b', marginBottom: '1rem' }}><Award size={32} /></div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Posicionamiento</h3>
                        <p style={{ opacity: 0.7, fontSize: '0.95rem' }}>Mejoramos tu presencia digital, haciendo que tu negocio luzca profesional y confiable.</p>
                    </div>
                </div>

                {/* Our Mission */}
                <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', padding: '0.5rem 1.5rem', background: 'rgba(127, 29, 29, 0.1)', borderRadius: '100px', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '1rem', alignItems: 'center', gap: '0.5rem' }}>
                        <Target size={18} /> Nuestra Misión
                    </div>
                    <p style={{ fontSize: '1.3rem', fontWeight: '500', lineHeight: '1.6', maxWidth: '600px', margin: '0 auto' }}>
                        "Buscamos ayudar a los vecinos para que descubran y se conecten con los negocios de su barrio de forma simple."
                    </p>
                </div>


                {/* Contact Footer */}
                <div style={{ textAlign: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '3rem', marginTop: '1rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.25rem', color: 'var(--text-main)' }}>Soporte y Publicidad</h3>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
                        <a
                            href="mailto:administracion@ladoctavende.com.ar"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                background: '#3b82f6',
                                color: 'white',
                                padding: '1rem 2rem',
                                borderRadius: '16px',
                                textDecoration: 'none',
                                fontWeight: 'bold',
                                boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.2)',
                                transition: 'transform 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <Mail size={20} /> administracion@ladoctavende.com.ar
                        </a>
                        <a
                            href="https://wa.me/5493512117700"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                background: 'var(--primary)',
                                color: 'white',
                                padding: '1rem 2rem',
                                borderRadius: '16px',
                                textDecoration: 'none',
                                fontWeight: 'bold',
                                boxShadow: '0 10px 15px -3px rgba(0, 155, 58, 0.2)',
                                transition: 'transform 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <MessageCircle size={20} /> 3512117700
                        </a>
                        <a
                            href="https://www.instagram.com/ladoctavende"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                background: '#E1306C',
                                color: 'white',
                                padding: '1rem 2rem',
                                borderRadius: '16px',
                                textDecoration: 'none',
                                fontWeight: 'bold',
                                boxShadow: '0 10px 15px -3px rgba(225, 48, 108, 0.2)',
                                transition: 'transform 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <Instagram size={20} /> @ladoctavende
                        </a>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                        © 2026 La Docta Vende. Córdoba, Argentina. <br />
                        <span style={{ opacity: 0.8 }}>Tu éxito es nuestro objetivo.</span>
                    </p>
                </div>

            </div>
        </div>
    );
};

export default About;
