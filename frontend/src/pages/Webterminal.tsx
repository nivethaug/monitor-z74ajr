import {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  useMemo,
  useCallback,
} from "react";
import {
  Server,
  ChevronDown,
  Search,
  Filter,
  Send,
  Terminal,
  Copy,
  Check,
  Trash2,
  Star,
  Pin,
  RotateCcw,
  Play,
  Pencil,
  Share2,
  Download,
  Maximize2,
  Minimize2,
  X,
  ChevronUp,
  ArrowUp,
  Circle,
  Zap,
  MoreHorizontal,
  Signal,
  Loader2,
  Ban,
  Clock,
  Wifi,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ----------------------------- Types ----------------------------- */

type VpsOption = {
  id: string;
  name: string;
  host: string;
  user: string;
  status: "online" | "offline";
  os: string;
  region: string;
  latency: number;
};

const VPS_OPTIONS: VpsOption[] = [
  {
    id: "main",
    name: "Main VPS",
    host: "main.dreamagent.cloud",
    user: "root",
    status: "online",
    os: "Ubuntu 22.04 LTS",
    region: "Frankfurt, DE",
    latency: 38,
  },
  {
    id: "worker",
    name: "Worker VPS",
    host: "worker.dreamagent.cloud",
    user: "deploy",
    status: "online",
    os: "Debian 12",
    region: "Amsterdam, NL",
    latency: 52,
  },
];

type CmdStatus = "running" | "completed" | "error";

type Message = {
  id: string;
  command: string;
  output: string;
  exitCode: number | null;
  status: CmdStatus;
  timestamp: number;
  duration: number | null;
  pinned: boolean;
  isWarning?: boolean;
};

type TimelineEvent = {
  id: string;
  kind: "connect" | "disconnect" | "reconnect" | "key-change" | "info";
  text: string;
  timestamp: number;
};

type FilterKind = "all" | "errors" | "warnings" | "commands";

const COLLAPSE_THRESHOLD = 20;

const QUICK_CHIPS = [
  "docker ps",
  "pm2 list",
  "htop",
  "df -h",
  "free -m",
  "journalctl -u nginx --since '1 hour ago'",
  "systemctl status nginx",
  "git pull",
];

const DEFAULT_FAVOURITES = [
  { id: "f1", label: "Restart nginx", command: "systemctl restart nginx" },
  { id: "f2", label: "Restart PM2", command: "pm2 restart all" },
  { id: "f3", label: "Docker logs", command: "docker logs app --tail 100" },
  { id: "f4", label: "Git pull", command: "git pull --rebase origin main" },
  { id: "f5", label: "Deploy", command: "bash deploy.sh" },
];

/* ----------------------- Mock command engine ---------------------- */

function mockResult(cmd: string, vps: VpsOption): { output: string; exitCode: number; error?: boolean; warning?: boolean } {
  const c = cmd.trim();
  const base = c.split(/[ \t]/)[0];
  const user = vps.user;
  const host = vps.host;

  if (c === "help") {
    return {
      exitCode: 0,
      output: [
        "DreamAgent Shell — demo mode (no real SSH backend connected).",
        "",
        "Try these raw commands:",
        "  docker ps              list running containers",
        "  pm2 list               show PM2 process table",
        "  htop                   interactive process viewer (snapshot)",
        "  df -h                  disk usage",
        "  free -m                memory usage",
        "  systemctl status nginx service status",
        "  journalctl -u nginx    recent service logs",
        "  git pull               pull latest",
        "  npm install            install deps",
        "  ls -la                 long listing",
        "  whoami / hostname / pwd / uname / date / uptime",
        "  clear                  clear conversation",
      ].join("\n"),
    };
  }

  if (c === "clear" || c === "cls") return { exitCode: 0, output: "" };

  if (c === "whoami") return { exitCode: 0, output: user };
  if (c === "hostname") return { exitCode: 0, output: host };
  if (c === "pwd") return { exitCode: 0, output: `/home/${user}` };
  if (c === "date") return { exitCode: 0, output: new Date().toString() };
  if (c === "uname") return { exitCode: 0, output: `Linux ${host} 5.15.0-91-generic #101-Ubuntu SMP x86_64 GNU/Linux` };
  if (c === "uptime")
    return {
      exitCode: 0,
      output: ` ${new Date().toLocaleTimeString()} up 14 days,  6:22,  1 user,  load average: 0.18, 0.22, 0.19`,
    };
  if (c === "echo " + "" || c.startsWith("echo "))
    return { exitCode: 0, output: c.slice(5) };

  if (c === "ls" || c === "ls -la" || c.startsWith("ls -")) {
    return {
      exitCode: 0,
      output: [
        "total 48",
        "drwxr-xr-x  6 root root 4096 Jul 20 09:12 .",
        "drwxr-xr-x 18 root root 4096 Jul 18 22:04 ..",
        "-rw-r--r--  1 root root  310 Jul 19 11:02 deploy.sh",
        "-rw-r--r--  1 root root 1284 Jul 18 22:10 docker-compose.yml",
        "drwxr-xr-x  3 root root 4096 Jul 20 08:55 logs",
        "drwxr-xr-x  4 root root 4096 Jul 19 23:41 projects",
        "drwxr-xr-x  2 root root 4096 Jul 18 22:04 .ssh",
      ].join("\n"),
    };
  }

  if (c === "docker ps" || c.startsWith("docker ps")) {
    return {
      exitCode: 0,
      output: [
        "CONTAINER ID   IMAGE                  STATUS         PORTS                  NAMES",
        "a1b2c3d4e5f6   nginx:alpine           Up 3 days      0.0.0.0:80->80/tcp     nginx",
        "9f8e7d6c5b4a   postgres:15            Up 3 days      5432/tcp               db",
        "1234abcd5678   node:20-alpine         Up 11 hours    0.0.0.0:3000->3000/tcp app",
        "0fedcba98765   redis:7-alpine         Up 3 days      6379/tcp               cache",
      ].join("\n"),
    };
  }

  if (c === "pm2 list" || c.startsWith("pm2 list") || c === "pm2 ls") {
    return {
      exitCode: 0,
      output: [
        "┌────┬─────────────────┬───────────────┬────────┐",
        "│ id│ name            │ status        │ cpu    │",
        "├────┼─────────────────┼───────────────┼────────┤",
        "│ 0  │ api             │ online        │ 2.1%   │",
        "│ 1  │ worker          │ online        │ 0.8%   │",
        "│ 2  │ scheduler       │ online        │ 1.4%   │",
        "│ 3  │ websocket       │ online        │ 0.3%   │",
        "└────┴─────────────────┴───────────────┴────────┘",
      ].join("\n"),
    };
  }

  if (c.startsWith("htop")) {
    return {
      exitCode: 0,
      output: [
        "  CPU[|||||||||||||||     68.7%]   Tasks: 142, 4 thr; 1 running",
        "  Mem[|||||||||||         4.2/8G]  Load average: 0.42 0.38 0.31",
        "  Swp[                       0/0]  Uptime: 14d 6h 22m",
        "",
        "    PID USER      PRI  NI  VIRT   RES   SHR S CPU%  MEM%   TIME+  Command",
        "   1247 root       20   0  412M  88M  24M  S  3.2  1.1  12:48.91 nginx",
        "   2103 postgres  20   0  980M 210M  18M  S  2.1  2.6  48:12.33 postgres",
        "   3391 node      20   0  720M 165M  30M  S  1.8  2.0  33:50.12 node api",
        "   4502 redis     20   0  120M  18M  8M   S  0.4  0.2   8:21.50 redis-server",
      ].join("\n"),
    };
  }

  if (c.startsWith("df -h") || c === "df") {
    return {
      exitCode: 0,
      output: [
        "Filesystem      Size  Used Avail Use% Mounted on",
        "/dev/vda1       160G   67G   85G  45% /",
        "tmpfs           4.0G     0  4.0G   0% /dev/shm",
        "/dev/vdb1       100G   12G   83G  13% /data",
      ].join("\n"),
    };
  }

  if (c === "free -m" || c.startsWith("free ")) {
    return {
      exitCode: 0,
      output: [
        "               total        used        free      shared  buff/cache   available",
        "Mem:           8192        4300        1102         284        2789        3300",
        "Swap:          2048           0        2048",
      ].join("\n"),
    };
  }

  if (c.startsWith("systemctl status")) {
    const svc = c.replace("systemctl status", "").trim() || "nginx";
    return {
      exitCode: 0,
      output: [
        `● ${svc}.service - ${svc} reverse proxy server`,
        "     Loaded: loaded (/lib/systemd/system/nginx.service; enabled)",
        "     Active: active (running) since Mon 2024-07-08 10:14:22 UTC",
        "       Docs: man:nginx(8)",
        "   Main PID: 1247 (nginx)",
        "      Tasks: 9 (limit: 4915)",
        "     Memory: 88.4M",
        "        CPU: 12min 48.910s",
      ].join("\n"),
    };
  }

  if (c.startsWith("systemctl restart")) {
    return { exitCode: 0, output: "" };
  }

  if (c.startsWith("journalctl")) {
    return {
      exitCode: 0,
      warning: true,
      output: [
        "Jul 20 14:32:01 main nginx[1247]: 192.168.1.10 - GET /api/health 200 12ms",
        "Jul 20 14:32:04 main nginx[1247]: 203.0.113.5 - POST /api/login 401 8ms",
        "Jul 20 14:32:09 main nginx[1247]: warning: worker_connections (1024) approaching limit",
        "Jul 20 14:32:14 main nginx[1247]: 198.51.100.7 - GET / 200 4ms",
        "Jul 20 14:32:18 main nginx[1247]: 192.168.1.10 - GET /api/metrics 200 18ms",
        "Jul 20 14:32:22 main nginx[1247]: 203.0.113.9 - GET /favicon.ico 404 2ms",
        "Jul 20 14:32:27 main nginx[1247]: 198.51.100.2 - GET /dashboard 200 22ms",
        "Jul 20 14:32:31 main nginx[1247]: warning: upstream response time slow (2.1s)",
      ].join("\n"),
    };
  }

  if (c === "git pull" || c.startsWith("git pull")) {
    return {
      exitCode: 0,
      output: [
        "remote: Enumerating objects: 48, done.",
        "remote: Counting objects: 100% (48/48), done.",
        "remote: Compressing objects: 100% (12/12), done.",
        "remote: Total 36 (delta 28), reused 32 (delta 24)",
        "Unpacking objects: 100% (36/36), 248 KiB | 4.2 MiB/s, done.",
        "From github.com:dreamagent/monitor",
        "   7a3f1c2..b9d4e8a  main       -> origin/main",
        "Updating 7a3f1c2..b9d4e8a",
        "Fast-forward",
        " src/pages/Webterminal.tsx | 384 +++++++++++++++++++++++++++++++",
        " 1 file changed, 384 insertions(+), 0 deletions(-)",
      ].join("\n"),
    };
  }

  if (c === "npm install" || c.startsWith("npm install") || c.startsWith("npm i ")) {
    return {
      exitCode: 0,
      output: [
        "added 312 packages, and audited 313 packages in 8s",
        "42 packages are looking for funding",
        "  run `npm fund` for details",
        "found 0 vulnerabilities",
      ].join("\n"),
    };
  }

  if (c.startsWith("neofetch")) {
    return {
      exitCode: 0,
      output: [
        `       _..._       ${user}@${host}`,
        "     .-'_..._''.   ----------------------",
        `   .' .'      '.\\  OS: ${vps.os}`,
        "  / .'           Kernel: 5.15.0-91-generic",
        " . '             Uptime: 14d 6h 22m",
        " | |             CPU: 4 cores @ 68.7%",
        " | |             Memory: 4.2/8 GB",
        ` '. '            Region: ${vps.region}`,
        "  \\ '.          ",
      ].join("\n"),
    };
  }

  // unknown command
  return {
    exitCode: 127,
    error: true,
    output: `bash: ${base}: command not found`,
  };
}

/* ----------------------- Syntax highlighter ---------------------- */

function highlightLine(line: string, idx: number, lineNumbers: boolean, raw: boolean): React.ReactNode {
  const content = raw ? (
    line
  ) : (
    <>
      {tokenize(line)}
    </>
  );
  if (!lineNumbers) return <>{content}{"\n"}</>;
  return (
    <span className="flex">
      <span className="select-none text-slate-600 pr-3 text-right inline-block w-8 shrink-0">{idx + 1}</span>
      <span className="whitespace-pre">{content}</span>
    </span>
  );
}

function tokenize(line: string): React.ReactNode {
  // clickable URLs
  const urlMatch = line.match(/(https?:\/\/[^\s)]+)/);
  if (urlMatch) {
    const url = urlMatch[0];
    const i = line.indexOf(url);
    return (
      <>
        {line.slice(0, i)}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-sky-400 underline decoration-sky-700 hover:text-sky-300"
        >
          {url}
        </a>
        {line.slice(i + url.length)}
      </>
    );
  }
  const lower = line.toLowerCase();
  if (/^(error|fatal|panic|traceback|bash:)/i.test(line) || /command not found/i.test(line))
    return <span className="text-rose-400">{line}</span>;
  if (/warning|warn/i.test(line) && !/active/i.test(line))
    return <span className="text-amber-300">{line}</span>;
  if (/\b(401|403|404|500|502|503)\b/.test(line) && /http|get|post|put|delete/i.test(lower))
    return <span className="text-amber-300">{line}</span>;
  return <span className="text-slate-200">{line}</span>;
}

/* ------------------------- Helper hooks -------------------------- */

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function fmtDuration(seconds: number) {
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  return `${seconds.toFixed(1)}s`;
}

function fmtSession(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ============================= Component ========================= */

export default function Webterminal() {
  const [selectedId, setSelectedId] = useState<string>(VPS_OPTIONS[0].id);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const selected = VPS_OPTIONS.find((v) => v.id === selectedId)!;

  const [messages, setMessages] = useState<Message[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const [multiline, setMultiline] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKind>("all");
  const [favsOpen, setFavsOpen] = useState(false);
  const [favourites, setFavourites] = useState(DEFAULT_FAVOURITES);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [wordWrap, setWordWrap] = useState(true);
  const [lineNumbers, setLineNumbers] = useState(false);
  const [rawMode, setRawMode] = useState(false);
  const [fullscreenId, setFullscreenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const sessionStart = useRef(Date.now());
  const now = useNow(1000);
  const sessionDuration = now - sessionStart.current;

  // live latency fluctuation
  const [latency, setLatency] = useState(selected.latency);
  useEffect(() => {
    setLatency(selected.latency);
    const t = setInterval(() => {
      setLatency((l) => Math.max(18, Math.min(180, l + Math.round((Math.random() - 0.5) * 14))));
    }, 2500);
    return () => clearInterval(t);
  }, [selectedId, selected.latency]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const activeTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---- welcome timeline ---- */
  useEffect(() => {
    setTimeline([
      {
        id: uid(),
        kind: "connect",
        text: `SSH connected to ${selected.host} as ${selected.user}`,
        timestamp: Date.now(),
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- autoscroll on new content ---- */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, timeline]);

  useEffect(() => {
    if (!searchOpen && !favsOpen) inputRef.current?.focus();
  }, [searchOpen, favsOpen]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  }, []);

  /* ---- run command with simulated streaming ---- */
  const runCommand = useCallback(
    (raw: string) => {
      const cmd = raw.trim();
      if (!cmd) return;
      if (cmd === "clear" || cmd === "cls") {
        setMessages([]);
        setTimeline((t) => [
          ...t,
          { id: uid(), kind: "info", text: "Conversation cleared", timestamp: Date.now() },
        ]);
        return;
      }

      const id = uid();
      const msg: Message = {
        id,
        command: cmd,
        output: "",
        exitCode: null,
        status: "running",
        timestamp: Date.now(),
        duration: null,
        pinned: false,
      };
      setMessages((m) => [...m, msg]);
      setHistory((h) => (h[h.length - 1] === cmd ? h : [...h, cmd]));
      setHistoryIdx(-1);

      const result = mockResult(cmd, selected);
      const lines = result.output.split("\n");
      const start = Date.now();

      if (activeTimer.current) clearInterval(activeTimer.current);
      let lineIdx = 0;
      activeTimer.current = setInterval(() => {
        lineIdx = Math.min(lineIdx + 1, lines.length);
        const partial = lines.slice(0, lineIdx).join("\n");
        setMessages((m) => m.map((x) => (x.id === id ? { ...x, output: partial } : x)));
        if (lineIdx >= lines.length) {
          if (activeTimer.current) clearInterval(activeTimer.current);
          activeTimer.current = null;
          const duration = (Date.now() - start) / 1000;
          setMessages((m) =>
            m.map((x) =>
              x.id === id
                ? {
                    ...x,
                    output: result.output,
                    exitCode: result.exitCode,
                    status: result.error ? "error" : "completed",
                    duration,
                    isWarning: result.warning,
                  }
                : x
            )
          );
        }
      }, 45);
    },
    [selected]
  );

  /* ---- cancel running command (Ctrl+C) ---- */
  const cancelRunning = useCallback(() => {
    if (activeTimer.current) {
      clearInterval(activeTimer.current);
      activeTimer.current = null;
    }
    setMessages((m) =>
      m.map((x) =>
        x.status === "running"
          ? { ...x, status: "error", exitCode: 130, duration: 0, output: x.output + "\n^C" }
          : x
      )
    );
  }, []);

  /* ---- input handling ---- */
  const submit = () => {
    if (!input.trim()) return;
    runCommand(input);
    setInput("");
    setMultiline(false);
  };

  const onInputKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === "c") {
      // only treat as cancel if input empty; otherwise let copy work
      if (input.trim() === "") {
        e.preventDefault();
        cancelRunning();
        showToast("Interrupted (Ctrl+C)");
      }
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      setMessages([]);
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
    if (e.key === "Tab") {
      e.preventDefault();
      const cands = QUICK_CHIPS.filter((q) => q.startsWith(input.trim()));
      if (cands.length > 0) setInput(cands[0]);
    }
  };

  /* ---- VPS switch ---- */
  const selectVps = (id: string) => {
    if (id === selectedId) {
      setDropdownOpen(false);
      return;
    }
    const v = VPS_OPTIONS.find((x) => x.id === id)!;
    setSelectedId(id);
    setDropdownOpen(false);
    setTimeline((t) => [
      ...t,
      { id: uid(), kind: "disconnect", text: `Disconnected from ${selected.host}`, timestamp: Date.now() },
      { id: uid(), kind: "reconnect", text: `Reconnected to ${v.host} as ${v.user}`, timestamp: Date.now() },
    ]);
    if (activeTimer.current) clearInterval(activeTimer.current);
  };

  /* ---- command actions ---- */
  const copyToClipboard = (text: string, id?: string) => {
    navigator.clipboard?.writeText(text).then(
      () => {
        if (id) {
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 1200);
        }
        showToast("Copied to clipboard");
      },
      () => showToast("Copy failed")
    );
  };

  const downloadOutput = (m: Message) => {
    const blob = new Blob([`$ ${m.command}\n\n${m.output}\n\nexit ${m.exitCode} · ${m.duration ?? 0}s\n`], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cmd-${m.id.slice(0, 6)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Output downloaded");
  };

  const shareCmd = (m: Message) => {
    const text = `$ ${m.command}`;
    if (navigator.share) {
      navigator.share({ title: "DreamAgent Shell", text }).catch(() => {});
    } else {
      copyToClipboard(text);
    }
  };

  const togglePin = (id: string) => {
    setMessages((m) => m.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x)));
  };

  const deleteMessage = (id: string) => {
    setMessages((m) => m.filter((x) => x.id !== id));
    setMenuOpenId(null);
  };

  const runAgain = (cmd: string) => {
    runCommand(cmd);
    setMenuOpenId(null);
  };

  const editAndRun = (cmd: string) => {
    setInput(cmd);
    setMultiline(true);
    setMenuOpenId(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  /* ---- search filtering ---- */
  const visibleMessages = useMemo(() => {
    return messages.filter((m) => {
      if (filter === "errors" && m.status !== "error") return false;
      if (filter === "warnings" && !m.isWarning) return false;
      if (filter === "commands") return true;
      if (search.trim()) {
        const q = search.toLowerCase();
        return m.command.toLowerCase().includes(q) || m.output.toLowerCase().includes(q);
      }
      return true;
    });
  }, [messages, filter, search]);

  const pinnedMessages = useMemo(() => messages.filter((m) => m.pinned), [messages]);

  /* ---- group messages by day for timeline separators ---- */
  const renderConversation = () => {
    const nodes: React.ReactNode[] = [];
    let lastLabel = "";
    let msgCounter = 0;
    const allItems: Array<{ type: "msg"; m: Message; key: string } | { type: "event"; e: TimelineEvent; key: string }> = [
      ...timeline.map((e) => ({ type: "event" as const, e, key: "e-" + e.id })),
      ...visibleMessages.map((m) => ({ type: "msg" as const, m, key: "m-" + m.id })),
    ].sort((a, b) => {
      const aT = a.type === "msg" ? a.m.timestamp : a.e.timestamp;
      const bT = b.type === "msg" ? b.m.timestamp : b.e.timestamp;
      return aT - bT;
    });

    for (const item of allItems) {
      if (item.type === "event") {
        nodes.push(<TimelineSeparator key={item.key} event={item.e} />);
        continue;
      }
      const m = item.m;
      const label = new Date(m.timestamp).toLocaleDateString();
      if (label !== lastLabel) {
        lastLabel = label;
        const isToday = new Date().toLocaleDateString() === label;
        nodes.push(<DateSeparator key={"d-" + label} label={isToday ? "Today" : label} />);
      }
      msgCounter++;
      nodes.push(
        <ChatRow
          key={item.key}
          message={m}
          user={selected.user}
          host={selected.host}
          menuOpen={menuOpenId === m.id}
          onToggleMenu={() => setMenuOpenId(menuOpenId === m.id ? null : m.id)}
          onCopy={() => copyToClipboard(m.command, m.id)}
          onRunAgain={() => runAgain(m.command)}
          onEdit={() => editAndRun(m.command)}
          onPin={() => {
            togglePin(m.id);
            setMenuOpenId(null);
          }}
          onDelete={() => deleteMessage(m.id)}
          onShare={() => shareCmd(m)}
          copied={copiedId === m.id}
          onCloseMenu={() => setMenuOpenId(null)}
          expanded={!!expanded[m.id]}
          onExpandToggle={() => setExpanded((e) => ({ ...e, [m.id]: !e[m.id] }))}
          onCopyOutput={() => copyToClipboard(m.output, m.id)}
          onDownload={() => downloadOutput(m)}
          onFullscreen={() => {
            setFullscreenId(m.id);
            setMenuOpenId(null);
          }}
          wordWrap={wordWrap}
          lineNumbers={lineNumbers}
          rawMode={rawMode}
          copiedOutput={copiedId === m.id + "-out"}
          onCopyOutputMarked={() => copyToClipboard(m.output, m.id + "-out")}
        />
      );
    }

    if (nodes.length === 0) {
      return <EmptyState />;
    }
    return nodes;
  };

  const fullscreenMsg = messages.find((m) => m.id === fullscreenId) || null;

  return (
    <main
      className="h-[calc(100dvh-4rem)] bg-slate-950 text-slate-100 flex flex-col overflow-hidden relative"
      data-testid="webterminal-page"
    >
      {/* ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(900px 400px at 15% -5%, rgba(16,185,129,0.10), transparent 60%), radial-gradient(700px 400px at 100% 0%, rgba(56,189,248,0.10), transparent 55%)",
        }}
      />

      {/* ============ Glass Header ============ */}
      <header
        className="relative z-20 shrink-0 backdrop-blur-xl bg-slate-950/70 border-b border-slate-800/80"
        data-testid="webterminal-header"
      >
        <div className="w-full max-w-5xl mx-auto px-3 md:px-5 py-2.5 flex items-center gap-2">
          {/* VPS selector */}
          <div className="relative shrink-0" data-testid="webterminal-vps-selector">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDropdownOpen((o) => !o)}
              data-testid="webterminal-vps-select-button"
              className="h-9 px-2.5 md:px-3 md:w-60 justify-between bg-slate-900/80 border-slate-700 text-slate-100 hover:bg-slate-800"
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
              aria-label="Select server"
            >
              <span className="flex items-center gap-2 min-w-0">
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
                  className="absolute left-0 mt-2 w-[calc(100vw-1.5rem)] md:w-72 max-w-xs rounded-xl border border-slate-700 bg-slate-900 shadow-2xl z-20 overflow-hidden"
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

          {/* Connection status chips */}
          <div className="flex items-center gap-1.5 shrink-0" data-testid="webterminal-status-bar">
            <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 gap-1 text-[10px]">
              <Wifi className="h-3 w-3" aria-hidden="true" />
              SSH
            </Badge>
            <Badge variant="outline" className="hidden sm:inline-flex bg-slate-900/70 border-slate-700 text-slate-300 text-[10px] gap-1">
              <Signal className="h-3 w-3" aria-hidden="true" />
              {latency}ms
            </Badge>
            <Badge variant="outline" className="hidden md:inline-flex bg-slate-900/70 border-slate-700 text-slate-300 text-[10px] gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {fmtSession(sessionDuration)}
            </Badge>
          </div>

          <div className="flex-1" />

          {/* Action toggles */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setFavsOpen(false);
              setSearchOpen((o) => !o);
            }}
            data-testid="webterminal-search-toggle"
            className={`h-9 px-2.5 ${searchOpen ? "bg-slate-800 text-emerald-300" : "text-slate-300 hover:bg-slate-800/60"}`}
            aria-label="Search commands"
            aria-expanded={searchOpen}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchOpen(false);
              setFavsOpen((o) => !o);
            }}
            data-testid="webterminal-favourites-toggle"
            className={`h-9 px-2.5 ${favsOpen ? "bg-slate-800 text-amber-300" : "text-slate-300 hover:bg-slate-800/60"}`}
            aria-label="Favourite commands"
            aria-expanded={favsOpen}
          >
            <Star className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="w-full max-w-5xl mx-auto px-3 md:px-5 pb-2.5 flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1" data-testid="webterminal-search-panel">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" aria-hidden="true" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search commands and output..."
                aria-label="Search commands and output"
                data-testid="webterminal-search-input"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-900/80 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-700 rounded-lg p-0.5" role="group" aria-label="Filter results">
              {([
                { k: "all", label: "All" },
                { k: "errors", label: "Errors" },
                { k: "warnings", label: "Warnings" },
                { k: "commands", label: "Commands" },
              ] as { k: FilterKind; label: string }[]).map((f) => (
                <button
                  key={f.k}
                  type="button"
                  onClick={() => setFilter(f.k)}
                  data-testid={`webterminal-filter-${f.k}`}
                  className={`px-2.5 h-8 rounded-md text-xs font-medium transition-colors ${
                    filter === f.k ? "bg-slate-700 text-emerald-300" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Favourites bar */}
        {favsOpen && (
          <div className="w-full max-w-5xl mx-auto px-3 md:px-5 pb-2.5 animate-in fade-in slide-in-from-top-1" data-testid="webterminal-favourites-panel">
            <div className="flex items-center gap-2 mb-1.5">
              <Star className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Favourite commands</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {favourites.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setInput(f.command);
                    setMultiline(f.command.includes("\n"));
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                  data-testid={`webterminal-fav-${f.id}`}
                  className="group flex items-center gap-2 pl-2.5 pr-1 h-8 rounded-lg bg-slate-900/80 border border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 transition-colors"
                >
                  <span className="text-xs font-medium text-slate-100">{f.label}</span>
                  <span className="font-mono text-[10px] text-slate-500 group-hover:text-slate-300 hidden sm:inline truncate max-w-[180px]">{f.command}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${f.label} from favourites`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFavourites((fs) => fs.filter((x) => x.id !== f.id));
                    }}
                    className="ml-1 p-0.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </button>
              ))}
              {favourites.length === 0 && <span className="text-xs text-slate-500">No favourites yet. Pin a command to add it here.</span>}
            </div>
            {pinnedMessages.length > 0 && (
              <>
                <div className="flex items-center gap-2 mt-3 mb-1.5">
                  <Pin className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Pinned from session</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pinnedMessages.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => runAgain(m.command)}
                      className="flex items-center gap-2 pl-2.5 pr-2 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 transition-colors"
                    >
                      <Pin className="h-3 w-3 text-sky-400" aria-hidden="true" />
                      <span className="font-mono text-[11px] text-sky-200 truncate max-w-[240px]">{m.command}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* ============ Conversation ============ */}
      <div
        ref={scrollRef}
        className="relative z-10 flex-1 min-h-0 overflow-y-auto"
        data-testid="webterminal-body"
      >
        <div className="w-full max-w-5xl mx-auto px-3 md:px-5 py-4 space-y-1">
          {renderConversation()}
        </div>
      </div>

      {/* ============ Quick chips ============ */}
      <div className="relative z-20 shrink-0 border-t border-slate-800/80 bg-slate-950/70 backdrop-blur-xl" data-testid="webterminal-quick-chips">
        <div className="w-full max-w-5xl mx-auto px-2 md:px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium shrink-0 hidden sm:inline pr-1">Quick</span>
          {QUICK_CHIPS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setInput(q);
                setMultiline(q.length > 22);
                setTimeout(() => inputRef.current?.focus(), 30);
              }}
              data-testid={`webterminal-chip-${q.split(/\s+/).join("-")}`}
              className="shrink-0 px-2.5 h-7 rounded-full bg-slate-900/80 border border-slate-700 text-[11px] font-mono text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300 hover:bg-slate-800 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ============ Sticky Composer ============ */}
      <div className="relative z-20 shrink-0 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 px-3 md:px-5 py-2.5" data-testid="webterminal-composer">
        <div className="w-full max-w-5xl mx-auto">
          <div
            className={`flex items-end gap-2 rounded-2xl border bg-slate-900/80 border-slate-700 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all ${
              multiline ? "items-stretch" : ""
            }`}
          >
            <div className="pl-3 pt-2.5 select-none text-emerald-400 font-mono text-sm shrink-0">$</div>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setMultiline(e.target.value.includes("\n") || e.target.value.length > 60);
              }}
              onKeyDown={onInputKey}
              rows={multiline ? 4 : 1}
              data-testid="webterminal-input"
              aria-label="Shell command input"
              placeholder="Type a shell command…"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className={`flex-1 bg-transparent resize-none py-2 pr-2 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none ${
                multiline ? "" : "h-9"
              }`}
            />
            <div className="flex items-center gap-1 pr-1.5 pb-1.5 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setMultiline((m) => !m)}
                data-testid="webterminal-multiline-toggle"
                className="h-9 w-9 p-0 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                aria-label="Toggle multi-line editor"
                aria-pressed={multiline}
              >
                {multiline ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
              </Button>
              {messages.some((m) => m.status === "running") && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={cancelRunning}
                  data-testid="webterminal-cancel-button"
                  className="h-9 px-2.5 text-rose-400 hover:bg-rose-500/10"
                  aria-label="Interrupt running command"
                >
                  <Ban className="h-4 w-4" aria-hidden="true" />
                  <span className="text-xs hidden sm:inline">Ctrl+C</span>
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={submit}
                disabled={!input.trim()}
                data-testid="webterminal-send-button"
                className="h-9 w-9 sm:w-auto sm:px-4 p-0 sm:p-0 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold disabled:opacity-40 disabled:hover:bg-emerald-500"
                aria-label="Run command"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only sm:ml-1.5 text-xs">Run</span>
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-slate-500">
            <span className="hidden sm:inline">
              <kbd className="font-mono">Enter</kbd> run · <kbd className="font-mono">Shift+Enter</kbd> newline · <kbd className="font-mono">↑/↓</kbd> history · <kbd className="font-mono">Tab</kbd> complete
            </span>
            <span className="sm:hidden">Tap a chip to insert</span>
            <button
              type="button"
              onClick={() => {
                setWordWrap((w) => !w);
                showToast(wordWrap ? "Word wrap off" : "Word wrap on");
              }}
              data-testid="webterminal-wordwrap-toggle"
              className={`font-mono px-1.5 py-0.5 rounded ${wordWrap ? "text-emerald-300 bg-emerald-500/10" : "text-slate-500 hover:text-slate-300"}`}
            >
              wrap {wordWrap ? "on" : "off"}
            </button>
          </div>
        </div>
      </div>

      {/* ============ Fullscreen output modal ============ */}
      {fullscreenMsg && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen command output"
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col p-3 md:p-6"
          data-testid="webterminal-fullscreen"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Terminal className="h-5 w-5 text-emerald-400 shrink-0" aria-hidden="true" />
              <span className="font-mono text-sm text-slate-100 truncate">{fullscreenMsg.command}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(fullscreenMsg.output)}
                className="text-slate-300 hover:bg-slate-800"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs ml-1.5 hidden sm:inline">Copy</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setFullscreenId(null)}
                data-testid="webterminal-fullscreen-close"
                className="text-slate-300 hover:bg-slate-800"
                aria-label="Close fullscreen"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0 rounded-xl border border-slate-800 bg-black/80 overflow-auto p-4 font-mono text-sm">
            <OutputContent
              output={fullscreenMsg.output}
              wordWrap={wordWrap}
              lineNumbers={lineNumbers}
              rawMode={rawMode}
            />
          </div>
        </div>
      )}

      {/* ============ Toast ============ */}
      {toast && (
        <div
          aria-live="polite"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-100 shadow-xl"
        >
          {toast}
        </div>
      )}
    </main>
  );
}

/* ====================== Sub-components =========================== */

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-3" role="separator" aria-label={label}>
      <div className="flex-1 h-px bg-slate-800" />
      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">{label}</span>
      <div className="flex-1 h-px bg-slate-800" />
    </div>
  );
}

function TimelineSeparator({ event }: { event: TimelineEvent }) {
  const color =
    event.kind === "disconnect"
      ? "text-rose-400 border-rose-500/30 bg-rose-500/5"
      : event.kind === "reconnect"
      ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5"
      : event.kind === "key-change"
      ? "text-amber-400 border-amber-500/30 bg-amber-500/5"
      : "text-slate-400 border-slate-700 bg-slate-900/40";
  return (
    <div className="flex items-center justify-center py-2.5">
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-medium ${color}`} data-testid={`webterminal-timeline-event-${event.kind}`}>
        <Activity className="h-3 w-3" aria-hidden="true" />
        <span>{event.text}</span>
        <span className="text-slate-500">{fmtTime(event.timestamp)}</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16" data-testid="webterminal-empty">
      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-slate-700 flex items-center justify-center mb-4">
        <Terminal className="h-7 w-7 text-emerald-400" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold text-slate-100 mb-1">Ready when you are</h2>
      <p className="text-sm text-slate-400 max-w-sm">
        Type a real shell command below or tap a quick chip. Every command becomes its own chat bubble with live output.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1.5 mt-5 max-w-md">
        {["docker ps", "pm2 list", "df -h", "systemctl status nginx"].map((q) => (
          <span key={q} className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-300">
            $ {q}
          </span>
        ))}
      </div>
    </div>
  );
}

function ChatRow(props: {
  message: Message;
  user: string;
  host: string;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCopy: () => void;
  onRunAgain: () => void;
  onEdit: () => void;
  onPin: () => void;
  onDelete: () => void;
  onShare: () => void;
  copied: boolean;
  onCloseMenu: () => void;
  expanded: boolean;
  onExpandToggle: () => void;
  onCopyOutput: () => void;
  onDownload: () => void;
  onFullscreen: () => void;
  wordWrap: boolean;
  lineNumbers: boolean;
  rawMode: boolean;
  copiedOutput: boolean;
  onCopyOutputMarked: () => void;
}) {
  const m = props.message;
  const lines = m.output.split("\n");
  const isLong = lines.length > COLLAPSE_THRESHOLD;
  const shownLines = props.expanded || !isLong ? lines : lines.slice(0, COLLAPSE_THRESHOLD);
  const isRunning = m.status === "running";
  const isError = m.status === "error";
  const prompt = `${props.user}@${props.host}:~$`;

  return (
    <div className="flex flex-col gap-1.5 py-1.5">
      {/* Command bubble — right aligned */}
      <div className="flex justify-end">
        <div
          className="group relative max-w-[92%] sm:max-w-[78%] rounded-2xl rounded-br-md bg-gradient-to-br from-emerald-600/90 to-emerald-700/90 border border-emerald-500/40 shadow-lg shadow-emerald-900/20 px-3.5 py-2"
          data-testid={`webterminal-cmd-bubble-${m.id.slice(0, 6)}`}
        >
          <div className="flex items-start gap-2">
            <span className="text-emerald-200 font-mono text-sm select-none">$</span>
            <code className="font-mono text-sm text-white whitespace-pre-wrap break-words flex-1">{m.command}</code>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-emerald-200/70 font-mono">{prompt}</span>
            <span className="text-[10px] text-emerald-200/70">{fmtTime(m.timestamp)}</span>
          </div>

          {/* command action menu trigger */}
          <button
            type="button"
            onClick={props.onToggleMenu}
            aria-label="Command actions"
            aria-haspopup="menu"
            aria-expanded={props.menuOpen}
            className="absolute -left-9 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-100 hover:bg-slate-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex items-center justify-center"
            data-testid={`webterminal-cmd-menu-${m.id.slice(0, 6)}`}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>

          {props.menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={props.onCloseMenu} aria-hidden="true" />
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 z-40 w-44 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
                data-testid={`webterminal-cmd-menu-panel-${m.id.slice(0, 6)}`}
              >
                <MenuItem onClick={props.onCopy} icon={props.copied ? <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />} label="Copy" />
                <MenuItem onClick={props.onRunAgain} icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />} label="Run again" />
                <MenuItem onClick={props.onEdit} icon={<Pencil className="h-4 w-4" aria-hidden="true" />} label="Edit & run" />
                <MenuItem onClick={props.onPin} icon={m.pinned ? <Pin className="h-4 w-4 text-sky-400" aria-hidden="true" /> : <Pin className="h-4 w-4" aria-hidden="true" />} label={m.pinned ? "Unpin" : "Pin"} />
                <MenuItem onClick={props.onShare} icon={<Share2 className="h-4 w-4" aria-hidden="true" />} label="Share" />
                <div className="h-px bg-slate-800" />
                <MenuItem onClick={props.onDelete} icon={<Trash2 className="h-4 w-4 text-rose-400" aria-hidden="true" />} label="Delete" danger />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Output bubble — left aligned */}
      {(m.output || isRunning) && (
        <div className="flex justify-start">
          <div
            className={`w-full sm:w-[88%] rounded-2xl rounded-bl-md border bg-slate-950/90 shadow-lg overflow-hidden ${
              isError
                ? "border-rose-500/40 shadow-rose-900/10"
                : m.isWarning
                ? "border-amber-500/40 shadow-amber-900/10"
                : "border-slate-800 shadow-slate-950/40"
            }`}
            data-testid={`webterminal-out-bubble-${m.id.slice(0, 6)}`}
          >
            {/* output toolbar */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/70 border-b border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                {isRunning ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-emerald-400" aria-hidden="true" />
                    <span>Running…</span>
                  </>
                ) : isError ? (
                  <>
                    <X className="h-3 w-3 text-rose-400" aria-hidden="true" />
                    <span className="text-rose-300">Exit {m.exitCode}</span>
                    {m.duration != null && <span className="text-slate-500">· {fmtDuration(m.duration)}</span>}
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-300">Exit {m.exitCode}</span>
                    {m.duration != null && <span className="text-slate-500">· {fmtDuration(m.duration)}</span>}
                  </>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                <ToolbarButton onClick={props.onCopyOutputMarked} label="Copy output" testid={`webterminal-out-copy-${m.id.slice(0, 6)}`}>
                  {props.copiedOutput ? <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                </ToolbarButton>
                <ToolbarButton onClick={props.onDownload} label="Download">
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                </ToolbarButton>
                <ToolbarButton onClick={props.onFullscreen} label="Fullscreen">
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                </ToolbarButton>
              </div>
            </div>

            {/* output body */}
            <div className="px-3 py-2.5 overflow-x-auto">
              <OutputContent
                output={shownLines.join("\n")}
                wordWrap={props.wordWrap}
                lineNumbers={props.lineNumbers}
                rawMode={props.rawMode}
              />
            </div>

            {/* expand button */}
            {isLong && (
              <button
                type="button"
                onClick={props.onExpandToggle}
                data-testid={`webterminal-out-expand-${m.id.slice(0, 6)}`}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium text-slate-300 hover:text-emerald-300 hover:bg-slate-800/50 border-t border-slate-800/80 transition-colors"
              >
                {props.expanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> Expand output ({lines.length - COLLAPSE_THRESHOLD} more lines)
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OutputContent({
  output,
  wordWrap,
  lineNumbers,
  rawMode,
}: {
  output: string;
  wordWrap: boolean;
  lineNumbers: boolean;
  rawMode: boolean;
}) {
  const lines = output.split("\n");
  return (
    <pre
      className={`font-mono text-[11px] sm:text-xs leading-relaxed text-slate-200 ${
        wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"
      }`}
    >
      {lines.map((line, i) => (
        <div key={i}>{highlightLine(line, i, lineNumbers, rawMode)}</div>
      ))}
    </pre>
  );
}

function MenuItem({
  onClick,
  icon,
  label,
  danger,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-slate-800 ${
        danger ? "text-rose-300" : "text-slate-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ToolbarButton({
  onClick,
  label,
  testid,
  children,
}: {
  onClick: () => void;
  label: string;
  testid?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-testid={testid}
      className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
    >
      {children}
    </button>
  );
}
