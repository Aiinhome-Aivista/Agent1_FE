import { Link } from 'react-router-dom';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { PipelineStatusBadge } from './Badges';
import type { Pipeline } from '../types';

interface Props {
  title: string;
  icon: LucideIcon;
  pipelines: Pipeline[];
  empty: string;
  accent: 'rose' | 'cyan' | 'lime';
}

export function PipelineList({ title, icon: Icon, pipelines, empty, accent }: Props) {
  const accentColor = {
    rose: 'text-red-500',
    cyan: 'text-app-brand',
    lime: 'text-emerald-500',
  }[accent];

  return (
    <div className="bg-app-surface border border-app-border rounded-lg overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-app-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} className={accentColor} />
          <h4 className="text-sm font-semibold text-app-primary">{title}</h4>
        </div>
        <Link to="/app/pipelines" className="text-[10px] uppercase font-bold tracking-wider text-[#9CA3AF] hover:text-app-primary flex items-center gap-1 transition-colors">
          all pipelines <ArrowRight size={10} />
        </Link>
      </div>
      <div className="flex-1 divide-y divide-[#F3F4F6]">
        {pipelines.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#9CA3AF] italic">{empty}</div>
        ) : (
          pipelines.map((p) => (
            <Link 
              key={p.id} 
              to={`/app/pipelines/${p.id}`}
              className="px-6 py-4 flex items-center justify-between hover:bg-app-bg transition-colors group"
            >
              <div>
                <h5 className="text-sm font-medium text-app-primary group-hover:text-app-brand transition-colors">{p.name}</h5>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">last run {p.last_run}</p>
              </div>
              <PipelineStatusBadge status={p.last_run_status || p.status} />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
