import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock fetch globally
global.fetch = vi.fn().mockImplementation((url: string) => {
  if (url.includes('/api/dashboard/metrics')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          total_tasks: 0,
          running_tasks: 0,
          completed_tasks: 0,
          failed_tasks: 0,
          pending_tasks: 0,
          available_agents: 4,
          total_agents: 4,
          system_health: {
            status: 'healthy',
            database: 'connected',
            memory_gb_total: 16.0,
            gpu_detected: true,
            gpu_model: 'NVIDIA GeForce RTX 2050',
            gpu_vram_mb: 4096,
            uptime_seconds: 120,
          },
          llm_connected: false,
          llm_model: 'qwen3.5:4b',
          llm_model_available: false,
          recent_tasks: [],
          recent_reports: [],
        }),
    });
  }

  if (url.includes('/api/llm/status')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          connected: false,
          base_url: 'http://localhost:11434',
          target_model: 'qwen3.5:4b',
          model_available: false,
          installed_models: [],
          install_command: 'ollama run qwen3.5:4b',
        }),
    });
  }

  if (url.includes('/api/health')) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          status: 'healthy',
          database: 'healthy',
          hardware: {
            ram_total_gb: 16.0,
            ram_available_gb: 12.0,
            ram_usage_percent: 25.0,
            gpu_detected: true,
            gpu_model: 'NVIDIA GeForce RTX 2050',
            gpu_vram_mb: 4096,
          },
          uptime_seconds: 120,
        }),
    });
  }

  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  });
});

describe('Orchestra AI App Component', () => {
  it('renders Orchestra AI brand and navigation bar', async () => {
    render(<App />);

    // Brand title
    expect(screen.getAllByText('ORCHESTRA AI').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText('Your intelligent workspace for autonomous execution.')
    ).toBeInTheDocument();

    // Nav and action items
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getAllByText('New Task').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Agent Workspace')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Base')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    expect(screen.getByText('Approvals')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
