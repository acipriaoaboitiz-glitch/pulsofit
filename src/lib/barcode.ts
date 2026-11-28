/**
 * Barcode reading: the browser's native BarcodeDetector when it can read EAN-13 (Android Chrome),
 * otherwise ZXing C++ compiled to WebAssembly (iPhone, Firefox, desktop). The .wasm is served by
 * our own deployment, so nothing is downloaded from third-party CDNs.
 */
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'

export interface Detector {
  detect(source: ImageBitmapSource): Promise<{ rawValue: string }[]>
}

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'] as const

interface NativeCtor {
  new (o: { formats: string[] }): Detector
  getSupportedFormats(): Promise<string[]>
}

let zxing: Promise<Detector> | null = null
function zxingDetector(): Promise<Detector> {
  zxing ??= (async () => {
    const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill')
    prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) } })
    return new BarcodeDetector({ formats: [...FORMATS] }) as unknown as Detector
  })().catch((e: unknown) => {
    zxing = null // allow a retry (e.g. the connection dropped while loading)
    throw e
  })
  return zxing
}

/** Detector for the live camera. */
export async function getDetector(): Promise<Detector> {
  const Native = (globalThis as unknown as { BarcodeDetector?: NativeCtor }).BarcodeDetector
  if (Native) {
    try {
      const supported = await Native.getSupportedFormats()
      if (supported.includes('ean_13')) return new Native({ formats: FORMATS.filter((f) => supported.includes(f)) })
    } catch {
      /* fall back to ZXing */
    }
  }
  return zxingDetector()
}

/** Reads a code from a photo of the package (more forgiving than the live video). */
export async function decodeImage(file: Blob, maxSide = 1800): Promise<string | null> {
  const original = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(original.width, original.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(original.width * scale)
  canvas.height = Math.round(original.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen')
  ctx.drawImage(original, 0, 0, canvas.width, canvas.height)
  original.close()
  const hits = await (await zxingDetector()).detect(canvas)
  return hits[0]?.rawValue ?? null
}
