import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Upload, Scissors, Save, Globe, MessageCircle, MapPin } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/imageUtils';
import { translateError } from '../utils/translateError';

interface UsefulNote {
    id: string;
    title: string;
    caption: string | null;
    content: string | null;
    image_url: string | null;
    whatsapp_url: string | null;
    website_url: string | null;
    map_url: string | null;
    is_visible: boolean;
}

interface UsefulNoteModalProps {
    note?: UsefulNote | null;
    onClose: () => void;
    onSave: () => void;
}

export default function UsefulNoteModal({ note, onClose, onSave }: UsefulNoteModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: note?.title || '',
        caption: note?.caption || '',
        content: note?.content || '',
        image_url: note?.image_url || '',
        whatsapp_url: note?.whatsapp_url || '',
        website_url: note?.website_url || '',
        map_url: note?.map_url || '',
        is_visible: note?.is_visible ?? false,
    });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropping, setIsCropping] = useState(false);

    const onCropComplete = (_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);
            setImageSrc(url);
            setIsCropping(true);
        }
    };

    const applyCrop = async () => {
        try {
            if (imageSrc && croppedAreaPixels) {
                const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
                const file = new File([croppedImageBlob], 'note-image.jpg', { type: 'image/jpeg' });
                setImageFile(file);
                setIsCropping(false);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let finalImageUrl = formData.image_url;

            if (imageFile) {
                const fileName = `useful/${Math.random()}.jpg`;
                const { error: uploadError } = await supabase.storage
                    .from('flyers')
                    .upload(fileName, imageFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('flyers').getPublicUrl(fileName);
                finalImageUrl = publicUrl;
            }

            const noteData = {
                ...formData,
                image_url: finalImageUrl,
            };

            if (note?.id) {
                const { error } = await supabase
                    .from('useful_notes')
                    .update(noteData)
                    .eq('id', note.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('useful_notes')
                    .insert([noteData]);
                if (error) throw error;
            }

            onSave();
        } catch (error: any) {
            alert(translateError(error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 3000, display: 'flex', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
            {isCropping && imageSrc && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: '#111', zIndex: 4000, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ position: 'relative', flex: 1, width: '100%', minHeight: 0 }}>
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1 / 1}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                        />
                    </div>
                    <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem', background: '#111', borderTop: '1px solid #333' }}>
                        <button type="button" className="btn-primary" style={{ background: '#333', color: 'white' }} onClick={() => setIsCropping(false)}>Cancelar</button>
                        <button type="button" className="btn-primary" onClick={applyCrop}>Confirmar Recorte</button>
                    </div>
                </div>
            )}

            <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '1.5rem', height: 'fit-content', margin: 'auto', display: isCropping ? 'none' : 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>{note ? 'Editar Nota' : 'Nueva Nota Informativa'}</h2>
                    <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '600' }}>Título</label>
                        <input
                            className="input-field"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            required
                            placeholder="Ej: Nuevos Horarios de Colectivos"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '600' }}>Foto principal (1:1)</label>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <label className="btn-primary" style={{ fontSize: '0.8rem', cursor: 'pointer', background: '#f3f4f6', color: 'var(--text-main)', border: '1px solid var(--border-light)', margin: 0 }}>
                                <Upload size={16} /> {imageFile || formData.image_url ? 'Cambiar Imagen' : 'Subir Imagen'}
                                <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                            </label>

                            {(imageFile || formData.image_url) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setImageSrc(imageFile ? URL.createObjectURL(imageFile) : formData.image_url);
                                        setIsCropping(true);
                                    }}
                                    className="btn-primary"
                                    style={{ fontSize: '0.8rem', background: '#eff6ff', color: 'var(--primary)', border: '1px solid #bfdbfe' }}
                                >
                                    <Scissors size={16} /> Recortar
                                </button>
                            )}

                            {(imageFile || formData.image_url) && (
                                <div style={{ width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                                    <img
                                        src={imageFile ? URL.createObjectURL(imageFile) : formData.image_url}
                                        alt="Preview"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '600' }}>Epígrafe de la foto</label>
                        <input
                            className="input-field"
                            value={formData.caption}
                            onChange={e => setFormData({ ...formData, caption: e.target.value })}
                            placeholder="Ej: Terminal de ómnibus local"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '600' }}>Texto de la nota</label>
                        <textarea
                            className="input-field"
                            style={{ height: '150px', resize: 'none' }}
                            value={formData.content}
                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                            placeholder="Contenido de la información..."
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '600' }}>Enlace WhatsApp (Opcional)</label>
                        <div style={{ position: 'relative' }}>
                            <MessageCircle size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                className="input-field"
                                style={{ paddingLeft: '40px' }}
                                value={formData.whatsapp_url}
                                onChange={e => setFormData({ ...formData, whatsapp_url: e.target.value })}
                                placeholder="wa.me/549..."
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '600' }}>Web / Instagram (Opcional)</label>
                        <div style={{ position: 'relative' }}>
                            <Globe size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                className="input-field"
                                style={{ paddingLeft: '40px' }}
                                value={formData.website_url}
                                onChange={e => setFormData({ ...formData, website_url: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '600' }}>Mapa (Opcional)</label>
                        <div style={{ position: 'relative' }}>
                            <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                className="input-field"
                                style={{ paddingLeft: '40px' }}
                                value={formData.map_url}
                                onChange={e => setFormData({ ...formData, map_url: e.target.value })}
                                placeholder="vínculo de Google Maps..."
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <input
                            type="checkbox"
                            id="is_visible"
                            checked={formData.is_visible}
                            onChange={e => setFormData({ ...formData, is_visible: e.target.checked })}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <label htmlFor="is_visible" style={{ fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}>Visible para el público</label>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                        <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                            <Save size={20} /> {loading ? 'Sincronizando...' : 'Guardar Nota'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
