import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Business } from '../types/database';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Save, X, Upload, MessageCircle, Scissors, Globe } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/imageUtils';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const CATEGORIES = ['Gastronomía', 'Moda', 'Salud', 'Hogar', 'Vehículo', 'Servicios', 'Belleza', 'Otros'];

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

    const [price, setPrice] = useState<number>(0);

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
        const fetchPrice = async () => {
            const { data } = await supabase.from('config').select('value').eq('key', 'subscription_price').single();
            if (data) setPrice(data.value);
        };
        fetchPrice();
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
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const isExpired = business?.subscription_expires_at ? new Date(business.subscription_expires_at) < new Date() : false;
    const needsPayment = !business || !business.active || isExpired;

    const handlePayment = async () => {
        if (!formData.name) return;
        setLoading(true);
        try {
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

            const { data, error: funcError } = await supabase.functions.invoke('mercadopago-payment', {
                body: {
                    businessId: businessId,
                    businessName: formData.name,
                    amount: price,
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
            alert('Error al iniciar el pago: ' + error.message);
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
                        <div>
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
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '600' }}>Página Web / Red Social</label>
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
                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '600' }}>Foto / Flyer (Vertical 4:5)</label>
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
                        <div style={{ padding: '1rem', background: '#fefce8', borderRadius: '12px', border: '1px solid #fde047', textAlign: 'center' }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem' }}>Activación (30 días)</p>
                            <h3 style={{ fontSize: '1.5rem', color: '#854d0e', marginBottom: '1rem' }}>${price.toLocaleString()}</h3>
                            <button
                                type="button"
                                onClick={handlePayment}
                                className="btn-primary"
                                style={{ width: '100%', background: '#22c55e' }}
                                disabled={loading || !formData.name}
                            >
                                <MessageCircle size={20} /> {business ? 'Renovar con Mercado Pago' : 'Pagar y Activar'}
                            </button>
                        </div>
                    )}

                    {business && !needsPayment && (
                        <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                            <Save size={20} /> {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    )}
                </form>

                {isCropping && imageSrc && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'white', zIndex: 3000, display: 'flex', flexDirection: 'column' }}>
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
        </div>
    );
}
