import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, Calendar, Upload } from 'lucide-react';
import type { Promotion } from '../types/database';

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
                        <label>Imagen opcional para la promo</label>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                            <label className="btn-primary" style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
                                <Upload size={16} /> Seleccionar
                                <input type="file" hidden accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                            </label>
                            {imageFile && <span style={{ fontSize: '0.7rem' }}>{imageFile.name}</span>}
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" style={{ marginTop: '1rem', width: '100%' }} disabled={loading}>
                        <Save size={20} /> {loading ? 'Enviando...' : 'Guardar Promoción'}
                    </button>
                </form>
            </div>
        </div>
    );
}
