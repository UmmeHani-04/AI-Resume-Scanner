import { createAvatar } from '@dicebear/core'
import { avataaars } from '@dicebear/collection'

// Pastel tiles echo the "character picker" look of the reference design.
const TILES = ['ffd5dc', 'c0aede', 'd1d4f9', 'b6e3f4', 'ffdfbf', 'c1f0d5', 'f9d6ff', 'fff1a8']
const cache = new Map<string, string>()

/**
 * Deterministic avatar for any seed (user id, candidate id, name…).
 * The same seed always yields the same character, so a candidate looks the
 * same on their own dashboard and in every recruiter list — no backend change needed.
 * Generated locally (no network request), then cached as a data URI.
 */
export function avatarUri(seed: string): string {
  const key = seed || 'guest'
  const hit = cache.get(key)
  if (hit) return hit
  const uri = createAvatar(avataaars, {
    seed: key,
    backgroundType: ['gradientLinear'],
    backgroundColor: TILES,
    backgroundRotation: [20, 160],
    // Keep expressions friendly and professional
    mouth: ['smile', 'smile', 'twinkle', 'default'],
    eyes: ['default', 'happy', 'wink', 'default'],
    eyebrows: ['defaultNatural', 'raisedExcitedNatural', 'upDownNatural', 'default', 'raisedExcited'],
    accessories: ['prescription01', 'prescription02', 'round', 'wayfarers', 'sunglasses', 'kurt'],
    accessoriesProbability: 30,
    facialHairProbability: 25,
  }).toDataUri()
  cache.set(key, uri)
  return uri
}
