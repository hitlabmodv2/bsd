
// WARNA_CODE/codewarna.js - Sistem warna dan styling untuk console
class ColorCode {
  constructor() {
    // ANSI Color Codes
    this.colors = {
      // Text Colors
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
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      italic: '\x1b[3m',
      underline: '\x1b[4m',
      blink: '\x1b[5m',
      reverse: '\x1b[7m',
      strikethrough: '\x1b[9m'
    };
  }

  // Method untuk membuat teks dengan warna dan background
  colorText(text, textColor = 'white', bgColor = null, style = null) {
    let colorCode = '';
    
    if (style) colorCode += this.colors[style] || '';
    if (textColor) colorCode += this.colors[textColor] || '';
    if (bgColor) colorCode += this.colors[bgColor] || '';
    
    return `${colorCode}${text}${this.colors.reset}`;
  }

  // Method untuk header dengan background
  createHeader(text, bgColor = 'bgBlue', textColor = 'brightWhite') {
    const padding = 2;
    const width = text.length + (padding * 2);
    const line = '═'.repeat(width);
    
    return [
      this.colorText(`╔${line}╗`, textColor, bgColor, 'bold'),
      this.colorText(`║${' '.repeat(padding)}${text}${' '.repeat(padding)}║`, textColor, bgColor, 'bold'),
      this.colorText(`╚${line}╝`, textColor, bgColor, 'bold')
    ].join('\n');
  }

  // Method untuk box dengan border
  createBox(content, bgColor = 'bgBlack', textColor = 'brightWhite', borderColor = 'cyan') {
    const lines = content.split('\n');
    const maxLength = Math.max(...lines.map(line => line.length));
    const width = maxLength + 4;
    
    let result = [];
    result.push(this.colorText(`┌${'─'.repeat(width - 2)}┐`, borderColor, null, 'bold'));
    
    lines.forEach(line => {
      const padding = maxLength - line.length;
      result.push(
        this.colorText('│ ', borderColor, null, 'bold') +
        this.colorText(line + ' '.repeat(padding), textColor, bgColor) +
        this.colorText(' │', borderColor, null, 'bold')
      );
    });
    
    result.push(this.colorText(`└${'─'.repeat(width - 2)}┘`, borderColor, null, 'bold'));
    return result.join('\n');
  }

  // Method untuk membuat pilihan menu
  createMenuOption(number, text, bgColor = 'bgBlue', textColor = 'brightWhite') {
    return this.colorText(`  ${number}  ${text}  `, textColor, bgColor, 'bold');
  }

  // Method untuk membuat separator dengan warna
  createSeparator(char = '─', length = 50, color = 'cyan') {
    return this.colorText(char.repeat(length), color, null, 'bold');
  }

  // Method untuk tutorial step dengan background berbeda
  createTutorialStep(stepNumber, text, bgColor = 'bgGreen', textColor = 'black') {
    return this.colorText(`STEP ${stepNumber}: ${text}`, textColor, bgColor, 'bold');
  }

  // Method untuk membuat kode pairing dengan highlight
  createPairingCode(code, bgColor = 'bgYellow', textColor = 'black') {
    return this.colorText(`  📟 Kode Anda: ${code}  `, textColor, bgColor, 'bold');
  }

  // Method untuk tips dengan background khusus
  createTip(text, bgColor = 'bgMagenta', textColor = 'brightWhite') {
    return this.colorText(`💡 ${text}`, textColor, bgColor);
  }

  // Method untuk warning
  createWarning(text, bgColor = 'bgRed', textColor = 'brightWhite') {
    return this.colorText(`⚠️  ${text}`, textColor, bgColor, 'bold');
  }

  // Method untuk success message
  createSuccess(text, bgColor = 'bgGreen', textColor = 'black') {
    return this.colorText(`✅ ${text}`, textColor, bgColor, 'bold');
  }

  // Method untuk info message
  createInfo(text, bgColor = 'bgCyan', textColor = 'black') {
    return this.colorText(`ℹ️  ${text}`, textColor, bgColor);
  }

  // Method untuk membuat progress bar
  createProgressBar(progress, total, width = 30, fillColor = 'bgGreen', emptyColor = 'bgBlack') {
    const filled = Math.floor((progress / total) * width);
    const empty = width - filled;
    
    return this.colorText('█'.repeat(filled), 'green', fillColor) +
           this.colorText('░'.repeat(empty), 'brightBlack', emptyColor);
  }

  // Method untuk animasi loading
  createLoadingText(text, frame = 0) {
    const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const spinnerChar = spinner[frame % spinner.length];
    return this.colorText(`${spinnerChar} ${text}`, 'cyan', null, 'bold');
  }

  // Method untuk highlight code
  highlightCode(code, bgColor = 'bgBlack', textColor = 'brightYellow') {
    return this.colorText(`${code}`, textColor, bgColor, 'bold');
  }
}

// Create instance untuk direct usage
const colorCode = new ColorCode();

// Export class dan instance
export default ColorCode;
export {
  colorCode
};

// Method shortcuts untuk export langsung
export const createHeader = (text, bgColor, textColor) => colorCode.createHeader(text, bgColor, textColor);
export const createBox = (content, bgColor, textColor, borderColor) => colorCode.createBox(content, bgColor, textColor, borderColor);
export const createMenuOption = (number, text, bgColor, textColor) => colorCode.createMenuOption(number, text, bgColor, textColor);
export const createSeparator = (char, length, color) => colorCode.createSeparator(char, length, color);
export const createSuccess = (text, bgColor, textColor) => colorCode.createSuccess(text, bgColor, textColor);
export const createWarning = (text, bgColor, textColor) => colorCode.createWarning(text, bgColor, textColor);
export const createInfo = (text, bgColor, textColor) => colorCode.createInfo(text, bgColor, textColor);
export const createError = (text, bgColor, textColor) => colorCode.createWarning(text, bgColor, textColor);
export const createLoadingText = (text, frame) => colorCode.createLoadingText(text, frame);
export const colorText = (text, textColor, bgColor, style) => colorCode.colorText(text, textColor, bgColor, style);
