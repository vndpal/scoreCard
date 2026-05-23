// Leaderboards — 20+ categories across Batting, Bowling, All-rounder/Team/Misc
(function () {
  const { useState, useMemo } = React;
  const U = window.SCS_UI;
  const D = window.SCS_DATA;
  const H = window.SCS_HELPERS;

  // Each category defines: key, label, tab, valueGetter (from rollup), sortKey, formatter, qualifier (player must meet)
  const CATEGORIES = {
    batting: [
      { key: "runs", label: "Most runs", icon: "trending-up", value: r => r.runs, format: v => v, sort: "runs", primary: "runs", desc: true },
      { key: "highScore", label: "Highest score", icon: "crown", value: r => r.highScore, format: v => v, sort: "highScore", primary: "highScore", desc: true,
        extra: { label: "innings", get: r => r.innings } },
      { key: "average", label: "Best average", icon: "bar-chart-2", value: r => r.average, format: v => H.fmt(v,2), sort: "average", primary: "average", desc: true, qualifier: r => r.ballsFaced >= 30 },
      { key: "strikeRate", label: "Best strike rate", icon: "zap", value: r => r.strikeRate, format: v => H.fmt(v,1), sort: "strikeRate", primary: "strikeRate", desc: true, qualifier: r => r.ballsFaced >= 60, threshold: "minBalls" },
      { key: "fours", label: "Most fours", icon: "arrow-right", value: r => r.fours, format: v => v, sort: "fours", primary: "fours", desc: true },
      { key: "sixes", label: "Most sixes", icon: "rocket", value: r => r.sixes, format: v => v, sort: "sixes", primary: "sixes", desc: true },
      { key: "hundreds", label: "Most centuries", icon: "trophy", value: r => r.hundreds, format: v => v, sort: "hundreds", primary: "hundreds", desc: true },
      { key: "fifties", label: "Most fifties", icon: "medal", value: r => r.fifties, format: v => v, sort: "fifties", primary: "fifties", desc: true },
      { key: "ducks", label: "Most ducks", icon: "egg", value: r => r.ducks, format: v => v, sort: "ducks", primary: "ducks", desc: true, tone: "down" },
      { key: "notOuts", label: "Most not outs", icon: "shield-check", value: r => r.notOuts, format: v => v, sort: "notOuts", primary: "notOuts", desc: true },
    ],
    bowling: [
      { key: "wickets", label: "Most wickets", icon: "target", value: r => r.wickets, format: v => v, sort: "wickets", primary: "wickets", desc: true },
      { key: "bowlingEconomy", label: "Best economy", icon: "minimize-2", value: r => r.bowlingEconomy, format: v => H.fmt(v,2), sort: "bowlingEconomy", primary: "bowlingEconomy", desc: false, qualifier: r => r.ballsBowled >= 24, threshold: "minOvers", tone: "good-low" },
      { key: "bowlingAverage", label: "Best bowling average", icon: "activity", value: r => r.bowlingAverage, format: v => H.fmt(v,2), sort: "bowlingAverage", primary: "bowlingAverage", desc: false, qualifier: r => r.wickets >= 3, tone: "good-low" },
      { key: "bestBowling", label: "Best bowling figures", icon: "swords", value: r => r.bestBowling, format: v => v, sort: "_bb", primary: "bestBowling", desc: true,
        sortVal: r => r.bestBowlingFig.w * 1000 - r.bestBowlingFig.r, extra: { label: "wkts", get: r => r.wickets } },
      { key: "maidens", label: "Most maidens", icon: "shield", value: r => r.maidens, format: v => v, sort: "maidens", primary: "maidens", desc: true },
      { key: "dotBallsBowled", label: "Most dot balls", icon: "circle-dot", value: r => r.dotBallsBowled, format: v => v, sort: "dotBallsBowled", primary: "dotBallsBowled", desc: true },
      { key: "bowlingStrikeRate", label: "Best bowling SR", icon: "timer", value: r => r.bowlingStrikeRate, format: v => H.fmt(v,1), sort: "bowlingStrikeRate", primary: "bowlingStrikeRate", desc: false, qualifier: r => r.wickets >= 3, tone: "good-low" },
      { key: "hatTricks", label: "Hat-tricks", icon: "sparkles", value: r => 0, format: v => v, sort: "hatTricks", primary: "hatTricks", desc: true, note: "Rare event — none recorded in this window." },
    ],
    other: [
      { key: "matches", label: "Most matches played", icon: "calendar", value: r => r.matches, format: v => v, sort: "matches", primary: "matches", desc: true },
      { key: "wins", label: "Most matches won (player)", icon: "trophy", value: r => 0, format: v => v, sort: "wins", primary: "wins", desc: true, derived: "playerWins" },
      { key: "mom", label: "Most Man of the Match", icon: "award", value: r => r.mom, format: v => v, sort: "mom", primary: "mom", desc: true },
      { key: "teamWins", label: "Most matches won (team)", icon: "shield", desc: true, custom: "teamWins" },
      { key: "highestTeam", label: "Highest team total", icon: "trending-up", desc: true, custom: "highestTeam" },
      { key: "lowestTeam", label: "Lowest team total", icon: "trending-down", desc: false, custom: "lowestTeam" },
      { key: "biggestWin", label: "Biggest win margin", icon: "swords", desc: true, custom: "biggestWin" },
    ],
  };

  function LeaderboardsPage({ navigate }) {
    const [tab, setTab] = useState("batting");
    const [active, setActive] = useState("runs");
    const { state } = U.useFilters();

    const filteredPMS = useMemo(() => U.applyFilters(D.playerMatchStats, state), [state]);
    const filteredMatches = useMemo(() => U.applyMatchFilters(D.matches, state), [state]);
    const rolled = useMemo(() => {
      let r = U.rollupPlayers(filteredPMS);
      // playerWins derivation
      const winsByPlayer = {};
      filteredMatches.forEach(m => {
        if (!m.winner) return;
        const roster = D.teamPlayers.filter(tp => tp.teamId === m.winner).map(tp => tp.playerId);
        const playedIds = new Set(filteredPMS.filter(s => s.matchId === m.id).map(s => s.playerId));
        roster.forEach(pid => { if (playedIds.has(pid)) winsByPlayer[pid] = (winsByPlayer[pid] || 0) + 1; });
      });
      r = r.map(x => ({ ...x, wins: winsByPlayer[x.playerId] || 0, hatTricks: 0 }));
      // search filter
      if (state.search) {
        const q = state.search.toLowerCase();
        r = r.filter(x => x.playerName.toLowerCase().includes(q));
      }
      return r;
    }, [filteredPMS, filteredMatches, state.search]);

    const categories = CATEGORIES[tab];
    const cat = categories.find(c => c.key === active) || categories[0];

    // when switching tab, reset selection to first
    function switchTab(t) {
      setTab(t);
      setActive(CATEGORIES[t][0].key);
    }

    return (
      <div className="page-enter">
        <U.FilterBar
          showMinBalls={cat.threshold === "minBalls"}
          showMinOvers={cat.threshold === "minOvers"}
        />

        <div className="px-6 pt-6 pb-2">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[11px] text-pitch uppercase tracking-[0.18em] font-semibold mb-1">Leaderboards · 25 categories</div>
              <h1 className="text-3xl font-extrabold text-ink-100 tracking-tight">Records & Rankings</h1>
            </div>
            <div className="text-[10px] text-ink-400 mono uppercase tracking-wider">
              {rolled.length} players in view
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="inline-flex items-center bg-ink-800 border border-ink-700 rounded-lg p-1 gap-0.5">
            {[
              { k: "batting", l: "Batting", n: 10, c: "#A6E04C" },
              { k: "bowling", l: "Bowling", n: 8, c: "#A78BFA" },
              { k: "other", l: "All-rounder & Team", n: 7, c: "#E8B84A" },
            ].map(t => (
              <button key={t.k} onClick={() => switchTab(t.k)}
                className={`relative h-8 px-3 text-sm font-semibold rounded-md transition-colors inline-flex items-center gap-2
                  ${tab === t.k ? 'bg-ink-700 text-ink-100' : 'text-ink-300 hover:text-ink-100'}`}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.c }} />
                {t.l}
                <span className="mono text-[10px] text-ink-400">{t.n}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Category chips */}
        <div className="px-6 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {categories.map(c => (
              <button key={c.key} onClick={() => setActive(c.key)}
                className={`h-7 px-2.5 inline-flex items-center gap-1.5 rounded-md text-xs font-medium border
                  ${active === c.key ? 'bg-pitch text-ink-900 border-pitch' : 'bg-ink-800 border-ink-700 text-ink-200 hover:bg-ink-750'}`}>
                <U.Icon name={c.icon} size={11} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main leaderboard view */}
        <div className="px-6 pt-4 grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8">
            {cat.custom ? (
              <CustomBoard
                kind={cat.custom}
                matches={filteredMatches}
                state={state}
                navigate={navigate}
                title={cat.label}
                icon={cat.icon}
              />
            ) : (
              <PlayerLeaderboard
                cat={cat}
                rolled={rolled}
                minBalls={state.minBalls}
                minOvers={state.minOvers}
                navigate={navigate}
              />
            )}
          </div>
          <div className="col-span-12 lg:col-span-4">
            <U.Card padded={false} className="p-5 sticky top-[120px]">
              <U.SectionTitle title="At a glance" subtitle="Across all categories in this tab" accent={tab === "batting" ? "#A6E04C" : tab === "bowling" ? "#A78BFA" : "#E8B84A"} />
              <div className="flex flex-col gap-3">
                {(tab === "batting" ? topAcross(rolled, ["runs","sixes","fours","hundreds"]) :
                  tab === "bowling" ? topAcross(rolled, ["wickets","maidens","dotBallsBowled"], true) :
                  topAcross(rolled, ["matches","mom"])).map(row => (
                    <button key={row.cat} onClick={() => setActive(row.cat)}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-ink-750 group text-left">
                      <U.Avatar name={row.playerName} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">{row.label}</div>
                        <div className="text-sm font-medium text-ink-100 truncate group-hover:text-pitch">{row.playerName}</div>
                      </div>
                      <div className="mono text-lg font-bold">{row.value}</div>
                    </button>
                  ))}
              </div>
            </U.Card>
          </div>
        </div>
      </div>
    );
  }

  function topAcross(rolled, keys, inverse = false) {
    return keys.map(k => {
      const sorted = [...rolled].sort((a,b) => inverse ? a[k]-b[k] : b[k]-a[k]).filter(r => r[k] > 0);
      const top = sorted[0];
      return top && { cat: k, label: k.replace(/([A-Z])/g," $1"), playerId: top.playerId, playerName: top.playerName, value: top[k] };
    }).filter(Boolean);
  }

  function PlayerLeaderboard({ cat, rolled, minBalls, minOvers, navigate }) {
    const { sort, toggle } = U.useSort(cat.sort, cat.desc ? "desc" : "asc");
    const list = useMemo(() => {
      let r = [...rolled];
      // qualifiers + threshold sliders
      if (cat.qualifier) r = r.filter(cat.qualifier);
      if (cat.threshold === "minBalls") r = r.filter(x => x.ballsFaced >= minBalls);
      if (cat.threshold === "minOvers") {
        const minBowls = minOvers * 6;
        r = r.filter(x => x.ballsBowled >= minBowls);
      }
      // sort
      const sortFn = cat.sortVal ? cat.sortVal : (x) => x[sort.key];
      r.sort((a, b) => {
        const av = sortFn(a), bv = sortFn(b);
        return sort.dir === "asc" ? av - bv : bv - av;
      });
      return r.slice(0, 50);
    }, [rolled, sort, cat, minBalls, minOvers]);

    return (
      <U.Card padded={false}>
        <div className="px-5 py-4 border-b border-ink-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-ink-750 border border-ink-700 inline-flex items-center justify-center text-pitch">
              <U.Icon name={cat.icon} size={16} />
            </div>
            <div>
              <div className="font-bold text-ink-100 text-lg leading-tight">{cat.label}</div>
              <div className="text-xs text-ink-400 mt-0.5">
                Top {Math.min(list.length, 50)} players · click column to re-sort · click row to open profile
              </div>
            </div>
          </div>
          {cat.threshold && (
            <U.Pill tone="pitch">
              <U.Icon name="filter" size={10} />
              Qualifier active
            </U.Pill>
          )}
        </div>

        {cat.note && (
          <div className="mx-5 my-4 p-3 rounded-lg bg-ink-750 border border-ink-700 text-xs text-ink-300 flex items-start gap-2">
            <U.Icon name="info" size={13} className="text-ink-400 mt-0.5" />
            {cat.note}
          </div>
        )}

        {list.length === 0 ? (
          <U.Empty title="No players match this view"
            message="Try widening the date range, lowering the qualifier, or clearing other filters." />
        ) : (
          <div className="overflow-x-auto">
            <U.Table>
              <thead>
                <tr>
                  <U.Th width={56}>#</U.Th>
                  <U.Th>Player</U.Th>
                  <U.Th sortable dir={sort.key === "matches" ? sort.dir : null} onClick={() => toggle("matches")} align="right">M</U.Th>
                  <U.Th sortable dir={sort.key === "innings" ? sort.dir : null} onClick={() => toggle("innings")} align="right">I</U.Th>
                  {cat.threshold === "minOvers" ? (
                    <>
                      <U.Th sortable dir={sort.key === "ballsBowled" ? sort.dir : null} onClick={() => toggle("ballsBowled")} align="right">Ov</U.Th>
                      <U.Th sortable dir={sort.key === "wickets" ? sort.dir : null} onClick={() => toggle("wickets")} align="right">W</U.Th>
                      <U.Th sortable dir={sort.key === "runsConceded" ? sort.dir : null} onClick={() => toggle("runsConceded")} align="right">R</U.Th>
                    </>
                  ) : (
                    <>
                      <U.Th sortable dir={sort.key === "runs" ? sort.dir : null} onClick={() => toggle("runs")} align="right">R</U.Th>
                      <U.Th sortable dir={sort.key === "ballsFaced" ? sort.dir : null} onClick={() => toggle("ballsFaced")} align="right">B</U.Th>
                    </>
                  )}
                  <U.Th sortable dir={sort.key === cat.sort ? sort.dir : null} onClick={() => toggle(cat.sort)} align="right" className="text-pitch">
                    {cat.label.replace("Most ","").replace("Best ","").toUpperCase()}
                  </U.Th>
                  <U.Th width={120}>Trend</U.Th>
                </tr>
              </thead>
              <tbody>
                {list.map((r, i) => (
                  <tr key={r.playerId} onClick={() => navigate(`player/${r.playerId}`)}
                    className="cursor-pointer hover:bg-ink-750/40 odd:bg-ink-850/30 transition-colors">
                    <U.Td><U.RankBadge rank={i+1} /></U.Td>
                    <U.Td>
                      <div className="flex items-center gap-2.5">
                        <U.Avatar name={r.playerName} size={28} />
                        <div>
                          <div className="font-medium text-ink-100 text-[13px]">{r.playerName}</div>
                          <div className="text-[10px] text-ink-400 uppercase tracking-wider mono">{D.playersById[r.playerId]?.role || "—"}</div>
                        </div>
                      </div>
                    </U.Td>
                    <U.Td mono align="right">{r.matches}</U.Td>
                    <U.Td mono align="right">{r.innings}</U.Td>
                    {cat.threshold === "minOvers" ? (
                      <>
                        <U.Td mono align="right">{H.fmt(r.oversBowled,1)}</U.Td>
                        <U.Td mono align="right">{r.wickets}</U.Td>
                        <U.Td mono align="right" className="text-ink-300">{r.runsConceded}</U.Td>
                      </>
                    ) : (
                      <>
                        <U.Td mono align="right">{r.runs}</U.Td>
                        <U.Td mono align="right" className="text-ink-300">{r.ballsFaced}</U.Td>
                      </>
                    )}
                    <U.Td mono align="right">
                      <span className="font-bold text-pitch text-base">{cat.format(cat.value(r))}</span>
                    </U.Td>
                    <U.Td>
                      <U.Sparkline data={sparkFor(r, cat)} color={i < 3 ? "#E8B84A" : "#A6E04C"} />
                    </U.Td>
                  </tr>
                ))}
              </tbody>
            </U.Table>
          </div>
        )}
      </U.Card>
    );
  }

  function sparkFor(r, cat) {
    // pull this player's recent stats for a tiny sparkline
    const pms = D.playerMatchStats.filter(s => s.playerId === r.playerId).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(-10);
    return pms.map(s => {
      if (["wickets","maidens","dotBallsBowled","bowlingEconomy","bowlingAverage","bowlingStrikeRate","bestBowling"].includes(cat.sort)) {
        return s.wickets;
      }
      return s.runs;
    });
  }

  // ---- Custom team-based boards ----
  function CustomBoard({ kind, matches, state, navigate, title, icon }) {
    if (kind === "teamWins") {
      const wins = {};
      const played = {};
      matches.forEach(m => {
        played[m.team1] = (played[m.team1]||0)+1;
        played[m.team2] = (played[m.team2]||0)+1;
        if (m.winner) wins[m.winner] = (wins[m.winner]||0)+1;
      });
      const list = D.teams.map(t => ({
        ...t,
        wins: wins[t.id] || 0, matches: played[t.id] || 0,
        winPct: played[t.id] ? (wins[t.id]||0)/played[t.id]*100 : 0,
      })).sort((a,b)=>b.wins-a.wins).slice(0,20);

      return <TeamTable title={title} icon={icon} rows={list} cols={[
        { k: "matches", label: "M" },
        { k: "wins", label: "Won", accent: true },
        { k: "winPct", label: "Win %", fmt: v => H.fmt(v,1)+"%" },
      ]} />;
    }
    if (kind === "highestTeam") {
      const totals = [];
      matches.forEach(m => {
        [m.inn1, m.inn2].forEach(inn => totals.push({
          matchId: m.id, teamId: inn.teamId,
          teamName: inn.teamName, score: inn.score, wickets: inn.wickets, overs: inn.overs,
          opp: inn.teamId === m.team1 ? m.team2Fullname : m.team1Fullname,
          tournament: D.tournamentsById[m.tournamentId]?.name, date: m.startDateTime,
        }));
      });
      totals.sort((a,b)=>b.score-a.score);
      return <TeamScoreTable title={title} icon={icon} rows={totals.slice(0,20)} inverse={false} navigate={navigate} />;
    }
    if (kind === "lowestTeam") {
      const totals = [];
      matches.forEach(m => {
        [m.inn1, m.inn2].forEach(inn => totals.push({
          matchId: m.id, teamId: inn.teamId,
          teamName: inn.teamName, score: inn.score, wickets: inn.wickets, overs: inn.overs,
          opp: inn.teamId === m.team1 ? m.team2Fullname : m.team1Fullname,
          tournament: D.tournamentsById[m.tournamentId]?.name, date: m.startDateTime,
        }));
      });
      totals.sort((a,b)=>a.score-b.score);
      return <TeamScoreTable title={title} icon={icon} rows={totals.slice(0,20)} inverse={true} navigate={navigate} />;
    }
    if (kind === "biggestWin") {
      const wins = matches.filter(m => m.winner && m.result.includes("runs")).map(m => {
        const margin = Math.abs(m.inn1.score - m.inn2.score);
        return {
          matchId: m.id, teamId: m.winner,
          teamName: D.teamsById[m.winner].teamName,
          margin, score: m.inn1.teamId === m.winner ? m.inn1.score : m.inn2.score,
          loserName: m.team1 === m.winner ? m.team2Fullname : m.team1Fullname,
          tournament: D.tournamentsById[m.tournamentId]?.name, date: m.startDateTime,
        };
      }).sort((a,b)=>b.margin-a.margin).slice(0,20);

      return (
        <U.Card padded={false}>
          <div className="px-5 py-4 border-b border-ink-700 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-ink-750 border border-ink-700 inline-flex items-center justify-center text-pitch">
              <U.Icon name={icon} size={16} />
            </div>
            <div>
              <div className="font-bold text-ink-100 text-lg leading-tight">{title}</div>
              <div className="text-xs text-ink-400 mt-0.5">Decisive wins ordered by runs margin</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <U.Table>
              <thead>
                <tr>
                  <U.Th width={56}>#</U.Th>
                  <U.Th>Winner</U.Th>
                  <U.Th>Beat</U.Th>
                  <U.Th>Tournament</U.Th>
                  <U.Th align="right">Date</U.Th>
                  <U.Th align="right" className="text-pitch">Margin</U.Th>
                </tr>
              </thead>
              <tbody>
                {wins.map((r,i) => (
                  <tr key={i} onClick={() => navigate(`match/${r.matchId}`)} className="cursor-pointer hover:bg-ink-750/40 odd:bg-ink-850/30">
                    <U.Td><U.RankBadge rank={i+1} /></U.Td>
                    <U.Td>
                      <div className="flex items-center gap-2">
                        <U.TeamBadge teamId={r.teamId} />
                        <span className="font-medium text-ink-100">{r.teamName}</span>
                      </div>
                    </U.Td>
                    <U.Td className="text-ink-300">{r.loserName}</U.Td>
                    <U.Td className="text-ink-300 text-[12px]">{r.tournament}</U.Td>
                    <U.Td mono align="right" className="text-ink-400">{H.fmtDate(r.date)}</U.Td>
                    <U.Td mono align="right"><span className="font-bold text-pitch text-base">{r.margin}</span><span className="text-[10px] text-ink-400 ml-1">runs</span></U.Td>
                  </tr>
                ))}
              </tbody>
            </U.Table>
          </div>
        </U.Card>
      );
    }
    return null;
  }

  function TeamTable({ title, icon, rows, cols }) {
    return (
      <U.Card padded={false}>
        <div className="px-5 py-4 border-b border-ink-700 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-ink-750 border border-ink-700 inline-flex items-center justify-center text-pitch">
            <U.Icon name={icon} size={16} />
          </div>
          <div>
            <div className="font-bold text-ink-100 text-lg leading-tight">{title}</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <U.Table>
            <thead>
              <tr>
                <U.Th width={56}>#</U.Th>
                <U.Th>Team</U.Th>
                {cols.map(c => <U.Th key={c.k} align="right" className={c.accent ? "text-pitch" : ""}>{c.label}</U.Th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i) => (
                <tr key={r.id} className="hover:bg-ink-750/40 odd:bg-ink-850/30">
                  <U.Td><U.RankBadge rank={i+1} /></U.Td>
                  <U.Td>
                    <div className="flex items-center gap-2.5">
                      <U.TeamBadge teamId={r.id} size={28} />
                      <div>
                        <div className="font-medium text-ink-100 text-[13px]">{r.teamName}</div>
                        <div className="text-[10px] text-ink-400">{D.clubsById[r.clubId]?.name}</div>
                      </div>
                    </div>
                  </U.Td>
                  {cols.map(c => (
                    <U.Td key={c.k} mono align="right" className={c.accent ? "text-pitch font-bold" : ""}>
                      {c.fmt ? c.fmt(r[c.k]) : r[c.k]}
                    </U.Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </U.Table>
        </div>
      </U.Card>
    );
  }

  function TeamScoreTable({ title, icon, rows, inverse, navigate }) {
    return (
      <U.Card padded={false}>
        <div className="px-5 py-4 border-b border-ink-700 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-ink-750 border border-ink-700 inline-flex items-center justify-center text-pitch">
            <U.Icon name={icon} size={16} />
          </div>
          <div>
            <div className="font-bold text-ink-100 text-lg leading-tight">{title}</div>
            <div className="text-xs text-ink-400 mt-0.5">{inverse ? "Smallest first" : "Highest first"} · single-innings totals</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <U.Table>
            <thead>
              <tr>
                <U.Th width={56}>#</U.Th>
                <U.Th>Team</U.Th>
                <U.Th>Against</U.Th>
                <U.Th>Tournament</U.Th>
                <U.Th align="right">Date</U.Th>
                <U.Th align="right" className="text-pitch">Total</U.Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i) => (
                <tr key={i} onClick={() => navigate(`match/${r.matchId}`)} className="cursor-pointer hover:bg-ink-750/40 odd:bg-ink-850/30">
                  <U.Td><U.RankBadge rank={i+1} /></U.Td>
                  <U.Td>
                    <div className="flex items-center gap-2">
                      <U.TeamBadge teamId={r.teamId} />
                      <span className="font-medium text-ink-100">{r.teamName}</span>
                    </div>
                  </U.Td>
                  <U.Td className="text-ink-300">{r.opp}</U.Td>
                  <U.Td className="text-ink-300 text-[12px]">{r.tournament}</U.Td>
                  <U.Td mono align="right" className="text-ink-400">{H.fmtDate(r.date)}</U.Td>
                  <U.Td mono align="right">
                    <span className="font-bold text-pitch text-base">{r.score}</span>
                    <span className="text-ink-400">/{r.wickets}</span>
                    <span className="text-[10px] text-ink-400 ml-1">({H.fmtOvers(r.overs)})</span>
                  </U.Td>
                </tr>
              ))}
            </tbody>
          </U.Table>
        </div>
      </U.Card>
    );
  }

  window.SCS_Leaderboards = LeaderboardsPage;
})();
