/**
 * Unit tests for src/storage/index.ts
 *
 * Since chrome.storage is a Chrome extension API not available in Node,
 * we mock it fully. This validates the wrapper logic — error handling,
 * context guards, fallbacks — without needing a real browser.
 */

import { getUserProfile, setUserProfile, onProfileChange } from './index'
import { DEFAULT_USER_PROFILE } from '@/constants'

// ─── Chrome API Mock ──────────────────────────────────────────────────────────

type StorageChangeListener = (
  changes: Record<string, chrome.storage.StorageChange>,
) => void

function makeChromeStorageMock(initialData: Record<string, unknown> = {}) {
  const store: Record<string, unknown> = { ...initialData }
  const listeners: StorageChangeListener[] = []

  return {
    storage: {
      local: {
        get: vi.fn((keys: string[], callback: (result: Record<string, unknown>) => void) => {
          const result: Record<string, unknown> = {}
          for (const key of keys) {
            if (key in store) result[key] = store[key]
          }
          callback(result)
        }),
        set: vi.fn((data: Record<string, unknown>, callback: () => void) => {
          for (const [key, value] of Object.entries(data)) {
            const oldValue = store[key]
            store[key] = value
            // Trigger onChanged listeners
            const changes: Record<string, chrome.storage.StorageChange> = {
              [key]: { oldValue, newValue: value },
            }
            for (const listener of listeners) listener(changes)
          }
          callback()
        }),
        remove: vi.fn((_keys: string[], callback: () => void) => {
          callback()
        }),
        onChanged: {
          addListener: vi.fn((listener: StorageChangeListener) => {
            listeners.push(listener)
          }),
          removeListener: vi.fn((listener: StorageChangeListener) => {
            const index = listeners.indexOf(listener)
            if (index !== -1) listeners.splice(index, 1)
          }),
        },
      },
    },
    runtime: {
      id: 'test-extension-id',
      lastError: undefined as chrome.runtime.LastError | undefined,
    },
  }
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

let chromeMock: ReturnType<typeof makeChromeStorageMock>

beforeEach(() => {
  chromeMock = makeChromeStorageMock()
  vi.stubGlobal('chrome', chromeMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

// ─── getUserProfile ───────────────────────────────────────────────────────────

describe('getUserProfile()', () => {
  it('returns DEFAULT_USER_PROFILE when storage is empty', async () => {
    const profile = await getUserProfile()
    expect(profile).toEqual(DEFAULT_USER_PROFILE)
  })

  it('returns stored profile when one exists', async () => {
    const stored = { ...DEFAULT_USER_PROFILE, salaryTier: 'senior', onboardingComplete: true }
    chromeMock.storage.local.get.mockImplementationOnce(
      (_keys: string[], cb: (r: Record<string, unknown>) => void) => {
        cb({ userProfile: stored })
      },
    )
    const profile = await getUserProfile()
    expect(profile.salaryTier).toBe('senior')
    expect(profile.onboardingComplete).toBe(true)
  })

  it('returns default when chrome context is invalid', async () => {
    vi.stubGlobal('chrome', { runtime: { id: undefined } })
    const profile = await getUserProfile()
    expect(profile).toEqual(DEFAULT_USER_PROFILE)
  })
})

// ─── setUserProfile ───────────────────────────────────────────────────────────

describe('setUserProfile()', () => {
  it('calls chrome.storage.local.set with the correct key', async () => {
    const profile = { ...DEFAULT_USER_PROFILE, salaryTier: 'mid' as const }
    await setUserProfile(profile)
    expect(chromeMock.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ userProfile: profile }),
      expect.any(Function),
    )
  })

  it('resolves without throwing', async () => {
    await expect(setUserProfile(DEFAULT_USER_PROFILE)).resolves.toBeUndefined()
  })

  it('silently no-ops when chrome context is invalid', async () => {
    vi.stubGlobal('chrome', { runtime: { id: undefined } })
    await expect(setUserProfile(DEFAULT_USER_PROFILE)).resolves.toBeUndefined()
  })
})

// ─── onProfileChange ─────────────────────────────────────────────────────────

describe('onProfileChange()', () => {
  it('registers a listener on chrome.storage.local.onChanged', () => {
    const cb = vi.fn()
    onProfileChange(cb)
    expect(chromeMock.storage.local.onChanged.addListener).toHaveBeenCalledOnce()
  })

  it('returns an unsubscribe function that removes the listener', () => {
    const cb = vi.fn()
    const unsub = onProfileChange(cb)
    unsub()
    expect(chromeMock.storage.local.onChanged.removeListener).toHaveBeenCalledOnce()
  })

  it('invokes callback when userProfile changes in storage', async () => {
    const cb = vi.fn()
    onProfileChange(cb)

    const newProfile = { ...DEFAULT_USER_PROFILE, salaryTier: 'senior' as const }
    await setUserProfile(newProfile)

    expect(cb).toHaveBeenCalledWith(newProfile)
  })

  it('does NOT invoke callback for unrelated storage key changes', async () => {
    const cb = vi.fn()
    onProfileChange(cb)

    // Trigger a storage change for a different key
    const listeners: StorageChangeListener[] = []
    chromeMock.storage.local.onChanged.addListener.mockImplementationOnce(
      (l: StorageChangeListener) => listeners.push(l),
    )
    // Simulate a change for a key that isn't userProfile
    const changes = { someOtherKey: { newValue: 'foo' } }
    for (const l of listeners) l(changes)

    expect(cb).not.toHaveBeenCalled()
  })

  it('returns a no-op unsubscribe when context is invalid', () => {
    vi.stubGlobal('chrome', { runtime: { id: undefined } })
    const cb = vi.fn()
    const unsub = onProfileChange(cb)
    expect(typeof unsub).toBe('function')
    // Should not throw
    expect(() => unsub()).not.toThrow()
  })
})
