// Head-to-Head — batsman vs bowler, batsman vs team, bowler vs team, team vs team
(function () {
  const { useState, useMemo, useEffect, useRef } = React;
  const U = window.SCS_UI;
  const D = window.SCS_DATA;
  const H = window.SCS_HELPERS;
  const R = window.Recharts;

  function H2HPage({ params, navigate, initial }) {
    const [mode, setMode] = useState("bat-bowl"); // bat-bowl | bat-team | bowl-team | team-team
    const [left, setLeft] = useState(null);  // id
    const [right, setRight] = useState(null);

    // hydrate from query if passed in
    useEffect(() => {
      if (initial?.batsmanId) { setMode("bat-bowl"); setLeft(initial.batsmanId); }
    }, [initial]);

    const leftKind = mode === "team-team" ? "team" : (mode === "bowl-team" ? "player" : "player");
    const leftRole = mode === "bowl-team" ? "BOWL" : null; // restrict suggestions for bowler slot

    const rightKind = mode === "bat-bowl" ? "player" : "team";
    const rightRole = mode === "bat-bowl" ? "BOWL" : null;

    const ll = D[leftKind === "team" ? "teamsById" : "playersById"][left];
    const rr = D[rightKind === "team" ? "teamsById" : "playersById"][right];

    return (
      <div className="page-enter">
        <div className="px-6 pt-6">
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-[11px] text-pitch uppercase tracking-[0.18em] font-semibold mb-1">Head-to-head · The differentiator</div>
              <h1 className="text-3xl font-extrabold text-ink-100 tracking-tight">Match-up Lab</h1>
              <div className="text-sm text-ink-400 mt-1">Every ball, every encounter — paired performance across the entire dataset.</div>
            </div>
            <ModePicker mode={mode} setMode={(m) => { setMode(m); setLeft(null); setRight(null); }} />
          </div>
        </div>

        {/* Picker row */}
        <div className="px-6 pt-2">
          <div className="bg-ink-800 border border-ink-700 rounded-2xl p-5">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-12 md:col-span-5">
                <SlotPicker
                  label={leftLabel(mode)}
                  accent="#A6E04C"
                  kind={leftKind}
                  filterRole={leftRole}
                  value={left}
                  onChange={setLeft}
                />
              </div>
              <div className="col-span-12 md:col-span-2 text-center">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-ink-900 border border-ink-700 text-ink-400 mx-auto">
                  <U.Icon name="swords" size={20} />
                </div>
                <div className="mono text-[10px] uppercase tracking-[0.2em] text-ink-400 mt-1">vs</div>
              </div>
              <div className="col-span-12 md:col-span-5">
                <SlotPicker
                  label={rightLabel(mode)}
                  accent="#A78BFA"
                  kind={rightKind}
                  filterRole={rightRole}
                  value={right}
                  onChange={setRight}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="px-6 pt-4 pb-10">
          {!left || !right ? (
            <EmptyMatchup />
          ) : mode === "bat-bowl" ? (
            <BatVsBowl batsmanId={left} bowlerId={right} navigate={navigate} />
          ) : mode === "bat-team" ? (
            <BatVsTeam batsmanId={left} teamId={right} navigate={navigate} />
          ) : mode === "bowl-team" ? (
            <BowlVsTeam bowlerId={left} teamId={right} navigate={navigate} />
          ) : (
            <TeamVsTeam teamAId={left} teamBId={right} navigate={navigate} />
          )}
        </div>
      </div>
    );
  }

  function leftLabel(m) { return m === "team-team" ? "Team" : m === "bowl-team" ? "Bowler" : "Batsman"; }
  function rightLabel(m) { return m === "bat-bowl" ? "Bowler" : "Team"; }

  function ModePicker({ mode, setMode }) {
    const opts = [
      { k: "bat-bowl",  l: "Bat vs Bowl",   i: "user" },
      { k: "bat-team",  l: "Bat vs Team",   i: "shield" },
      { k: "bowl-team", l: "Bowl vs Team",  i: "target" },
      { k: "team-team", l: "Team vs Team",  i: "swords" },
    ];
    return (
      <div className="inline-flex bg-ink-800 border border-ink-700 rounded-lg p-1 gap-0.5">
        {opts.map(o => (
          <button key={o.k} onClick={() => setMode(o.k)}
            className={`h-8 px-3 text-xs font-semibold rounded-md inline-flex items-center gap-1.5 ${mode === o.k ? 'bg-pitch text-ink-900' : 'text-ink-300 hover:text-ink-100'}`}>
            <U.Icon name={o.i} size={11} />
            {o.l}
          </button>
        ))}
      </div>
    );
  }

  function SlotPicker({ label, accent, kind, filterRole, value, onChange }) {
    const [q, setQ] = useState("");
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
      function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    const items = useMemo(() => {
      const src = kind === "team" ? D.teams.map(t => ({ id: t.id, label: t.teamName, sub: D.clubsById[t.clubId]?.name, badge: "team" }))
                                  : D.players
                                    .filter(p => filterRole ? (p.role === filterRole || p.role === "ALL") : true)
                                    .map(p => ({ id: p.id, label: p.name, sub: `${p.role} · ${D.clubsById[p.clubId]?.name}` }));
      const ql = q.toLowerCase();
      return src.filter(i => i.label.toLowerCase().includes(ql)).slice(0, 16);
    }, [q, kind, filterRole]);

    const selected = value && (kind === "team" ? D.teamsById[value] : D.playersById[value]);

    return (
      <div ref={ref} className="relative">
        <div className="text-[10px] uppercase tracking-[0.16em] text-ink-400 font-semibold mb-1.5 flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
          {label}
        </div>

        {selected ? (
          <button onClick={() => onChange(null)}
            className="w-full bg-ink-850 hover:bg-ink-750 border-2 rounded-xl p-3 flex items-center gap-3 transition-colors"
            style={{ borderColor: accent + "55" }}>
            {kind === "team"
              ? <U.TeamBadge teamId={selected.id} size={40} />
              : <U.Avatar name={selected.name || selected.teamName} size={40} ringColor={accent + "22"} />}
            <div className="flex-1 text-left min-w-0">
              <div className="font-bold text-ink-100 text-base truncate">{selected.name || selected.teamName}</div>
              <div className="text-[11px] text-ink-400">{kind === "team" ? D.clubsById[selected.clubId]?.name : `${selected.role} · ${D.clubsById[selected.clubId]?.name}`}</div>
            </div>
            <U.Icon name="x" size={14} className="text-ink-400" />
          </button>
        ) : (
          <div className="relative">
            <U.Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="w-full bg-ink-850 border-2 border-dashed border-ink-600 hover:border-ink-500 focus:border-pitch focus:outline-none rounded-xl h-[60px] pl-10 pr-3 text-base placeholder:text-ink-500" />
          </div>
        )}

        {open && !selected && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-ink-800 border border-ink-700 rounded-xl shadow-xl z-50 max-h-72 overflow-auto">
            {items.length === 0 && <div className="p-4 text-xs text-ink-400 text-center">No matches</div>}
            {items.map(it => (
              <button key={it.id} onClick={() => { onChange(it.id); setQ(""); setOpen(false); }}
                className="w-full px-3 py-2 hover:bg-ink-750 flex items-center gap-2.5 text-left">
                {kind === "team"
                  ? <U.TeamBadge teamId={it.id} size={24} />
                  : <U.Avatar name={it.label} size={24} />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ink-100 truncate">{it.label}</div>
                  <div className="text-[10px] text-ink-400 truncate">{it.sub}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  function EmptyMatchup() {
    return (
      <U.Card padded={false} className="p-10">
        <div className="flex items-center justify-center gap-8 opacity-50">
          <div className="flex flex-col items-center gap-2">
            <div className="h-14 w-14 rounded-full bg-ink-750 border-2 border-dashed border-ink-600 flex items-center justify-center text-ink-400">
              <U.Icon name="user" size={20} />
            </div>
            <div className="text-[10px] text-ink-400 uppercase tracking-wider">Pick batsman</div>
          </div>
          <U.Icon name="swords" size={24} className="text-ink-500" />
          <div className="flex flex-col items-center gap-2">
            <div className="h-14 w-14 rounded-full bg-ink-750 border-2 border-dashed border-ink-600 flex items-center justify-center text-ink-400">
              <U.Icon name="target" size={20} />
            </div>
            <div className="text-[10px] text-ink-400 uppercase tracking-wider">Pick bowler</div>
          </div>
        </div>
        <div className="text-center mt-5">
          <div className="font-semibold text-ink-100">Choose two opponents to compare</div>
          <div className="text-xs text-ink-400 mt-1.5 max-w-md mx-auto">
            Cricket lives in the matchup. Pick a batsman and a bowler to see every ball they've shared — runs, dot percentages, dismissals and timeline.
          </div>
        </div>
      </U.Card>
    );
  }

  // ---- BatsmanVsBowler ----
  function BatVsBowl({ batsmanId, bowlerId, navigate }) {
    const bat = D.playersById[batsmanId];
    const bowl = D.playersById[bowlerId];
    const balls = useMemo(() => D.balls.filter(b => b.strikerId === batsmanId && b.bowlerId === bowlerId), [batsmanId, bowlerId]);

    if (!balls.length) {
      return (
        <U.Card padded={false} className="p-10">
          <U.Empty
            icon="search-x"
            title={`${bat.name} has not faced ${bowl.name}`}
            message="No recorded balls between these two players in the dataset."
          />
        </U.Card>
      );
    }

    const runs = balls.reduce((s,b)=>s+b.run, 0);
    const dots = balls.filter(b => b.run === 0 && !b.isWicket).length;
    const fours = balls.filter(b => b.isFour).length;
    const sixes = balls.filter(b => b.isSix).length;
    const wickets = balls.filter(b => b.isWicket).length;
    const sr = balls.length ? (runs / balls.length) * 100 : 0;
    const dotPct = balls.length ? (dots / balls.length) * 100 : 0;

    // per-match timeline
    const matchMap = {};
    balls.forEach(b => {
      if (!matchMap[b.matchId]) matchMap[b.matchId] = { matchId: b.matchId, balls: 0, runs: 0, wickets: 0, date: b.date };
      matchMap[b.matchId].balls += 1;
      matchMap[b.matchId].runs += b.run;
      if (b.isWicket) matchMap[b.matchId].wickets += 1;
    });
    const matchups = Object.values(matchMap).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const last5 = matchups.slice(0,5);

    // run distribution
    const dist = [
      { label: "Dot", count: dots, color: "#3A4458" },
      { label: "1",   count: balls.filter(b => b.run === 1).length, color: "#5A6275" },
      { label: "2",   count: balls.filter(b => b.run === 2).length, color: "#8B93A7" },
      { label: "3",   count: balls.filter(b => b.run === 3).length, color: "#5BC0BE" },
      { label: "4",   count: fours, color: "#A6E04C" },
      { label: "6",   count: sixes, color: "#E8B84A" },
      { label: "W",   count: wickets, color: "#E87A5A" },
    ];

    return (
      <div className="grid grid-cols-12 gap-4">
        {/* Big header */}
        <U.Card padded={false} className="col-span-12 p-5">
          <div className="grid grid-cols-12 gap-6 items-center">
            <div className="col-span-12 md:col-span-3 text-center">
              <U.Avatar name={bat.name} size={64} ringColor="rgba(166,224,76,0.25)" />
              <div className="font-bold text-ink-100 mt-2 text-base">{bat.name}</div>
              <div className="text-[10px] text-pitch uppercase tracking-wider mono">{bat.role}</div>
            </div>
            <div className="col-span-12 md:col-span-6 grid grid-cols-3 gap-2">
              <H2HStat label="Balls" value={balls.length} accent="#E6E8EC" />
              <H2HStat label="Runs" value={runs} accent="#A6E04C" />
              <H2HStat label="Dismissed" value={wickets} accent="#E87A5A" />
              <H2HStat label="Strike rate" value={H.fmt(sr,1)} accent="#A6E04C" />
              <H2HStat label="Dot ball %" value={H.fmt(dotPct,1)+"%"} accent="#A78BFA" />
              <H2HStat label="Boundaries" value={fours + sixes} sub={`${fours}×4 · ${sixes}×6`} accent="#E8B84A" />
            </div>
            <div className="col-span-12 md:col-span-3 text-center">
              <U.Avatar name={bowl.name} size={64} ringColor="rgba(167,139,250,0.25)" />
              <div className="font-bold text-ink-100 mt-2 text-base">{bowl.name}</div>
              <div className="text-[10px] text-purple-cap uppercase tracking-wider mono">{bowl.role}</div>
            </div>
          </div>
        </U.Card>

        {/* Heatmap of balls */}
        <U.Card padded={false} className="col-span-12 lg:col-span-8 p-5">
          <U.SectionTitle title="Every ball, in order" subtitle="A complete trace of this matchup — chronological from left to right" accent="#A6E04C" />
          <BallStrip balls={[...balls].sort((a,b)=>new Date(a.date)-new Date(b.date))} />
          <div className="mt-3 flex items-center gap-3 text-[10px] text-ink-400 mono">
            {[
              ["Dot","#3A4458"],["1","#5A6275"],["2","#8B93A7"],["3","#5BC0BE"],
              ["4","#A6E04C"],["6","#E8B84A"],["Out","#E87A5A"],
            ].map(([l,c]) => (
              <span key={l} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />{l}</span>
            ))}
          </div>
        </U.Card>

        <U.Card padded={false} className="col-span-12 lg:col-span-4 p-5">
          <U.SectionTitle title="Outcome distribution" subtitle="Breakdown of all balls faced" accent="#E8B84A" />
          <div style={{ width: "100%", height: 200 }}>
            <R.ResponsiveContainer>
              <R.BarChart data={dist} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <R.CartesianGrid strokeDasharray="3 3" vertical={false} />
                <R.XAxis dataKey="label" />
                <R.YAxis />
                <R.Tooltip />
                <R.Bar dataKey="count" radius={[3,3,0,0]}>
                  {dist.map((d, i) => <R.Cell key={i} fill={d.color} />)}
                </R.Bar>
              </R.BarChart>
            </R.ResponsiveContainer>
          </div>
        </U.Card>

        {/* Last 5 matchups */}
        <U.Card padded={false} className="col-span-12 lg:col-span-6 p-5">
          <U.SectionTitle title="Last 5 encounters" subtitle="Most recent matches where they faced each other" accent="#A6E04C" />
          {last5.length === 0 ? <U.Empty title="No encounters" /> : (
            <div className="flex flex-col gap-2">
              {last5.map(m => (
                <button key={m.matchId} onClick={() => navigate(`match/${m.matchId}`)}
                  className="w-full text-left bg-ink-850 hover:bg-ink-800 border border-ink-700 rounded-lg p-3">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-1.5">
                    <span>{D.tournamentsById[D.matchesById[m.matchId]?.tournamentId]?.name}</span>
                    <span className="mono">{H.fmtDate(m.date)}</span>
                  </div>
                  <div className="flex items-center gap-3 mono text-sm">
                    <span className="text-ink-300">{m.balls} balls</span>
                    <span className="text-ink-500">·</span>
                    <span className="text-pitch font-bold">{m.runs} runs</span>
                    <span className="text-ink-500">·</span>
                    <span className={m.wickets ? "text-danger font-bold" : "text-ink-400"}>{m.wickets} out</span>
                    <div className="flex-1" />
                    <span className="text-ink-400">{H.fmt(m.balls ? (m.runs/m.balls)*100 : 0, 1)} SR</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </U.Card>

        {/* Verdict */}
        <U.Card padded={false} className="col-span-12 lg:col-span-6 p-5">
          <U.SectionTitle title="The verdict" subtitle="Who edges this matchup" accent="#E8B84A" />
          <Verdict
            batSR={sr}
            batRuns={runs}
            wickets={wickets}
            ballsTotal={balls.length}
            dotPct={dotPct}
            bat={bat}
            bowl={bowl}
          />
        </U.Card>
      </div>
    );
  }

  function H2HStat({ label, value, sub, accent }) {
    return (
      <div className="bg-ink-850 border border-ink-700 rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">{label}</div>
        <div className="mono text-xl font-bold mt-1" style={{ color: accent }}>{value}</div>
        {sub && <div className="text-[10px] text-ink-400 mt-0.5 mono">{sub}</div>}
      </div>
    );
  }

  function BallStrip({ balls }) {
    if (!balls.length) return null;
    const colorFor = (b) => b.isWicket ? "#E87A5A" : b.isSix ? "#E8B84A" : b.isFour ? "#A6E04C" : b.run === 0 ? "#3A4458" : b.run === 1 ? "#5A6275" : b.run === 2 ? "#8B93A7" : "#5BC0BE";
    const labelFor = (b) => b.isWicket ? "W" : b.run;
    return (
      <div className="flex flex-wrap gap-1.5">
        {balls.map(b => (
          <div key={b.id} title={`${labelFor(b)} on ${H.fmtDateShort(b.date)}`}
            className="h-7 w-7 rounded-md flex items-center justify-center mono text-[11px] font-bold text-ink-900"
            style={{ background: colorFor(b) }}>
            {labelFor(b)}
          </div>
        ))}
      </div>
    );
  }

  function Verdict({ batSR, batRuns, wickets, ballsTotal, dotPct, bat, bowl }) {
    let winner, reasoning;
    const score = batSR - dotPct + (wickets ? -25 * wickets / ballsTotal * 100 : 0);
    if (wickets >= 2 || dotPct > 55) { winner = bowl; reasoning = `Has dismissed ${bat.name.split(" ")[0]} ${wickets} time${wickets===1?'':'s'} and tied them down to ${H.fmt(dotPct,1)}% dot balls.`; }
    else if (batSR > 140 && wickets <= 1) { winner = bat; reasoning = `Has scored at a strike rate of ${H.fmt(batSR,1)} with ${batRuns} runs and survived most encounters.`; }
    else if (batRuns > 30 && wickets === 0) { winner = bat; reasoning = `${batRuns} runs without falling — ${bowl.name.split(" ")[0]} hasn't found the answer yet.`; }
    else { winner = score > 0 ? bat : bowl; reasoning = "A balanced contest — neither side has decisively dominated."; }

    const isBat = winner === bat;
    return (
      <div className={`rounded-xl border p-4 ${isBat ? 'bg-pitch/5 border-pitch/30' : 'bg-purple-cap/5 border-purple-cap/30'}`}>
        <div className="flex items-center gap-3">
          <U.Avatar name={winner.name} size={48} ringColor={isBat ? "rgba(166,224,76,0.3)" : "rgba(167,139,250,0.3)"} />
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: isBat ? "#A6E04C" : "#A78BFA" }}>Edge</div>
            <div className="font-bold text-ink-100">{winner.name}</div>
          </div>
        </div>
        <div className="text-[12.5px] text-ink-300 mt-3 leading-relaxed">{reasoning}</div>
      </div>
    );
  }

  // ---- BatsmanVsTeam ----
  function BatVsTeam({ batsmanId, teamId, navigate }) {
    const bat = D.playersById[batsmanId];
    const team = D.teamsById[teamId];
    const pms = D.playerMatchStats.filter(s => s.playerId === batsmanId && s.oppTeamId === teamId);

    if (!pms.length) return (
      <U.Card padded={false} className="p-10">
        <U.Empty title={`${bat.name} hasn't played against ${team.teamName}`} />
      </U.Card>
    );

    const innings = pms.filter(s => s.ballsFaced || s.isOut).length;
    const notOuts = pms.filter(s => s.isNotOut).length;
    const runs = pms.reduce((s,x)=>s+x.runs,0);
    const balls = pms.reduce((s,x)=>s+x.ballsFaced,0);
    const sr = balls ? (runs / balls) * 100 : 0;
    const avg = (innings - notOuts) > 0 ? runs / (innings - notOuts) : runs;
    const hs = Math.max(...pms.map(s=>s.runs));
    const fifties = pms.filter(s=>s.runs >= 50 && s.runs < 100).length;
    const hundreds = pms.filter(s=>s.runs >= 100).length;

    const chrono = [...pms].sort((a,b)=>new Date(a.date)-new Date(b.date));
    return (
      <div className="grid grid-cols-12 gap-4">
        <U.Card padded={false} className="col-span-12 p-5">
          <div className="grid grid-cols-12 gap-6 items-center">
            <div className="col-span-12 md:col-span-3 text-center">
              <U.Avatar name={bat.name} size={64} ringColor="rgba(166,224,76,0.25)" />
              <div className="font-bold text-ink-100 mt-2">{bat.name}</div>
            </div>
            <div className="col-span-12 md:col-span-6 grid grid-cols-3 gap-2">
              <H2HStat label="Innings" value={innings} accent="#E6E8EC" />
              <H2HStat label="Runs" value={runs} accent="#A6E04C" />
              <H2HStat label="Avg" value={H.fmt(avg,1)} accent="#A6E04C" />
              <H2HStat label="SR" value={H.fmt(sr,1)} accent="#E8B84A" />
              <H2HStat label="HS" value={hs} accent="#A6E04C" />
              <H2HStat label="50/100" value={`${fifties}/${hundreds}`} accent="#E8B84A" />
            </div>
            <div className="col-span-12 md:col-span-3 text-center">
              <U.TeamBadge teamId={teamId} size={64} />
              <div className="font-bold text-ink-100 mt-2">{team.teamName}</div>
            </div>
          </div>
        </U.Card>

        <U.Card padded={false} className="col-span-12 p-5">
          <U.SectionTitle title="Every innings against this side" subtitle="Chronological" accent="#A6E04C" />
          <div style={{ width: "100%", height: 220 }}>
            <R.ResponsiveContainer>
              <R.BarChart data={chrono.map(s => ({ date: H.fmtDateShort(s.date), runs: s.runs }))} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <R.CartesianGrid strokeDasharray="3 3" vertical={false} />
                <R.XAxis dataKey="date" />
                <R.YAxis />
                <R.Tooltip />
                <R.Bar dataKey="runs" fill="#A6E04C" radius={[3,3,0,0]} />
              </R.BarChart>
            </R.ResponsiveContainer>
          </div>
        </U.Card>
      </div>
    );
  }

  // ---- BowlerVsTeam ----
  function BowlVsTeam({ bowlerId, teamId, navigate }) {
    const bowl = D.playersById[bowlerId];
    const team = D.teamsById[teamId];
    const pms = D.playerMatchStats.filter(s => s.playerId === bowlerId && s.oppTeamId === teamId && s.overs > 0);

    if (!pms.length) return (
      <U.Card padded={false} className="p-10">
        <U.Empty title={`${bowl.name} hasn't bowled against ${team.teamName}`} />
      </U.Card>
    );

    const overs = pms.reduce((s,x)=>s+x.overs,0);
    const wickets = pms.reduce((s,x)=>s+x.wickets,0);
    const runs = pms.reduce((s,x)=>s+x.runsConceded,0);
    const eco = overs ? runs / overs : 0;
    const best = [...pms].sort((a,b)=>b.wickets-a.wickets||a.runsConceded-b.runsConceded)[0];
    const maidens = pms.reduce((s,x)=>s+x.maidens,0);

    return (
      <div className="grid grid-cols-12 gap-4">
        <U.Card padded={false} className="col-span-12 p-5">
          <div className="grid grid-cols-12 gap-6 items-center">
            <div className="col-span-12 md:col-span-3 text-center">
              <U.Avatar name={bowl.name} size={64} ringColor="rgba(167,139,250,0.25)" />
              <div className="font-bold text-ink-100 mt-2">{bowl.name}</div>
            </div>
            <div className="col-span-12 md:col-span-6 grid grid-cols-3 gap-2">
              <H2HStat label="Matches" value={pms.length} accent="#E6E8EC" />
              <H2HStat label="Wickets" value={wickets} accent="#A78BFA" />
              <H2HStat label="Runs" value={runs} accent="#E6E8EC" />
              <H2HStat label="Economy" value={H.fmt(eco,2)} accent="#A6E04C" />
              <H2HStat label="Maidens" value={maidens} accent="#A78BFA" />
              <H2HStat label="Best" value={best ? `${best.wickets}/${best.runsConceded}` : "-"} accent="#A78BFA" />
            </div>
            <div className="col-span-12 md:col-span-3 text-center">
              <U.TeamBadge teamId={teamId} size={64} />
              <div className="font-bold text-ink-100 mt-2">{team.teamName}</div>
            </div>
          </div>
        </U.Card>

        <U.Card padded={false} className="col-span-12 p-5">
          <U.SectionTitle title="Wicket-taking timeline" subtitle="Spells against this team" accent="#A78BFA" />
          <div style={{ width: "100%", height: 220 }}>
            <R.ResponsiveContainer>
              <R.BarChart data={pms.sort((a,b)=>new Date(a.date)-new Date(b.date)).map(s=>({date:H.fmtDateShort(s.date), wickets: s.wickets, eco: s.bowlingEconomy}))} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <R.CartesianGrid strokeDasharray="3 3" vertical={false} />
                <R.XAxis dataKey="date" />
                <R.YAxis />
                <R.Tooltip />
                <R.Bar dataKey="wickets" fill="#A78BFA" radius={[3,3,0,0]} />
              </R.BarChart>
            </R.ResponsiveContainer>
          </div>
        </U.Card>
      </div>
    );
  }

  // ---- TeamVsTeam ----
  function TeamVsTeam({ teamAId, teamBId, navigate }) {
    const teamA = D.teamsById[teamAId];
    const teamB = D.teamsById[teamBId];
    const matches = D.matches.filter(m =>
      (m.team1 === teamAId && m.team2 === teamBId) ||
      (m.team1 === teamBId && m.team2 === teamAId)
    );

    if (!matches.length) return (
      <U.Card padded={false} className="p-10">
        <U.Empty title={`${teamA.teamName} and ${teamB.teamName} haven't met`} />
      </U.Card>
    );

    const aWins = matches.filter(m => m.winner === teamAId).length;
    const bWins = matches.filter(m => m.winner === teamBId).length;
    const ties = matches.length - aWins - bWins;

    // aggregate scores
    const aRuns = matches.reduce((s,m) => s + (m.inn1.teamId === teamAId ? m.inn1.score : m.inn2.score), 0);
    const bRuns = matches.reduce((s,m) => s + (m.inn1.teamId === teamBId ? m.inn1.score : m.inn2.score), 0);

    return (
      <div className="grid grid-cols-12 gap-4">
        <U.Card padded={false} className="col-span-12 p-6">
          <div className="grid grid-cols-12 items-center gap-6">
            <div className="col-span-5 text-center">
              <U.TeamBadge teamId={teamAId} size={72} />
              <div className="font-bold text-ink-100 mt-2 text-lg">{teamA.teamName}</div>
              <div className="text-[10px] text-ink-400 uppercase tracking-wider">{D.clubsById[teamA.clubId]?.name}</div>
              <div className="mono text-5xl font-extrabold mt-3 text-pitch">{aWins}</div>
              <div className="text-[10px] text-ink-400 mt-1 uppercase tracking-wider">Wins</div>
            </div>
            <div className="col-span-2 text-center">
              <div className="text-ink-500 text-3xl font-bold mono">{matches.length}</div>
              <div className="text-[10px] text-ink-400 mt-1 uppercase tracking-wider">Matches</div>
              {ties > 0 && <div className="text-[11px] text-ink-300 mt-2 mono">{ties} tied</div>}
            </div>
            <div className="col-span-5 text-center">
              <U.TeamBadge teamId={teamBId} size={72} />
              <div className="font-bold text-ink-100 mt-2 text-lg">{teamB.teamName}</div>
              <div className="text-[10px] text-ink-400 uppercase tracking-wider">{D.clubsById[teamB.clubId]?.name}</div>
              <div className="mono text-5xl font-extrabold mt-3 text-purple-cap">{bWins}</div>
              <div className="text-[10px] text-ink-400 mt-1 uppercase tracking-wider">Wins</div>
            </div>
          </div>

          {/* Win bar */}
          <div className="mt-5 h-2 rounded-full bg-ink-700 overflow-hidden flex">
            <div className="bg-pitch h-full" style={{ width: `${(aWins/matches.length)*100}%` }} />
            {ties > 0 && <div className="bg-ink-500 h-full" style={{ width: `${(ties/matches.length)*100}%` }} />}
            <div className="bg-purple-cap h-full" style={{ width: `${(bWins/matches.length)*100}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-ink-400 mt-1.5 mono">
            <span>{H.fmt((aWins/matches.length)*100,0)}% wins</span>
            <span>Aggregate: <span className="text-pitch">{aRuns}</span> vs <span className="text-purple-cap">{bRuns}</span></span>
            <span>{H.fmt((bWins/matches.length)*100,0)}% wins</span>
          </div>
        </U.Card>

        <U.Card padded={false} className="col-span-12 p-5">
          <U.SectionTitle title="Match history" subtitle={`${matches.length} encounters`} accent="#A6E04C" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {matches.sort((a,b)=>new Date(b.startDateTime)-new Date(a.startDateTime)).map(m => (
              <button key={m.id} onClick={() => navigate(`match/${m.id}`)}
                className="text-left bg-ink-850 hover:bg-ink-800 border border-ink-700 rounded-lg p-3">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-ink-400 font-semibold mb-2">
                  <span className="truncate">{D.tournamentsById[m.tournamentId]?.name}</span>
                  <span className="mono">{H.fmtDate(m.startDateTime)}</span>
                </div>
                <div className="text-[12.5px] text-pitch font-medium">{m.result}</div>
              </button>
            ))}
          </div>
        </U.Card>
      </div>
    );
  }

  window.SCS_H2H = H2HPage;
})();
