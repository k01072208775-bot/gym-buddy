import type { ExperienceLevel, Gender } from '@/types/database';

/**
 * 선택지 목록은 전부 여기에 모아둡니다.
 * 화면마다 배열을 따로 적으면 온보딩과 필터 화면의 항목이 어긋나기 시작합니다.
 */

export const SPORTS = [
  '헬스',
  '러닝',
  '수영',
  '클라이밍',
  '크로스핏',
  '필라테스',
  '요가',
  '농구',
  '축구',
  '풋살',
  '배드민턴',
  '테니스',
  '당구',
  '볼링',
  '복싱',
] as const;

export const TIME_SLOTS = [
  '평일 오전',
  '평일 낮',
  '평일 저녁',
  '평일 심야',
  '주말 오전',
  '주말 오후',
  '주말 저녁',
] as const;

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: '초보 (1년 미만)',
  intermediate: '중급 (1~3년)',
  advanced: '고급 (3년 이상)',
};

export const GENDER_LABELS: Record<Gender, string> = {
  male: '남성',
  female: '여성',
  other: '기타',
};

/** 신고 사유 — 앱스토어 심사에서 요구하는 신고 기능의 선택지 */
export const REPORT_REASONS = [
  { value: 'harassment', label: '괴롭힘 · 부적절한 언행' },
  { value: 'fake_profile', label: '허위 프로필 · 사칭' },
  { value: 'spam', label: '스팸 · 광고' },
  { value: 'inappropriate', label: '부적절한 사진 또는 내용' },
  { value: 'other', label: '기타' },
] as const;

/** 학교 이메일 인증에 허용할 도메인. 운영 전에 실제 목록으로 교체하세요. */
export const ALLOWED_EMAIL_DOMAINS = ['ac.kr', 'edu'] as const;

export function isUniversityEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1] ?? '';
  return ALLOWED_EMAIL_DOMAINS.some((suffix) => domain.endsWith(suffix));
}
