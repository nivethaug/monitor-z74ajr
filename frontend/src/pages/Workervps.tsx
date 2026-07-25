import { useMemo } from "react";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Container,
  Boxes,
  AlertTriangle,
  RefreshCw,
  Clock,
  ServerCog,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMetrics } from "@/lib/metrics-context";

const colorForPercent = (p: number) =>
  p >= 85 ? "bg-red-500" : p >= 70 ? "bg-yellow-500" : "bg-emerald-500";

const hasError = (block: any): block is { error: string } =>
  block && typeof block === "object" && "error" in block && Object.keys(block).length <= 2;

function fmtNum(n: unknown, digits = 1): string {
  if (typeof n !== "number" || !isFinite(n)) return "N/A";
  return n.toFixed(digits);
}

function fmtUptime(hours: unknown): string {
  if (typeof hours !== "number" || !isFinite(hours)) return "N/A";
  return `${hours.toLocaleString(undefined, { maximumFractionDigits: 1 })}h`;
}

function fmtUptimeFromSeconds(s: unknown): string {
  if (typeof s !== "number" || !isFinite(s) || s < 0) return "N/A";
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function memColorClass(mb: number): string {
  if (mb > 200) return "text-red-400";
  if (mb > 100) return "text-amber-400";
  return "text-slate-200";
}

const Workervps = () => {
  const { data, loading, error } = useMetrics();
  const worker = data?.worker;

  const diskList = useMemo(() => {
    if (!worker || hasError(worker?.disk)) return [];
    const arr = Array.isArray(worker.disk) ? worker.disk : [];
    return arr.filter(
      (d: any) =>
        d &&
        typeof d.fstype === "string" &&
        ["ext4", "ext3", "ext2", "xfs", "btrfs", "zfs", "ntfs"].includes(d.fstype.toLowerCase())
    );
  }, [worker]);

  if (!worker && loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400" data-testid="workervps-page">
        <RefreshCw className="animate-spin mr-2" aria-hidden="true" />
        Loading Worker VPS metrics...
      </div>
    );
  }

  if (!worker && error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400" data-testid="workervps-page">
        <AlertTriangle className="mr-2" aria-hidden="true" />
        {error}
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400" data-testid="workervps-page">
        Click <RefreshCw className="h-4 w-4 mx-1" aria-hidden="true" /> Refresh to load metrics.
      </div>
    );
  }

  const cpuErr = hasError(worker.cpu);
  const memErr = hasError(worker.memory);
  const dockerErr = hasError(worker.docker);
  const pm2Err = hasError(worker.pm2);
  const oomErr = hasError(worker.oom_events);

  const cpu = (!cpuErr && worker.cpu) || {};
  const memory = (!memErr && worker.memory) || {};
  const docker = (!dockerErr && worker.docker) || {};
  const pm2 = (!pm2Err && worker.pm2) || {};
  const oom = (!oomErr && worker.oom_events) || {};

  const topProcsErr = hasError(worker.top_procs);
  const topProcs = (!topProcsErr && worker.top_procs) || {};
  const byMem = Array.isArray(topProcs.by_mem) ? topProcs.by_mem.slice(0, 10) : [];

  const cpuPercent = typeof cpu.percent === "number" ? cpu.percent : null;
  const memPercent = typeof memory.percent === "number" ? memory.percent : null;

  return (
    <main className="space-y-6 text-slate-100" data-testid="workervps-page" aria-live="polite">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-slate-800">
            <ServerCog className="text-amber-400" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {worker.hostname || "Worker VPS"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20">
                Worker VPS
              </Badge>
              <span className="flex items-center gap-1 text-sm text-slate-400">
                <Clock className="h-4 w-4" aria-hidden="true" /> {fmtUptime(worker.uptime_h)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl" data-testid="workervps-cpu">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-200">
              <Cpu className="h-4 w-4 text-blue-400" aria-hidden="true" /> CPU
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cpuErr ? (
              <div className="text-sm text-red-400">Unavailable</div>
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-mono font-semibold text-white">
                    {cpuPercent !== null ? fmtNum(cpuPercent) : "N/A"}%
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {typeof cpu.cores === "number" ? `${cpu.cores} cores` : ""}
                  </span>
                </div>
                {cpuPercent !== null && (
                  <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${colorForPercent(cpuPercent)} transition-all duration-700`}
                      style={{ width: `${cpuPercent}%` }}
                    />
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {(cpu.load && Array.isArray(cpu.load) ? cpu.load : [null, null, null]).map(
                    (l: number | null, i: number) => (
                      <div key={i} className="rounded-md bg-slate-800/50 py-1.5">
                        <div className="text-[10px] uppercase text-slate-500">{["1m", "5m", "15m"][i]}</div>
                        <div className="font-mono text-sm text-slate-200">
                          {typeof l === "number" ? l.toFixed(2) : "N/A"}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl" data-testid="workervps-memory">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-200">
              <MemoryStick className="h-4 w-4 text-purple-400" aria-hidden="true" /> Memory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {memErr ? (
              <div className="text-sm text-red-400">Unavailable</div>
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-mono font-semibold text-white">
                    {fmtNum(memory.used_gb)}{" "}
                    <span className="text-slate-500 text-lg">/ {fmtNum(memory.total_gb)} GB</span>
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {memPercent !== null ? `${memPercent.toFixed(0)}%` : "N/A"}
                  </span>
                </div>
                {memPercent !== null && (
                  <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${colorForPercent(memPercent)} transition-all duration-700`}
                      style={{ width: `${memPercent}%` }}
                    />
                  </div>
                )}
                <div className="text-xs text-slate-500 font-mono">
                  Swap: {fmtNum(memory.swap_used_gb, 2)} GB / {fmtNum(memory.swap_total_gb, 2)} GB
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl" data-testid="workervps-disk">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-200">
              <HardDrive className="h-4 w-4 text-amber-400" aria-hidden="true" /> Disk
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasError(worker.disk) ? (
              <div className="text-sm text-red-400">Unavailable</div>
            ) : diskList.length === 0 ? (
              <div className="text-sm text-slate-500">No filesystem disks reported</div>
            ) : (
              <div className="space-y-3">
                {diskList.map((d: any) => {
                  const total = typeof d.total_gb === "number" ? d.total_gb : 0;
                  const used = typeof d.used_gb === "number" ? d.used_gb : 0;
                  const p = total > 0 ? (used / total) * 100 : 0;
                  return (
                    <div key={`${d.device}-${d.mount}`} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-mono text-slate-300">
                          {d.mount || d.device}{" "}
                          <span className="text-slate-600">({d.fstype})</span>
                        </span>
                        <span className="font-mono text-slate-500">
                          {fmtNum(used)} / {fmtNum(total)} GB
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full ${colorForPercent(p)} transition-all duration-700`}
                          style={{ width: `${p}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl" data-testid="workervps-docker">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-200">
              <Container className="h-4 w-4 text-cyan-400" aria-hidden="true" /> Docker
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dockerErr ? (
              <div className="text-sm text-red-400">Unavailable</div>
            ) : docker.available === false ? (
              <div className="text-sm text-slate-500">Docker not available</div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-slate-800/50 p-3">
                  <div className="text-xs text-slate-500">Running</div>
                  <div className="text-2xl font-mono text-emerald-400">{docker.running ?? "N/A"}</div>
                </div>
                <div className="rounded-lg bg-slate-800/50 p-3">
                  <div className="text-xs text-slate-500">Stopped</div>
                  <div className="text-2xl font-mono text-slate-300">
                    {typeof docker.total === "number" && typeof docker.running === "number"
                      ? docker.total - docker.running
                      : "N/A"}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-800/50 p-3">
                  <div className="text-xs text-slate-500">Total</div>
                  <div className="text-2xl font-mono text-slate-200">{docker.total ?? "N/A"}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl" data-testid="workervps-oom">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-200">
              <AlertTriangle className="h-4 w-4 text-red-400" aria-hidden="true" /> OOM Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {oomErr ? (
              <div className="text-sm text-red-400">Unavailable</div>
            ) : oom.available === false ? (
              <div className="text-sm text-slate-500">OOM monitoring not available</div>
            ) : typeof oom.count_24h === "number" && oom.count_24h > 0 ? (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
                <div>
                  <div className="font-mono text-2xl text-red-400">{oom.count_24h}</div>
                  <div className="text-sm text-red-300">Out of memory events (24h)</div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" aria-hidden="true" />
                <div>
                  <div className="text-lg text-emerald-300">
                    {typeof oom.count_24h === "number" ? "No OOM events" : "N/A"}
                  </div>
                  <div className="text-sm text-slate-500">System memory is stable</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl" data-testid="workervps-pm2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-200">
              <Boxes className="h-4 w-4 text-pink-400" aria-hidden="true" /> PM2 Processes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pm2Err ? (
              <div className="text-sm text-red-400">Unavailable</div>
            ) : pm2.available === false ? (
              <div className="text-sm text-slate-500">PM2 not available</div>
            ) : !Array.isArray(pm2.processes) || pm2.processes.length === 0 ? (
              <div className="text-sm text-slate-500">No PM2 processes</div>
            ) : (
              <div className="overflow-auto max-h-[400px] rounded-md border border-slate-800">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-900 text-slate-500">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">Name</th>
                      <th className="text-left font-medium px-3 py-2">Status</th>
                      <th className="text-right font-medium px-3 py-2">Restarts</th>
                      <th className="text-right font-medium px-3 py-2">CPU%</th>
                      <th className="text-right font-medium px-3 py-2">Memory (MB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pm2.processes.map((p: any, i: number) => (
                      <tr
                        key={`${p.name}-${i}`}
                        className={`border-t border-slate-800 hover:bg-slate-800/30 ${p.status !== "online" ? "bg-red-500/5" : ""}`}
                      >
                        <td className="px-3 py-2 font-mono text-slate-200">{p.name || "N/A"}</td>
                        <td className="px-3 py-2">
                          <Badge
                            className={
                              p.status === "online"
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                : "bg-red-500/15 text-red-300 border border-red-500/30"
                            }
                          >
                            {p.status || "N/A"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-300">{p.restarts ?? "N/A"}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-300">
                          {typeof p.cpu === "number" ? p.cpu.toFixed(1) : "N/A"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-300">
                          {typeof p.memory_mb === "number" ? p.memory_mb : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl" data-testid="workervps-top-mem-procs">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-200">
              <MemoryStick className="h-4 w-4 text-purple-400" aria-hidden="true" /> Top Memory Processes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProcsErr ? (
              <div className="text-sm text-red-400">Unavailable</div>
            ) : byMem.length === 0 ? (
              <div className="text-sm text-slate-500">No process data available</div>
            ) : (
              <div className="overflow-auto max-h-[400px] rounded-md border border-slate-800">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-900 text-slate-500">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">Process Name</th>
                      <th className="text-left font-medium px-3 py-2">User</th>
                      <th className="text-right font-medium px-3 py-2">Memory (MB)</th>
                      <th className="text-right font-medium px-3 py-2">Mem %</th>
                      <th className="text-right font-medium px-3 py-2">CPU %</th>
                      <th className="text-left font-medium px-3 py-2">Uptime</th>
                      <th className="text-left font-medium px-3 py-2 hidden md:table-cell">Command</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byMem.map((p: any, i: number) => {
                      const mb = typeof p.rss_mb === "number" ? p.rss_mb : 0;
                      return (
                        <tr key={`${p.pid}-${i}`} className="border-t border-slate-800 hover:bg-slate-800/30">
                          <td className="px-3 py-2 font-mono text-slate-200">{p.name || "N/A"}</td>
                          <td className="px-3 py-2 font-mono text-slate-400">{p.user || "N/A"}</td>
                          <td className={`px-3 py-2 text-right font-mono font-bold ${memColorClass(mb)}`}>
                            {typeof p.rss_mb === "number" ? fmtNum(p.rss_mb, 1) : "N/A"}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-slate-300">
                            {typeof p.mem_percent === "number" ? `${fmtNum(p.mem_percent, 1)}%` : "N/A"}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-slate-300">
                            {typeof p.cpu === "number" ? `${fmtNum(p.cpu, 1)}%` : "N/A"}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-300">{fmtUptimeFromSeconds(p.uptime_s)}</td>
                          <td className="px-3 py-2 font-mono text-slate-500 hidden md:table-cell">
                            <span className="block max-w-[280px] truncate" title={p.cmd || ""}>
                              {p.cmd || "N/A"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default Workervps;
