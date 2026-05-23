// App shell — top nav + hash-based router.
(function () {
  const { useState, useEffect, useCallback, useRef } = React;
  const U = window.SCS_UI;
  const D = window.SCS_DATA;

  function parseHash() {
    const h = (window.location.hash || "#home").slice(1);
    // forms: home | leaderboards | player/p1 | match/m1 | h2h | matches | tournaments | tournaments/tr1
    const [route, ...rest] = h.split("/");
    const params = {};
    if (rest.length >= 1) params.id = rest[0];
    // query
    const qIdx = h.indexOf("?");
    if (qIdx >= 0) {
      const qs = new URLSearchParams(h.slice(qIdx+1));
      qs.forEach((v,k) => params[k] = v);
    }
    return { route: route.split("?")[0], params };
  }

  function buildHash(route, params = {}) {
    let h = route;
    if (params.id) h += "/" + params.id;
    const extra = Object.entries(params).filter(([k]) => k !== "id");
    if (extra.length) {
      const qs = new URLSearchParams();
      extra.forEach(([k,v]) => qs.set(k, v));
      h += "?" + qs.toString();
    }
    return "#" + h;
  }

  function App() {
    const [route, setRoute] = useState(parseHash());
    // Bumped on every scs:clubchange so the entire FilterProvider subtree
    // re-mounts and useMemo hooks re-read the (now mutated) window.SCS_DATA.
    const [clubKey, setClubKey] = useState(0);
    const [currentClubId, setCurrentClubId] = useState(
      window.SCS_CURRENT_CLUB_ID || null,
    );
    useEffect(() => {
      const onHash = () => setRoute(parseHash());
      const onClubChange = (e) => {
        setCurrentClubId((e && e.detail && e.detail.clubId) || null);
        setClubKey((k) => k + 1);
      };
      window.addEventListener("hashchange", onHash);
      window.addEventListener("scs:clubchange", onClubChange);
      return () => {
        window.removeEventListener("hashchange", onHash);
        window.removeEventListener("scs:clubchange", onClubChange);
      };
    }, []);

    const navigate = useCallback((target, params = {}) => {
      // target may be "leaderboards" or "player/p1" or "match/m3" or "h2h"
      let r, p = {};
      if (target.includes("/")) {
        const [t, id] = target.split("/");
        r = t; p = { ...params, id };
      } else { r = target; p = params; }
      window.location.hash = buildHash(r, p);
      window.scrollTo({ top: 0, behavior: "instant" });
    }, []);

    return (
      <U.FilterProvider key={clubKey}>
        <div className="min-h-screen flex flex-col">
          <TopNav route={route.route} navigate={navigate} currentClubId={currentClubId} />
          <main className="flex-1">
            <RouteView route={route} navigate={navigate} />
          </main>
          <Footer />
        </div>
      </U.FilterProvider>
    );
  }

  function TopNav({ route, navigate, currentClubId }) {
    const items = [
      { k: "home",         l: "Dashboard",    i: "layout-dashboard" },
      { k: "stats",        l: "Stats Engine", i: "database", pulse: true },
      { k: "leaderboards", l: "Records",      i: "list-ordered" },
      { k: "h2h",          l: "Head-to-head", i: "swords" },
      { k: "matches",      l: "Match center", i: "calendar-days" },
      { k: "tournaments",  l: "Tournaments",  i: "trophy" },
    ];
    return (
      <header className="sticky top-0 z-40 bg-ink-900/85 backdrop-blur-md border-b border-ink-700">
        <div className="px-6 h-[57px] flex items-center gap-6">
          <button onClick={() => navigate("home")} className="flex items-center gap-2.5 focus-ring rounded-md -mx-1 px-1">
            <Logo />
            <div className="leading-tight">
              <div className="font-extrabold text-ink-100 text-[15px] tracking-tight">ScoreCard<span className="text-pitch"> Stats</span></div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-ink-400 mono">Cricket Analytics</div>
            </div>
          </button>

          <nav className="flex items-center gap-0.5">
            {items.map(i => (
              <button key={i.k} onClick={() => navigate(i.k)}
                className={`h-9 px-3 rounded-lg text-[13px] font-semibold inline-flex items-center gap-2 transition-colors
                  ${route === i.k ? 'bg-ink-800 text-ink-100 shadow-[inset_0_-2px_0_0_#A6E04C]' : 'text-ink-300 hover:bg-ink-800 hover:text-ink-100'}`}>
                <U.Icon name={i.i} size={13} /> {i.l}
                {i.pulse && route !== i.k && <span className="h-1.5 w-1.5 rounded-full bg-pitch animate-pulse" />}
              </button>
            ))}
          </nav>

          <div className="flex-1" />

          <ClubSwitcher currentClubId={currentClubId} />

          {/* global player search */}
          <GlobalSearch navigate={navigate} />

          <button className="h-8 w-8 rounded-lg bg-ink-800 hover:bg-ink-750 border border-ink-700 inline-flex items-center justify-center text-ink-300">
            <U.Icon name="bell" size={14} />
          </button>
          <div className="h-8 px-2.5 rounded-lg bg-ink-800 border border-ink-700 inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-pitch animate-pulse" />
            <span className="mono text-[10px] uppercase tracking-wider text-ink-300">Live data</span>
          </div>
        </div>
      </header>
    );
  }

  function ClubSwitcher({ currentClubId }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
      function onDoc(e) {
        if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      }
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    // Always read from the full dataset so every club is selectable, even
    // while one is active (D would otherwise only contain the active club).
    const clubs = (window.SCS_DATA_FULL && window.SCS_DATA_FULL.clubs) || D.clubs;
    const current = currentClubId ? clubs.find(c => c.id === currentClubId) : null;

    function select(clubId) {
      setOpen(false);
      window.SCS_setCurrentClub(clubId);
    }

    return (
      <div className="relative" ref={ref}>
        <button onClick={() => setOpen(o => !o)}
          className={`h-8 pl-2 pr-2.5 inline-flex items-center gap-2 rounded-lg border text-xs font-medium transition-colors
            ${current ? 'bg-pitch/10 border-pitch/30 text-pitch hover:bg-pitch/15' : 'bg-ink-800 border-ink-700 text-ink-200 hover:bg-ink-750'}`}>
          <span className={`h-5 w-5 rounded-md inline-flex items-center justify-center ${current ? 'bg-pitch/20 text-pitch' : 'bg-ink-750 text-ink-300'}`}>
            <U.Icon name="building" size={11} />
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span className="text-[9px] uppercase tracking-[0.14em] text-ink-400 font-semibold">Club</span>
            <span className={`text-[12px] font-semibold max-w-[140px] truncate ${current ? 'text-pitch' : 'text-ink-100'}`}>
              {current ? current.name : "All combined"}
            </span>
          </span>
          <U.Icon name="chevron-down" size={12} className="text-ink-400" />
        </button>
        {open && (
          <div className="absolute top-full right-0 mt-1 bg-ink-800 border border-ink-700 rounded-lg shadow-xl z-50 w-72 max-h-96 overflow-auto">
            <div className="p-2 border-b border-ink-700 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.14em] text-ink-400 font-semibold inline-flex items-center gap-1.5">
                <U.Icon name="building" size={11} /> Active club
              </span>
              <span className="text-[10px] text-ink-500">{clubs.length} total</span>
            </div>
            <button onClick={() => select(null)}
              className={`w-full px-3 py-2.5 hover:bg-ink-750 flex items-center gap-2.5 text-left ${!currentClubId ? 'bg-ink-750' : ''}`}>
              <span className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${!currentClubId ? 'bg-pitch border-pitch' : 'border-ink-500'}`}>
                {!currentClubId && <U.Icon name="check" size={11} className="text-ink-900" />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-ink-100 font-medium">All clubs combined</div>
                <div className="text-[10px] text-ink-400">Aggregate across the entire network</div>
              </div>
              <U.Icon name="globe" size={13} className="text-ink-400" />
            </button>
            <div className="border-t border-ink-700" />
            {clubs.map(c => (
              <button key={c.id} onClick={() => select(c.id)}
                className={`w-full px-3 py-2 hover:bg-ink-750 flex items-center gap-2.5 text-left ${currentClubId === c.id ? 'bg-ink-750' : ''}`}>
                <span className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${currentClubId === c.id ? 'bg-pitch border-pitch' : 'border-ink-500'}`}>
                  {currentClubId === c.id && <U.Icon name="check" size={11} className="text-ink-900" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink-100 font-medium truncate">{c.name}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  function Logo() {
    return (
      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-700 bg-ink-850 overflow-hidden">
        <svg viewBox="0 0 36 36" width="22" height="22">
          {/* stylized cricket scorecard / pitch */}
          <rect x="6" y="6" width="24" height="24" rx="4" fill="#0A0D14" stroke="#A6E04C" strokeWidth="1.5" />
          <line x1="10" y1="13" x2="26" y2="13" stroke="#A6E04C" strokeWidth="1.2" />
          <line x1="10" y1="18" x2="22" y2="18" stroke="#A6E04C" strokeWidth="1.2" opacity="0.55" />
          <line x1="10" y1="23" x2="24" y2="23" stroke="#A6E04C" strokeWidth="1.2" opacity="0.3" />
          <circle cx="28" cy="23" r="2.6" fill="#E8B84A" />
        </svg>
      </span>
    );
  }

  function GlobalSearch({ navigate }) {
    const [q, setQ] = useState("");
    const [open, setOpen] = useState(false);
    const matches = q.length < 2 ? [] : [
      ...D.players.filter(p => p.name.toLowerCase().includes(q.toLowerCase())).slice(0,5).map(p => ({ kind: "player", id: p.id, label: p.name, sub: `${p.role} · ${D.clubsById[p.clubId]?.name}` })),
      ...D.teams.filter(t => t.teamName.toLowerCase().includes(q.toLowerCase())).slice(0,3).map(t => ({ kind: "team", id: t.id, label: t.teamName, sub: D.clubsById[t.clubId]?.name })),
    ];
    return (
      <div className="relative">
        <div className="relative">
          <U.Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(()=>setOpen(false), 200)}
            placeholder="Search players, teams…"
            className="bg-ink-800 border border-ink-700 rounded-lg h-8 pl-7 pr-3 text-sm w-72 focus-ring placeholder:text-ink-500" />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 mono text-[9px] text-ink-500 border border-ink-700 px-1 rounded">⌘K</span>
        </div>
        {open && q.length >= 2 && (
          <div className="absolute top-full right-0 mt-1 bg-ink-800 border border-ink-700 rounded-lg shadow-xl z-50 w-80 max-h-80 overflow-auto">
            {matches.length === 0 && <div className="p-4 text-xs text-ink-400 text-center">No matches</div>}
            {matches.map(m => (
              <button key={m.kind+m.id} onMouseDown={() => { setQ(""); setOpen(false); navigate(m.kind === "player" ? `player/${m.id}` : `h2h`); }}
                className="w-full px-3 py-2 hover:bg-ink-750 flex items-center gap-2.5 text-left">
                {m.kind === "team" ? <U.TeamBadge teamId={m.id} size={24} /> : <U.Avatar name={m.label} size={24} />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink-100 truncate">{m.label}</div>
                  <div className="text-[10px] text-ink-400 truncate">{m.sub}</div>
                </div>
                <U.Pill>{m.kind}</U.Pill>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  function RouteView({ route, navigate }) {
    switch (route.route) {
      case "home": return <window.SCS_Home navigate={navigate} />;
      case "stats": return <window.SCS_StatsEngine navigate={navigate} initial={route.params} />;
      case "leaderboards": return <window.SCS_Leaderboards navigate={navigate} />;
      case "h2h": return <window.SCS_H2H navigate={navigate} initial={route.params} />;
      case "player": return <window.SCS_Player params={route.params} navigate={navigate} />;
      case "match": return <window.SCS_Matches params={route.params} navigate={navigate} />;
      case "matches": return <window.SCS_Matches params={null} navigate={navigate} />;
      case "tournaments":
      case "tournament":
        return <window.SCS_Tournament params={route.params} navigate={navigate} />;
      default: return <window.SCS_Home navigate={navigate} />;
    }
  }

  function Footer() {
    const clubId = window.SCS_CURRENT_CLUB_ID;
    const clubName = clubId && window.SCS_DATA.clubsById[clubId]?.name;
    return (
      <footer className="border-t border-ink-700 mt-4">
        <div className="px-6 py-6 flex items-center justify-between text-[11px] text-ink-400">
          <div className="flex items-center gap-3">
            <span className="mono uppercase tracking-wider">ScoreCard Stats v2.4</span>
            <span>·</span>
            <span>
              {clubName ? `Showing ${clubName} · ` : ""}
              {window.SCS_DATA.matches.length} matches across {window.SCS_DATA.tournaments.length} tournaments
            </span>
          </div>
          <div className="flex items-center gap-3 mono">
            <span>Pipeline · BigQuery → Cloud Run</span>
            <span>·</span>
            <span>Last sync {new Date(window.SCS_DATA.asOf).toLocaleString("en-IN", { hour:"2-digit", minute:"2-digit" })}</span>
          </div>
        </div>
      </footer>
    );
  }

  // mount
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(<App />);
})();
