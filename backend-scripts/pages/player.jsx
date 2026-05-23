// Player profile page — career, charts, match log, records
(function () {
  const { useState, useMemo } = React;
  const U = window.SCS_UI;
  const D = window.SCS_DATA;
  const H = window.SCS_HELPERS;
  const R = window.Recharts;

  function PlayerPage({ params, navigate }) {
    const playerId = params.id;
    const player = D.playersById[playerId];
    const { state } = U.useFilters();

    if (!player) {
      return (
        <div>
          <U.FilterBar />
          <div className="px-6 py-10">
            <U.Empty icon="user-x" title="Player not found"
              message="The player ID in the URL doesn't match any record."
              action={<button onClick={() => navigate("leaderboards")} className="h-8 px-3 rounded-lg bg-pitch text-ink-900 font-semibold text-xs">Browse leaderboards</button>}
            />
          </div>
        </div>
      );
    }

    const club = D.clubsById[player.clubId];

    const allPMS = useMemo(() => D.playerMatchStats.filter(s => s.playerId === playerId), [playerId]);
    const filtered = useMemo(() => U.applyFilters(allPMS, state), [allPMS, state]);
    const career = useMemo(() => U.rollupPlayers(filtered)[0] || empty(playerId, player.name), [filtered, playerId, player.name]);

    // chronological for charts
    const chrono = useMemo(() => [...filtered].sort((a,b)=>new Date(a.date)-new Date(b.date)), [filtered]);
    const trend = useMemo(() => {
      let cum = 0;
      return chrono.map((s, i) => {
        cum += s.runs;
        return {
          idx: i+1,
          date: H.fmtDateShort(s.date),
          runs: s.runs,
          ballsFaced: s.ballsFaced,
          sr: s.ballsFaced ? (s.runs/s.ballsFaced)*100 : 0,
          wickets: s.wickets,
          eco: s.bowlingEconomy,
          cumRuns: cum,
        };
      });
    }, [chrono]);

    // teams played for
    const teamsPlayed = useMemo(() => {
      const set = new Set(filtered.map(s => s.teamId));
      return [...set].map(id => D.teamsById[id]).filter(Boolean);
    }, [filtered]);

    return (
      <div className="page-enter">
        <U.FilterBar />

        {/* Hero */}
        <div className="px-6 pt-6">
          <button onClick={() => navigate("leaderboards")}
            className="text-xs text-ink-400 hover:text-pitch inline-flex items-center gap-1 mb-3">
            <U.Icon name="arrow-left" size={11} /> Back to leaderboards
          </button>

          <div className="relative overflow-hidden rounded-2xl border border-ink-700 bg-gradient-to-br from-ink-800 via-ink-800 to-ink-850 p-6">
            <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full" style={{ background: `radial-gradient(circle, ${H.avatarColor(player.name)}22, transparent 70%)` }} />
            <div className="relative flex items-center gap-5">
              <U.Avatar name={player.name} size={88} ringColor="rgba(166,224,76,0.2)" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <U.Pill tone={player.role === "BAT" ? "pitch" : player.role === "BOWL" ? "purple" : player.role === "ALL" ? "orange" : "neutral"}>
                    <U.Icon name={player.role === "BAT" ? "trending-up" : player.role === "BOWL" ? "target" : player.role === "ALL" ? "swords" : "shield"} size={10} />
                    {{BAT:"Batsman", BOWL:"Bowler", ALL:"All-rounder", WK:"Wicket-keeper"}[player.role]}
                  </U.Pill>
                  <U.Pill>{club?.name}</U.Pill>
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-ink-100">{player.name}</h1>
                <div className="mt-2 text-sm text-ink-400">
                  Plays for {teamsPlayed.map(t => t.teamName).join(", ") || "no team in this window"}
                </div>
              </div>
              <div className="text-right">
                <button onClick={() => navigate("h2h", { batsmanId: player.id })}
                  className="h-9 px-3 rounded-lg bg-pitch text-ink-900 font-semibold text-xs inline-flex items-center gap-1.5 hover:bg-pitch/90">
                  <U.Icon name="swords" size={12} /> Head-to-head
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stat grid */}
        <div className="px-6 pt-4 grid grid-cols-12 gap-3">
          <StatBlock label="Matches" value={career.matches} icon="calendar" />
          <StatBlock label="Innings" value={career.innings} icon="hash" />
          <StatBlock label="Runs" value={career.runs} icon="trending-up" accent="#A6E04C" />
          <StatBlock label="Avg" value={H.fmt(career.average, 1)} icon="bar-chart-2" />
          <StatBlock label="SR" value={H.fmt(career.strikeRate, 1)} icon="zap" />
          <StatBlock label="HS" value={career.highScore} icon="crown" />
          <StatBlock label="50s / 100s" value={`${career.fifties} / ${career.hundreds}`} icon="medal" />
          <StatBlock label="4s / 6s" value={`${career.fours} / ${career.sixes}`} icon="rocket" />
          <StatBlock label="Wickets" value={career.wickets} icon="target" accent="#A78BFA" />
          <StatBlock label="Econ" value={H.fmt(career.bowlingEconomy, 2)} icon="minimize-2" />
          <StatBlock label="Best" value={career.bestBowling || "-"} icon="swords" />
          <StatBlock label="MoM" value={career.mom} icon="award" accent="#E8B84A" />
        </div>

        {/* Charts */}
        <div className="px-6 pt-4 grid grid-cols-12 gap-3">
          <U.Card padded={false} className="col-span-12 lg:col-span-8 p-5">
            <U.SectionTitle title="Performance over time" subtitle="Runs per match (bars) and strike rate (line)" accent="#A6E04C"
              right={<U.Pill tone="pitch"><U.Icon name="trending-up" size={10} />{career.runs} runs</U.Pill>}
            />
            {trend.length === 0 ? (
              <U.Empty title="No innings in this window" />
            ) : (
              <div style={{ width: "100%", height: 260 }}>
                <R.ResponsiveContainer>
                  <R.ComposedChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                    <R.CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <R.XAxis dataKey="date" />
                    <R.YAxis yAxisId="left" />
                    <R.YAxis yAxisId="right" orientation="right" />
                    <R.Tooltip />
                    <R.Bar yAxisId="left" dataKey="runs" fill="#A6E04C" radius={[3,3,0,0]} />
                    <R.Line yAxisId="right" type="monotone" dataKey="sr" stroke="#E8B84A" strokeWidth={2} dot={{ r: 2, fill: "#E8B84A" }} />
                  </R.ComposedChart>
                </R.ResponsiveContainer>
              </div>
            )}
          </U.Card>

          <U.Card padded={false} className="col-span-12 lg:col-span-4 p-5">
            <U.SectionTitle title="Skill profile" subtitle="Normalized vs. league average" accent="#A78BFA" />
            <RadarProfile career={career} />
          </U.Card>

          <U.Card padded={false} className="col-span-12 lg:col-span-6 p-5">
            <U.SectionTitle title="Wickets per match" subtitle="Bowling impact over time" accent="#A78BFA" />
            {trend.length === 0 ? (
              <U.Empty title="No bowling data" />
            ) : (
              <div style={{ width: "100%", height: 200 }}>
                <R.ResponsiveContainer>
                  <R.BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                    <R.CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <R.XAxis dataKey="date" />
                    <R.YAxis />
                    <R.Tooltip />
                    <R.Bar dataKey="wickets" fill="#A78BFA" radius={[3,3,0,0]} />
                  </R.BarChart>
                </R.ResponsiveContainer>
              </div>
            )}
          </U.Card>

          <U.Card padded={false} className="col-span-12 lg:col-span-6 p-5">
            <U.SectionTitle title="Career run accumulation" subtitle="Cumulative runs across the filtered window" accent="#A6E04C" />
            {trend.length === 0 ? (
              <U.Empty title="No batting data" />
            ) : (
              <div style={{ width: "100%", height: 200 }}>
                <R.ResponsiveContainer>
                  <R.AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                    <defs>
                      <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#A6E04C" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#A6E04C" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <R.CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <R.XAxis dataKey="date" />
                    <R.YAxis />
                    <R.Tooltip />
                    <R.Area type="monotone" dataKey="cumRuns" stroke="#A6E04C" fill="url(#cumGrad)" strokeWidth={2} />
                  </R.AreaChart>
                </R.ResponsiveContainer>
              </div>
            )}
          </U.Card>
        </div>

        {/* Matchups — who do they own, who owns them */}
        <MatchupSection player={player} navigate={navigate} />

        {/* Records held + Match log */}
        <div className="px-6 pt-4 pb-10 grid grid-cols-12 gap-3">
          <U.Card padded={false} className="col-span-12 lg:col-span-4 p-5">
            <U.SectionTitle title="Records & highlights" subtitle="Personal bests in this window" accent="#E8B84A" />
            <div className="flex flex-col gap-2">
              <Highlight icon="crown" label="Highest score" value={career.highScore + " runs"} accent="#E8B84A" />
              <Highlight icon="rocket" label="Most sixes in a match" value={maxOf(filtered, "sixes") + " sixes"} accent="#A6E04C" />
              <Highlight icon="target" label="Best bowling" value={career.bestBowling || "—"} accent="#A78BFA" />
              <Highlight icon="award" label="MoM awards" value={career.mom} accent="#E8B84A" />
              <Highlight icon="shield-check" label="Not-outs" value={career.notOuts} accent="#5BC0BE" />
              <Highlight icon="circle-dot" label="Dot balls bowled" value={career.dotBallsBowled} accent="#A78BFA" />
            </div>
          </U.Card>

          <U.Card padded={false} className="col-span-12 lg:col-span-8">
            <div className="px-5 py-4 border-b border-ink-700 flex items-center justify-between">
              <div>
                <div className="font-bold text-ink-100 text-base leading-tight">Match log</div>
                <div className="text-xs text-ink-400 mt-0.5">{filtered.length} matches · click any row to open scorecard</div>
              </div>
              <U.Pill tone="pitch"><U.Icon name="filter" size={10} />Filtered view</U.Pill>
            </div>
            {filtered.length === 0 ? (
              <U.Empty title="No matches in this window" message="Try expanding the date range or removing tournament filters." />
            ) : (
              <div className="overflow-x-auto max-h-[480px]">
                <U.Table>
                  <thead>
                    <tr>
                      <U.Th>Date</U.Th>
                      <U.Th>Opponent</U.Th>
                      <U.Th align="right">R</U.Th>
                      <U.Th align="right">B</U.Th>
                      <U.Th align="right">SR</U.Th>
                      <U.Th align="right">4/6</U.Th>
                      <U.Th align="right">Ov</U.Th>
                      <U.Th align="right">W</U.Th>
                      <U.Th align="right">RC</U.Th>
                      <U.Th align="right">Eco</U.Th>
                      <U.Th align="center">MoM</U.Th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...filtered].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(s => (
                      <tr key={s.matchId} onClick={() => navigate(`match/${s.matchId}`)} className="cursor-pointer hover:bg-ink-750/40 odd:bg-ink-850/30">
                        <U.Td mono className="text-ink-300 text-[12px]">{H.fmtDate(s.date)}</U.Td>
                        <U.Td>
                          <div className="flex items-center gap-2">
                            <U.TeamBadge teamId={s.oppTeamId} size={20} />
                            <span className="text-[12.5px] text-ink-200">{D.teamsById[s.oppTeamId]?.teamName}</span>
                          </div>
                        </U.Td>
                        <U.Td mono align="right">
                          <span className={s.runs >= 50 ? "text-pitch font-bold" : ""}>{s.runs}</span>
                          {s.isNotOut && s.ballsFaced > 0 && <span className="text-ink-400">*</span>}
                        </U.Td>
                        <U.Td mono align="right" className="text-ink-300">{s.ballsFaced || "—"}</U.Td>
                        <U.Td mono align="right" className="text-ink-300">{s.ballsFaced ? H.fmt(s.strikeRate,1) : "—"}</U.Td>
                        <U.Td mono align="right" className="text-ink-300">{s.ballsFaced ? `${s.fours}/${s.sixes}` : "—"}</U.Td>
                        <U.Td mono align="right" className="text-ink-300">{s.overs ? H.fmtOvers(s.overs) : "—"}</U.Td>
                        <U.Td mono align="right">
                          <span className={s.wickets >= 3 ? "text-purple-cap font-bold" : ""}>{s.overs ? s.wickets : "—"}</span>
                        </U.Td>
                        <U.Td mono align="right" className="text-ink-300">{s.overs ? s.runsConceded : "—"}</U.Td>
                        <U.Td mono align="right" className="text-ink-300">{s.overs ? H.fmt(s.bowlingEconomy,2) : "—"}</U.Td>
                        <U.Td align="center">{s.mom ? <U.Icon name="award" size={14} className="text-orange-cap inline-block" /> : ""}</U.Td>
                      </tr>
                    ))}
                  </tbody>
                </U.Table>
              </div>
            )}
          </U.Card>
        </div>
      </div>
    );
  }

  function StatBlock({ label, value, icon, accent }) {
    return (
      <div className="col-span-6 md:col-span-3 lg:col-span-2 rounded-xl border border-ink-700 bg-ink-800 p-3">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-ink-400 font-semibold">
          {icon && <U.Icon name={icon} size={10} />}
          {label}
        </div>
        <div className="mono font-bold text-xl mt-1.5" style={{ color: accent || "#E6E8EC" }}>{value}</div>
      </div>
    );
  }

  function Highlight({ icon, label, value, accent }) {
    return (
      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-ink-850 border border-ink-700">
        <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ background: `${accent}18`, color: accent }}>
          <U.Icon name={icon} size={14} />
        </div>
        <div className="flex-1 text-[12px] text-ink-300">{label}</div>
        <div className="mono font-bold text-sm" style={{ color: accent }}>{value}</div>
      </div>
    );
  }

  function RadarProfile({ career }) {
    // compare against league
    const all = U.rollupPlayers(D.playerMatchStats);
    const max = {
      runs: Math.max(...all.map(a => a.runs), 1),
      sr: Math.max(...all.map(a => a.strikeRate), 1),
      avg: Math.max(...all.map(a => a.average), 1),
      wickets: Math.max(...all.map(a => a.wickets), 1),
      sixes: Math.max(...all.map(a => a.sixes), 1),
      eco: Math.max(...all.map(a => a.bowlingEconomy), 1),
    };
    const data = [
      { axis: "Runs",   value: career.runs / max.runs * 100 },
      { axis: "Avg",    value: Math.min(career.average / 60, 1) * 100 },
      { axis: "SR",     value: Math.min(career.strikeRate / 200, 1) * 100 },
      { axis: "Sixes",  value: career.sixes / max.sixes * 100 },
      { axis: "Wkts",   value: career.wickets / max.wickets * 100 },
      { axis: "Econ",   value: career.bowlingEconomy > 0 ? Math.max(0, 100 - (career.bowlingEconomy / max.eco * 100)) : 0 },
    ];
    return (
      <div style={{ width: "100%", height: 240 }}>
        <R.ResponsiveContainer>
          <R.RadarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 16 }}>
            <R.PolarGrid stroke="#242C3D" />
            <R.PolarAngleAxis dataKey="axis" tick={{ fill: "#8B93A7", fontSize: 11, fontFamily: "JetBrains Mono" }} />
            <R.PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false} />
            <R.Radar dataKey="value" stroke="#A6E04C" fill="#A6E04C" fillOpacity={0.35} strokeWidth={1.5} />
          </R.RadarChart>
        </R.ResponsiveContainer>
      </div>
    );
  }

  function maxOf(arr, key) { if (!arr.length) return 0; return Math.max(...arr.map(s => s[key])); }

  // ============================================================
  // MATCHUP SECTION — bowlers a batter owns / struggles against (& vice versa)
  // ============================================================

  function MatchupSection({ player, navigate }) {
    const isBatter = player.role === "BAT" || player.role === "ALL" || player.role === "WK";
    const isBowler = player.role === "BOWL" || player.role === "ALL";

    const batMatchups = useMemo(() => computeMatchups(player.id, true), [player.id]);
    const bowlMatchups = useMemo(() => computeMatchups(player.id, false), [player.id]);

    // batter perspective
    const MIN_BALLS_BAT = 6;
    const hits = [...batMatchups].filter(m => m.balls >= MIN_BALLS_BAT).sort((a, b) => b.runs - a.runs).slice(0, 8);
    const struggles = [...batMatchups].filter(m => m.balls >= MIN_BALLS_BAT).sort((a, b) => {
      // sort by composite struggle score: dismissals + low SR
      const aScore = a.dismissals * 100 + (100 - a.sr);
      const bScore = b.dismissals * 100 + (100 - b.sr);
      return bScore - aScore;
    }).slice(0, 8);

    // bowler perspective
    const MIN_BALLS_BOWL = 6;
    const dominated = [...bowlMatchups].filter(m => m.balls >= MIN_BALLS_BOWL).sort((a, b) => {
      const aScore = a.dismissals * 100 + (100 - a.sr);
      const bScore = b.dismissals * 100 + (100 - b.sr);
      return bScore - aScore;
    }).slice(0, 8);
    const conceded = [...bowlMatchups].filter(m => m.balls >= MIN_BALLS_BOWL).sort((a, b) => b.runs - a.runs).slice(0, 8);

    if (!isBatter && !isBowler) return null;

    return (
      <div className="px-6 pt-4">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-1 rounded-sm bg-orange-cap" />
              <h2 className="text-lg font-bold tracking-tight text-ink-100">Personal matchups</h2>
            </div>
            <div className="text-xs text-ink-400 mt-0.5">All-time pairwise data · min {isBatter ? MIN_BALLS_BAT : MIN_BALLS_BOWL} balls faced</div>
          </div>
          <button onClick={() => navigate("h2h", { batsmanId: player.id })}
            className="text-xs text-pitch hover:underline inline-flex items-center gap-1">
            Open in head-to-head <U.Icon name="arrow-right" size={11} />
          </button>
        </div>

        <div className="grid grid-cols-12 gap-3">
          {isBatter && (
            <>
              <MatchupTable
                title="Bowlers they own"
                subtitle="Most runs scored against, all-time"
                rows={hits}
                accent="#A6E04C"
                icon="trending-up"
                primary={{ key: "runs", label: "R", accent: true }}
                cols={[
                  { k: "balls", label: "B" },
                  { k: "sr", label: "SR", fmt: v => H.fmt(v, 1) },
                  { k: "fours", label: "4s" },
                  { k: "sixes", label: "6s" },
                  { k: "dismissals", label: "Out", tone: v => v > 0 ? "down" : null },
                ]}
                navigate={navigate}
                emptyMsg="Not enough faced balls yet to compute matchups."
              />
              <MatchupTable
                title="Bowlers who own them"
                subtitle="Most dismissed by · lowest scoring against"
                rows={struggles}
                accent="#E87A5A"
                icon="target"
                primary={{ key: "dismissals", label: "OUT", accent: true, tone: "down" }}
                cols={[
                  { k: "balls", label: "B" },
                  { k: "runs", label: "R" },
                  { k: "sr", label: "SR", fmt: v => H.fmt(v, 1), tone: v => v < 80 ? "down" : null },
                  { k: "avg", label: "Avg", fmt: v => v < 99 ? H.fmt(v, 1) : "∞" },
                  { k: "dotPct", label: "Dot%", fmt: v => H.fmt(v, 0) + "%" },
                ]}
                navigate={navigate}
                emptyMsg="No bowler has consistently troubled this batter yet."
              />
            </>
          )}
          {isBowler && (
            <>
              <MatchupTable
                title="Batters they dominate"
                subtitle="Most dismissed · kept quiet · low SR"
                rows={dominated}
                accent="#A78BFA"
                icon="target"
                primary={{ key: "dismissals", label: "OUT", accent: true }}
                cols={[
                  { k: "balls", label: "B" },
                  { k: "runs", label: "R" },
                  { k: "sr", label: "SR", fmt: v => H.fmt(v, 1) },
                  { k: "dotPct", label: "Dot%", fmt: v => H.fmt(v, 0) + "%" },
                  { k: "avg", label: "Avg", fmt: v => v < 99 ? H.fmt(v, 1) : "∞" },
                ]}
                navigate={navigate}
                emptyMsg="Not enough bowled balls yet."
              />
              <MatchupTable
                title="Batters who take them down"
                subtitle="Most runs conceded to · highest SR"
                rows={conceded}
                accent="#E8B84A"
                icon="rocket"
                primary={{ key: "runs", label: "R", accent: true, tone: "down" }}
                cols={[
                  { k: "balls", label: "B" },
                  { k: "sr", label: "SR", fmt: v => H.fmt(v, 1), tone: v => v > 150 ? "down" : null },
                  { k: "fours", label: "4s" },
                  { k: "sixes", label: "6s" },
                  { k: "dismissals", label: "Out", tone: v => v === 0 ? "down" : null },
                ]}
                navigate={navigate}
                emptyMsg="No batter has consistently scored heavily off this bowler yet."
              />
            </>
          )}
        </div>
      </div>
    );
  }

  function MatchupTable({ title, subtitle, rows, accent, icon, primary, cols, navigate, emptyMsg }) {
    return (
      <div className={`col-span-12 ${(rows.length > 0 || true) ? "lg:col-span-6" : "lg:col-span-6"}`}>
        <U.Card padded={false}>
          <div className="px-5 py-3 border-b border-ink-700 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ background: `${accent}18`, color: accent }}>
              <U.Icon name={icon} size={14} />
            </div>
            <div>
              <div className="font-bold text-ink-100">{title}</div>
              <div className="text-[11px] text-ink-400 mt-0.5">{subtitle}</div>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="py-10 px-5">
              <U.Empty icon="search-x" title="Not enough data" message={emptyMsg} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold px-3 py-2 text-left border-b border-ink-700 w-10">#</th>
                    <th className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold px-3 py-2 text-left border-b border-ink-700">Opponent</th>
                    <th className="text-[10px] uppercase tracking-wider font-semibold px-3 py-2 text-right border-b border-ink-700" style={{ color: accent }}>{primary.label}</th>
                    {cols.map(c => (
                      <th key={c.k} className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold px-3 py-2 text-right border-b border-ink-700">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.oppId} onClick={() => navigate(`player/${r.oppId}`)}
                      className="cursor-pointer hover:bg-ink-750/40 odd:bg-ink-850/30 transition-colors">
                      <td className="px-3 py-2 border-b border-ink-800">
                        <U.RankBadge rank={i + 1} size="sm" />
                      </td>
                      <td className="px-3 py-2 border-b border-ink-800">
                        <div className="flex items-center gap-2">
                          <U.Avatar name={r.oppName} size={24} />
                          <div className="min-w-0">
                            <div className="text-[12.5px] font-medium text-ink-100 truncate">{r.oppName}</div>
                            <div className="text-[10px] text-ink-400 mono uppercase tracking-wider">{D.playersById[r.oppId]?.role || "—"} · {D.clubsById[D.playersById[r.oppId]?.clubId]?.name?.split(" ")[0] || ""}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 border-b border-ink-800 text-right mono">
                        <span className="text-base font-bold" style={{ color: primary.tone === "down" ? "#E87A5A" : accent }}>
                          {r[primary.key]}
                        </span>
                      </td>
                      {cols.map(c => {
                        const v = r[c.k];
                        const tone = c.tone ? c.tone(v) : null;
                        const toneCls = tone === "down" ? "text-down" : tone === "up" ? "text-up" : "text-ink-300";
                        return (
                          <td key={c.k} className={`px-3 py-2 border-b border-ink-800 text-right mono text-[12px] ${toneCls}`}>
                            {c.fmt ? c.fmt(v) : v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </U.Card>
      </div>
    );
  }

  function computeMatchups(playerId, asBatter) {
    const balls = D.balls.filter(b => asBatter ? b.strikerId === playerId : b.bowlerId === playerId);
    const groups = {};
    balls.forEach(b => {
      const oppId = asBatter ? b.bowlerId : b.strikerId;
      const oppName = asBatter ? b.bowlerName : b.strikerName;
      if (!groups[oppId]) groups[oppId] = { oppId, oppName, balls: 0, runs: 0, dismissals: 0, fours: 0, sixes: 0, dots: 0 };
      const g = groups[oppId];
      g.balls += 1;
      g.runs += b.run;
      if (b.isWicket) g.dismissals += 1;
      if (b.isFour) g.fours += 1;
      if (b.isSix) g.sixes += 1;
      if (b.run === 0 && !b.isWicket) g.dots += 1;
    });
    return Object.values(groups).map(g => ({
      ...g,
      sr: g.balls ? (g.runs / g.balls) * 100 : 0,
      avg: g.dismissals > 0 ? g.runs / g.dismissals : 999,
      dotPct: g.balls ? (g.dots / g.balls) * 100 : 0,
    }));
  }
  function empty(id, name) {
    return { playerId: id, playerName: name, matches:0, innings:0, runs:0, ballsFaced:0, fours:0, sixes:0,
      hundreds:0, fifties:0, ducks:0, notOuts:0, highScore:0, average:0, strikeRate:0,
      wickets:0, oversBowled:0, ballsBowled:0, runsConceded:0, maidens:0, dotBallsBowled:0,
      bowlingEconomy:0, bowlingAverage:0, bowlingStrikeRate:0, bestBowling:"-",
      bestBowlingFig:{w:0,r:0}, mom:0,
    };
  }

  window.SCS_Player = PlayerPage;
})();
