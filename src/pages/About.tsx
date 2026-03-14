import React from 'react';
import { Info, Target, TrendingUp, MessageCircle, Mail, ShieldCheck, Search, Award } from 'lucide-react';

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
                        La Docta Vende es la plataforma líder en Córdoba para conectar negocios locales con clientes de toda la ciudad.
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
                        "Buscamos digitalizar la Docta, brindando herramientas de primer nivel a cada comercio de barrio,
                        fomentando el crecimiento de nuestra comunidad."
                    </p>
                </div>

                {/* Trust Section */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)', borderRadius: '24px', padding: '2rem', marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <ShieldCheck size={32} style={{ color: '#10b981' }} />
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>Seguridad y Confianza</h3>
                    </div>
                    <p style={{ opacity: 0.8, lineHeight: '1.6' }}>
                        Validamos la información de cada negocio para asegurar una experiencia segura tanto para compradores como para vendedores.
                        Nuestro equipo de soporte está siempre disponible para asistirte en el proceso de publicación.
                    </p>
                </div>

                {/* Contact Footer */}
                <div style={{ textAlign: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '3rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Soporte y Publicidad</h3>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <a
                            href="mailto:administracion@ladoctavende.com.ar"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--text-main)', color: 'var(--bg-main)', padding: '0.75rem 1.5rem', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold' }}
                        >
                            <Mail size={18} /> administracion@ladoctavende.com.ar
                        </a>
                    </div>
                    <p style={{ opacity: 0.5, fontSize: '0.9rem' }}>
                        © 2026 La Docta Vende. Córdoba, Argentina. <br />
                        Tu éxito es nuestro objetivo.
                    </p>
                </div>

            </div>
        </div>
    );
};

export default About;
