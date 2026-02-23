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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
            <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '2rem', height: 'fit-content', margin: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h3>{promotion ? 'Editar Promoción' : 'Nueva Promoción'}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div>
                        <label>Título de la Promo (ej: 2x1 en Pizzas)</label>
                        <input
                            className="input-field"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label>Descripción / Condiciones</label>
                        <textarea
                            className="input-field"
                            style={{ height: '80px' }}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '0.5rem' }}>
                            <Calendar size={16} /> Días que aplica:
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {DAYS.map(day => (
                                <button
                                    key={day.id}
                                    type="button"
                                    onClick={() => toggleDay(day.id)}
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: '15px',
                                        border: '1px solid var(--accent)',
                                        background: formData.days_of_week.includes(day.id) ? 'var(--accent)' : 'transparent',
                                        color: formData.days_of_week.includes(day.id) ? 'black' : 'white',
                                        fontSize: '0.8rem',
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
                        <label>Imagen de la promo (Formato Vertical 4:5)</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <label className="btn-primary" style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
                                    <Upload size={16} /> Seleccionar Imagen
                                    <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                                </label>
                                {imageFile && <span style={{ fontSize: '0.7rem' }}><Scissors size={12} /> Imagen recortada</span>}
                            </div>

                            {(imageFile || formData.image_url) && (
                                <div style={{ width: '120px', aspectRatio: '4/5', borderRadius: '10px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--accent)' }}>
                                    <img
                                        src={imageFile ? URL.createObjectURL(imageFile) : formData.image_url}
                                        alt="Preview"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                            )}
                        </div>

                        {isCropping && imageSrc && (
                            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 4000, display: 'flex', flexDirection: 'column', padding: '1rem' }}>
                                <div style={{ position: 'relative', flex: 1, width: '100%', background: '#333' }}>
                                    <Cropper
                                        image={imageSrc}
                                        crop={crop}
                                        zoom={zoom}
                                        aspect={4 / 5}
                                        onCropChange={setCrop}
                                        onCropComplete={onCropComplete}
                                        onZoomChange={setZoom}
                                    />
                                </div>
                                <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                    <button type="button" className="btn-primary" style={{ background: 'var(--error)' }} onClick={() => setIsCropping(false)}>Cancelar</button>
                                    <button type="button" className="btn-primary" onClick={applyCrop}>Confirmar Recorte</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button type="submit" className="btn-primary" style={{ marginTop: '1rem', width: '100%' }} disabled={loading}>
                        <Save size={20} /> {loading ? 'Enviando...' : 'Guardar Promoción'}
                    </button>
                </form>
            </div>
        </div>
    );
}
