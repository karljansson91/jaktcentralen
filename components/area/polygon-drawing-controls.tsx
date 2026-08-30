import { Button, Text } from '@/components/ui';
import type { AreaPolygonMethod } from '@/hooks/use-area-polygon-editor';
import type { PolygonEditorMode } from '@/hooks/use-polygon-editor';
import { cn } from '@/lib/utils';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

type PolygonDrawingControlsProps = {
  bottomInset: number;
  canContinue?: boolean;
  canUndo?: boolean;
  children?: ReactNode;
  continueLabel?: string;
  errorText?: string | null;
  isSubmitting?: boolean;
  onContinue: () => void;
  onUndo?: () => void;
  pointCount: number;
  statusText?: string;
};

type PolygonMethodOption<Value extends string> = {
  description: string;
  label: string;
  value: Value;
};

type PolygonMethodPickerProps<Value extends string> = {
  onValueChange: (value: Value) => void;
  options: PolygonMethodOption<Value>[];
  value: Value;
};

function PolygonMethodPicker<Value extends string>({
  onValueChange,
  options,
  value,
}: PolygonMethodPickerProps<Value>) {
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  return (
    <View className="gap-2">
      <View className="flex-row rounded-2xl bg-muted p-1">
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => {
                if (!isSelected) {
                  onValueChange(option.value);
                }
              }}
              className={cn(
                'h-10 flex-1 items-center justify-center rounded-xl px-2',
                isSelected && 'bg-primary'
              )}
            >
              <Text
                className={cn(
                  'text-center text-sm font-medium text-muted-foreground',
                  isSelected && 'text-primary-foreground'
                )}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="min-h-8 px-1 text-xs leading-4 text-muted-foreground">
        {selectedOption.description}
      </Text>
    </View>
  );
}

type PolygonModeControlsProps = {
  mode: PolygonEditorMode;
  onModeChange: (mode: PolygonEditorMode) => void;
};

const POLYGON_MODE_OPTIONS: PolygonMethodOption<PolygonEditorMode>[] = [
  {
    description: 'Rita med ett finger. Flytta och zooma med två.',
    label: 'Rita',
    value: 'freehand',
  },
  {
    description: 'Tryck på kartan för att lägga till. Dra punkter för att flytta.',
    label: 'Punkter',
    value: 'points',
  },
];

const AREA_POLYGON_METHOD_OPTIONS: PolygonMethodOption<AreaPolygonMethod>[] = [
  ...POLYGON_MODE_OPTIONS,
  {
    description: 'Tryck på en gräns på kartan för att välja den.',
    label: 'Gräns',
    value: 'boundary',
  },
];

export function PolygonModeControls({ mode, onModeChange }: PolygonModeControlsProps) {
  return (
    <PolygonMethodPicker value={mode} options={POLYGON_MODE_OPTIONS} onValueChange={onModeChange} />
  );
}

type AreaPolygonMethodControlsProps = {
  method: AreaPolygonMethod;
  onMethodChange: (method: AreaPolygonMethod) => void;
};

export function AreaPolygonMethodControls({
  method,
  onMethodChange,
}: AreaPolygonMethodControlsProps) {
  return (
    <PolygonMethodPicker
      value={method}
      options={AREA_POLYGON_METHOD_OPTIONS}
      onValueChange={onMethodChange}
    />
  );
}

export function PolygonDrawingControls({
  bottomInset,
  canContinue,
  canUndo,
  children,
  continueLabel = 'Spara',
  errorText,
  isSubmitting = false,
  onContinue,
  onUndo,
  pointCount,
  statusText,
}: PolygonDrawingControlsProps) {
  const isReady = canContinue ?? pointCount >= 3;
  const undoEnabled = canUndo ?? pointCount > 0;

  return (
    <View
      className="absolute left-4 right-4 gap-3 rounded-3xl border border-border bg-card p-4"
      style={{
        bottom: bottomInset,
        boxShadow: '0 18px 36px rgba(49, 52, 68, 0.18)',
      }}
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text
          selectable={Boolean(errorText)}
          className={cn(
            'min-w-0 flex-1 text-sm text-muted-foreground',
            errorText && 'text-destructive'
          )}
        >
          {errorText ??
            statusText ??
            (isReady ? `${pointCount} punkter` : 'Markera minst tre punkter.')}
        </Text>
        {onUndo ? (
          <Button
            accessibilityLabel="Ångra"
            variant="ghost"
            size="icon"
            onPress={onUndo}
            disabled={isSubmitting || !undoEnabled}
            className="rounded-full"
          >
            <Ionicons name="arrow-undo" size={19} color={APP_COLORS.text} />
          </Button>
        ) : null}
      </View>

      {children}

      <Button size="xl" onPress={onContinue} disabled={isSubmitting || !isReady} className="w-full">
        <Text>{isSubmitting ? 'Sparar...' : continueLabel}</Text>
      </Button>
    </View>
  );
}
