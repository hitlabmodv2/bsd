
import os from 'os';
import fs from 'fs';
import { 
  createHeader,
  createBox,
  createMenuOption, 
  createSeparator,
  createSuccess,
  createWarning,
  createInfo,
  createError,
  createLoadingText,
  colorText
} from '../WARNA_CODE/codewarna.js';

// Create object untuk compatibility
const colorCode = {
  createHeader,
  createBox,
  createMenuOption,
  createSeparator,
  createSuccess,
  createWarning,
  createInfo,
  createError,
  createLoadingText,
  colorText
};

export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getCPUInfo() {
  const cpus = os.cpus();
  return {
    model: cpus[0].model,
    cores: cpus.length,
    speed: Math.round(cpus[0].speed / 1000 * 100) / 100 // Convert to GHz
  };
}

export function getMemoryInfo() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  
  return {
    total: totalMem,
    used: usedMem,
    free: freeMem,
    percentage: Math.round((usedMem / totalMem) * 100)
  };
}

export function getSystemInfo() {
  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    uptime: os.uptime(),
    nodeVersion: process.version,
    loadAverage: os.loadavg()
  };
}

export function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  let uptime = '';
  if (days > 0) uptime += `${days}d `;
  if (hours > 0) uptime += `${hours}h `;
  if (minutes > 0) uptime += `${minutes}m `;
  uptime += `${secs}s`;
  
  return uptime;
}

export async function displaySystemInfo() {
  console.clear();
  console.log("\n" + colorCode.createHeader("💻 INFORMASI SISTEM & RAM", 'bgMagenta', 'brightWhite'));
  console.log("\n" + colorCode.createSeparator('═', 60, 'brightCyan'));

  const memInfo = getMemoryInfo();
  const cpuInfo = getCPUInfo();
  const sysInfo = getSystemInfo();

  // RAM Information
  console.log("\n" + colorCode.createBox("🧠 INFORMASI MEMORI (RAM)", 'bgBlue', 'brightWhite', 'brightCyan'));
  console.log(colorCode.colorText("📊 Total RAM: ", 'brightYellow', null, 'bold') + colorCode.colorText(formatBytes(memInfo.total), 'brightGreen'));
  console.log(colorCode.colorText("💾 RAM Terpakai: ", 'brightYellow', null, 'bold') + colorCode.colorText(formatBytes(memInfo.used), 'brightRed'));
  console.log(colorCode.colorText("💽 RAM Tersedia: ", 'brightYellow', null, 'bold') + colorCode.colorText(formatBytes(memInfo.free), 'brightGreen'));
  console.log(colorCode.colorText("📈 Persentase: ", 'brightYellow', null, 'bold') + colorCode.colorText(`${memInfo.percentage}%`, memInfo.percentage > 80 ? 'brightRed' : memInfo.percentage > 60 ? 'brightYellow' : 'brightGreen'));

  // CPU Information
  console.log("\n" + colorCode.createBox("⚡ INFORMASI PROCESSOR", 'bgGreen', 'black', 'brightGreen'));
  console.log(colorCode.colorText("🔧 Model: ", 'brightYellow', null, 'bold') + colorCode.colorText(cpuInfo.model, 'brightCyan'));
  console.log(colorCode.colorText("🔥 Cores: ", 'brightYellow', null, 'bold') + colorCode.colorText(`${cpuInfo.cores} Core`, 'brightGreen'));
  console.log(colorCode.colorText("⚡ Speed: ", 'brightYellow', null, 'bold') + colorCode.colorText(`${cpuInfo.speed} GHz`, 'brightGreen'));
  console.log(colorCode.colorText("📊 Load Average: ", 'brightYellow', null, 'bold') + colorCode.colorText(`${sysInfo.loadAverage[0].toFixed(2)}`, 'brightCyan'));

  // System Information
  console.log("\n" + colorCode.createBox("🖥️ INFORMASI SISTEM", 'bgCyan', 'black', 'brightCyan'));
  console.log(colorCode.colorText("🐧 Platform: ", 'brightYellow', null, 'bold') + colorCode.colorText(sysInfo.platform.toUpperCase(), 'brightGreen'));
  console.log(colorCode.colorText("🏗️ Architecture: ", 'brightYellow', null, 'bold') + colorCode.colorText(sysInfo.arch, 'brightGreen'));
  console.log(colorCode.colorText("🌐 Hostname: ", 'brightYellow', null, 'bold') + colorCode.colorText(sysInfo.hostname, 'brightCyan'));
  console.log(colorCode.colorText("🚀 Node.js: ", 'brightYellow', null, 'bold') + colorCode.colorText(sysInfo.nodeVersion, 'brightGreen'));
  console.log(colorCode.colorText("⏰ Uptime: ", 'brightYellow', null, 'bold') + colorCode.colorText(formatUptime(sysInfo.uptime), 'brightMagenta'));

  // Performance Status
  console.log("\n" + colorCode.createBox("📈 STATUS PERFORMA", 'bgYellow', 'black', 'brightYellow'));
  let performanceStatus = 'OPTIMAL';
  let performanceColor = 'brightGreen';
  
  if (memInfo.percentage > 85) {
    performanceStatus = 'KRITIS - RAM PENUH';
    performanceColor = 'brightRed';
  } else if (memInfo.percentage > 70) {
    performanceStatus = 'TINGGI - PERLU PERHATIAN';
    performanceColor = 'brightYellow';
  } else if (memInfo.percentage > 50) {
    performanceStatus = 'SEDANG - NORMAL';
    performanceColor = 'brightCyan';
  }
  
  console.log(colorCode.colorText("🎯 Status: ", 'brightYellow', null, 'bold') + colorCode.colorText(performanceStatus, performanceColor, null, 'bold'));

  console.log("\n" + colorCode.createSeparator('═', 60, 'brightCyan'));
}
