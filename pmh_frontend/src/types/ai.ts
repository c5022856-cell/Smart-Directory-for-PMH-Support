export type RiskLevel = 'low' | 'medium' | 'high' | 'urgent';
export type ChatRole = 'user' | 'assistant';

export interface RecommendationContext {
  motherhood_stage?: string | null;
  support_types?: string[];
  interaction_preferences?: string[];
  preferred_language?: string | null;
  risk_level?: RiskLevel;
  keywords?: string[];
}

export interface SupportAnalysis {
  detected_language: string;
  motherhood_stage: string | null;
  support_types: string[];
  interaction_preferences: string[];
  risk_level: RiskLevel;
  keywords: string[];
  summary: string;
  requires_crisis_action: boolean;
  crisis_guidance: string | null;
  saved: boolean;
  storage_error: string | null;
}

export interface AnalyzeInputRequest {
  text: string;
  user_id?: string | null;
  profile?: RecommendationContext;
  persist?: boolean;
}

export interface ServiceRecommendation {
  id: string;
  name: string;
  description: string | null;
  support_type: string;
  languages: string[];
  delivery_modes: string[];
  motherhood_stages: string[];
  support_tags: string[];
  location: string | null;
  distance_label: string | null;
  availability: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  rating: number | null;
  review_count: number | null;
  crisis_capable: boolean;
  score: number;
  recommendation_reason: string | null;
  is_recommended: boolean;
}

export interface RecommendServicesRequest {
  profile?: RecommendationContext;
  query?: string | null;
  support_type?: string | null;
  limit?: number;
}

export interface RecommendServicesResponse {
  items: ServiceRecommendation[];
}

export interface TranslationInput {
  key: string;
  text: string;
  source_language?: string;
}

export interface TranslateRequest {
  items: TranslationInput[];
  target_language: string;
  provider_preference?: 'auto' | 'groq' | 'google';
}

export interface TranslationResult {
  key: string;
  source_text: string;
  source_language: string;
  target_language: string;
  translated_text: string;
  cached: boolean;
  provider: string;
}

export interface TranslateResponse {
  items: TranslationResult[];
}

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  profile?: RecommendationContext;
}

export interface ChatResponse {
  message: ChatMessage;
  risk_level: RiskLevel;
  used_fallback: boolean;
  disclaimer: string | null;
  sources: string[];
}

export interface CommunityPost {
  id: string;
  user_id: string | null;
  author_name: string | null;
  content: string;
  is_anonymous: boolean;
  original_language: string;
  status: 'visible' | 'hidden';
  like_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCommunityPostRequest {
  content: string;
  user_id?: string | null;
  author_name?: string | null;
  is_anonymous?: boolean;
  original_language?: string;
}

export interface ListCommunityPostsResponse {
  items: CommunityPost[];
}
