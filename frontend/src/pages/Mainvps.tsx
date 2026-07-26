import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Cpu,
  MemoryStick,
  HardDrive,
  Container,
  Database,
  Boxes,
  AlertTriangle,
  RefreshCw,
  Clock,
  Server,
  CheckCircle2,
  XCircle,
  Wifi,
  Terminal,
  Rocket,
  ScrollText,
  RotateCw,
  ChevronRight,
} from "lucide-react";
import { useMetrics } from "@/lib/metrics-context";
import {
  hasError,
  fmtNum,
  fmtUptime,
  fmtUptimeFromSeconds,
  AnimatedValue,
  GlassCard,
  ResourceTile,
  StatChip,
  ExpandableCard,
  RankedCard,
  Sparkline,
  SectionHeader,
  CollapsibleSection,
  Skeleton,
  usePullToRefresh,
} from "@/components/dashboard/primitives";

const MAX_HISTORY = 24;

const Mainvps = () => {
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useMetrics();
  const main = data?.main;

  // Initial fetch on mount
  useEffect(() => {
    if (!data) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sparkline history buckets (capped ring buffers)
  const [cpuHist, setCpuHist] = useState<number[]>([]);
  const [memHist, setMemHist] = useState<number[]>([]);
  const [rxHist, setRxHist] = useState<number[]>([]);
  const [diskHist, setDiskHist] = useState<number[]>([]);

  const { pull, refreshing, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh(refresh);

  const diskList = useMemo(() => {
    if (!main || hasError(main?.disk)) return [];
    const arr = Array.isArray(main.disk) ? main.disk : [];
    return arr.filter(
      (d: any) =>
        d &&
        typeof d.fstype === "string" &&
        ["ext4", "ext3", "ext2", "xfs", "btrfs", "zfs", "ntfs"].includes(d.fstype.toLowerCase())
    );
  }, [main]);

  // Track history when values change
  useMemo(() => {
    if (!main) return;
    const cpu = !hasError(main.cpu) ? main.cpu : null;
    const memory = !hasError(main.memory) ? main.memory : null;
    if (cpu && typeof cpu.percent === "number") {
      setCpuHist((h) => [...h, cpu.percent].slice(-MAX_HISTORY));
    }
    if (memory && typeof memory.percent === "number") {
      setMemHist((h) => [...h, memory.percent].slice(-MAX_HISTORY));
    }
    if (memory && typeof memory.used_gb === "number") {
      setRxHist((h) => [...h, memory.used_gb].slice(-MAX_HISTORY));
    }
    const rootDisk = diskList.find((d: any) => d.mount === "/" || d.mount === "");
    if (rootDisk && typeof rootDisk.used_gb === "number") {
      setDiskHist((h) => [...h, rootDisk.used_gb].slice(-MAX_HISTORY));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [main]);

  /* ---------------- Loading skeleton ---------------- */
  if (!main && loading) {
    return (
      <div data-testid="mainvps-page" aria-live="polite" className="space-y-4">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  /* ---------------- Error state ---------------- */
  if (!main && error) {
    return (
      <div data-testid="mainvps-page" className="glass-card p-6 flex items-center gap-3 text-red-300">
        <AlertTriangle className="h-5 w-5" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (!main) {
    return (
      <button
        data-testid="mainvps-page"
        onClick={() => refresh()}
        className="glass-card glass-card-pressable w-full p-6 flex items-center justify-center gap-3 text-slate-300"
      >
        <RefreshCw className={`h-5 w-5 text-violet-400 ${loading ? "spin-ring" : ""}`} />
        <span className="text-sm font-medium">{loading ? "Loading metrics…" : "Tap to load metrics"}</span>
      </button>
    );
  }

  /* ---------------- Data extraction ---------------- */
  const cpuErr = hasError(main.cpu);
  const memErr = hasError(main.memory);
  const dockerErr = hasError(main.docker);
  const pgErr = hasError(main.postgres);
  const pm2Err = hasError(main.pm2);
  const oomErr = hasError(main.oom_events);

  const cpu = (!cpuErr && main.cpu) || {};
  const memory = (!memErr && main.memory) || {};
  const docker = (!dockerErr && main.docker) || {};
  const postgres = (!pgErr && main.postgres) || {};
  const pm2 = (!pm2Err && main.pm2) || {};
  const oom = (!oomErr && main.oom_events) || {};

  const topProcsErr = hasError(main.top_procs);
  const topProcs = (!topProcsErr && main.top_procs) || {};
  const byMem = Array.isArray(topProcs.by_mem) ? topProcs.by_mem.slice(0, 10) : [];

  const cpuPercent = typeof cpu.percent === "number" ? cpu.percent : null;
  const memPercent = typeof memory.percent === "number" ? memory.percent : null;

  const rootDisk = diskList.find((d: any) => d.mount === "/" || d.mount === "") || diskList[0] || null;
  const diskPercent =
    rootDisk && typeof rootDisk.total_gb === "number" && rootDisk.total_gb > 0
      ? (rootDisk.used_gb / rootDisk.total_gb) * 100
      : null;

  // Network proxy: use swap as a lightweight secondary indicator if available
  const netProxy = typeof memory.swap_used_gb === "number" ? memory.swap_used_gb : null;

  const hasAlerts =
    (typeof oom.count_24h === "number" && oom.count_24h > 0) ||
    (cpuPercent !== null && cpuPercent >= 85) ||
    (memPercent !== null && memPercent >= 85) ||
    (diskPercent !== null && diskPercent >= 85);

  const stoppedContainers =
    typeof docker.total === "number" && typeof docker.running === "number"
      ? docker.total - docker.running
      : null;

  return (
    <div
      data-testid="mainvps-page"
      aria-live="polite"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ transform: pull > 0 ? `translateY(${pull}px)` : undefined }}
      className={`space-y-4 ${pull > 0 ? "ptr-active" : ""}`}
    >
      {/* Pull-to-refresh indicator */}
      {pull > 0 && (
        <div className="flex justify-center -mb-2">
          <RefreshCw
            className={`h-5 w-5 text-violet-400 ${refreshing || pull > 60 ? "spin-ring" : ""}`}
            style={{ transform: `rotate(${pull * 3}deg)` }}
          />
        </div>
      )}

      {/* ===================== STICKY HEADER ===================== */}
      <header className="sticky top-0 z-30 -mx-4 px-4 pt-2 pb-3 bg-gradient-to-b from-[#090b14] via-[#090b14]/95 to-transparent">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-subtle" />
              <span>Main VPS</span>
              <span className="text-slate-600">·</span>
              <Clock className="h-3 w-3" />
              <span>{fmtUptime(main.uptime_h)}</span>
            </div>
            <h1 className="text-[22px] font-bold text-white truncate leading-tight mt-0.5">
              {main.hostname || "Main VPS"}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              className="icon-btn"
              onClick={() => refresh()}
              aria-label="Refresh"
              data-testid="header-refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "spin-ring" : ""}`} />
            </button>
            <button
              className="icon-btn"
              onClick={() => navigate("/workervps")}
              aria-label="Switch server"
              data-testid="header-switch"
            >
              <Server className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ===================== HERO CARD ===================== */}
      <GlassCard className="!p-4 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full gradient-accent opacity-20 blur-2xl" />
        <div className="flex items-center justify-between relative">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">System Health</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold gradient-text leading-none">
                {hasAlerts ? "Attention" : "Healthy"}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {cpuPercent !== null && (
                <span className="text-[11px] text-slate-400">
                  CPU <span className="text-white font-semibold tabular-nums">{fmtNum(cpuPercent)}%</span>
                </span>
              )}
              {memPercent !== null && (
                <span className="text-[11px] text-slate-400">
                  RAM <span className="text-white font-semibold tabular-nums">{fmtNum(memPercent)}%</span>
                </span>
              )}
              {diskPercent !== null && (
                <span className="text-[11px] text-slate-400">
                  Disk <span className="text-white font-semibold tabular-nums">{fmtNum(diskPercent)}%</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
              hasAlerts ? "bg-amber-500/15" : "bg-emerald-500/15"
            }`}>
              {hasAlerts ? (
                <AlertTriangle className="h-6 w-6 text-amber-400" />
              ) : (
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              )}
            </div>
            <span className="text-[10px] text-slate-500">{loading ? "Syncing…" : "Live"}</span>
          </div>
        </div>
      </GlassCard>

      {/* ===================== 2×2 RESOURCE GRID ===================== */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ResourceTile
          testId="mainvps-cpu"
          Icon={Cpu}
          accent="blue"
          label="CPU"
          percent={cpuPercent}
          valueNode={
            cpuErr ? (
              <span className="text-red-400 text-base">Unavailable</span>
            ) : (
              <AnimatedValue value={cpuPercent} digits={1} suffix="%" />
            )
          }
          subNode={
            !cpuErr && typeof cpu.cores === "number" ? `${cpu.cores} cores` : undefined
          }
          spark={<Sparkline data={cpuHist} color="#60a5fa" fill="rgba(96,165,250,0.12)" />}
        />
        <ResourceTile
          testId="mainvps-memory"
          Icon={MemoryStick}
          accent="violet"
          label="Memory"
          percent={memPercent}
          valueNode={
            memErr ? (
              <span className="text-red-400 text-base">Unavailable</span>
            ) : (
              <span>
                <AnimatedValue value={memory.used_gb} digits={1} />
                <span className="text-slate-500 text-base font-medium"> / {fmtNum(memory.total_gb)}G</span>
              </span>
            )
          }
          subNode={
            !memErr
              ? `Swap ${fmtNum(memory.swap_used_gb, 2)} / ${fmtNum(memory.swap_total_gb, 2)} GB`
              : undefined
          }
          spark={<Sparkline data={memHist} color="#a78bfa" fill="rgba(167,139,250,0.12)" />}
        />
        <ResourceTile
          testId="mainvps-disk"
          Icon={HardDrive}
          accent="amber"
          label="Disk"
          percent={diskPercent}
          valueNode={
            hasError(main.disk) ? (
              <span className="text-red-400 text-base">Unavailable</span>
            ) : rootDisk ? (
              <span>
                <AnimatedValue value={rootDisk.used_gb} digits={1} />
                <span className="text-slate-500 text-base font-medium"> / {fmtNum(rootDisk.total_gb)}G</span>
              </span>
            ) : (
              <span className="text-slate-500 text-base">N/A</span>
            )
          }
          subNode={
            rootDisk ? (
              <span className="font-mono">{rootDisk.mount || rootDisk.device}</span>
            ) : undefined
          }
          spark={<Sparkline data={diskHist} color="#f59e0b" fill="rgba(245,158,11,0.12)" />}
        />
        <ResourceTile
          testId="mainvps-network"
          Icon={Wifi}
          accent="cyan"
          label="Load Avg"
          valueNode={
            cpuErr ? (
              <span className="text-red-400 text-base">Unavailable</span>
            ) : Array.isArray(cpu.load) && cpu.load.length > 0 ? (
              <AnimatedValue value={cpu.load[0]} digits={2} />
            ) : (
              <span className="text-slate-500 text-base">N/A</span>
            )
          }
          subNode={
            !cpuErr && Array.isArray(cpu.load)
              ? `5m ${typeof cpu.load[1] === "number" ? cpu.load[1].toFixed(2) : "—"} · 15m ${typeof cpu.load[2] === "number" ? cpu.load[2].toFixed(2) : "—"}`
              : undefined
          }
          spark={<Sparkline data={rxHist} color="#22d3ee" fill="rgba(34,211,238,0.12)" />}
        />
      </section>

      {/* ===================== DISK MOUNTS (extra) ===================== */}
      {!hasError(main.disk) && diskList.length > 1 && (
        <section>
          <SectionHeader title="All Mounts" Icon={HardDrive} count={diskList.length} />
          <div className="space-y-2">
            {diskList.map((d: any) => {
              const total = typeof d.total_gb === "number" ? d.total_gb : 0;
              const used = typeof d.used_gb === "number" ? d.used_gb : 0;
              const p = total > 0 ? (used / total) * 100 : 0;
              return (
                <GlassCard key={`${d.device}-${d.mount}`} className="!p-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-mono text-slate-200">{d.mount || d.device}</span>
                    <span className="font-mono text-slate-500 tabular-nums">{fmtNum(used)} / {fmtNum(total)} GB</span>
                  </div>
                  <div className="bar-track !h-1.5">
                    <div className={barClass(p)} style={{ width: `${p}%` }} />
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </section>
      )}

      {/* ===================== DOCKER SUMMARY ===================== */}
      <section>
        <SectionHeader title="Docker" Icon={Container} count={docker.total ?? 0} />
        {dockerErr ? (
          <GlassCard className="text-red-400 text-sm">Unavailable</GlassCard>
        ) : docker.available === false ? (
          <GlassCard className="text-slate-500 text-sm">Docker not available</GlassCard>
        ) : (
          <div className="flex gap-2 flex-wrap">
            <StatChip testId="docker-running" Icon={Activity} tone="success" label="Running" value={docker.running ?? "—"} />
            <StatChip Icon={RotateCw} tone="warning" label="Restarting" value={typeof docker.restarting === "number" ? docker.restarting : 0} />
            <StatChip Icon={XCircle} tone="danger" label="Stopped" value={stoppedContainers ?? "—"} />
            <StatChip Icon={Container} tone="violet" label="Images" value={docker.images ?? "—"} />
          </div>
        )}
      </section>

      {/* ===================== POSTGRES ===================== */}
      <section>
        <SectionHeader title="PostgreSQL" Icon={Database} />
        {pgErr ? (
          <GlassCard className="text-red-400 text-sm">Unavailable</GlassCard>
        ) : postgres.available === false ? (
          <GlassCard className="text-slate-500 text-sm">Postgres not available</GlassCard>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <GlassCard className="!p-3 text-center">
              <div className="text-xl font-bold text-emerald-400 tabular-nums">{postgres.connections ?? "—"}</div>
              <div className="text-[10px] uppercase text-slate-500 mt-0.5">Connections</div>
            </GlassCard>
            <GlassCard className="!p-3 text-center">
              <div className="text-xl font-bold text-blue-400 tabular-nums">{postgres.db_size_mb ?? "—"}</div>
              <div className="text-[10px] uppercase text-slate-500 mt-0.5">Size (MB)</div>
            </GlassCard>
            <GlassCard className="!p-3 text-center">
              <div className="text-xl font-bold text-violet-400 tabular-nums">{postgres.active_queries ?? "—"}</div>
              <div className="text-[10px] uppercase text-slate-500 mt-0.5">Active</div>
            </GlassCard>
          </div>
        )}
      </section>

      {/* ===================== PM2 PROCESSES (expandable cards, collapsible) ===================== */}
      <CollapsibleSection
        title="PM2 Processes"
        Icon={Boxes}
        count={Array.isArray(pm2.processes) ? pm2.processes.length : 0}
        defaultCollapsed
        testId="pm2-section"
      >
        {pm2Err ? (
          <GlassCard className="text-red-400 text-sm">Unavailable</GlassCard>
        ) : pm2.available === false ? (
          <GlassCard className="text-slate-500 text-sm">PM2 not available</GlassCard>
        ) : !Array.isArray(pm2.processes) || pm2.processes.length === 0 ? (
          <GlassCard className="text-slate-500 text-sm">No PM2 processes</GlassCard>
        ) : (
          <div className="space-y-2">
            {pm2.processes.map((p: any, i: number) => {
              const online = p.status === "online";
              return (
                <ExpandableCard
                  key={`${p.name}-${i}`}
                  testId={`pm2-${i}`}
                  title={p.name || "N/A"}
                  accent={online ? "violet" : "amber"}
                  status={{
                    label: online ? "online" : (p.status || "offline"),
                    tone: online ? "success" : "danger",
                  }}
                  subtitle={
                    <span className="flex items-center gap-2">
                      <span>CPU {typeof p.cpu === "number" ? `${fmtNum(p.cpu, 1)}%` : "—"}</span>
                      <span className="text-slate-600">·</span>
                      <span>MEM {typeof p.memory_mb === "number" ? `${p.memory_mb}MB` : "—"}</span>
                      <span className="text-slate-600">·</span>
                      <span>↻ {p.restarts ?? "—"}</span>
                    </span>
                  }
                >
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div>
                      <div className="text-[10px] uppercase text-slate-500">CPU</div>
                      <div className="text-sm font-bold text-white tabular-nums">{typeof p.cpu === "number" ? `${fmtNum(p.cpu, 1)}%` : "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-slate-500">Memory</div>
                      <div className="text-sm font-bold text-white tabular-nums">{typeof p.memory_mb === "number" ? `${p.memory_mb}MB` : "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-slate-500">Restarts</div>
                      <div className="text-sm font-bold text-white tabular-nums">{p.restarts ?? "—"}</div>
                    </div>
                  </div>
                </ExpandableCard>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* ===================== TOP MEMORY PROCESSES (ranked cards, collapsible) ===================== */}
      <CollapsibleSection
        title="Top Memory"
        Icon={MemoryStick}
        count={byMem.length}
        defaultCollapsed
        testId="top-memory-section"
      >
        {topProcsErr ? (
          <GlassCard className="text-red-400 text-sm">Unavailable</GlassCard>
        ) : byMem.length === 0 ? (
          <GlassCard className="text-slate-500 text-sm">No process data available</GlassCard>
        ) : (
          <div className="space-y-2">
            {byMem.map((p: any, i: number) => {
              const mb = typeof p.rss_mb === "number" ? p.rss_mb : 0;
              const tone = mb > 200 ? "danger" : mb > 100 ? "warning" : "neutral";
              return (
                <RankedCard
                  key={`${p.pid}-${i}`}
                  testId={`topmem-${i}`}
                  rank={i + 1}
                  name={p.name || "N/A"}
                  tone={tone}
                  valueLabel={`${fmtNum(mb, 1)} MB`}
                  percent={typeof p.mem_percent === "number" ? p.mem_percent : null}
                  subtitle={
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono">{p.user || "—"}</span>
                      <span className="text-slate-600">·</span>
                      <span>CPU {typeof p.cpu === "number" ? `${fmtNum(p.cpu, 1)}%` : "—"}</span>
                      <span className="text-slate-600">·</span>
                      <span>{fmtUptimeFromSeconds(p.uptime_s)}</span>
                    </span>
                  }
                >
                  {p.cmd && (
                    <div className="text-[10px] font-mono text-slate-500 truncate" title={p.cmd}>
                      {p.cmd}
                    </div>
                  )}
                </RankedCard>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* ===================== ALERTS (conditional) ===================== */}
      {hasAlerts && (
        <section>
          <SectionHeader title="Alerts" Icon={AlertTriangle} />
          <GlassCard className="!p-3.5 space-y-2.5 border-amber-500/20">
            {typeof oom.count_24h === "number" && oom.count_24h > 0 && (
              <AlertRow
                tone="danger"
                Icon={XCircle}
                title={`${oom.count_24h} OOM event${oom.count_24h > 1 ? "s" : ""} in 24h`}
                desc="Out of memory detected"
              />
            )}
            {cpuPercent !== null && cpuPercent >= 85 && (
              <AlertRow
                tone="danger"
                Icon={Cpu}
                title={`CPU at ${fmtNum(cpuPercent)}%`}
                desc="Sustained high CPU usage"
              />
            )}
            {memPercent !== null && memPercent >= 85 && (
              <AlertRow
                tone="warning"
                Icon={MemoryStick}
                title={`Memory at ${fmtNum(memPercent)}%`}
                desc="High memory pressure"
              />
            )}
            {diskPercent !== null && diskPercent >= 85 && (
              <AlertRow
                tone="warning"
                Icon={HardDrive}
                title={`Disk at ${fmtNum(diskPercent)}%`}
                desc="Low free disk space"
              />
            )}
          </GlassCard>
        </section>
      )}

      {/* ===================== OOM SUMMARY (always shown compactly) ===================== */}
      <section>
        <SectionHeader title="OOM Events" Icon={AlertTriangle} />
        {oomErr ? (
          <GlassCard className="text-red-400 text-sm">Unavailable</GlassCard>
        ) : oom.available === false ? (
          <GlassCard className="text-slate-500 text-sm">OOM monitoring not available</GlassCard>
        ) : typeof oom.count_24h === "number" && oom.count_24h > 0 ? (
          <GlassCard className="!p-3.5 border-red-500/30 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-red-500/15 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <div className="text-xl font-bold text-red-400 tabular-nums">{oom.count_24h}</div>
              <div className="text-[11px] text-slate-400">out of memory events (24h)</div>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="!p-3.5 border-emerald-500/20 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-emerald-300">
                {typeof oom.count_24h === "number" ? "No OOM events" : "N/A"}
              </div>
              <div className="text-[11px] text-slate-400">System memory is stable</div>
            </div>
          </GlassCard>
        )}
      </section>

      {/* ===================== FLOATING ACTION BAR ===================== */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4 md:max-w-3xl md:px-6">
        <div className="action-bar rounded-2xl p-1.5 flex items-center justify-between gap-1">
          <ActionBtn Icon={RotateCw} label="Restart" onClick={() => navigate("/dockerfleet")} />
          <ActionBtn Icon={ScrollText} label="Logs" onClick={() => navigate("/inframonitor")} />
          <ActionBtn Icon={Terminal} label="Terminal" onClick={() => navigate("/webterminal")} primary />
          <ActionBtn Icon={Rocket} label="Deploy" onClick={() => navigate("/dockerfleet")} />
        </div>
      </div>
    </div>
  );
};

/* Local helpers ---------------------------------------------------- */

function barClass(p: number): string {
  if (p >= 85) return "bar-fill bar-fill-danger";
  if (p >= 70) return "bar-fill bar-fill-warn";
  return "bar-fill bar-fill-success";
}

function AlertRow({
  tone,
  Icon,
  title,
  desc,
}: {
  tone: "danger" | "warning";
  Icon: typeof AlertTriangle;
  title: string;
  desc: string;
}) {
  const colorMap = {
    danger: "bg-red-500/15 text-red-400",
    warning: "bg-amber-500/15 text-amber-400",
  };
  return (
    <div className="flex items-center gap-3">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${colorMap[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white truncate">{title}</div>
        <div className="text-[11px] text-slate-400">{desc}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-600 shrink-0" />
    </div>
  );
}

function ActionBtn({
  Icon,
  label,
  onClick,
  primary = false,
}: {
  Icon: typeof Terminal;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-all active:scale-95 ${
        primary ? "gradient-accent text-white" : "text-slate-300 hover:bg-white/5"
      }`}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export default Mainvps;
