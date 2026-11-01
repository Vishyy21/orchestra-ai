import React, { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MarkerType,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AgentNode, type AgentNodeData } from './AgentNode';

const nodeTypes = {
  agentNode: AgentNode,
};

interface OrchestrationFlowProps {
  height?: string;
  activeNodeId?: string | null;
  agentStates?: Record<string, Partial<AgentNodeData>>;
}

export const OrchestrationFlow: React.FC<OrchestrationFlowProps> = ({
  height = '360px',
  activeNodeId = null,
  agentStates = {},
}) => {
  const initialNodes: Node[] = useMemo(
    () => [
      {
        id: 'node-planner',
        type: 'agentNode',
        position: { x: 20, y: 70 },
        data: {
          title: 'Planner Agent',
          role: 'DAG Synthesis & Decomposition',
          description: 'Decomposes complex requests into parallel subtasks and execution DAG.',
          status: activeNodeId === 'node-planner' ? 'active' : 'ready',
          color: '#8B7CFF',
          iconName: 'GitBranch',
          currentTask: agentStates['planner']?.currentTask,
          duration: agentStates['planner']?.duration,
          latestOutput: agentStates['planner']?.latestOutput,
        },
      },
      {
        id: 'node-researcher',
        type: 'agentNode',
        position: { x: 310, y: 70 },
        data: {
          title: 'Research Agent',
          role: 'Tavily Web & Local RAG Search',
          description: 'Fetches live web intelligence and queries embedded document collections.',
          status: activeNodeId === 'node-researcher' ? 'active' : 'ready',
          color: '#55C7D9',
          iconName: 'Search',
          currentTask: agentStates['researcher']?.currentTask,
          duration: agentStates['researcher']?.duration,
          latestOutput: agentStates['researcher']?.latestOutput,
        },
      },
      {
        id: 'node-analyst',
        type: 'agentNode',
        position: { x: 600, y: 70 },
        data: {
          title: 'Analysis Agent',
          role: 'Synthesis & Code Computation',
          description: 'Evaluates research artifacts, computes solutions, and synthesizes data.',
          status: activeNodeId === 'node-analyst' ? 'active' : 'ready',
          color: '#8B7CFF',
          iconName: 'Brain',
          currentTask: agentStates['analyst']?.currentTask,
          duration: agentStates['analyst']?.duration,
          latestOutput: agentStates['analyst']?.latestOutput,
        },
      },
      {
        id: 'node-verifier',
        type: 'agentNode',
        position: { x: 890, y: 70 },
        data: {
          title: 'Verification Agent',
          role: 'Fact-Check & HITL Guardrails',
          description: 'Validates safety policies, cross-checks citations, and gates human approvals.',
          status: activeNodeId === 'node-verifier' ? 'active' : 'ready',
          color: '#36B98A',
          iconName: 'ShieldCheck',
          currentTask: agentStates['verifier']?.currentTask,
          duration: agentStates['verifier']?.duration,
          latestOutput: agentStates['verifier']?.latestOutput,
        },
      },
      {
        id: 'node-reporter',
        type: 'agentNode',
        position: { x: 1180, y: 70 },
        data: {
          title: 'Reporter Agent',
          role: 'Structured Markdown Compiler',
          description: 'Assembles verified multi-agent insights into polished executive reports.',
          status: activeNodeId === 'node-reporter' ? 'active' : 'ready',
          color: '#E6AA57',
          iconName: 'FileText',
          currentTask: agentStates['reporter']?.currentTask,
          duration: agentStates['reporter']?.duration,
          latestOutput: agentStates['reporter']?.latestOutput,
        },
      },
    ],
    [activeNodeId, agentStates]
  );

  const initialEdges: Edge[] = useMemo(
    () => [
      {
        id: 'e-planner-researcher',
        source: 'node-planner',
        target: 'node-researcher',
        animated: activeNodeId === 'node-planner' || activeNodeId === 'node-researcher',
        style: {
          stroke: activeNodeId === 'node-planner' ? '#8B7CFF' : '#252B36',
          strokeWidth: 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: activeNodeId === 'node-planner' ? '#8B7CFF' : '#343C4B',
          width: 14,
          height: 14,
        },
      },
      {
        id: 'e-researcher-analyst',
        source: 'node-researcher',
        target: 'node-analyst',
        animated: activeNodeId === 'node-researcher' || activeNodeId === 'node-analyst',
        style: {
          stroke: activeNodeId === 'node-researcher' ? '#55C7D9' : '#252B36',
          strokeWidth: 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: activeNodeId === 'node-researcher' ? '#55C7D9' : '#343C4B',
          width: 14,
          height: 14,
        },
      },
      {
        id: 'e-analyst-verifier',
        source: 'node-analyst',
        target: 'node-verifier',
        animated: activeNodeId === 'node-analyst' || activeNodeId === 'node-verifier',
        style: {
          stroke: activeNodeId === 'node-analyst' ? '#8B7CFF' : '#252B36',
          strokeWidth: 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: activeNodeId === 'node-analyst' ? '#8B7CFF' : '#343C4B',
          width: 14,
          height: 14,
        },
      },
      {
        id: 'e-verifier-reporter',
        source: 'node-verifier',
        target: 'node-reporter',
        animated: activeNodeId === 'node-verifier' || activeNodeId === 'node-reporter',
        style: {
          stroke: activeNodeId === 'node-verifier' ? '#36B98A' : '#252B36',
          strokeWidth: 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: activeNodeId === 'node-verifier' ? '#36B98A' : '#343C4B',
          width: 14,
          height: 14,
        },
      },
    ],
    [activeNodeId]
  );

  return (
    <div
      style={{ height }}
      className="w-full rounded-lg bg-[#0B0D12] border border-[#252B36] relative overflow-hidden"
    >
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1}
          color="#1D222B"
        />
        <Controls
          showInteractive={false}
          className="!bottom-3 !right-3"
        />
      </ReactFlow>
    </div>
  );
};
