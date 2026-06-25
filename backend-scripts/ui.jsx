// Shared UI primitives. Exposes to window.SCS_UI.
(function () {
  const { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } = React;
  const H = window.SCS_HELPERS;

  // ---- Icon (lucide UMD wrapper) ----
  // lucide v0.460 exposes icons as IconNode tuples: ['svg', svgAttrs, [['path', attrs], ...]]
  // OR just the children array. We render to an SVG string ourselves.
  function nodeToSvg(node, extra) {
    if (!Array.isArray(node)) return "";
    const [tag, attrs, children] = node;
    const finalAttrs = tag === "svg" && extra ? { ...attrs, ...extra } : attrs;
    const a = Object.entries(finalAttrs || {}).map(([k,v]) => `${k}="${String(v).replace(/"/g,"&quot;")}"`).join(" ");
    const inner = Array.isArray(children) ? children.map(c => nodeToSvg(c)).join("") : "";
    return `<${tag} ${a}>${inner}</${tag}>`;
  }
  function childrenToSvg(children, extra) {
    const a = Object.entries(extra).map(([k,v]) => `${k}="${v}"`).join(" ");
    const inner = (children || []).map(c => nodeToSvg(c)).join("");
    return `<svg ${a}>${inner}</svg>`;
  }
  function toPascal(s) { return s.split("-").map(p => p[0].toUpperCase()+p.slice(1)).join(""); }

  // Cache resolved icons
  const _iconCache = {};
  function resolveIcon(name) {
    if (_iconCache[name] !== undefined) return _iconCache[name];
    const ic = window.lucide?.icons || {};
    const pascal = toPascal(name);
    const candidate = ic[pascal] || ic[name] || ic[name.toLowerCase()];
    _iconCache[name] = candidate || null;
    return _iconCache[name];
  }

  function Icon({ name, size = 16, className = "", strokeWidth = 1.75, ...rest }) {
    const ref = useRef(null);
    useEffect(() => {
      if (!ref.current) return;
      const ic = resolveIcon(name);
      if (!ic) { ref.current.innerHTML = ""; return; }
      const svgDefaults = {
        xmlns: "http://www.w3.org/2000/svg",
        width: size, height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": strokeWidth,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        class: "lucide lucide-" + name,
      };
      let svgStr;
      if (Array.isArray(ic) && typeof ic[0] === "string" && ic[0] === "svg") {
        // Full IconNode tuple ['svg', attrs, children]
        svgStr = nodeToSvg(ic, svgDefaults);
      } else if (Array.isArray(ic) && Array.isArray(ic[0])) {
        // Just an array of children tuples
        svgStr = childrenToSvg(ic, svgDefaults);
      } else if (typeof ic === "object" && ic !== null && Array.isArray(ic.children)) {
        svgStr = childrenToSvg(ic.children, svgDefaults);
      } else if (typeof ic === "object" && ic !== null && Array.isArray(ic[2])) {
        // ['svg', attrs, children] but shape detection failed above
        svgStr = nodeToSvg(ic, svgDefaults);
      } else {
        svgStr = "";
      }
      ref.current.innerHTML = svgStr;
    }, [name, size, strokeWidth, className]);
    return <span ref={ref} className={"inline-flex items-center justify-center " + className} {...rest} />;
  }

  // ---- Avatar ----
  function Avatar({ name, size = 32, ringColor }) {
    const color = H.avatarColor(name);
    const initials = H.initials(name);
    return (
      <span className="inline-flex items-center justify-center rounded-full font-semibold text-ink-900 select-none"
        style={{
          width: size, height: size, background: color, fontSize: size * 0.40,
          boxShadow: ringColor ? `0 0 0 2px ${ringColor}` : "0 0 0 1px rgba(255,255,255,0.05)",
          letterSpacing: "-0.02em",
        }}>
        {initials}
      </span>
    );
  }

  // ---- Card ----
  function Card({ className = "", children, padded = true, ...rest }) {
    return (
      <div className={"bg-ink-800 border border-ink-700 rounded-xl shadow-card " + (padded ? "p-5 " : "") + className} {...rest}>
        {children}
      </div>
    );
  }

  // ---- Rank badge ----
  function RankBadge({ rank, size = "md" }) {
    const sizes = { sm: "h-5 w-5 text-[10px]", md: "h-7 w-7 text-xs", lg: "h-9 w-9 text-sm" };
    if (rank === 1) {
      return <span className={`inline-flex items-center justify-center rounded-md font-bold text-ink-900 mono ${sizes[size]}`}
        style={{ background: "linear-gradient(135deg, #FFD86B 0%, #E8B84A 50%, #B8862A 100%)" }}>1</span>;
    }
    if (rank === 2) {
      return <span className={`inline-flex items-center justify-center rounded-md font-bold text-ink-900 mono ${sizes[size]}`}
        style={{ background: "linear-gradient(135deg, #E6E8EC 0%, #B6BBC8 50%, #8B93A7 100%)" }}>2</span>;
    }
    if (rank === 3) {
      return <span className={`inline-flex items-center justify-center rounded-md font-bold text-ink-900 mono ${sizes[size]}`}
        style={{ background: "linear-gradient(135deg, #E8A55C 0%, #C7853F 50%, #8E5A1F 100%)" }}>3</span>;
    }
    return <span className={`inline-flex items-center justify-center rounded-md font-medium text-ink-300 mono ${sizes[size]} bg-ink-750 border border-ink-700`}>{rank}</span>;
  }

  // ---- Pill / badge ----
  function Pill({ children, tone = "neutral", className = "" }) {
    const tones = {
      neutral: "bg-ink-700 text-ink-200 border-ink-600",
      pitch:   "bg-pitch/10 text-pitch border-pitch/30",
      orange:  "bg-orange-cap/10 text-orange-cap border-orange-cap/30",
      purple:  "bg-purple-cap/10 text-purple-cap border-purple-cap/30",
      red:     "bg-danger/10 text-danger border-danger/30",
      live:    "bg-danger/10 text-danger border-danger/30",
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 h-6 rounded-md text-[11px] font-medium border ${tones[tone]} ${className}`}>
        {children}
      </span>
    );
  }

  // ---- KPI / Stat block ----
  function Stat({ label, value, unit, sublabel, tone, icon }) {
    const toneColor = { up: "text-up", down: "text-down", pitch: "text-pitch", orange: "text-orange-cap", purple: "text-purple-cap" }[tone] || "text-ink-100";
    return (
      <div className="flex flex-col gap-1">
        <div className="text-[10px] uppercase tracking-[0.14em] text-ink-400 flex items-center gap-1.5 font-semibold">
          {icon && <Icon name={icon} size={11} />}
          {label}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`mono font-bold text-2xl leading-none ${toneColor}`}>{value}</span>
          {unit && <span className="text-ink-300 text-xs mono">{unit}</span>}
        </div>
        {sublabel && <div className="text-[11px] text-ink-400">{sublabel}</div>}
      </div>
    );
  }

  // ---- Table primitives ----
  function Table({ children, className = "" }) {
    return <table className={"w-full text-sm border-collapse " + className}>{children}</table>;
  }
  function Th({ children, sortable, dir, onClick, align="left", className="", width }) {
    const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
    return (
      <th
        onClick={sortable ? onClick : undefined}
        style={width ? { width } : undefined}
        className={`sticky top-0 z-10 bg-ink-850 backdrop-blur text-[10px] uppercase tracking-[0.14em] text-ink-300 font-semibold px-3 py-2.5 border-b border-ink-700 ${alignCls} ${sortable ? 'cursor-pointer hover:text-ink-100 select-none' : ''} ${className}`}>
        <span className="inline-flex items-center gap-1">
          {children}
          {sortable && (
            <span className="text-ink-500">
              {dir === "asc" ? "↑" : dir === "desc" ? "↓" : "↕"}
            </span>
          )}
        </span>
      </th>
    );
  }
  function Td({ children, align="left", className="", mono=false }) {
    const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
    return (
      <td className={`px-3 py-2.5 border-b border-ink-800 ${alignCls} ${mono?'mono':''} ${className}`}>
        {children}
      </td>
    );
  }

  // ---- Sortable table hook ----
  function useSort(initialKey, initialDir = "desc") {
    const [sort, setSort] = useState({ key: initialKey, dir: initialDir });
    const toggle = useCallback((key) => {
      setSort(s => s.key === key ? ({ key, dir: s.dir === "asc" ? "desc" : "asc" }) : ({ key, dir: "desc" }));
    }, []);
    return { sort, toggle };
  }

  // ---- Sparkline (tiny inline svg) ----
  function Sparkline({ data, color = "#A6E04C", width = 80, height = 24 }) {
    if (!data || data.length < 2) return <span className="text-ink-500 mono text-xs">—</span>;
    const min = Math.min(...data), max = Math.max(...data);
    const dx = width / (data.length - 1);
    const pts = data.map((v, i) => {
      const x = i * dx;
      const y = max === min ? height/2 : height - ((v - min) / (max - min)) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return (
      <svg width={width} height={height} className="inline-block align-middle">
        <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} strokeLinecap="round" strokeLinejoin="round" />
        <polyline fill={`${color}22`} stroke="none"
          points={`0,${height} ${pts} ${width},${height}`} />
      </svg>
    );
  }

  // ---- Filters context + bar ----
  const FilterContext = createContext(null);
  function useFilters() { return useContext(FilterContext); }

  const presets = {
    "all":    { label: "All time", days: null },
    "year":   { label: "This year", days: 365 },
    "month":  { label: "Last 30d", days: 30 },
    "week":   { label: "Last 7d", days: 7 },
  };

  function FilterProvider({ children }) {
    const [state, setState] = useState({
      preset: "all",
      from: null, to: null,
      tournamentIds: [],   // [] = all
      clubIds: [],
      teamIds: [],
      isBox: "any",        // any | yes | no
      minBalls: 20,
      minOvers: 4,
      search: "",
    });
    const set = useCallback((patch) => setState(s => ({ ...s, ...patch })), []);
    const reset = useCallback(() => setState({
      preset: "all", from: null, to: null,
      tournamentIds: [], clubIds: [], teamIds: [],
      isBox: "any", minBalls: 20, minOvers: 4, search: "",
    }), []);

    // derive date range
    const range = useMemo(() => {
      const now = new Date(window.SCS_DATA.asOf);
      if (state.preset === "all") return { from: null, to: null };
      const p = presets[state.preset];
      if (!p) return { from: null, to: null };
      const from = new Date(now.getTime() - p.days * 86400000);
      return { from, to: now };
    }, [state.preset]);

    return (
      <FilterContext.Provider value={{ state, set, reset, range, presets }}>
        {children}
      </FilterContext.Provider>
    );
  }

  // ---- Filter Bar ----
  function FilterBar({ showMinBalls, showMinOvers, compact = false }) {
    const { state, set, reset } = useFilters();
    const data = window.SCS_DATA;
    const [open, setOpen] = useState(null); // dropdown name

    const tournamentLabel = state.tournamentIds.length === 0 ? "All tournaments" : `${state.tournamentIds.length} selected`;
    const clubLabel = state.clubIds.length === 0 ? "All clubs" : `${state.clubIds.length} selected`;
    const teamLabel = state.teamIds.length === 0 ? "All teams" : `${state.teamIds.length} selected`;

    return (
      <div className="sticky top-[57px] z-30 bg-ink-900/85 backdrop-blur-md border-b border-ink-700">
        <div className="px-6 py-3 flex items-center gap-2 flex-wrap">
          {/* Date preset */}
          <div className="inline-flex items-center bg-ink-800 border border-ink-700 rounded-lg overflow-hidden">
            {Object.entries(presets).map(([k, v]) => (
              <button key={k} onClick={() => set({ preset: k })}
                className={`px-2.5 h-8 text-xs font-medium border-r border-ink-700 last:border-r-0 ${state.preset === k ? 'bg-ink-700 text-ink-100' : 'text-ink-300 hover:bg-ink-750'}`}>
                {v.label}
              </button>
            ))}
          </div>

          <FilterDropdown
            isOpen={open === "tournament"} onToggle={() => setOpen(open === "tournament" ? null : "tournament")}
            icon="trophy" label="Tournament" value={tournamentLabel}
            options={data.tournaments.map(t => ({ id: t.id, label: t.name, sub: t.isBoxCricket ? "BOX" : null }))}
            selected={state.tournamentIds}
            onChange={(ids) => set({ tournamentIds: ids })}
          />
          {!window.SCS_CURRENT_CLUB_ID && (
            <FilterDropdown
              isOpen={open === "club"} onToggle={() => setOpen(open === "club" ? null : "club")}
              icon="building" label="Club" value={clubLabel}
              options={data.clubs.map(c => ({ id: c.id, label: c.name }))}
              selected={state.clubIds}
              onChange={(ids) => set({ clubIds: ids })}
            />
          )}
          <FilterDropdown
            isOpen={open === "team"} onToggle={() => setOpen(open === "team" ? null : "team")}
            icon="shield" label="Team" value={teamLabel}
            options={data.teams.map(t => ({ id: t.id, label: t.teamName, sub: data.clubsById[t.clubId]?.name }))}
            selected={state.teamIds}
            onChange={(ids) => set({ teamIds: ids })}
          />

          {/* Box toggle */}
          <div className="inline-flex items-center bg-ink-800 border border-ink-700 rounded-lg overflow-hidden">
            <span className="px-2.5 h-8 inline-flex items-center text-[11px] uppercase tracking-wider text-ink-400 border-r border-ink-700 font-semibold">Box</span>
            {[["any","Any"],["yes","On"],["no","Off"]].map(([k,l]) => (
              <button key={k} onClick={() => set({ isBox: k })}
                className={`px-2.5 h-8 text-xs font-medium border-r border-ink-700 last:border-r-0 ${state.isBox === k ? 'bg-ink-700 text-ink-100' : 'text-ink-300 hover:bg-ink-750'}`}>
                {l}
              </button>
            ))}
          </div>

          {/* Player search */}
          <div className="relative">
            <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={state.search}
              onChange={(e) => set({ search: e.target.value })}
              placeholder="Search players, teams..."
              className="bg-ink-800 border border-ink-700 rounded-lg h-8 pl-7 pr-3 text-sm w-56 focus-ring placeholder:text-ink-500" />
          </div>

          {showMinBalls && (
            <ThresholdControl
              label="Min balls"
              value={state.minBalls}
              onChange={(v) => set({ minBalls: v })}
              min={0} max={300} step={10}
            />
          )}
          {showMinOvers && (
            <ThresholdControl
              label="Min overs"
              value={state.minOvers}
              onChange={(v) => set({ minOvers: v })}
              min={0} max={60} step={1}
            />
          )}

          <div className="flex-1" />
          <button onClick={reset}
            className="h-8 px-2.5 text-xs text-ink-300 hover:text-ink-100 hover:bg-ink-800 rounded-lg inline-flex items-center gap-1.5">
            <Icon name="refresh-cw" size={12} /> Reset
          </button>
          <span className="text-[10px] text-ink-400 mono uppercase tracking-wider hidden lg:inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-pitch animate-pulse" />
            As of {new Date(data.asOf).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}
          </span>
        </div>
      </div>
    );
  }

  function FilterDropdown({ icon, label, value, options, selected, onChange, isOpen, onToggle }) {
    const ref = useRef(null);
    useEffect(() => {
      function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) onToggle && (isOpen ? onToggle() : null); }
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, [isOpen, onToggle]);

    const toggle = (id) => {
      if (selected.includes(id)) onChange(selected.filter(x => x !== id));
      else onChange([...selected, id]);
    };

    return (
      <div className="relative" ref={ref}>
        <button onClick={onToggle}
          className={`h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg border text-xs font-medium ${selected.length>0 ? 'bg-pitch/10 border-pitch/30 text-pitch' : 'bg-ink-800 border-ink-700 text-ink-200 hover:bg-ink-750'}`}>
          <Icon name={icon} size={12} />
          <span className="text-ink-400 uppercase tracking-wider text-[10px] font-semibold">{label}</span>
          <span>{value}</span>
          <Icon name="chevron-down" size={12} className="text-ink-400" />
        </button>
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 bg-ink-800 border border-ink-700 rounded-lg shadow-lg z-50 w-64 max-h-80 overflow-auto">
            <div className="p-1.5 border-b border-ink-700 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold px-1.5">{label}</span>
              {selected.length > 0 && (
                <button onClick={() => onChange([])} className="text-[10px] text-pitch hover:underline">Clear</button>
              )}
            </div>
            <div className="py-1">
              {options.map(o => (
                <button key={o.id} onClick={() => toggle(o.id)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-ink-750 text-sm">
                  <span className={`h-4 w-4 rounded border flex items-center justify-center ${selected.includes(o.id) ? 'bg-pitch border-pitch' : 'border-ink-500'}`}>
                    {selected.includes(o.id) && <Icon name="check" size={11} className="text-ink-900" />}
                  </span>
                  <span className="flex-1">{o.label}</span>
                  {o.sub && <span className="text-[10px] text-ink-400 mono">{o.sub}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function ThresholdControl({ label, value, onChange, min, max, step }) {
    return (
      <div className="inline-flex items-center gap-2 bg-ink-800 border border-ink-700 rounded-lg h-8 px-2.5">
        <span className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">{label}</span>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-24 accent-pitch" />
        <span className="mono text-xs w-8 text-right">{value}</span>
      </div>
    );
  }

  // ---- Filter application (applies to player-match stats) ----
  function applyFilters(pms, filters, opts = {}) {
    const D = window.SCS_DATA;
    let out = pms;
    // date range
    const presetsMap = { all: null, year: 365, month: 30, week: 7 };
    const days = presetsMap[filters.preset];
    if (days != null) {
      const cutoff = new Date(D.asOf).getTime() - days * 86400000;
      out = out.filter(s => new Date(s.date).getTime() >= cutoff);
    }
    // tournament
    if (filters.tournamentIds.length) out = out.filter(s => filters.tournamentIds.includes(s.tournamentId));
    // club
    if (filters.clubIds.length) out = out.filter(s => filters.clubIds.includes(s.clubId));
    // team
    if (filters.teamIds.length) out = out.filter(s => filters.teamIds.includes(s.teamId));
    // box
    if (filters.isBox !== "any") {
      const want = filters.isBox === "yes";
      out = out.filter(s => D.tournamentsById[s.tournamentId]?.isBoxCricket === want);
    }
    return out;
  }

  function applyMatchFilters(matches, filters) {
    const D = window.SCS_DATA;
    let out = matches;
    const presetsMap = { all: null, year: 365, month: 30, week: 7 };
    const days = presetsMap[filters.preset];
    if (days != null) {
      const cutoff = new Date(D.asOf).getTime() - days * 86400000;
      out = out.filter(m => new Date(m.startDateTime).getTime() >= cutoff);
    }
    if (filters.tournamentIds.length) out = out.filter(m => filters.tournamentIds.includes(m.tournamentId));
    if (filters.clubIds.length) out = out.filter(m => filters.clubIds.includes(m.clubId));
    if (filters.teamIds.length) out = out.filter(m => filters.teamIds.includes(m.team1) || filters.teamIds.includes(m.team2));
    if (filters.isBox !== "any") {
      const want = filters.isBox === "yes";
      out = out.filter(m => D.tournamentsById[m.tournamentId]?.isBoxCricket === want);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      out = out.filter(m => m.team1Fullname.toLowerCase().includes(q) || m.team2Fullname.toLowerCase().includes(q));
    }
    return out;
  }

  // ---- Aggregator: given filtered playerMatchStats, roll up per player ----
  function rollupPlayers(pms) {
    const acc = {};
    pms.forEach(s => {
      let a = acc[s.playerId];
      if (!a) a = acc[s.playerId] = {
        playerId: s.playerId, playerName: s.playerName,
        matches: 0, innings: 0, runs: 0, ballsFaced: 0, notOuts: 0, fours: 0, sixes: 0,
        fifties: 0, hundreds: 0, ducks: 0, highScore: 0,
        ballsBowled: 0, oversBowled: 0, wickets: 0, runsConceded: 0, maidens: 0, dotBallsBowled: 0,
        foursConceded: 0, sixesConceded: 0,
        bestBowlingFig: { w: 0, r: 1e9 }, bestBowling: "-",
        mom: 0,
      };
      a.matches += 1;
      if (s.ballsFaced > 0 || s.isOut) {
        a.innings += 1; a.runs += s.runs; a.ballsFaced += s.ballsFaced;
        a.fours += s.fours; a.sixes += s.sixes;
        if (s.isNotOut) a.notOuts += 1;
        if (s.runs === 0 && s.isOut) a.ducks += 1;
        if (s.runs >= 50 && s.runs < 100) a.fifties += 1;
        if (s.runs >= 100) a.hundreds += 1;
        if (s.runs > a.highScore) a.highScore = s.runs;
      }
      if (s.overs > 0) {
        a.oversBowled += s.overs;
        const ov = Math.floor(s.overs); const bx = Math.round((s.overs - ov) * 10);
        a.ballsBowled += ov * 6 + bx;
        a.wickets += s.wickets; a.runsConceded += s.runsConceded;
        a.maidens += s.maidens; a.dotBallsBowled += s.dotBalls;
        a.foursConceded += s.foursConceded; a.sixesConceded += s.sixesConceded;
        if (s.wickets > a.bestBowlingFig.w || (s.wickets === a.bestBowlingFig.w && s.runsConceded < a.bestBowlingFig.r)) {
          a.bestBowlingFig = { w: s.wickets, r: s.runsConceded };
          a.bestBowling = `${s.wickets}/${s.runsConceded}`;
        }
      }
      if (s.mom) a.mom += 1;
    });
    Object.values(acc).forEach(a => {
      a.average = (a.innings - a.notOuts) > 0 ? a.runs / (a.innings - a.notOuts) : a.runs;
      a.strikeRate = a.ballsFaced ? (a.runs / a.ballsFaced) * 100 : 0;
      a.bowlingEconomy = a.ballsBowled ? (a.runsConceded / (a.ballsBowled / 6)) : 0;
      a.bowlingAverage = a.wickets > 0 ? a.runsConceded / a.wickets : 0;
      a.bowlingStrikeRate = a.wickets > 0 ? a.ballsBowled / a.wickets : 0;
      a.dotBallPct = a.ballsFaced ? (countDotsForPlayer(a.playerId, a.runs, a.ballsFaced) / a.ballsFaced) * 100 : 0;
    });
    return Object.values(acc);
  }
  function countDotsForPlayer() { return 0; } // not used

  // ---- Section title ----
  function SectionTitle({ title, subtitle, accent, right }) {
    return (
      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            {accent && <span className="h-3 w-1 rounded-sm" style={{ background: accent }} />}
            <h2 className="text-base font-bold tracking-tight text-ink-100">{title}</h2>
          </div>
          {subtitle && <div className="text-xs text-ink-400 mt-0.5">{subtitle}</div>}
        </div>
        {right}
      </div>
    );
  }

  // ---- Empty state ----
  function Empty({ icon = "search-x", title, message, action }) {
    return (
      <div className="py-16 px-6 flex flex-col items-center text-center">
        <div className="h-12 w-12 rounded-xl bg-ink-750 border border-ink-700 flex items-center justify-center mb-3 text-ink-400">
          <Icon name={icon} size={20} />
        </div>
        <div className="font-semibold text-ink-100 text-sm">{title}</div>
        {message && <div className="text-xs text-ink-400 mt-1 max-w-sm">{message}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    );
  }

  // ---- Skeleton ----
  function Skel({ w = "100%", h = 14, r = 6, className = "" }) {
    return <div className={"skeleton rounded " + className} style={{ width: w, height: h, borderRadius: r }} />;
  }

  // ---- Performance dot (green/red coding) ----
  function PerfDot({ value, avg, inverse = false }) {
    const good = inverse ? value < avg : value > avg;
    return <span className={`inline-block h-1.5 w-1.5 rounded-full ${good ? 'bg-up' : 'bg-down'}`} />;
  }

  // ---- Team badge ----
  function TeamBadge({ teamId, size = 24 }) {
    const t = window.SCS_DATA.teamsById[teamId];
    if (!t) return null;
    const color = H.avatarColor(t.teamName);
    return (
      <span className="inline-flex items-center justify-center rounded-md mono font-bold text-ink-900 select-none"
        style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}>
        {t.teamShortName || t.teamInitials}
      </span>
    );
  }

  Object.assign(window, {
    SCS_UI: {
      Icon, Avatar, Card, RankBadge, Pill, Stat, Table, Th, Td, useSort, Sparkline,
      FilterProvider, FilterContext, useFilters, FilterBar, applyFilters, applyMatchFilters,
      rollupPlayers, SectionTitle, Empty, Skel, PerfDot, TeamBadge,
    },
  });
})();
