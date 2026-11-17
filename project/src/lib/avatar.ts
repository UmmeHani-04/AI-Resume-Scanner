import { createAvatar } from '@dicebear/core'
import { avataaars } from '@dicebear/collection'

// Pastel background colours matching the Aurora design system
const BG_COLORS = ['ffd5dc', 'c0aede', 'd1d4f9', 'b6e3f4', 'ffdfbf', 'c1f0d5', 'f9d6ff', 'fff1a8']
const cache = new Map<string, string>()

/**
 * Generates illustrated Avataaars character avatars with gender-appropriate styling.
 *
 *  - 'female' → feminine hairstyles, zero facial hair
 *  - 'male'   → masculine hairstyles, optional facial hair
 *  - null/''  → professional unisex look, zero facial hair
 *
 * Deterministic: same seed + gender always yields the same character.
 */
export function avatarUri(seed: string, _name?: string, gender?: string | null): string {
  const cleanSeed   = (seed || 'candidate').trim()
  const cleanGender = (gender || '').trim().toLowerCase()
  const key = `${cleanSeed}_${cleanGender || 'neutral'}`

  const hit = cache.get(key)
  if (hit) return hit

  let uri: string

  if (cleanGender === 'female') {
    uri = createAvatar(avataaars, {
      seed: cleanSeed,
      backgroundColor: BG_COLORS,
      top: ['longButNotTooLong', 'curvy', 'straight01', 'straight02',
            'straightAndStrand', 'bob', 'bun', 'curly', 'frida', 'miaWallace',
            'froBand', 'bigHair'],
      topProbability: 100,
      facialHairProbability: 0,
      mouth: ['smile', 'twinkle', 'default'],
      eyes: ['default', 'happy', 'wink'],
      eyebrows: ['default', 'defaultNatural', 'raisedExcitedNatural'],
      accessoriesProbability: 25,
      accessories: ['prescription01', 'prescription02', 'round'],
    }).toDataUri()

  } else if (cleanGender === 'male') {
    uri = createAvatar(avataaars, {
      seed: cleanSeed,
      backgroundColor: BG_COLORS,
      top: ['shortFlat', 'shortRound', 'shortWaved', 'theCaesar',
            'theCaesarAndSidePart', 'sides', 'dreads01', 'frizzle',
            'shortCurly', 'shaggy'],
      topProbability: 100,
      facialHairProbability: 20,
      facialHair: ['beardLight', 'beardMajestic', 'moustacheFancy'],
      mouth: ['smile', 'default'],
      eyes: ['default', 'happy', 'squint'],
      eyebrows: ['default', 'defaultNatural', 'upDownNatural'],
      accessoriesProbability: 20,
      accessories: ['prescription01', 'prescription02', 'round'],
    }).toDataUri()

  } else {
    // Neutral / unknown — no facial hair, unisex styles
    uri = createAvatar(avataaars, {
      seed: cleanSeed,
      backgroundColor: BG_COLORS,
      top: ['shortFlat', 'shortRound', 'shortWaved', 'curly', 'bob',
            'shaggy', 'sides', 'dreads01', 'straight01', 'frizzle'],
      topProbability: 100,
      facialHairProbability: 0,
      mouth: ['smile', 'twinkle', 'default'],
      eyes: ['default', 'happy'],
      eyebrows: ['default', 'defaultNatural'],
      accessoriesProbability: 25,
      accessories: ['prescription01', 'prescription02', 'round'],
    }).toDataUri()
  }

  cache.set(key, uri)
  return uri
}
