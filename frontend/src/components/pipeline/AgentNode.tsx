import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  GitBranch,
  Search,
  Brain,
  ShieldCheck,
  FileText,
  Terminal,
} from 'lucide-react';
import { Badge } from '../ui/Badge';

export interface AgentNodeData {
  title: string;
  role: string;
  description: string;
  status: 'ready' | 'active' | 'completed' | 'idle';
  color: string;
  iconName: string;
  currentTask?: string;
  duration?: string;
  latestOutput?: string;
}

export const AgentNode = memo(({ data }: NodeProps) => {
  const nodeData = data as unknown as AgentNodeData;

  const renderIcon = () => {
    switch (nodeData.iconName) {
      case 'GitBranch':
        return <GitBranch className="w-4 h-4 text-[#818CF8]" />;
      case 'Search':
        return <Search className="w-4 h-4 text-[#38BDF8]" />;
      case 'Brain':
        return <Brain className="w-4 h-4 text-[#818CF8]" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-4 h-4 text-[#34D399]" />;
      case 'FileText':
        return <FileText className="w-4 h-4 text-[#FBBF24]" />;
      default:
        return <Terminal className="w-4 h-4 text-[#949BA8]" />;
    }
  };

  const getStatusBadge = () => {
    switch (nodeData.status) {
      case 'active':
        return (
          <Badge variant="cyan" pulse>
            Active
          </Badge>
        );
      case 'completed':
        return <Badge variant="success">Done</Badge>;
      case 'ready':
        return <Badge variant="success">Ready</Badge>;
      default:
        return <Badge variant="neutral">Idle</Badge>;
    }
  };

  return (
    <div
      className={`w-64 rounded-xl bg-[#11141D] border transition-all duration-200 text-left relative p-3.5 shadow-card ${
        nodeData.status === 'active'
          ? 'border-[#0E5B59] ring-1 ring-[#0E5B59]/50 shadow-glow bg-[#151924]'
          : 'border-[#1E2330] hover:border-[#2D3447]'
      }`}
    >
      {/* Target handle on left */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-[#1E2330] hover:!bg-[#0E5B59] !border !border-[#08090C]"
      />

      {/* Header: Icon + Title + Status */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1E2330]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#090B10] border border-[#1E2330] flex items-center justify-center shrink-0 shadow-inner">
            {renderIcon()}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-[#EDEDEF] truncate">{nodeData.title}</h4>
            <p className="text-[10px] text-[#949BA8] font-mono truncate">{nodeData.role}</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Description */}
      <p className="text-[11px] text-[#949BA8] leading-relaxed mb-2.5 line-clamp-2">
        {nodeData.description}
      </p>

      {/* Execution Details & Metadata */}
      <div className="pt-2 border-t border-[#1E2330]/70 space-y-1 text-[10px] font-mono text-[#949BA8]">
        <div className="flex items-center justify-between">
          <span>Task:</span>
          <span className="text-[#EDEDEF] truncate max-w-[140px]">
            {nodeData.currentTask || 'Awaiting assignment'}
          </span>
        </div>
        {nodeData.duration && (
          <div className="flex items-center justify-between">
            <span>Duration:</span>
            <span className="text-[#38BDF8]">{nodeData.duration}</span>
          </div>
        )}
      </div>

      {/* Source handle on right */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-[#1E2330] hover:!bg-[#0E5B59] !border !border-[#08090C]"
      />
    </div>
  );
});
