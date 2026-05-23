// Stats Engine — Statsguru-style query builder.
// Pick a query type (batting/bowling/all-round/team innings/match results),
// pick a grouping axis (innings list / career averages / by tournament /
// by opposition / by month / by result / ...) and stack filters.
(function () {
  const { useState, useMemo, useEffect, useRef, useCallback } = React;
  const U = window.SCS_UI;
  const D = window.SCS_DATA;
  const H = window.SCS_HELPERS;

  // ============================================================
  // CONFIG
  // ============================================================

  const QUERY_TYPES = [
    { k: "batting",  l: "Batting",       i: "trending-up",   c: "#A6E04C" },
    { k: "bowling",  l: "Bowling",       i: "target",        c: "#A78BFA" },
    { k: "allround", l: "All-round",     i: "swords",        c: "#E8B84A" },
    { k: "teaminn",  l: "Team innings",  i: "shield",        c: "#5BC0BE" },
    { k: "matches",  l: "Match results", i: "calendar-days", c: "#7AA2F7" },
  ];

  // For each type, the "Analyse by" / "Group by" options
  const VIEWS = {
    batting: [
      { k: "innings",    l: "Innings list",              hint: "One row per individual innings" },
      { k: "match",      l: "Match-by-match",            hint: "One row per player per match" },
      { k: "career",     l: "Career averages",           hint: "One row per player (aggregated)" },
      { k: "tournament", l: "Tournament aggregation",    hint: "Player × tournament" },
      { k: "opposition", l: "Opposition aggregation",    hint: "Player × opposition team" },
      { k: "ground",     l: "Tournament club",           hint: "Player × hosting club" },
      { k: "month",      l: "Calendar month",            hint: "Player × month-year" },
      { k: "result",     l: "Match result",              hint: "Splits by win / loss / tie" },
    ],
    bowling: [
      { k: "innings",    l: "Innings list",              hint: "One spell per row" },
      { k: "match",      l: "Match-by-match",            hint: "Player × match" },
      { k: "career",     l: "Career figures",            hint: "One row per bowler (aggregated)" },
      { k: "tournament", l: "Tournament aggregation",    hint: "Player × tournament" },
      { k: "opposition", l: "Opposition aggregation",    hint: "Player × opposition" },
      { k: "month",      l: "Calendar month",            hint: "Player × month-year" },
      { k: "result",     l: "Match result",              hint: "Splits by win / loss / tie" },
    ],
    allround: [
      { k: "career",     l: "Career figures",            hint: "Players who both bat and bowl" },
      { k: "tournament", l: "Tournament aggregation",    hint: "Player × tournament" },
      { k: "match",      l: "Per-match contributions",   hint: "One row per match" },
    ],
    teaminn: [
      { k: "innings",    l: "Innings list",              hint: "One row per team innings" },
      { k: "team",       l: "Team totals",               hint: "Aggregated per team" },
      { k: "opposition", l: "Team × opposition",         hint: "Head-to-head splits" },
      { k: "tournament", l: "Team × tournament",         hint: "Team's tournament-by-tournament" },
    ],
    matches: [
      { k: "match",      l: "Match list",                hint: "Every match" },
      { k: "tournament", l: "Tournament summary",        hint: "Aggregated" },
      { k: "team",       l: "Team summary",              hint: "Aggregated per team" },
    ],
  };

  // ============================================================
  // PAGE
  // ============================================================

  function StatsEnginePage({ navigate, initial }) {
    const [type, setType] = useState(initial?.type || "batting");
    const [view, setView] = useState(initial?.view || VIEWS[initial?.type || "batting"][0].k);
    const [filters, setFilters] = useState(defaultFilters());
    const [sort, setSort] = useState(defaultSort(type, view));
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 50;

    // when type changes, jump to that type's first view + reset sort
    useEffect(() => {
      const validViews = VIEWS[type].map(v => v.k);
      if (!validViews.includes(view)) setView(validViews[0]);
    }, [type]); // eslint-disable-line

    useEffect(() => {
      setSort(defaultSort(type, view));
      setPage(0);
    }, [type, view]); // eslint-disable-line

    // ---- compute results ----
    const result = useMemo(
      () => compute(type, view, filters),
      [type, view, filters]
    );

    const sorted = useMemo(() => {
      const rows = [...result.rows];
      const col = result.columns.find(c => c.k === sort.key);
      if (!col) return rows;
      rows.sort((a, b) => {
        const av = sortValue(a, col), bv = sortValue(b, col);
        if (typeof av === "string" && typeof bv === "string") {
          return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
        }
        const an = av == null ? -Infinity : av;
        const bn = bv == null ? -Infinity : bv;
        return sort.dir === "asc" ? an - bn : bn - an;
      });
      return rows;
    }, [result, sort]);

    const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

    // active filter count
    const activeFilters = countActiveFilters(filters);

    const typeConfig = QUERY_TYPES.find(q => q.k === type);

    return (
      <div className="page-enter">
        {/* Header */}
        <div className="px-6 pt-6 pb-3 border-b border-ink-700">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[11px] text-pitch uppercase tracking-[0.18em] font-semibold mb-1">Stats Engine · Statsguru-style query builder</div>
              <h1 className="text-3xl font-extrabold text-ink-100 tracking-tight">Query the dataset</h1>
              <div className="text-sm text-ink-400 mt-1">
                Pick a query type, choose how to group results, stack filters. Each row of the result table answers your question.
              </div>
            </div>
            <ResultPulse rows={sorted.length} activeFilters={activeFilters} />
          </div>

          {/* Type tabs */}
          <div className="mt-4 inline-flex bg-ink-800 border border-ink-700 rounded-lg p-1 gap-0.5">
            {QUERY_TYPES.map(t => (
              <button key={t.k} onClick={() => setType(t.k)}
                className={`h-9 px-3 text-[13px] font-semibold rounded-md inline-flex items-center gap-2 transition-colors
                  ${type === t.k ? 'bg-ink-700 text-ink-100' : 'text-ink-300 hover:text-ink-100'}`}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.c }} />
                <U.Icon name={t.i} size={12} />
                {t.l}
              </button>
            ))}
          </div>
        </div>

        {/* Body — filter sidebar + result */}
        <div className="grid grid-cols-12 gap-0">
          <FilterSidebar
            type={type}
            filters={filters}
            setFilters={setFilters}
            onReset={() => setFilters(defaultFilters())}
          />

          <main className="col-span-12 lg:col-span-9 xl:col-span-10 border-l border-ink-700 min-w-0">
            {/* View toolbar */}
            <div className="px-5 py-3 border-b border-ink-700 flex items-center justify-between gap-3 sticky top-[57px] bg-ink-900/95 backdrop-blur z-20">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">Analyse by</span>
                  <ViewPicker type={type} view={view} setView={setView} />
                </div>
                <ActiveFilterPills filters={filters} setFilters={setFilters} />
              </div>
              <div className="text-[10px] text-ink-400 uppercase tracking-wider mono">
                <span className="text-pitch font-bold mono text-base mr-1.5">{sorted.length.toLocaleString()}</span>
                rows
              </div>
            </div>

            {/* Result table */}
            <div className="overflow-x-auto">
              {sorted.length === 0 ? (
                <div className="py-20">
                  <U.Empty
                    icon="search-x"
                    title="No rows match your query"
                    message="Widen your filters or drop one of the constraints. Try removing player/team filters or expanding the date range."
                    action={<button onClick={() => setFilters(defaultFilters())} className="h-8 px-3 rounded-lg bg-pitch text-ink-900 font-semibold text-xs">Reset filters</button>}
                  />
                </div>
              ) : (
                <ResultTable
                  columns={result.columns}
                  rows={pageRows}
                  startIndex={page * PAGE_SIZE}
                  sort={sort} setSort={setSort}
                  navigate={navigate}
                  type={type} view={view}
                />
              )}
            </div>

            {/* Footer / pagination */}
            {sorted.length > 0 && (
              <div className="px-5 py-3 border-t border-ink-700 flex items-center justify-between text-xs text-ink-400">
                <div className="mono">
                  Showing <span className="text-ink-100">{(page * PAGE_SIZE + 1).toLocaleString()}</span>
                  – <span className="text-ink-100">{Math.min((page + 1) * PAGE_SIZE, sorted.length).toLocaleString()}</span>
                  of <span className="text-ink-100">{sorted.length.toLocaleString()}</span> rows
                  · sorted by <span className="text-pitch">{labelForKey(result.columns, sort.key)}</span> {sort.dir === "asc" ? "↑" : "↓"}
                </div>
                <Pagination page={page} setPage={setPage} totalPages={totalPages} />
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  function ResultPulse({ rows, activeFilters }) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-[10px] text-ink-400 uppercase tracking-wider font-semibold">Filters active</div>
          <div className="mono text-pitch font-bold">{activeFilters}</div>
        </div>
        <div className="h-10 w-px bg-ink-700" />
        <div className="text-right">
          <div className="text-[10px] text-ink-400 uppercase tracking-wider font-semibold">Result size</div>
          <div className="mono text-pitch font-bold">{rows.toLocaleString()}</div>
        </div>
      </div>
    );
  }

  function ViewPicker({ type, view, setView }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
      const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener("mousedown", fn);
      return () => document.removeEventListener("mousedown", fn);
    }, []);
    const current = VIEWS[type].find(v => v.k === view) || VIEWS[type][0];
    return (
      <div ref={ref} className="relative">
        <button onClick={() => setOpen(!open)} className="h-8 px-2.5 rounded-md bg-ink-700 hover:bg-ink-600 border border-ink-600 text-sm font-semibold text-ink-100 inline-flex items-center gap-2">
          {current.l}
          <U.Icon name="chevron-down" size={12} className="text-ink-300" />
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1 bg-ink-800 border border-ink-700 rounded-lg shadow-xl z-50 w-72">
            {VIEWS[type].map(v => (
              <button key={v.k} onClick={() => { setView(v.k); setOpen(false); }}
                className={`w-full px-3 py-2 text-left hover:bg-ink-750 ${view === v.k ? 'bg-ink-750' : ''}`}>
                <div className={`text-sm font-medium ${view === v.k ? 'text-pitch' : 'text-ink-100'}`}>{v.l}</div>
                <div className="text-[11px] text-ink-400 mt-0.5">{v.hint}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  function ActiveFilterPills({ filters, setFilters }) {
    const pills = [];
    if (filters.playerIds.length) pills.push({ label: `${filters.playerIds.length} player${filters.playerIds.length > 1 ? "s" : ""}`, clear: () => setFilters(f => ({ ...f, playerIds: [] })) });
    if (filters.teamIds.length) pills.push({ label: `team: ${filters.teamIds.length}`, clear: () => setFilters(f => ({ ...f, teamIds: [] })) });
    if (filters.oppTeamIds.length) pills.push({ label: `opp: ${filters.oppTeamIds.length}`, clear: () => setFilters(f => ({ ...f, oppTeamIds: [] })) });
    if (filters.tournamentIds.length) pills.push({ label: `${filters.tournamentIds.length} tournament${filters.tournamentIds.length > 1 ? "s" : ""}`, clear: () => setFilters(f => ({ ...f, tournamentIds: [] })) });
    if (filters.clubIds.length) pills.push({ label: `${filters.clubIds.length} club${filters.clubIds.length > 1 ? "s" : ""}`, clear: () => setFilters(f => ({ ...f, clubIds: [] })) });
    if (filters.isBox !== "any") pills.push({ label: filters.isBox === "yes" ? "box only" : "standard only", clear: () => setFilters(f => ({ ...f, isBox: "any" })) });
    if (filters.result !== "any") pills.push({ label: `result: ${filters.result}`, clear: () => setFilters(f => ({ ...f, result: "any" })) });
    if (filters.innings !== "any") pills.push({ label: `${filters.innings} innings`, clear: () => setFilters(f => ({ ...f, innings: "any" })) });
    if (filters.from || filters.to) pills.push({ label: `${filters.from || "—"} → ${filters.to || "—"}`, clear: () => setFilters(f => ({ ...f, from: "", to: "" })) });
    if (filters.runsMin) pills.push({ label: `runs ≥ ${filters.runsMin}`, clear: () => setFilters(f => ({ ...f, runsMin: 0 })) });
    if (filters.runsMax) pills.push({ label: `runs ≤ ${filters.runsMax}`, clear: () => setFilters(f => ({ ...f, runsMax: 0 })) });
    if (filters.ballsMin) pills.push({ label: `balls ≥ ${filters.ballsMin}`, clear: () => setFilters(f => ({ ...f, ballsMin: 0 })) });
    if (filters.wktsMin) pills.push({ label: `wkts ≥ ${filters.wktsMin}`, clear: () => setFilters(f => ({ ...f, wktsMin: 0 })) });
    if (filters.oversMin) pills.push({ label: `overs ≥ ${filters.oversMin}`, clear: () => setFilters(f => ({ ...f, oversMin: 0 })) });

    if (!pills.length) return null;
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-ink-500">·</span>
        {pills.map((p, i) => (
          <button key={i} onClick={p.clear}
            className="h-6 px-2 inline-flex items-center gap-1 rounded text-[11px] bg-pitch/10 text-pitch border border-pitch/30 hover:bg-pitch/20">
            {p.label}
            <U.Icon name="x" size={10} />
          </button>
        ))}
      </div>
    );
  }

  function Pagination({ page, setPage, totalPages }) {
    return (
      <div className="inline-flex items-center gap-1">
        <button disabled={page === 0} onClick={() => setPage(0)} className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-ink-700 hover:bg-ink-750 disabled:opacity-30 disabled:hover:bg-transparent text-ink-300">
          <U.Icon name="chevrons-left" size={12} />
        </button>
        <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-ink-700 hover:bg-ink-750 disabled:opacity-30 disabled:hover:bg-transparent text-ink-300">
          <U.Icon name="chevron-left" size={12} />
        </button>
        <span className="mono text-xs px-3 text-ink-300">
          {page + 1} <span className="text-ink-500">/</span> {totalPages}
        </span>
        <button disabled={page >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-ink-700 hover:bg-ink-750 disabled:opacity-30 disabled:hover:bg-transparent text-ink-300">
          <U.Icon name="chevron-right" size={12} />
        </button>
        <button disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-ink-700 hover:bg-ink-750 disabled:opacity-30 disabled:hover:bg-transparent text-ink-300">
          <U.Icon name="chevrons-right" size={12} />
        </button>
      </div>
    );
  }

  // ============================================================
  // RESULT TABLE
  // ============================================================

  function ResultTable({ columns, rows, startIndex, sort, setSort, navigate, type, view }) {
    const toggle = (key) => setSort(s => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" });
    return (
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th className="sticky top-0 z-10 bg-ink-850 text-[10px] uppercase tracking-[0.14em] text-ink-300 font-semibold px-3 py-2.5 border-b border-ink-700 text-right" style={{ width: 50 }}>#</th>
            {columns.map(c => (
              <th key={c.k} onClick={() => c.sortable && toggle(c.k)}
                style={c.width ? { width: c.width } : undefined}
                className={`sticky top-0 z-10 bg-ink-850 text-[10px] uppercase tracking-[0.14em] font-semibold px-3 py-2.5 border-b border-ink-700 ${c.align === "right" ? "text-right" : "text-left"} ${c.sortable ? "cursor-pointer hover:text-ink-100 select-none" : ""} ${c.accent ? "text-pitch" : "text-ink-300"}`}>
                <span className="inline-flex items-center gap-1">
                  {c.label}
                  {c.sortable && <span className="text-ink-500">{sort.key === c.k ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}</span>}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row._key || i}
              onClick={() => clickRow(row, type, view, navigate)}
              className="cursor-pointer hover:bg-ink-750/40 odd:bg-ink-850/30 transition-colors">
              <td className="px-3 py-2 border-b border-ink-800 text-right mono text-ink-400 text-[11px]">{(startIndex + i + 1).toLocaleString()}</td>
              {columns.map(c => (
                <td key={c.k}
                  className={`px-3 py-2 border-b border-ink-800 ${c.align === "right" ? "text-right" : "text-left"} ${c.mono ? "mono" : ""} ${c.accent ? "text-pitch font-semibold" : ""}`}>
                  {c.render ? c.render(row[c.k], row, navigate) : (c.fmt ? c.fmt(row[c.k], row) : (row[c.k] ?? "—"))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function clickRow(row, type, view, navigate) {
    if (row.playerId && view === "career") navigate(`player/${row.playerId}`);
    else if (row.matchId) navigate(`match/${row.matchId}`);
    else if (row.playerId) navigate(`player/${row.playerId}`);
  }

  function sortValue(row, col) {
    if (col.sortVal) return col.sortVal(row);
    return row[col.k];
  }

  function labelForKey(cols, key) {
    return cols.find(c => c.k === key)?.label || key;
  }

  // ============================================================
  // FILTER SIDEBAR
  // ============================================================

  function FilterSidebar({ type, filters, setFilters, onReset }) {
    const update = (patch) => setFilters(f => ({ ...f, ...patch }));
    const showRuns = type === "batting" || type === "allround";
    const showBalls = type === "batting" || type === "allround";
    const showWkts = type === "bowling" || type === "allround";
    const showOvers = type === "bowling" || type === "allround";
    const showResult = type !== "matches" && type !== "teaminn";

    return (
      <aside className="col-span-12 lg:col-span-3 xl:col-span-2 bg-ink-850/30 border-b lg:border-b-0 border-ink-700">
        <div className="sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-ink-100">Filters</div>
            <button onClick={onReset} className="text-[10px] text-pitch hover:underline uppercase tracking-wider font-semibold inline-flex items-center gap-1">
              <U.Icon name="refresh-cw" size={10} /> Reset
            </button>
          </div>

          <FilterGroup label="Players">
            <MultiPicker
              kind="player"
              selected={filters.playerIds}
              onChange={(ids) => update({ playerIds: ids })}
              placeholder="Add a player…"
            />
          </FilterGroup>

          <FilterGroup label="Player's team">
            <MultiPicker
              kind="team"
              selected={filters.teamIds}
              onChange={(ids) => update({ teamIds: ids })}
              placeholder="Pick teams…"
            />
          </FilterGroup>

          <FilterGroup label="Opposition">
            <MultiPicker
              kind="team"
              selected={filters.oppTeamIds}
              onChange={(ids) => update({ oppTeamIds: ids })}
              placeholder="vs which teams…"
            />
          </FilterGroup>

          <FilterGroup label="Tournament">
            <MultiPicker
              kind="tournament"
              selected={filters.tournamentIds}
              onChange={(ids) => update({ tournamentIds: ids })}
              placeholder="Pick tournaments…"
            />
          </FilterGroup>

          <FilterGroup label="Club">
            <MultiPicker
              kind="club"
              selected={filters.clubIds}
              onChange={(ids) => update({ clubIds: ids })}
              placeholder="Pick clubs…"
            />
          </FilterGroup>

          <FilterGroup label="Format">
            <SegBtn value={filters.isBox} onChange={(v) => update({ isBox: v })} options={[
              { v: "any", l: "Any" }, { v: "no", l: "Standard" }, { v: "yes", l: "Box" }
            ]} />
          </FilterGroup>

          <FilterGroup label="Date range">
            <div className="grid grid-cols-2 gap-1.5">
              <input type="date" value={filters.from} onChange={(e) => update({ from: e.target.value })}
                className="h-8 px-2 bg-ink-850 border border-ink-700 rounded-md text-[12px] text-ink-100 focus-ring mono" />
              <input type="date" value={filters.to} onChange={(e) => update({ to: e.target.value })}
                className="h-8 px-2 bg-ink-850 border border-ink-700 rounded-md text-[12px] text-ink-100 focus-ring mono" />
            </div>
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {[
                { l: "1M", d: 30 }, { l: "3M", d: 90 }, { l: "6M", d: 180 }, { l: "YTD", d: 365 }, { l: "All", d: null }
              ].map(p => (
                <button key={p.l} onClick={() => {
                  if (p.d == null) update({ from: "", to: "" });
                  else {
                    const to = new Date(D.asOf);
                    const from = new Date(to.getTime() - p.d * 86400000);
                    update({ from: iso(from), to: iso(to) });
                  }
                }}
                  className="h-6 px-2 rounded text-[10px] bg-ink-800 border border-ink-700 text-ink-300 hover:bg-ink-750 mono">
                  {p.l}
                </button>
              ))}
            </div>
          </FilterGroup>

          {showResult && (
            <FilterGroup label="Result">
              <SegBtn value={filters.result} onChange={(v) => update({ result: v })} options={[
                { v: "any", l: "Any" }, { v: "won", l: "Won" }, { v: "lost", l: "Lost" }, { v: "tied", l: "Tied" }
              ]} />
            </FilterGroup>
          )}

          <FilterGroup label="Innings #">
            <SegBtn value={filters.innings} onChange={(v) => update({ innings: v })} options={[
              { v: "any", l: "Any" }, { v: "1", l: "1st" }, { v: "2", l: "2nd" }
            ]} />
          </FilterGroup>

          {showRuns && (
            <FilterGroup label="Runs scored">
              <RangeInput
                min={filters.runsMin} max={filters.runsMax}
                onMin={(v) => update({ runsMin: v })} onMax={(v) => update({ runsMax: v })}
                unit="runs" />
            </FilterGroup>
          )}
          {showBalls && (
            <FilterGroup label="Balls faced">
              <RangeInput
                min={filters.ballsMin} max={filters.ballsMax}
                onMin={(v) => update({ ballsMin: v })} onMax={(v) => update({ ballsMax: v })}
                unit="balls" />
            </FilterGroup>
          )}
          {showWkts && (
            <FilterGroup label="Wickets in match">
              <RangeInput
                min={filters.wktsMin} max={filters.wktsMax}
                onMin={(v) => update({ wktsMin: v })} onMax={(v) => update({ wktsMax: v })}
                unit="wkts" />
            </FilterGroup>
          )}
          {showOvers && (
            <FilterGroup label="Overs bowled">
              <RangeInput
                min={filters.oversMin} max={filters.oversMax}
                onMin={(v) => update({ oversMin: v })} onMax={(v) => update({ oversMax: v })}
                unit="ov" />
            </FilterGroup>
          )}

          <div className="mt-6 p-3 rounded-lg border border-ink-700 bg-ink-850">
            <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1.5">Quick recipes</div>
            <div className="flex flex-col gap-1">
              {QUICK_RECIPES.map(r => (
                <button key={r.label} onClick={() => setFilters(f => ({ ...defaultFilters(), ...r.filters }))}
                  className="text-left text-[12px] text-ink-200 hover:text-pitch py-1 leading-tight">
                  → {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const QUICK_RECIPES = [
    { label: "50+ scores only", filters: { runsMin: 50 } },
    { label: "10+ ball cameos", filters: { ballsMin: 10 } },
    { label: "3+ wicket hauls", filters: { wktsMin: 3 } },
    { label: "Box cricket only", filters: { isBox: "yes" } },
    { label: "Winning innings only", filters: { result: "won" } },
    { label: "Chasing only (2nd inn)", filters: { innings: "2" } },
  ];

  function FilterGroup({ label, children }) {
    return (
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-[0.12em] text-ink-400 font-semibold mb-1.5">{label}</div>
        {children}
      </div>
    );
  }

  function SegBtn({ value, onChange, options }) {
    return (
      <div className="inline-flex bg-ink-850 border border-ink-700 rounded-md p-0.5 w-full">
        {options.map(o => (
          <button key={o.v} onClick={() => onChange(o.v)}
            className={`flex-1 h-6 px-1.5 text-[11px] font-medium rounded ${value === o.v ? 'bg-ink-700 text-ink-100' : 'text-ink-300 hover:text-ink-100'}`}>
            {o.l}
          </button>
        ))}
      </div>
    );
  }

  function RangeInput({ min, max, onMin, onMax, unit }) {
    return (
      <div className="flex items-center gap-1">
        <input type="number" value={min || ""} onChange={(e) => onMin(Number(e.target.value) || 0)} placeholder="min"
          className="h-7 px-2 w-full bg-ink-850 border border-ink-700 rounded text-[12px] mono text-ink-100 placeholder:text-ink-500 focus-ring" />
        <span className="text-[10px] text-ink-500">–</span>
        <input type="number" value={max || ""} onChange={(e) => onMax(Number(e.target.value) || 0)} placeholder="max"
          className="h-7 px-2 w-full bg-ink-850 border border-ink-700 rounded text-[12px] mono text-ink-100 placeholder:text-ink-500 focus-ring" />
        <span className="text-[9px] text-ink-500 mono uppercase ml-0.5">{unit}</span>
      </div>
    );
  }

  function MultiPicker({ kind, selected, onChange, placeholder }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const ref = useRef(null);
    useEffect(() => {
      const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener("mousedown", fn);
      return () => document.removeEventListener("mousedown", fn);
    }, []);

    const all = kind === "player" ? D.players.map(p => ({ id: p.id, label: p.name, sub: `${p.role} · ${D.clubsById[p.clubId]?.name}` }))
              : kind === "team"   ? D.teams.map(t => ({ id: t.id, label: t.teamName, sub: D.clubsById[t.clubId]?.name }))
              : kind === "tournament" ? D.tournaments.map(t => ({ id: t.id, label: t.name, sub: t.isBoxCricket ? "BOX" : null }))
              : kind === "club"   ? D.clubs.map(c => ({ id: c.id, label: c.name }))
              : [];

    const ql = q.toLowerCase();
    const matches = all.filter(o => !selected.includes(o.id) && o.label.toLowerCase().includes(ql)).slice(0, 12);

    return (
      <div ref={ref} className="relative">
        <div className="flex flex-wrap gap-1 mb-1">
          {selected.map(id => {
            const item = all.find(a => a.id === id);
            if (!item) return null;
            return (
              <span key={id} className="inline-flex items-center gap-1 h-6 px-1.5 rounded bg-pitch/15 text-pitch border border-pitch/30 text-[11px]">
                {item.label.length > 18 ? item.label.slice(0, 18) + "…" : item.label}
                <button onClick={() => onChange(selected.filter(x => x !== id))} className="hover:bg-pitch/20 rounded">
                  <U.Icon name="x" size={10} />
                </button>
              </span>
            );
          })}
        </div>
        <div className="relative">
          <U.Icon name="search" size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="w-full h-7 pl-6 pr-2 bg-ink-850 border border-ink-700 rounded text-[12px] text-ink-100 placeholder:text-ink-500 focus-ring" />
        </div>
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-ink-800 border border-ink-700 rounded shadow-lg z-50 max-h-56 overflow-auto">
            {matches.length === 0 && <div className="px-3 py-2 text-[11px] text-ink-400">{q ? "No matches" : "Type to search…"}</div>}
            {matches.map(m => (
              <button key={m.id} onClick={() => { onChange([...selected, m.id]); setQ(""); }}
                className="w-full text-left px-2.5 py-1.5 hover:bg-ink-750">
                <div className="text-[12px] text-ink-100 truncate">{m.label}</div>
                {m.sub && <div className="text-[10px] text-ink-400 truncate">{m.sub}</div>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // DEFAULTS
  // ============================================================

  function defaultFilters() {
    return {
      playerIds: [], teamIds: [], oppTeamIds: [], tournamentIds: [], clubIds: [],
      isBox: "any", from: "", to: "",
      result: "any", innings: "any",
      runsMin: 0, runsMax: 0, ballsMin: 0, ballsMax: 0,
      wktsMin: 0, wktsMax: 0, oversMin: 0, oversMax: 0,
    };
  }
  function defaultSort(type, view) {
    if (type === "batting") {
      if (view === "innings" || view === "match") return { key: "runs", dir: "desc" };
      return { key: "runs", dir: "desc" };
    }
    if (type === "bowling") {
      if (view === "innings" || view === "match") return { key: "wickets", dir: "desc" };
      return { key: "wickets", dir: "desc" };
    }
    if (type === "allround") return { key: "impact", dir: "desc" };
    if (type === "teaminn") return { key: "score", dir: "desc" };
    if (type === "matches") return { key: "date", dir: "desc" };
    return { key: "runs", dir: "desc" };
  }
  function countActiveFilters(f) {
    let n = 0;
    if (f.playerIds.length) n++;
    if (f.teamIds.length) n++;
    if (f.oppTeamIds.length) n++;
    if (f.tournamentIds.length) n++;
    if (f.clubIds.length) n++;
    if (f.isBox !== "any") n++;
    if (f.from || f.to) n++;
    if (f.result !== "any") n++;
    if (f.innings !== "any") n++;
    if (f.runsMin) n++; if (f.runsMax) n++;
    if (f.ballsMin) n++; if (f.ballsMax) n++;
    if (f.wktsMin) n++; if (f.wktsMax) n++;
    if (f.oversMin) n++; if (f.oversMax) n++;
    return n;
  }
  function iso(d) { return d.toISOString().slice(0, 10); }

  // ============================================================
  // CORE: COMPUTE
  // ============================================================

  function compute(type, view, filters) {
    if (type === "matches") return computeMatchQuery(view, filters);
    if (type === "teaminn") return computeTeamInningsQuery(view, filters);
    // Player-based queries (batting / bowling / allround)
    let pms = applyPmsFilters(D.playerMatchStats, filters, type);
    if (type === "batting") pms = pms.filter(s => s.ballsFaced > 0 || s.isOut);
    if (type === "bowling") pms = pms.filter(s => s.overs > 0);

    if (view === "innings" || view === "match") {
      return computeInningsList(type, pms);
    }
    return computeGrouped(type, view, pms);
  }

  function applyPmsFilters(pms, f, type) {
    let out = pms;
    if (f.playerIds.length) out = out.filter(s => f.playerIds.includes(s.playerId));
    if (f.teamIds.length) out = out.filter(s => f.teamIds.includes(s.teamId));
    if (f.oppTeamIds.length) out = out.filter(s => f.oppTeamIds.includes(s.oppTeamId));
    if (f.tournamentIds.length) out = out.filter(s => f.tournamentIds.includes(s.tournamentId));
    if (f.clubIds.length) out = out.filter(s => f.clubIds.includes(s.clubId));
    if (f.isBox !== "any") {
      const want = f.isBox === "yes";
      out = out.filter(s => D.tournamentsById[s.tournamentId]?.isBoxCricket === want);
    }
    if (f.from) { const t = new Date(f.from).getTime(); out = out.filter(s => new Date(s.date).getTime() >= t); }
    if (f.to)   { const t = new Date(f.to).getTime() + 86400000; out = out.filter(s => new Date(s.date).getTime() <= t); }
    if (f.result !== "any") {
      out = out.filter(s => {
        const m = D.matchesById[s.matchId];
        if (!m) return false;
        if (f.result === "tied") return !m.winner;
        if (f.result === "won")  return m.winner === s.teamId;
        if (f.result === "lost") return m.winner && m.winner !== s.teamId;
        return true;
      });
    }
    if (f.innings !== "any") {
      out = out.filter(s => {
        const m = D.matchesById[s.matchId];
        if (!m) return false;
        const teamBattedFirst = m.inn1.teamId === s.teamId;
        if (type === "batting" || type === "allround") {
          // for batting filter: when did this player bat
          if (f.innings === "1") return teamBattedFirst;
          if (f.innings === "2") return !teamBattedFirst;
        } else {
          // bowling: when did this player bowl
          if (f.innings === "1") return !teamBattedFirst; // bowling in 1st inn = opponent bat 1st
          if (f.innings === "2") return teamBattedFirst;
        }
        return true;
      });
    }
    // numeric ranges
    if (f.runsMin) out = out.filter(s => s.runs >= f.runsMin);
    if (f.runsMax) out = out.filter(s => s.runs <= f.runsMax);
    if (f.ballsMin) out = out.filter(s => s.ballsFaced >= f.ballsMin);
    if (f.ballsMax) out = out.filter(s => s.ballsFaced <= f.ballsMax);
    if (f.wktsMin) out = out.filter(s => s.wickets >= f.wktsMin);
    if (f.wktsMax) out = out.filter(s => s.wickets <= f.wktsMax);
    if (f.oversMin) out = out.filter(s => s.overs >= f.oversMin);
    if (f.oversMax) out = out.filter(s => s.overs <= f.oversMax);
    return out;
  }

  function computeInningsList(type, pms) {
    const rows = pms.map((s, i) => ({
      ...s,
      _key: s.playerId + "|" + s.matchId,
      _match: D.matchesById[s.matchId],
      _tournament: D.tournamentsById[s.tournamentId],
      _team: D.teamsById[s.teamId],
      _opp: D.teamsById[s.oppTeamId],
      runsDisplay: s.isNotOut && s.ballsFaced > 0 ? `${s.runs}*` : `${s.runs}`,
      sr: s.ballsFaced ? (s.runs / s.ballsFaced) * 100 : 0,
      eco: s.overs ? s.runsConceded / s.overs : 0,
      bbi: `${s.wickets}/${s.runsConceded}`,
      result: D.matchesById[s.matchId]?.winner === s.teamId ? "Won" : D.matchesById[s.matchId]?.winner ? "Lost" : "Tied",
    }));
    return { rows, columns: type === "batting" ? BAT_INNINGS_COLS : type === "bowling" ? BOWL_INNINGS_COLS : ALL_INNINGS_COLS };
  }

  function computeGrouped(type, view, pms) {
    const keyOf = {
      career:     s => s.playerId,
      tournament: s => `${s.playerId}|${s.tournamentId}`,
      opposition: s => `${s.playerId}|${s.oppTeamId}`,
      ground:     s => `${s.playerId}|${s.clubId}`,
      month:      s => `${s.playerId}|${new Date(s.date).getFullYear()}-${String(new Date(s.date).getMonth() + 1).padStart(2, "0")}`,
      result:     s => {
        const m = D.matchesById[s.matchId];
        const r = !m?.winner ? "Tied" : m.winner === s.teamId ? "Won" : "Lost";
        return `${s.playerId}|${r}`;
      },
      team:       s => `${s.playerId}|${s.teamId}`,
    }[view];

    const groups = {};
    pms.forEach(s => {
      const k = keyOf(s);
      if (!groups[k]) groups[k] = newAgg(s, view);
      addToAgg(groups[k], s);
    });
    const rows = Object.values(groups).map(finalizeAgg);
    return { rows, columns: getColumns(type, view) };
  }

  function newAgg(s, view) {
    const m = D.matchesById[s.matchId];
    return {
      _key: s.playerId + "|" + view,
      playerId: s.playerId, playerName: s.playerName,
      teamId: s.teamId, oppTeamId: s.oppTeamId, tournamentId: s.tournamentId, clubId: s.clubId,
      matchResult: !m?.winner ? "Tied" : m.winner === s.teamId ? "Won" : "Lost",
      month: `${new Date(s.date).getFullYear()}-${String(new Date(s.date).getMonth() + 1).padStart(2, "0")}`,
      matches: 0, innings: 0, runs: 0, ballsFaced: 0, fours: 0, sixes: 0, notOuts: 0,
      ducks: 0, fifties: 0, hundreds: 0, highScore: 0,
      ballsBowled: 0, wickets: 0, runsConceded: 0, maidens: 0, dotBallsBowled: 0,
      bestBowlingFig: { w: 0, r: 1e9 }, bestBowling: "-",
      mom: 0,
    };
  }

  function addToAgg(a, s) {
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
      const ov = Math.floor(s.overs); const bx = Math.round((s.overs - ov) * 10);
      a.ballsBowled += ov * 6 + bx;
      a.wickets += s.wickets; a.runsConceded += s.runsConceded;
      a.maidens += s.maidens; a.dotBallsBowled += s.dotBalls;
      if (s.wickets > a.bestBowlingFig.w || (s.wickets === a.bestBowlingFig.w && s.runsConceded < a.bestBowlingFig.r)) {
        a.bestBowlingFig = { w: s.wickets, r: s.runsConceded };
        a.bestBowling = `${s.wickets}/${s.runsConceded}`;
      }
    }
    if (s.mom) a.mom += 1;
  }

  function finalizeAgg(a) {
    a.average = (a.innings - a.notOuts) > 0 ? a.runs / (a.innings - a.notOuts) : a.runs;
    a.strikeRate = a.ballsFaced ? (a.runs / a.ballsFaced) * 100 : 0;
    a.overs = Math.floor(a.ballsBowled / 6) + (a.ballsBowled % 6) / 10;
    a.bowlingEconomy = a.ballsBowled ? (a.runsConceded / (a.ballsBowled / 6)) : 0;
    a.bowlingAverage = a.wickets > 0 ? a.runsConceded / a.wickets : 0;
    a.bowlingStrikeRate = a.wickets > 0 ? a.ballsBowled / a.wickets : 0;
    a.impact = a.runs + a.wickets * 25 + a.sixes * 2 + a.fours;
    return a;
  }

  // ============================================================
  // TEAM-INNINGS + MATCH queries
  // ============================================================

  function computeTeamInningsQuery(view, filters) {
    let matches = applyMatchFilters(D.matches, filters);
    // synthesize team innings rows from inn1 + inn2
    let rows = [];
    matches.forEach(m => {
      [m.inn1, m.inn2].forEach((inn, idx) => {
        rows.push({
          _key: m.id + "|" + idx,
          matchId: m.id, teamId: inn.teamId, teamName: inn.teamName,
          oppTeamId: inn.teamId === m.team1 ? m.team2 : m.team1,
          oppTeamName: inn.teamId === m.team1 ? m.team2Fullname : m.team1Fullname,
          score: inn.score, wickets: inn.wickets, overs: inn.overs,
          rr: inn.overs > 0 ? inn.score / inn.overs : 0,
          innNo: idx + 1,
          result: !m.winner ? "Tied" : m.winner === inn.teamId ? "Won" : "Lost",
          tournament: D.tournamentsById[m.tournamentId]?.name,
          date: m.startDateTime,
        });
      });
    });
    if (filters.teamIds.length) rows = rows.filter(r => filters.teamIds.includes(r.teamId));
    if (filters.oppTeamIds.length) rows = rows.filter(r => filters.oppTeamIds.includes(r.oppTeamId));
    if (filters.innings !== "any") rows = rows.filter(r => String(r.innNo) === filters.innings);
    if (filters.runsMin) rows = rows.filter(r => r.score >= filters.runsMin);
    if (filters.runsMax) rows = rows.filter(r => r.score <= filters.runsMax);
    if (filters.result !== "any") {
      rows = rows.filter(r => r.result.toLowerCase() === filters.result);
    }

    if (view === "innings") return { rows, columns: TEAM_INN_COLS };

    // group
    const keyOf = view === "team" ? (r => r.teamId)
                  : view === "opposition" ? (r => `${r.teamId}|${r.oppTeamId}`)
                  : view === "tournament" ? (r => `${r.teamId}|${r.tournament}`)
                  : (r => r.teamId);
    const groups = {};
    rows.forEach(r => {
      const k = keyOf(r);
      if (!groups[k]) groups[k] = {
        _key: k, teamId: r.teamId, teamName: r.teamName, oppTeamId: r.oppTeamId, oppTeamName: r.oppTeamName,
        tournament: r.tournament,
        innings: 0, totalRuns: 0, wickets: 0, oversFaced: 0,
        highest: 0, lowest: 1e9, won: 0, lost: 0, tied: 0,
      };
      const g = groups[k];
      g.innings += 1; g.totalRuns += r.score; g.wickets += r.wickets; g.oversFaced += r.overs;
      if (r.score > g.highest) g.highest = r.score;
      if (r.score < g.lowest) g.lowest = r.score;
      if (r.result === "Won") g.won += 1;
      else if (r.result === "Lost") g.lost += 1;
      else g.tied += 1;
    });
    const final = Object.values(groups).map(g => ({
      ...g,
      avgPerInn: g.innings > 0 ? g.totalRuns / g.innings : 0,
      rr: g.oversFaced > 0 ? g.totalRuns / g.oversFaced : 0,
    }));
    return { rows: final, columns: view === "team" ? TEAM_SUMMARY_COLS : view === "opposition" ? TEAM_OPP_COLS : TEAM_TOURNAMENT_COLS };
  }

  function computeMatchQuery(view, filters) {
    let matches = applyMatchFilters(D.matches, filters);
    if (view === "match") {
      const rows = matches.map(m => {
        const t1Score = m.inn1.teamId === m.team1 ? m.inn1 : m.inn2;
        const t2Score = m.inn1.teamId === m.team2 ? m.inn1 : m.inn2;
        const tr = D.tournamentsById[m.tournamentId];
        return {
          _key: m.id, matchId: m.id, date: m.startDateTime,
          tournament: tr?.name, isBox: tr?.isBoxCricket,
          team1: m.team1Fullname, team2: m.team2Fullname,
          team1Id: m.team1, team2Id: m.team2,
          score1: `${t1Score.score}/${t1Score.wickets}`, score2: `${t2Score.score}/${t2Score.wickets}`,
          overs1: t1Score.overs, overs2: t2Score.overs,
          result: m.result,
          winnerId: m.winner,
          mom: m.manOfTheMatchName,
        };
      });
      return { rows, columns: MATCH_LIST_COLS };
    }
    if (view === "tournament") {
      const groups = {};
      matches.forEach(m => {
        const k = m.tournamentId;
        if (!groups[k]) groups[k] = {
          _key: k, tournamentId: k, tournament: D.tournamentsById[k]?.name,
          matches: 0, tied: 0, totalRuns: 0, totalWickets: 0,
        };
        const g = groups[k];
        g.matches += 1;
        if (!m.winner) g.tied += 1;
        g.totalRuns += m.inn1.score + m.inn2.score;
        g.totalWickets += m.inn1.wickets + m.inn2.wickets;
      });
      return { rows: Object.values(groups).map(g => ({ ...g, avgScore: g.matches > 0 ? g.totalRuns / (g.matches * 2) : 0 })), columns: TOURNAMENT_SUMMARY_COLS };
    }
    if (view === "team") {
      const groups = {};
      matches.forEach(m => {
        [m.team1, m.team2].forEach(tid => {
          if (!groups[tid]) groups[tid] = { _key: tid, teamId: tid, teamName: D.teamsById[tid]?.teamName, matches: 0, won: 0, lost: 0, tied: 0 };
          groups[tid].matches += 1;
          if (!m.winner) groups[tid].tied += 1;
          else if (m.winner === tid) groups[tid].won += 1;
          else groups[tid].lost += 1;
        });
      });
      return { rows: Object.values(groups).map(g => ({ ...g, winPct: g.matches > 0 ? (g.won / g.matches) * 100 : 0 })), columns: TEAM_RECORD_COLS };
    }
    return { rows: [], columns: [] };
  }

  function applyMatchFilters(matches, f) {
    let out = matches;
    if (f.tournamentIds.length) out = out.filter(m => f.tournamentIds.includes(m.tournamentId));
    if (f.clubIds.length) out = out.filter(m => f.clubIds.includes(m.clubId));
    if (f.teamIds.length) out = out.filter(m => f.teamIds.includes(m.team1) || f.teamIds.includes(m.team2));
    if (f.oppTeamIds.length) out = out.filter(m => f.oppTeamIds.includes(m.team1) || f.oppTeamIds.includes(m.team2));
    if (f.isBox !== "any") {
      const want = f.isBox === "yes";
      out = out.filter(m => D.tournamentsById[m.tournamentId]?.isBoxCricket === want);
    }
    if (f.from) { const t = new Date(f.from).getTime(); out = out.filter(m => new Date(m.startDateTime).getTime() >= t); }
    if (f.to)   { const t = new Date(f.to).getTime() + 86400000; out = out.filter(m => new Date(m.startDateTime).getTime() <= t); }
    return out;
  }

  // ============================================================
  // COLUMNS
  // ============================================================

  const playerCell = (v, row, navigate) => (
    <span className="inline-flex items-center gap-2">
      <U.Avatar name={row.playerName} size={20} />
      <span className="font-medium text-ink-100 text-[12.5px]">{row.playerName}</span>
    </span>
  );
  const teamCell = (id) => id ? (
    <span className="inline-flex items-center gap-1.5">
      <U.TeamBadge teamId={id} size={18} />
      <span className="text-[12px] text-ink-200">{D.teamsById[id]?.teamInitials}</span>
    </span>
  ) : "—";
  const tournamentCell = (id) => {
    const t = D.tournamentsById[id];
    if (!t) return "—";
    return <span className="text-[12px] text-ink-300 inline-flex items-center gap-1.5">{t.isBoxCricket && <span className="text-[8px] mono uppercase px-1 rounded bg-orange-cap/15 text-orange-cap border border-orange-cap/30">Box</span>}{t.name}</span>;
  };
  const dateCell = (v) => <span className="text-[11px] text-ink-300 mono">{H.fmtDate(v)}</span>;

  const BAT_INNINGS_COLS = [
    { k: "playerName", label: "Player", sortable: true, render: playerCell },
    { k: "teamId",     label: "Team",   render: (v) => teamCell(v) },
    { k: "oppTeamId",  label: "Vs",     render: (v) => teamCell(v) },
    { k: "tournamentId", label: "Tournament", render: (v) => tournamentCell(v) },
    { k: "date",       label: "Date",   sortable: true, render: dateCell },
    { k: "runs",       label: "R",      sortable: true, mono: true, accent: true, align: "right", render: (v, row) => row.isNotOut && row.ballsFaced > 0 ? <span><span className="font-bold">{v}</span>*</span> : <span className="font-bold">{v}</span> },
    { k: "ballsFaced", label: "B",      sortable: true, mono: true, align: "right" },
    { k: "fours",      label: "4s",     sortable: true, mono: true, align: "right" },
    { k: "sixes",      label: "6s",     sortable: true, mono: true, align: "right" },
    { k: "sr",         label: "SR",     sortable: true, mono: true, align: "right", fmt: (v, row) => row.ballsFaced ? H.fmt(v, 1) : "—" },
    { k: "result",     label: "Result", render: (v) => <span className={`text-[11px] font-semibold ${v === "Won" ? "text-up" : v === "Lost" ? "text-down" : "text-ink-400"}`}>{v}</span> },
  ];

  const BOWL_INNINGS_COLS = [
    { k: "playerName", label: "Player", sortable: true, render: playerCell },
    { k: "teamId",     label: "Team",   render: (v) => teamCell(v) },
    { k: "oppTeamId",  label: "Vs",     render: (v) => teamCell(v) },
    { k: "tournamentId", label: "Tournament", render: (v) => tournamentCell(v) },
    { k: "date",       label: "Date",   sortable: true, render: dateCell },
    { k: "overs",      label: "O",      sortable: true, mono: true, align: "right", fmt: v => H.fmtOvers(v) },
    { k: "maidens",    label: "M",      sortable: true, mono: true, align: "right" },
    { k: "runsConceded", label: "R",    sortable: true, mono: true, align: "right" },
    { k: "wickets",    label: "W",      sortable: true, mono: true, accent: true, align: "right", render: v => <span className="font-bold">{v}</span> },
    { k: "bowlingEconomy", label: "Econ", sortable: true, mono: true, align: "right", fmt: v => H.fmt(v, 2) },
    { k: "result",     label: "Result", render: (v) => <span className={`text-[11px] font-semibold ${v === "Won" ? "text-up" : v === "Lost" ? "text-down" : "text-ink-400"}`}>{v}</span> },
  ];

  const ALL_INNINGS_COLS = [
    { k: "playerName", label: "Player", sortable: true, render: playerCell },
    { k: "oppTeamId",  label: "Vs",     render: (v) => teamCell(v) },
    { k: "date",       label: "Date",   sortable: true, render: dateCell },
    { k: "runs",       label: "R",      sortable: true, mono: true, accent: true, align: "right" },
    { k: "ballsFaced", label: "B",      sortable: true, mono: true, align: "right" },
    { k: "sr",         label: "SR",     sortable: true, mono: true, align: "right", fmt: v => H.fmt(v, 1) },
    { k: "overs",      label: "O",      sortable: true, mono: true, align: "right", fmt: v => H.fmtOvers(v) },
    { k: "runsConceded", label: "RC",   sortable: true, mono: true, align: "right" },
    { k: "wickets",    label: "W",      sortable: true, mono: true, accent: true, align: "right" },
    { k: "bowlingEconomy", label: "Eco", sortable: true, mono: true, align: "right", fmt: v => H.fmt(v, 2) },
  ];

  // Grouped — career, tournament, opposition, etc share same shape for batting / bowling
  function getColumns(type, view) {
    const grouping = view === "career" ? null
                   : view === "tournament" ? { k: "tournamentId", label: "Tournament", render: (v) => tournamentCell(v) }
                   : view === "opposition" ? { k: "oppTeamId", label: "Opposition", render: (v) => teamCell(v) }
                   : view === "ground"     ? { k: "clubId", label: "Club hosting", render: (v) => D.clubsById[v]?.name }
                   : view === "month"      ? { k: "month", label: "Month", mono: true }
                   : view === "result"     ? { k: "matchResult", label: "Result", render: (v) => <span className={`text-[11px] font-semibold ${v === "Won" ? "text-up" : v === "Lost" ? "text-down" : "text-ink-400"}`}>{v}</span> }
                   : view === "team"       ? { k: "teamId", label: "Team", render: (v) => teamCell(v) }
                   : null;

    if (type === "batting") {
      const cols = [
        { k: "playerName", label: "Player", sortable: true, render: playerCell },
      ];
      if (grouping) cols.push({ ...grouping, sortable: true });
      cols.push(
        { k: "matches",     label: "M",   sortable: true, mono: true, align: "right" },
        { k: "innings",     label: "Inn", sortable: true, mono: true, align: "right" },
        { k: "notOuts",     label: "NO",  sortable: true, mono: true, align: "right" },
        { k: "runs",        label: "Runs", sortable: true, mono: true, accent: true, align: "right", render: (v) => <span className="font-bold">{v}</span> },
        { k: "highScore",   label: "HS",  sortable: true, mono: true, align: "right" },
        { k: "average",     label: "Avg", sortable: true, mono: true, align: "right", fmt: v => H.fmt(v, 2) },
        { k: "ballsFaced",  label: "BF",  sortable: true, mono: true, align: "right" },
        { k: "strikeRate",  label: "SR",  sortable: true, mono: true, align: "right", fmt: v => H.fmt(v, 1) },
        { k: "hundreds",    label: "100", sortable: true, mono: true, align: "right" },
        { k: "fifties",     label: "50",  sortable: true, mono: true, align: "right" },
        { k: "fours",       label: "4s",  sortable: true, mono: true, align: "right" },
        { k: "sixes",       label: "6s",  sortable: true, mono: true, align: "right" },
        { k: "ducks",       label: "0",   sortable: true, mono: true, align: "right" },
      );
      return cols;
    }
    if (type === "bowling") {
      const cols = [
        { k: "playerName", label: "Player", sortable: true, render: playerCell },
      ];
      if (grouping) cols.push({ ...grouping, sortable: true });
      cols.push(
        { k: "matches",     label: "M",   sortable: true, mono: true, align: "right" },
        { k: "overs",       label: "Ov",  sortable: true, mono: true, align: "right", fmt: v => H.fmtOvers(v) },
        { k: "maidens",     label: "Mdn", sortable: true, mono: true, align: "right" },
        { k: "runsConceded",label: "R",   sortable: true, mono: true, align: "right" },
        { k: "wickets",     label: "Wkts", sortable: true, mono: true, accent: true, align: "right", render: (v) => <span className="font-bold">{v}</span> },
        { k: "bestBowling", label: "BBI", mono: true, align: "right" },
        { k: "bowlingAverage", label: "Avg", sortable: true, mono: true, align: "right", fmt: v => v > 0 ? H.fmt(v, 2) : "—" },
        { k: "bowlingEconomy", label: "Econ", sortable: true, mono: true, align: "right", fmt: v => H.fmt(v, 2) },
        { k: "bowlingStrikeRate", label: "SR", sortable: true, mono: true, align: "right", fmt: v => v > 0 ? H.fmt(v, 1) : "—" },
      );
      return cols;
    }
    // all-round
    const cols = [
      { k: "playerName", label: "Player", sortable: true, render: playerCell },
    ];
    if (grouping) cols.push({ ...grouping, sortable: true });
    cols.push(
      { k: "matches",   label: "M",     sortable: true, mono: true, align: "right" },
      { k: "runs",      label: "Runs",  sortable: true, mono: true, accent: true, align: "right" },
      { k: "average",   label: "B Avg", sortable: true, mono: true, align: "right", fmt: v => H.fmt(v, 2) },
      { k: "strikeRate",label: "SR",    sortable: true, mono: true, align: "right", fmt: v => H.fmt(v, 1) },
      { k: "wickets",   label: "Wkts",  sortable: true, mono: true, accent: true, align: "right" },
      { k: "bowlingAverage", label: "Bw Avg", sortable: true, mono: true, align: "right", fmt: v => v > 0 ? H.fmt(v, 2) : "—" },
      { k: "bowlingEconomy", label: "Econ",   sortable: true, mono: true, align: "right", fmt: v => H.fmt(v, 2) },
      { k: "impact",    label: "Impact", sortable: true, mono: true, accent: true, align: "right", fmt: v => H.fmt(v, 0) },
    );
    return cols;
  }

  const TEAM_INN_COLS = [
    { k: "teamId",    label: "Team", sortable: true, render: (v, row) => <span className="inline-flex items-center gap-2"><U.TeamBadge teamId={v} size={20} /><span className="text-[12.5px] font-medium text-ink-100">{row.teamName}</span></span> },
    { k: "oppTeamId", label: "Vs",   render: (v, row) => <span className="text-[12px] text-ink-200">{row.oppTeamName}</span> },
    { k: "innNo",     label: "Inn",  mono: true, align: "right" },
    { k: "score",     label: "Score", sortable: true, mono: true, accent: true, align: "right", render: (v, row) => <span className="font-bold">{v}<span className="text-ink-400">/{row.wickets}</span></span> },
    { k: "overs",     label: "Ov",   sortable: true, mono: true, align: "right", fmt: v => H.fmtOvers(v) },
    { k: "rr",        label: "RR",   sortable: true, mono: true, align: "right", fmt: v => H.fmt(v, 2) },
    { k: "result",    label: "Result", render: (v) => <span className={`text-[11px] font-semibold ${v === "Won" ? "text-up" : v === "Lost" ? "text-down" : "text-ink-400"}`}>{v}</span> },
    { k: "tournament", label: "Tournament", render: (v) => <span className="text-[12px] text-ink-300">{v}</span> },
    { k: "date",      label: "Date", sortable: true, render: dateCell },
  ];
  const TEAM_SUMMARY_COLS = [
    { k: "teamName", label: "Team", sortable: true, render: (v, row) => <span className="inline-flex items-center gap-2"><U.TeamBadge teamId={row.teamId} size={20} /><span className="text-[12.5px] font-medium text-ink-100">{v}</span></span> },
    { k: "innings", label: "Inn", sortable: true, mono: true, align: "right" },
    { k: "totalRuns", label: "Total Runs", sortable: true, mono: true, accent: true, align: "right" },
    { k: "avgPerInn", label: "Avg/Inn", sortable: true, mono: true, align: "right", fmt: v => H.fmt(v, 1) },
    { k: "highest", label: "High", sortable: true, mono: true, align: "right" },
    { k: "lowest", label: "Low", sortable: true, mono: true, align: "right" },
    { k: "rr", label: "RR", sortable: true, mono: true, align: "right", fmt: v => H.fmt(v, 2) },
    { k: "won", label: "W", sortable: true, mono: true, align: "right" },
    { k: "lost", label: "L", sortable: true, mono: true, align: "right" },
    { k: "tied", label: "T", sortable: true, mono: true, align: "right" },
  ];
  const TEAM_OPP_COLS = [
    { k: "teamName", label: "Team", render: (v, row) => <span className="inline-flex items-center gap-2"><U.TeamBadge teamId={row.teamId} size={20} /><span className="text-[12.5px] font-medium text-ink-100">{v}</span></span> },
    { k: "oppTeamName", label: "Opposition", render: (v, row) => <span className="inline-flex items-center gap-2"><U.TeamBadge teamId={row.oppTeamId} size={20} /><span className="text-[12.5px] text-ink-200">{v}</span></span> },
    { k: "innings", label: "Inn", sortable: true, mono: true, align: "right" },
    { k: "totalRuns", label: "Total", sortable: true, mono: true, accent: true, align: "right" },
    { k: "avgPerInn", label: "Avg/Inn", sortable: true, mono: true, align: "right", fmt: v => H.fmt(v, 1) },
    { k: "highest", label: "High", sortable: true, mono: true, align: "right" },
    { k: "lowest", label: "Low", sortable: true, mono: true, align: "right" },
    { k: "won", label: "W", sortable: true, mono: true, align: "right" },
    { k: "lost", label: "L", sortable: true, mono: true, align: "right" },
  ];
  const TEAM_TOURNAMENT_COLS = [
    { k: "teamName", label: "Team", render: (v, row) => <span className="inline-flex items-center gap-2"><U.TeamBadge teamId={row.teamId} size={20} /><span className="text-[12.5px] font-medium text-ink-100">{v}</span></span> },
    { k: "tournament", label: "Tournament", render: v => <span className="text-[12px] text-ink-300">{v}</span> },
    { k: "innings", label: "Inn", sortable: true, mono: true, align: "right" },
    { k: "totalRuns", label: "Total", sortable: true, mono: true, accent: true, align: "right" },
    { k: "avgPerInn", label: "Avg/Inn", sortable: true, mono: true, align: "right", fmt: v => H.fmt(v, 1) },
    { k: "highest", label: "High", sortable: true, mono: true, align: "right" },
    { k: "won", label: "W", sortable: true, mono: true, align: "right" },
    { k: "lost", label: "L", sortable: true, mono: true, align: "right" },
  ];

  const MATCH_LIST_COLS = [
    { k: "date", label: "Date", sortable: true, render: dateCell },
    { k: "tournament", label: "Tournament", render: (v, row) => <span className="text-[12px] text-ink-300 inline-flex items-center gap-1.5">{row.isBox && <span className="text-[8px] mono uppercase px-1 rounded bg-orange-cap/15 text-orange-cap border border-orange-cap/30">Box</span>}{v}</span> },
    { k: "team1", label: "Team 1", render: (v, row) => <span className={`inline-flex items-center gap-2 ${row.winnerId === row.team1Id ? "font-bold text-ink-100" : "text-ink-300"}`}><U.TeamBadge teamId={row.team1Id} size={18} />{v}</span> },
    { k: "score1", label: "Score", mono: true, align: "right" },
    { k: "team2", label: "Team 2", render: (v, row) => <span className={`inline-flex items-center gap-2 ${row.winnerId === row.team2Id ? "font-bold text-ink-100" : "text-ink-300"}`}><U.TeamBadge teamId={row.team2Id} size={18} />{v}</span> },
    { k: "score2", label: "Score", mono: true, align: "right" },
    { k: "result", label: "Result", render: v => <span className="text-[11px] text-pitch font-medium">{v}</span> },
    { k: "mom", label: "MoM", render: v => v ? <span className="text-[11px] text-orange-cap inline-flex items-center gap-1"><U.Icon name="award" size={10} />{v}</span> : "—" },
  ];
  const TOURNAMENT_SUMMARY_COLS = [
    { k: "tournament", label: "Tournament", render: (v) => <span className="font-medium text-ink-100">{v}</span> },
    { k: "matches", label: "Matches", sortable: true, mono: true, align: "right", accent: true },
    { k: "tied", label: "Tied", sortable: true, mono: true, align: "right" },
    { k: "totalRuns", label: "Runs", sortable: true, mono: true, align: "right" },
    { k: "avgScore", label: "Avg/Inn", sortable: true, mono: true, align: "right", fmt: v => H.fmt(v, 1) },
    { k: "totalWickets", label: "Wkts", sortable: true, mono: true, align: "right" },
  ];
  const TEAM_RECORD_COLS = [
    { k: "teamName", label: "Team", render: (v, row) => <span className="inline-flex items-center gap-2"><U.TeamBadge teamId={row.teamId} size={20} /><span className="text-[12.5px] font-medium text-ink-100">{v}</span></span> },
    { k: "matches", label: "M", sortable: true, mono: true, align: "right" },
    { k: "won", label: "W", sortable: true, mono: true, accent: true, align: "right" },
    { k: "lost", label: "L", sortable: true, mono: true, align: "right" },
    { k: "tied", label: "T", sortable: true, mono: true, align: "right" },
    { k: "winPct", label: "Win %", sortable: true, mono: true, align: "right", fmt: v => H.fmt(v, 1) + "%" },
  ];

  window.SCS_StatsEngine = StatsEnginePage;
})();
