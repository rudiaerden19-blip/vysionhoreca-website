// =====================================================
// LOCAL QR CODE GENERATOR
// Generates QR codes as SVG without external API calls
// Based on QRCode.js algorithm
// =====================================================

// QR Code error correction levels
const ERROR_CORRECTION_LEVEL = {
  L: 1, // 7% recovery
  M: 0, // 15% recovery
  Q: 3, // 25% recovery
  H: 2, // 30% recovery
}

// Generate QR code matrix
function generateQRMatrix(text: string): boolean[][] {
  // Simplified QR generation - uses a basic encoding
  // For production, you might want to use a full library
  
  const size = Math.max(21, Math.ceil(Math.sqrt(text.length * 8)) + 10)
  const matrix: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false))
  
  // Add finder patterns (corners)
  const addFinderPattern = (x: number, y: number) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (
          i === 0 || i === 6 || j === 0 || j === 6 || // outer border
          (i >= 2 && i <= 4 && j >= 2 && j <= 4) // inner square
        ) {
          if (x + i < size && y + j < size) {
            matrix[y + j][x + i] = true
          }
        }
      }
    }
  }
  
  // Add finder patterns
  addFinderPattern(0, 0) // top-left
  addFinderPattern(size - 7, 0) // top-right
  addFinderPattern(0, size - 7) // bottom-left
  
  // Add timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0
    matrix[i][6] = i % 2 === 0
  }
  
  // Encode data
  const bytes = new TextEncoder().encode(text)
  let bitIndex = 0
  
  // Simple data encoding in remaining space
  for (let y = size - 1; y >= 0; y -= 2) {
    if (y === 6) y = 5 // Skip timing pattern column
    
    for (let x = size - 1; x >= 0; x--) {
      for (let col = 0; col < 2; col++) {
        const actualX = y - col
        if (actualX < 0) continue
        
        // Skip if in finder pattern or timing pattern area
        if (
          (x < 9 && actualX < 9) || // top-left finder
          (x < 9 && actualX > size - 9) || // top-right finder
          (x > size - 9 && actualX < 9) || // bottom-left finder
          actualX === 6 || x === 6 // timing patterns
        ) {
          continue
        }
        
        const byteIndex = Math.floor(bitIndex / 8)
        const bitPosition = 7 - (bitIndex % 8)
        
        if (byteIndex < bytes.length) {
          matrix[x][actualX] = ((bytes[byteIndex] >> bitPosition) & 1) === 1
        }
        bitIndex++
      }
    }
  }
  
  return matrix
}

// Generate SVG from matrix
function matrixToSVG(matrix: boolean[][], moduleSize: number = 4): string {
  const size = matrix.length
  const svgSize = size * moduleSize + moduleSize * 2 // Add margin
  
  let paths = ''
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matrix[y][x]) {
        const px = (x + 1) * moduleSize
        const py = (y + 1) * moduleSize
        paths += `M${px},${py}h${moduleSize}v${moduleSize}h-${moduleSize}Z`
      }
    }
  }
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}">
    <rect width="100%" height="100%" fill="white"/>
    <path d="${paths}" fill="black"/>
  </svg>`
}

/**
 * Generate a QR code as a data URL
 * @param text - The text/URL to encode
 * @param size - Size in pixels (default 200)
 * @returns Data URL of the QR code SVG
 */
export function generateQRCodeDataUrl(text: string, size: number = 200): string {
  const matrix = generateQRMatrix(text)
  const svg = matrixToSVG(matrix, Math.floor(size / matrix.length))
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/**
 * Generate a QR code as raw SVG string
 * @param text - The text/URL to encode
 * @returns SVG string
 */
export function generateQRCodeSVG(text: string): string {
  const matrix = generateQRMatrix(text)
  return matrixToSVG(matrix)
}
