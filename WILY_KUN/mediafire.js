const axios = require('axios');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { Wily } = require('../CODE_REPLAY/reply.js');

// Load configuration
function loadConfig() {
    try {
        const configData = fs.readFileSync('./config.json', 'utf8');
        return JSON.parse(configData);
    } catch (error) {
        return {
            bot: {
                mode: "public",
                prefix: ".",
                owner: "6289681008411",
                botNumber: "6282263096788"
            }
        };
    }
}

// Check bot mode and permissions
function checkPermissions(senderJid, config) {
    const senderNumber = senderJid.replace('@s.whatsapp.net', '');
    const ownerNumber = config.bot.owner;
    const botNumber = config.bot.botNumber;

    if (config.bot.mode === "self") {
        return senderNumber === ownerNumber || senderNumber === botNumber;
    }

    return true; // public mode allows everyone
}

// Get current Jakarta time with detailed info
function getJakartaTimeInfo() {
    const now = new Date();
    const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                       'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const dayName = dayNames[jakartaTime.getDay()];
    const date = jakartaTime.getDate();
    const monthName = monthNames[jakartaTime.getMonth()];
    const year = jakartaTime.getFullYear();
    const time = jakartaTime.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Jakarta' 
    });

    const hour = jakartaTime.getHours();
    let greeting;
    if (hour >= 4 && hour < 10) greeting = '🌅 Selamat Pagi';
    else if (hour >= 10 && hour < 15) greeting = '☀️ Selamat Siang';
    else if (hour >= 15 && hour < 18) greeting = '🌤️ Selamat Sore';
    else if (hour >= 18 && hour < 21) greeting = '🌆 Selamat Petang';
    else greeting = '🌙 Selamat Malam';

    return {
        dayName,
        date,
        monthName,
        year,
        time,
        greeting,
        fullDate: `${dayName}, ${date} ${monthName} ${year}`,
        fullDateTime: `${dayName}, ${date} ${monthName} ${year} • ${time} WIB`
    };
}

async function mediafireScraper(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });
        const html = response.data;

        // Multiple patterns to extract download link
        let downloadUrl = null;

        // Pattern 1: Original popsok class
        let downloadMatch = html.match(/href="([^"]*)" class="popsok"/);
        if (downloadMatch) {
            downloadUrl = downloadMatch[1];
        }

        // Pattern 2: Download button with aria-label
        if (!downloadUrl) {
            downloadMatch = html.match(/href="([^"]*)"[^>]*aria-label="Download file"/);
            if (downloadMatch) {
                downloadUrl = downloadMatch[1];
            }
        }

        // Pattern 3: Download link in script
        if (!downloadUrl) {
            downloadMatch = html.match(/window\.location\.href\s*=\s*["']([^"']*mediafire[^"']*download[^"']*)["']/);
            if (downloadMatch) {
                downloadUrl = downloadMatch[1];
            }
        }

        // Pattern 4: Direct download URL pattern
        if (!downloadUrl) {
            downloadMatch = html.match(/https?:\/\/[^"'\s]*mediafire[^"'\s]*\/download[^"'\s]*/);
            if (downloadMatch) {
                downloadUrl = downloadMatch[0];
            }
        }

        // Pattern 5: Alternative download button pattern
        if (!downloadUrl) {
            downloadMatch = html.match(/<a[^>]*class="[^"]*download[^"]*"[^>]*href="([^"]*)"[^>]*>/i);
            if (downloadMatch) {
                downloadUrl = downloadMatch[1];
            }
        }

        if (!downloadUrl) {
            throw new Error('Download link not found - MediaFire may have changed their layout');
        }

        // Extract file info with multiple patterns
        let fileName = 'Unknown';
        let fileSize = 'Unknown';
        let uploadDate = 'Unknown';

        // File name extraction
        const namePatterns = [
            /<div class="dl-btn-label" title="([^"]*)">/, 
            /<div class="filename">([^<]*)<\/div>/,
            /<span class="[^"]*filename[^"]*">([^<]*)<\/span>/,
            /<h1[^>]*>([^<]*)<\/h1>/,
            /Download ([^<\n]*)/
        ];

        for (const pattern of namePatterns) {
            const match = html.match(pattern);
            if (match && match[1].trim()) {
                fileName = match[1].trim();
                break;
            }
        }

        // File size extraction
        const sizePatterns = [
            /<div class="details">.*?<li>File size: <span>([^<]*)<\/span><\/li>/s,
            /File size:\s*<[^>]*>([^<]*)<\/[^>]*>/,
            /Size:\s*([0-9.]+\s*[KMGT]?B)/i,
            /\(([0-9.]+\s*[KMGT]?B)\)/i
        ];

        for (const pattern of sizePatterns) {
            const match = html.match(pattern);
            if (match && match[1].trim()) {
                fileSize = match[1].trim();
                break;
            }
        }

        // Upload date extraction
        const datePatterns = [
            /<div class="details">.*?<li>Uploaded: <span title="[^"]*">([^<]*)<\/span><\/li>/s,
            /Uploaded:\s*<[^>]*>([^<]*)<\/[^>]*>/,
            /Upload date:\s*([^<\n]*)/i
        ];

        for (const pattern of datePatterns) {
            const match = html.match(pattern);
            if (match && match[1].trim()) {
                uploadDate = match[1].trim();
                break;
            }
        }

        return {
            success: true,
            data: {
                name: fileName,
                size: fileSize,
                uploadDate: uploadDate,
                downloadUrl: downloadUrl
            }
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function downloadFile(url, filename) {
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const tempDir = './temp';
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }

        const filePath = path.join(tempDir, filename);
        const writer = fs.createWriteStream(filePath);

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(filePath));
            writer.on('error', reject);
        });
    } catch (error) {
        throw new Error(`Download failed: ${error.message}`);
    }
}

async function createZip(filePath, originalName) {
    try {
        const zipPath = filePath + '.zip';
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.pipe(output);
        archive.file(filePath, { name: originalName });
        await archive.finalize();

        return new Promise((resolve, reject) => {
            output.on('close', () => resolve(zipPath));
            output.on('error', reject);
        });
    } catch (error) {
        throw new Error(`ZIP creation failed: ${error.message}`);
    }
}

async function handleMediaFireCommand(sock, msg) {
    const config = loadConfig();
    const senderJid = msg.key.remoteJid;

    // Check permissions
    if (!checkPermissions(senderJid, config)) {
        return; // Silent return for unauthorized users in self mode
    }

    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const args = text.split(' ');

    if (args.length < 2) {
        const timeInfo = getJakartaTimeInfo();
        const exampleMessage = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃ 🔗 *MEDIAFIRE DOWNLOADER* 🔗
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

📋 *Cara Penggunaan:*
${config.bot.prefix}mediafire [url]

💡 *Contoh:*
${config.bot.prefix}mediafire https://www.mediafire.com/file/example

✨ *Fitur:*
• Download file dari MediaFire
• Otomatis di-zip untuk kemudahan
• Support semua jenis file
• No access limit

⏰ *Dibuat:* ${timeInfo.fullDateTime}
${timeInfo.greeting}

_Masukkan URL MediaFire yang valid!_`;

        return await Wily(exampleMessage, msg, sock);
    }

    const url = args[1];

    if (!url.includes('mediafire.com')) {
        const timeInfo = getJakartaTimeInfo();
        const errorMessage = `❌ *URL TIDAK VALID!*

🔗 Gunakan URL MediaFire yang benar
⏰ ${timeInfo.fullDateTime}

*Contoh URL yang benar:*
https://www.mediafire.com/file/...`;

        return await Wily(errorMessage, msg, sock);
    }

    try {
        const timeInfo = getJakartaTimeInfo();

        // Send simple loading message
        const loadingMessage = `⏳ *Menganalisis MediaFire...*`;
        await Wily(loadingMessage, msg, sock);

        // Scrape MediaFire with retry mechanism
        let result = await mediafireScraper(url);

        // Retry once if failed
        if (!result.success) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            result = await mediafireScraper(url);
        }

        if (!result.success) {
            const errorMessage = `❌ *Error:* ${result.error}\n\n_Pastikan URL MediaFire valid dan file masih tersedia._`;
            return await Wily(errorMessage, msg, sock);
        }

        const { name, size, uploadDate, downloadUrl } = result.data;

        // Send simple download message
        const downloadMessage = `📁 *${name}*\n⏳ Mengunduh...`;
        await Wily(downloadMessage, msg, sock);

        // Download file
        const filePath = await downloadFile(downloadUrl, name);

        // Get actual file size
        const fileStats = fs.statSync(filePath);
        const actualFileSize = formatFileSize(fileStats.size);

        // Create ZIP
        const zipPath = await createZip(filePath, name);

        // Get ZIP file size
        const zipStats = fs.statSync(zipPath);
        const zipFileSize = formatFileSize(zipStats.size);

        // Send ZIP file
        await sock.sendMessage(senderJid, {
            document: fs.readFileSync(zipPath),
            fileName: `${name}.zip`,
            mimetype: 'application/zip'
        }, { quoted: msg });

        // Simple success message
        const successMessage = `✅ *Download Berhasil!*

📁 *File:* ${name}
📦 *ZIP Size:* ${zipFileSize}
💾 *Original:* ${actualFileSize}`;

        await Wily(successMessage, msg, sock);

        // Cleanup temporary files
        try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        } catch (cleanupError) {
            // Silent cleanup
        }

    } catch (error) {
        const errorMessage = `❌ *Error:* ${error.message}`;
        await Wily(errorMessage, msg, sock);
    }
}

module.exports = { handleMediaFireCommand };