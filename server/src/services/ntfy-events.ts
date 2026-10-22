import type { CompletionRecord } from './repositories/completions-repo.js';
import type { PurchaseRecord } from './repositories/purchases-repo.js';
import type { NtfyEventType } from './ntfy-settings.js';

export interface NtfyEvent { type: NtfyEventType; title: string; message: string; choreId?: string }
interface NamedRecord { id: string; name?: string | null; title?: string | null }
interface NotificationChore extends NamedRecord { active?: boolean; categoryIds?: string[] | null }
interface NotificationCategory { id: string; showInUpNext?: boolean; showInCalendar?: boolean }
export interface NotificationNames { children: NamedRecord[]; chores: NotificationChore[]; rewards: NamedRecord[]; categories?: NotificationCategory[] }

export function isChoreNotificationVisible(chore: NotificationChore, categories: NotificationCategory[] = []): boolean {
  if (chore.active === false) return false;
  const hiddenCategories = new Set(categories.filter(category => category.showInUpNext === false || category.showInCalendar === false).map(category => category.id));
  return !(chore.categoryIds ?? []).some(id => hiddenCategories.has(id));
}

// Compare persisted records, so replaying a write or polling cannot duplicate alerts.
export function getNtfyEvents(
  key: 'completions' | 'purchases', before: CompletionRecord[] | PurchaseRecord[],
  after: CompletionRecord[] | PurchaseRecord[], names: NotificationNames,
): NtfyEvent[] {
  const events: NtfyEvent[] = [];
  const children = new Map(names.children.map(record => [record.id, record.name || record.title]));
  const subjects = new Map((key === 'completions' ? names.chores.filter(chore => isChoreNotificationVisible(chore, names.categories)) : names.rewards).map(record => [record.id, record.name || record.title]));
  const oldById = new Map(before.map(record => [record.id, record]));
  const newById = new Map(after.map(record => [record.id, record]));
  const isUndone = (record: CompletionRecord) => Boolean(record.undoneAt) || record.status === 'undone';
  for (const record of after) {
    const child = children.get(record.childId || '');
    const previous = oldById.get(record.id);
    if (key === 'completions') {
      const completion = record as CompletionRecord;
      const old = previous as CompletionRecord | undefined;
      const chore = subjects.get(completion.choreId || '');
      if (!child || !chore) continue;
      const label = `${chore}${completion.timeOfDay ? ` (${completion.timeOfDay.toUpperCase()})` : ''}`;
      if ((!old || isUndone(old)) && !isUndone(completion)) {
        events.push({ choreId: completion.choreId ?? undefined, type: 'choreCompleted', title: 'Chore completed', message: `${completion.overridden ? `A parent marked ${label} as complete for ${child}.` : `${child} marked ${label} as complete.`}${completion.approvalStatus === 'pending' ? ' Parent approval is required.' : ''}` });
      } else if (old && !isUndone(old) && isUndone(completion)) {
        events.push({ choreId: completion.choreId ?? undefined, type: 'choreUncompleted', title: 'Chore completion undone', message: `${child}'s completion of ${label} was undone.` });
      } else if (old && !isUndone(completion) && old.approvalStatus !== completion.approvalStatus) {
        if (completion.approvalStatus === 'approved') events.push({ choreId: completion.choreId ?? undefined, type: 'choreApproved', title: 'Chore approved', message: `${child}'s completion of ${label} was approved.` });
        if (completion.approvalStatus === 'rejected') events.push({ choreId: completion.choreId ?? undefined, type: 'choreRejected', title: 'Chore rejected', message: `${child}'s completion of ${label} was rejected.${completion.rejectedReason ? ` Reason: ${completion.rejectedReason}` : ''}` });
      }
    } else {
      const purchase = record as PurchaseRecord;
      const old = previous as PurchaseRecord | undefined;
      const reward = subjects.get(purchase.rewardId || '');
      if (!child || !reward) continue;
      if (!old) events.push({ type: 'rewardRequested', title: 'Reward requested', message: `${child} requested ${reward} from the shop for ${purchase.cost ?? purchase.pointsSpent ?? 0} points.` });
      else if (!old.fulfilled && purchase.fulfilled) events.push({ type: 'rewardFulfilled', title: 'Reward fulfilled', message: `${child}'s reward ${reward} was marked as fulfilled.` });
    }
  }
  for (const record of before) {
    if (newById.has(record.id)) continue;
    const child = children.get(record.childId || '');
    if (key === 'completions') {
      const completion = record as CompletionRecord;
      const chore = subjects.get(completion.choreId || '');
      if (child && chore && !isUndone(completion)) events.push({ choreId: completion.choreId ?? undefined, type: 'choreUncompleted', title: 'Chore completion undone', message: `${child}'s completion of ${chore}${completion.timeOfDay ? ` (${completion.timeOfDay.toUpperCase()})` : ''} was undone.` });
    } else {
      const purchase = record as PurchaseRecord;
      const reward = subjects.get(purchase.rewardId || '');
      if (child && reward && !purchase.fulfilled) events.push({ type: 'rewardCancelled', title: 'Reward request cancelled', message: `${child}'s request for ${reward} was cancelled.` });
    }
  }
  return events;
}
