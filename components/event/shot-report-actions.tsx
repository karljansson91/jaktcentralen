import {
  DirectionChoices,
  ResolutionChoices,
  ResultChoices,
  SelectionTile,
  SpeciesChoices,
} from '@/components/event/shot-report-form-controls';
import { Button, Input, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { AllowedGameRule } from '@/lib/allowed-game';
import { withLoadingState } from '@/lib/async-state';
import {
  getShotSpeciesOptions,
  type FollowUpResolution,
  type ShotReportResult,
} from '@/lib/shot-reports';
import { APP_COLORS } from '@/lib/theme';
import { useMutation } from 'convex/react';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

type AcceptedMember = {
  userId: Id<'users'>;
  user?: { name?: string | null } | null;
};

async function runReportAction(
  setLoading: Dispatch<SetStateAction<boolean>>,
  title: string,
  action: () => Promise<unknown>
) {
  await withLoadingState(setLoading, async () => {
    try {
      await action();
    } catch (error) {
      Alert.alert(title, error instanceof Error ? error.message : 'Försök igen om en stund.');
    }
  });
}

export function EditShotReportSection({
  allowedGame,
  report,
}: {
  allowedGame?: AllowedGameRule[];
  report: {
    _id: Id<'shotReports'>;
    result: ShotReportResult;
    speciesId: string;
  };
}) {
  const [draft, setDraft] = useState(() => ({
    result: report.result,
    speciesId: report.speciesId,
  }));
  const [saving, setSaving] = useState(false);
  const updateReport = useMutation(api.shotReports.updateReport);
  const changed = draft.speciesId !== report.speciesId || draft.result !== report.result;

  return (
    <View className="gap-4 rounded-3xl border border-border bg-card p-4">
      <Text className="text-lg font-semibold">Ändra grundrapport</Text>
      <View className="gap-2">
        <Text className="text-sm font-semibold text-muted-foreground">Viltart</Text>
        <SpeciesChoices
          onChange={(speciesId) => setDraft((current) => ({ ...current, speciesId }))}
          options={getShotSpeciesOptions(allowedGame)}
          value={draft.speciesId}
        />
      </View>
      <View className="gap-2">
        <Text className="text-sm font-semibold text-muted-foreground">Resultat</Text>
        <ResultChoices
          onChange={(result) => setDraft((current) => ({ ...current, result }))}
          value={draft.result}
        />
      </View>
      <Button
        disabled={!changed || saving}
        onPress={() =>
          void runReportAction(setSaving, 'Kunde inte ändra rapporten', () =>
            updateReport({
              reportId: report._id,
              result: draft.result,
              speciesId: draft.speciesId,
            })
          )
        }>
        {saving ? <ActivityIndicator color={APP_COLORS.surface} /> : <Text>Spara ändring</Text>}
      </Button>
    </View>
  );
}

export function SupplementShotReportSection({
  reportId,
}: {
  reportId: Id<'shotReports'>;
}) {
  const [direction, setDirection] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const addSupplement = useMutation(api.shotReports.addSupplement);
  const canSave = direction !== null || note.trim().length > 0;

  const handleSave = async () => {
    await runReportAction(setSaving, 'Kunde inte komplettera rapporten', async () => {
      await addSupplement({
        escapeDirectionDegrees: direction ?? undefined,
        note,
        reportId,
      });
      setDirection(null);
      setNote('');
    });
  };

  return (
    <View className="gap-4 rounded-3xl border border-border bg-card p-4">
      <View className="gap-1">
        <Text className="text-lg font-semibold">Komplettera</Text>
        <Text className="text-sm text-muted-foreground">Flyktriktning eller en kort anteckning.</Text>
      </View>
      <DirectionChoices onChange={setDirection} value={direction} />
      <Input
        className="h-20"
        multiline
        numberOfLines={3}
        onChangeText={setNote}
        placeholder="Anteckning"
        textAlignVertical="top"
        value={note}
      />
      <Button disabled={!canSave || saving} onPress={() => void handleSave()}>
        {saving ? <ActivityIndicator color={APP_COLORS.surface} /> : <Text>Lägg till</Text>}
      </Button>
    </View>
  );
}

function FollowUpPlanForm({
  followUp,
  members,
  reportId,
}: {
  followUp: {
    assignedUserId?: Id<'users'>;
    instruction?: string;
  };
  members: AcceptedMember[];
  reportId: Id<'shotReports'>;
}) {
  const [assignedUserId, setAssignedUserId] = useState<Id<'users'> | null>(
    followUp.assignedUserId ?? members[0]?.userId ?? null
  );
  const [instruction, setInstruction] = useState(followUp.instruction ?? '');
  const [saving, setSaving] = useState(false);
  const planFollowUp = useMutation(api.shotReports.planFollowUp);

  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold text-muted-foreground">Ansvarig</Text>
      <View className="gap-2">
        {members.map((member) => (
          <SelectionTile
            compact
            key={member.userId}
            label={member.user?.name?.trim() || 'Okänd deltagare'}
            onPress={() => setAssignedUserId(member.userId)}
            selected={assignedUserId === member.userId}
          />
        ))}
      </View>
      <Input
        className="h-20"
        multiline
        numberOfLines={3}
        onChangeText={setInstruction}
        placeholder="Instruktion"
        textAlignVertical="top"
        value={instruction}
      />
      <Button
        disabled={assignedUserId === null || saving}
        onPress={() => {
          if (!assignedUserId) return;
          void runReportAction(setSaving, 'Kunde inte planera eftersöket', () =>
            planFollowUp({ assignedUserId, instruction, reportId })
          );
        }}>
        {saving ? <ActivityIndicator color={APP_COLORS.surface} /> : <Text>Spara plan</Text>}
      </Button>
    </View>
  );
}

function FinishFollowUpForm({ reportId }: { reportId: Id<'shotReports'> }) {
  const [resolution, setResolution] = useState<FollowUpResolution | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const finishFollowUp = useMutation(api.shotReports.finishFollowUp);

  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold text-muted-foreground">Avsluta eftersök</Text>
      <ResolutionChoices onChange={setResolution} value={resolution} />
      <Input
        className="h-20"
        multiline
        numberOfLines={3}
        onChangeText={setNote}
        placeholder="Anteckning"
        textAlignVertical="top"
        value={note}
      />
      <Button
        disabled={resolution === null || saving}
        onPress={() => {
          if (!resolution) return;
          void runReportAction(setSaving, 'Kunde inte avsluta eftersöket', () =>
            finishFollowUp({ note, reportId, resolution })
          );
        }}>
        {saving ? <ActivityIndicator color={APP_COLORS.surface} /> : <Text>Avsluta eftersök</Text>}
      </Button>
    </View>
  );
}

export function FollowUpActions({
  canManage,
  canPlan,
  followUp,
  members,
  reportId,
}: {
  canManage: boolean;
  canPlan: boolean;
  followUp: {
    assignedUserId?: Id<'users'>;
    instruction?: string;
    status: string;
  };
  members: AcceptedMember[];
  reportId: Id<'shotReports'>;
}) {
  const [starting, setStarting] = useState(false);
  const startFollowUp = useMutation(api.shotReports.startFollowUp);
  const canStart =
    canManage && (followUp.status === 'needs_planning' || followUp.status === 'planned');

  return (
    <View className="gap-4 rounded-3xl border border-border bg-card p-4">
      <Text className="text-lg font-semibold">Eftersök</Text>
      {canPlan && (followUp.status === 'needs_planning' || followUp.status === 'planned') ? (
        <FollowUpPlanForm followUp={followUp} members={members} reportId={reportId} />
      ) : null}
      {canStart ? (
        <Button
          disabled={starting}
          onPress={() =>
            void runReportAction(setStarting, 'Kunde inte starta eftersöket', () =>
              startFollowUp({ reportId })
            )
          }>
          {starting ? (
            <ActivityIndicator color={APP_COLORS.surface} />
          ) : (
            <Text>Starta eftersök</Text>
          )}
        </Button>
      ) : null}
      {canManage && followUp.status === 'in_progress' ? (
        <FinishFollowUpForm reportId={reportId} />
      ) : null}
    </View>
  );
}
