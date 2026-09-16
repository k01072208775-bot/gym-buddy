import { supabase } from '@/lib/supabase';

const normalize = (email: string) => email.trim().toLowerCase();

/**
 * 이메일 + 비밀번호 방식.
 *
 * 원래는 학교 이메일로 6자리 코드를 보내는 방식(아래 sendLoginCode)을 쓰려 했지만,
 * Supabase 기본 메일 발송기는 템플릿 수정이 잠겨 있어서 코드 대신 링크만 보냅니다.
 * 커스텀 SMTP를 연결하기 전까지는 비밀번호 방식으로 갑니다.
 *
 * ⚠️ 지금은 학교 이메일을 "형식만" 검사하고 실제 소유 여부는 확인하지 않습니다.
 *    출시 전에 반드시 SMTP를 붙이고 아래 코드 방식으로 되돌리세요.
 */
export async function signUpWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email: normalize(email),
    password,
  });
  if (error) throw error;
  return data.session;
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalize(email),
    password,
  });
  if (error) throw error;
  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Supabase 에러 메시지를 사용자에게 보여줄 한국어 문구로 바꿉니다. */
export function toKoreanAuthError(error: unknown): string {
  const message = (error as Error)?.message ?? '';

  if (message.includes('Invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않아요.';
  }
  if (message.includes('already registered') || message.includes('already been registered')) {
    return '이미 가입된 이메일이에요. 로그인으로 바꿔서 시도해주세요.';
  }
  if (message.includes('Password should be at least')) {
    return '비밀번호는 6자 이상이어야 해요.';
  }
  if (message.includes('Email not confirmed')) {
    return '이메일 인증이 필요한 설정입니다. Supabase에서 Confirm email 을 꺼주세요.';
  }
  if (message.includes('rate limit') || message.includes('Too many')) {
    return '요청이 너무 많아요. 잠시 뒤에 다시 시도해주세요.';
  }
  return message || '알 수 없는 오류가 발생했어요.';
}

// ---------------------------------------------------------------------------
// 아래는 커스텀 SMTP 연결 후에 쓸 6자리 코드 방식입니다. 지금은 쓰지 않습니다.
// Supabase > Authentication > Emails 에서 템플릿의 {{ .ConfirmationURL }} 을
// {{ .Token }} 으로 바꾼 뒤 login 화면을 이 함수들로 되돌리면 됩니다.
// ---------------------------------------------------------------------------

export async function sendLoginCode(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email: normalize(email),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyLoginCode(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: normalize(email),
    token: token.trim(),
    type: 'email',
  });
  if (error) throw error;
  return data.session;
}
