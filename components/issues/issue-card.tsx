import { Card, CardContent, Text } from '@/components/ui';
import type { Id } from '@/convex/_generated/dataModel';
import {
  formatIssueDate,
  getIssueStatusLabel,
  getIssueTypeLabel,
  type IssueStatus,
  type IssueType,
} from '@/lib/issues';
import { APP_COLORS } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { IssueTag } from './issue-chip';

type IssueCardProps = {
  createdAt: number;
  description: string;
  issueId: Id<'issues'>;
  isMine: boolean;
  onPress: (issueId: Id<'issues'>) => void;
  reporterName: string;
  status: IssueStatus;
  title: string;
  type: IssueType;
};

export function IssueCard({
  createdAt,
  description,
  issueId,
  isMine,
  onPress,
  reporterName,
  status,
  title,
  type,
}: IssueCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => onPress(issueId)}>
      <Card className="border-border/70 bg-card py-0">
        <CardContent className="gap-3 p-4">
          <View className="flex-row items-start gap-3">
            <View className="mt-0.5 size-10 items-center justify-center rounded-2xl bg-primary/10">
              <Ionicons
                name={type === 'bug' ? 'bug-outline' : 'sparkles-outline'}
                size={20}
                color={APP_COLORS.primary}
              />
            </View>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-base font-semibold text-foreground" numberOfLines={2}>
                {title}
              </Text>
              <Text className="text-sm text-muted-foreground" numberOfLines={2}>
                {description}
              </Text>
            </View>
          </View>

          <View className="flex-row flex-wrap items-center gap-2">
            <IssueTag label={getIssueTypeLabel(type)} />
            <IssueTag label={getIssueStatusLabel(status)} />
            {isMine ? <IssueTag label="Du" /> : null}
          </View>

          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {reporterName} · {formatIssueDate(createdAt)}
          </Text>
        </CardContent>
      </Card>
    </Pressable>
  );
}
