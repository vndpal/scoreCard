// data.js — BigQuery-backed data layer for ScoreCard Stats.
//
// Replaces the design bundle's seeded mock data generator (data.jsx) with a
// real API client. Loaded as a plain <script> BEFORE Babel processes any of
// the JSX page modules; populates window.SCS_HELPERS synchronously and
// resolves window.SCS_DATA_READY once the /api/bootstrap fetch completes.
//
// Exposes the same surface every page in the design expects:
//   window.SCS_DATA = {
//     clubs, tournaments, teams, players, teamPlayers,
//     matches, playerMatchStats, balls,
//     playerCareerStats, playerTournamentStats,
//     clubsById, tournamentsById, teamsById, playersById, matchesById,
//     asOf,
//   }
//   window.SCS_HELPERS = { fmt, fmtDate, fmtDateShort, fmtOvers, initials, avatarColor }

(function () {
  // ----- helpers exposed synchronously so ui.jsx/pages can capture at module init -----
  const AVATAR_PALETTE = [
    "#A6E04C", "#E8B84A", "#A78BFA", "#5BC0BE", "#F7768E",
    "#E0AF68", "#7AA2F7", "#BB9AF7", "#73DACA", "#FF9E64",
  ];

  function fmt(n, decimals) {
    if (n == null || Number.isNaN(n) || !Number.isFinite(n)) return "—";
    const d = decimals == null ? 0 : decimals;
    return Number(n).toFixed(d);
  }

  function fmtDate(d) {
    if (!d) return "";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function fmtDateShort(d) {
    if (!d) return "";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  }

  // Cricket overs notation: 4.3 = 4 overs, 3 balls. Stored already in that form
  // by the migration, so we just normalize to one decimal place.
  function fmtOvers(o) {
    if (o == null || Number.isNaN(Number(o))) return "0.0";
    const n = Number(o);
    const full = Math.floor(n);
    const rem = Math.round((n - full) * 10);
    if (rem >= 6) return `${full + 1}.0`;
    return `${full}.${rem}`;
  }

  function initials(name) {
    if (!name) return "??";
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function avatarColor(name) {
    let hash = 0;
    const s = String(name || "");
    for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
  }

  window.SCS_HELPERS = { fmt, fmtDate, fmtDateShort, fmtOvers, initials, avatarColor };

  // ----- splash -----
  function showSplash(msg, isError) {
    const root = document.getElementById("root");
    if (!root) return;
    const color = isError ? "#E87A5A" : "#8B93A7";
    root.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;min-height:80vh;font-family:Manrope,system-ui,sans-serif;color:' +
      color +
      ';font-size:13px;letter-spacing:0.04em">' +
      '<div style="text-align:center"><div style="font-family:JetBrains Mono,monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:#5A6275;margin-bottom:8px">ScoreCard · Stats</div>' +
      '<div>' + msg + '</div></div></div>';
  }

  function makeIdMap(arr, key) {
    const k = key || "id";
    const out = {};
    for (const x of arr || []) if (x && x[k] != null) out[x[k]] = x;
    return out;
  }

  // ----- enrichment -----

  function deriveRole(c) {
    // c is a row from PlayerCareerStats (may be undefined)
    if (!c) return "BAT";
    const bf = Number(c.ballsFaced) || 0;
    const bb = Number(c.ballsBowled) || 0;
    const wk = Number(c.wickets) || 0;
    if (bf > 0 && bb > 0 && (wk >= 3 || bb >= 30)) return "ALL";
    if (bb > 0 && (bf === 0 || bb > bf * 1.5)) return "BOWL";
    return "BAT";
  }

  function oversToBalls(o) {
    const n = Number(o) || 0;
    const full = Math.floor(n);
    const rem = Math.round((n - full) * 10);
    return full * 6 + rem;
  }

  function ballsToOvers(b) {
    const full = Math.floor(b / 6);
    const rem = b % 6;
    return full + rem / 10;
  }

  function buildInning(teamId, teamName, batPMS, bowlPMS) {
    const batStats = batPMS.map((s) => ({
      pid: s.playerId,
      name: s.playerName,
      runs: Number(s.runs) || 0,
      balls: Number(s.ballsFaced) || 0,
      fours: Number(s.fours) || 0,
      sixes: Number(s.sixes) || 0,
      isOut: !!s.isOut,
      sr: Number(s.strikeRate) || 0,
    }));
    const bowlStats = bowlPMS.map((s) => ({
      pid: s.playerId,
      name: s.playerName,
      balls: oversToBalls(s.overs),
      runsConceded: Number(s.runsConceded) || 0,
      wickets: Number(s.wickets) || 0,
      maidens: Number(s.maidens) || 0,
    }));
    const score = batStats.reduce((sum, s) => sum + s.runs, 0);
    const wickets = batStats.filter((s) => s.isOut).length;
    const totalBowlBalls = bowlStats.reduce((s, x) => s + x.balls, 0);
    return {
      teamId,
      teamName,
      score,
      wickets,
      overs: ballsToOvers(totalBowlBalls),
      batStats,
      bowlStats,
    };
  }

  function enrichMatch(m, pmsByMatch, teamsById, playersById) {
    const matchPMS = pmsByMatch[m.id] || [];
    // try matching team membership by teamId first, fall back to team name
    function belongs(s, teamId, teamFullname) {
      if (s.teamId && s.teamId === teamId) return true;
      if (s.team && (s.team === teamId || s.team === teamFullname)) return true;
      return false;
    }
    const team1PMS = matchPMS.filter((s) => belongs(s, m.team1, m.team1Fullname));
    const team2PMS = matchPMS.filter((s) => belongs(s, m.team2, m.team2Fullname));
    const team1 = teamsById[m.team1];
    const team2 = teamsById[m.team2];

    const inn1 = buildInning(
      m.team1,
      (team1 && team1.teamName) || m.team1Fullname,
      team1PMS,
      team2PMS,
    );
    const inn2 = buildInning(
      m.team2,
      (team2 && team2.teamName) || m.team2Fullname,
      team2PMS,
      team1PMS,
    );

    const mom = m.manOfTheMatch ? playersById[m.manOfTheMatch] : null;
    return Object.assign({}, m, {
      inn1,
      inn2,
      manOfTheMatchName: mom ? mom.name : null,
    });
  }

  function enrichBall(b) {
    const run = Number(b.run) || 0;
    const isExtra = !!b.isNoBall || !!b.isWideBall;
    return Object.assign({}, b, {
      run,
      isWicket: !!b.isWicket,
      isFour: run === 4 && !isExtra,
      isSix: run === 6 && !isExtra,
    });
  }

  function enrichAll(raw) {
    const clubs = raw.clubs || [];
    const tournaments = raw.tournaments || [];
    const teams = raw.teams || [];
    const teamPlayers = raw.teamPlayers || [];
    const playerCareerStats = raw.playerCareerStats || [];
    const playerTournamentStats = raw.playerTournamentStats || [];

    const clubsById = makeIdMap(clubs);
    const tournamentsById = makeIdMap(tournaments);
    const teamsById = makeIdMap(teams);

    // ------ players: derive role from career stats ------
    const careerByPlayer = {};
    for (const c of playerCareerStats) if (c.playerId) careerByPlayer[c.playerId] = c;
    const players = (raw.players || []).map((p) =>
      Object.assign({}, p, { role: deriveRole(careerByPlayer[p.id]) }),
    );
    const playersById = makeIdMap(players);

    // ------ PMS: add isNotOut, teamId alias, mom placeholder ------
    const playerMatchStats = (raw.playerMatchStats || []).map((s) => {
      const teamId = s.teamId != null ? s.teamId : s.team;
      return Object.assign({}, s, {
        teamId,
        isNotOut: !s.isOut,
        mom: false,
      });
    });

    // index PMS by matchId for fast match enrichment
    const pmsByMatch = {};
    for (const s of playerMatchStats) {
      if (!s.matchId) continue;
      (pmsByMatch[s.matchId] = pmsByMatch[s.matchId] || []).push(s);
    }

    // ------ matches: attach inn1/inn2/manOfTheMatchName ------
    const matches = (raw.matches || []).map((m) =>
      enrichMatch(m, pmsByMatch, teamsById, playersById),
    );
    const matchesById = makeIdMap(matches);

    // ------ MoM flag on PMS ------
    for (const m of matches) {
      if (!m.manOfTheMatch) continue;
      const pms = pmsByMatch[m.id];
      if (!pms) continue;
      for (const s of pms) if (s.playerId === m.manOfTheMatch) s.mom = true;
    }

    // ------ balls: add isFour/isSix flags, ensure boolean wicket ------
    const balls = (raw.matchScoreBalls || []).map(enrichBall);

    return {
      clubs,
      tournaments,
      teams,
      players,
      teamPlayers,
      matches,
      playerMatchStats,
      balls,
      playerCareerStats,
      playerTournamentStats,
      clubsById,
      tournamentsById,
      teamsById,
      playersById,
      matchesById,
      asOf: raw.asOf || new Date().toISOString(),
    };
  }

  // ----- club switching -----
  // Mutates window.SCS_DATA in place to either the full dataset (clubId
  // falsy) or the slice belonging to a single club. Pages read properties
  // off `D = window.SCS_DATA` at render time, so in-place mutation is what
  // lets them see the new view without re-importing.
  const CLUB_LS_KEY = "scs_current_club";

  function filterByClub(full, clubId) {
    if (!clubId) return full;

    // Primary entities tied to this club by their own clubId.
    const tournaments = full.tournaments.filter((t) => t.clubId === clubId);
    const matches = full.matches.filter((m) => m.clubId === clubId);
    const playerMatchStats = full.playerMatchStats.filter(
      (s) => s.clubId === clubId,
    );
    const playerCareerStats = (full.playerCareerStats || []).filter(
      (s) => s.clubId === clubId,
    );
    const playerTournamentStats = (full.playerTournamentStats || []).filter(
      (s) => s.clubId === clubId,
    );
    const teamPlayers = (full.teamPlayers || []).filter(
      (tp) => tp.clubId === clubId,
    );

    // Teams: include any team belonging to the club PLUS any team that
    // appears as an opponent in one of this club's matches (cross-club
    // fixtures otherwise leave dangling team references that crash render).
    const teamIdSet = new Set();
    full.teams.forEach((t) => {
      if (t.clubId === clubId) teamIdSet.add(t.id);
    });
    matches.forEach((m) => {
      if (m.team1) teamIdSet.add(m.team1);
      if (m.team2) teamIdSet.add(m.team2);
    });
    const teams = full.teams.filter((t) => teamIdSet.has(t.id));

    // Players: same idea — own players plus anyone who appears in PMS for a
    // club match (visiting players from another club).
    const playerIdSet = new Set();
    full.players.forEach((p) => {
      if (p.clubId === clubId) playerIdSet.add(p.id);
    });
    playerMatchStats.forEach((s) => {
      if (s.playerId) playerIdSet.add(s.playerId);
    });
    const players = full.players.filter((p) => playerIdSet.has(p.id));

    // Clubs: keep the active club plus any club whose teams/players were
    // pulled in above so club-name lookups still resolve.
    const clubIdSet = new Set([clubId]);
    teams.forEach((t) => t.clubId && clubIdSet.add(t.clubId));
    players.forEach((p) => p.clubId && clubIdSet.add(p.clubId));
    const clubs = full.clubs.filter((c) => clubIdSet.has(c.id));

    // Balls don't carry clubId directly; key off matchId membership instead.
    const matchIdSet = new Set(matches.map((m) => m.id));
    const balls = (full.balls || []).filter((b) => matchIdSet.has(b.matchId));

    return {
      clubs,
      tournaments,
      teams,
      players,
      teamPlayers,
      matches,
      playerMatchStats,
      playerCareerStats,
      playerTournamentStats,
      balls,
      clubsById: makeIdMap(clubs),
      tournamentsById: makeIdMap(tournaments),
      teamsById: makeIdMap(teams),
      playersById: makeIdMap(players),
      matchesById: makeIdMap(matches),
      asOf: full.asOf,
    };
  }

  function applyClubSelection(clubId) {
    const full = window.SCS_DATA_FULL;
    if (!full) return;
    // If clubId is not a known id, treat as "all combined".
    const valid = clubId && full.clubs.some((c) => c.id === clubId);
    const view = filterByClub(full, valid ? clubId : null);
    Object.assign(window.SCS_DATA, view);
    window.SCS_CURRENT_CLUB_ID = valid ? clubId : null;
  }

  window.SCS_setCurrentClub = function (clubId) {
    applyClubSelection(clubId);
    try {
      if (clubId) localStorage.setItem(CLUB_LS_KEY, clubId);
      else localStorage.removeItem(CLUB_LS_KEY);
    } catch (_) {}
    window.dispatchEvent(
      new CustomEvent("scs:clubchange", {
        detail: { clubId: window.SCS_CURRENT_CLUB_ID },
      }),
    );
  };

  // ----- bootstrap promise -----
  showSplash("Loading dataset…");

  window.SCS_DATA_READY = fetch("/api/bootstrap")
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (raw) {
      const full = enrichAll(raw);
      window.SCS_DATA_FULL = full;
      // Start as a clone of the full set, then narrow to the persisted club
      // (if any) before any page sees the data.
      window.SCS_DATA = Object.assign({}, full);
      let storedClub = null;
      try {
        storedClub = localStorage.getItem(CLUB_LS_KEY);
      } catch (_) {}
      if (storedClub) applyClubSelection(storedClub);
      // small log so it's obvious in devtools the data loaded
      console.log(
        "[SCS] data loaded:",
        Object.keys(window.SCS_DATA)
          .filter((k) => Array.isArray(window.SCS_DATA[k]))
          .map((k) => k + "=" + window.SCS_DATA[k].length)
          .join(" · "),
        window.SCS_CURRENT_CLUB_ID
          ? "(club=" + window.SCS_CURRENT_CLUB_ID + ")"
          : "(all clubs)",
      );
    })
    .catch(function (err) {
      console.error("[SCS] bootstrap failed", err);
      showSplash(
        "Failed to load dataset: " + (err && err.message ? err.message : err),
        true,
      );
      throw err;
    });

  // ----- lazy fetchers (kept for future use; current pages read D.balls eagerly) -----
  window.SCS_DATA_API = {
    async fetchBallsForMatch(matchId) {
      const r = await fetch("/api/match/" + encodeURIComponent(matchId) + "/balls");
      if (!r.ok) throw new Error("HTTP " + r.status);
      const arr = await r.json();
      return arr.map(enrichBall);
    },
    async fetchBallsForPair(strikerId, bowlerId) {
      const u = new URL("/api/h2h/balls", window.location.origin);
      u.searchParams.set("striker", strikerId);
      u.searchParams.set("bowler", bowlerId);
      const r = await fetch(u);
      if (!r.ok) throw new Error("HTTP " + r.status);
      const arr = await r.json();
      return arr.map(enrichBall);
    },
  };
})();
