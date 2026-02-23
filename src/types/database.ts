export type Profile = {
    id: string;
    email: string;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
};

export type Business = {
    id: string;
    owner_id: string;
    name: string;
    description: string | null;
    category: string;
    phone: string | null;
    location_lat: number | null;
    location_lng: number | null;
    image_url: string | null;
    active: boolean;
    subscription_expires_at: string | null;
    created_at: string;
    updated_at: string;
};

export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: Omit<Profile, 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
            };
            businesses: {
                Row: Business;
                Insert: Omit<Business, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Business, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>;
            };
        };
    };
};
