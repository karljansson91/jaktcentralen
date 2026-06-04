import { Button, Text } from '@/components/ui';
import type { ReactNode } from 'react';
import { View } from 'react-native';

type PolygonDrawingControlsProps = {
  bottomInset: number;
  canContinue?: boolean;
  canUndo?: boolean;
  children?: ReactNode;
  continueLabel?: string;
  errorText?: string | null;
  isSubmitting?: boolean;
  onCancel: () => void;
  onContinue: () => void;
  onUndo: () => void;
  pointCount: number;
  statusText?: string;
  title: string;
};

export function PolygonDrawingControls({
  bottomInset,
  canContinue,
  canUndo,
  children,
  continueLabel = 'Fortsätt',
  errorText,
  isSubmitting = false,
  onCancel,
  onContinue,
  onUndo,
  pointCount,
  statusText,
  title,
}: PolygonDrawingControlsProps) {
  const isReady = canContinue ?? pointCount >= 3;
  const undoEnabled = canUndo ?? pointCount > 0;

  return (
    <View
      className="absolute left-4 right-4 gap-3 rounded-3xl border border-border bg-card p-4"
      style={{
        bottom: bottomInset,
        boxShadow: '0 18px 36px rgba(49, 52, 68, 0.18)',
      }}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-base font-semibold">{title}</Text>
          <Text
            className={errorText ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
            {errorText ?? statusText ?? (isReady ? `${pointCount} punkter` : 'Markera minst tre punkter.')}
          </Text>
        </View>
        <Button
          variant="ghost"
          size="sm"
          onPress={onUndo}
          disabled={isSubmitting || !undoEnabled}
          className="rounded-2xl">
          <Text>Ångra</Text>
        </Button>
      </View>

      {children}

      <View className="flex-row gap-3">
        <Button
          variant="outline"
          onPress={onCancel}
          disabled={isSubmitting}
          className="flex-1 rounded-2xl">
          <Text>Avbryt</Text>
        </Button>
        <Button
          onPress={onContinue}
          disabled={isSubmitting || !isReady}
          className="flex-1 rounded-2xl">
          <Text>{isSubmitting ? 'Sparar...' : continueLabel}</Text>
        </Button>
      </View>
    </View>
  );
}
