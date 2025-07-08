const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Wily } = require('../CODE_REPLAY/reply');

const { Sticker, StickerTypes } = require('wa-sticker-formatter');


// Load config function
function loadConfig() {
    try {
        const configPath = path.join(__dirname, '../config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
    } catch (error) {
        return {
            bot: {
                mode: 'self',
                prefix: '.',
                owner: '',
                botNumber: ''
            }
        };
    }
}

// Check access permission based on bot mode and user number from config.json
function checkAccess(senderNumber, config) {
    if (!config || !config.bot) return false;

    const botMode = config.bot.mode || 'self';
    const ownerNumber = config.bot.owner || '';
    const botNumber = config.bot.botNumber || '';

    // Remove @s.whatsapp.net if present
    const cleanSender = senderNumber.replace('@s.whatsapp.net', '');
    const cleanOwner = ownerNumber.replace('@s.whatsapp.net', '');
    const cleanBot = botNumber.replace('@s.whatsapp.net', '');

    if (botMode === 'self') {
        // Only owner and bot number can use
        return cleanSender === cleanOwner || cleanSender === cleanBot;
    } else if (botMode === 'public') {
        // Everyone can use
        return true;
    }

    return false;
}

async function handleBratCommand(sock, msg, command) {
    try {
        const config = loadConfig();
        const isAnimated = command === 'bratanimasi';

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

        // Check access permission
        const hasAccess = checkAccess(actualSenderNumber, config);

        if (!hasAccess) {
            // In self mode, bot doesn't respond to unauthorized users
            if (config.bot?.mode === 'self') {
                return;
            }
        }

        // Get text from message
        const messageText = msg.message?.conversation || 
                           msg.message?.extendedTextMessage?.text || '';

        const prefix = config.bot?.prefix || '.';
        const commandText = `${prefix}${command}`;

        if (!messageText.startsWith(commandText)) return;

        const text = messageText.replace(commandText, '').trim();

        // Show help if no text provided
        if (!text) {
            const helpText = `╭━━━『 *BRAT GENERATOR* 』━━━❀
┃ 📝 Cara menggunakan:
┃ 
┃ 🎨 *Sticker Mode:*
┃ • ${prefix}brat [text]
┃ • Membuat sticker brat style
┃ 
┃ 🎬 *Animasi Mode:*
┃ • ${prefix}bratanimasi [text]
┃ • Membuat gif animasi brat style
┃ 
┃ 💡 *Contoh penggunaan:*
┃ • ${prefix}brat hello world
┃ • ${prefix}bratanimasi charli xcx
┃ • ${prefix}brat ini adalah brat
┃
┃ ✨ Generate brat style text
┃ 🎭 Source: SiputzxAPI
╰━━━━━━━━━━━━━━━❀
_Masukkan text untuk generate brat style!_`;

            await Wily(helpText, msg, sock);
            return;
        }

        // Validate text length
        if (text.length > 100) {
            await Wily('❌ Text terlalu panjang! Maksimal 100 karakter.', msg, sock);
            return;
        }


        // Send loading message using ReplyRynzz
        const loadingText = `⏳ Sedang membuat ${isAnimated ? 'animasi' : 'sticker'} brat untuk: "${text}"...\n\n_Tunggu sebentar, sedang memproses..._`;
        await Wily(loadingText, msg, sock);

        try {
            // Generate brat using API
            const apiUrl = `https://api.siputzx.my.id/api/m/brat`;
            const response = await axios.get(apiUrl, {
                params: {
                    text: text,
                    isAnimated: isAnimated,
                    delay: isAnimated ? 500 : undefined
                },
                timeout: 30000,
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.data) {
                throw new Error('No data received from API');
            }

            const buffer = Buffer.from(response.data);

            if (isAnimated) {
                // Send as animated sticker (GIF)
                try {
                    const sticker = new Sticker(buffer, {
                        pack: config.sticker?.packname || 'Brat Animasi Generator',
                        author: config.sticker?.author || '© WilyKun',
                        type: StickerTypes.FULL,
                        categories: ['🎬'],
                        quality: 95,
                        background: 'transparent'
                    });

                    const stickerBuffer = await sticker.toBuffer();

                    await sock.sendMessage(msg.key.remoteJid, { 
                        sticker: stickerBuffer,
                        mimetype: 'image/webp'
                    }, { quoted: msg });

                } catch (stickerError) {
                    // Fallback: send as GIF
                    const caption = `╭━━━『 *BRAT ANIMASI* 』━━━❀
┃ 🎬 Text: ${text}
┃ 📱 Type: Animated GIF
┃ ⚡ Delay: 500ms
┃ 🎨 Style: Brat Aesthetic
╰━━━━━━━━━━━━━━━❀
_Powered by SiputzxAPI_`;

                    await sock.sendMessage(msg.key.remoteJid, {
                        video: buffer,
                        gifPlayback: true,
                        caption: caption
                    }, { quoted: msg });
                }

            } else {
                // Send as static sticker
                const sticker = new Sticker(buffer, {
                    pack: config.sticker?.packname || 'Brat Generator',
                    author: config.sticker?.author || '© WilyKun',
                    type: StickerTypes.FULL,
                    categories: ['🎨'],
                    quality: 95,
                    background: 'transparent'
                });

                const stickerBuffer = await sticker.toBuffer();

                await sock.sendMessage(msg.key.remoteJid, { 
                    sticker: stickerBuffer,
                    mimetype: 'image/webp'
                }, { quoted: msg });
            }

        } catch (apiError) {
            let errorMessage = '';

            if (apiError.code === 'ECONNABORTED' || apiError.message.includes('timeout')) {
                errorMessage = '⏰ Koneksi timeout! Server API sedang sibuk, coba lagi nanti.';
            } else if (apiError.response && apiError.response.status === 404) {
                errorMessage = '❌ API endpoint tidak ditemukan! Mungkin sedang maintenance.';
            } else if (apiError.response && apiError.response.status === 500) {
                errorMessage = '❌ Server API bermasalah! Coba lagi dalam beberapa menit.';
            } else {
                errorMessage = `❌ Gagal generate brat: ${apiError.message}\n\n💡 Coba:\n• Gunakan text yang lebih pendek\n• Coba lagi dalam beberapa saat\n• Pastikan koneksi stabil`;
            }

            await Wily(errorMessage, msg, sock);
        }

    } catch (error) {
        const errorText = `❌ Terjadi kesalahan sistem: ${error.message}\n\n🔄 Silakan coba lagi!`;
        await Wily(errorText, msg, sock);
    }
}

module.exports = {
    handleBratCommand
};