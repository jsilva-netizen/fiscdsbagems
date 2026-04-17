const cache = new Map<string, string>()

export function getOrCreatePreviewUrl(localId: string, blob?: Blob, base64?: string, existingUrl?: string): string {
  if (existingUrl) return String(existingUrl)
  const id = String(localId || '')
  if (!id) return ''
  const cached = cache.get(id)
  if (cached) return cached
  if (blob instanceof Blob) {
    const u = URL.createObjectURL(blob)
    cache.set(id, u)
    return u
  }
  if (typeof base64 === 'string' && base64.trim() !== '') return base64
  return ''
}

export function revokePreviewUrl(localId: string): void {
  const id = String(localId || '')
  if (!id) return
  const u = cache.get(id)
  if (u) {
    try {
      URL.revokeObjectURL(u)
    } catch {
    }
    cache.delete(id)
  }
}

export function revokeManyPreviewUrls(localIds: string[]): void {
  for (const id of Array.isArray(localIds) ? localIds : []) {
    revokePreviewUrl(String(id))
  }
}

export function clearAllPreviewUrls(): void {
  revokeManyPreviewUrls(Array.from(cache.keys()))
}
