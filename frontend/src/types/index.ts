export type TaskStatus = 'pending' | 'running' | 'awaiting_approval' | 'completed' | 'failed';
export type TaskCategory =
  | 'general'
  | 'research'
  | 'code_generation'
  | 'workflow_analysis'
  | 'system_design'
  | 'verification';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AgentRunBrief {
  id: string;
  agent_name: string;
  status: string;
  input_data?: string;
  output_data?: string;
  started_at: string;
  completed_at?: string;
  execution_time_ms?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  category: TaskCategory;
  priority: PriorityLevel;
  requires_approval?: boolean;
  result_summary?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  agent_runs?: AgentRunBrief[];
  approvals?: Approval[];
}

export interface TaskCreateInput {
  title: string;
  description: string;
  category: string;
  priority: string;
  requires_approval?: boolean;
}

export interface AgentCard {
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  status: 'ready' | 'idle' | 'busy' | 'offline';
  icon: string;
  color: string;
  order: number;
}

export interface AgentRun {
  id: string;
  task_id: string;
  agent_name: string;
  status: string;
  input_data?: string;
  output_data?: string;
  output?: string;
  started_at: string;
  completed_at?: string;
  created_at?: string;
  execution_time_ms?: number;
}

export interface Report {
  id: string;
  task_id?: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  indexed: boolean;
  chunk_count?: number;
  file_hash?: string;
  uploaded_at: string;
}

export interface Approval {
  id: string;
  task_id: string;
  agent_name: string;
  action_type: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  payload?: string;
  created_at: string;
  decided_at?: string;
}

export interface SystemHardware {
  ram_total_gb: number;
  ram_available_gb: number;
  ram_usage_percent: number;
  gpu_detected: boolean;
  gpu_model?: string;
  gpu_vram_mb?: number;
}

export interface SystemHealth {
  status: string;
  database: string;
  hardware: SystemHardware;
  uptime_seconds: number;
}

export interface LLMStatus {
  connected: boolean;
  status?: 'CONNECTED' | 'MODEL_MISSING' | 'SERVICE_STOPPED' | 'CONNECTION_ERROR' | 'INFERENCE_FAILED' | string;
  service_running?: boolean;
  base_url: string;
  target_model: string;
  model_available: boolean;
  installed_models: string[];
  latency_ms?: number;
  install_command: string;
  error?: string;
  action_instructions?: string;
  last_checked_at?: string;
  last_inference_verified_at?: string | null;
  gpu_available?: boolean;
  gpu_name?: string | null;
  gpu_vram_used_mb?: number | null;
  gpu_vram_total_mb?: number | null;
}

export interface DashboardMetrics {
  total_tasks: number;
  running_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  pending_tasks: number;
  available_agents: number;
  total_agents: number;
  system_health: {
    status: string;
    database: string;
    memory_gb_total: number;
    gpu_detected: boolean;
    gpu_model?: string;
    gpu_vram_mb?: number;
    uptime_seconds: number;
  };
  llm_connected: boolean;
  llm_model: string;
  llm_model_available: boolean;
  llm_latency_ms?: number;
  recent_tasks: Task[];
  recent_reports: Report[];
}

export interface IntegrationStatusItem {
  name: string;
  role: string;
  configured: boolean;
  status: string;
  masked_key?: string | null;
  details: Record<string, any>;
  message: string;
}

export interface IntegrationsOverview {
  primary_llm: {
    provider: string;
    model: string;
    endpoint: string;
    is_primary: boolean;
    description: string;
  };
  tavily: IntegrationStatusItem;
  langsmith: IntegrationStatusItem;
}
