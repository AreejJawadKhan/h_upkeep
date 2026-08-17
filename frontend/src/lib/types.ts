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

export type ScheduleFrequency =
  | 'one_time'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export type MaintenanceSchedule = {
  id: number;
  user_id: number;
  home_id: number;
  asset_id: number | null;
  title: string;
  description: string | null;
  frequency: ScheduleFrequency;
  next_due_date: string | null;
  last_completed: string | null;
  reminder_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type MaintenanceScheduleCompleteResponse = {
  message: string;
  schedule: MaintenanceSchedule;
  maintenance_record: MaintenanceRecord | null;
};

export type MaintenanceDocument = {
  id: number;
  maintenance_id: number;
  user_id: number;
  file_name: string;
  file_type: string;
  cloudinary_public_id: string;
  cloudinary_resource_type: string;
  cloudinary_url: string;
  created_at: string;
};

export type HomeDocument = {
  id: number;
  maintenance_id: number;
  maintenance_title: string;
  file_name: string;
  file_type: string;
  cloudinary_url: string;
  created_at: string;
};

export type Warranty = {
  id: number;
  user_id: number;
  home_id: number;
  asset_id: number;
  document_id: number | null;
  provider: string;
  coverage_details: string | null;
  start_date: string;
  expiration_date: string;
  created_at: string;
  updated_at: string;
};

export type SpendingPeriodSummary = {
  label: string;
  total_spend: number;
  record_count: number;
};

export type SpendingCategorySummary = {
  category: string;
  total_spend: number;
  record_count: number;
};

export type SpendingAssetSummary = {
  asset_id: number | null;
  asset_name: string;
  total_spend: number;
  record_count: number;
};

export type SpendingRecordSummary = {
  id: number;
  title: string;
  date: string;
  category: string;
  cost: number;
  service_provider: string | null;
  home_id: number;
  home_name: string;
  asset_id: number | null;
  asset_name: string | null;
  created_at: string;
};

export type SpendingOverviewResponse = {
  scope_home_id: number | null;
  scope_home_name: string | null;
  total_spend: number;
  this_month_spend: number;
  this_year_spend: number;
  previous_year_spend: number;
  average_cost: number;
  record_count: number;
  monthly_trend: SpendingPeriodSummary[];
  category_breakdown: SpendingCategorySummary[];
  asset_breakdown: SpendingAssetSummary[];
  recent_records: SpendingRecordSummary[];
};

export type ApiErrorShape = {
  detail?: string;
  message?: string;
};
