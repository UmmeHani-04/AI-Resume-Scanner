import { createAvatar } from '@dicebear/core'
import { initials, avataaars } from '@dicebear/collection'

// Aurora pastel & brand gradient background tiles
const TILES = [
  'c0aede', 'd1d4f9', 'b6e3f4', 'ffdfbf', 'c1f0d5',
  'f9d6ff', 'fff1a8', 'ffd5dc', '6c47ff', 'b05bff', '3dbdf5'
]

const cache = new Map<string, string>()

/**
 * Deterministic avatar generation following strict ATS fairness guidelines:
 * 1. Only uses explicit gender if provided in candidate profile.
 * 2. Never infers or assumes gender from name or other assumptions.
 * 3. Uses neutral professional monogram initials avatar when gender is missing or unknown.
 * 4. Deterministic: the exact same seed always returns the identical avatar.
 */
export function avatarUri(seed: string, name?: string, gender?: string | null): string {
  const cleanSeed = (seed || name || 'candidate').trim()
  const cleanGender = (gender || '').trim().toLowerCase()
  const key = `${cleanSeed}_${cleanGender || 'neutral'}_${name || ''}`

  const hit = cache.get(key)
  if (hit) return hit

  let uri = ''

  if (cleanGender === 'male') {
    // Explicitly male
    uri = createAvatar(avataaars, {
      seed: cleanSeed,
      backgroundType: ['gradientLinear'],
      backgroundColor: TILES,
      backgroundRotation: [20, 160],
      top: ['shortFlat', 'shortRound', 'shortWaved', 'theCaesar', 'sides', 'dreads01'],
      facialHairProbability: 10,
      facialHair: ['beardLight', 'beardMajestic', 'moustacheFancy'],
      mouth: ['smile', 'default'],
      eyes: ['default', 'happy'],
      eyebrows: ['defaultNatural', 'upDownNatural'],
    }).toDataUri()
  } else if (cleanGender === 'female') {
    // Explicitly female
    uri = createAvatar(avataaars, {
      seed: cleanSeed,
      backgroundType: ['gradientLinear'],
      backgroundColor: TILES,
      backgroundRotation: [20, 160],
      top: ['longButNotTooLong', 'curvy', 'straight01', 'straight02', 'straightAndStrand', 'bob'],
      facialHairProbability: 0,
      mouth: ['smile', 'twinkle', 'default'],
      eyes: ['default', 'happy'],
      eyebrows: ['defaultNatural', 'raisedExcitedNatural'],
    }).toDataUri()
  } else {
    // Neutral professional avatar (standard for recruitment without gender bias)
    const displayName = (name || cleanSeed).trim()
    uri = createAvatar(initials, {
      seed: displayName,
      backgroundColor: TILES,
      backgroundRotation: [30, 150],
      fontSize: 42,
      fontWeight: 700,
      fontFamily: ['Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
      chars: 2,
    }).toDataUri()
  }

  cache.set(key, uri)
  return uri
}
