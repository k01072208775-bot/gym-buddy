import { Link } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { useMatches } from '@/features/matching/hooks';
import { useAppColors } from '@/hooks/use-app-colors';

export default function MatchesScreen() {
  const colors = useAppColors();
  const { data, isPending } = useMatches();

  if (isPending) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      data={data}
      keyExtractor={(item) => String(item.matchId)}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            아직 매칭된 사람이 없어요.{'\n'}탐색 탭에서 마음에 드는 사람을 찾아보세요.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <Link
          href={`/chat/${item.matchId}`}
          style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View>
            <Text style={[styles.nickname, { color: colors.text }]}>{item.partner.nickname}</Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              {item.partner.university}
            </Text>
          </View>
        </Link>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { textAlign: 'center', lineHeight: 22 },
  list: { padding: 16, gap: 8, flexGrow: 1 },
  row: { borderWidth: 1, borderRadius: 12, padding: 16 },
  nickname: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13, marginTop: 2 },
});
