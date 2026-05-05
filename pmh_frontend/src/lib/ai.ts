import type {
  AnalyzeInputRequest,
  ChatRequest,
  ChatResponse,
  CommunityPost,
  CreateCommunityPostRequest,
  ListCommunityPostsResponse,
  RecommendServicesRequest,
  RecommendServicesResponse,
  SupportAnalysis,
  TranslateRequest,
  TranslateResponse,
} from '@/types/ai';

const DEFAULT_AI_API_URL = 'http://127.0.0.1:8000';
const STORED_ANALYSIS_KEY = 'matria.latest-support-analysis';
const SUPPORT_INPUT_STATUS_KEY = 'matria.support-input-status';

export type SupportInputStatus = 'skipped' | 'completed';

const aiApiUrl = (import.meta.env.VITE_AI_API_URL || DEFAULT_AI_API_URL).replace(/\/+$/, '');

async function postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const response = await fetch(`${aiApiUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const payload = await response.json();
      if (payload?.detail) {
        message = typeof payload.detail === 'string' ? payload.detail : JSON.stringify(payload.detail);
      }
    } catch {
      // Ignore JSON parsing errors and keep the default message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<TResponse>;
}

async function getJson<TResponse>(path: string): Promise<TResponse> {
  const response = await fetch(`${aiApiUrl}${path}`);

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const payload = await response.json();
      if (payload?.detail) {
        message = typeof payload.detail === 'string' ? payload.detail : JSON.stringify(payload.detail);
      }
    } catch {
      // Ignore JSON parsing errors and keep the default message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<TResponse>;
}

async function patchJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const response = await fetch(`${aiApiUrl}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const payload = await response.json();
      if (payload?.detail) {
        message = typeof payload.detail === 'string' ? payload.detail : JSON.stringify(payload.detail);
      }
    } catch {
      // Ignore JSON parsing errors and keep the default message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<TResponse>;
}

async function deleteRequest(path: string): Promise<void> {
  const response = await fetch(`${aiApiUrl}${path}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const payload = await response.json();
      if (payload?.detail) {
        message = typeof payload.detail === 'string' ? payload.detail : JSON.stringify(payload.detail);
      }
    } catch {
      // Ignore JSON parsing errors and keep the default message.
    }

    throw new Error(message);
  }
}

export async function analyzeSupportInput(payload: AnalyzeInputRequest): Promise<SupportAnalysis> {
  return postJson<SupportAnalysis>('/analyze/input', payload);
}

export async function recommendServices(payload: RecommendServicesRequest): Promise<RecommendServicesResponse> {
  return postJson<RecommendServicesResponse>('/recommend/services', payload);
}

export async function translateContent(payload: TranslateRequest): Promise<TranslateResponse> {
  return postJson<TranslateResponse>('/translate', payload);
}

export async function sendChatMessage(payload: ChatRequest): Promise<ChatResponse> {
  return postJson<ChatResponse>('/chat', payload);
}

export async function listCommunityPosts(includeHidden = false): Promise<ListCommunityPostsResponse> {
  const query = includeHidden ? '?include_hidden=true' : '';
  return getJson<ListCommunityPostsResponse>(`/community/posts${query}`);
}

export async function createCommunityPost(payload: CreateCommunityPostRequest): Promise<CommunityPost> {
  return postJson<CommunityPost>('/community/posts', payload);
}

export async function updateCommunityPostStatus(postId: string, status: CommunityPost['status']): Promise<CommunityPost> {
  return patchJson<CommunityPost>(`/community/posts/${postId}`, { status });
}

export async function updateCommunityPostLike(postId: string, liked: boolean): Promise<CommunityPost> {
  return postJson<CommunityPost>(`/community/posts/${postId}/like`, { liked });
}

export async function deleteCommunityPost(postId: string): Promise<void> {
  await deleteRequest(`/community/posts/${postId}`);
}

export function storeLatestSupportAnalysis(analysis: SupportAnalysis): void {
  window.localStorage.setItem(STORED_ANALYSIS_KEY, JSON.stringify(analysis));
}

export function getLatestSupportAnalysis(): SupportAnalysis | null {
  const raw = window.localStorage.getItem(STORED_ANALYSIS_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SupportAnalysis;
  } catch {
    window.localStorage.removeItem(STORED_ANALYSIS_KEY);
    return null;
  }
}

export function clearLatestSupportAnalysis(): void {
  window.localStorage.removeItem(STORED_ANALYSIS_KEY);
}

export function setSupportInputStatus(status: SupportInputStatus): void {
  window.localStorage.setItem(SUPPORT_INPUT_STATUS_KEY, status);
}

export function getSupportInputStatus(): SupportInputStatus | null {
  const status = window.localStorage.getItem(SUPPORT_INPUT_STATUS_KEY);
  if (status === 'skipped' || status === 'completed') {
    return status;
  }

  return null;
}

export function clearSupportInputStatus(): void {
  window.localStorage.removeItem(SUPPORT_INPUT_STATUS_KEY);
}
