import { useMemo, useState } from "react";
import { Container, Cpu, MemoryStick, Hash, Search, Activity, RefreshCw, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useMetrics } from "@/lib/metrics-context";

const hasError = (block: any): block is { error: string } =>
  block && typeof block === "object" && "error" in block && Object.keys(block).length <= 2;

const pidColor = (pids: number) =>
  pids > 400 ? "bg-red-500" : pids >= 200 ? "bg-yellow-500" : "bg-emerald-500";

function parseCpuPercent(cpu: unknown): number | null {
  if (typeof cpu === "number") return cpu;
  if (typeof cpu === "string") {
    const n = parseFloat(cpu.replace("%", "").trim());
    return isNaN(n) ? null : n;
  }
  return null;
}

const Dockerfleet = () => {
  const { data, loading, error, lastUpdated } = useMetrics();
  const worker = data?.worker;
  const docker = worker && !hasError(worker.docker) ? worker.docker : null;

  const containers: any[] = useMemo(() => {
    if (!docker || docker.available === false) return [];
    return Array.isArray(docker.containers) ? docker.containers : [];
  }, [docker]);

  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return containers;
    return containers.filter((c: any) => {
      const name = (c.name || "").toLowerCase();
      const uid = String(c.user_id ?? "");
      return name.includes(q) || uid.includes(q);
    });
  }, [containers, searchTerm]);

  const runningCount = containers.filter((c: any) => c.status === "running").length;
  const totalPids = containers.reduce((sum: number, c: any) => sum + (c.pid_count || 0), 0);

  if (loading && !docker) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400" data-testid="dockerfleet-page">
        <RefreshCw className="animate-spin mr-2" aria-hidden="true" />
        Loading Docker fleet...
      </div>
    );
  }

  if (error && !docker) {
    return (
      <div className="flex items-center justify-center h-full text-red-400" data-testid="dockerfleet-page">
        <AlertTriangle className="mr-2" aria-hidden="true" />
        {error}
      </div>
    );
  }

  return (
    <main className="space-y-6 text-slate-100" data-testid="dockerfleet-page" aria-live="polite">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-slate-800">
            <Container className="text-cyan-400" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Docker Fleet</h1>
            <p className="text-sm text-slate-400">Per-user container runtime overview</p>
            {lastUpdated && (
              <p className="text-xs text-slate-500 mt-0.5">Last updated: {lastUpdated}</p>
            )}
          </div>
        </div>
      </header>

      {docker && hasError(worker?.docker) ? (
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl">
          <CardContent className="p-4 text-sm text-red-400">Docker metrics unavailable</CardContent>
        </Card>
      ) : docker && docker.available === false ? (
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl">
          <CardContent className="p-4 text-sm text-slate-500">Docker not available on worker VPS</CardContent>
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl" data-testid="dockerfleet-summary-total">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800/60">
                  <Container className="h-5 w-5 text-slate-300" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-xs uppercase text-slate-500">Total Containers</div>
                  <div className="text-2xl font-mono text-white">{containers.length}</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl" data-testid="dockerfleet-summary-running">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Activity className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-xs uppercase text-slate-500">Running</div>
                  <div className="text-2xl font-mono text-emerald-400">{runningCount}</div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl" data-testid="dockerfleet-summary-pids">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Hash className="h-5 w-5 text-purple-400" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-xs uppercase text-slate-500">Total PIDs</div>
                  <div className="text-2xl font-mono text-purple-300">{totalPids.toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" aria-hidden="true" />
              <Input
                aria-label="Search containers by name or user ID"
                placeholder="Search containers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-600"
                data-testid="dockerfleet-search-input"
              />
            </div>
            <span className="text-xs text-slate-500">{filtered.length} shown</span>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="dockerfleet-grid">
            {filtered.map((c: any, idx: number) => {
              const cpu = parseCpuPercent(c.cpu);
              const pids = typeof c.pid_count === "number" ? c.pid_count : 0;
              return (
                <Card
                  key={`${c.name}-${idx}`}
                  className="bg-slate-900/80 border-slate-800 backdrop-blur-xl hover:border-slate-700 hover:shadow-lg hover:shadow-slate-950/50 transition-all duration-300"
                  data-testid={`dockerfleet-container-${c.name || idx}`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${c.status === "running" ? "bg-emerald-500" : "bg-slate-600"}`}
                          />
                          <h2 className="font-mono text-sm text-slate-100 truncate">{c.name || "N/A"}</h2>
                        </div>
                      </div>
                      <Badge className="bg-blue-500/15 text-blue-300 border border-blue-500/30 shrink-0">
                        UID {c.user_id ?? "N/A"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-slate-800/40 p-2">
                        <div className="flex items-center gap-1 text-[10px] uppercase text-slate-500">
                          <Cpu className="h-3 w-3" aria-hidden="true" /> CPU
                        </div>
                        <div className="font-mono text-sm text-slate-200">
                          {cpu !== null ? `${cpu.toFixed(1)}%` : "N/A"}
                        </div>
                      </div>
                      <div className="rounded-md bg-slate-800/40 p-2">
                        <div className="flex items-center gap-1 text-[10px] uppercase text-slate-500">
                          <MemoryStick className="h-3 w-3" aria-hidden="true" /> Memory
                        </div>
                        <div className="font-mono text-sm text-slate-200">{c.mem_usage || "N/A"}</div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] uppercase text-slate-500 mb-1">
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" aria-hidden="true" /> PIDs
                        </span>
                        <span className="font-mono text-slate-400">{pids}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full ${pidColor(pids)} transition-all duration-500`}
                          style={{ width: `${Math.min(100, (pids / 500) * 100)}%` }}
                        />
                      </div>
                      {(() => {
                        const bd = c.pid_breakdown;
                        if (!bd || typeof bd !== "object" || Object.keys(bd).length === 0) return null;
                        const entries = Object.entries(bd)
                          .map(([name, count]) => [name, Number(count)] as [string, number])
                          .filter(([, n]) => Number.isFinite(n) && n > 0)
                          .sort((a, b) => b[1] - a[1]);
                        if (entries.length === 0) return null;
                        return (
                          <ul
                            className="mt-2 flex flex-wrap gap-1"
                            data-testid={`dockerfleet-container-${c.name || idx}-pid-breakdown`}
                          >
                            {entries.map(([name, count]) => (
                              <li
                                key={name}
                                className="inline-flex items-center gap-1 rounded bg-slate-800/60 px-1.5 py-0.5 text-[10px] font-mono text-slate-300"
                                title={`${name}: ${count} process${count === 1 ? "" : "es"}`}
                              >
                                <span className="text-slate-400">{name}</span>
                                <span className="text-slate-500">·</span>
                                <span className="text-slate-200">{count}</span>
                              </li>
                            ))}
                          </ul>
                        );
                      })()}
                    </div>

                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <div className="text-[10px] uppercase text-slate-500">Last used</div>
                      <div className="font-mono text-xs text-slate-400">{c.last_used_at || "N/A"}</div>
                      <div
                        className="font-mono text-xs text-slate-600 truncate"
                        title={c.workspace_path || ""}
                      >
                        {c.workspace_path || "N/A"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-500" data-testid="dockerfleet-empty">
                No containers reported. Click Refresh to load.
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
};

export default Dockerfleet;
