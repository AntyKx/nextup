import { useCallback } from 'react';

import { showSnackbar } from '@/components/snackbar';
import { useLifeItems } from '@/features/life-items/life-items-context';

/** Wires LifeItemCard's `onComplete` to the completion+undo Snackbar flow. */
export function useCompleteWithUndo() {
  const { completeItem, undoCompleteItem, items } = useLifeItems();

  return useCallback(
    (id: string) => {
      const item = items.find((candidate) => candidate.id === id);
      completeItem(id).then((result) => {
        if (!result) return;
        const title = item?.title ?? '這個項目';
        showSnackbar({
          message: result.notificationWarning ? `已完成 ${title}・${result.notificationWarning}` : `已完成 ${title}`,
          actionLabel: '復原',
          onAction: () => undoCompleteItem(result.historyId),
        });
      });
    },
    [completeItem, undoCompleteItem, items],
  );
}
