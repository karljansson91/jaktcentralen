import { IssueCard } from '@/components/issues/issue-card';
import { IssueChip } from '@/components/issues/issue-chip';
import { Button, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import {
  ISSUE_STATUS_OPTIONS,
  ISSUE_TYPE_OPTIONS,
  type IssueStatus,
  type IssueType,
} from '@/lib/issues';
import { clearPendingIssueReportDraft } from '@/lib/issue-report-draft';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { Href, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScopeFilter = 'all' | 'mine';
type StatusFilter = 'all' | IssueStatus;
type TypeFilter = 'all' | IssueType;

export default function IssuesScreen() {
  const insets = useSafeAreaInsets();
  const { push } = useRouter();
  const currentUser = useQuery(api.users.getCurrentUserProfile);
  const issues = useQuery(api.issues.list, { limit: 100 });
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const filteredIssues = useMemo(() => {
    if (!issues) {
      return [];
    }

    return issues.filter((issue) => {
      if (scopeFilter === 'mine' && issue.reporterUserId !== currentUser?._id) {
        return false;
      }
      if (statusFilter !== 'all' && issue.status !== statusFilter) {
        return false;
      }
      if (typeFilter !== 'all' && issue.type !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [currentUser?._id, issues, scopeFilter, statusFilter, typeFilter]);

  function openIssue(issueId: Id<'issues'>) {
    push(`/issues/${issueId}` as Href);
  }

  function openNewIssueReport() {
    clearPendingIssueReportDraft();
    push('/issue-report' as Href);
  }

  if (issues === undefined || currentUser === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color={APP_COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentInset={{ bottom: Math.max(insets.bottom, 16) + 24 }}
      contentContainerClassName="gap-5 px-4 pt-4"
      scrollIndicatorInsets={{ bottom: Math.max(insets.bottom, 16) + 24 }}
      showsVerticalScrollIndicator={false}>
      <View className="gap-3">
        <Button
          className="h-12 rounded-xl"
          onPress={openNewIssueReport}
          accessibilityLabel="Skapa feedback">
          <Ionicons name="add" size={19} color={APP_COLORS.surface} />
          <Text>Ny feedback</Text>
        </Button>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2 pr-4">
            <IssueChip label="Alla" selected={scopeFilter === 'all'} value="all" onPress={setScopeFilter} />
            <IssueChip label="Mina" selected={scopeFilter === 'mine'} value="mine" onPress={setScopeFilter} />
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2 pr-4">
            <IssueChip
              label="Alla statusar"
              selected={statusFilter === 'all'}
              value="all"
              onPress={setStatusFilter}
            />
            {ISSUE_STATUS_OPTIONS.map((option) => (
              <IssueChip
                key={option.value}
                label={option.label}
                selected={statusFilter === option.value}
                value={option.value}
                onPress={setStatusFilter}
              />
            ))}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2 pr-4">
            <IssueChip
              label="Alla typer"
              selected={typeFilter === 'all'}
              value="all"
              onPress={setTypeFilter}
            />
            {ISSUE_TYPE_OPTIONS.map((option) => (
              <IssueChip
                key={option.value}
                label={option.label}
                selected={typeFilter === option.value}
                value={option.value}
                onPress={setTypeFilter}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {filteredIssues.length > 0 ? (
        <View className="gap-3">
          {filteredIssues.map((issue) => (
            <IssueCard
              key={issue._id}
              createdAt={issue.createdAt}
              description={issue.description}
              issueId={issue._id}
              isMine={issue.reporterUserId === currentUser?._id}
              onPress={openIssue}
              reporterName={issue.reporterName}
              status={issue.status}
              title={issue.title}
              type={issue.type}
            />
          ))}
        </View>
      ) : (
        <View className="items-center justify-center rounded-2xl border border-border bg-card p-6">
          <Text className="text-center text-muted-foreground">Ingen feedback.</Text>
        </View>
      )}
    </ScrollView>
  );
}
