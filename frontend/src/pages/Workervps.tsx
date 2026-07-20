import { useState, useEffect, useCallback } from "react";
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
import { Button } from "@/components/ui/button";

type Pm2Process = {
  name: string;
  status: "online" | "errored" | "stopped";
  restarts: number;
  cpu: number;
  memoryMb: number;
  uptimeHours: number;
};

type WorkerMetrics = {
  hostname: string;
  uptimeHours: number;
  status: "healthy" | "critical";
  cpu: { percent: number; cores: number; load1: number; load5: number; load15: number };
  memory: { usedGb: number; totalGb: number; swapUsedMb: number; swapTotalMb: number };
  disks: { fs: string; usedGb: number; totalGb: number }[];
  docker: { running: number; total: number };
  pm2: Pm2Process[];
  oomCount: number;
};

const MOCK_METRICS: WorkerMetrics = {
  hostname: "dreamagent-worker-02",
  uptimeHours: 712,
  status: "critical",
  cpu: { percent: 91, cores: 8, load1: 7.4, load5: 6.8, load15: 5.2 },
  memory: { usedGb: 28.1, totalGb: 32, swapUsedMb: 880, swapTotalMb: 2048 },
  disks: [
    { fs: "/dev/nvme0n1p1 (ext4)", usedGb: 142, totalGb: 240 },
    { fs: "/dev/nvme1n1 (btrfs)", usedGb: 870, totalGb: 1000 },
  ],
  docker: { running: 18, total: 20 },
  pm2: [
    { name: "task-runner-1", status: "online", restarts: 6, cpu: 44.2, memoryMb: 880, uptimeHours: 312 },
    { name: "task-runner-2", status: "online", restarts: 11, cpu: 38.7, memoryMb: 760, uptimeHours: 280 },
    { name: "gpu-proxy", status: "online", restarts: 2, cpu: 14.3, memoryMb: 320, uptimeHours: 700 },
    { name: "log-shipper", status: "online", restarts: 0, cpu: 3.1, memoryMb: 124, uptimeHours: 712 },
    { name: "heartbeat", status: "errored", restarts: 23, cpu: 0, memoryMb: 0, uptimeHours: 0 },
    { name: "container-reaper", status: "online", restarts: 1, cpu: 1.2, memoryMb: 96, uptimeHours: 690 },
  ],
  oomCount: 3,
};

const colorForPercent = (p: number) =>
  p >= 85 ? "bg-red-500" : p >= 70 ? "bg-yellow-500" : "bg-emerald-500";

const Workervps = () => {
  const [metrics, setMetrics] = useState<WorkerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const refresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setMetrics(MOCK_METRICS);
      setLastUpdated(new Date().toLocaleTimeString());
      setLoading(false);
      setRefreshing(false);
    }, 400);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400" data-testid="workervps-page">
        <RefreshCw className="animate-spin mr-2" aria-hidden="true" />
        Loading Worker VPS metrics...
      </div>
    );
    }

  const memPercent = (metrics.memory.usedGb / metrics.memory.totalGb) * 100;

  return (
    <main className="space-y-6 text-slate-100" data-testid="workervps-page" aria-live="polite">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-purple-500/20 border border-slate-800">
            <ServerCog className="text-amber-400" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">{metrics.hostname}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20">Worker VPS</Badge>
              <span className="flex items-center gap-1 text-sm text-slate-400">
                <span className={`h-2 w-2 rounded-full ${metrics.status === "healthy" ? "bg-emerald-500" : "bg-red-500"}`} />
                {metrics.status === "healthy" ? "Healthy" : "Critical"}
              </span>
              <span className="flex items-center gap-1 text-sm text-slate-400">
                <Clock className="h-4 w-4" aria-hidden="true" /> {metrics.uptimeHours.toLocaleString()}h uptime
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Last updated: {lastUpdated}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={refreshing}
            data-testid="workervps-refresh-button"
            className="bg-slate-900 border-slate-800 hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </Button>
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
            <div className="flex items-end justify-between">
              <span className="text-3xl font-mono font-semibold text-white">{metrics.cpu.percent.toFixed(1)}%</span>
              <span className="text-xs text-slate-500 font-mono">{metrics.cpu.cores} cores</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div className={`h-full ${colorForPercent(metrics.cpu.percent)} transition-all duration-700`} style={{ width: `${metrics.cpu.percent}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "1m", value: metrics.cpu.load1 },
                { label: "5m", value: metrics.cpu.load5 },
                { label: "15m", value: metrics.cpu.load15 },
              ].map((l) => (
                <div key={l.label} className="rounded-md bg-slate-800/50 py-1.5">
                  <div className="text-[10px] uppercase text-slate-500">{l.label}</div>
                  <div className="font-mono text-sm text-slate-200">{l.value.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl" data-testid="workervps-memory">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-200">
              <MemoryStick className="h-4 w-4 text-purple-400" aria-hidden="true" /> Memory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-mono font-semibold text-white">
                {metrics.memory.usedGb.toFixed(1)} <span className="text-slate-500 text-lg">/ {metrics.memory.totalGb} GB</span>
              </span>
              <span className="text-xs text-slate-500 font-mono">{memPercent.toFixed(0)}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <div className={`h-full ${colorForPercent(memPercent)} transition-all duration-700`} style={{ width: `${memPercent}%` }} />
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Swap: {metrics.memory.swapUsedMb} MB / {metrics.memory.swapTotalMb} MB
            </div>
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
          <CardContent className="space-y-3">
            {metrics.disks.map((d) => {
              const p = (d.usedGb / d.totalGb) * 100;
              return (
                <div key={d.fs} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-mono text-slate-300">{d.fs}</span>
                    <span className="font-mono text-slate-500">{d.usedGb} / {d.totalGb} GB</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className={`h-full ${colorForPercent(p)} transition-all duration-700`} style={{ width: `${p}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl" data-testid="workervps-docker">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-200">
              <Container className="h-4 w-4 text-cyan-400" aria-hidden="true" /> Docker
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-slate-800/50 p-3">
              <div className="text-xs text-slate-500">Running</div>
              <div className="text-2xl font-mono text-emerald-400">{metrics.docker.running}</div>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-3">
              <div className="text-xs text-slate-500">Stopped</div>
              <div className="text-2xl font-mono text-slate-300">{metrics.docker.total - metrics.docker.running}</div>
            </div>
            <div className="rounded-lg bg-slate-800/50 p-3">
              <div className="text-xs text-slate-500">Total</div>
              <div className="text-2xl font-mono text-slate-200">{metrics.docker.total}</div>
            </div>
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
            {metrics.oomCount > 0 ? (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
                <div>
                  <div className="font-mono text-2xl text-red-400">{metrics.oomCount}</div>
                  <div className="text-sm text-red-300">Out of memory events detected</div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" aria-hidden="true" />
                <div>
                  <div className="text-lg text-emerald-300">No OOM events</div>
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
            <div className="overflow-auto max-h-[400px] rounded-md border border-slate-800">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900 text-slate-500">
                  <tr>
                    <th className="text-left font-medium px-3 py-2">Name</th>
                    <th className="text-left font-medium px-3 py-2">Status</th>
                    <th className="text-right font-medium px-3 py-2">Restarts</th>
                    <th className="text-right font-medium px-3 py-2">CPU%</th>
                    <th className="text-right font-medium px-3 py-2">Memory (MB)</th>
                    <th className="text-right font-medium px-3 py-2">Uptime (h)</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.pm2.map((p) => (
                    <tr
                      key={p.name}
                      className={`border-t border-slate-800 hover:bg-slate-800/30 ${p.status !== "online" ? "bg-red-500/5" : ""}`}
                    >
                      <td className="px-3 py-2 font-mono text-slate-200">{p.name}</td>
                      <td className="px-3 py-2">
                        <Badge
                          className={
                            p.status === "online"
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : "bg-red-500/15 text-red-300 border border-red-500/30"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">{p.restarts}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">{p.cpu.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">{p.memoryMb}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">{p.uptimeHours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default Workervps;
