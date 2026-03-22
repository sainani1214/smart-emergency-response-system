export interface RegisterUserInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  city: string;
  state: string;
  street?: string;
  zip_code?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface RegisterResponderInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  responder_type: 'paramedic' | 'firefighter' | 'police' | 'security' | 'maintenance';
  badge_number?: string;
  skills?: string[];
  certifications?: string[];
  experience_years?: number;
}

export interface LoginInput {
  email: string;
  password: string;
  role: 'user' | 'responder';
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  preferences?: {
    notifications_enabled?: boolean;
    sms_alerts?: boolean;
    email_alerts?: boolean;
  };
}
