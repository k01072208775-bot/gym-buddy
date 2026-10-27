import { AvatarColors } from '@/constants/theme';

/**
 * 닉네임으로 프로필 동그라미 색을 고릅니다.
 * 같은 사람은 탐색·매칭·채팅 어디서나 같은 색으로 보여야 알아보기 쉽습니다.
 *
 * ★ 글자 코드를 단순히 더하면 안 됩니다.
 *   한글 음절은 코드값이 588 간격인데 588 이 7(색 개수)로 나누어떨어져서
 *   '가 나 다 라 마 바' 가 전부 같은 색이 됩니다. djb2 해시로 섞습니다.
 */
export function avatarColor(name: string) {
  let hash = 5381;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash * 33) ^ name.charCodeAt(i)) >>> 0;
  }
  return AvatarColors[hash % AvatarColors.length];
}
