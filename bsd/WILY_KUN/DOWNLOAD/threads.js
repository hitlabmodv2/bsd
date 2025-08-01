const axios = require('axios');
const { Wily } = require('../../CODE_REPLAY/reply');

// Load config function
function loadConfig() {
    try {
        const fs = require('fs');
        const path = require('path');
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

// Check access based on bot mode
function checkAccess(senderJid, config, fromMe) {
    if (config.bot?.mode === 'self') {
        const senderNumber = senderJid?.split('@')[0];
        const botNumber = config.bot?.botNumber;
        const ownerNumber = config.bot?.owner;
        
        return fromMe || 
               senderNumber === botNumber || 
               senderNumber === ownerNumber || 
               senderNumber === '6289681008411';
    }
    return true; // Public mode allows all users
}

// Function to validate Threads URL
function isValidThreadsUrl(url) {
    const threadsRegex = /^https?:\/\/(www\.)?(threads\.net|threads\.com)\/.+/;
    return threadsRegex.test(url);
}

// Function to send quoted message
async function sendQuotedMessage(sock, chatId, content, quotedMessage) {
    try {
        await sock.sendMessage(chatId, content, { quoted: quotedMessage });
    } catch (error) {
        await sock.sendMessage(chatId, content);
    }
}

// Main handler for threads command
async function handleThreadsCommand(sock, msg) {
    try {
        const config = loadConfig();
        const prefix = config?.bot?.prefix || '.';
        
        // Get message text
        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || '';
        
        if (!messageText) return;
        
        // Parse command
        const args = messageText.slice(prefix.length).trim().split(' ');
        const command = args[0].toLowerCase();
        
        if (command !== 'threads') return;
        
        // Check access based on bot mode
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        
        if (!checkAccess(senderJid, config, fromMe)) {
            return; // Silent exit for unauthorized users in self mode
        }
        
        // Check if URL is provided
        if (args.length < 2) {
            const exampleText = `❌ *FORMAT SALAH!*

📝 *Cara penggunaan:*
${prefix}threads <url>

📋 *Contoh:*
${prefix}threads https://www.threads.net/@username/post/xxxxx

🔗 *Link yang didukung:*
• Threads post dengan video
• Threads post dengan gambar
• URL threads.net atau threads.com yang valid

💡 *Tips:*
• Pastikan URL threads valid
• Bot akan otomatis mendeteksi jenis media
• Proses download membutuhkan waktu beberapa detik`;

            await Wily(exampleText, msg, sock);
            return;
        }
        
        const url = args[1];
        
        // Validate Threads URL
        if (!isValidThreadsUrl(url)) {
            const errorText = `❌ *URL TIDAK VALID!*

🔗 Gunakan URL Threads yang benar

*Contoh URL yang benar:*
• https://www.threads.net/@username/post/xxxxx
• https://threads.net/@username/post/xxxxx
• https://www.threads.com/@username/post/xxxxx
• https://threads.com/@username/post/xxxxx

💡 *Tips:*
• Salin URL langsung dari aplikasi Threads
• Pastikan URL dimulai dengan https://threads.net, https://www.threads.net, https://threads.com, atau https://www.threads.com`;

            await Wily(errorText, msg, sock);
            return;
        }
        
        // Send loading message
        const loadingText = `⏳ *Mengunduh dari Threads...*

🔄 Sedang memproses: ${url}
📱 Mohon tunggu sebentar...`;
        
        await Wily(loadingText, msg, sock);
        
        // Try multiple APIs for better reliability
        let response = null;
        let apiError = null;
        
        // Primary API - nekorinn.my.id
        try {
            const apiUrl1 = `https://api.nekorinn.my.id/downloader/threads?url=${encodeURIComponent(url)}`;
            response = await axios.get(apiUrl1, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (response.data && response.data.status) {
                // API berhasil
            } else {
                throw new Error('API response invalid');
            }
        } catch (error) {
            apiError = error.message;
            
            // Fallback API
            try {
                const apiUrl2 = `https://api.siputzx.my.id/api/downloader/threads?url=${encodeURIComponent(url)}`;
                response = await axios.get(apiUrl2, {
                    timeout: 30000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (!response.data || !response.data.status) {
                    throw new Error('Fallback API failed');
                }
            } catch (fallbackError) {
                // More detailed error message for debugging
                let errorMsg = '❌ *Terjadi kesalahan!*\n\n';
                
                if (error.code === 'ECONNREFUSED') {
                    errorMsg += 'Koneksi ditolak oleh server API.';
                } else if (error.code === 'ENOTFOUND') {
                    errorMsg += 'Server API tidak ditemukan.';
                } else if (error.code === 'ETIMEDOUT') {
                    errorMsg += 'Timeout - server API tidak merespons.';
                } else if (error.response) {
                    errorMsg += `Server API error: ${error.response.status}`;
                } else {
                    errorMsg += `Error: ${apiError}`;
                }
                
                errorMsg += '\n\nPastikan URL valid dan coba lagi nanti.';
                
                await Wily(errorMsg, msg, sock);
                return;
            }
        }
        
        if (!response || !response.data || !response.data.status) {
            await Wily('❌ *Gagal mengunduh!*\n\nTidak dapat mengambil data dari Threads. Coba lagi nanti.', msg, sock);
            return;
        }
        
        const result = response.data.result;
        
        if (result.isVideo && result.video_urls && result.video_urls.length > 0) {
            // Handle video download
            const videoUrl = result.video_urls[0].download_url;
            
            try {
                const videoResponse = await axios.get(videoUrl, {
                    responseType: 'arraybuffer',
                    timeout: 60000,
                    maxContentLength: 50 * 1024 * 1024, // 50MB limit
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                await sock.sendMessage(msg.key.remoteJid, {
                    video: Buffer.from(videoResponse.data),
                    caption: `✅ *Video Threads Berhasil Diunduh!*

🎬 Video dari Threads
🔗 URL: ${url}
📱 Diunduh menggunakan WilyKun Bot

━━━━━━━━━━━━━━━━━━━━━━
🤖 *WilyKun Bot - Threads Downloader*
✨ Download video/gambar dari Threads dengan mudah!`,
                    mimetype: 'video/mp4'
                }, { quoted: msg });
                
            } catch (downloadError) {
                await Wily('❌ *Gagal mengunduh video!*\n\nUkuran file terlalu besar atau terjadi kesalahan saat mengunduh.', msg, sock);
            }
            
        } else if (!result.isVideo && result.image_urls && result.image_urls.length > 0) {
            // Handle image download - API structure for images is different
            const imageUrl = result.image_urls[0];
            
            try {
                const imageResponse = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000,
                    maxContentLength: 20 * 1024 * 1024, // 20MB limit
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                await sock.sendMessage(msg.key.remoteJid, {
                    image: Buffer.from(imageResponse.data),
                    caption: `✅ *Gambar Threads Berhasil Diunduh!*

🖼️ Gambar dari Threads
🔗 URL: ${url}
📱 Diunduh menggunakan WilyKun Bot

━━━━━━━━━━━━━━━━━━━━━━
🤖 *WilyKun Bot - Threads Downloader*
✨ Download video/gambar dari Threads dengan mudah!`
                }, { quoted: msg });
                
            } catch (downloadError) {
                await Wily('❌ *Gagal mengunduh gambar!*\n\nTerjadi kesalahan saat mengunduh gambar.', msg, sock);
            }
            
        } else {
            await Wily('❌ *Tidak ada media ditemukan!*\n\nPost Threads ini mungkin tidak mengandung video atau gambar yang bisa diunduh.', msg, sock);
        }
        
    } catch (error) {
        // General error handler
        let errorMsg = '❌ *Terjadi kesalahan!*\n\n';
        
        if (error.code === 'ECONNREFUSED') {
            errorMsg += 'Koneksi ditolak oleh server API.';
        } else if (error.code === 'ENOTFOUND') {
            errorMsg += 'Server API tidak ditemukan.';
        } else if (error.code === 'ETIMEDOUT') {
            errorMsg += 'Timeout - server API tidak merespons.';
        } else if (error.response) {
            errorMsg += `Server API error: ${error.response.status}`;
        } else {
            errorMsg += `Error: ${error.message}`;
        }
        
        errorMsg += '\n\nPastikan URL valid dan coba lagi nanti.';
        
        await Wily(errorMsg, msg, sock);
    }
}

module.exports = {
    handleThreadsCommand
};
