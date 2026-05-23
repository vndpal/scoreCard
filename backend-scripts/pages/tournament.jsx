// Tournament page — orange cap, purple cap, points table, leaderboards, schedule
(function () {
  const { useState, useMemo } = React;
  const U = window.SCS_UI;
  const D = window.SCS_DATA;
  const H = window.SCS_HELPERS;
  const R = window.Recharts;

  function TournamentsPage({ params, navigate }) {
    const [selectedId, setSelectedId] = useState(params?.id || D.tournaments[D.tournaments.length-1]?.id || null);
    const t = D.tournamentsById[selectedId];

    if (!t) {
      return (
        <div>
          <U.FilterBar />
          <div className="px-6 py-10">
            <U.Empty icon="trophy" title="No tournaments in view"
              message="The active club doesn't have any tournaments yet. Switch club to see other tournaments."
            />
          </div>
        </div>
      );
    }

    const matches = useMemo(() => D.matches.filter(m => m.tournamentId === selectedId), [selectedId]);
    const pms = useMemo(() => D.playerMatchStats.filter(s => s.tournamentId === selectedId), [selectedId]);
    const rolled = useMemo(() => U.rollupPlayers(pms), [pms]);

    // Orange cap (top runs), Purple cap (top wickets)
    const orange = [...rolled].sort((a,b)=>b.runs-a.runs)[0];
    const purple = [...rolled].sort((a,b)=>b.wickets-a.wickets)[0];

    // Points table
    const points = useMemo(() => {
      const teamsInTr = new Set();
      matches.forEach(m => { teamsInTr.add(m.team1); teamsInTr.add(m.team2); });
      const out = {};
      [...teamsInTr].forEach(id => {
        out[id] = { teamId: id, played: 0, won: 0, lost: 0, tied: 0, points: 0, runsFor: 0, runsAgainst: 0, oversFaced: 0, oversBowled: 0 };
      });
      matches.forEach(m => {
        const for1 = m.inn1.teamId === m.team1 ? m.inn1 : m.inn2;
        const for2 = m.inn1.teamId === m.team2 ? m.inn1 : m.inn2;
        out[m.team1].played += 1; out[m.team2].played += 1;
        out[m.team1].runsFor += for1.score; out[m.team1].runsAgainst += for2.score;
        out[m.team2].runsFor += for2.score; out[m.team2].runsAgainst += for1.score;
        out[m.team1].oversFaced += for1.overs; out[m.team1].oversBowled += for2.overs;
        out[m.team2].oversFaced += for2.overs; out[m.team2].oversBowled += for1.overs;
        if (m.winner === m.team1) { out[m.team1].won += 1; out[m.team1].points += 2; out[m.team2].lost += 1; }
        else if (m.winner === m.team2) { out[m.team2].won += 1; out[m.team2].points += 2; out[m.team1].lost += 1; }
        else { out[m.team1].tied += 1; out[m.team2].tied += 1; out[m.team1].points += 1; out[m.team2].points += 1; }
      });
      return Object.values(out).map(r => ({
        ...r,
        team: D.teamsById[r.teamId],
        nrr: r.oversFaced > 0 && r.oversBowled > 0 ? (r.runsFor / r.oversFaced) - (r.runsAgainst / r.oversBowled) : 0,
      })).sort((a,b)=>b.points-a.points || b.nrr-a.nrr);
    }, [matches]);

    // Run distribution per team
    const teamRuns = useMemo(() => {
      return points.map(p => ({
        name: p.team?.teamInitials || "?",
        runs: p.runsFor,
        conceded: p.runsAgainst,
      }));
    }, [points]);

    return (
      <div className="page-enter">
        <U.FilterBar />

        <div className="px-6 pt-6">
          <div className="text-[11px] text-pitch uppercase tracking-[0.18em] font-semibold mb-1">Tournament view</div>
          <h1 className="text-3xl font-extrabold text-ink-100 tracking-tight">{t.name}</h1>

          {/* Tournament selector */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {D.tournaments.map(tr => (
              <button key={tr.id} onClick={() => setSelectedId(tr.id)}
                className={`h-8 px-3 inline-flex items-center gap-1.5 rounded-md text-xs font-medium border
                  ${selectedId === tr.id ? 'bg-pitch text-ink-900 border-pitch' : 'bg-ink-800 border-ink-700 text-ink-200 hover:bg-ink-750'}`}>
                {tr.isBoxCricket && <U.Icon name="box" size={11} />}
                {tr.name}
                {tr.status === "LIVE" && <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse" />}
              </button>
            ))}
          </div>
        </div>

        {/* Caps */}
        <div className="px-6 pt-5 grid grid-cols-12 gap-3">
          <CapCard
            tone="orange"
            title="Orange cap"
            subtitle="Most runs in the tournament"
            player={orange && D.playersById[orange.playerId]}
            primaryValue={orange?.runs || 0}
            primaryLabel="runs"
            stats={orange ? [
              { l: "Innings", v: orange.innings },
              { l: "Avg", v: H.fmt(orange.average, 1) },
              { l: "SR", v: H.fmt(orange.strikeRate, 1) },
              { l: "HS", v: orange.highScore },
              { l: "4s/6s", v: `${orange.fours}/${orange.sixes}` },
            ] : []}
            navigate={navigate}
          />
          <CapCard
            tone="purple"
            title="Purple cap"
            subtitle="Most wickets in the tournament"
            player={purple && D.playersById[purple.playerId]}
            primaryValue={purple?.wickets || 0}
            primaryLabel="wkts"
            stats={purple ? [
              { l: "Matches", v: purple.matches },
              { l: "Overs", v: H.fmt(purple.oversBowled, 1) },
              { l: "Econ", v: H.fmt(purple.bowlingEconomy, 2) },
              { l: "Best", v: purple.bestBowling },
              { l: "Maidens", v: purple.maidens },
            ] : []}
            navigate={navigate}
          />
        </div>

        {/* Points table + visualization */}
        <div className="px-6 pt-4 grid grid-cols-12 gap-4">
          <U.Card padded={false} className="col-span-12 lg:col-span-8">
            <div className="px-5 py-3 border-b border-ink-700 flex items-center justify-between">
              <div>
                <div className="font-bold text-ink-100">Points table</div>
                <div className="text-[11px] text-ink-400 mt-0.5">Win = 2 pts · Tie = 1 pt · NRR breaks ties</div>
              </div>
              <U.Pill tone="pitch">{matches.length} matches</U.Pill>
            </div>
            <div className="overflow-x-auto">
              <U.Table>
                <thead>
                  <tr>
                    <U.Th width={56}>Pos</U.Th>
                    <U.Th>Team</U.Th>
                    <U.Th align="right">P</U.Th>
                    <U.Th align="right">W</U.Th>
                    <U.Th align="right">L</U.Th>
                    <U.Th align="right">T</U.Th>
                    <U.Th align="right">NRR</U.Th>
                    <U.Th align="right" className="text-pitch">Pts</U.Th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p, i) => (
                    <tr key={p.teamId} className={`hover:bg-ink-750/40 odd:bg-ink-850/30 ${i < 4 ? '' : 'opacity-90'}`}>
                      <U.Td>
                        <div className="flex items-center gap-1.5">
                          <span className={`h-1 w-1 rounded-full ${i < 4 ? 'bg-pitch' : 'bg-ink-500'}`} />
                          <span className="mono font-bold">{i+1}</span>
                        </div>
                      </U.Td>
                      <U.Td>
                        <div className="flex items-center gap-2.5">
                          <U.TeamBadge teamId={p.teamId} size={26} />
                          <div>
                            <div className="font-medium text-ink-100 text-[13px]">{p.team?.teamName}</div>
                            <div className="text-[10px] text-ink-400">{D.clubsById[p.team?.clubId]?.name}</div>
                          </div>
                        </div>
                      </U.Td>
                      <U.Td mono align="right">{p.played}</U.Td>
                      <U.Td mono align="right" className="text-pitch font-semibold">{p.won}</U.Td>
                      <U.Td mono align="right" className="text-danger/80">{p.lost}</U.Td>
                      <U.Td mono align="right" className="text-ink-300">{p.tied}</U.Td>
                      <U.Td mono align="right" className={p.nrr >= 0 ? 'text-up' : 'text-down'}>{(p.nrr >= 0 ? '+' : '') + H.fmt(p.nrr, 3)}</U.Td>
                      <U.Td mono align="right" className="text-pitch font-bold text-base">{p.points}</U.Td>
                    </tr>
                  ))}
                </tbody>
              </U.Table>
            </div>
          </U.Card>

          <U.Card padded={false} className="col-span-12 lg:col-span-4 p-5">
            <U.SectionTitle title="Runs for vs. against" subtitle="Aggregate across this tournament" accent="#E8B84A" />
            <div style={{ width: "100%", height: 280 }}>
              <R.ResponsiveContainer>
                <R.BarChart data={teamRuns} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                  <R.CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <R.XAxis dataKey="name" />
                  <R.YAxis />
                  <R.Tooltip />
                  <R.Legend wrapperStyle={{ fontSize: 11, color: "#8B93A7" }} />
                  <R.Bar name="For" dataKey="runs" fill="#A6E04C" radius={[3,3,0,0]} />
                  <R.Bar name="Against" dataKey="conceded" fill="#5A6275" radius={[3,3,0,0]} />
                </R.BarChart>
              </R.ResponsiveContainer>
            </div>
          </U.Card>
        </div>

        {/* Top performers */}
        <div className="px-6 pt-4 grid grid-cols-12 gap-4">
          <MiniBoard title="Top scorers" rolled={rolled} valueKey="runs" subKey="strikeRate" subLabel="SR" navigate={navigate} accent="#A6E04C" icon="trending-up" />
          <MiniBoard title="Top wicket-takers" rolled={[...rolled].sort((a,b)=>b.wickets-a.wickets)} valueKey="wickets" subKey="bowlingEconomy" subLabel="Eco" subDecimal={2} navigate={navigate} accent="#A78BFA" icon="target" />
          <MiniBoard title="Six hitters" rolled={[...rolled].sort((a,b)=>b.sixes-a.sixes)} valueKey="sixes" subKey="fours" subLabel="4s" navigate={navigate} accent="#E8B84A" icon="rocket" />
        </div>

        {/* Schedule */}
        <div className="px-6 pt-4 pb-10">
          <U.Card padded={false} className="p-5">
            <U.SectionTitle title="Match schedule" subtitle={`${matches.length} matches in ${t.name}`} accent="#A6E04C" />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {matches.sort((a,b)=>new Date(b.startDateTime)-new Date(a.startDateTime)).map(m => (
                <button key={m.id} onClick={() => navigate(`match/${m.id}`)}
                  className="text-left bg-ink-850 hover:bg-ink-800 border border-ink-700 rounded-lg p-3">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1.5">
                    <span>Match · {H.fmtDate(m.startDateTime)}</span>
                    <U.Pill>{m.winner ? 'Result' : 'Tied'}</U.Pill>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2"><U.TeamBadge teamId={m.team1} size={20} /><span className="flex-1 truncate">{m.team1Fullname}</span><span className="mono">{m.inn1.teamId===m.team1?m.inn1.score:m.inn2.score}</span></div>
                    <div className="flex items-center gap-2"><U.TeamBadge teamId={m.team2} size={20} /><span className="flex-1 truncate">{m.team2Fullname}</span><span className="mono">{m.inn1.teamId===m.team2?m.inn1.score:m.inn2.score}</span></div>
                  </div>
                  <div className="mt-2 text-[11px] text-pitch truncate">{m.result}</div>
                </button>
              ))}
            </div>
          </U.Card>
        </div>
      </div>
    );
  }

  function CapCard({ tone, title, subtitle, player, primaryValue, primaryLabel, stats, navigate }) {
    const accent = tone === "orange" ? "#E8B84A" : "#A78BFA";
    const bgGrad = tone === "orange" ? "from-orange-cap/10 to-transparent" : "from-purple-cap/10 to-transparent";
    return (
      <div className={`col-span-12 md:col-span-6 rounded-2xl border border-ink-700 bg-gradient-to-br ${bgGrad} bg-ink-800 p-5 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-12 translate-x-12" style={{ background: `radial-gradient(circle, ${accent}22, transparent 70%)` }} />
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] font-bold flex items-center gap-1.5" style={{ color: accent }}>
              <span className="h-2 w-2 rounded-full" style={{ background: accent }} /> {title}
            </div>
            <div className="text-[11px] text-ink-400 mt-0.5">{subtitle}</div>
          </div>
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}18`, color: accent }}>
            <U.Icon name={tone === "orange" ? "crown" : "target"} size={18} />
          </div>
        </div>
        {!player ? <U.Empty title="No data yet" /> : (
          <>
            <button onClick={() => navigate(`player/${player.id}`)} className="flex items-center gap-4 text-left w-full hover:opacity-90">
              <U.Avatar name={player.name} size={56} ringColor={`${accent}33`} />
              <div className="flex-1 min-w-0">
                <div className="text-xl font-bold text-ink-100">{player.name}</div>
                <div className="text-[11px] text-ink-400 mt-0.5">{D.clubsById[player.clubId]?.name} · {player.role}</div>
              </div>
              <div className="text-right">
                <div className="mono text-4xl font-extrabold" style={{ color: accent }}>{primaryValue}</div>
                <div className="text-[10px] text-ink-400 uppercase tracking-wider mt-1">{primaryLabel}</div>
              </div>
            </button>
            <div className="mt-4 pt-3 border-t border-ink-700 grid grid-cols-5 gap-2">
              {stats.map(s => (
                <div key={s.l} className="text-center">
                  <div className="text-[9px] uppercase tracking-wider text-ink-400 font-semibold">{s.l}</div>
                  <div className="mono text-sm font-bold mt-0.5">{s.v}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  function MiniBoard({ title, rolled, valueKey, subKey, subLabel, subDecimal, navigate, accent, icon }) {
    const top = rolled.slice(0, 5);
    return (
      <div className="col-span-12 md:col-span-6 lg:col-span-4">
        <U.Card padded={false} className="p-4 h-full">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: `${accent}18`, color: accent }}>
              <U.Icon name={icon} size={13} />
            </div>
            <div className="font-bold text-ink-100">{title}</div>
          </div>
          <div className="flex flex-col gap-0.5">
            {top.map((r,i) => (
              <button key={r.playerId} onClick={() => navigate(`player/${r.playerId}`)}
                className="flex items-center gap-2.5 py-1.5 px-1.5 rounded-md hover:bg-ink-750 group">
                <U.RankBadge rank={i+1} size="sm" />
                <U.Avatar name={r.playerName} size={22} />
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[12.5px] truncate font-medium text-ink-100 group-hover:text-pitch">{r.playerName}</div>
                  <div className="text-[10px] text-ink-400 mono uppercase tracking-wider">{subLabel} {subDecimal != null ? H.fmt(r[subKey], subDecimal) : H.fmt(r[subKey], 1)}</div>
                </div>
                <div className="mono text-base font-bold" style={{ color: accent }}>{r[valueKey]}</div>
              </button>
            ))}
          </div>
        </U.Card>
      </div>
    );
  }

  window.SCS_Tournament = TournamentsPage;
})();
