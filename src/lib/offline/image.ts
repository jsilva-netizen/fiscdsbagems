export const MAX_DIMENSION = 1600
export const JPEG_QUALITY = 0.82
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export const MAX_PHOTOS_PER_UNIDADE = 20

function dataURLToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',')
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bstr = atob(parts[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i) & 0xff)
  }
}

function toRationalParts(value: number, scale = 10000): { num: number; den: number } {
  const den = scale
  const num = Math.round(value * den)
  return { num, den }
}

function dmsRationals(
  decimal: number,
  kind: 'lat' | 'lon'
): { ref: 'N' | 'S' | 'E' | 'W'; rationals: { num: number; den: number }[] } {
  const ref: any = kind === 'lat' ? (decimal >= 0 ? 'N' : 'S') : decimal >= 0 ? 'E' : 'W'
  const abs = Math.abs(decimal)
  const deg = Math.floor(abs)
  const minFloat = (abs - deg) * 60
  const min = Math.floor(minFloat)
  const secFloat = (minFloat - min) * 60
  const sec = toRationalParts(secFloat, 10000)
  return { ref, rationals: [{ num: deg, den: 1 }, { num: min, den: 1 }, sec] }
}

function formatExifDateTime(dt: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}:${pad(dt.getMonth() + 1)}:${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`
}

function formatExifDateStamp(dt: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}:${pad(dt.getMonth() + 1)}:${pad(dt.getDate())}`
}

function buildExifApp1(options: { latitude: number; longitude: number; takenAt: Date }): Uint8Array {
  const dt = options.takenAt
  const dtStr = `${formatExifDateTime(dt)}\0`
  const dateStamp = `${formatExifDateStamp(dt)}\0`
  const { ref: latRef, rationals: lat } = dmsRationals(options.latitude, 'lat')
  const { ref: lonRef, rationals: lon } = dmsRationals(options.longitude, 'lon')

  const gpsTime = [
    { num: dt.getHours(), den: 1 },
    { num: dt.getMinutes(), den: 1 },
    toRationalParts(dt.getSeconds() + dt.getMilliseconds() / 1000, 1000)
  ]

  const TYPE_ASCII = 2
  const TYPE_LONG = 4
  const TYPE_RATIONAL = 5

  const IFD0_TAG_DATETIME = 0x0132
  const IFD0_TAG_EXIF_PTR = 0x8769
  const IFD0_TAG_GPS_PTR = 0x8825

  const EXIF_TAG_DATETIME_ORIGINAL = 0x9003

  const GPS_TAG_LAT_REF = 0x0001
  const GPS_TAG_LAT = 0x0002
  const GPS_TAG_LON_REF = 0x0003
  const GPS_TAG_LON = 0x0004
  const GPS_TAG_TIME_STAMP = 0x0007
  const GPS_TAG_DATE_STAMP = 0x001d

  const ifd0Count = 3
  const exifCount = 1
  const gpsCount = 6

  const tiffHeaderSize = 8
  const ifd0Size = 2 + ifd0Count * 12 + 4
  const exifIfdSize = 2 + exifCount * 12 + 4
  const gpsIfdSize = 2 + gpsCount * 12 + 4

  const dataStart = tiffHeaderSize + ifd0Size + exifIfdSize + gpsIfdSize

  const latRefStr = `${latRef}\0`
  const lonRefStr = `${lonRef}\0`

  const bytesForRationals = (count: number) => count * 8

  const dtStrOffset = dataStart
  const dtStrLen = dtStr.length

  const exifDtStrOffset = dtStrOffset + dtStrLen
  const exifDtStrLen = dtStr.length

  const gpsLatRefOffset = exifDtStrOffset + exifDtStrLen
  const gpsLatRefLen = latRefStr.length

  const gpsLonRefOffset = gpsLatRefOffset + gpsLatRefLen
  const gpsLonRefLen = lonRefStr.length

  const gpsLatOffset = gpsLonRefOffset + gpsLonRefLen
  const gpsLatLen = bytesForRationals(3)

  const gpsLonOffset = gpsLatOffset + gpsLatLen
  const gpsLonLen = bytesForRationals(3)

  const gpsTimeOffset = gpsLonOffset + gpsLonLen
  const gpsTimeLen = bytesForRationals(3)

  const gpsDateOffset = gpsTimeOffset + gpsTimeLen
  const gpsDateLen = dateStamp.length

  const totalTiffSize = gpsDateOffset + gpsDateLen

  const exifHeader = new Uint8Array(6 + totalTiffSize)
  const view = new DataView(exifHeader.buffer)
  writeAscii(view, 0, 'Exif\0\0')

  const tiffBase = 6
  view.setUint8(tiffBase + 0, 0x49)
  view.setUint8(tiffBase + 1, 0x49)
  view.setUint16(tiffBase + 2, 0x002a, true)
  view.setUint32(tiffBase + 4, 0x00000008, true)

  const ifd0Offset = tiffHeaderSize
  const ifd0Base = tiffBase + ifd0Offset
  view.setUint16(ifd0Base, ifd0Count, true)

  const exifIfdOffset = tiffHeaderSize + ifd0Size
  const gpsIfdOffset = tiffHeaderSize + ifd0Size + exifIfdSize

  const putEntry = (base: number, idx: number, tag: number, type: number, count: number, valueOrOffset: number) => {
    const off = base + 2 + idx * 12
    view.setUint16(off + 0, tag, true)
    view.setUint16(off + 2, type, true)
    view.setUint32(off + 4, count, true)
    view.setUint32(off + 8, valueOrOffset, true)
  }

  putEntry(ifd0Base, 0, IFD0_TAG_DATETIME, TYPE_ASCII, dtStrLen, dtStrOffset)
  putEntry(ifd0Base, 1, IFD0_TAG_EXIF_PTR, TYPE_LONG, 1, exifIfdOffset)
  putEntry(ifd0Base, 2, IFD0_TAG_GPS_PTR, TYPE_LONG, 1, gpsIfdOffset)
  view.setUint32(ifd0Base + 2 + ifd0Count * 12, 0x00000000, true)

  const exifBase = tiffBase + exifIfdOffset
  view.setUint16(exifBase, exifCount, true)
  putEntry(exifBase, 0, EXIF_TAG_DATETIME_ORIGINAL, TYPE_ASCII, exifDtStrLen, exifDtStrOffset)
  view.setUint32(exifBase + 2 + exifCount * 12, 0x00000000, true)

  const gpsBase = tiffBase + gpsIfdOffset
  view.setUint16(gpsBase, gpsCount, true)
  putEntry(gpsBase, 0, GPS_TAG_LAT_REF, TYPE_ASCII, gpsLatRefLen, gpsLatRefOffset)
  putEntry(gpsBase, 1, GPS_TAG_LAT, TYPE_RATIONAL, 3, gpsLatOffset)
  putEntry(gpsBase, 2, GPS_TAG_LON_REF, TYPE_ASCII, gpsLonRefLen, gpsLonRefOffset)
  putEntry(gpsBase, 3, GPS_TAG_LON, TYPE_RATIONAL, 3, gpsLonOffset)
  putEntry(gpsBase, 4, GPS_TAG_TIME_STAMP, TYPE_RATIONAL, 3, gpsTimeOffset)
  putEntry(gpsBase, 5, GPS_TAG_DATE_STAMP, TYPE_ASCII, gpsDateLen, gpsDateOffset)
  view.setUint32(gpsBase + 2 + gpsCount * 12, 0x00000000, true)

  writeAscii(view, tiffBase + dtStrOffset, dtStr)
  writeAscii(view, tiffBase + exifDtStrOffset, dtStr)
  writeAscii(view, tiffBase + gpsLatRefOffset, latRefStr)
  writeAscii(view, tiffBase + gpsLonRefOffset, lonRefStr)
  writeAscii(view, tiffBase + gpsDateOffset, dateStamp)

  const writeRationals = (offset: number, values: { num: number; den: number }[]) => {
    let o = tiffBase + offset
    for (const r of values) {
      view.setUint32(o, r.num >>> 0, true)
      view.setUint32(o + 4, r.den >>> 0, true)
      o += 8
    }
  }
  writeRationals(gpsLatOffset, lat)
  writeRationals(gpsLonOffset, lon)
  writeRationals(gpsTimeOffset, gpsTime)

  const app1Len = exifHeader.length + 2
  const app1 = new Uint8Array(4 + exifHeader.length)
  app1[0] = 0xff
  app1[1] = 0xe1
  app1[2] = (app1Len >> 8) & 0xff
  app1[3] = app1Len & 0xff
  app1.set(exifHeader, 4)
  return app1
}

function isExifApp1Segment(bytes: Uint8Array, segStart: number): boolean {
  if (bytes[segStart] !== 0xff || bytes[segStart + 1] !== 0xe1) return false
  const len = (bytes[segStart + 2] << 8) | bytes[segStart + 3]
  const payloadStart = segStart + 4
  const payloadEnd = segStart + 2 + len
  if (payloadEnd > bytes.length) return false
  const header = bytes.subarray(payloadStart, Math.min(payloadStart + 6, bytes.length))
  return String.fromCharCode(...Array.from(header)) === 'Exif\0\0'
}

function injectOrReplaceExif(jpeg: Uint8Array, exifApp1: Uint8Array): Uint8Array {
  if (jpeg.length < 4 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8) {
    throw new Error('JPEG inválido')
  }
  let offset = 2
  while (offset + 4 < jpeg.length) {
    if (jpeg[offset] !== 0xff) break
    const marker = jpeg[offset + 1]
    if (marker === 0xda) break
    const size = (jpeg[offset + 2] << 8) | jpeg[offset + 3]
    if (size < 2) break
    const segEnd = offset + 2 + size
    if (segEnd > jpeg.length) break
    if (marker === 0xe1 && isExifApp1Segment(jpeg, offset)) {
      const out = new Uint8Array(jpeg.length - (segEnd - offset) + exifApp1.length)
      out.set(jpeg.subarray(0, offset), 0)
      out.set(exifApp1, offset)
      out.set(jpeg.subarray(segEnd), offset + exifApp1.length)
      return out
    }
    offset = segEnd
  }
  const out = new Uint8Array(jpeg.length + exifApp1.length)
  out.set(jpeg.subarray(0, 2), 0)
  out.set(exifApp1, 2)
  out.set(jpeg.subarray(2), 2 + exifApp1.length)
  return out
}

function readAsciiNullTerminated(bytes: Uint8Array): string {
  let end = bytes.length
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) {
      end = i
      break
    }
  }
  return String.fromCharCode(...Array.from(bytes.subarray(0, end)))
}

function parseExifDateTimeString(s: string): Date | undefined {
  const m = /^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/.exec(s.trim())
  if (!m) return undefined
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const hh = Number(m[4])
  const mm = Number(m[5])
  const ss = Number(m[6])
  const dt = new Date(y, mo, d, hh, mm, ss)
  if (Number.isNaN(dt.getTime())) return undefined
  return dt
}

type ExifCapture = { latitude: number; longitude: number; takenAt?: string; accuracyM?: number }

function extractCaptureFromJpegBytes(bytes: Uint8Array): ExifCapture | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  let offset = 2
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) break
    let markerPos = offset
    while (markerPos < bytes.length && bytes[markerPos] === 0xff) markerPos++
    if (markerPos >= bytes.length) break
    const marker = bytes[markerPos]
    offset = markerPos + 1
    if (marker === 0xda) break
    if (marker === 0xd9) break
    if (offset + 2 > bytes.length) break
    const segLen = (bytes[offset] << 8) | bytes[offset + 1]
    if (segLen < 2) break
    const segStart = offset - 2
    const segEnd = segStart + 2 + segLen
    if (segEnd > bytes.length) break
    if (marker === 0xe1 && isExifApp1Segment(bytes, segStart)) {
      const payloadStart = segStart + 4
      const tiffStart = payloadStart + 6
      if (tiffStart + 8 > segEnd) return null
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      const endianA = view.getUint8(tiffStart)
      const endianB = view.getUint8(tiffStart + 1)
      const little = endianA === 0x49 && endianB === 0x49
      if (!little && !(endianA === 0x4d && endianB === 0x4d)) return null
      const magic = view.getUint16(tiffStart + 2, little)
      if (magic !== 0x002a) return null
      const ifd0Offset = view.getUint32(tiffStart + 4, little)
      const ifd0Abs = tiffStart + ifd0Offset
      if (ifd0Abs + 2 > segEnd) return null

      const typeSize = (type: number) => {
        if (type === 1) return 1
        if (type === 2) return 1
        if (type === 3) return 2
        if (type === 4) return 4
        if (type === 5) return 8
        if (type === 7) return 1
        return 0
      }

      const readEntryBytes = (entryOff: number, type: number, count: number): Uint8Array => {
        const sz = typeSize(type)
        const total = sz * count
        if (total <= 0) return new Uint8Array()
        if (total <= 4) {
          const out = new Uint8Array(total)
          for (let i = 0; i < total; i++) out[i] = view.getUint8(entryOff + 8 + i)
          return out
        }
        const valueOffset = view.getUint32(entryOff + 8, little)
        const abs = tiffStart + valueOffset
        if (abs + total > segEnd) return new Uint8Array()
        return bytes.subarray(abs, abs + total)
      }

      const readAsciiTag = (ifdAbs: number, tagId: number): string | undefined => {
        const count = view.getUint16(ifdAbs, little)
        for (let i = 0; i < count; i++) {
          const eOff = ifdAbs + 2 + i * 12
          const tag = view.getUint16(eOff, little)
          if (tag !== tagId) continue
          const type = view.getUint16(eOff + 2, little)
          const c = view.getUint32(eOff + 4, little)
          if (type !== 2 || c <= 0) return undefined
          const raw = readEntryBytes(eOff, type, c)
          const s = readAsciiNullTerminated(raw)
          return s || undefined
        }
        return undefined
      }

      const readLongTag = (ifdAbs: number, tagId: number): number | undefined => {
        const count = view.getUint16(ifdAbs, little)
        for (let i = 0; i < count; i++) {
          const eOff = ifdAbs + 2 + i * 12
          const tag = view.getUint16(eOff, little)
          if (tag !== tagId) continue
          const type = view.getUint16(eOff + 2, little)
          const c = view.getUint32(eOff + 4, little)
          if (type !== 4 || c !== 1) return undefined
          return view.getUint32(eOff + 8, little)
        }
        return undefined
      }

      const readRationals = (ifdAbs: number, tagId: number): { num: number; den: number }[] | undefined => {
        const count = view.getUint16(ifdAbs, little)
        for (let i = 0; i < count; i++) {
          const eOff = ifdAbs + 2 + i * 12
          const tag = view.getUint16(eOff, little)
          if (tag !== tagId) continue
          const type = view.getUint16(eOff + 2, little)
          const c = view.getUint32(eOff + 4, little)
          if (type !== 5 || c <= 0) return undefined
          const raw = readEntryBytes(eOff, type, c)
          if (raw.length !== c * 8) return undefined
          const out: { num: number; den: number }[] = []
          const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
          for (let j = 0; j < c; j++) {
            const num = dv.getUint32(j * 8, little)
            const den = dv.getUint32(j * 8 + 4, little)
            out.push({ num, den })
          }
          return out
        }
        return undefined
      }

      const IFD0_TAG_DATETIME = 0x0132
      const IFD0_TAG_EXIF_PTR = 0x8769
      const IFD0_TAG_GPS_PTR = 0x8825
      const EXIF_TAG_DATETIME_ORIGINAL = 0x9003
      const GPS_TAG_LAT_REF = 0x0001
      const GPS_TAG_LAT = 0x0002
      const GPS_TAG_LON_REF = 0x0003
      const GPS_TAG_LON = 0x0004
      const GPS_TAG_TIME_STAMP = 0x0007
      const GPS_TAG_DOP = 0x000b
      const GPS_TAG_DATE_STAMP = 0x001d
      const GPS_TAG_HPOS_ERR = 0x001f

      const exifPtr = readLongTag(ifd0Abs, IFD0_TAG_EXIF_PTR)
      const gpsPtr = readLongTag(ifd0Abs, IFD0_TAG_GPS_PTR)
      const dt0 = readAsciiTag(ifd0Abs, IFD0_TAG_DATETIME)

      let dtOriginal: string | undefined
      if (typeof exifPtr === 'number') {
        const exifAbs = tiffStart + exifPtr
        if (exifAbs + 2 <= segEnd) dtOriginal = readAsciiTag(exifAbs, EXIF_TAG_DATETIME_ORIGINAL)
      }

      let lat: number | undefined
      let lon: number | undefined
      let gpsDate: string | undefined
      let gpsTime: { num: number; den: number }[] | undefined
      let accuracyM: number | undefined
      if (typeof gpsPtr === 'number') {
        const gpsAbs = tiffStart + gpsPtr
        if (gpsAbs + 2 <= segEnd) {
          const latRef = readAsciiTag(gpsAbs, GPS_TAG_LAT_REF)
          const lonRef = readAsciiTag(gpsAbs, GPS_TAG_LON_REF)
          const latVals = readRationals(gpsAbs, GPS_TAG_LAT)
          const lonVals = readRationals(gpsAbs, GPS_TAG_LON)
          gpsDate = readAsciiTag(gpsAbs, GPS_TAG_DATE_STAMP)
          gpsTime = readRationals(gpsAbs, GPS_TAG_TIME_STAMP)
          const hpos = readRationals(gpsAbs, GPS_TAG_HPOS_ERR)
          const dop = readRationals(gpsAbs, GPS_TAG_DOP)
          if (hpos && hpos[0]?.den) accuracyM = hpos[0].num / hpos[0].den
          else if (dop && dop[0]?.den) accuracyM = dop[0].num / dop[0].den

          const toDeg = (ref: string | undefined, vals: { num: number; den: number }[] | undefined): number | undefined => {
            if (!ref || !vals || vals.length < 3) return undefined
            const d = vals[0].den ? vals[0].num / vals[0].den : NaN
            const m = vals[1].den ? vals[1].num / vals[1].den : NaN
            const s = vals[2].den ? vals[2].num / vals[2].den : NaN
            if (![d, m, s].every((x) => Number.isFinite(x))) return undefined
            let dec = d + m / 60 + s / 3600
            const r = ref.trim().toUpperCase()
            if (r === 'S' || r === 'W') dec = -dec
            return dec
          }
          lat = toDeg(latRef, latVals)
          lon = toDeg(lonRef, lonVals)
        }
      }

      let takenAt: Date | undefined = dtOriginal ? parseExifDateTimeString(dtOriginal) : undefined
      if (!takenAt && dt0) takenAt = parseExifDateTimeString(dt0)
      if (!takenAt && gpsDate && gpsTime && gpsTime.length >= 3) {
        const dm = /^(\d{4}):(\d{2}):(\d{2})$/.exec(gpsDate.trim())
        const hh = gpsTime[0].den ? gpsTime[0].num / gpsTime[0].den : NaN
        const mm = gpsTime[1].den ? gpsTime[1].num / gpsTime[1].den : NaN
        const ss = gpsTime[2].den ? gpsTime[2].num / gpsTime[2].den : NaN
        if (dm && [hh, mm, ss].every((x) => Number.isFinite(x))) {
          const dt = new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Math.floor(hh), Math.floor(mm), Math.floor(ss))
          if (!Number.isNaN(dt.getTime())) takenAt = dt
        }
      }

      if (typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon)) {
        return { latitude: lat, longitude: lon, takenAt: takenAt ? takenAt.toISOString() : undefined, accuracyM }
      }
      return null
    }
    offset = segEnd
  }
  return null
}

export async function extractCaptureFromImageFile(file: File): Promise<ExifCapture | null> {
  try {
    const head = await file.slice(0, 256 * 1024).arrayBuffer()
    const res = extractCaptureFromJpegBytes(new Uint8Array(head))
    if (res) return res
  } catch {}
  try {
    const full = await file.arrayBuffer()
    return extractCaptureFromJpegBytes(new Uint8Array(full))
  } catch {
    return null
  }
}

async function addExifToJpegBlob(blob: Blob, options: { latitude: number; longitude: number; takenAt: Date }): Promise<Blob> {
  const buf = await blob.arrayBuffer()
  const jpeg = new Uint8Array(buf)
  const exif = buildExifApp1(options)
  const merged = injectOrReplaceExif(jpeg, exif)
  const normalized = new Uint8Array(merged.byteLength)
  normalized.set(merged)
  return new Blob([normalized.buffer], { type: 'image/jpeg' })
}

function drawWatermark(canvas: HTMLCanvasElement, lines: string[]): void {
  if (!lines || lines.length === 0) return
  const ctx = canvas.getContext('2d')!
  const base = Math.max(canvas.width, canvas.height)
  const padding = Math.max(10, Math.round(base * 0.015))
  const fontSize = Math.max(14, Math.round(base * 0.028))
  ctx.save()
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`
  ctx.textBaseline = 'bottom'
  const maxTextW = Math.max(10, canvas.width - padding * 4)
  const fitLine = (input: unknown) => {
    const raw = String(input || '')
    if (ctx.measureText(raw).width <= maxTextW) return raw
    const ellipsis = '…'
    let s = raw
    while (s.length > 1 && ctx.measureText(`${s}${ellipsis}`).width > maxTextW) {
      s = s.slice(0, -1)
    }
    return `${s}${ellipsis}`
  }
  const fitted = lines.map((t) => fitLine(t))
  const lineGap = Math.round(fontSize * 0.25)
  const heights = fitted.length * fontSize + (fitted.length - 1) * lineGap
  const boxH = heights + padding * 2
  const yBottom = canvas.height - padding
  const boxY = Math.max(padding, canvas.height - boxH - padding)
  const maxW = Math.max(...fitted.map((t) => ctx.measureText(t).width))
  const boxW = Math.min(canvas.width - padding * 2, Math.ceil(maxW) + padding * 2)
  const boxX = padding
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  const r = Math.max(8, Math.round(fontSize * 0.4))
  ctx.beginPath()
  ctx.moveTo(boxX + r, boxY)
  ctx.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + boxH, r)
  ctx.arcTo(boxX + boxW, boxY + boxH, boxX, boxY + boxH, r)
  ctx.arcTo(boxX, boxY + boxH, boxX, boxY, r)
  ctx.arcTo(boxX, boxY, boxX + boxW, boxY, r)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.97)'
  let y = yBottom
  for (let i = fitted.length - 1; i >= 0; i--) {
    ctx.fillText(fitted[i], boxX + padding, y)
    y -= fontSize + lineGap
  }
  ctx.restore()
}

export async function compressFileToBase64(file: File, maxDimension = MAX_DIMENSION, quality = JPEG_QUALITY): Promise<{
  base64: string
  mimeType: string
  width: number
  height: number
  byteLength: number
}> {
  const reader = new FileReader()
  const fileLoad = await new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (e) => reject(e)
    reader.readAsDataURL(file)
  })
  const img = document.createElement('img')
  const imgLoad = await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = (e) => reject(e)
    img.src = fileLoad
  })
  void imgLoad
  let w = (img as any).naturalWidth || img.width
  let h = (img as any).naturalHeight || img.height
  const maxSide = Math.max(w, h)
  if (maxSide > maxDimension) {
    const scale = maxDimension / maxSide
    w = Math.round(w * scale)
    h = Math.round(h * scale)
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  try {
    ctx.imageSmoothingQuality = 'high'
  } catch {}
  ctx.drawImage(img, 0, 0, w, h)
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  const blob = dataURLToBlob(dataUrl)
  return {
    base64: dataUrl,
    mimeType: 'image/jpeg',
    width: w,
    height: h,
    byteLength: blob.size
  }
}

export async function compressFileToBlob(
  file: File,
  maxDimension = MAX_DIMENSION,
  quality = JPEG_QUALITY,
  options?: { watermarkLines?: string[]; exif?: { latitude: number; longitude: number; takenAt: Date } }
): Promise<{
  blob: Blob
  mimeType: string
  width: number
  height: number
  byteLength: number
}> {
  const reader = new FileReader()
  const fileLoad = await new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (e) => reject(e)
    reader.readAsDataURL(file)
  })
  const img = document.createElement('img')
  const imgLoad = await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = (e) => reject(e)
    img.src = fileLoad
  })
  void imgLoad
  let w = (img as any).naturalWidth || img.width
  let h = (img as any).naturalHeight || img.height
  const maxSide = Math.max(w, h)
  if (maxSide > maxDimension) {
    const scale = maxDimension / maxSide
    w = Math.round(w * scale)
    h = Math.round(h * scale)
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  try {
    ctx.imageSmoothingQuality = 'high'
  } catch {}
  ctx.drawImage(img, 0, 0, w, h)
  if (options?.watermarkLines?.length) {
    drawWatermark(canvas, options.watermarkLines)
  }
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
  const encode = async (q: number) => {
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (!b) reject(new Error('Falha ao comprimir imagem'))
          else resolve(b)
        },
        'image/jpeg',
        q
      )
    })
  }
  let q = clamp(Number(quality) || JPEG_QUALITY, 0.55, 0.92)
  let blob = await encode(q)
  while (blob.size > MAX_PHOTO_BYTES && q > 0.56) {
    q = clamp(q - 0.07, 0.55, 0.92)
    blob = await encode(q)
  }
  const finalBlob = options?.exif ? await addExifToJpegBlob(blob, options.exif) : blob
  return {
    blob: finalBlob,
    mimeType: 'image/jpeg',
    width: w,
    height: h,
    byteLength: finalBlob.size
  }
}

export function base64ToBlob(base64: string): Blob {
  return dataURLToBlob(base64)
}
