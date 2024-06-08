import { scorePerInning } from "./scorePerInnig";

type match = {
    team1: string;
    team2: string;
    team1score: scorePerInning;
    team2score: scorePerInning;
    tossWin: 'team1' | 'team2';
    choose: 'batting' | 'bowling';
    winner: 'team1' | 'team2';
    overs: number;
    status: 'live' | 'completed';
};

export type { match };