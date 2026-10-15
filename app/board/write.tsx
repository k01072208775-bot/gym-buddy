import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChoiceChips } from '@/components/ui/choice-chips';
import { Field } from '@/components/ui/field';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Stepper } from '@/components/ui/stepper';
import { BOARDS, isBoardType, WORKOUT_SPORTS } from '@/constants/board';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { usePost, useSavePost } from '@/features/board/hooks';
import { PostImagePicker } from '@/features/board/post-image-picker';
import { useAppColors } from '@/hooks/use-app-colors';
import type { BoardType, PostItem } from '@/types/database';

const SPORT_OPTIONS = WORKOUT_SPORTS.map((sport) => ({ value: sport, label: sport }));

const RECRUIT_OPTIONS = [
  { value: 'off', label: '모집 안 함' },
  { value: 'on', label: '인원 모집' },
] as const;

/** DB 제약(posts_capacity_check)과 같은 범위여야 합니다 */
const MIN_CAPACITY = 2;
const MAX_CAPACITY = 20;
const DEFAULT_CAPACITY = 4;

/**
 * 글쓰기 / 글 수정 공용 화면.
 *   새 글:   /board/write?board=workout&sport=풋살
 *   글 수정: /board/write?postId=12
 */
export default function WritePostScreen() {
  const colors = useAppColors();
  const params = useLocalSearchParams<{ board?: string; sport?: string; postId?: string }>();
  const editingId = params.postId ? Number(params.postId) : null;
  const { data: existing, isPending } = usePost(editingId);

  // 수정일 때는 기존 글을 다 불러온 뒤에 폼을 그려야 입력칸에 내용이 채워진다
  if (editingId !== null && isPending) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (editingId !== null && !existing) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>삭제되었거나 수정할 수 없는 글이에요.</Text>
      </View>
    );
  }

  return (
    <PostForm
      editingId={editingId}
      initial={existing ?? null}
      initialBoard={isBoardType(params.board) ? params.board : 'free'}
      initialSport={params.sport && WORKOUT_SPORTS.includes(params.sport) ? params.sport : null}
    />
  );
}

function PostForm({
  editingId,
  initial,
  initialBoard,
  initialSport,
}: {
  editingId: number | null;
  initial: PostItem | null;
  initialBoard: BoardType;
  initialSport: string | null;
}) {
  const colors = useAppColors();
  const router = useRouter();
  const save = useSavePost();
  const insets = useSafeAreaInsets();

  const [board, setBoard] = useState<BoardType>(initial?.board ?? initialBoard);
  const [sport, setSport] = useState<string | null>(initial?.sport ?? initialSport);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : '');
  /** null = 모집이 아닌 그냥 글 */
  const [capacity, setCapacity] = useState<number | null>(initial?.capacity ?? null);
  const [imageUrls, setImageUrls] = useState<string[]>(initial?.image_urls ?? []);

  const isMarket = board === 'market';
  const isWorkout = board === 'workout';
  const canSubmit =
    !!title.trim() &&
    !!body.trim() &&
    (!isMarket || price !== '') &&
    (!isWorkout || sport !== null);

  function handleSubmit() {
    if (!canSubmit) return;
    save.mutate(
      {
        postId: editingId,
        input: {
          board,
          title,
          body,
          price: isMarket ? Number(price) : null,
          sport: isWorkout ? sport : null,
          capacity: isWorkout ? capacity : null,
          imageUrls,
        },
      },
      {
        onSuccess: (postId) => {
          if (editingId !== null) router.back();
          else router.replace(`/board/${postId}`);
        },
        onError: (err) => Alert.alert('저장 실패', (err as Error).message),
      }
    );
  }

  // 로그인·채팅 입력칸과 같은 모양: 테두리 없이 한 단계 밝은 면
  const inputStyle = [styles.input, { color: colors.text, backgroundColor: colors.card }];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // 헤더 높이(기본 44 + 노치)를 빼야 키보드와 버튼이 겹치지 않습니다
      keyboardVerticalOffset={insets.top + 44}>
      <Stack.Screen options={{ title: editingId !== null ? '글 수정' : '글쓰기' }} />

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {/* 게시판 종류는 새 글일 때만 고를 수 있다 */}
        {editingId === null ? (
          <Field label="어디에 쓸까요?">
            <ChoiceChips options={BOARDS} value={board} onChange={setBoard} />
          </Field>
        ) : null}

        {isWorkout ? (
          <Field label="종목">
            <ChoiceChips options={SPORT_OPTIONS} value={sport} onChange={setSport} />
          </Field>
        ) : null}

        {isWorkout ? (
          <Field
            label="총 몇 명이 운동하나요?"
            hint="글쓴이인 나를 포함한 인원이에요. 총 4명이면 3명이 더 참여할 수 있어요.">
            <ChoiceChips
              options={RECRUIT_OPTIONS}
              value={capacity === null ? 'off' : 'on'}
              onChange={(next) => setCapacity(next === 'off' ? null : DEFAULT_CAPACITY)}
            />
            {capacity !== null ? (
              <View style={styles.stepper}>
                <Stepper
                  value={capacity}
                  onChange={setCapacity}
                  min={MIN_CAPACITY}
                  max={MAX_CAPACITY}
                  format={(n) => '총 ' + n + '명'}
                />
              </View>
            ) : null}
          </Field>
        ) : null}

        <Field label="제목">
          <TextInput
            style={inputStyle}
            value={title}
            onChangeText={setTitle}
            placeholder="한 줄로 요약해주세요"
            placeholderTextColor={colors.textMuted}
            maxLength={60}
          />
        </Field>

        {isMarket ? (
          <Field label="가격" hint="0원으로 적으면 나눔으로 표시돼요.">
            <TextInput
              style={inputStyle}
              value={price}
              onChangeText={(text) => setPrice(text.replace(/[^0-9]/g, '').slice(0, 9))}
              placeholder="원 단위로 숫자만"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />
          </Field>
        ) : null}

        <Field label="내용">
          <TextInput
            style={[inputStyle, styles.bodyInput]}
            value={body}
            onChangeText={setBody}
            placeholder={BOARDS.find((item) => item.value === board)?.placeholder}
            placeholderTextColor={colors.textMuted}
            maxLength={5000}
            multiline
            textAlignVertical="top"
          />
        </Field>

        <PostImagePicker urls={imageUrls} onChange={setImageUrls} />

        <Text style={[Typography.caption, { color: colors.textMuted }]}>
          같은 학교 학생에게만 보여요. 욕설·비방·거래 사기 글은 신고되면 제재될 수 있어요.
        </Text>
      </ScrollView>

      {/* 스크롤 영역 안에 두면 키보드가 올라올 때 화면 밖으로 밀려 안 보입니다 */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, Spacing.md),
          },
        ]}>
        <PrimaryButton
          label={editingId !== null ? '수정하기' : '등록하기'}
          onPress={handleSubmit}
          busy={save.isPending}
          disabled={!canSubmit}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  form: { padding: Spacing.lg, gap: Spacing.xl, paddingBottom: Spacing.xl },
  stepper: { marginTop: Spacing.sm },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    ...Typography.body,
    fontSize: 16,
  },
  bodyInput: { minHeight: 200 },
});
