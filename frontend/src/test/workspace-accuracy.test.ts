import { describe, it, expect } from 'vitest';
import type { AgentRunBrief } from '../types';
import {
  groupRunsIntoAttempts,
  deriveTimelineExecutionStates,
  extractRejectionReason,
  isHitlRejectionRun,
  HITL_REJECTION_PREFIX,
} from '../pages/AgentWorkspacePage';

const MOCK_FIVE_AGENTS = [
  { id: 'planner', name: 'Planner Agent', dbName: 'Planner Agent', role: 'Strategy', order: 1 },
  { id: 'researcher', name: 'Research Agent', dbName: 'Research Agent', role: 'RAG', order: 2 },
  { id: 'analyst', name: 'Analysis Agent', dbName: 'Analysis Agent', role: 'Synthesis', order: 3 },
  { id: 'verifier', name: 'Verification Agent', dbName: 'Verification Agent', role: 'Audit', order: 4 },
  { id: 'reporter', name: 'Reporter Agent', dbName: 'Reporter Agent', role: 'Report', order: 5 },
];

describe('ORCHESTRA AI — Phase 4.3.1 Agent Workspace Accuracy Suite', () => {
  // --------------------------------------------------------------------------
  // Test 1 — Successful retry
  // --------------------------------------------------------------------------
  it('Test 1 — Successful retry: selects latest attempt, Reporter completed, history preserved', () => {
    const rawRuns: AgentRunBrief[] = [
      // Attempt 1: 5 agents, Reporter fails on timeout
      {
        id: 'run-1-1',
        agent_name: 'Planner Agent',
        status: 'completed',
        execution_time_ms: 12000,
        started_at: '2026-11-01T08:11:57Z',
        completed_at: '2026-11-01T08:12:09Z',
        output_data: 'Plan 1',
      },
      {
        id: 'run-1-2',
        agent_name: 'Research Agent',
        status: 'completed',
        execution_time_ms: 42000,
        started_at: '2026-11-01T08:12:09Z',
        completed_at: '2026-11-01T08:12:51Z',
        output_data: 'Research 1',
      },
      {
        id: 'run-1-3',
        agent_name: 'Analysis Agent',
        status: 'completed',
        execution_time_ms: 27000,
        started_at: '2026-11-01T08:12:51Z',
        completed_at: '2026-11-01T08:13:18Z',
        output_data: 'Analysis 1',
      },
      {
        id: 'run-1-4',
        agent_name: 'Verification Agent',
        status: 'completed',
        execution_time_ms: 45000,
        started_at: '2026-11-01T08:13:19Z',
        completed_at: '2026-11-01T08:14:04Z',
        output_data: 'Verified 1',
      },
      {
        id: 'run-1-5',
        agent_name: 'Reporter Agent',
        status: 'failed',
        execution_time_ms: 66200,
        started_at: '2026-11-01T08:14:04Z',
        completed_at: '2026-11-01T08:15:10Z',
        output_data: 'FAILED: Inference request timed out after 60.0s.',
      },
      // Attempt 2: 5 agents, Reporter completed successfully
      {
        id: 'run-2-1',
        agent_name: 'Planner Agent',
        status: 'completed',
        execution_time_ms: 13000,
        started_at: '2026-11-01T08:16:02Z',
        completed_at: '2026-11-01T08:16:15Z',
        output_data: 'Plan 2',
      },
      {
        id: 'run-2-2',
        agent_name: 'Research Agent',
        status: 'completed',
        execution_time_ms: 38000,
        started_at: '2026-11-01T08:16:15Z',
        completed_at: '2026-11-01T08:16:53Z',
        output_data: 'Research 2',
      },
      {
        id: 'run-2-3',
        agent_name: 'Analysis Agent',
        status: 'completed',
        execution_time_ms: 32000,
        started_at: '2026-11-01T08:16:53Z',
        completed_at: '2026-11-01T08:17:25Z',
        output_data: 'Analysis 2',
      },
      {
        id: 'run-2-4',
        agent_name: 'Verification Agent',
        status: 'completed',
        execution_time_ms: 43000,
        started_at: '2026-11-01T08:17:26Z',
        completed_at: '2026-11-01T08:18:09Z',
        output_data: 'Verified 2',
      },
      {
        id: 'run-2-5',
        agent_name: 'Reporter Agent',
        status: 'completed',
        execution_time_ms: 68156,
        started_at: '2026-11-01T08:18:10Z',
        completed_at: '2026-11-01T08:19:18Z',
        output_data: '# Final Executive Report: NVIDIA Analysis',
      },
    ];

    const attempts = groupRunsIntoAttempts(rawRuns, 'completed');
    expect(attempts).toHaveLength(2);

    // Attempt 1 check
    expect(attempts[0].attemptNumber).toBe(1);
    expect(attempts[0].isLatest).toBe(false);
    expect(attempts[0].status).toBe('failed');
    expect(attempts[0].runs).toHaveLength(5);
    expect(attempts[0].runs[4].status).toBe('failed');

    // Attempt 2 check
    expect(attempts[1].attemptNumber).toBe(2);
    expect(attempts[1].isLatest).toBe(true);
    expect(attempts[1].status).toBe('completed');
    expect(attempts[1].runs).toHaveLength(5);
    expect(attempts[1].runs[4].status).toBe('completed');

    // Timeline derivation strictly scopes to Attempt 2
    const timeline = deriveTimelineExecutionStates(MOCK_FIVE_AGENTS, attempts[1], 'completed');
    expect(timeline).toHaveLength(5);

    // Every node in timeline is from Attempt 2
    timeline.forEach((node) => {
      expect(node.status).toBe('completed');
      expect(node.run?.id).toMatch(/^run-2-/);
    });

    const reporterNode = timeline.find((n) => n.meta.id === 'reporter');
    expect(reporterNode?.status).toBe('completed');
    expect(reporterNode?.run?.id).toBe('run-2-5');
    expect(reporterNode?.outputData).toContain('Final Executive Report');
  });

  // --------------------------------------------------------------------------
  // Test 2 — Failed latest attempt
  // --------------------------------------------------------------------------
  it('Test 2 — Failed latest attempt: shows Attempt 2 with Verifier FAILED, earlier successful run in history', () => {
    const rawRuns: AgentRunBrief[] = [
      // Attempt 1: all 5 completed
      { id: 'run-1-1', agent_name: 'Planner Agent', status: 'completed', started_at: '2026-11-01T07:00:00Z' },
      { id: 'run-1-2', agent_name: 'Research Agent', status: 'completed', started_at: '2026-11-01T07:01:00Z' },
      { id: 'run-1-3', agent_name: 'Analysis Agent', status: 'completed', started_at: '2026-11-01T07:02:00Z' },
      { id: 'run-1-4', agent_name: 'Verification Agent', status: 'completed', started_at: '2026-11-01T07:03:00Z' },
      { id: 'run-1-5', agent_name: 'Reporter Agent', status: 'completed', started_at: '2026-11-01T07:04:00Z' },

      // Attempt 2 (re-execution): fails at Verifier
      { id: 'run-2-1', agent_name: 'Planner Agent', status: 'completed', started_at: '2026-11-01T07:10:00Z' },
      { id: 'run-2-2', agent_name: 'Research Agent', status: 'completed', started_at: '2026-11-01T07:11:00Z' },
      { id: 'run-2-3', agent_name: 'Analysis Agent', status: 'completed', started_at: '2026-11-01T07:12:00Z' },
      {
        id: 'run-2-4',
        agent_name: 'Verification Agent',
        status: 'failed',
        execution_time_ms: 15400,
        started_at: '2026-11-01T07:13:00Z',
        completed_at: '2026-11-01T07:13:15Z',
        output_data: 'Verification model assertion failed.',
      },
    ];

    const attempts = groupRunsIntoAttempts(rawRuns, 'failed');
    expect(attempts).toHaveLength(2);

    expect(attempts[0].isLatest).toBe(false);
    expect(attempts[0].status).toBe('completed');
    expect(attempts[0].runs).toHaveLength(5);

    expect(attempts[1].isLatest).toBe(true);
    expect(attempts[1].status).toBe('failed');
    expect(attempts[1].runs).toHaveLength(4);

    const timeline = deriveTimelineExecutionStates(MOCK_FIVE_AGENTS, attempts[1], 'failed');
    const verifierNode = timeline.find((n) => n.meta.id === 'verifier');
    expect(verifierNode?.status).toBe('failed');
    expect(verifierNode?.run?.id).toBe('run-2-4');

    const reporterNode = timeline.find((n) => n.meta.id === 'reporter');
    expect(reporterNode?.status).toBe('waiting');
  });

  // --------------------------------------------------------------------------
  // Test 3 — HITL rejection
  // --------------------------------------------------------------------------
  it('Test 3 — HITL rejection: displays REJECTED AT GATE, extracts reason, Reporter NOT EXECUTED', () => {
    const rejectionReason = 'Source documentation lacks Q3 10-Q filing';
    const rawRuns: AgentRunBrief[] = [
      {
        id: 'run-3-1',
        agent_name: 'Planner Agent',
        status: 'completed',
        execution_time_ms: 16000,
        started_at: '2026-11-01T08:24:12Z',
      },
      {
        id: 'run-3-2',
        agent_name: 'Research Agent',
        status: 'completed',
        execution_time_ms: 23000,
        started_at: '2026-11-01T08:24:28Z',
      },
      {
        id: 'run-3-3',
        agent_name: 'Analysis Agent',
        status: 'completed',
        execution_time_ms: 28000,
        started_at: '2026-11-01T08:24:52Z',
      },
      {
        id: 'run-3-4',
        agent_name: 'Verification Agent',
        status: 'failed',
        execution_time_ms: 0,
        started_at: '2026-11-01T08:25:31Z',
        completed_at: '2026-11-01T08:25:31Z',
        output_data: `${HITL_REJECTION_PREFIX}. Reason: ${rejectionReason}`,
      },
      // Reporter has no record
    ];

    expect(isHitlRejectionRun(rawRuns[3])).toBe(true);
    expect(extractRejectionReason(rawRuns[3].output_data)).toBe(rejectionReason);

    const attempts = groupRunsIntoAttempts(rawRuns, 'failed');
    expect(attempts).toHaveLength(1);
    expect(attempts[0].status).toBe('rejected');
    expect(attempts[0].rejectionReason).toBe(rejectionReason);

    const timeline = deriveTimelineExecutionStates(MOCK_FIVE_AGENTS, attempts[0], 'failed');

    const plannerNode = timeline.find((n) => n.meta.id === 'planner');
    expect(plannerNode?.status).toBe('completed');

    const researcherNode = timeline.find((n) => n.meta.id === 'researcher');
    expect(researcherNode?.status).toBe('completed');

    const analystNode = timeline.find((n) => n.meta.id === 'analyst');
    expect(analystNode?.status).toBe('completed');

    const verifierNode = timeline.find((n) => n.meta.id === 'verifier');
    expect(verifierNode?.status).toBe('rejected_at_gate');
    expect(verifierNode?.durationMs).toBe(0);

    const reporterNode = timeline.find((n) => n.meta.id === 'reporter');
    expect(reporterNode?.status).toBe('not_executed');
  });

  // --------------------------------------------------------------------------
  // Test 4 — Partial execution history
  // --------------------------------------------------------------------------
  it('Test 4 — Partial execution history: groups 3 and 4 records without assuming fixed 5 records', () => {
    const rawRuns: AgentRunBrief[] = [
      // Attempt 1: 3 records (crashed or interrupted at Analyst)
      { id: 'p1', agent_name: 'Planner Agent', status: 'completed', started_at: '2026-11-01T06:00:00Z' },
      { id: 'r1', agent_name: 'Research Agent', status: 'completed', started_at: '2026-11-01T06:01:00Z' },
      { id: 'a1', agent_name: 'Analysis Agent', status: 'failed', started_at: '2026-11-01T06:02:00Z' },

      // Attempt 2: 4 records (re-run, reached Verifier rejection marker)
      { id: 'p2', agent_name: 'Planner Agent', status: 'completed', started_at: '2026-11-01T06:10:00Z' },
      { id: 'r2', agent_name: 'Research Agent', status: 'completed', started_at: '2026-11-01T06:11:00Z' },
      { id: 'a2', agent_name: 'Analysis Agent', status: 'completed', started_at: '2026-11-01T06:12:00Z' },
      {
        id: 'v2',
        agent_name: 'Verification Agent',
        status: 'failed',
        execution_time_ms: 0,
        started_at: '2026-11-01T06:13:00Z',
        output_data: `${HITL_REJECTION_PREFIX}. Reason: Budget exceeded`,
      },
    ];

    const attempts = groupRunsIntoAttempts(rawRuns, 'failed');
    expect(attempts).toHaveLength(2);

    expect(attempts[0].attemptNumber).toBe(1);
    expect(attempts[0].runs).toHaveLength(3);
    expect(attempts[0].status).toBe('failed');
    expect(attempts[0].runs.map((r) => r.id)).toEqual(['p1', 'r1', 'a1']);

    expect(attempts[1].attemptNumber).toBe(2);
    expect(attempts[1].runs).toHaveLength(4);
    expect(attempts[1].status).toBe('rejected');
    expect(attempts[1].rejectionReason).toBe('Budget exceeded');
    expect(attempts[1].runs.map((r) => r.id)).toEqual(['p2', 'r2', 'a2', 'v2']);
  });

  // --------------------------------------------------------------------------
  // Test 5 — Normal single attempt
  // --------------------------------------------------------------------------
  it('Test 5 — Normal single attempt: preserves existing 5-agent timeline and outputs', () => {
    const rawRuns: AgentRunBrief[] = [
      { id: 'p', agent_name: 'Planner Agent', status: 'completed', execution_time_ms: 11000, started_at: '2026-11-01T09:00:00Z', output_data: 'Plan data' },
      { id: 'r', agent_name: 'Research Agent', status: 'completed', execution_time_ms: 22000, started_at: '2026-11-01T09:00:11Z', output_data: 'Research data' },
      { id: 'a', agent_name: 'Analysis Agent', status: 'completed', execution_time_ms: 33000, started_at: '2026-11-01T09:00:33Z', output_data: 'Analysis data' },
      { id: 'v', agent_name: 'Verification Agent', status: 'completed', execution_time_ms: 44000, started_at: '2026-11-01T09:01:06Z', output_data: 'Verification data' },
      { id: 'rep', agent_name: 'Reporter Agent', status: 'completed', execution_time_ms: 55000, started_at: '2026-11-01T09:01:50Z', output_data: 'Executive report content' },
    ];

    const attempts = groupRunsIntoAttempts(rawRuns, 'completed');
    expect(attempts).toHaveLength(1);
    expect(attempts[0].attemptNumber).toBe(1);
    expect(attempts[0].isLatest).toBe(true);
    expect(attempts[0].status).toBe('completed');
    expect(attempts[0].runs).toHaveLength(5);

    const timeline = deriveTimelineExecutionStates(MOCK_FIVE_AGENTS, attempts[0], 'completed');
    expect(timeline).toHaveLength(5);

    timeline.forEach((node) => {
      expect(node.status).toBe('completed');
      expect(node.run).toBeDefined();
      expect(node.outputData).toBeTruthy();
    });
  });
});
