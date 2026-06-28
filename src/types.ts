export interface Citizen {
  id: number;
  uuid: string;
  nickname: string;
  points: number;
}

export interface Issue {
  id: number;
  description: string;
  image_url: string | null;
  category: string;
  severity: number;
  latitude: number;
  longitude: number;
  status: 'processing' | 'reported' | 'ai recommended review' | 'in_progress' | 'community resolved' | 'duplicate';
  summary: string | null;
  verification_count: number;
  flag_count: number;
  reporter_uuid: string | null;
  assigned_department: string | null;
  created_at: string;
  // Dynamic advice object computed on the fly for AI Advisor
  ai_advice?: {
    recommended_status: string;
    confidence: number;
    explanation: string;
  };
}

export interface DashboardStats {
  total_reports: number;
  open_reports: number;
  resolved_reports: number;
  average_severity: string;
  top_category: string;
}

export interface CivicInsight {
  type: 'trend' | 'hotspot' | 'urgency' | 'verification';
  title: string;
  description: string;
  iconName: string;
}
