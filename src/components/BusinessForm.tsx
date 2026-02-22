import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Business } from '../types/database';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Save, X, MapPin, Upload } from 'lucide-react';

// Fix for default marker icon in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const CATEGORIES = ['Gastronomía', 'Moda', 'Salud', 'Para el hogar', 'Vehículo', 'Servicios', 'Otros'];

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
    });
    const [position, setPosition] = useState<[number, number]>([
        business?.location_lat || 0,
        business?.location_lng || 0
    ]);
    const [imageFile, setImageFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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

            if (business) {
                const { error } = await supabase
                    .from('businesses')
                    .update(businessData)
                    .eq('id', business.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('businesses')
                    .insert([businessData]);
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
            <div className="glass-card" style={{ maxWidth: '800px', width: '100%', padding: '2rem', height: 'fit-content', margin: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <h2>{business ? 'Editar Negocio' : 'Nuevo Negocio'}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        <div>
                            <label>Nombre del Negocio</label>
                            <input
                                className="input-field"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label>Categoría</label>
                            <select
                                className="input-field"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label>WhatsApp (con código de país, ej: 54911...)</label>
                            <input
                                className="input-field"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="5491100000000"
                            />
                        </div>
                        <div>
                            <label>Descripción</label>
                            <textarea
                                className="input-field"
                                style={{ height: '100px' }}
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div>
                            <label>Imagen / Flyer</label>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
                                <label className="btn-primary" style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
                                    <Upload size={16} /> Seleccionar Imagen
                                    <input type="file" hidden accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                                </label>
                                {imageFile && <span style={{ fontSize: '0.8rem' }}>{imageFile.name}</span>}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <label>Ubicación (Hacé click en el mapa)</label>
                        <div style={{ height: '300px', borderRadius: '15px', overflow: 'hidden' }}>
                            <MapContainer
                                center={position[0] ? position : [-34.6037, -58.3816]}
                                zoom={13}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <LocationPicker position={position} setPosition={setPosition} />
                            </MapContainer>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <MapPin size={12} /> {position[0].toFixed(6)}, {position[1].toFixed(6)}
                        </p>

                        <button type="submit" className="btn-primary" style={{ marginTop: 'auto', width: '100%' }} disabled={loading}>
                            <Save size={20} /> {loading ? 'Guardando...' : 'Guardar Negocio'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
