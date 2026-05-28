import { setPendingIssueReportDraft } from '@/lib/issue-report-draft';
import { Href, usePathname, useRouter } from 'expo-router';
import { PropsWithChildren, useCallback, useEffect, useRef } from 'react';
import {
  GestureResponderEvent,
  NativeModules,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

const REPORT_GESTURE_DURATION_MS = 5000;
const REPORT_GESTURE_MAX_DISTANCE = 96;
const REPORT_CAPTURE_MAX_WIDTH = 480;

type TouchPoint = {
  id: string;
  pageX: number;
  pageY: number;
};

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
      result: 'data-uri',
      width: Math.round(width * scale),
    });
  } catch {
    return undefined;
  }
}

function readTouchPoints(event: GestureResponderEvent) {
  return Array.from(event.nativeEvent.touches)
    .slice(0, 2)
    .map((touch, index) => ({
      id: String(touch.identifier ?? index),
      pageX: touch.pageX,
      pageY: touch.pageY,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function didMoveTooFar(startTouches: TouchPoint[], currentTouches: TouchPoint[]) {
  return startTouches.some((startTouch, index) => {
    const currentTouch =
      currentTouches.find((touch) => touch.id === startTouch.id) ?? currentTouches[index];
    if (!currentTouch) return true;

    const distance = Math.hypot(
      currentTouch.pageX - startTouch.pageX,
      currentTouch.pageY - startTouch.pageY
    );
    return distance > REPORT_GESTURE_MAX_DISTANCE;
  });
}

export function IssueReportGesture({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { push } = useRouter();
  const dimensions = useWindowDimensions();
  const isOpeningRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStartTouchesRef = useRef<TouchPoint[]>([]);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdStartTouchesRef.current = [];
  }, []);

  const openIssueReport = useCallback(async () => {
    if (isOpeningRef.current || isReportScreen(pathname)) {
      return;
    }

    if (TextInput.State.currentlyFocusedInput()) {
      return;
    }

    isOpeningRef.current = true;
    try {
      const screenshotUri = await captureIssueScreenshot(dimensions.width, dimensions.height);

      setPendingIssueReportDraft({
        capturedAt: Date.now(),
        screenPath: pathname,
        screenshotUri,
      });
      push('/issue-report' as Href);
    } catch {
      isOpeningRef.current = false;
      return;
    }

    setTimeout(() => {
      isOpeningRef.current = false;
    }, 750);
  }, [dimensions.height, dimensions.width, pathname, push]);

  const startHoldTimer = useCallback(
    (event: GestureResponderEvent) => {
      if (holdTimerRef.current || isOpeningRef.current || isReportScreen(pathname)) {
        return;
      }

      const touches = readTouchPoints(event);
      if (touches.length < 2) {
        clearHoldTimer();
        return;
      }

      holdStartTouchesRef.current = touches;
      holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = null;
        holdStartTouchesRef.current = [];
        void openIssueReport();
      }, REPORT_GESTURE_DURATION_MS);
    },
    [clearHoldTimer, openIssueReport, pathname]
  );

  const handleTouchStart = useCallback(
    (event: GestureResponderEvent) => {
      if (event.nativeEvent.touches.length >= 2) {
        startHoldTimer(event);
      }
    },
    [startHoldTimer]
  );

  const handleTouchMove = useCallback(
    (event: GestureResponderEvent) => {
      if (!holdTimerRef.current) return;

      const touches = readTouchPoints(event);
      if (
        touches.length < 2 ||
        didMoveTooFar(holdStartTouchesRef.current, touches)
      ) {
        clearHoldTimer();
      }
    },
    [clearHoldTimer]
  );

  const handleTouchEnd = useCallback(
    (event: GestureResponderEvent) => {
      if (event.nativeEvent.touches.length < 2) {
        clearHoldTimer();
      }
    },
    [clearHoldTimer]
  );

  useEffect(() => clearHoldTimer, [clearHoldTimer]);

  return (
    <View
      className="flex-1"
      onTouchCancel={clearHoldTimer}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onTouchStart={handleTouchStart}>
      {children}
    </View>
  );
}
