import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  GitBranch,
  Search,
  Brain,
  ShieldCheck,
  FileText,
  Clock,
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
        return <GitBranch className="w-4 h-4 text-[#8B7CFF]" />;
      case 'Search':
        return <Search className="w-4 h-4 text-[#55C7D9]" />;
      case 'Brain':
        return <Brain className="w-4 h-4 text-[#8B7CFF]" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-4 h-4 text-[#36B98A]" />;
      case 'FileText':
        return <FileText className="w-4 h-4 text-[#E6AA57]" />;
      default:
        return <Terminal className="w-4 h-4 text-[#9CA3AF]" />;
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
      className={`w-64 rounded-lg bg-[#151922] border transition-all text-left relative p-3 shadow-card ${
        nodeData.status === 'active'
          ? 'border-[#8B7CFF] ring-1 ring-[#8B7CFF]/30 shadow-subtle'
          : 'border-[#252B36] hover:border-[#343C4B]'
      }`}
    >
      {/* Target handle on left */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-[#252B36] hover:!bg-[#8B7CFF] !border !border-[#0B0D12]"
      />

      {/* Header: Icon + Title + Status */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#252B36]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded bg-[#11141B] border border-[#252B36] flex items-center justify-center shrink-0">
            {renderIcon()}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-[#E5E7EB] truncate">{nodeData.title}</h4>
            <p className="text-[10px] text-[#9CA3AF] font-mono truncate">{nodeData.role}</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Description */}
      <p className="text-[11px] text-[#9CA3AF] leading-relaxed mb-2 line-clamp-2">
        {nodeData.description}
      </p>

      {/* Execution Details & Metadata */}
      <div className="pt-2 border-t border-[#252B36]/60 space-y-1 text-[10px] font-mono text-[#9CA3AF]">
        <div className="flex items-center justify-between">
          <span>Task:</span>
          <span className="text-[#E5E7EB] truncate max-w-[140px]">
            {nodeData.currentTask || 'Idle / Awaiting DAG'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-[#9CA3AF]/60" />
            Duration:
          </span>
          <span className="text-[#E5E7EB]">{nodeData.duration || '—'}</span>
        </div>
        {nodeData.latestOutput && (
          <div className="pt-1 text-[#55C7D9] truncate">
            &gt; {nodeData.latestOutput}
          </div>
        )}
      </div>

      {/* Source handle on right */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-[#252B36] hover:!bg-[#55C7D9] !border !border-[#0B0D12]"
      />
    </div>
  );
});

AgentNode.displayName = 'AgentNode';
