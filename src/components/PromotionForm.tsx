import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, Calendar, Upload, Scissors } from 'lucide-react';
import type { Promotion } from '../types/database';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/imageUtils';

interface PromotionFormProps {
    businessId: string;
    promotion?: Promotion | null;
    onClose: () => void;
    onSave: () => void;
}

const DAYS = [
    { id: 0, label: 'Dom' },
    { id: 1, label: 'Lun' },
    { id: 2, label: 'Mar' },
    { id: 3, label: 'Mié' },
    { id: 4, label: 'Jue' },
    { id: 5, label: 'Vie' },
    { id: 6, label: 'Sáb' },
];

export default function PromotionForm({ businessId, promotion, onClose, onSave }: PromotionFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: promotion?.title || '',
        description: promotion?.description || '',
        days_of_week: promotion?.days_of_week || [],
        image_url: promotion?.image_url || '',
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
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageSrc(reader.result as string);
                setIsCropping(true);
            });
            reader.readAsDataURL(file);
        }
    };

    const applyCrop = async () => {
        try {
            if (imageSrc && croppedAreaPixels) {
                const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
                const file = new File([croppedImageBlob], 'cropped-promo.jpg', { type: 'image/jpeg' });
                setImageFile(file);
                setIsCropping(false);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const toggleDay = (dayId: number) => {
        setFormData(prev => ({
            ...prev,
            days_of_week: prev.days_of_week.includes(dayId)
                ? prev.days_of_week.filter(d => d !== dayId)
                : [...prev.days_of_week, dayId]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.days_of_week.length === 0) {
            alert('Por favor, selecciona al menos un día de la semana.');
            return;
        }

        setLoading(true);
        try {
            let finalImageUrl = formData.image_url;

            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `promos/${businessId}/${Math.random()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('flyers')
                    .upload(fileName, imageFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('flyers').getPublicUrl(fileName);
                finalImageUrl = publicUrl;
            }

            const promoData = {
                ...formData,
                image_url: finalImageUrl,
                business_id: businessId,
            };

            if (promotion) {
                const { error } = await supabase
                    .from('promotions')
                    .update(promoData)
                    .eq('id', promotion.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('promotions')
                    .insert([promoData]);
                if (error) throw error;
            }

            onSave();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 3000, display: 'flex', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
            <div className="card" style={{ maxWidth: '450px', width: '100%', padding: '1.5rem', height: 'fit-content', margin: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>{promotion ? 'Editar Promoción' : 'Nueva Promoción'}</h3>
                    <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '600' }}>Título de la Promo</label>
                        <input
                            className="input-field"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            required
                            placeholder="Ej: 2x1 en Pizzas"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '600' }}>Descripción</label>
                        <textarea
                            className="input-field"
                            style={{ height: '80px', resize: 'none' }}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Condiciones o detalles..."
                        />
                    </div>

                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' }}>
                            <Calendar size={16} /> Días que aplica:
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {DAYS.map(day => (
                                <button
                                    key={day.id}
                                    type="button"
                                    onClick={() => toggleDay(day.id)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '20px',
                                        border: '1px solid ' + (formData.days_of_week.includes(day.id) ? 'var(--primary)' : 'var(--border-light)'),
                                        background: formData.days_of_week.includes(day.id) ? 'var(--primary)' : 'white',
                                        color: formData.days_of_week.includes(day.id) ? 'white' : 'var(--text-muted)',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '600' }}>Imagen (Vertical 4:5)</label>
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
                                <div style={{ width: '50px', height: '62px', borderRadius: '8px', overflow: 'hidden', border: '2px solid white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                    <img
                                        src={imageFile ? URL.createObjectURL(imageFile) : formData.image_url}
                                        alt="Preview"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                            )}
                        </div>

                        {isCropping && imageSrc && (
                            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'white', zIndex: 4000, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ position: 'relative', flex: 1, width: '100%' }}>
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
                                <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                    <button type="button" className="btn-primary" style={{ background: '#f3f4f6', color: 'black' }} onClick={() => setIsCropping(false)}>Cancelar</button>
                                    <button type="button" className="btn-primary" onClick={applyCrop}>Confirmar</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', width: '100%' }} disabled={loading}>
                        <Save size={20} /> {loading ? 'Guardando...' : 'Guardar Promoción'}
                    </button>
                </form>
            </div>
        </div>
    );
}
