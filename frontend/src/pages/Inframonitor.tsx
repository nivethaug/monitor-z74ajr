import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Server,
  ServerCog,
  Container,
  Cpu,
  MemoryStick,
  Database,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Zap,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type NodeSummary = {
  hostname: string;
  role: "main" | "worker";
  status: "healthy" | "critical";
  cpuPercent: number;
  memPercent: number;
  uptimeHours: number;
};

type FleetSummary = {
  totalContainers: number;
  runningContainers: number;
  totalNodes: number;
  healthyNodes: number;
  totalConnections: number;
  activeAlerts: number;
  totalMemoryGb: number;
  usedMemoryGb: number;
  totalCpuCores: number;
};

const MOCK_NODES: NodeSummary[] = [
  { hostname: "dreamagent-main-01", role: "main", status: "healthy", cpuPercent: 34, memPercent: 57, uptimeHours: 1342 },
  { hostname: "dreamagent-worker-02", role: "worker", status: "critical", cpuPercent: 91, memPercent: 88, uptimeHours: 712 },
  { hostname: "dreamagent-worker-03", role: "worker", status: "healthy", cpuPercent: 41, memPercent: 62, uptimeHours: 540 },
  { hostname: "dreamagent-worker-04", role: "worker", status: "healthy", cpuPercent: 22, memPercent: 48, uptimeHours: 980 },
];

const MOCK_FLEET: FleetSummary = {
  totalContainers: 46,
  runningContainers: 40,
  totalNodes: 4,
  healthyNodes: 3,
  totalConnections: 42,
  activeAlerts: 1,
  totalMemoryGb: 128,
  usedMemoryGb: 74.5,
  totalCpuCores: 48,
};

const colorForPercent = (p: number) =>
  p >= 85 ? "bg-red-500" : p >= 70 ? "bg-yellow-500" : "bg-emerald-500";

const Inframonitor = () => {
  const [nodes, setNodes] = useState<NodeSummary[]>(MOCK_NODES);
  const [fleet, setFleet] = useState<FleetSummary>(MOCK_FLEET);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("inframonitor-autorefresh") === "true";
  });
  const [intervalSec, setIntervalSec] = useState<number>(30);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const refresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setNodes([...MOCK_NODES]);
      setFleet({ ...MOCK_FLEET });
      setLastUpdated(new Date().toLocaleTimeString());
      setRefreshing(false);
    }, 400);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    localStorage.setItem("inframonitor-autorefresh", String(autoRefresh));
    if (!autoRefresh) return;
    const id = window.setInterval(refresh, intervalSec * 1000);
    return () => window.clearInterval(id);
  }, [autoRefresh, intervalSec, refresh]);

  return (
    <main className="space-y-6 text-slate-100" data-testid="inframonitor-page" aria-live="polite">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 border border-slate-800">
            <Activity className="text-blue-400" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Infra Monitor</h1>
            <p className="text-sm text-slate-400">DreamAgent infrastructure command center</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {lastUpdated || "—"}
          </span>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-400">Auto-refresh</span>
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              aria-label="Toggle auto-refresh"
              data-testid="inframonitor-autorefresh-switch"
            />
            <select
              aria-label="Auto-refresh interval"
              value={intervalSec}
              onChange={(e) => setIntervalSec(Number(e.target.value))}
              className="bg-transparent text-xs text-slate-300 border-none outline-none cursor-pointer"
              data-testid="inframonitor-interval-select"
            >
              <option value={10} className="bg-slate-900">10s</option>
              <option value={30} className="bg-slate-900">30s</option>
              <option value={60} className="bg-slate-900">60s</option>
            </select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={refreshing}
            data-testid="inframonitor-refresh-button"
            className="bg-slate-900 border-slate-800 hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </Button>
        </div>
      </header>

      {fleet.activeAlerts > 0 && (
        <div
          className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 flex items-start gap-3"
          data-testid="inframonitor-alert-banner"
        >
          <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" aria-hidden="true" />
          <div>
            <div className="font-semibold text-red-300">{fleet.activeAlerts} active alert{fleet.activeAlerts > 1 ? "s" : ""}</div>
            <div className="text-sm text-red-300/80">
              dreamagent-worker-02 is in critical state — CPU 91%, memory 88%. Investigate task-runner load.
            </div>
          </div>
        </div>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl" data-testid="inframonitor-kpi-nodes">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-slate-500">Nodes</span>
              <Server className="h-4 w-4 text-slate-500" aria-hidden="true" />
            </div>
            <div className="mt-2 text-2xl font-mono text-white">
              {fleet.healthyNodes}<span className="text-slate-600 text-lg">/{fleet.totalNodes}</span>
            </div>
            <div className="text-xs text-emerald-400 mt-1">healthy</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl" data-testid="inframonitor-kpi-containers">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-slate-500">Containers</span>
              <Container className="h-4 w-4 text-slate-500" aria-hidden="true" />
            </div>
            <div className="mt-2 text-2xl font-mono text-white">
              {fleet.runningContainers}<span className="text-slate-600 text-lg">/{fleet.totalContainers}</span>
            </div>
            <div className="text-xs text-cyan-400 mt-1">running</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl" data-testid="inframonitor-kpi-memory">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-slate-500">Memory</span>
              <MemoryStick className="h-4 w-4 text-slate-500" aria-hidden="true" />
            </div>
            <div className="mt-2 text-2xl font-mono text-white">
              {fleet.usedMemoryGb.toFixed(1)}<span className="text-slate-600 text-lg">/{fleet.totalMemoryGb} GB</span>
            </div>
            <div className="text-xs text-purple-400 mt-1">{((fleet.usedMemoryGb / fleet.totalMemoryGb) * 100).toFixed(0)}% used</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl" data-testid="inframonitor-kpi-cores">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase text-slate-500">CPU Cores</span>
              <Cpu className="h-4 w-4 text-slate-500" aria-hidden="true" />
            </div>
            <div className="mt-2 text-2xl font-mono text-white">{fleet.totalCpuCores}</div>
            <div className="text-xs text-blue-400 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" aria-hidden="true" /> across fleet
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl" data-testid="inframonitor-nodes">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-200">
              <Server className="h-4 w-4 text-blue-400" aria-hidden="true" /> Node Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {nodes.map((n) => (
                <div
                  key={n.hostname}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 hover:border-slate-700 transition-colors"
                  data-testid={`inframonitor-node-${n.hostname}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {n.role === "main" ? (
                        <Server className="h-4 w-4 text-blue-400 shrink-0" aria-hidden="true" />
                      ) : (
                        <ServerCog className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />
                      )}
                      <h3 className="font-mono text-sm text-slate-100 truncate">{n.hostname}</h3>
                    </div>
                    <Badge
                      className={
                        n.status === "healthy"
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          : "bg-red-500/15 text-red-300 border border-red-500/30"
                      }
                    >
                      {n.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-500 uppercase">CPU</span>
                        <span className="font-mono text-slate-300">{n.cpuPercent.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div className={`h-full ${colorForPercent(n.cpuPercent)} transition-all duration-700`} style={{ width: `${n.cpuPercent}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-500 uppercase">Mem</span>
                        <span className="font-mono text-slate-300">{n.memPercent.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div className={`h-full ${colorForPercent(n.memPercent)} transition-all duration-700`} style={{ width: `${n.memPercent}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3 w-3" aria-hidden="true" /> {n.uptimeHours.toLocaleString()}h uptime
                    <span className="mx-1">·</span>
                    <Zap className="h-3 w-3" aria-hidden="true" /> {n.role}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl" data-testid="inframonitor-db">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-200">
              <Database className="h-4 w-4 text-indigo-400" aria-hidden="true" /> Postgres
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-indigo-500/10">
              <Database className="h-6 w-6 text-indigo-400" aria-hidden="true" />
            </div>
            <div>
              <div className="text-2xl font-mono text-white">{fleet.totalConnections}</div>
              <div className="text-xs text-slate-500">active connections</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl" data-testid="inframonitor-alerts">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-slate-200">
              <AlertTriangle className="h-4 w-4 text-red-400" aria-hidden="true" /> Alert Status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" aria-hidden="true" />
            </div>
            <div>
              <div className="text-2xl font-mono text-white">{fleet.activeAlerts}</div>
              <div className="text-xs text-slate-500">active alerts across fleet</div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default Inframonitor;
