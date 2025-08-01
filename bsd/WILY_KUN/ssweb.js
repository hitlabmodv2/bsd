const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Wily } = require('../CODE_REPLAY/reply');

// Load config function
function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
    } catch (error) {
        // Silent error
    }
    return {
        bot: { mode: 'public', prefix: '.', owner: '', botNumber: '' }
    };
}

// Screenshot website function
async function screenshotWebsite(url, type = 'desktop') {
    if (!/^https?:\/\//.test(url)) {
        return {
            status: 'Gagal',
            message: 'URL tidak valid! Gunakan format yang benar (http:// atau https://)',
        };
    }

    const types = {
        desktop: { device: 'desktop', fullPage: false },
        mobile: { device: 'mobile', fullPage: false },
        full: { device: 'desktop', fullPage: true },
    };

    if (!(type in types)) {
        return {
            status: 'Gagal',
            message: 'Tipe tidak valid. Gunakan "desktop", "mobile", atau "full"',
        };
    }

    const { device, fullPage } = types[type];

    try {
        const payload = { url: url.trim(), device, fullPage };

        const res = await axios.post(
            'https://api.magickimg.com/generate/website-screenshot',
            payload,
            {
                responseType: 'arraybuffer',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': 'https://magickimg.com',
                    'Referer': 'https://magickimg.com',
                    'Accept': 'application/json, text/plain, */*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
                timeout: 60000
            }
        );

        const buffer = Buffer.from(res.data);
        const contentType = res.headers['content-type'] || 'image/png';
        const sizeKB = (res.headers['content-length'] / 1024).toFixed(2) + ' KB';

        return {
            status: 'Berhasil',
            type,
            url: payload.url,
            device,
            fullPage,
            contentType,
            size: sizeKB,
            buffer,
        };

    } catch (error) {
        return {
            status: 'Gagal',
            message: error.message || 'Terjadi kesalahan saat mengambil screenshot',
        };
    }
}

// Handler untuk command ssweb
async function handleSswebCommand(sock, msg) {
    try {
        // Load config untuk cek mode
        const config = loadConfig();

        // Get sender info
        const senderJid = msg.key.remoteJid;
        const botNumber = sock.user?.id?.split(':')[0];

        let actualSenderNumber;
        if (msg.key.participant) {
            actualSenderNumber = msg.key.participant.split('@')[0];
        } else if (msg.key.fromMe) {
            actualSenderNumber = botNumber;
        } else {
            actualSenderNumber = senderJid?.split('@')[0];
        }

        // Check mode access
        if (config.bot?.mode === 'self') {
            const isFromMe = msg.key.fromMe === true;
            const isBotNumber = actualSenderNumber === botNumber;
            const isOwnerNumber = actualSenderNumber === config.bot?.owner;
            const isBotNumberFromConfig = actualSenderNumber === config.bot?.botNumber;
            const isHardcodedBot = actualSenderNumber === '6289681008411';

            const isAuthorizedUser = isFromMe || isBotNumber || isOwnerNumber || isBotNumberFromConfig || isHardcodedBot;

            if (!isAuthorizedUser) {
                return;
            }
        }

        // Parse command arguments
        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || 
                          msg.message?.imageMessage?.caption || '';

        const args = messageText.trim().split(' ');

        if (args.length < 2) {
            const helpText = `❌ *FORMAT COMMAND SALAH!*

📝 *Cara penggunaan:*
${config.bot.prefix}ssweb <url> [type]

🌐 *Contoh:*
${config.bot.prefix}ssweb https://google.com
${config.bot.prefix}ssweb https://google.com desktop
${config.bot.prefix}ssweb https://google.com mobile
${config.bot.prefix}ssweb https://google.com full

📋 *Tipe Screenshot:*
• *desktop* - Screenshot tampilan desktop (default)
• *mobile* - Screenshot tampilan mobile
• *full* - Screenshot halaman penuh (fullpage)

⚠️ *Catatan:*
• URL harus lengkap dengan http:// atau https://
• Proses screenshot membutuhkan waktu 10-30 detik
• Support semua website yang dapat diakses public

💡 *Tips:*
• Gunakan type "full" untuk capture seluruh halaman
• Type "mobile" untuk melihat tampilan mobile website
• Type "desktop" untuk tampilan normal website`;

            // Import ReplyRynzz function
            await Wily(sock, msg, helpText);
            return;
        }

        const url = args[1];
        const type = args[2] || 'desktop';

        // Validasi URL format
        if (!/^https?:\/\//.test(url)) {
            const errorText = `❌ *URL TIDAK VALID!*

🚫 URL harus dimulai dengan http:// atau https://

📝 *Format yang benar:*
• https://google.com
• http://example.com
• https://www.github.com

💡 *Contoh penggunaan:*
${config.bot.prefix}ssweb https://google.com
${config.bot.prefix}ssweb https://youtube.com mobile`;

            await Wily(sock, msg, errorText);
            return;
        }

        // Validasi type
        const validTypes = ['desktop', 'mobile', 'full'];
        if (!validTypes.includes(type.toLowerCase())) {
            const typeErrorText = `❌ *TIPE SCREENSHOT TIDAK VALID!*

📋 *Tipe yang tersedia:*
• *desktop* - Tampilan desktop normal
• *mobile* - Tampilan mobile responsive  
• *full* - Screenshot halaman penuh

💡 *Contoh yang benar:*
${config.bot.prefix}ssweb ${url} desktop
${config.bot.prefix}ssweb ${url} mobile
${config.bot.prefix}ssweb ${url} full`;

            await Wily(sock, msg, typeErrorText);
            return;
        }

        // Kirim pesan loading
        const loadingText = `⏳ *MENGAMBIL SCREENSHOT...*

🌐 *URL:* ${url}
📱 *Type:* ${type.toUpperCase()}
⏱️ *Status:* Memproses screenshot...

🔄 *Estimasi:* 10-30 detik
💻 *Device:* ${type === 'mobile' ? 'Mobile View' : 'Desktop View'}
📄 *Mode:* ${type === 'full' ? 'Full Page' : 'Viewport Only'}

⏳ Mohon tunggu, sedang mengambil screenshot website...`;

        await Wily(sock, msg, loadingText);

        // Ambil screenshot
        const result = await screenshotWebsite(url, type.toLowerCase());

        if (result.status === 'Berhasil') {
            // Kirim hasil screenshot
            const successText = `✅ *SCREENSHOT BERHASIL DIAMBIL!*

🌐 *Website Info:*
├─ URL: ${result.url}
├─ Device: ${result.device.toUpperCase()}
├─ Type: ${type.toUpperCase()}
├─ Full Page: ${result.fullPage ? 'Ya' : 'Tidak'}
└─ Size: ${result.size}

📊 *Technical Details:*
├─ Content Type: ${result.contentType}
├─ Resolution: ${result.device === 'mobile' ? '375x667' : '1920x1080'} 
├─ Format: PNG
└─ Quality: High Definition

📱 *Screenshot Mode:*
${type === 'desktop' ? '🖥️ Desktop - Tampilan normal website' : 
  type === 'mobile' ? '📱 Mobile - Tampilan responsive mobile' : 
  '📄 Full Page - Capture seluruh halaman website'}

⚡ *Processing Time:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
🤖 *WilyKun Bot - Website Screenshot Tool*`;

            await sock.sendMessage(senderJid, {
                image: result.buffer,
                caption: successText
            }, { quoted: msg });

        } else {
            // Kirim pesan error
            let errorMessage = '❌ Gagal mengambil screenshot website';

            if (result.message.includes('URL')) {
                errorMessage = '❌ URL tidak valid atau tidak dapat diakses';
            } else if (result.message.includes('timeout')) {
                errorMessage = '❌ Timeout - Website terlalu lama merespon';
            } else if (result.message.includes('Tipe')) {
                errorMessage = '❌ Tipe screenshot tidak valid';
            }

            const errorText = `${errorMessage}

🔧 *Detail Error:* ${result.message}

💡 *Solusi Troubleshooting:*
• Pastikan URL dapat diakses di browser
• Coba gunakan URL lengkap (https://)
• Periksa ejaan URL dengan benar
• Tunggu beberapa saat lalu coba lagi

🌐 *Tips URL Valid:*
• https://google.com ✅
• https://www.youtube.com ✅
• http://example.com ✅
• google.com ❌ (harus ada http/https)

📋 *Format Command:*
${config.bot.prefix}ssweb <url> [desktop/mobile/full]

🔄 *Coba lagi dengan URL yang valid!*`;

            await Wily(sock, msg, errorText);
        }

    } catch (error) {
        const criticalErrorText = `❌ *SISTEM ERROR CRITICAL*

🚫 Terjadi kesalahan sistem kritis

🔧 *Error Details:*
• Core system malfunction
• Network connectivity problem
• API service unavailable

💡 *Emergency Solutions:*
• Coba lagi dalam beberapa menit
• Periksa koneksi internet
• Contact admin jika masalah berlanjut

🤖 Screenshot service memerlukan koneksi stabil`;

        await Wily(sock, msg, criticalErrorText);
    }
}

module.exports = {
    handleSswebCommand,
    screenshotWebsite
};