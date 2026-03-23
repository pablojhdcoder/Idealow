// Lazy import dicebear only when needed to keep bundle size small
let dicebearCore: typeof import('@dicebear/core') | null = null
let dicebearCollection: typeof import('@dicebear/collection') | null = null

async function ensureDicebear() {
  if (!dicebearCore) {
    const core = await import(/* webpackChunkName: "dicebear-core" */ '@dicebear/core')
    dicebearCore = core
  }
  if (!dicebearCollection) {
    const coll = await import(/* webpackChunkName: "dicebear-collection" */ '@dicebear/collection')
    dicebearCollection = coll
  }
}

function computeDeterministicHashBase36(inputText: string) {
  let hashNumber = 0
  for (let index = 0; index < inputText.length; index++) {
    const charCode = inputText.charCodeAt(index)
    hashNumber = (hashNumber << 5) - hashNumber + charCode
    hashNumber |= 0
  }
  const positiveHash = Math.abs(hashNumber)
  return positiveHash.toString(36)
}

export const generateUserAvatar = async (seed: string) => {
  const cleanSeed = seed || Math.random().toString(36).substr(2, 9)
  await ensureDicebear()

  const avatar = dicebearCore!.createAvatar(dicebearCollection!.botttsNeutral, {
    seed: cleanSeed,
    radius: 50,
    backgroundColor: [
      '00897b', '00acc1', '039be5', '1e88e5', '3949ab', '43a047', '546e7a',
      '5e35b1', '6d4c41', '757575', '7cb342', '8e24aa', 'c0ca33', 'd81b60',
      'e53935', 'f4511e', 'fb8c00', 'fdd835', 'ffb300', 'ffdfbf', 'ffd5dc',
      'c0aede', 'b6e3f4', 'd1d4f9',
    ],
    backgroundType: ['gradientLinear'],
    randomizeIds: true,
  })

  return avatar.toString()
}

const svgCache = new Map<string, string>()
const pendingGenerations = new Map<string, Promise<string>>()

export const generateAvatarDataUrl = async (seed: string) => {
  if (svgCache.has(seed)) return svgCache.get(seed)!
  if (pendingGenerations.has(seed)) return pendingGenerations.get(seed)!

  const generationPromise = (async () => {
    try {
      const svg = await generateUserAvatar(seed)
      const encodedSvg = encodeURIComponent(svg)
      const dataUrl = `data:image/svg+xml,${encodedSvg}`
      svgCache.set(seed, dataUrl)
      return dataUrl
    } finally {
      pendingGenerations.delete(seed)
    }
  })()

  pendingGenerations.set(seed, generationPromise)
  return generationPromise
}

export const createUserSeed = (userId: string | number, email?: string, fullName?: string) => {
  const userIdStr = userId ? String(userId) : ''
  const combinedString = `${userIdStr}${email || ''}${fullName || ''}`

  if (combinedString.length > 0) {
    const cleanString = combinedString.toLowerCase().replace(/[^a-z0-9]/g, '').substr(0, 20)
    if (cleanString.length < 8) {
      const hash = computeDeterministicHashBase36(combinedString)
      return (cleanString + hash).substr(0, 15)
    }
    return cleanString
  }

  return Math.random().toString(36).substr(2, 12)
}

type AvatarUser = {
  id: string | number
  email?: string
  fullName?: string
}

export const getCachedAvatarUrl = (user: AvatarUser | null) => {
  if (!user) return null
  const seed = createUserSeed(user.id, user.email, user.fullName)
  return svgCache.get(seed) || null
}

export const getUserAvatarUrl = async (user: AvatarUser | null) => {
  if (!user) return null
  const seed = createUserSeed(user.id, user.email, user.fullName)
  return generateAvatarDataUrl(seed)
}
