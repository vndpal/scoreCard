import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useFocusEffect } from "expo-router";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from "@react-native-firebase/firestore";
import db from "@/firebase/index";
import { Match } from "@/firebase/models/Match";
import { MatchScore } from "@/firebase/models/MatchScores";
import { PlayerMatchStats } from "@/firebase/models/PlayerMatchStats";
import { match } from "@/types/match";
import { playerStats } from "@/types/playerStats";
import { scorePerBall } from "@/types/scorePerBall";
import { scorePerInning } from "@/types/scorePerInnig";

/**
 * Live feed for the read-only viewer.
 *
 * The full ball history is fetched once; after that only four narrow listeners
 * stay open — the match doc, the set of over docs, the balls of the *current*
 * over, and the single playerMatchStats doc. Listening to every over's balls
 * would multiply reads by the number of overs for no benefit, since completed
 * overs never change (undo aside, which the over-doc listener catches).
 *
 * Everything detaches when the screen loses focus, when the app backgrounds,
 * and when the match stops being live — a leaked listener is the one failure
 * mode here that quietly costs money.
 */

/** Snapshots for a single ball arrive from up to three listeners within a few
 *  milliseconds of each other; coalesce them into one render. */
const COMMIT_DEBOUNCE_MS = 250;

type OverDoc = {
  id: string;
  inningNumber: number;
  overNumber: number;
  teamId: string;
};

/** Ball docs are ball_1, ball_2, … — string order misplaces ball_10+. */
const ballNumberOf = (id: string) => parseInt(String(id).split("_")[1], 10) || 0;

/**
 * Mirrors `MatchScore.getBallScores` so listener data and one-shot data are
 * indistinguishable downstream: players flattened, newest delivery first.
 */
const toBalls = (docs: { id: string; data: any }[]): scorePerBall[] =>
  docs
    .map(({ id, data }) => ({
      ...data,
      id,
      strikerBatter: data.strikerBatter
        ? { id: data.strikerBatter.id, name: data.strikerBatter.name }
        : undefined,
      nonStrikerBatter: data.nonStrikerBatter
        ? { id: data.nonStrikerBatter.id, name: data.nonStrikerBatter.name }
        : undefined,
      bowler: data.bowler
        ? { id: data.bowler.id, name: data.bowler.name }
        : undefined,
    }))
    .sort((a: any, b: any) => ballNumberOf(b.id) - ballNumberOf(a.id));

/** overNumber -> balls  ==>  the newest-over-first array ScoreBoard expects. */
const oversToInning = (overs: Map<number, scorePerBall[]>): scorePerInning =>
  Array.from(overs.keys())
    .sort((a, b) => b - a)
    .map((n) => overs.get(n) as scorePerBall[]);

export interface LiveMatchData {
  match: match | null;
  inning1: scorePerInning;
  inning2: scorePerInning;
  playerStats: playerStats[];
  /** playerId -> name, built from playerMatchStats (no `players` read). */
  playersMap: Map<string, string>;
  loading: boolean;
  error: string | null;
  /** Timestamp of the last snapshot applied — powers "updated Xs ago". */
  lastUpdatedAt: number | null;
  /** True while the listeners are attached (screen focused, app foregrounded). */
  isListening: boolean;
}

export const useLiveMatch = (matchId?: string | null): LiveMatchData => {
  const [matchState, setMatchState] = useState<match | null>(null);
  const [inning1, setInning1] = useState<scorePerInning>([]);
  const [inning2, setInning2] = useState<scorePerInning>([]);
  const [stats, setStats] = useState<playerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [currentOverId, setCurrentOverId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);
  const [appActive, setAppActive] = useState(
    AppState.currentState === "active"
  );
  const [focused, setFocused] = useState(true);

  // Working copies. Snapshots mutate these; state is only written on commit, so
  // untouched overs keep their array identity and don't re-render.
  const matchRef = useRef<match | null>(null);
  const overs1Ref = useRef<Map<number, scorePerBall[]>>(new Map());
  const overs2Ref = useRef<Map<number, scorePerBall[]>>(new Map());
  const statsRef = useRef<playerStats[]>([]);
  const overDocsRef = useRef<OverDoc[]>([]);
  const currentOverIdRef = useRef<string | null>(null);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
    };
  }, []);

  const commit = useCallback(() => {
    commitTimerRef.current = null;
    if (!mountedRef.current) return;
    setMatchState(matchRef.current);
    setInning1(oversToInning(overs1Ref.current));
    setInning2(oversToInning(overs2Ref.current));
    setStats(statsRef.current);
    setLastUpdatedAt(Date.now());
  }, []);

  const scheduleCommit = useCallback(
    (immediate = false) => {
      if (!mountedRef.current) return;
      if (immediate) {
        if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
        commit();
        return;
      }
      if (commitTimerRef.current) return;
      commitTimerRef.current = setTimeout(commit, COMMIT_DEBOUNCE_MS);
    },
    [commit]
  );

  /**
   * The current over is simply the highest over number of the innings the match
   * doc says is in progress — derived rather than counted, so a missed snapshot
   * can't leave the ball listener pointing at the wrong over.
   */
  const recomputeCurrentOver = useCallback(() => {
    const inning = matchRef.current?.isFirstInning === false ? 2 : 1;
    const newest = overDocsRef.current
      .filter((d) => d.inningNumber === inning)
      .reduce<OverDoc | null>(
        (acc, d) => (!acc || d.overNumber > acc.overNumber ? d : acc),
        null
      );
    const id = newest ? newest.id : null;
    if (id !== currentOverIdRef.current) {
      currentOverIdRef.current = id;
      if (mountedRef.current) setCurrentOverId(id);
    }
  }, []);

  const handleListenerError = useCallback((label: string) => {
    return (err: any) => {
      console.error(`live listener failed (${label})`, err);
      if (mountedRef.current) setError("Live updates interrupted");
    };
  }, []);

  // ---- App/screen lifecycle: nothing listens while backgrounded or blurred --
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      setAppActive(next === "active");
    });
    return () => sub.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  const active = appActive && focused && !!matchId;

  // ---- History load: on open, and again after any gap in listener coverage --
  //
  // While detached (backgrounded or blurred) whole overs can start and finish
  // unseen. Listener 3 only ever watches the *current* over, so those overs
  // would be missing from the map for good — and ScoreBoard numbers overs by
  // array position, so a single hole mislabels the entire innings. Re-reading
  // the history on resume is the only thing that reliably closes that gap.
  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }
    if (!active) return;
    // A match that isn't live can't have changed behind our back.
    if (readyRef.current && matchRef.current?.status !== "live") return;

    let cancelled = false;
    // Hold the listeners off until the re-read lands, so a snapshot can't
    // arrive first and then be clobbered by the slightly older fetch result.
    readyRef.current = false;
    setReady(false);
    if (!hasLoadedOnceRef.current) setLoading(true);

    (async () => {
      try {
        const [statsDoc, matchDoc, i1, i2] = await Promise.all([
          PlayerMatchStats.getByMatchId(matchId),
          Match.getById(matchId),
          MatchScore.getByMatchIdInningNumber(matchId, 1),
          MatchScore.getByMatchIdInningNumber(matchId, 2),
        ]);
        if (cancelled) return;

        matchRef.current = matchDoc ? ({ ...matchDoc } as match) : null;
        overs1Ref.current = new Map(
          (i1 ?? []).map((s) => [s.overNumber, s.overSummary])
        );
        overs2Ref.current = new Map(
          (i2 ?? []).map((s) => [s.overNumber, s.overSummary])
        );
        statsRef.current = statsDoc?.playerMatchStats ?? [];
        overDocsRef.current = [...(i1 ?? []), ...(i2 ?? [])].map((s) => ({
          id: `${s.matchId}_${s.teamId}_${s.inningNumber}_${s.overNumber}`,
          inningNumber: s.inningNumber,
          overNumber: s.overNumber,
          teamId: s.teamId,
        }));

        recomputeCurrentOver();
        scheduleCommit(true);
        setError(null);
      } catch (err) {
        console.error("Error loading live match:", err);
        if (!cancelled) setError("Could not load the match");
      } finally {
        if (!cancelled) {
          hasLoadedOnceRef.current = true;
          readyRef.current = true;
          setReady(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [matchId, active, recomputeCurrentOver, scheduleCommit]);

  // Listeners only attach once the history is in place, so their initial
  // snapshots merge into a complete picture instead of a partial one.
  const listening = ready && active;
  const isLive = matchState?.status === "live";
  const quickMatch = matchState?.quickMatch === true;

  // ---- 1. Match doc: headline score, status, innings, winner ----------------
  // Stays attached even once the match is completed (it is a single doc that
  // then never changes) so an undo that flips it back to live is picked up.
  useEffect(() => {
    if (!matchId || !listening) return;
    const unsubscribe = onSnapshot(
      doc(db, "matches", matchId),
      (snap: any) => {
        if (!snap?.exists) return;
        matchRef.current = { ...(snap.data() as any), matchId };
        recomputeCurrentOver();
        scheduleCommit();
      },
      handleListenerError("match")
    );
    return unsubscribe;
  }, [
    matchId,
    listening,
    recomputeCurrentOver,
    scheduleCommit,
    handleListenerError,
  ]);

  // ---- 2. The set of over docs ---------------------------------------------
  // Signals a new over (so listener 3 re-targets without any arithmetic) and
  // surfaces overs deleted by undo.
  useEffect(() => {
    if (!matchId || !listening || !isLive) return;
    const q = query(
      collection(db, "matchScores"),
      where("matchId", "==", matchId)
    );
    const unsubscribe = onSnapshot(
      q,
      (snap: any) => {
        const docs: OverDoc[] = snap.docs.map((d: any) => {
          const data = d.data() as any;
          return {
            id: d.id,
            inningNumber: data.inningNumber,
            overNumber: data.overNumber,
            teamId: data.teamId,
          };
        });
        overDocsRef.current = docs;

        // Undo can delete a whole over doc — drop any over we still hold that
        // the server no longer has.
        const prune = (map: Map<number, scorePerBall[]>, inning: number) => {
          const present = new Set(
            docs.filter((d) => d.inningNumber === inning).map((d) => d.overNumber)
          );
          Array.from(map.keys()).forEach((n) => {
            if (!present.has(n)) map.delete(n);
          });
        };
        prune(overs1Ref.current, 1);
        prune(overs2Ref.current, 2);

        recomputeCurrentOver();
        scheduleCommit();
      },
      handleListenerError("overs")
    );
    return unsubscribe;
  }, [
    matchId,
    listening,
    isLive,
    recomputeCurrentOver,
    scheduleCommit,
    handleListenerError,
  ]);

  // ---- 3. Balls of the current over ----------------------------------------
  useEffect(() => {
    if (!currentOverId || !listening || !isLive) return;
    const overDoc = overDocsRef.current.find((d) => d.id === currentOverId);
    if (!overDoc) return;

    const unsubscribe = onSnapshot(
      collection(db, `matchScores/${currentOverId}/balls`),
      (snap: any) => {
        const balls = toBalls(
          snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))
        );
        const map =
          overDoc.inningNumber === 2 ? overs2Ref.current : overs1Ref.current;
        // An over doc is created just before its first ball; don't show an
        // empty over card in the gap (or after an undo empties it).
        if (balls.length === 0) map.delete(overDoc.overNumber);
        else map.set(overDoc.overNumber, balls);
        scheduleCommit();
      },
      handleListenerError("balls")
    );
    return unsubscribe;
  }, [currentOverId, listening, isLive, scheduleCommit, handleListenerError]);

  // ---- 4. Player match stats -----------------------------------------------
  // quickMatch records no player stats at all, so there is nothing to watch.
  useEffect(() => {
    if (!matchId || !listening || !isLive || quickMatch) return;
    const q = query(
      collection(db, "playerMatchStats"),
      where("matchId", "==", matchId)
    );
    const unsubscribe = onSnapshot(
      q,
      (snap: any) => {
        const first = snap.docs[0];
        statsRef.current = first
          ? ((first.data() as any).playerMatchStats ?? [])
          : [];
        scheduleCommit();
      },
      handleListenerError("playerStats")
    );
    return unsubscribe;
  }, [
    matchId,
    listening,
    isLive,
    quickMatch,
    scheduleCommit,
    handleListenerError,
  ]);

  // playerStats already carries `name`, so the id -> name map costs nothing —
  // unlike matchSummary, which reads the whole `players` collection for it.
  const playersMap = useMemo(() => {
    const map = new Map<string, string>();
    stats.forEach((s) => map.set(s.playerId, s.name));
    return map;
  }, [stats]);

  return {
    match: matchState,
    inning1,
    inning2,
    playerStats: stats,
    playersMap,
    loading,
    error,
    lastUpdatedAt,
    isListening: listening,
  };
};

export default useLiveMatch;
