import { Database, GitBranch, Workflow, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

const CONFIG: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  ADF:        { icon: Workflow,  color: 'text-sky-600',   label: 'Azure Data Factory' },
  DATABRICKS: { icon: Database,  color: 'text-amber-600', label: 'Databricks' },
  GIT:        { icon: GitBranch, color: 'text-violet-600', label: 'Git' },
};

interface Props {
  type: string;
  size?: number;
  className?: string;
  withLabel?: boolean;
}

export function ConnectorIcon({ type, size = 16, className, withLabel = false }: Props) {
  const conf = CONFIG[type.toUpperCase()] || CONFIG.ADF;
  const Icon = conf.icon;
  
  return (
    <span className={cn("inline-flex items-center gap-2 align-middle", className)}>
      <Icon size={size} className={conf.color} strokeWidth={2.25} />
      {withLabel && <span className="font-mono text-xs text-app-secondary">{conf.label}</span>}
    </span>
  );
}
