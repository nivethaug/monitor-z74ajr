import { useState, useMemo } from "react";
import { Container, Cpu, MemoryStick, Hash, Search, RefreshCw, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DockerContainer = {
  id: string;
  name: string;
  userId: string;
  running: boolean;
  cpuPercent: number;
  memoryMb: number;
  pids: number;
  lastUsed: string;
  workspacePath: string;
};

const MOCK_CONTAINERS: DockerContainer[] = [
  { id: "c1", name: "dreamagent-user-24", userId: "24", running: true, cpuPercent: 18.2, memoryMb: 512, pids: 142, lastUsed: "2026-07-20 16:42", workspacePath: "/workspace/users/24/project-alpha" },
  { id: "c2", name: "dreamagent-user-107", userId: "107", running: true, cpuPercent: 64.8, memoryMb: 1820, pids: 312, lastUsed: "2026-07-20 16:58", workspacePath: "/workspace/users/107/llm-eval-suite" },
  { id: "c3", name: "dreamagent-user-3", userId: "3", running: false, cpuPercent: 0, memoryMb: 0, pids: 0, lastUsed: "2026-07-20 09:12", workspacePath: "/workspace/users/3/legacy-bot" },
  { id: "c4", name: "dreamagent-user-58", userId: "58", running: true, cpuPercent: 9.4, memoryMb: 280, pids: 88, lastUsed: "2026-07-20 17:01", workspacePath: "/workspace/users/58/scraper" },
  { id: "c5", name: "dreamagent-user-91", userId: "91", running: true, cpuPercent: 88.1, memoryMb: 3200, pids: 478, lastUsed: "2026-07-20 17:03", workspacePath: "/workspace/users/91/training-pipeline" },
  { id: "c6", name: "dreamagent-user-12", userId: "12", running: true, cpuPercent: 22.3, memoryMb: 640, pids: 156, lastUsed: "2026-07-20 16:50", workspacePath: "/workspace/users/12/api-tools" },
  { id: "c7", name: "dreamagent-user-44", userId: "44", running: false, cpuPercent: 0, memoryMb: 0, pids: 0, lastUsed: "2026-07-19 22:40", workspacePath: "/workspace/users/44/nightly-job" },
  { id: "c8", name: "dreamagent-user-203", userId: "203", running: true, cpuPercent: 41.7, memoryMb: 1100, pids: 224, lastUsed: "2026-07-20 16:59", workspacePath: "/workspace/users/203/data-cleanup" },
];

const pidColor = (pids: number) =>
  pids > 400 ? "bg-red-500" : pids >= 200 ? "bg-yellow-500" : "bg-emerald-500";

const Dockerfleet = () => {
  const [containers, setContainers] = useState<DockerContainer[]>(MOCK_CONTAINERS);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return containers;
    return containers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.userId.includes(q)
    );
  }, [containers, query]);

  const runningCount = containers.filter((c) => c.running).length;
  const totalPids = containers.reduce((sum, c) => sum + c.pids, 0);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setContainers([...MOCK_CONTAINERS]);
      setRefreshing(false);
    }, 400);
  };

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
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          data-testid="dockerfleet-refresh-button"
          className="bg-slate-900 border-slate-800 hover:bg-slate-800"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </Button>
      </header>

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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-600"
            data-testid="dockerfleet-search-input"
          />
        </div>
        <span className="text-xs text-slate-500">{filtered.length} shown</span>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="dockerfleet-grid">
        {filtered.map((c) => (
          <Card
            key={c.id}
            className="bg-slate-900/80 border-slate-800 backdrop-blur-xl hover:border-slate-700 hover:shadow-lg hover:shadow-slate-950/50 transition-all duration-300"
            data-testid={`dockerfleet-container-${c.id}`}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${c.running ? "bg-emerald-500" : "bg-slate-600"}`} />
                    <h2 className="font-mono text-sm text-slate-100 truncate">{c.name}</h2>
                  </div>
                </div>
                <Badge className="bg-blue-500/15 text-blue-300 border border-blue-500/30 shrink-0">UID {c.userId}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md bg-slate-800/40 p-2">
                  <div className="flex items-center gap-1 text-[10px] uppercase text-slate-500">
                    <Cpu className="h-3 w-3" aria-hidden="true" /> CPU
                  </div>
                  <div className="font-mono text-sm text-slate-200">{c.cpuPercent.toFixed(1)}%</div>
                </div>
                <div className="rounded-md bg-slate-800/40 p-2">
                  <div className="flex items-center gap-1 text-[10px] uppercase text-slate-500">
                    <MemoryStick className="h-3 w-3" aria-hidden="true" /> Memory
                  </div>
                  <div className="font-mono text-sm text-slate-200">{c.memoryMb} MB</div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] uppercase text-slate-500 mb-1">
                  <span className="flex items-center gap-1"><Hash className="h-3 w-3" aria-hidden="true" /> PIDs</span>
                  <span className="font-mono text-slate-400">{c.pids}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full ${pidColor(c.pids)} transition-all duration-500`}
                    style={{ width: `${Math.min(100, (c.pids / 500) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-1">
                <div className="text-[10px] uppercase text-slate-500">Last used</div>
                <div className="font-mono text-xs text-slate-400">{c.lastUsed}</div>
                <div className="font-mono text-xs text-slate-600 truncate" title={c.workspacePath}>{c.workspacePath}</div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500" data-testid="dockerfleet-empty">
            No containers match your search.
          </div>
        )}
      </section>
    </main>
  );
};

export default Dockerfleet;
