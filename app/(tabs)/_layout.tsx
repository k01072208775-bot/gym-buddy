import { Tabs } from 'expo-router';

import { useAppColors } from '@/hooks/use-app-colors';

export default function TabsLayout() {
  const colors = useAppColors();

  return (
    <Tabs
      screenOptions={{
        // 탭 화면은 전부 화면 안에 큰 제목(ScreenHeader)을 직접 그리므로 기본 헤더를 숨긴다
        headerShown: false,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text, fontWeight: '800' },
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}>
      <Tabs.Screen name="index" options={{ title: '탐색' }} />
      <Tabs.Screen name="matches" options={{ title: '매칭' }} />
      <Tabs.Screen name="board" options={{ title: '게시판' }} />
      <Tabs.Screen name="profile" options={{ title: '내 프로필' }} />
    </Tabs>
  );
}
