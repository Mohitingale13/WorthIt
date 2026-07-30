import type { StorageSchema, StorageKey } from '@/types'
import { DEFAULT_USER_PROFILE } from '@/constants'

// ─── Context Safety ───────────────────────────────────────────────────────────

/**
 * Returns true if the Chrome extension context is still valid.
 * When an extension is reloaded or updated, content scripts on existing tabs
 * lose their extension context. Any call to chrome APIs after that throws
 * "Extension context invalidated."
 *
 * Checking chrome.runtime.id is the canonical way to detect this — it becomes
 * undefined when the context is gone.
 */
function isContextValid(): boolean {
  try {
    return typeof chrome !== 'undefined' && !!chrome.runtime?.id
  } catch {
    return false
  }
}

// ─── Storage Helpers ──────────────────────────────────────────────────────────

/**
 * Reads a value from chrome.storage.local.
 * Falls back to the provided default if the key doesn't exist or context is invalid.
 */
export async function storageGet<K extends StorageKey>(
  key: K,
  fallback: StorageSchema[K],
): Promise<StorageSchema[K]> {
  if (!isContextValid()) return Promise.resolve(fallback)

  return new Promise((resolve) => {
    try {
      chrome.storage.local.get([key], (result) => {
        // Check lastError to avoid uncaught runtime errors
        if (chrome.runtime.lastError) {
          resolve(fallback)
          return
        }
        const value = result[key] as StorageSchema[K] | undefined
        resolve(value ?? fallback)
      })
    } catch {
      resolve(fallback)
    }
  })
}

/**
 * Writes a value to chrome.storage.local.
 * Silently no-ops if the extension context has been invalidated.
 */
export async function storageSet<K extends StorageKey>(
  key: K,
  value: StorageSchema[K],
): Promise<void> {
  if (!isContextValid()) return Promise.resolve()

  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve()
        }
      })
    } catch (err) {
      // Context invalidated — treat as a no-op
      resolve()
    }
  })
}

/**
 * Removes a value from chrome.storage.local.
 */
export async function storageRemove(key: StorageKey): Promise<void> {
  if (!isContextValid()) return Promise.resolve()

  return new Promise((resolve) => {
    try {
      chrome.storage.local.remove([key], () => resolve())
    } catch {
      resolve()
    }
  })
}

// ─── Profile Accessors ────────────────────────────────────────────────────────

export async function getUserProfile() {
  return storageGet('userProfile', DEFAULT_USER_PROFILE)
}

export async function setUserProfile(
  profile: StorageSchema['userProfile'],
): Promise<void> {
  return storageSet('userProfile', profile)
}

/**
 * Listens for storage changes and invokes the callback with the new UserProfile.
 * Returns an unsubscribe function.
 *
 * Safe to call even if the context is about to be invalidated — the listener
 * wraps the callback in a context check so stale listeners fail silently.
 */
export function onProfileChange(
  callback: (profile: StorageSchema['userProfile']) => void,
): () => void {
  if (!isContextValid()) return () => undefined

  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
  ) => {
    // Guard: the listener may fire after context is gone
    if (!isContextValid()) return

    if ('userProfile' in changes && changes['userProfile']?.newValue !== undefined) {
      try {
        callback(changes['userProfile'].newValue as StorageSchema['userProfile'])
      } catch {
        // Silently ignore errors from invalidated context
      }
    }
  }

  try {
    chrome.storage.local.onChanged.addListener(listener)
  } catch {
    return () => undefined
  }

  return () => {
    try {
      chrome.storage.local.onChanged.removeListener(listener)
    } catch {
      // Already invalidated — nothing to remove
    }
  }
}
