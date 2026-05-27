import { cn } from "../lib/utils";
import type { DAGNode } from "../types";
import { Database, Filter, Download, Radio, Workflow } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  nodes: DAGNode[];
  failedNode?: string | null;
  orientation?: "vertical" | "horizontal";
  compact?: boolean;
}

const ICONS: Record<string, ReactNode> = {
  sensor: <Radio className="w-3.5 h-3.5" />,
  ingest: <Download className="w-3.5 h-3.5" />,
  transform: <Filter className="w-3.5 h-3.5" />,
  load: <Database className="w-3.5 h-3.5" />,
};

const TYPE_STYLES: Record<string, string> = {
  sensor: "bg-blue-50 text-blue-600 border-blue-100",
  ingest: "bg-blue-50 text-blue-600 border-blue-100",
  transform: "bg-purple-50 text-purple-600 border-purple-100",
  load: "bg-emerald-50 text-emerald-600 border-emerald-100",
};

export function PipelineDAG({
  nodes = [],
  failedNode,
  orientation = "horizontal",
  compact = false,
}: Props) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="relative flex flex-col items-center justify-center py-12 grid-backdrop rounded-lg border border-dashed border-[#E5E7EB]">
        <Workflow className="w-8 h-8 text-[#E5E7EB] mb-2" />
        <p className="text-xs text-[#9CA3AF] italic">
          No architecture metadata available for this pipeline.
        </p>
      </div>
    );
  }

  if (orientation === "vertical") {
    return (
      <div className="relative flex flex-col gap-7 items-center py-8 grid-backdrop rounded-lg border border-dashed border-[#E5E7EB]">
        {nodes.map((node, idx) => (
          <div key={node.id} className="relative flex flex-col items-center">
            <NodeCard
              node={node}
              failed={failedNode === node.name}
              compact={compact}
            />
            {idx < nodes.length - 1 && (
              <div className="dag-line w-px h-7 mt-1" />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative grid-backdrop rounded-lg border border-dashed border-[#E5E7EB] py-10 px-6 overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max">
        {nodes.map((node, idx) => (
          <div key={node.id} className="flex items-center gap-2">
            <NodeCard
              node={node}
              failed={failedNode === node.name}
              compact={compact}
            />
            {idx < nodes.length - 1 && (
              <div className="flex items-center gap-1">
                <div
                  className="dag-line w-8 h-px"
                  style={{
                    background: "none",
                    borderTop: "1px dashed #D1D5DB",
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NodeCard({
  node,
  failed,
  compact,
}: {
  node: DAGNode;
  failed: boolean;
  compact: boolean;
}) {
  return (
    <div
      className={cn(
        "bg-white border rounded-md shadow-sm transition-all relative",
        compact ? "p-2.5 w-48" : "p-3.5 w-56",
        failed
          ? "border-red-300 ring-2 ring-red-100"
          : "border-[#E5E7EB] hover:border-gray-300",
      )}
    >
      {failed && (
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-red-500 ring-2 ring-white" />
      )}
      <div className="flex items-center justify-between mb-2">
        <span
          className={cn(
            "text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-[0.12em] border inline-flex items-center gap-1",
            TYPE_STYLES[node.type] || TYPE_STYLES.transform,
          )}
        >
          {ICONS[node.type]}
          {node.type}
        </span>
        <div
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            failed ? "bg-red-500" : "bg-emerald-500",
          )}
        />
      </div>
      <h6
        className={cn(
          "font-bold text-[#111827] truncate",
          compact ? "text-[11px]" : "text-xs",
        )}
      >
        {node.name}
      </h6>
      {!compact && node.avg_runtime_sec != null && (
        <p className="text-[9px] text-[#9CA3AF] font-mono mt-1">
          ~{node.avg_runtime_sec}s avg
        </p>
      )}
    </div>
  );
}
