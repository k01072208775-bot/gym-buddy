import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useLikesReceived, useMatches } from '@/features/matching/hooks';
import { useAppColors } from '@/hooks/use-app-colors';

/** 선택됐을 때와 아닐 때 아이콘을 바꿔 지금 어느 탭인지 한눈에 보이게 합니다 */
function tabIcon(active: keyof typeof Ionicons.glyphMap, inactive: keyof typeof Ionicons.glyphMap) {
  function TabIcon({ focused }: { focused: boolean }) {
    const colors = useAppColors();
    return (
      <Ionicons
        name={focused ? active : inactive}
        size={24}
        color={focused ? colors.primary : colors.textMuted}
      />
    );
  }
  return TabIcon;
}

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
      <Tabs.Screen
        name="index"
        options={{ title: '탐색', tabBarIcon: tabIcon('search', 'search-outline') }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: '매칭',
          tabBarIcon: tabIcon('heart', 'heart-outline'),
          tabBarBadge: waitingCount > 0 ? waitingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.onPrimary, fontWeight: '800' },
        }}
      />
      <Tabs.Screen
        name="board"
        options={{ title: '게시판', tabBarIcon: tabIcon('chatbubbles', 'chatbubbles-outline') }}
      />
      <Tabs.Screen
        name="tournaments"
        options={{ title: '대회', tabBarIcon: tabIcon('trophy', 'trophy-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: '내 프로필', tabBarIcon: tabIcon('person', 'person-outline') }}
      />
    </Tabs>
  );
}
