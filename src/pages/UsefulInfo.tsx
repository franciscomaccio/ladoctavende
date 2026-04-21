import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';
import { MessageCircle, MapPin, X, Globe, Info } from 'lucide-react';

interface UsefulNote {
    id: string;
    title: string;
    caption: string | null;
    content: string | null;
    image_url: string | null;
    whatsapp_url: string | null;
    website_url: string | null;
    map_url: string | null;
    created_at: string;
}

export default function UsefulInfo() {
    const [notes, setNotes] = useState<UsefulNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNote, setSelectedNote] = useState<UsefulNote | null>(null);

    useEffect(() => {
        fetchNotes();
    }, []);

    async function fetchNotes() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('useful_notes')
                .select('*')
                .eq('is_visible', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotes(data || []);
        } catch (error) {
            console.error('Error fetching notes:', error);
        } finally {
            setLoading(false);
        }
    }

    const openLink = (e: React.MouseEvent, url: string) => {
        e.stopPropagation();
        if (url) {
            let absoluteUrl = url.startsWith('http') ? url : `https://${url}`;
            
            // Check if the URL is just a phone number (numeric and long enough)
            const isNumeric = /^\d+$/.test(url);
            if (isNumeric && url.length >= 8) {
                absoluteUrl = `https://wa.me/${url}`;
            }
            
            window.open(absoluteUrl, '_blank');
        }
    };

    return (
        <div className="container-wide">
            <Helmet>
                <title>Información Útil - La Docta Vende</title>
                <meta name="description" content="Información importante y útil para la comunidad en Córdoba." />
            </Helmet>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0 1.5rem 0', color: 'var(--text-main)' }}>
                <Info size={28} color="var(--primary)" />
                <h1 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>Información Útil</h1>
            </div>

            <div style={{ position: 'relative', minHeight: '300px' }}>
                {loading ? (
                    <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando información...</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {notes.length > 0 ? (
                            notes.map(note => (
                                <div
                                    key={note.id}
                                    className="business-card-h"
                                    onClick={() => setSelectedNote(note)}
                                    style={{ background: '#1f2937', color: 'white', border: 'none', cursor: 'pointer' }}
                                >
                                    {note.image_url ? (
                                        <img src={note.image_url} alt={note.title} />
                                    ) : (
                                        <div style={{ width: '120px', height: '120px', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Info size={32} color="#9ca3af" />
                                        </div>
                                    )}
                                    <div className="business-info" style={{ padding: '12px', justifyContent: 'flex-start' }}>
                                        <h3 style={{ fontSize: '1.1rem', marginBottom: '2px', color: 'white' }}>{note.title}</h3>
                                        {note.caption && (
                                            <span style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '4px' }}>{note.caption}</span>
                                        )}
                                        {note.content && (
                                            <p style={{
                                                fontSize: '0.85rem', color: '#d1d5db',
                                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden', margin: '4px 0 8px 0', lineHeight: '1.4'
                                            }}>
                                                {note.content}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '16px' }}>
                                <Info size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Sin Novedades</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Por el momento no hay información útil disponible.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {selectedNote && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    padding: '1rem'
                }} onClick={() => setSelectedNote(null)}>
                    <div
                        style={{
                            maxWidth: '500px', width: '100%', maxHeight: '90vh',
                            background: 'white', borderRadius: '20px', position: 'relative',
                            display: 'flex', flexDirection: 'column', overflow: 'hidden',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedNote(null)}
                            style={{
                                position: 'absolute', right: '12px', top: '12px', background: 'rgba(255,255,255,0.8)',
                                border: 'none', color: 'var(--text-main)', cursor: 'pointer', zIndex: 10,
                                borderRadius: '50%', width: '36px', height: '36px', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
                            }}
                        >
                            <X size={24} />
                        </button>

                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {selectedNote.image_url && (
                                <img
                                    src={selectedNote.image_url}
                                    alt={selectedNote.title}
                                    style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }}
                                />
                            )}
                            <div style={{ padding: '1.5rem' }}>
                                {selectedNote.caption && (
                                    <span style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.9rem' }}>
                                        {selectedNote.caption}
                                    </span>
                                )}
                                <h2 style={{ fontSize: '1.75rem', margin: '0.5rem 0' }}>{selectedNote.title}</h2>
                                <p style={{ lineHeight: '1.6', color: 'var(--text-muted)', fontSize: '1rem', whiteSpace: 'pre-wrap' }}>
                                    {selectedNote.content}
                                </p>
                            </div>
                        </div>

                        {(selectedNote.whatsapp_url || selectedNote.website_url || selectedNote.map_url) && (
                            <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '0.75rem', background: '#fff' }}>
                                {selectedNote.whatsapp_url && (
                                    <button
                                        className="btn-whatsapp"
                                        style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
                                        onClick={(e) => openLink(e, selectedNote.whatsapp_url!)}
                                    >
                                        <MessageCircle size={20} fill="currentColor" /> WhatsApp
                                    </button>
                                )}
                                {selectedNote.website_url && (
                                    <button
                                        className="btn-web"
                                        style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
                                        onClick={(e) => openLink(e, selectedNote.website_url!)}
                                    >
                                        <Globe size={20} /> Web
                                    </button>
                                )}
                                {selectedNote.map_url && (
                                    <button
                                        className="btn-map"
                                        style={{ flex: 1, padding: '12px', justifyContent: 'center' }}
                                        onClick={(e) => openLink(e, selectedNote.map_url!)}
                                    >
                                        <MapPin size={20} /> Mapa
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
