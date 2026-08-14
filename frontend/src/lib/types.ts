export type User = {
  id: number;
  name: string;
  email: string;
  email_verified: boolean;
  created_at: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: 'bearer';
  user: User;
};

export type RefreshResponse = {
  access_token: string;
  token_type: 'bearer';
};

export type MessageResponse = {
  message: string;
};

export type Home = {
  id: number;
  user_id: number;
  name: string;
  address: string;
  property_type: string;
  year_built: number;
  created_at: string;
  updated_at: string;
};

export type Area = {
  id: number;
  home_id: number;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Asset = {
  id: number;
  home_id: number;
  area_id: number | null;
  name: string;
  category: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  installation_date: string | null;
  expected_lifespan: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MaintenanceCategory =
  | 'HVAC'
  | 'Plumbing'
  | 'Electrical'
  | 'Appliance'
  | 'Structural'
  | 'Cleaning'
  | 'Pest Control'
  | 'Other';

export type MaintenanceRecord = {
  id: number;
  user_id: number;
  home_id: number;
  asset_id: number | null;
  title: string;
  description: string | null;
  item: string;
  category: MaintenanceCategory;
  date: string;
  cost: number;
  service_provider: string | null;
  next_due_date: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ApiErrorShape = {
  detail?: string;
  message?: string;
};
