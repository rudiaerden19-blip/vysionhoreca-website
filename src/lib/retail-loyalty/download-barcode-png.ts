import { buildEan13BarcodeSvg } from '@/lib/retail-loyalty/ean13-barcode-svg'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image_load_failed'))
    img.src = src
  })
}

/** PNG in Foto's/Files of via deelmenu — zelfde 899-code scant aan de kassa. */
export async function saveRetailLoyaltyBarcodeToPhone(cardCode: string): Promise<void> {
  const svg = buildEan13BarcodeSvg(cardCode, { moduleWidth: 3, barHeight: 100 })
  if (!svg) throw new Error('invalid_code')

  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const img = await loadImage(svgUrl)
    const padding = 28
    const canvas = document.createElement('canvas')
    canvas.width = img.width + padding * 2
    canvas.height = img.height + padding * 2
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas_unavailable')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, padding, padding)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('blob_failed'))), 'image/png')
    })

    const fileName = `winkelpas-${cardCode.replace(/\D/g, '').slice(-6)}.png`
    const file = new File([blob], fileName, { type: 'image/png' })

    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({ files: [file], title: fileName })
      return
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}
