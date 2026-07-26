import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

/* ============================================================
   PREMIUM MOBILE-FIRST DASHBOARD PRIMITIVES
   ============================================================ */

export const hasError = (block: any): block is { error: string } =>
  block && typeof block === "object" && "error" in block && Object.keys(block).length <= 2;

export function fmtNum(n: unknown, digits = 1): string {
  if (typeof n !== "number" || !isFinite(n)) return "N/A";
  return n.toFixed(digits);
}

export function fmtUptime(hours: unknown): string {
  if (typeof hours !== "number" || !isFinite(hours)) return "N/A";
  return `${hours.toLocaleString(undefined, { maximumFractionDigits: 1 })}h`;
}

export function fmtUptimeFromSeconds(s: unknown): string {
  if (typeof s !== "number" || !isFinite(s) || s < 0) return "N/A";
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function memColorClass(mb: number): string {
  if (mb > 200) return "text-red-400";
  if (mb > 100) return "text-amber-400";
  return "text-slate-100";
}

export const colorForPercent = (p: number) =>
  p >= 85 ? "bg-red-500" : p >= 70 ? "bg-yellow-500" : "bg-emerald-500";

/** Bar class based on percentage — used for animated progress bars */
export function barClassForPercent(p: number): string {
  if (p >= 85) return "bar-fill bar-fill-danger";
  if (p >= 70) return "bar-fill bar-fill-warn";
  return "bar-fill bar-fill-success";
}

/** Animated numeric counter with smooth transitions */
export function AnimatedValue({
  value,
  suffix = "",
  prefix = "",
  digits = 0,
  className = "",
}: {
  value: number | null | undefined;
  suffix?: string;
  prefix?: string;
  digits?: number;
  className?: string;
}) {
  const display = typeof value === "number" && isFinite(value)
    ? `${prefix}${value.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })}${suffix}`
    : "—";
  return <span className={`tabular-nums ${className}`}>{display}</span>;
}

/** Glass card with press feedback */
export function GlassCard({
  children,
  className = "",
  pressable = false,
  onClick,
  testId,
}: {
  children: ReactNode;
  className?: string;
  pressable?: boolean;
  onClick?: () => void;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      onClick={onClick}
      className={`glass-card ${pressable ? "glass-card-pressable cursor-pointer" : ""} p-4 ${className}`}
    >
      {children}
    </div>
  );
}

/** Resource tile for the 2×2 grid (CPU, Memory, Disk, Network) */
export function ResourceTile({
  Icon,
  label,
  valueNode,
  percent,
  subNode,
  accent = "violet",
  spark,
  testId,
}: {
  Icon: LucideIcon;
  label: string;
  valueNode: ReactNode;
  percent?: number | null;
  subNode?: ReactNode;
  accent?: "violet" | "blue" | "amber" | "cyan";
  spark?: ReactNode;
  testId?: string;
}) {
  const accentMap: Record<string, string> = {
    violet: "text-violet-400",
    blue: "text-blue-400",
    amber: "text-amber-400",
    cyan: "text-cyan-400",
  };
  const p = typeof percent === "number" && isFinite(percent) ? Math.max(0, Math.min(100, percent)) : null;
  return (
    <GlassCard testId={testId} className="!p-3.5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${accentMap[accent]}`} aria-hidden="true" />
          <span className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">{label}</span>
        </div>
      </div>
      <div className="text-[26px] font-bold leading-none text-white tracking-tight">{valueNode}</div>
      {p !== null && (
        <div className="bar-track mt-0.5">
          <div className={barClassForPercent(p)} style={{ width: `${p}%` }} />
        </div>
      )}
      {spark}
      {subNode && <div className="text-[11px] text-slate-400 leading-tight">{subNode}</div>}
    </GlassCard>
  );
}

/** Stat chip — used for docker summary counts */
export function StatChip({
  label,
  value,
  tone = "neutral",
  Icon,
  testId,
}: {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "violet";
  Icon?: LucideIcon;
  testId?: string;
}) {
  const toneMap: Record<string, string> = {
    neutral: "text-slate-200",
    success: "text-emerald-400",
    warning: "text-amber-400",
    danger: "text-red-400",
    violet: "text-violet-300",
  };
  return (
    <div data-testid={testId} className="stat-chip flex-1 min-w-0">
      {Icon && <Icon className={`h-4 w-4 shrink-0 ${toneMap[tone]}`} aria-hidden="true" />}
      <div className="min-w-0">
        <div className={`text-lg font-bold leading-none ${toneMap[tone]}`}>{value}</div>
        <div className="text-[10px] uppercase tracking-wide text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

/** Expandable mobile card — used for PM2 process rows */
export function ExpandableCard({
  title,
  status,
  subtitle,
  children,
  defaultOpen = false,
  accent = "violet",
  testId,
}: {
  title: string;
  status?: { label: string; tone: "success" | "danger" | "warning" | "neutral" };
  subtitle?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  accent?: "violet" | "blue" | "amber" | "cyan";
  testId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toneMap: Record<string, string> = {
    success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    danger: "bg-red-500/15 text-red-300 border-red-500/30",
    warning: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    neutral: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  };
  return (
    <div
      data-testid={testId}
      className="glass-card overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left p-3.5 flex items-center gap-3"
        aria-expanded={open}
      >
        <span className={`h-8 w-1 rounded-full ${
          accent === "violet" ? "bg-violet-500" :
          accent === "blue" ? "bg-blue-500" :
          accent === "amber" ? "bg-amber-500" : "bg-cyan-500"
        }`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate">{title}</span>
            {status && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${toneMap[status.tone]} shrink-0`}>
                {status.label}
              </span>
            )}
          </div>
          {subtitle && <div className="text-[11px] text-slate-400 mt-0.5 truncate">{subtitle}</div>}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 expand-enter border-t border-white/5">
          {children}
        </div>
      )}
    </div>
  );
}

/** Ranked card — used for top memory processes */
export function RankedCard({
  rank,
  name,
  subtitle,
  valueLabel,
  percent,
  children,
  tone = "neutral",
  testId,
}: {
  rank: number;
  name: string;
  subtitle?: ReactNode;
  valueLabel: string;
  percent?: number | null;
  children?: ReactNode;
  tone?: "neutral" | "danger" | "warning";
  testId?: string;
}) {
  const pct = typeof percent === "number" && isFinite(percent) ? Math.max(0, Math.min(100, percent)) : null;
  const rankColor =
    rank === 1 ? "bg-red-500/20 text-red-300" :
    rank === 2 ? "bg-amber-500/20 text-amber-300" :
    rank === 3 ? "bg-yellow-500/15 text-yellow-300" :
    "bg-white/5 text-slate-400";
  return (
    <div data-testid={testId} className="glass-card !p-3">
      <div className="flex items-center gap-2.5">
        <span className={`shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold ${rankColor}`}>
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-white truncate">{name}</span>
            <span className={`text-sm font-bold tabular-nums shrink-0 ${
              tone === "danger" ? "text-red-400" : tone === "warning" ? "text-amber-400" : "text-slate-100"
            }`}>{valueLabel}</span>
          </div>
          {subtitle && <div className="text-[11px] text-slate-400 truncate mt-0.5">{subtitle}</div>}
          {pct !== null && (
            <div className="bar-track mt-1.5 !h-1.5">
              <div className={barClassForPercent(pct)} style={{ width: `${pct}%` }} />
            </div>
          )}
          {children && <div className="mt-1.5">{children}</div>}
        </div>
      </div>
    </div>
  );
}

/** Sparkline — lightweight SVG chart for CPU/Memory/Network/Disk */
export function Sparkline({
  data,
  width = 100,
  height = 28,
  color = "#a78bfa",
  fill = "rgba(167,139,250,0.12)",
  testId,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: string;
  testId?: string;
}) {
  if (!Array.isArray(data) || data.length === 0) {
    return <div data-testid={testId} style={{ width, height }} />;
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = height - ((d - min) / range) * (height - 2) - 1;
    return [x, y] as const;
  });
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${path} L${width},${height} L0,${height} Z`;
  return (
    <svg data-testid={testId} width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <path d={areaPath} fill={fill} stroke="none" />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Section header with label + optional count badge */
export function SectionHeader({
  title,
  Icon,
  count,
  right,
}: {
  title: string;
  Icon: LucideIcon;
  count?: number | string | null;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
        {count !== undefined && count !== null && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-400 font-medium">
            {count}
          </span>
        )}
      </div>
      {right}
    </div>
  );
}

/**
 * Collapsible section wrapper.
 * Renders a clickable header (title + icon + count + chevron) that toggles
 * the visibility of its children. Defaults to collapsed when `defaultCollapsed`
 * is true. Used to reduce vertical scrolling on long dashboard pages.
 */
export function CollapsibleSection({
  title,
  Icon,
  count,
  defaultCollapsed = false,
  children,
  testId,
}: {
  title: string;
  Icon: LucideIcon;
  count?: number | string | null;
  defaultCollapsed?: boolean;
  children: ReactNode;
  testId?: string;
}) {
  const [open, setOpen] = useState(!defaultCollapsed);
  return (
    <section data-testid={testId}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between mb-2.5 touch-target"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
          {count !== undefined && count !== null && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-400 font-medium">
              {count}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
          aria-hidden="true"
        />
      </button>
      <div
        className={`grid transition-all duration-200 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </section>
  );
}

/** Skeleton block for loading states */
export function Skeleton({ className = "", testId }: { className?: string; testId?: string }) {
  return <div data-testid={testId} className={`skeleton rounded-xl ${className}`} />;
}

/** Hook for pull-to-refresh behavior */
export function usePullToRefresh(onRefresh: () => void | Promise<void>) {
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 0) startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && window.scrollY <= 0) {
      setPull(Math.min(dy * 0.5, 80));
    }
  };
  const onTouchEnd = async () => {
    if (pull > 60 && !refreshing) {
      setRefreshing(true);
      try { await onRefresh(); } finally {
        setRefreshing(false);
      }
    }
    setPull(0);
    startY.current = null;
  };

  return { pull, refreshing, onTouchStart, onTouchMove, onTouchEnd };
}
