/**
 * lib/realtime/deduplicate.ts
 * Set-based deduplication utilities for realtime event streams.
 *
 * Strategy:
 *   - O(1) average lookup using a Set of known IDs.
 *   - Last-write wins for updates using updated_at comparison.
 *   - Chronological ordering maintained by insertion order (no repeated sorts).
 *
 * None of these functions perform network calls or side effects.
 */

/** Any record that has a string id field. */
export interface HasId {
  id: string;
}

/** Record that has both id and updated_at. */
export interface HasIdAndUpdatedAt extends HasId {
  updated_at: string;
}

/**
 * Build a Set of IDs from an existing array.
 * O(n) construction; O(1) subsequent lookups.
 */
export function createIdSet<T extends HasId>(items: T[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

/**
 * Returns true when the incoming item is NOT already in the known-ID set.
 * Does not mutate the set; caller is responsible for adding after appending.
 */
export function isNewItem<T extends HasId>(
  knownIds: Set<string>,
  incoming: T
): boolean {
  return !knownIds.has(incoming.id);
}

/**
 * Append an incoming item to the list only if its ID is not already present.
 * Mutates knownIds by adding the new ID when the item is novel.
 *
 * @returns The new array (or the same reference if the item was a duplicate).
 */
export function appendIfNew<T extends HasId>(
  existing: T[],
  knownIds: Set<string>,
  incoming: T
): T[] {
  if (knownIds.has(incoming.id)) {
    return existing; // duplicate — discard
  }
  knownIds.add(incoming.id);
  return [...existing, incoming];
}

/**
 * Replace an existing item with an updated version using last-write-wins
 * semantics based on updated_at timestamps.
 *
 * - If the item does not exist in the list, it is appended.
 * - If the existing item has a newer or equal updated_at, the update is ignored.
 *
 * @returns The new array (or the same reference when nothing changed).
 */
export function mergeByUpdatedAt<T extends HasIdAndUpdatedAt>(
  existing: T[],
  update: T
): T[] {
  const index = existing.findIndex((item) => item.id === update.id);

  if (index === -1) {
    // Not found — append
    return [...existing, update];
  }

  const current = existing[index];
  if (
    new Date(update.updated_at).getTime() <=
    new Date(current.updated_at).getTime()
  ) {
    // Stale update — discard
    return existing;
  }

  // Replace in-place
  const next = [...existing];
  next[index] = update;
  return next;
}

/**
 * Merge a batch of incoming items into the existing list.
 * Deduplicates by ID; newer updated_at wins for conflicts.
 *
 * @returns A new array with novel and updated items included.
 */
export function mergeItemsBatch<T extends HasIdAndUpdatedAt>(
  existing: T[],
  incoming: T[]
): T[] {
  let result = existing;
  for (const item of incoming) {
    result = mergeByUpdatedAt(result, item);
  }
  return result;
}

/**
 * Safely decrement an unread count without going below 0.
 */
export function decrementSafe(count: number, by = 1): number {
  return Math.max(0, count - by);
}

/**
 * Update unread count when a notification changes read state.
 *
 * @param currentCount The current unread count.
 * @param wasRead      Whether the notification was already read before the event.
 * @param isNowRead    Whether the notification is now read after the event.
 */
export function updateUnreadCount(
  currentCount: number,
  wasRead: boolean,
  isNowRead: boolean
): number {
  if (!wasRead && isNowRead) {
    // Transition: unread → read; decrement
    return decrementSafe(currentCount);
  }
  if (wasRead && !isNowRead) {
    // Transition: read → unread; increment
    return currentCount + 1;
  }
  return currentCount;
}
