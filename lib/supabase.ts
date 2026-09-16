import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { Database } from '@/types/database';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    '.env.local 에 EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY 를 넣어주세요.\n' +
      '(.env.example 파일을 복사해서 만들면 됩니다. 값을 바꾼 뒤에는 expo 서버를 재시작해야 반영됩니다.)'
  );
}

/**
 * Supabase 클라이언트는 앱 전체에서 이 인스턴스 하나만 씁니다.
 * 화면/컴포넌트에서 이 파일을 직접 import 하지 말고,
 * 반드시 features/<기능>/api.ts 를 거치세요.
 */
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    // 웹에서는 브라우저 localStorage 를 그대로 쓰고, 네이티브에서만 AsyncStorage 사용
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
