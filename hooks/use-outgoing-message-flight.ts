import type { Id } from '@/convex/_generated/dataModel';
import { useEffect, useRef, useState } from 'react';

const MIN_FLIGHT_DURATION_MS = 300;
const MESSAGE_HORIZONTAL_INSET = 20;
const MAX_BUBBLE_WIDTH_RATIO = 0.82;

type WindowLayout = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type Measurable = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void
  ) => void;
};

type MessageIdentity = {
  _id: Id<'messages'>;
};

type BeginFlightOptions = {
  body: string;
  composer: Measurable | null;
  composerSurface: Measurable | null;
  previousLatestMessageId?: Id<'messages'>;
  sentAt: number;
  time: string;
};

type OutgoingMessageFlightState = {
  body: string;
  id: number;
  left: number;
  maxBubbleWidth: number;
  messageId?: Id<'messages'>;
  previousLatestMessageId?: Id<'messages'>;
  time: string;
  top: number;
  travelWidth: number;
};

function measureInWindow(view: Measurable | null): Promise<WindowLayout | null> {
  if (!view) return Promise.resolve(null);

  return new Promise((resolve) => {
    view.measureInWindow((x, y, width, height) => {
      resolve(width > 0 && height > 0 ? { height, width, x, y } : null);
    });
  });
}

export function useOutgoingMessageFlight(messages: readonly MessageIdentity[]) {
  const nextFlightIdRef = useRef(0);
  const flightStartedAtRef = useRef(0);
  const removalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flight, setFlight] = useState<OutgoingMessageFlightState | null>(null);
  const confirmedMessageIsReady = Boolean(
    flight?.messageId && messages.some((message) => message._id === flight.messageId)
  );

  useEffect(() => {
    if (!confirmedMessageIsReady || !flightStartedAtRef.current) return;

    const elapsed = Date.now() - flightStartedAtRef.current;
    const delay = Math.max(0, MIN_FLIGHT_DURATION_MS - elapsed);
    removalTimeoutRef.current = setTimeout(() => {
      flightStartedAtRef.current = 0;
      removalTimeoutRef.current = null;
      setFlight(null);
    }, delay);

    return () => {
      if (removalTimeoutRef.current) {
        clearTimeout(removalTimeoutRef.current);
        removalTimeoutRef.current = null;
      }
    };
  }, [confirmedMessageIsReady, flight?.id]);

  const cancelFlight = () => {
    if (removalTimeoutRef.current) {
      clearTimeout(removalTimeoutRef.current);
      removalTimeoutRef.current = null;
    }
    flightStartedAtRef.current = 0;
    setFlight(null);
  };

  const beginFlight = async ({
    body,
    composer,
    composerSurface,
    previousLatestMessageId,
    sentAt,
    time,
  }: BeginFlightOptions) => {
    const [surfaceLayout, composerLayout] = await Promise.all([
      measureInWindow(composerSurface),
      measureInWindow(composer),
    ]);
    if (!surfaceLayout || !composerLayout) return null;

    nextFlightIdRef.current += 1;
    const id = nextFlightIdRef.current;
    const left = composerLayout.x - surfaceLayout.x;
    const messageRight = surfaceLayout.width - MESSAGE_HORIZONTAL_INSET;

    flightStartedAtRef.current = sentAt;
    setFlight({
      body,
      id,
      left,
      maxBubbleWidth:
        (surfaceLayout.width - MESSAGE_HORIZONTAL_INSET * 2) * MAX_BUBBLE_WIDTH_RATIO,
      previousLatestMessageId,
      time,
      top: composerLayout.y - surfaceLayout.y,
      travelWidth: messageRight - left,
    });
    return id;
  };

  const confirmFlight = (flightId: number, messageId: Id<'messages'>) => {
    setFlight((current) =>
      current?.id === flightId ? { ...current, messageId } : current
    );
  };

  return {
    beginFlight,
    cancelFlight,
    confirmFlight,
    flight,
  };
}
