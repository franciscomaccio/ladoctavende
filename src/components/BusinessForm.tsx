import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Business } from '../types/database';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Save, X, Upload, Scissors, Globe, CreditCard, CheckCircle } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/imageUtils';
import { translateError } from '../utils/translateError';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const CATEGORIES = ['Belleza', 'Deportes', 'Educación', 'Gastronomía', 'Hogar', 'Inmobiliaria', 'Mascotas', 'Moda', 'Salud', 'Servicios', 'Tecnología', 'Otros'];

interface BusinessFormProps {
    business?: Business | null;
    onClose: () => void;
    onSave: () => void;
    userId: string;
}

function LocationPicker({ position, setPosition }: { position: [number, number], setPosition: (pos: [number, number]) => void }) {
    const map = useMap();

    useEffect(() => {
        map.locate().on("locationfound", function (e) {
            if (!position[0]) {
                setPosition([e.latlng.lat, e.latlng.lng]);
                map.flyTo(e.latlng, map.getZoom());
            }
        });
    }, []);

    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
        },
    });

    return position[0] ? <Marker position={position} /> : null;
}

export default function BusinessForm({ business, onClose, onSave, userId }: BusinessFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: business?.name || '',
        description: business?.description || '',
        category: business?.category || CATEGORIES[0],
        phone: business?.phone || '',
        image_url: business?.image_url || '',
        website_url: business?.website_url || '',
        type: business?.type || 'business' as 'business' | 'classified',
    });
    const [position, setPosition] = useState<[number, number]>([
        business?.location_lat || 0,
        business?.location_lng || 0
    ]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropping, setIsCropping] = useState(false);

    const [tierPrices, setTierPrices] = useState<Record<string, { original: number, promo: number, active: boolean }>>({
        '1m': { original: 0, promo: 0, active: false },
        '3m': { original: 0, promo: 0, active: false },
        '6m': { original: 0, promo: 0, active: false },
        '12m': { original: 0, promo: 0, active: false },
    });
    const [selectedTier, setSelectedTier] = useState<string>('1m');
    const [promoDescription, setPromoDescription] = useState<string>('');

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
                const file = new File([croppedImageBlob], 'cropped-flyer.jpg', { type: 'image/jpeg' });
                setImageFile(file);
                setIsCropping(false);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        const fetchPrices = async () => {
            const { data } = await supabase.from('config').select('key, value');
            if (data) {
                const newPrices = { ...tierPrices };
                ['1m', '3m', '6m', '12m'].forEach(tier => {
                    const p = data.find(c => c.key === `subscription_price_${tier}`)?.value;
                    const o = data.find(c => c.key === `original_price_${tier}`)?.value;
                    const a = data.find(c => c.key === `subscription_active_${tier}`)?.value;
                    if (p !== undefined) newPrices[tier].promo = Number(p);
                    if (o !== undefined) newPrices[tier].original = Number(o);
                    if (a !== undefined) newPrices[tier].active = a === 'true';
                });
                setTierPrices(newPrices);

                const activeTiers = ['1m', '3m', '6m', '12m'].filter(t => newPrices[t].active);
                if (activeTiers.length > 0 && !activeTiers.includes(selectedTier)) {
                    setSelectedTier(activeTiers[0]);
                }

                const d = data.find(c => c.key === 'promo_description')?.value;
                if (d) setPromoDescription(d);
            }
        };
        fetchPrices();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!business) return;

        setLoading(true);
        try {
            let finalImageUrl = formData.image_url;

            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${userId}/${Math.random()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('flyers')
                    .upload(fileName, imageFile);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('flyers').getPublicUrl(fileName);
                finalImageUrl = publicUrl;
            }

            const businessData = {
                ...formData,
                image_url: finalImageUrl,
                location_lat: position[0],
                location_lng: position[1],
                owner_id: userId,
            };

            const { error } = await supabase
                .from('businesses')
                .update(businessData)
                .eq('id', business.id);
            if (error) throw error;

            onSave();
        } catch (error: any) {
            alert(translateError(error.message));
        } finally {
            setLoading(false);
        }
    };

    const isExpired = business?.subscription_expires_at ? new Date(business.subscription_expires_at) < new Date() : false;
    const needsPayment = !business || !business.active || isExpired;

    const saveOrCreateBusiness = async () => {
        let finalImageUrl = formData.image_url;
        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${userId}/${Math.random()}.${fileExt}`;
            await supabase.storage.from('flyers').upload(fileName, imageFile);
            const { data: { publicUrl } } = supabase.storage.from('flyers').getPublicUrl(fileName);
            finalImageUrl = publicUrl;
        }

        let businessId = business?.id;

        if (!businessId) {
            const businessData = {
                ...formData,
                image_url: finalImageUrl,
                location_lat: position[0],
                location_lng: position[1],
                owner_id: userId,
                active: false,
            };

            const { data: newBusiness, error: createError } = await supabase
                .from('businesses')
                .insert([businessData])
                .select()
                .single();

            if (createError) throw createError;
            businessId = newBusiness.id;
        } else {
            const { error: updateError } = await supabase
                .from('businesses')
                .update({
                    ...formData,
                    image_url: finalImageUrl,
                    location_lat: position[0],
                    location_lng: position[1],
                })
                .eq('id', businessId);

            if (updateError) throw updateError;
        }

        return { businessId, finalImageUrl };
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            alert('Por favor, ingresá el nombre del negocio.');
            return false;
        }
        if (!formData.category) {
            alert('Por favor, seleccioná una categoría.');
            return false;
        }
        if (!formData.phone.trim()) {
            alert('Por favor, ingresá un número de WhatsApp.');
            return false;
        }
        if (!formData.description.trim()) {
            alert('Por favor, ingresá una descripción.');
            return false;
        }
        if (!location) {
            alert('Por favor, seleccioná la ubicación en el mapa.');
            return false;
        }
        return true;
    };

    const sendConfirmation = async (email: string, businessName: string, expiryDate: string) => {
        try {
            await supabase.functions.invoke('send-confirmation-email', {
                body: { email, businessName, expiryDate }
            });
        } catch (err) {
            console.error('Error sending confirmation email:', err);
        }
    };

    const handleFreeActivation = async () => {
        if (!validateForm()) return;
        setLoading(true);
        try {
            const { businessId } = await saveOrCreateBusiness();

            const months = parseInt(selectedTier.replace('m', ''));
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + months);

            const { error } = await supabase
                .from('businesses')
                .update({
                    active: true,
                    subscription_expires_at: expiryDate.toISOString(),
                })
                .eq('id', businessId);

            if (error) throw error;

            // Log the "free" payment
            await supabase
                .from('payments')
                .insert([{
                    business_id: businessId,
                    amount: 0,
                    months: months,
                    payment_id: 'free',
                    status: 'approved'
                }]);

            // Send confirmation email
            const user = (await supabase.auth.getUser()).data.user;
            if (user?.email) {
                await sendConfirmation(user.email, formData.name, expiryDate.toISOString());
            }

            onSave();
        } catch (error: any) {
            alert('Error al activar: ' + translateError(error.message));
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!validateForm()) return;
        setLoading(true);
        try {
            const { businessId } = await saveOrCreateBusiness();

            const { data, error: funcError } = await supabase.functions.invoke('mercadopago-payment', {
                body: {
                    businessId: businessId,
                    businessName: `${formData.name} - Suscripción ${selectedTier === '1m' ? '1 Mes' : selectedTier.replace('m', ' Meses')}`,
                    amount: tierPrices[selectedTier].promo,
                    months: parseInt(selectedTier.replace('m', '')),
                    email: (await supabase.auth.getUser()).data.user?.email,
                }
            });

            if (funcError) throw funcError;

            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error('No se pudo generar el enlace de pago.');
            }

        } catch (error: any) {
            alert('Error al iniciar el pago: ' + translateError(error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
            <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '1.5rem', height: 'fit-content', margin: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>{business ? 'Editar Negocio' : 'Nuevo Negocio'}</h2>
                    <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Business Type Selection */}
                    <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                        <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: '800', textAlign: 'center' }}>¿Qué querés publicar?</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'business' })}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '10px',
                                    border: '2px solid',
                                    borderColor: formData.type === 'business' ? 'var(--primary)' : 'transparent',
                                    background: formData.type === 'business' ? 'white' : 'transparent',
                                    boxShadow: formData.type === 'business' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: formData.type === 'business' ? 'var(--primary)' : 'var(--text-main)', marginBottom: '4px' }}>Negocio / Servicio</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.2' }}>Para comercios, profesionales o servicios permanentes.</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'classified' })}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '10px',
                                    border: '2px solid',
                                    borderColor: formData.type === 'classified' ? 'var(--primary)' : 'transparent',
                                    background: formData.type === 'classified' ? 'white' : 'transparent',
                                    boxShadow: formData.type === 'classified' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: formData.type === 'classified' ? 'var(--primary)' : 'var(--text-main)', marginBottom: '4px' }}>Clasificado</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.2' }}>Para ventas puntuales y temporales (ej: auto, muebles).</div>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '600' }}>Nombre</label>
                        <input
                            className="input-field"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="Nombre de tu negocio"
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '600' }}>Categoría</label>
                            <select
                                className="input-field"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '600' }}>WhatsApp</label>
                            <input
                                className="input-field"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="54911..."
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '600' }}>Descripción</label>
                        <textarea
                            className="input-field"
                            style={{ height: '80px', resize: 'none' }}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Contanos qué haces..."
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '600' }}>Página Web / Red Social (Opcional)</label>
                        <div style={{ position: 'relative' }}>
                            <Globe size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                className="input-field"
                                style={{ paddingLeft: '40px' }}
                                value={formData.website_url}
                                onChange={e => setFormData({ ...formData, website_url: e.target.value })}
                                placeholder="https://tu-sitio.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '600' }}>Foto / Flyer (Cuadrada 1:1)</label>
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

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600' }}>Ubicación</label>
                        <div style={{ height: '200px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                            <MapContainer
                                center={position[0] ? position : [-31.4201, -64.1888]} // Coordinates center
                                zoom={15}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <LocationPicker position={position} setPosition={setPosition} />
                            </MapContainer>
                        </div>
                    </div>

                    {needsPayment && (
                        <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <p style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '1rem', textAlign: 'center' }}>Seleccioná tu plan</p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                {[
                                    { id: '1m', label: '1 Mes' },
                                    { id: '3m', label: '3 Meses' },
                                    { id: '6m', label: '6 Meses' },
                                    { id: '12m', label: '12 Meses' }
                                ].filter(tier => tierPrices[tier.id].active).map((tier) => (
                                    <button
                                        key={tier.id}
                                        type="button"
                                        onClick={() => setSelectedTier(tier.id)}
                                        style={{
                                            padding: '12px 8px',
                                            borderRadius: '12px',
                                            border: '2px solid',
                                            borderColor: selectedTier === tier.id ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                            background: selectedTier === tier.id ? 'rgba(127, 29, 29, 0.1)' : 'transparent',
                                            color: selectedTier === tier.id ? 'var(--primary)' : 'var(--text-muted)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <span style={{ fontWeight: '700', fontSize: '1rem' }}>{tier.label}</span>
                                        {tierPrices[tier.id].original > tierPrices[tier.id].promo && (
                                            <span style={{ textDecoration: 'line-through', fontSize: '0.85rem', opacity: 0.6 }}>
                                                ${tierPrices[tier.id].original.toLocaleString()}
                                            </span>
                                        )}
                                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                                            ${tierPrices[tier.id].promo.toLocaleString()}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.03)', borderRadius: '12px' }}>
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <span style={{
                                        fontSize: '1.2rem',
                                        color: 'var(--text-muted)',
                                        textDecoration: 'line-through',
                                        marginRight: '0.75rem',
                                        opacity: 0.6
                                    }}>
                                        ${tierPrices[selectedTier].original.toLocaleString()}
                                    </span>
                                    <span style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--primary)' }}>
                                        ${tierPrices[selectedTier].promo.toLocaleString()}
                                    </span>
                                </div>
                                {['1m', '3m', '6m', '12m'].filter(t => tierPrices[t].active).length === 0 && (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hay planes disponibles por el momento.</p>
                                )}
                                {promoDescription && (
                                    <p style={{
                                        fontSize: '0.85rem',
                                        color: 'var(--primary)',
                                        fontWeight: '600',
                                        fontStyle: 'italic'
                                    }}>
                                        {promoDescription}
                                    </p>
                                )}
                            </div>

                            {tierPrices[selectedTier].promo === 0 ? (
                                <button
                                    type="button"
                                    onClick={handleFreeActivation}
                                    className="btn-primary"
                                    style={{ width: '100%', background: '#16a34a', padding: '14px', borderRadius: '12px' }}
                                    disabled={loading || !formData.name}
                                >
                                    <CheckCircle size={20} /> {loading ? 'Activando...' : 'Activar Gratis'}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handlePayment}
                                    className="btn-primary"
                                    style={{ width: '100%', background: '#009ee3', padding: '14px', borderRadius: '12px' }}
                                    disabled={loading || !formData.name}
                                >
                                    <CreditCard size={20} /> {business ? 'Renovar con Mercado Pago' : 'Pagar y Activar'}
                                </button>
                            )}
                        </div>
                    )}

                    {business && !needsPayment && (
                        <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                            <Save size={20} /> {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    )}
                </form>

                {
                    isCropping && imageSrc && (
                        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', background: '#111', zIndex: 3000, display: 'flex', flexDirection: 'column' }}>
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
                                <button type="button" className="btn-primary" onClick={applyCrop}>Confirmar</button>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
}
