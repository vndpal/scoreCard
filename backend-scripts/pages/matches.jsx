// Match center — list + detailed scorecard
(function () {
  const { useState, useMemo } = React;
  const U = window.SCS_UI;
  const D = window.SCS_DATA;
  const H = window.SCS_HELPERS;

  function MatchesPage({ params, navigate }) {
    if (params?.id) return <MatchDetail matchId={params.id} navigate={navigate} />;
    return <MatchList navigate={navigate} />;
  }

  function MatchList({ navigate }) {
    const { state } = U.useFilters();
    const list = useMemo(() => U.applyMatchFilters(D.matches, state).sort((a,b)=>new Date(b.startDateTime)-new Date(a.startDateTime)), [state]);

    return (
      <div className="page-enter">
        <U.FilterBar />
        <div className="px-6 pt-6 pb-2">
          <div className="text-[11px] text-pitch uppercase tracking-[0.18em] font-semibold mb-1">Match center · {list.length} matches</div>
          <h1 className="text-3xl font-extrabold text-ink-100 tracking-tight">All Matches</h1>
        </div>
        <div className="px-6 pt-4 pb-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {list.map(m => <MatchCard key={m.id} m={m} navigate={navigate} />)}
        </div>
      </div>
    );
  }

  function MatchCard({ m, navigate }) {
    const t1won = m.winner === m.team1;
    const t2won = m.winner === m.team2;
    const t1Inn = m.inn1.teamId === m.team1 ? m.inn1 : m.inn2;
    const t2Inn = m.inn1.teamId === m.team2 ? m.inn1 : m.inn2;
    const t = D.tournamentsById[m.tournamentId];

    return (
      <button onClick={() => navigate(`match/${m.id}`)} className="text-left bg-ink-800 hover:bg-ink-750 border border-ink-700 rounded-xl p-4 transition-colors focus-ring">
        <div className="flex items-center justify-between mb-3">
          <U.Pill tone={t?.isBoxCricket ? "orange" : "neutral"}>{t?.isBoxCricket ? "Box" : "Standard"}</U.Pill>
          <span className="mono text-[10px] text-ink-400">{H.fmtDate(m.startDateTime)}</span>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-2 truncate">{t?.name}</div>
        <div className="space-y-1.5">
          <div className={`flex items-center gap-2 ${t1won ? '' : 'opacity-70'}`}>
            <U.TeamBadge teamId={m.team1} size={24} />
            <span className={`text-sm flex-1 truncate ${t1won ? 'font-bold text-ink-100' : 'text-ink-200'}`}>{m.team1Fullname}</span>
            <span className="mono text-sm">
              <span className="font-bold">{t1Inn.score}</span>
              <span className="text-ink-400">/{t1Inn.wickets}</span>
              <span className="text-ink-500 text-[10px] ml-1">({H.fmtOvers(t1Inn.overs)})</span>
            </span>
          </div>
          <div className={`flex items-center gap-2 ${t2won ? '' : 'opacity-70'}`}>
            <U.TeamBadge teamId={m.team2} size={24} />
            <span className={`text-sm flex-1 truncate ${t2won ? 'font-bold text-ink-100' : 'text-ink-200'}`}>{m.team2Fullname}</span>
            <span className="mono text-sm">
              <span className="font-bold">{t2Inn.score}</span>
              <span className="text-ink-400">/{t2Inn.wickets}</span>
              <span className="text-ink-500 text-[10px] ml-1">({H.fmtOvers(t2Inn.overs)})</span>
            </span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-ink-700 flex items-center justify-between">
          <div className="text-[11px] text-pitch font-medium truncate flex-1">{m.result}</div>
          {m.manOfTheMatchName && (
            <div className="flex items-center gap-1.5 text-[10px] text-orange-cap font-medium ml-2">
              <U.Icon name="award" size={11} />
              <span className="truncate max-w-[100px]">{m.manOfTheMatchName.split(" ").slice(-1)[0]}</span>
            </div>
          )}
        </div>
      </button>
    );
  }

  function MatchDetail({ matchId, navigate }) {
    const m = D.matchesById[matchId];
    const [tab, setTab] = useState("scorecard");

    if (!m) return (
      <div className="px-6 pt-10">
        <U.Empty icon="search-x" title="Match not found" />
      </div>
    );

    const t = D.tournamentsById[m.tournamentId];

    return (
      <div className="page-enter">
        <div className="px-6 pt-6">
          <button onClick={() => navigate("matches")} className="text-xs text-ink-400 hover:text-pitch inline-flex items-center gap-1 mb-3">
            <U.Icon name="arrow-left" size={11} /> Back to matches
          </button>

          {/* Header */}
          <div className="rounded-2xl border border-ink-700 bg-gradient-to-br from-ink-800 to-ink-850 p-6 relative overflow-hidden">
            <div className="absolute inset-0 grid-bg opacity-30" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3 text-[11px] uppercase tracking-wider text-ink-400 font-semibold">
                <span className="text-pitch">{t?.name}</span>
                <span>·</span>
                <span>{H.fmtDate(m.startDateTime)}</span>
                {t?.isBoxCricket && <><span>·</span><U.Pill tone="orange">Box Cricket</U.Pill></>}
              </div>
              <div className="flex items-center gap-8">
                <TeamHeader matchTeam={m.team1} score={m.inn1.teamId === m.team1 ? m.inn1 : m.inn2} won={m.winner === m.team1} align="left" />
                <div className="text-center">
                  <div className="mono text-3xl font-extrabold text-pitch">VS</div>
                </div>
                <TeamHeader matchTeam={m.team2} score={m.inn1.teamId === m.team2 ? m.inn1 : m.inn2} won={m.winner === m.team2} align="right" />
              </div>
              <div className="mt-5 text-center">
                <div className="text-xl font-bold text-pitch">{m.result}</div>
                {m.manOfTheMatchName && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 h-7 rounded-md bg-orange-cap/10 border border-orange-cap/30 text-orange-cap text-xs font-semibold">
                    <U.Icon name="award" size={12} /> Player of the match · {m.manOfTheMatchName}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-5 inline-flex bg-ink-800 border border-ink-700 rounded-lg p-1 gap-0.5">
            {[
              { k: "scorecard", l: "Scorecard", i: "list" },
              { k: "commentary", l: "Ball-by-ball", i: "message-square" },
              { k: "performers", l: "Top performers", i: "award" },
            ].map(t => (
              <button key={t.k} onClick={() => setTab(t.k)}
                className={`h-8 px-3 text-xs font-semibold rounded-md inline-flex items-center gap-1.5 ${tab === t.k ? 'bg-ink-700 text-ink-100' : 'text-ink-300 hover:text-ink-100'}`}>
                <U.Icon name={t.i} size={11} />
                {t.l}
              </button>
            ))}
          </div>
        </div>

        {tab === "scorecard" && (
          <div className="px-6 pt-4 pb-10 grid grid-cols-1 gap-4">
            <Scorecard inn={m.inn1} navigate={navigate} />
            <Scorecard inn={m.inn2} navigate={navigate} />
          </div>
        )}
        {tab === "commentary" && (
          <div className="px-6 pt-4 pb-10">
            <Commentary matchId={matchId} navigate={navigate} />
          </div>
        )}
        {tab === "performers" && (
          <div className="px-6 pt-4 pb-10">
            <Performers match={m} navigate={navigate} />
          </div>
        )}
      </div>
    );
  }

  function TeamHeader({ matchTeam, score, won, align }) {
    const team = D.teamsById[matchTeam];
    return (
      <div className={`flex-1 ${align === "right" ? "text-right" : "text-left"}`}>
        <div className={`flex items-center gap-3 ${align === "right" ? "flex-row-reverse" : ""}`}>
          <U.TeamBadge teamId={team.id} size={56} />
          <div className={align === "right" ? "text-right" : "text-left"}>
            <div className={`font-bold text-xl ${won ? 'text-ink-100' : 'text-ink-300'}`}>{team.teamName}</div>
            <div className="text-[10px] text-ink-400 uppercase tracking-wider">{D.clubsById[team.clubId]?.name}</div>
          </div>
        </div>
        <div className="mt-3 mono">
          <span className={`text-3xl font-extrabold ${won ? 'text-pitch' : 'text-ink-200'}`}>{score.score}</span>
          <span className="text-ink-400 text-xl">/{score.wickets}</span>
          <span className="text-ink-400 text-sm ml-2">({H.fmtOvers(score.overs)} ov)</span>
        </div>
      </div>
    );
  }

  function Scorecard({ inn, navigate }) {
    const bowlSide = D.teamsById[inn.teamId === inn.teamId ? null : null]; // not needed
    return (
      <U.Card padded={false}>
        <div className="px-5 py-3 border-b border-ink-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <U.TeamBadge teamId={inn.teamId} size={28} />
            <div>
              <div className="font-bold text-ink-100">{inn.teamName}</div>
              <div className="text-[10px] text-ink-400 uppercase tracking-wider mono">Innings · {H.fmtOvers(inn.overs)} overs</div>
            </div>
          </div>
          <div className="mono text-2xl font-bold">
            {inn.score}<span className="text-ink-400">/{inn.wickets}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-x divide-ink-700">
          <div>
            <div className="px-5 py-2.5 text-[10px] uppercase tracking-wider text-ink-400 font-semibold border-b border-ink-700 bg-ink-850/50">Batting</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold border-b border-ink-700">
                  <th className="text-left px-5 py-2">Batter</th>
                  <th className="text-right px-2 py-2">R</th>
                  <th className="text-right px-2 py-2">B</th>
                  <th className="text-right px-2 py-2">4</th>
                  <th className="text-right px-2 py-2">6</th>
                  <th className="text-right px-5 py-2">SR</th>
                </tr>
              </thead>
              <tbody>
                {inn.batStats.filter(s => s.balls > 0 || s.isOut).map(s => (
                  <tr key={s.pid} onClick={() => navigate(`player/${s.pid}`)} className="cursor-pointer hover:bg-ink-750/40 border-b border-ink-800 last:border-b-0">
                    <td className="px-5 py-2">
                      <div className="flex items-center gap-2">
                        <U.Avatar name={s.name} size={20} />
                        <span className="font-medium text-ink-100 text-[13px]">{s.name}</span>
                        {!s.isOut && s.balls > 0 && <span className="text-[10px] text-ink-400 mono">not out</span>}
                      </div>
                    </td>
                    <td className="text-right px-2 py-2 mono font-bold">{s.runs}</td>
                    <td className="text-right px-2 py-2 mono text-ink-300">{s.balls}</td>
                    <td className="text-right px-2 py-2 mono text-pitch">{s.fours}</td>
                    <td className="text-right px-2 py-2 mono text-orange-cap">{s.sixes}</td>
                    <td className="text-right px-5 py-2 mono text-ink-300">{s.balls ? H.fmt((s.runs/s.balls)*100, 1) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <div className="px-5 py-2.5 text-[10px] uppercase tracking-wider text-ink-400 font-semibold border-b border-ink-700 bg-ink-850/50">Bowling</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold border-b border-ink-700">
                  <th className="text-left px-5 py-2">Bowler</th>
                  <th className="text-right px-2 py-2">O</th>
                  <th className="text-right px-2 py-2">M</th>
                  <th className="text-right px-2 py-2">R</th>
                  <th className="text-right px-2 py-2">W</th>
                  <th className="text-right px-5 py-2">Econ</th>
                </tr>
              </thead>
              <tbody>
                {inn.bowlStats.filter(s => s.balls > 0).map(s => {
                  const ov = Math.floor(s.balls/6) + (s.balls%6)/10;
                  const eco = s.balls ? (s.runsConceded / (s.balls/6)) : 0;
                  return (
                    <tr key={s.pid} onClick={() => navigate(`player/${s.pid}`)} className="cursor-pointer hover:bg-ink-750/40 border-b border-ink-800 last:border-b-0">
                      <td className="px-5 py-2">
                        <div className="flex items-center gap-2">
                          <U.Avatar name={s.name} size={20} />
                          <span className="font-medium text-ink-100 text-[13px]">{s.name}</span>
                        </div>
                      </td>
                      <td className="text-right px-2 py-2 mono text-ink-300">{ov.toFixed(1)}</td>
                      <td className="text-right px-2 py-2 mono text-ink-300">{s.maidens}</td>
                      <td className="text-right px-2 py-2 mono text-ink-300">{s.runsConceded}</td>
                      <td className="text-right px-2 py-2 mono font-bold text-purple-cap">{s.wickets}</td>
                      <td className="text-right px-5 py-2 mono text-ink-300">{H.fmt(eco,2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </U.Card>
    );
  }

  function Commentary({ matchId, navigate }) {
    const balls = useMemo(() => D.balls.filter(b => b.matchId === matchId), [matchId]);
    // group by inning then by over
    const inn1balls = balls.filter(b => b.inning === 1);
    const inn2balls = balls.filter(b => b.inning === 2);

    if (!balls.length) {
      return <U.Card padded><U.Empty title="No ball-by-ball recorded" message="Commentary not captured for this match." /></U.Card>;
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InningsCommentary balls={inn1balls} title="1st Innings" />
        <InningsCommentary balls={inn2balls} title="2nd Innings" />
      </div>
    );
  }

  function InningsCommentary({ balls, title }) {
    const groups = useMemo(() => {
      const out = []; let cur = null; let runs = 0;
      balls.forEach((b, i) => {
        if (i % 6 === 0) {
          if (cur) out.push(cur);
          cur = { over: out.length + 1, balls: [], total: 0, wickets: 0 };
        }
        cur.balls.push(b);
        cur.total += b.run;
        if (b.isWicket) cur.wickets += 1;
      });
      if (cur) out.push(cur);
      return out;
    }, [balls]);

    return (
      <U.Card padded={false}>
        <div className="px-5 py-3 border-b border-ink-700 flex items-center justify-between">
          <div className="font-bold text-ink-100">{title}</div>
          <div className="text-[10px] text-ink-400 mono">{balls.length} balls</div>
        </div>
        <div className="max-h-[600px] overflow-auto">
          {groups.map(g => (
            <div key={g.over} className="px-5 py-3 border-b border-ink-800 last:border-b-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="mono text-[10px] uppercase tracking-wider text-ink-400 font-semibold">Over</span>
                  <span className="mono text-sm font-bold">{g.over}</span>
                </div>
                <div className="flex items-center gap-2 mono text-xs">
                  <span className="text-ink-300">{g.total} runs</span>
                  {g.wickets > 0 && <span className="text-danger">{g.wickets} wkt</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.balls.map((b, i) => (
                  <BallDot key={b.id} b={b} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </U.Card>
    );
  }
  function BallDot({ b }) {
    const cls = b.isWicket ? "bg-danger text-ink-900"
      : b.isSix ? "bg-orange-cap text-ink-900"
      : b.isFour ? "bg-pitch text-ink-900"
      : b.run === 0 ? "bg-ink-700 text-ink-300"
      : "bg-ink-600 text-ink-100";
    const label = b.isWicket ? "W" : b.run;
    return (
      <div title={`${b.bowlerName} → ${b.strikerName}`} className={`h-7 px-2 min-w-[28px] inline-flex items-center justify-center rounded-md mono text-[11px] font-bold ${cls}`}>
        {label}
      </div>
    );
  }

  function Performers({ match, navigate }) {
    // top batters + top bowlers from both innings
    const allBat = [...match.inn1.batStats, ...match.inn2.batStats].filter(s => s.runs > 0).sort((a,b)=>b.runs-a.runs).slice(0,5);
    const allBowl = [...match.inn1.bowlStats, ...match.inn2.bowlStats].filter(s => s.wickets > 0).sort((a,b)=>b.wickets-a.wickets || a.runsConceded - b.runsConceded).slice(0,5);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <U.Card padded={false} className="p-5">
          <U.SectionTitle title="Top batters" accent="#A6E04C" />
          <div className="flex flex-col gap-2">
            {allBat.map((s,i) => (
              <button key={s.pid + i} onClick={() => navigate(`player/${s.pid}`)} className="flex items-center gap-3 p-2.5 rounded-lg bg-ink-850 hover:bg-ink-800 border border-ink-700">
                <U.RankBadge rank={i+1} />
                <U.Avatar name={s.name} size={32} />
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium text-ink-100 truncate">{s.name}</div>
                  <div className="text-[10px] text-ink-400 mono">{s.balls} balls · SR {s.balls ? H.fmt((s.runs/s.balls)*100, 1) : "—"}</div>
                </div>
                <div className="text-right">
                  <div className="mono text-xl font-bold text-pitch">{s.runs}</div>
                  <div className="text-[10px] text-ink-400 mono">{s.fours}x4 · {s.sixes}x6</div>
                </div>
              </button>
            ))}
          </div>
        </U.Card>
        <U.Card padded={false} className="p-5">
          <U.SectionTitle title="Top bowlers" accent="#A78BFA" />
          <div className="flex flex-col gap-2">
            {allBowl.map((s,i) => {
              const ov = Math.floor(s.balls/6) + (s.balls%6)/10;
              const eco = s.balls ? s.runsConceded / (s.balls/6) : 0;
              return (
                <button key={s.pid + i} onClick={() => navigate(`player/${s.pid}`)} className="flex items-center gap-3 p-2.5 rounded-lg bg-ink-850 hover:bg-ink-800 border border-ink-700">
                  <U.RankBadge rank={i+1} />
                  <U.Avatar name={s.name} size={32} />
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium text-ink-100 truncate">{s.name}</div>
                    <div className="text-[10px] text-ink-400 mono">{ov.toFixed(1)} ov · econ {H.fmt(eco,2)}</div>
                  </div>
                  <div className="text-right">
                    <div className="mono text-xl font-bold text-purple-cap">{s.wickets}/{s.runsConceded}</div>
                    <div className="text-[10px] text-ink-400 mono">wkts</div>
                  </div>
                </button>
              );
            })}
          </div>
        </U.Card>
      </div>
    );
  }

  window.SCS_Matches = MatchesPage;
})();
