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
 * 운동게시판 종목. 자주 쓰일 것 같은 순서로 둡니다 (목록 맨 앞이 가장 잘 눌립니다).
 *
 * 프로필의 SPORTS(내가 하는 운동)와 일부러 분리했습니다.
 * 게시판은 "같이 할 사람을 구하는 종목"이라 당구·볼링처럼 성격이 다른 것도 들어갑니다.
 * 종목을 추가·수정할 때 DB 는 건드리지 않아도 됩니다 (글에 글자 그대로 저장).
 *
 * ★ 여기서 종목을 빼면, 그 종목으로 이미 올라간 글은 종목 필터에서만 안 보입니다.
 *   글 자체는 "전체"에서 그대로 보입니다.
 */
export const WORKOUT_SPORTS: readonly string[] = [
  '축구',
  '러닝',
  '헬스',
  '풋살',
  '농구',
  '배드민턴',
  '당구',
  '볼링',
  '테니스',
  '기타',
];

export const TRADE_STATUSES: readonly TradeStatus[] = ['selling', 'reserved', 'sold'];

export const TRADE_STATUS_LABELS: Record<TradeStatus, string> = {
  selling: '판매중',
  reserved: '예약중',
  sold: '판매완료',
};

export function isBoardType(value: unknown): value is BoardType {
  return BOARDS.some((board) => board.value === value);
}
