export type OfflineAiAvailability =
  | 'checking'
  | 'available'
  | 'unavailable'
  | 'error';

export function isOfflineAiAvailable(
  availability: OfflineAiAvailability
) {
  return availability === 'available';
}
