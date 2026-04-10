import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Business } from '../types/database';
import { Navigation } from 'lucide-react';

// Fix Leaflet marker icons in Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface CategoryIcon {
    name: string;
    icon: string;
}

interface BusinessMapProps {
    businesses: Business[];
    onBusinessClick: (business: Business) => void;
    categoryIcons: CategoryIcon[];
}

// Component to handle map centering and user location
const MapController = ({ userLocation }: { userLocation: [number, number] | null }) => {
    const map = useMap();
    
    useEffect(() => {
        if (userLocation) {
            map.setView(userLocation, 14, { animate: true });
        }
    }, [userLocation, map]);

    return null;
};

const BusinessMap: React.FC<BusinessMapProps> = ({ businesses, onBusinessClick, categoryIcons }) => {
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const defaultCenter: [number, number] = [-31.417, -64.183]; // Córdoba, Argentina

    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation([position.coords.latitude, position.coords.longitude]);
                },
                (error) => {
                    console.error("Error getting location:", error);
                }
            );
        }
    }, []);

    const getBusinessIcon = (categoriesString: string) => {
        const businessCategories = categoriesString.split(',').map(s => s.trim());
        const categoryMatch = categoryIcons.find(cat => businessCategories.includes(cat.name));
        return categoryMatch ? categoryMatch.icon : '✨';
    };

    // Filter businesses with valid coordinates
    const georeferencedBusinesses = businesses.filter(
        b => b.location_lat !== null && b.location_lng !== null
    );

    return (
        <div style={{ 
            height: '500px', 
            width: '100%', 
            borderRadius: '16px', 
            overflow: 'hidden', 
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            border: '1px solid var(--border-light)',
            position: 'relative',
            marginBottom: '1.5rem'
        }}>
            <MapContainer 
                center={defaultCenter} 
                zoom={13} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <MapController userLocation={userLocation} />

                {userLocation && (
                    <Marker position={userLocation} icon={L.divIcon({
                        className: 'user-location-marker',
                        html: `<div style="background: #3b82f6; width: 12px; height: 12px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"></div>`,
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    })}>
                        <Popup>Tu ubicación actual</Popup>
                    </Marker>
                )}

                {georeferencedBusinesses.map((business) => (
                    <Marker 
                        key={business.id} 
                        position={[business.location_lat!, business.location_lng!]}
                        icon={L.divIcon({
                            className: 'business-category-marker',
                            html: `<div class="marker-pin-inner">${getBusinessIcon(business.category)}</div>`,
                            iconSize: [36, 36],
                            iconAnchor: [18, 18],
                            popupAnchor: [0, -18]
                        })}
                    >
                        <Popup>
                            <div style={{ textAlign: 'center', minWidth: '150px' }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--text-main)' }}>{business.name}</h4>
                                <button 
                                    onClick={() => onBusinessClick(business)}
                                    className="btn-primary"
                                    style={{ 
                                        padding: '4px 12px', 
                                        fontSize: '0.8rem', 
                                        width: '100%',
                                        justifyContent: 'center'
                                    }}
                                >
                                    Ver Detalle
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
            
            {!userLocation && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 1000,
                    background: 'white',
                    padding: '8px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <Navigation size={14} className="animate-pulse" />
                    Obteniendo ubicación...
                </div>
            )}
        </div>
    );
};

export default BusinessMap;
