import { SPORTS } from '@/constants/workout';
import type { BoardType, TradeStatus } from '@/types/database';

/**
 * 게시판 목록. 순서대로 게시판 탭 상단에 표시됩니다.
 * 게시판을 추가하려면 DB의 board_type enum 에도 같은 값을 추가하세요 (0003_boards.sql 참고).
 */
export const BOARDS: readonly { value: BoardType; label: string; placeholder: string }[] = [
  { value: 'free', label: '자유', placeholder: '자유롭게 이야기를 나눠보세요.' },
  { value: 'workout', label: '운동', placeholder: '루틴, 식단, 운동 질문을 공유해보세요.' },
  { value: 'market', label: '장터', placeholder: '물건 상태, 거래 장소 등을 적어주세요.' },
];

export const BOARD_LABELS: Record<BoardType, string> = {
  free: '자유게시판',
  workout: '운동게시판',
  market: '장터게시판',
};

/**
 * 운동게시판 종목. 매칭 프로필과 같은 SPORTS 목록을 쓰고 '기타'만 덧붙입니다.
 * 종목을 추가하려면 constants/workout.ts 의 SPORTS 에 넣으세요 (DB 수정 불필요).
 */
export const WORKOUT_SPORTS: readonly string[] = [...SPORTS, '기타'];

export const TRADE_STATUSES: readonly TradeStatus[] = ['selling', 'reserved', 'sold'];

export const TRADE_STATUS_LABELS: Record<TradeStatus, string> = {
  selling: '판매중',
  reserved: '예약중',
  sold: '판매완료',
};

export function isBoardType(value: unknown): value is BoardType {
  return BOARDS.some((board) => board.value === value);
}
