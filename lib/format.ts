/** 화면 여러 곳에서 쓰는 표시용 포맷 함수 */

/** "방금", "5분 전", "3시간 전", "2일 전", 일주일이 넘으면 "9/15" */
export function formatRelativeTime(iso: string): string {
  const diffMinutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMinutes < 1) return '방금';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffMinutes < 60 * 24) return `${Math.floor(diffMinutes / 60)}시간 전`;
  if (diffMinutes < 60 * 24 * 7) return `${Math.floor(diffMinutes / (60 * 24))}일 전`;

  const date = new Date(iso);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** 15000 → "15,000원", 0 → "나눔" */
export function formatPrice(price: number): string {
  return price === 0 ? '나눔' : `${price.toLocaleString('ko-KR')}원`;
}
