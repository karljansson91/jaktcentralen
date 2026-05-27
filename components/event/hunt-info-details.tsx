import { AllowedGameDetails } from '@/components/event/allowed-game-details';
import { AllowedGameEditor } from '@/components/event/allowed-game-editor';
import { EventDatePickerField } from '@/components/event/event-date-picker-field';
import { Badge, Input, Text } from '@/components/ui';
import type { Doc } from '@/convex/_generated/dataModel';
import type { AllowedGameRule } from '@/lib/allowed-game';
import { formatEventInfoDate, normalizeEventDate } from '@/lib/event-dates';
import type { HuntInfoDraft } from '@/lib/hunt-info-draft';
import { createJoinCodeSuggestions, formatJoinCodeInput } from '@/lib/join-code';
import { View, Pressable } from 'react-native';

type HuntInfoAdminFieldsProps = {
  acceptedCount: number;
  areaName: string;
  draft: HuntInfoDraft;
  disabled?: boolean;
  onChange: (draft: HuntInfoDraft) => void;
  statusLabel: string;
};

type HuntInfoReadOnlyDetailsProps = {
  acceptedCount: number;
  areaName: string;
  event: Doc<'events'>;
  statusLabel: string;
};

function updateDraft(
  draft: HuntInfoDraft,
  onChange: (draft: HuntInfoDraft) => void,
  patch: Partial<HuntInfoDraft>
) {
  onChange({ ...draft, ...patch });
}

function InfoMeta({ acceptedCount, areaName, statusLabel }: {
  acceptedCount: number;
  areaName: string;
  statusLabel: string;
}) {
  return (
    <View className="gap-2 px-1">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="min-w-0 flex-1 text-sm text-muted-foreground" numberOfLines={1}>
          {areaName}
        </Text>
        <Badge className="rounded-full bg-primary/10">
          <Text className="text-xs font-semibold text-primary">{statusLabel}</Text>
        </Badge>
      </View>
      <Text className="text-sm text-muted-foreground">
        {acceptedCount} deltagare
      </Text>
    </View>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-semibold text-muted-foreground">{label}</Text>
      <Text className="text-base text-foreground">{value}</Text>
    </View>
  );
}

export function HuntInfoAdminFields({
  acceptedCount,
  areaName,
  draft,
  disabled,
  onChange,
  statusLabel,
}: HuntInfoAdminFieldsProps) {
  const joinCodeSuggestions = createJoinCodeSuggestions(areaName, draft.startDate);

  return (
    <View className="gap-5">
      <InfoMeta acceptedCount={acceptedCount} areaName={areaName} statusLabel={statusLabel} />

      <View className="gap-4">
        <View>
          <Text className="mb-1 font-medium">Titel *</Text>
          <Input
            editable={!disabled}
            value={draft.title}
            onChangeText={(title) => updateDraft(draft, onChange, { title })}
            placeholder="Jaktens titel"
          />
        </View>

        <View>
          <Text className="mb-1 font-medium">Beskrivning</Text>
          <Input
            editable={!disabled}
            value={draft.description}
            onChangeText={(description) => updateDraft(draft, onChange, { description })}
            placeholder="Valfri beskrivning"
            multiline
            numberOfLines={3}
            className="h-20"
            textAlignVertical="top"
          />
        </View>

        <EventDatePickerField
          label="Startdatum"
          required
          value={draft.startDate}
          onValueChange={(startDate) =>
            updateDraft(draft, onChange, { startDate: normalizeEventDate(startDate) })
          }
        />

        <EventDatePickerField
          label="Slutdatum"
          required
          value={draft.endDate}
          onValueChange={(endDate) =>
            updateDraft(draft, onChange, { endDate: normalizeEventDate(endDate) })
          }
        />

        <View>
          <Text className="mb-1 font-medium">Anslutningskod</Text>
          <Input
            editable={!disabled}
            value={draft.joinCode}
            onChangeText={(joinCode) =>
              updateDraft(draft, onChange, { joinCode: formatJoinCodeInput(joinCode) })
            }
            placeholder="Valfri kod för att gå med"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View className="mt-3 flex-row flex-wrap gap-2">
            {joinCodeSuggestions.map((suggestion) => {
              const isSelected = draft.joinCode.trim() === suggestion;

              return (
                <Pressable
                  key={suggestion}
                  disabled={disabled}
                  onPress={() => updateDraft(draft, onChange, { joinCode: suggestion })}
                  className={`rounded-full border px-3 py-2 ${
                    isSelected ? 'border-primary bg-primary' : 'border-border bg-card'
                  } ${disabled ? 'opacity-60' : ''}`}>
                  <Text
                    className={`text-sm font-medium ${
                      isSelected ? 'text-primary-foreground' : 'text-foreground'
                    }`}>
                    {suggestion}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="gap-3">
          <Text className="font-medium">Tillåtet vilt</Text>
          <AllowedGameEditor
            disabled={disabled}
            value={draft.allowedGame}
            onChange={(allowedGame) => updateDraft(draft, onChange, { allowedGame })}
          />
        </View>
      </View>
    </View>
  );
}

export function HuntInfoReadOnlyDetails({
  acceptedCount,
  areaName,
  event,
  statusLabel,
}: HuntInfoReadOnlyDetailsProps) {
  return (
    <View className="gap-6">
      <View className="gap-3">
        <View className="flex-row items-start gap-3">
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-2xl font-semibold text-foreground" numberOfLines={2}>
              {event.title}
            </Text>
            <Text className="text-sm leading-5 text-muted-foreground">
              {areaName}
            </Text>
          </View>
          <Badge className="rounded-full bg-primary/10">
            <Text className="text-xs font-semibold text-primary">{statusLabel}</Text>
          </Badge>
        </View>

        {event.description ? (
          <Text className="text-sm leading-5 text-muted-foreground">
            {event.description}
          </Text>
        ) : null}
      </View>

      <View className="gap-4 border-y border-border py-4">
        <ReadOnlyRow label="Startdatum" value={formatEventInfoDate(event.startDate)} />
        <ReadOnlyRow label="Slutdatum" value={formatEventInfoDate(event.endDate)} />
        <ReadOnlyRow label="Deltagare" value={acceptedCount.toString()} />
      </View>

      <View className="gap-3">
        <Text className="text-lg font-semibold text-foreground">Tillåtet vilt</Text>
        <AllowedGameDetails rules={event.allowedGame as AllowedGameRule[] | undefined} />
      </View>
    </View>
  );
}
