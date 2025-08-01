
const os = require('os');
const fs = require('fs');
const { style } = require('../CODE_WARNA/colors');

class ServerInfo {
  static getRAMInfo() {
    const totalRAM = os.totalmem();
    const freeRAM = os.freemem();
    const usedRAM = totalRAM - freeRAM;
    
    return {
      total: this.formatBytes(totalRAM),
      used: this.formatBytes(usedRAM),
      free: this.formatBytes(freeRAM),
      percentage: ((usedRAM / totalRAM) * 100).toFixed(1)
    };
  }

  static getCPUInfo() {
    const cpus = os.cpus();
    const cpu = cpus[0];
    
    // Deteksi brand CPU
    let brand = 'Unknown';
    if (cpu.model.toLowerCase().includes('intel')) {
      brand = 'Intel';
    } else if (cpu.model.toLowerCase().includes('amd')) {
      brand = 'AMD Ryzen';
    } else if (cpu.model.toLowerCase().includes('ryzen')) {
      brand = 'AMD Ryzen';
    }

    return {
      model: cpu.model,
      brand: brand,
      cores: cpus.length,
      speed: `${cpu.speed} MHz`,
      architecture: os.arch()
    };
  }

  static getSystemInfo() {
    const uptime = os.uptime();
    const platform = os.platform();
    const release = os.release();
    const hostname = os.hostname();

    return {
      platform: platform,
      release: release,
      hostname: hostname,
      uptime: this.formatUptime(uptime),
      nodeVersion: process.version
    };
  }

  static getStorageInfo() {
    try {
      const stats = fs.statSync('.');
      return {
        available: 'Unknown',
        used: 'Unknown',
        total: 'Unknown'
      };
    } catch (error) {
      return {
        available: 'Unknown',
        used: 'Unknown', 
        total: 'Unknown'
      };
    }
  }

  static formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static formatUptime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  static createServerInfoBox() {
    const ram = this.getRAMInfo();
    const cpu = this.getCPUInfo();
    const system = this.getSystemInfo();
    
    return `
${style.tutorial('🖥️  INFORMASI SERVER REPLIT')}

${style.info('💾 RAM USAGE:')}
${style.highlight(`   Total    : ${ram.total.padEnd(12)} | Used: ${ram.used} (${ram.percentage}%)`)}
${style.highlight(`   Free     : ${ram.free.padEnd(12)} | Available Memory`)}

${style.info('⚡ CPU SPECS:')}
${style.highlight(`   Brand    : ${cpu.brand.padEnd(12)} | Architecture: ${cpu.architecture}`)}
${style.highlight(`   Cores    : ${cpu.cores} Core${cpu.cores > 1 ? 's' : ''.padEnd(7)} | Multi-Threading`)}
${style.highlight(`   Speed    : ${cpu.speed.padEnd(12)} | Base Frequency`)}

${style.info('🔧 SYSTEM INFO:')}
${style.highlight(`   Platform : ${system.platform.padEnd(12)} | Operating System`)}
${style.highlight(`   Uptime   : ${system.uptime.padEnd(12)} | Server Runtime`)}
${style.highlight(`   Node.js  : ${system.nodeVersion.padEnd(12)} | JavaScript Runtime`)}
${style.highlight(`   Hostname : ${system.hostname.padEnd(12)} | Container ID`)}

${style.success('✅ Server Running on Replit Infrastructure')}
`;
  }

  static createCompactServerInfo() {
    const ram = this.getRAMInfo();
    const cpu = this.getCPUInfo();
    
    return `${style.info('🖥️')} ${style.highlight(`${cpu.brand} ${cpu.cores}C`)} ${style.info('💾')} ${style.highlight(`${ram.used}/${ram.total}`)}`;
  }
}

module.exports = { ServerInfo };
