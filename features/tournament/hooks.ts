import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-client';
import * as api from './api';

export function useTournaments() {
  return useQuery({
    queryKey: queryKeys.tournaments,
    queryFn: api.fetchTournaments,
  });
}

export function useTournamentPlayers(tournamentId: number) {
  return useQuery({
    queryKey: queryKeys.tournamentPlayers(tournamentId),
    queryFn: () => api.fetchPlayers(tournamentId),
    enabled: Number.isFinite(tournamentId),
  });
}

/**
 * 대진표. 현장에서 여러 명이 같이 보고 있으므로 10초마다 새로 확인합니다
 * (운영자가 결과를 넣으면 다른 사람 화면에도 곧 반영됩니다).
 */
export function useBracket(tournamentId: number) {
  return useQuery({
    queryKey: queryKeys.bracket(tournamentId),
    queryFn: () => api.fetchBracket(tournamentId),
    enabled: Number.isFinite(tournamentId),
    refetchInterval: 10_000,
  });
}

export function useCreateTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createTournament,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tournaments }),
  });
}

export function useDeleteTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteTournament,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tournaments }),
  });
}

export function useAddPlayer(tournamentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.addPlayer(tournamentId, name),
    onSuccess: () => refreshTournament(queryClient, tournamentId),
  });
}

export function useRemovePlayer(tournamentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.removePlayer,
    onSuccess: () => refreshTournament(queryClient, tournamentId),
  });
}

export function useSetCapacity(tournamentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (capacity: number | null) => api.setTournamentCapacity(tournamentId, capacity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tournaments }),
  });
}

export function useBuildBracket(tournamentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.buildBracket(tournamentId),
    onSuccess: () => refreshTournament(queryClient, tournamentId),
  });
}

export function useSetMatchResult(tournamentId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      matchId: number;
      winner: number;
      scoreA: number | null;
      scoreB: number | null;
    }) => api.setMatchResult({ tournamentId, ...input }),
    onSuccess: () => refreshTournament(queryClient, tournamentId),
  });
}

/** 참가자·대진표·목록(인원 수와 상태가 바뀌므로)을 함께 새로 불러옵니다 */
function refreshTournament(
  queryClient: ReturnType<typeof useQueryClient>,
  tournamentId: number
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.tournamentPlayers(tournamentId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.bracket(tournamentId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.tournaments }),
  ]);
}
