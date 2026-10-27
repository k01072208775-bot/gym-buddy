import { supabase } from '@/lib/supabase';
import type {
  BracketMatch,
  TournamentListItem,
  TournamentPlayer,
  TournamentStatus,
} from '@/types/database';

/**
 * 토너먼트 (0010_tournaments.sql).
 *
 * 팝업 부스처럼 현장에서 운영자가 참가자를 받아 대진표를 돌리는 용도입니다.
 * 참가자는 앱 계정 없이 이름만으로 등록됩니다.
 * 참가비가 오가는 대회는 여기가 아니라 0002_competitions.sql 쪽입니다.
 */

export type TournamentInput = {
  title: string;
  sport: string;
  venue: string | null;
  startsAt: string | null;
  /** 참가 정원. null 이면 제한 없음 */
  capacity: number | null;
};

/** 같은 학교 대회 목록. 준비 중인 대회는 주최자에게만 보입니다 */
export async function fetchTournaments(): Promise<TournamentListItem[]> {
  const { data, error } = await supabase.rpc('get_tournaments', {});
  if (error) throw error;
  return data ?? [];
}

/** @returns 새 대회의 id. 주최자와 학교는 DB 트리거가 채웁니다 */
export async function createTournament(input: TournamentInput): Promise<number> {
  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      title: input.title.trim(),
      sport: input.sport,
      venue: input.venue?.trim() || null,
      starts_at: input.startsAt,
      capacity: input.capacity,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function deleteTournament(tournamentId: number): Promise<void> {
  const { error } = await supabase.from('tournaments').delete().eq('id', tournamentId);
  if (error) throw error;
}

export async function setTournamentStatus(
  tournamentId: number,
  status: TournamentStatus
): Promise<void> {
  const { error } = await supabase.from('tournaments').update({ status }).eq('id', tournamentId);
  if (error) throw error;
}

/**
 * 정원 바꾸기. 부스에서 사람이 더 오거나 당구대가 줄면 도중에 조정합니다.
 * 이미 등록된 인원보다 적게 줄여도 기존 참가자가 밀려나지는 않습니다.
 */
export async function setTournamentCapacity(
  tournamentId: number,
  capacity: number | null
): Promise<void> {
  const { error } = await supabase
    .from('tournaments')
    .update({ capacity })
    .eq('id', tournamentId);
  if (error) throw error;
}

export async function fetchPlayers(tournamentId: number): Promise<TournamentPlayer[]> {
  const { data, error } = await supabase
    .from('tournament_players')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('id');
  if (error) throw error;
  return data;
}

/** 현장에서 이름만 받아 등록합니다 */
export async function addPlayer(tournamentId: number, name: string): Promise<void> {
  const { error } = await supabase
    .from('tournament_players')
    .insert({ tournament_id: tournamentId, name: name.trim() });
  if (error) throw error;
}

export async function removePlayer(playerId: number): Promise<void> {
  const { error } = await supabase.from('tournament_players').delete().eq('id', playerId);
  if (error) throw error;
}

/**
 * 대진표 만들기.
 * 참가자 수가 2·4·8 이 아니면 윗자리부터 부전승이 붙습니다.
 * 이미 경기가 있으면 지우고 다시 만듭니다 (현장에서 사람이 늦게 와 다시 짜는 일이 흔합니다).
 */
export async function buildBracket(tournamentId: number): Promise<void> {
  const { error } = await supabase.rpc('build_bracket', { p_tournament_id: tournamentId });
  if (error) throw error;
}

export async function fetchBracket(tournamentId: number): Promise<BracketMatch[]> {
  const { data, error } = await supabase.rpc('get_bracket', { p_tournament_id: tournamentId });
  if (error) throw error;
  return data ?? [];
}

/**
 * 경기 결과 입력. 승자를 정하면 다음 라운드 자리에 자동으로 올라갑니다.
 * 점수는 선택이라 비워둬도 됩니다 (현장에서 점수까지 적기 번거로운 경우).
 */
export async function setMatchResult(input: {
  tournamentId: number;
  matchId: number;
  winner: number;
  scoreA: number | null;
  scoreB: number | null;
}): Promise<void> {
  const { error } = await supabase
    .from('tournament_matches')
    .update({
      winner: input.winner,
      score_a: input.scoreA,
      score_b: input.scoreB,
      played_at: new Date().toISOString(),
    })
    .eq('id', input.matchId);
  if (error) throw error;

  const { error: advanceError } = await supabase.rpc('advance_winners', {
    p_tournament_id: input.tournamentId,
  });
  if (advanceError) throw advanceError;
}
