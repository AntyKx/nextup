import { AppSnapshot } from '@/features/life-items/life-items-types';

export function loadSnapshot(): Promise<AppSnapshot | null>;
export function saveSnapshot(snapshot: AppSnapshot): Promise<void>;
