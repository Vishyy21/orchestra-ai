import type {
  Task,
  TaskCreateInput,
  AgentCard,
  AgentRun,
  Report,
  DocumentItem,
  Approval,
  SystemHealth,
  LLMStatus,
  DashboardMetrics,
  IntegrationsOverview,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        if (typeof errJson.detail === 'string') {
          errorDetail = errJson.detail;
        } else if (errJson.detail.error) {
          errorDetail = errJson.detail.error;
        } else {
          errorDetail = JSON.stringify(errJson.detail);
        }
      }
    } catch {
      // Keep default
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Health
  getHealth: () => request<SystemHealth>('/api/health'),

  // LLM Status & Testing
  getLLMStatus: () => request<LLMStatus>('/api/llm/status'),
  testLLM: (prompt: string, model?: string) =>
    request<{
      success: boolean;
      model: string;
      response: string;
      latency_ms: number;
      eval_count?: number;
      eval_duration_ms?: number;
    }>('/api/llm/test', {
      method: 'POST',
      body: JSON.stringify({ prompt, model }),
    }),

  // Dashboard Aggregates
  getDashboardMetrics: () => request<DashboardMetrics>('/api/dashboard/metrics'),

  // Tasks
  getTasks: (params?: { skip?: number; limit?: number; status?: string; category?: string }) => {
    const query = new URLSearchParams();
    if (params?.skip) query.set('skip', params.skip.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.category) query.set('category', params.category);
    const qs = query.toString();
    return request<{ tasks: Task[]; total: number }>(`/api/tasks${qs ? `?${qs}` : ''}`);
  },
  createTask: (data: TaskCreateInput) =>
    request<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getTask: (id: string) => request<Task>(`/api/tasks/${id}`),
  executeTask: (id: string, sync: boolean = false, requiresApproval?: boolean) => {
    const params = new URLSearchParams({ sync: sync.toString() });
    if (requiresApproval !== undefined) {
      params.set('requires_approval', requiresApproval.toString());
    }
    return request<{
      message: string;
      task_id: string;
      status: string;
      result_summary?: string;
      workflow_result?: any;
    }>(`/api/tasks/${id}/execute?${params.toString()}`, {
      method: 'POST',
    });
  },
  deleteTask: (id: string) =>
    request<void>(`/api/tasks/${id}`, {
      method: 'DELETE',
    }),

  // Agents
  getAgents: () => request<AgentCard[]>('/api/agents'),
  getAgentsHistory: () => request<AgentRun[]>('/api/agents/history'),

  // Reports
  getReports: (taskId?: string) => {
    const qs = taskId ? `?task_id=${encodeURIComponent(taskId)}` : '';
    return request<Report[]>(`/api/reports${qs}`);
  },
  getReport: (id: string) => request<Report>(`/api/reports/${id}`),

  // Documents
  getDocuments: () => request<DocumentItem[]>('/api/documents'),
  uploadDocument: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<DocumentItem>('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
  },
  deleteDocument: (id: string) =>
    request<void>(`/api/documents/${id}`, {
      method: 'DELETE',
    }),

  // Approvals
  getApprovals: (status?: string, taskId?: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status_filter', status);
    if (taskId) params.set('task_id', taskId);
    const qs = params.toString();
    return request<Approval[]>(`/api/approvals${qs ? `?${qs}` : ''}`);
  },
  decideApproval: (id: string, decision: 'approved' | 'rejected', reason?: string, sync: boolean = false) =>
    request<Approval>(`/api/approvals/${id}/decide?sync=${sync}`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason }),
    }),

  // Integrations (Tavily & LangSmith)
  getIntegrationsStatus: () => request<IntegrationsOverview>('/api/integrations/status'),
  testTavily: () =>
    request<{
      configured: boolean;
      connected: boolean;
      latency_seconds?: number;
      error?: string;
      message: string;
    }>('/api/integrations/test/tavily', {
      method: 'POST',
    }),
  testLangSmith: (project?: string) => {
    const qs = project ? `?project=${encodeURIComponent(project)}` : '';
    return request<{
      configured: boolean;
      connected: boolean;
      project: string;
      latency_seconds?: number;
      error?: string;
      message: string;
    }>(`/api/integrations/test/langsmith${qs}`, {
      method: 'POST',
    });
  },
};
