import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AgentWorkspacePage } from '../pages/AgentWorkspacePage';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    getTasks: vi.fn(),
    getTask: vi.fn(),
    getReports: vi.fn(),
    executeTask: vi.fn(),
    decideApproval: vi.fn(),
  },
}));

describe('AgentWorkspacePage Component Suite', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const renderWithProviders = (initialEntries = ['/workspace?taskId=task-1']) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <AgentWorkspacePage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders Task 1 with Attempt 2 latest completed execution and Attempt 1 in history', async () => {
    const task1Mock = {
      id: 'task-1',
      title: 'Analyze NVIDIA Corporation (NVDA) for Q3 2024',
      description: 'Run deep research and reporting pipeline',
      category: 'research',
      priority: 'high',
      status: 'completed',
      created_at: '2026-11-01T08:11:57Z',
      agent_runs: [
        // Attempt 1 (5 runs, reporter failed)
        { id: 'r1', agent_name: 'Planner Agent', status: 'completed', started_at: '2026-11-01T08:11:57Z', execution_time_ms: 12000 },
        { id: 'r2', agent_name: 'Research Agent', status: 'completed', started_at: '2026-11-01T08:12:09Z', execution_time_ms: 42000 },
        { id: 'r3', agent_name: 'Analysis Agent', status: 'completed', started_at: '2026-11-01T08:12:51Z', execution_time_ms: 27000 },
        { id: 'r4', agent_name: 'Verification Agent', status: 'completed', started_at: '2026-11-01T08:13:19Z', execution_time_ms: 45000 },
        { id: 'r5', agent_name: 'Reporter Agent', status: 'failed', started_at: '2026-11-01T08:14:04Z', execution_time_ms: 66200, output_data: 'Inference request timed out after 60.0s.' },
        // Attempt 2 (5 runs, reporter completed)
        { id: 'r6', agent_name: 'Planner Agent', status: 'completed', started_at: '2026-11-01T08:16:02Z', execution_time_ms: 13000 },
        { id: 'r7', agent_name: 'Research Agent', status: 'completed', started_at: '2026-11-01T08:16:15Z', execution_time_ms: 38000 },
        { id: 'r8', agent_name: 'Analysis Agent', status: 'completed', started_at: '2026-11-01T08:16:53Z', execution_time_ms: 32000 },
        { id: 'r9', agent_name: 'Verification Agent', status: 'completed', started_at: '2026-11-01T08:17:26Z', execution_time_ms: 43000 },
        { id: 'r10', agent_name: 'Reporter Agent', status: 'completed', started_at: '2026-11-01T08:18:10Z', execution_time_ms: 68156, output_data: 'Executive Report Generated Successfully' },
      ],
    };

    vi.mocked(api.getTasks).mockResolvedValue({ tasks: [task1Mock], total: 1 });
    vi.mocked(api.getTask).mockResolvedValue(task1Mock as any);
    vi.mocked(api.getReports).mockResolvedValue([]);

    renderWithProviders(['/workspace?taskId=task-1']);

    await waitFor(() => {
      expect(screen.getByText(/Attempt 2 of 2 \(Latest\)/i)).toBeInTheDocument();
    });

    // Both Attempt #1 and Attempt #2 should be visible in the Database Event Logs
    expect(screen.getByText('Attempt #1')).toBeInTheDocument();
    expect(screen.getByText('Attempt #2')).toBeInTheDocument();

    // In the timeline, all 5 nodes must show DONE (Reporter is DONE from Attempt 2)
    const doneBadges = screen.getAllByText('DONE');
    expect(doneBadges.length).toBeGreaterThanOrEqual(5);

    // Clicking Reporter Agent shows the Attempt 2 completed report, not timeout error
    fireEvent.click(screen.getByRole('heading', { name: 'Reporter Agent' }));

    await waitFor(() => {
      expect(screen.getByText('Executive Report Generated Successfully')).toBeInTheDocument();
    });
  });

  it('renders Task 3 with REJECTED AT GATE on Verifier and NOT EXECUTED on Reporter', async () => {
    const task3Mock = {
      id: 'task-3',
      title: 'HITL Rejection Scenario Verification',
      description: 'Test rejection gate',
      category: 'verification',
      priority: 'medium',
      status: 'failed',
      created_at: '2026-11-01T08:24:12Z',
      agent_runs: [
        { id: 't3-1', agent_name: 'Planner Agent', status: 'completed', started_at: '2026-11-01T08:24:12Z', execution_time_ms: 16000 },
        { id: 't3-2', agent_name: 'Research Agent', status: 'completed', started_at: '2026-11-01T08:24:28Z', execution_time_ms: 23000 },
        { id: 't3-3', agent_name: 'Analysis Agent', status: 'completed', started_at: '2026-11-01T08:24:52Z', execution_time_ms: 28000 },
        {
          id: 't3-4',
          agent_name: 'Verification Agent',
          status: 'failed',
          started_at: '2026-11-01T08:25:31Z',
          execution_time_ms: 0,
          output_data: 'ACTION REJECTED: Task rejected by Human-in-the-Loop governance. Reason: Data sources unverified - abort',
        },
      ],
    };

    vi.mocked(api.getTasks).mockResolvedValue({ tasks: [task3Mock], total: 1 });
    vi.mocked(api.getTask).mockResolvedValue(task3Mock as any);
    vi.mocked(api.getReports).mockResolvedValue([]);

    renderWithProviders(['/workspace?taskId=task-3']);

    await waitFor(() => {
      // Verifier badge displays REJECTED AT GATE
      const rejectedBadges = screen.getAllByText('REJECTED AT GATE');
      expect(rejectedBadges.length).toBeGreaterThanOrEqual(1);
    });

    // Reporter displays NOT EXECUTED
    expect(screen.getByText('NOT EXECUTED')).toBeInTheDocument();

    // Clicking Verifier Agent displays Human Governance Rejection info
    fireEvent.click(screen.getByRole('heading', { name: 'Verification Agent' }));

    await waitFor(() => {
      expect(screen.getByText('HUMAN-IN-THE-LOOP GOVERNANCE REJECTION')).toBeInTheDocument();
      expect(screen.getAllByText('Data sources unverified - abort').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Verification Model Execution Bypassed/i)).toBeInTheDocument();
    });

    // Clicking Reporter displays Not Executed information
    fireEvent.click(screen.getByRole('heading', { name: 'Reporter Agent' }));

    await waitFor(() => {
      expect(screen.getByText('Agent Not Executed')).toBeInTheDocument();
      expect(screen.getByText(/bypassed and never executed because workflow progression was halted/i)).toBeInTheDocument();
    });
  });
});
