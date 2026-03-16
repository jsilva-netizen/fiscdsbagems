export const MAX_DIMENSION = 1600
export const JPEG_QUALITY = 0.7
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
  let w = img.width
  let h = img.height
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

export async function compressFileToBlob(file: File, maxDimension = MAX_DIMENSION, quality = JPEG_QUALITY): Promise<{
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
  let w = img.width
  let h = img.height
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
  ctx.drawImage(img, 0, 0, w, h)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) reject(new Error('Falha ao comprimir imagem'))
        else resolve(b)
      },
      'image/jpeg',
      quality
    )
  })
  return {
    blob,
    mimeType: 'image/jpeg',
    width: w,
    height: h,
    byteLength: blob.size
  }
}

export function base64ToBlob(base64: string): Blob {
  return dataURLToBlob(base64)
}
