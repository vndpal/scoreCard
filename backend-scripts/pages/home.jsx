// Home / Dashboard page
(function () {
  const { useMemo } = React;
  const U = window.SCS_UI;
  const D = window.SCS_DATA;
  const H = window.SCS_HELPERS;
  const R = window.Recharts;

  function HomePage({ navigate }) {
    const { state, range } = U.useFilters();
    const filteredPMS = useMemo(() => U.applyFilters(D.playerMatchStats, state), [state]);
    const filteredMatches = useMemo(() => U.applyMatchFilters(D.matches, state), [state]);

    // hero stats
    const hero = useMemo(() => {
      const totalRuns = filteredPMS.reduce((s, x) => s + x.runs, 0);
      const totalWk = filteredPMS.reduce((s, x) => s + x.wickets, 0);
      const totalSixes = filteredPMS.reduce((s, x) => s + x.sixes, 0);
      const totalFours = filteredPMS.reduce((s, x) => s + x.fours, 0);
      // most active player
      const matchCount = {};
      filteredPMS.forEach(s => { matchCount[s.playerId] = (matchCount[s.playerId] || 0) + 1; });
      const mostActiveId = Object.entries(matchCount).sort((a,b)=>b[1]-a[1])[0]?.[0];
      const mostActive = mostActiveId ? { player: D.playersById[mostActiveId], matches: matchCount[mostActiveId] } : null;
      return { totalRuns, totalWk, totalSixes, totalFours, totalMatches: filteredMatches.length, mostActive };
    }, [filteredPMS, filteredMatches]);

    // leaderboard previews
    const rolled = useMemo(() => U.rollupPlayers(filteredPMS), [filteredPMS]);
    const topRuns = [...rolled].sort((a,b)=>b.runs-a.runs).slice(0,5);
    const topWk = [...rolled].sort((a,b)=>b.wickets-a.wickets).slice(0,5);
    const topSixes = [...rolled].sort((a,b)=>b.sixes-a.sixes).slice(0,5);
    const topAvg = [...rolled].filter(r => r.ballsFaced >= 60).sort((a,b)=>b.average-a.average).slice(0,5);

    // recent matches
    const recent = [...filteredMatches].sort((a,b)=>new Date(b.startDateTime)-new Date(a.startDateTime)).slice(0,6);

    // top performers of the month (last 30d) — top run, top wicket
    const monthCutoff = new Date(D.asOf).getTime() - 30*86400000;
    const monthPMS = filteredPMS.filter(s => new Date(s.date).getTime() >= monthCutoff);
    const monthRolled = U.rollupPlayers(monthPMS);
    const monthTopBat = [...monthRolled].sort((a,b)=>b.runs-a.runs)[0];
    const monthTopBowl = [...monthRolled].sort((a,b)=>b.wickets-a.wickets)[0];
    const monthMomLeader = [...monthRolled].sort((a,b)=>b.mom-a.mom)[0];

    // runs distribution chart — by tournament
    const tournamentBreakdown = useMemo(() => {
      const map = {};
      filteredPMS.forEach(s => {
        const tn = D.tournamentsById[s.tournamentId]?.name?.split(" ").slice(0,2).join(" ") || "?";
        map[tn] = (map[tn] || 0) + s.runs;
      });
      return Object.entries(map).map(([name, runs]) => ({ name, runs })).sort((a,b)=>b.runs-a.runs).slice(0, 8);
    }, [filteredPMS]);

    // Activity over time (matches per week)
    const activity = useMemo(() => {
      const buckets = {};
      filteredMatches.forEach(m => {
        const d = new Date(m.startDateTime);
        const wk = `${d.getFullYear()}-W${Math.floor((d.getDate()-1)/7)+1}-${d.getMonth()+1}`;
        buckets[wk] = (buckets[wk] || 0) + 1;
      });
      const all = [...filteredMatches].map(m => new Date(m.startDateTime).getTime()).sort((a,b)=>a-b);
      if (!all.length) return [];
      // weekly buckets
      const first = new Date(all[0]); const last = new Date(all[all.length-1]);
      const out = [];
      const start = new Date(first.getFullYear(), first.getMonth(), 1);
      const end = new Date(last.getFullYear(), last.getMonth()+1, 1);
      const monthly = {};
      filteredMatches.forEach(m => {
        const d = new Date(m.startDateTime);
        const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
        monthly[k] = (monthly[k] || 0) + 1;
      });
      const keys = Object.keys(monthly).sort();
      keys.forEach(k => {
        const [y,m] = k.split("-");
        const label = new Date(Number(y), Number(m)-1, 1).toLocaleString("en-IN", { month:"short", year:"2-digit"});
        out.push({ name: label, matches: monthly[k] });
      });
      return out;
    }, [filteredMatches]);

    return (
      <div className="page-enter">
        <U.FilterBar />

        {/* Hero */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-[11px] text-pitch uppercase tracking-[0.18em] font-semibold mb-1">Overview · {state.preset === "all" ? "All time" : U.useFilters().presets[state.preset].label}</div>
              <h1 className="text-3xl font-extrabold text-ink-100 tracking-tight">Cricket Dashboard</h1>
              <div className="text-sm text-ink-400 mt-1">Aggregated across {D.clubs.length} clubs · {D.tournaments.length} tournaments · {D.players.length} players</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-ink-400 uppercase tracking-[0.14em] font-semibold">Pulse</div>
              <div className="mono text-pitch text-sm mt-1 flex items-center gap-2 justify-end">
                <span className="h-1.5 w-1.5 rounded-full bg-pitch animate-pulse" />
                {filteredMatches.length ? `${filteredMatches.length} matches in view` : "0 matches"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <HeroStat label="Total matches" value={hero.totalMatches} icon="swords" tone="pitch" />
            <HeroStat label="Total runs" value={hero.totalRuns.toLocaleString()} icon="bar-chart-3" />
            <HeroStat label="Total wickets" value={hero.totalWk.toLocaleString()} icon="target" />
            <HeroStat label="Sixes hit" value={hero.totalSixes.toLocaleString()} icon="zap" tone="orange" />
            <HeroStat label="Fours hit" value={hero.totalFours.toLocaleString()} icon="trending-up" />
            <HeroStat
              label="Most active"
              value={hero.mostActive ? hero.mostActive.player.name.split(" ")[0] : "—"}
              sub={hero.mostActive ? `${hero.mostActive.matches} matches` : ""}
              icon="user-check"
              avatar={hero.mostActive?.player.name}
            />
          </div>
        </div>

        {/* Top of month + activity */}
        <div className="px-6 pt-4 grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8">
            <U.Card padded={false} className="p-5">
              <U.SectionTitle title="Match volume" subtitle="Matches played per month across the network" accent="#A6E04C" />
              <div style={{ width: "100%", height: 200 }}>
                <R.ResponsiveContainer>
                  <R.AreaChart data={activity} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <defs>
                      <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#A6E04C" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#A6E04C" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <R.CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <R.XAxis dataKey="name" />
                    <R.YAxis />
                    <R.Tooltip />
                    <R.Area type="monotone" dataKey="matches" stroke="#A6E04C" fill="url(#actGrad)" strokeWidth={2} />
                  </R.AreaChart>
                </R.ResponsiveContainer>
              </div>
            </U.Card>
          </div>
          <div className="col-span-12 lg:col-span-4 grid grid-cols-1 gap-3">
            <PerformerCard
              label="Top bat · last 30d"
              tone="orange"
              player={monthTopBat && D.playersById[monthTopBat.playerId]}
              primary={monthTopBat ? `${monthTopBat.runs}` : "—"}
              primaryLabel="runs"
              sub={monthTopBat ? `${monthTopBat.innings} inns · avg ${H.fmt(monthTopBat.average,1)} · SR ${H.fmt(monthTopBat.strikeRate,1)}` : ""}
              onClick={() => monthTopBat && navigate(`player/${monthTopBat.playerId}`)}
            />
            <PerformerCard
              label="Top bowl · last 30d"
              tone="purple"
              player={monthTopBowl && D.playersById[monthTopBowl.playerId]}
              primary={monthTopBowl ? `${monthTopBowl.wickets}` : "—"}
              primaryLabel="wkts"
              sub={monthTopBowl ? `econ ${H.fmt(monthTopBowl.bowlingEconomy,2)} · ${monthTopBowl.bestBowling}` : ""}
              onClick={() => monthTopBowl && navigate(`player/${monthTopBowl.playerId}`)}
            />
            <PerformerCard
              label="MoM leader · last 30d"
              tone="pitch"
              player={monthMomLeader && D.playersById[monthMomLeader.playerId]}
              primary={monthMomLeader ? `${monthMomLeader.mom}` : "—"}
              primaryLabel="awards"
              sub={monthMomLeader ? `${monthMomLeader.matches} matches` : ""}
              onClick={() => monthMomLeader && navigate(`player/${monthMomLeader.playerId}`)}
            />
          </div>
        </div>

        {/* Leaderboard previews */}
        <div className="px-6 pt-4 grid grid-cols-12 gap-4">
          <LeaderboardCard title="Most runs" accent="#A6E04C" rows={topRuns} valueKey="runs" valueLabel="R" subKeys={[{k:"average",label:"Avg",d:1},{k:"strikeRate",label:"SR",d:1}]} onPlayer={(id)=>navigate(`player/${id}`)} onMore={()=>navigate("leaderboards")} />
          <LeaderboardCard title="Most wickets" accent="#A78BFA" rows={topWk} valueKey="wickets" valueLabel="W" subKeys={[{k:"bowlingEconomy",label:"Eco",d:2},{k:"bestBowling",label:"Best",d:null}]} onPlayer={(id)=>navigate(`player/${id}`)} onMore={()=>navigate("leaderboards")} />
          <LeaderboardCard title="Most sixes" accent="#E8B84A" rows={topSixes} valueKey="sixes" valueLabel="6s" subKeys={[{k:"fours",label:"4s",d:0},{k:"runs",label:"R",d:0}]} onPlayer={(id)=>navigate(`player/${id}`)} onMore={()=>navigate("leaderboards")} />
          <LeaderboardCard title="Best average" accent="#5BC0BE" rows={topAvg} valueKey="average" valueDecimal={1} valueLabel="" subKeys={[{k:"runs",label:"R",d:0},{k:"strikeRate",label:"SR",d:1}]} onPlayer={(id)=>navigate(`player/${id}`)} onMore={()=>navigate("leaderboards")} />
        </div>

        {/* Recent matches + tournament breakdown */}
        <div className="px-6 pt-4 pb-10 grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8">
            <U.Card padded={false} className="p-5">
              <U.SectionTitle
                title="Recent matches"
                subtitle="Latest results across all tournaments"
                accent="#A6E04C"
                right={<button onClick={()=>navigate("matches")} className="text-xs text-pitch hover:underline inline-flex items-center gap-1">All matches <U.Icon name="arrow-right" size={11} /></button>}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {recent.map(m => <MatchRow key={m.id} m={m} onClick={() => navigate(`match/${m.id}`)} />)}
              </div>
            </U.Card>
          </div>
          <div className="col-span-12 lg:col-span-4">
            <U.Card padded={false} className="p-5">
              <U.SectionTitle title="Runs by tournament" subtitle="Aggregate across filtered window" accent="#E8B84A" />
              <div style={{ width: "100%", height: 240 }}>
                <R.ResponsiveContainer>
                  <R.BarChart data={tournamentBreakdown} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
                    <R.CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <R.XAxis type="number" />
                    <R.YAxis type="category" dataKey="name" width={110} />
                    <R.Tooltip />
                    <R.Bar dataKey="runs" fill="#E8B84A" radius={[0,3,3,0]} />
                  </R.BarChart>
                </R.ResponsiveContainer>
              </div>
            </U.Card>
          </div>
        </div>
      </div>
    );
  }

  function HeroStat({ label, value, sub, icon, tone, avatar }) {
    const toneCls = tone === "pitch" ? "border-pitch/30 bg-pitch/[0.04]" : tone === "orange" ? "border-orange-cap/30 bg-orange-cap/[0.04]" : "border-ink-700 bg-ink-800";
    const accentCls = tone === "pitch" ? "text-pitch" : tone === "orange" ? "text-orange-cap" : "text-ink-100";
    return (
      <div className={`col-span-6 md:col-span-4 lg:col-span-2 rounded-xl border ${toneCls} p-3.5 relative overflow-hidden`}>
        <div className="text-[10px] uppercase tracking-[0.14em] text-ink-400 font-semibold flex items-center gap-1.5">
          {icon && <U.Icon name={icon} size={11} />}
          {label}
        </div>
        <div className="mt-2 flex items-end gap-2">
          {avatar && <U.Avatar name={avatar} size={28} />}
          <div className={`mono font-extrabold text-2xl leading-none ${accentCls}`}>{value}</div>
        </div>
        {sub && <div className="text-[11px] text-ink-400 mt-1">{sub}</div>}
      </div>
    );
  }

  function PerformerCard({ label, player, primary, primaryLabel, sub, tone, onClick }) {
    const accent = tone === "orange" ? "#E8B84A" : tone === "purple" ? "#A78BFA" : "#A6E04C";
    const ringBg = tone === "orange" ? "rgba(232,184,74,0.10)" : tone === "purple" ? "rgba(167,139,250,0.10)" : "rgba(166,224,76,0.10)";
    return (
      <button onClick={onClick} className="text-left bg-ink-800 hover:bg-ink-750 border border-ink-700 rounded-xl p-4 transition-colors relative overflow-hidden focus-ring">
        <div className="absolute inset-y-0 left-0 w-0.5" style={{ background: accent }} />
        <div className="text-[10px] uppercase tracking-[0.14em] text-ink-400 font-semibold flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} /> {label}
        </div>
        <div className="mt-2.5 flex items-center gap-3">
          {player && <U.Avatar name={player.name} size={36} ringColor={ringBg} />}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-ink-100 text-sm truncate">{player?.name || "—"}</div>
            <div className="text-[11px] text-ink-400 mt-0.5 truncate">{sub}</div>
          </div>
          <div className="text-right">
            <div className="mono text-2xl font-bold" style={{ color: accent }}>{primary}</div>
            <div className="mono text-[10px] uppercase tracking-wider text-ink-400">{primaryLabel}</div>
          </div>
        </div>
      </button>
    );
  }

  function LeaderboardCard({ title, accent, rows, valueKey, valueLabel, valueDecimal, subKeys, onPlayer, onMore }) {
    return (
      <div className="col-span-12 md:col-span-6 lg:col-span-3">
        <U.Card padded={false} className="p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-1 rounded-sm" style={{ background: accent }} />
              <div className="text-sm font-bold tracking-tight">{title}</div>
            </div>
            <button onClick={onMore} className="text-[10px] text-ink-400 hover:text-pitch uppercase tracking-wider font-semibold inline-flex items-center gap-1">
              All <U.Icon name="arrow-right" size={10} />
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            {rows.map((r, i) => (
              <button key={r.playerId} onClick={()=>onPlayer(r.playerId)}
                className="flex items-center gap-2.5 py-1.5 px-1.5 rounded-md hover:bg-ink-750 group">
                <U.RankBadge rank={i+1} size="sm" />
                <U.Avatar name={r.playerName} size={22} />
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[12.5px] truncate font-medium text-ink-100 group-hover:text-pitch">{r.playerName}</div>
                  <div className="text-[10px] text-ink-400 mono">
                    {subKeys.map((s,si) => (
                      <span key={s.k}>
                        {si>0 && " · "}
                        <span className="uppercase tracking-wider">{s.label}</span> {s.d == null ? r[s.k] : H.fmt(r[s.k], s.d)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mono text-sm font-bold" style={{ color: accent }}>
                  {valueDecimal != null ? H.fmt(r[valueKey], valueDecimal) : r[valueKey]}
                  {valueLabel && <span className="text-[10px] text-ink-400 ml-0.5 uppercase">{valueLabel}</span>}
                </div>
              </button>
            ))}
          </div>
        </U.Card>
      </div>
    );
  }

  function MatchRow({ m, onClick }) {
    const t1won = m.winner === m.team1;
    const t2won = m.winner === m.team2;
    const tname = D.tournamentsById[m.tournamentId]?.name;
    return (
      <button onClick={onClick} className="text-left bg-ink-850 hover:bg-ink-800 border border-ink-700 rounded-lg p-3 transition-colors focus-ring">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-2">
          <span className="truncate">{tname}</span>
          <span className="mono">{H.fmtDate(m.startDateTime)}</span>
        </div>
        <div className="space-y-1">
          <TeamScoreLine team={D.teamsById[m.team1]} fallbackName={m.team1Fullname} score={m.inn1.teamId === m.team1 ? m.inn1 : m.inn2} won={t1won} />
          <TeamScoreLine team={D.teamsById[m.team2]} fallbackName={m.team2Fullname} score={m.inn1.teamId === m.team2 ? m.inn1 : m.inn2} won={t2won} />
        </div>
        <div className="mt-2 text-[11px] text-pitch font-medium truncate flex items-center gap-1.5">
          <U.Icon name="trophy" size={11} />
          {m.result}
        </div>
      </button>
    );
  }
  function TeamScoreLine({ team, fallbackName, score, won }) {
    const name = team?.teamName || fallbackName || "—";
    return (
      <div className={`flex items-center gap-2 ${won ? '' : 'opacity-75'}`}>
        {team ? <U.TeamBadge teamId={team.id} size={22} /> : <span className="h-[22px] w-[22px] rounded-md bg-ink-750 border border-ink-700" />}
        <span className={`text-sm flex-1 truncate ${won ? 'font-bold text-ink-100' : 'text-ink-200'}`}>{name}</span>
        <span className="mono text-sm">
          <span className="font-bold">{score.score}</span>
          <span className="text-ink-400">/{score.wickets}</span>
          <span className="text-ink-500 text-[11px] ml-1">({H.fmtOvers(score.overs)})</span>
        </span>
      </div>
    );
  }

  window.SCS_Home = HomePage;
})();
