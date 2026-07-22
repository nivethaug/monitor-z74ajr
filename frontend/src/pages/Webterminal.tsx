import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Terminal, Server, ChevronDown, Circle, Trash2, Wifi } from "lucide-react";
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
  },
  {
    id: "worker",
    name: "Worker VPS",
    host: "worker.dreamagent.cloud",
    user: "root",
    status: "online",
    os: "Debian 12",
    uptime: "9d 2h 10m",
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
      pushOutput("Available demo commands: help, whoami, hostname, uname, date, uptime, ls, pwd, echo, clear");
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

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 p-4 md:p-6" data-testid="webterminal-page">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <Terminal className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Web Terminal</h1>
              <p className="text-xs text-slate-400">Secure shell access to your infrastructure</p>
            </div>
          </div>

          {/* VPS selector */}
          <div className="relative" data-testid="webterminal-vps-selector">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDropdownOpen((o) => !o)}
              data-testid="webterminal-vps-select-button"
              className="w-full md:w-72 justify-between bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800"
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
            >
              <span className="flex items-center gap-2">
                <Server className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <span className="text-left">
                  <span className="block text-sm font-medium leading-tight">{selected.name}</span>
                  <span className="block text-[10px] text-slate-400 leading-tight">{selected.host}</span>
                </span>
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </Button>

            {dropdownOpen && (
              <div
                role="listbox"
                className="absolute right-0 mt-2 w-72 rounded-lg border border-slate-700 bg-slate-900 shadow-xl z-20 overflow-hidden"
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
            )}
          </div>
        </div>

        {/* Connection bar */}
        <div className="flex flex-wrap items-center gap-2 mb-3" data-testid="webterminal-status-bar">
          <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 gap-1.5">
            <Wifi className="h-3 w-3" aria-hidden="true" />
            Connected
          </Badge>
          <Badge variant="outline" className="bg-slate-900 border-slate-700 text-slate-300">
            {selected.user}@{selected.host}
          </Badge>
          <Badge variant="outline" className="bg-slate-900 border-slate-700 text-slate-300">
            {selected.os}
          </Badge>
          <Badge variant="outline" className="bg-slate-900 border-slate-700 text-slate-300">
            Uptime: {selected.uptime}
          </Badge>
          <span className="ml-auto text-[11px] text-slate-500 font-mono">Demo mode — no real commands executed</span>
        </div>

        {/* Terminal window */}
        <div
          className="rounded-xl border border-slate-800 bg-black/80 shadow-2xl overflow-hidden"
          data-testid="webterminal-window"
        >
          {/* Title bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-500/80" aria-hidden="true" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/80" aria-hidden="true" />
              <span className="h-3 w-3 rounded-full bg-green-500/80" aria-hidden="true" />
              <span className="ml-3 text-xs text-slate-400 font-mono">{prompt}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLines([...BANNER.map((t) => ({ type: "system" as const, text: t }))])}
              data-testid="webterminal-clear-button"
              className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 h-7 px-2"
              aria-label="Clear terminal"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-xs">Clear</span>
            </Button>
          </div>

          {/* Terminal body */}
          <div
            ref={scrollRef}
            onClick={() => inputRef.current?.focus()}
            className="h-[420px] md:h-[480px] overflow-y-auto p-4 font-mono text-sm leading-relaxed cursor-text"
            data-testid="webterminal-body"
          >
            {lines.map((line, i) => {
              if (line.type === "system") {
                return (
                  <div key={i} className="text-slate-500 whitespace-pre-wrap">{line.text}</div>
                );
              }
              if (line.type === "input") {
                return (
                  <div key={i} className="text-slate-100 whitespace-pre-wrap">
                    <span className="text-emerald-400">{line.prompt}</span>{" "}
                    <span className="text-slate-100">{line.text}</span>
                  </div>
                );
              }
              return (
                <div key={i} className="text-slate-300 whitespace-pre-wrap">{line.text}</div>
              );
            })}

            {/* Live input line */}
            <div className="flex items-center mt-0.5">
              <span className="text-emerald-400 shrink-0">{prompt}</span>
              <span className="text-slate-100 ml-2 whitespace-pre">{input}</span>
              <span className="inline-block w-2 h-4 bg-emerald-400 ml-0.5 animate-pulse" aria-hidden="true" />
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
        <p className="mt-3 text-xs text-slate-500">
          Tip: try <code className="text-slate-300 bg-slate-900 px-1 rounded">help</code>,{" "}
          <code className="text-slate-300 bg-slate-900 px-1 rounded">whoami</code>,{" "}
          <code className="text-slate-300 bg-slate-900 px-1 rounded">ls</code>, or{" "}
          <code className="text-slate-300 bg-slate-900 px-1 rounded">uptime</code>. Use ↑/↓ for history, Ctrl+L to clear.
        </p>
      </div>
    </main>
  );
}
