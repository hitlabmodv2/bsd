// Sistem Warna untuk WhatsApp Bot
// Background dan Foreground Colors

const colors = {
  // Reset
  reset: '\x1b[0m',

  // Text Colors (Foreground)
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Bright Text Colors
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background Colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',

  // Bright Background Colors
  bgBrightBlack: '\x1b[100m',
  bgBrightRed: '\x1b[101m',
  bgBrightGreen: '\x1b[102m',
  bgBrightYellow: '\x1b[103m',
  bgBrightBlue: '\x1b[104m',
  bgBrightMagenta: '\x1b[105m',
  bgBrightCyan: '\x1b[106m',
  bgBrightWhite: '\x1b[107m',

  // Text Styles
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  strikethrough: '\x1b[9m'
};

// Fungsi helper untuk styling - Skema biru-putih dengan fokus kata penting
const style = {
  // Header styling
  header: (text) => `${colors.bold}${colors.brightWhite}${text}${colors.reset}`,

  // Menu styling
  menuTitle: (text) => `${colors.bold}${colors.bgBlue}${colors.brightWhite} ${text} ${colors.reset}`,
  menuOption: (text) => `${colors.brightWhite}${text}${colors.reset}`,

  // Success styling
  success: (text) => `${colors.bold}${colors.bgBlue}${colors.brightWhite} ${text} ${colors.reset}`,

  // Error styling - Tetap merah untuk error
  error: (text) => `${colors.bold}${colors.bgBrightRed}${colors.brightWhite} ${text} ${colors.reset}`,

  // Warning styling - Background biru dengan teks putih
  warning: (text) => `${colors.bold}${colors.bgBlue}${colors.brightWhite} ${text} ${colors.reset}`,

  // Info styling
  info: (text) => `${colors.bgBlue}${colors.brightWhite} ${text} ${colors.reset}`,

  // Tutorial styling - Teks putih biasa
  tutorial: (text) => `${colors.brightWhite}${text}${colors.reset}`,

  // Pairing code styling
  pairingCode: (text) => `${colors.bold}${colors.bgBlue}${colors.brightWhite} ${text} ${colors.reset}`,

  // Status styling
  status: (text) => `${colors.bold}${colors.bgBlue}${colors.brightWhite} ${text} ${colors.reset}`,

  // Background dengan border
  boxed: (text) => `${colors.bgBlue}${colors.brightWhite} ${text} ${colors.reset}`,

  // Gradient effect (simulasi)
  gradient: (text) => `${colors.bold}${colors.bgBlue}${colors.brightWhite} ${text} ${colors.reset}`,

  // Highlight important text
  highlight: (text) => `${colors.bold}${colors.bgBlue}${colors.brightWhite} ${text} ${colors.reset}`
};

module.exports = { colors, style };