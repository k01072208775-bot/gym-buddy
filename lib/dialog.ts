import { Alert, Platform } from 'react-native';

/**
 * 알림 · 확인 창.
 *
 * ★ React Native Web 에는 Alert 가 구현돼 있지 않습니다.
 *   웹(아이패드 사파리 등)에서 Alert.alert 를 부르면 아무 일도 일어나지 않아,
 *   저장 실패 같은 오류가 조용히 사라지고 확인 창이 필요한 동작은 아예
 *   실행되지 않습니다. 그래서 화면 코드에서는 Alert 를 직접 쓰지 말고
 *   이 파일의 함수를 쓰세요.
 */

/** 알림 한 줄 보여주기 */
export function showMessage(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

/**
 * 확인 / 취소를 묻고, 확인을 누르면 true.
 * 되돌릴 수 없는 동작이면 destructive 를 켜세요 (폰에서 빨간 글씨로 나옵니다).
 */
export function confirmMessage({
  title,
  message,
  confirmLabel = '확인',
  destructive = false,
}: {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: '취소', style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { onDismiss: () => resolve(false) }
    );
  });
}
