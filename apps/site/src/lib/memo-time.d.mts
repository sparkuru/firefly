export interface MemoTimeRecord { readonly id: string; readonly date: string; }
export interface MemoTimePoint extends MemoTimeRecord { readonly month: number; readonly position: number; readonly label: string; }
export interface MemoTimeIndex {
  readonly entries: readonly MemoTimePoint[];
  readonly months: readonly { readonly key: string; readonly first: string; readonly indices: readonly number[]; readonly start: number; readonly end: number; }[];
}
export function memoDateLabel(value: string | Date): string;
export function createMemoTimeIndex(records: readonly MemoTimeRecord[]): MemoTimeIndex;
export function nearestMemo(index: MemoTimeIndex, position: number): number;
