import { AppColors, type AppPalette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** 현재 라이트/다크 모드에 맞는 색상표를 돌려줍니다. */
export function useAppColors(): AppPalette {
  const scheme = useColorScheme();
  return AppColors[scheme === 'dark' ? 'dark' : 'light'];
}
