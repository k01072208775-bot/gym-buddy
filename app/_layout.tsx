import { DarkTheme, ThemeProvider } from 'expo-router/react-navigation';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useMyProfile } from '@/features/profile/hooks';
import { useAppColors } from '@/hooks/use-app-colors';
import { queryClient } from '@/lib/query-client';
import { SessionProvider, useSession } from '@/lib/session';

export default function RootLayout() {
  const colors = useAppColors();

  // 채팅·게시글 화면의 상단 헤더도 앱 색상표를 따르도록 내비게이션 테마를 맞춘다
  const navigationTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider value={navigationTheme}>
          <AuthGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="chat/[matchId]"
                options={{ headerShown: true, title: '채팅' }}
              />
              <Stack.Screen
                name="board/[postId]"
                options={{ headerShown: true, title: '게시글' }}
              />
              <Stack.Screen
                name="board/write"
                options={{ headerShown: true, title: '글쓰기' }}
              />
              <Stack.Screen
                name="profile/edit"
                options={{ headerShown: true, title: '프로필 수정' }}
              />
            </Stack>
          </AuthGate>
          <StatusBar style="light" />
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

/**
 * 로그인 / 온보딩 여부에 따라 화면을 강제로 갈아끼웁니다.
 *
 * 이 판단을 화면마다 따로 하면 반드시 어딘가 빠뜨리게 되므로
 * 진입점 한 곳에서만 처리합니다.
 */
function AuthGate({ children }: { children: ReactNode }) {
  const colors = useAppColors();
  const { session, loading } = useSession();
  const { data: profile, isPending: profilePending } = useMyProfile();
  const segments = useSegments();
  const router = useRouter();

  // 세션 복원 중이거나, 로그인은 됐는데 프로필을 아직 못 읽어온 상태
  const checking = loading || (!!session && profilePending);

  useEffect(() => {
    if (checking) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onboarded = !!profile?.prefs;

    if (!session) {
      if (!inAuthGroup) router.replace('/login');
    } else if (!onboarded) {
      if (!segments.some((segment) => segment === 'onboarding')) router.replace('/onboarding');
    } else if (inAuthGroup) {
      router.replace('/');
    }
  }, [checking, session, profile, segments, router]);

  if (checking) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
