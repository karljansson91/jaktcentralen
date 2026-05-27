import { setPendingIssueReportDraft } from '@/lib/issue-report-draft';
import { Href, usePathname, useRouter } from 'expo-router';
import { PropsWithChildren, useCallback, useMemo, useRef } from 'react';
import { TextInput, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

const REPORT_GESTURE_DURATION_MS = 5000;
const REPORT_CAPTURE_MAX_WIDTH = 480;

function isReportScreen(pathname: string) {
  return pathname.startsWith('/issue-report');
}

export function IssueReportGesture({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { push } = useRouter();
  const dimensions = useWindowDimensions();
  const isOpeningRef = useRef(false);

  const openIssueReport = useCallback(async () => {
    if (isOpeningRef.current || isReportScreen(pathname)) {
      return;
    }

    if (TextInput.State.currentlyFocusedInput()) {
      return;
    }

    isOpeningRef.current = true;
    try {
      const scale = Math.min(1, REPORT_CAPTURE_MAX_WIDTH / dimensions.width);
      let screenshotUri: string | undefined;

      try {
        const { captureScreen } = await import('react-native-view-shot');
        screenshotUri = await captureScreen({
          format: 'jpg',
          height: Math.round(dimensions.height * scale),
          quality: 0.62,
          result: 'data-uri',
          width: Math.round(dimensions.width * scale),
        });
      } catch {
        screenshotUri = undefined;
      }

      setPendingIssueReportDraft({
        capturedAt: Date.now(),
        screenPath: pathname,
        screenshotUri,
      });
      push('/issue-report' as Href);
    } finally {
      setTimeout(() => {
        isOpeningRef.current = false;
      }, 750);
    }
  }, [dimensions.height, dimensions.width, pathname, push]);

  const gesture = useMemo(
    () =>
      Gesture.LongPress()
        .numberOfPointers(2)
        .minDuration(REPORT_GESTURE_DURATION_MS)
        .maxDistance(24)
        .onEnd((_event: unknown, success: boolean) => {
          if (success) {
            runOnJS(openIssueReport)();
          }
        }),
    [openIssueReport]
  );

  return (
    <GestureDetector gesture={gesture}>
      <View className="flex-1">{children}</View>
    </GestureDetector>
  );
}
