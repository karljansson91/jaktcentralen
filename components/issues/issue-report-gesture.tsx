import { setPendingIssueReportDraft } from '@/lib/issue-report-draft';
import { Href, usePathname, useRouter } from 'expo-router';
import { PropsWithChildren, useEffect, useState } from 'react';
import { NativeModules, TextInput, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const REPORT_GESTURE_DURATION_MS = 5000;
const REPORT_GESTURE_MAX_DISTANCE = 96;
const REPORT_CAPTURE_MAX_WIDTH = 480;

function isReportScreen(pathname: string) {
  return pathname.startsWith('/issue-report');
}

async function captureIssueScreenshot(width: number, height: number) {
  if (!NativeModules.RNViewShot) {
    return undefined;
  }

  try {
    const scale = Math.min(1, REPORT_CAPTURE_MAX_WIDTH / width);
    const { captureScreen } = await import('react-native-view-shot');
    return await captureScreen({
      format: 'jpg',
      height: Math.round(height * scale),
      quality: 0.62,
      result: 'tmpfile',
      width: Math.round(width * scale),
    });
  } catch {
    return undefined;
  }
}

async function prepareIssueReportDraft(pathname: string, width: number, height: number) {
  const screenshotUri = await captureIssueScreenshot(width, height);
  setPendingIssueReportDraft({
    capturedAt: Date.now(),
    screenPath: pathname,
    screenshotUri,
  });
}

type IssueReportGestureProps = PropsWithChildren<{
  enabled?: boolean;
}>;

export function IssueReportGesture({ children, enabled = true }: IssueReportGestureProps) {
  const pathname = usePathname();
  const { push } = useRouter();
  const dimensions = useWindowDimensions();
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    if (!isOpening) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsOpening(false);
    }, 750);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isOpening]);

  const openIssueReport = async () => {
    if (!enabled || isOpening || isReportScreen(pathname)) {
      return;
    }

    if (TextInput.State.currentlyFocusedInput()) {
      return;
    }

    setIsOpening(true);
    try {
      await prepareIssueReportDraft(pathname, dimensions.width, dimensions.height);
      push('/issue-report' as Href);
    } catch {
      setIsOpening(false);
      return;
    }
  };

  const reportGesture = Gesture.LongPress()
    .enabled(enabled && !isReportScreen(pathname))
    .minDuration(REPORT_GESTURE_DURATION_MS)
    .maxDistance(REPORT_GESTURE_MAX_DISTANCE)
    .numberOfPointers(2)
    .cancelsTouchesInView(false)
    .shouldCancelWhenOutside(false)
    .runOnJS(true)
    .onStart(() => {
      void openIssueReport();
    });

  return (
    <GestureDetector gesture={reportGesture}>
      <View collapsable={false} className="flex-1">
        {children}
      </View>
    </GestureDetector>
  );
}
