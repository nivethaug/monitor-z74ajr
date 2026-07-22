import { useState, useRef, useEffect, KeyboardEvent } from "react";
import {
  Terminal,
  Server,
  ChevronDown,
  Circle,
  Trash2,
  Wifi,
  Cpu,
  MemoryStick,
  HardDrive,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type VpsOption = {
  id: string;
  name: string;
  host: string;
  user: string;
  status: "online" | "offline";
  os: string;
  uptime: string;
  region: string;
  cpu: number;
  cpuCores: number;
  memUsed: number;
  memTotal: number;
  diskUsed: number;
  diskTotal: number;
  netUp: number;
  netDown: number;
};

const VPS_OPTIONS: VpsOption[] = [
  {
    id: "main",
    name: "Main VPS",
    host: "main.dreamagent.cloud",
    user: "root",
    status: "online",
    os: "Ubuntu 22.04 LTS",
    uptime: "14d 6h 22m",
    region: "Frankfurt, DE",
    cpu: 23,
    cpuCores: 4,
    memUsed: 4.2,
    memTotal: 8,
    diskUsed: 67,
    diskTotal: 160,
    netUp: 12,
    netDown: 45,
  },
  {
    id: "worker",
    name: "Worker VPS",
    host: "worker.dreamagent.cloud",
    user: "root",
    status: "online",
    os: "Debian 12",
    uptime: "9d 2h 10m",
    region: "Amsterdam, NL",
    cpu: 8,
    cpuCores: 2,
    memUsed: 2.1,
    memTotal: 4,
    diskUsed: 31,
    diskTotal: 80,
    netUp: 4,
    netDown: 18,
  },
];

type Line = {
  type: "input" | "output" | "system";
  text: string;
  prompt?: string;
};

const BANNER = [
  "DreamAgent Web Terminal v1.0",
  "Connected securely via SSH gateway",
  "Type 'help' for available commands (demo mode — UI only)",
];

function MetricCard({
  icon,
  label,
  value,
  sub,
  pct,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  pct?: number;
  testId: string;
}) {
  const accent =
    pct === undefined
      ? "bg-sky-400"
      : pct > 85
      ? "bg-red-400"
      : pct > 65
      ? "bg-amber-400"
      : "bg-emerald-400";
  return (
    <div
      className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-2 md:px-3 md:py-2.5"
      data-testid={testId}
    >
      <div className="flex items-center gap-1 text-[9px] md:text-[10px] uppercase tracking-wide text-slate-400">
        <span className="text-slate-500" aria-hidden="true">
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-0.5 text-xs md:text-sm font-mono font-semibold text-white truncate">{value}</div>
      {sub && <div className="hidden md:block text-[10px] text-slate-500 truncate">{sub}</div>}
      {pct !== undefined && (
        <div className="mt-1 h-1 rounded-full bg-slate-800 overflow-hidden" aria-hidden="true">
          <div className={`h-full ${accent} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      )}
    </div>
  );
}

export default function Webterminal() {
  const [selectedId, setSelectedId] = useState<string>(VPS_OPTIONS[0].id);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([
    ...BANNER.map((t) => ({ type: "system" as const, text: t })),
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const selected = VPS_OPTIONS.find((v) => v.id === selectedId)!;
  const prompt = `${selected.user}@${selected.host}:~#`;

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [selectedId]);

  const pushOutput = (text: string) => {
    setLines((prev) => [...prev, { type: "output", text }]);
  };

  const runMock = (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    setLines((prev) => [...prev, { type: "input", text: cmd, prompt }]);

    if (cmd === "clear") {
      setLines([]);
      return;
    }
    if (cmd === "help") {
      pushOutput("Available demo commands: help, whoami, hostname, uname, date, uptime, ls, pwd, echo, neofetch, clear");
      return;
    }
    if (cmd === "whoami") {
      pushOutput(selected.user);
      return;
    }
    if (cmd === "hostname") {
      pushOutput(selected.host);
      return;
    }
    if (cmd === "pwd") {
      pushOutput("/root");
      return;
    }
    if (cmd === "uname") {
      pushOutput(`Linux ${selected.host} 5.15.0-91-generic #101-Ubuntu SMP x86_64 GNU/Linux`);
      return;
    }
    if (cmd === "date") {
      pushOutput(new Date().toString());
      return;
    }
    if (cmd === "uptime") {
      pushOutput(` ${new Date().toLocaleTimeString()} up ${selected.uptime},  1 user,  load average: 0.18, 0.22, 0.19`);
      return;
    }
    if (cmd === "neofetch") {
      pushOutput(`${selected.name} · ${selected.os}\nCPU ${selected.cpu}% (${selected.cpuCores} cores) · RAM ${selected.memUsed}/${selected.memTotal}GB · Disk ${selected.diskUsed}/${selected.diskTotal}GB · ${selected.region}`);
      return;
    }
    if (cmd === "ls") {
      pushOutput("projects  logs  backups  docker-compose.yml  .ssh");
      return;
    }
    if (cmd.startsWith("echo ")) {
      pushOutput(cmd.slice(5));
      return;
    }
    pushOutput(`bash: ${cmd.split(" ")[0]}: command not found (demo mode — backend not connected)`);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      runMock(input);
      if (input.trim()) {
        setHistory((h) => [...h, input]);
      }
      setHistoryIdx(-1);
      setInput("");
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const next = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(next);
      setInput(history[next]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx === -1) return;
      const next = historyIdx + 1;
      if (next >= history.length) {
        setHistoryIdx(-1);
        setInput("");
      } else {
        setHistoryIdx(next);
        setInput(history[next]);
      }
      return;
    }
    if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  const selectVps = (id: string) => {
    setSelectedId(id);
    setDropdownOpen(false);
    const v = VPS_OPTIONS.find((x) => x.id === id)!;
    setLines([
      ...BANNER.map((t) => ({ type: "system" as const, text: t })),
      { type: "system", text: `→ Switched to ${v.name} (${v.host})` },
    ]);
  };

  const memPct = Math.round((selected.memUsed / selected.memTotal) * 100);
  const diskPct = Math.round((selected.diskUsed / selected.diskTotal) * 100);

  return (
    <main
      className="h-[calc(100dvh-4rem)] bg-slate-950 text-slate-100 flex flex-col overflow-hidden"
      data-testid="webterminal-page"
    >
      <div className="flex-1 flex flex-col min-h-0 w-full max-w-6xl mx-auto p-2 md:p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-2" data-testid="webterminal-header">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shrink-0">
              <Terminal className="h-4 w-4 md:h-5 md:w-5 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm md:text-xl font-bold text-white truncate">Web Terminal</h1>
              <p className="hidden md:block text-xs text-slate-400">Secure shell access to your infrastructure</p>
            </div>
          </div>

          {/* Compact VPS selector */}
          <div className="relative shrink-0" data-testid="webterminal-vps-selector">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDropdownOpen((o) => !o)}
              data-testid="webterminal-vps-select-button"
              className="h-9 px-2.5 md:px-3 md:w-72 justify-between bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800"
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <Server className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                <span className="text-left min-w-0">
                  <span className="block text-xs md:text-sm font-medium leading-tight truncate">{selected.name}</span>
                  <span className="hidden md:block text-[10px] text-slate-400 leading-tight truncate">{selected.host}</span>
                </span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </Button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} aria-hidden="true" />
                <div
                  role="listbox"
                  className="absolute right-0 mt-2 w-[calc(100vw-1rem)] md:w-72 max-w-xs rounded-lg border border-slate-700 bg-slate-900 shadow-xl z-20 overflow-hidden"
                  data-testid="webterminal-vps-dropdown"
                >
                  {VPS_OPTIONS.map((v) => {
                    const active = v.id === selectedId;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        data-testid={`webterminal-vps-option-${v.id}`}
                        onClick={() => selectVps(v.id)}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors ${
                          active ? "bg-slate-800" : "hover:bg-slate-800/60"
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <Server className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-slate-100 truncate">{v.name}</span>
                            <span className="block text-[10px] text-slate-400 truncate">{v.host} · {v.os}</span>
                          </span>
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Circle
                            className={`h-2.5 w-2.5 ${v.status === "online" ? "text-emerald-400 fill-emerald-400" : "text-slate-600 fill-slate-600"}`}
                            aria-hidden="true"
                          />
                          {active && <span className="text-[10px] text-emerald-400 font-medium">SELECTED</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Hero section — VPS metrics */}
        <section
          className="grid grid-cols-4 gap-1.5 md:gap-3 mb-2"
          data-testid="webterminal-hero-section"
          aria-label="VPS metrics"
        >
          <MetricCard
            icon={<Cpu className="h-2.5 w-2.5" />}
            label="CPU"
            value={`${selected.cpu}%`}
            sub={`${selected.cpuCores} cores`}
            pct={selected.cpu}
            testId="webterminal-metric-cpu"
          />
          <MetricCard
            icon={<MemoryStick className="h-2.5 w-2.5" />}
            label="Memory"
            value={`${selected.memUsed}/${selected.memTotal}G`}
            sub={`${selected.memUsed} / ${selected.memTotal} GB`}
            pct={memPct}
            testId="webterminal-metric-memory"
          />
          <MetricCard
            icon={<HardDrive className="h-2.5 w-2.5" />}
            label="Disk"
            value={`${selected.diskUsed}/${selected.diskTotal}G`}
            sub={`${selected.diskUsed} / ${selected.diskTotal} GB`}
            pct={diskPct}
            testId="webterminal-metric-disk"
          />
          <MetricCard
            icon={<Wifi className="h-2.5 w-2.5" />}
            label="Network"
            value={`↑${selected.netUp} ↓${selected.netDown}`}
            sub="Mbps up / down"
            testId="webterminal-metric-network"
          />
        </section>

        {/* Connection bar — compact */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2" data-testid="webterminal-status-bar">
          <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 gap-1 text-[10px]">
            <Wifi className="h-2.5 w-2.5" aria-hidden="true" />
            Online
          </Badge>
          <Badge variant="outline" className="bg-slate-900 border-slate-700 text-slate-300 text-[10px]">
            <MapPin className="h-2.5 w-2.5" aria-hidden="true" />
            {selected.region}
          </Badge>
          <Badge variant="outline" className="hidden sm:inline-flex bg-slate-900 border-slate-700 text-slate-300 text-[10px]">
            {selected.os}
          </Badge>
          <Badge variant="outline" className="hidden sm:inline-flex bg-slate-900 border-slate-700 text-slate-300 text-[10px]">
            Uptime: {selected.uptime}
          </Badge>
          <span className="ml-auto text-[10px] text-slate-500 font-mono hidden md:inline">Demo mode — no real commands executed</span>
        </div>

        {/* Terminal window — fills remaining screen */}
        <div
          className="flex-1 min-h-0 rounded-xl border border-slate-800 bg-black/80 shadow-2xl overflow-hidden flex flex-col"
          data-testid="webterminal-window"
        >
          {/* Title bar */}
          <div className="flex items-center justify-between px-3 py-1.5 md:px-4 md:py-2 bg-slate-900/80 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" aria-hidden="true" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" aria-hidden="true" />
              <span className="ml-2 text-[10px] md:text-xs text-slate-400 font-mono truncate">{prompt}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLines([...BANNER.map((t) => ({ type: "system" as const, text: t }))])}
              data-testid="webterminal-clear-button"
              className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 h-7 px-2 shrink-0"
              aria-label="Clear terminal"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-xs hidden sm:inline">Clear</span>
            </Button>
          </div>

          {/* Terminal body */}
          <div
            ref={scrollRef}
            onClick={() => inputRef.current?.focus()}
            className="flex-1 min-h-0 overflow-y-auto p-2.5 md:p-4 font-mono text-[11px] md:text-sm leading-relaxed cursor-text"
            data-testid="webterminal-body"
          >
            {lines.map((line, i) => {
              if (line.type === "system") {
                return (
                  <div key={i} className="text-slate-500 whitespace-pre-wrap break-words">{line.text}</div>
                );
              }
              if (line.type === "input") {
                return (
                  <div key={i} className="text-slate-100 whitespace-pre-wrap break-words">
                    <span className="text-emerald-400">{line.prompt}</span>{" "}
                    <span className="text-slate-100">{line.text}</span>
                  </div>
                );
              }
              return (
                <div key={i} className="text-slate-300 whitespace-pre-wrap break-words">{line.text}</div>
              );
            })}

            {/* Live input line */}
            <div className="flex items-center mt-0.5 flex-wrap">
              <span className="text-emerald-400 shrink-0">{prompt}</span>
              <span className="text-slate-100 ml-2 whitespace-pre break-all">{input}</span>
              <span className="inline-block w-2 h-3.5 md:h-4 bg-emerald-400 ml-0.5 animate-pulse" aria-hidden="true" />
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                data-testid="webterminal-input"
                aria-label="Terminal command input"
                className="absolute opacity-0 pointer-events-none w-0 h-0"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        {/* Hint footer */}
        <p className="mt-1.5 md:mt-2 text-[10px] md:text-xs text-slate-500 shrink-0">
          Try <code className="text-slate-300 bg-slate-900 px-1 rounded">help</code>,{" "}
          <code className="text-slate-300 bg-slate-900 px-1 rounded">neofetch</code>,{" "}
          <code className="text-slate-300 bg-slate-900 px-1 rounded">ls</code>. ↑/↓ history · Ctrl+L clear.
        </p>
      </div>
    </main>
  );
}
