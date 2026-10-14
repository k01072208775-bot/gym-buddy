import { Tabs } from 'expo-router';

import { useLikesReceived, useMatches } from '@/features/matching/hooks';
import { useAppColors } from '@/hooks/use-app-colors';

export default function TabsLayout() {
  const colors = useAppColors();
  // 푸시 알림 대신: 챙겨야 할 것(받은 관심 + 안 읽은 메시지) 수를 매칭 탭에 띄운다
  const { data: likes } = useLikesReceived();
  const { data: matches } = useMatches();
  const waitingCount =
    (likes?.length ?? 0) +
    (matches ?? []).reduce((sum, match) => sum + match.unreadCount, 0);

  return (
    <Tabs
      screenOptions={{
        // 탭 화면은 전부 화면 안에 큰 제목(ScreenHeader)을 직접 그리므로 기본 헤더를 숨긴다
        headerShown: false,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text, fontWeight: '800' },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}>
      <Tabs.Screen name="index" options={{ title: '탐색' }} />
      <Tabs.Screen
        name="matches"
        options={{
          title: '매칭',
          tabBarBadge: waitingCount > 0 ? waitingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.onPrimary, fontWeight: '800' },
        }}
      />
      <Tabs.Screen name="board" options={{ title: '게시판' }} />
      <Tabs.Screen name="profile" options={{ title: '내 프로필' }} />
    </Tabs>
  );
}
