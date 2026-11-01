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
          color: '#818CF8',
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
          color: '#38BDF8',
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
          color: '#818CF8',
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
          color: '#34D399',
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
          color: '#FBBF24',
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
          stroke: activeNodeId === 'node-planner' ? '#818CF8' : '#1E2330',
          strokeWidth: 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: activeNodeId === 'node-planner' ? '#818CF8' : '#2D3447',
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
          stroke: activeNodeId === 'node-researcher' ? '#38BDF8' : '#1E2330',
          strokeWidth: 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: activeNodeId === 'node-researcher' ? '#38BDF8' : '#2D3447',
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
          stroke: activeNodeId === 'node-analyst' ? '#818CF8' : '#1E2330',
          strokeWidth: 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: activeNodeId === 'node-analyst' ? '#818CF8' : '#2D3447',
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
          stroke: activeNodeId === 'node-verifier' ? '#34D399' : '#1E2330',
          strokeWidth: 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: activeNodeId === 'node-verifier' ? '#34D399' : '#2D3447',
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
      className="w-full rounded-xl bg-[#08090C] border border-[#1E2330] relative overflow-hidden shadow-inner"
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
          color="#161A24"
        />
        <Controls
          showInteractive={false}
          className="!bottom-3 !right-3"
        />
      </ReactFlow>
    </div>
  );
};
