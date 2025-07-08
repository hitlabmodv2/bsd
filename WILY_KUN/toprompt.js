const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const FormData = require('form-data');
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

// Check access permission based on bot mode
function checkAccess(senderNumber, config, fromMe = false) {
    if (!config || !config.bot) return true;

    const botMode = config.bot.mode || 'self';
    const ownerNumber = config.bot.owner || '';
    const botNumber = config.bot.botNumber || '';

    const cleanSender = senderNumber.replace('@s.whatsapp.net', '');
    const cleanOwner = ownerNumber.replace('@s.whatsapp.net', '');
    const cleanBot = botNumber.replace('@s.whatsapp.net', '');

    if (botMode === 'self') {
        if (fromMe) return true;
        return cleanSender === cleanOwner || cleanSender === cleanBot || cleanSender === '6289681008411';
    } else if (botMode === 'public') {
        return true;
    }

    return false;
}

// Upload to Uguu.se
async function uploadToUguu(buffer, filename) {
    try {
        const form = new FormData();
        form.append('files[]', buffer, { filename });

        const { data } = await axios.post('https://uguu.se/upload.php', form, {
            headers: form.getHeaders(),
            timeout: 30000
        });

        if (data.files && data.files[0]) {
            return data.files[0].url;
        } else {
            throw new Error('Gagal upload ke uguu.se');
        }
    } catch (error) {
        throw new Error('Error upload gambar: ' + error.message);
    }
}

// Reply function
async function ReplyRynzz(text, msg, sock) {
    await sock.sendMessage(msg.key.remoteJid, {
        text: text
    }, { quoted: msg });
}

// INTERNAL COMMAND HANDLER - Menggunakan if statement seperti yang diminta
async function handleTopromptCommand(sock, msg) {
    try {
        const config = loadConfig();
        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || 
                          msg.message?.imageMessage?.caption || '';

        if (!messageText) return false;

        const prefix = config?.bot?.prefix || '.';
        const args = messageText.slice(prefix.length).trim().split(' ');
        const command = args[0].toLowerCase();

        // INTERNAL COMMAND CHECK - Case toprompt seperti yang diminta
        if (command === 'toprompt') {
            // Get sender information
            const senderJid = msg.key.participant || msg.key.remoteJid;
            const fromMe = msg.key.fromMe;

            // Check access permission
            if (!checkAccess(senderJid, config, fromMe)) {
                // Mode self, bot diam saja
                return true;
            }

            // Jika hanya ketik .toprompt tanpa gambar, tampilkan contoh
            if (args.length === 1 && !msg.message?.imageMessage && !msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                const exampleText = `
🖼️ *TOPROMPT - IMAGE TO PROMPT*

📝 *Cara Penggunaan:*
• Kirim gambar dengan caption \`.toprompt\`
• Reply gambar dengan \`.toprompt\`

✨ *Fitur ini menganalisis gambar dan mengubahnya menjadi prompt AI yang detail*

💡 *Contoh:*
\`\`\`
.toprompt
\`\`\`
(kirim dengan gambar atau reply gambar)
`;
                await ReplyRynzz(exampleText, msg, sock);
                return true;
            }

            // Cek apakah ada gambar
            let imageMessage = null;
            let messageToProcess = null;

            // Cek gambar dengan caption
            if (msg.message?.imageMessage) {
                imageMessage = msg.message.imageMessage;
                messageToProcess = msg;
            }
            // Cek reply gambar
            else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                imageMessage = msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
                messageToProcess = {
                    key: msg.key,
                    message: {
                        imageMessage: imageMessage
                    }
                };
            }

            if (!imageMessage) {
                const noImageText = `
❌ *GAMBAR TIDAK DITEMUKAN!*

📝 *Cara yang benar:*
• Kirim gambar dengan caption \`.toprompt\`
• Reply gambar dengan \`.toprompt\`

💡 *Pastikan Anda mengirim atau membalas gambar!*
`;
                await ReplyRynzz(noImageText, msg, sock);
                return true;
            }

            // Processing message
            await ReplyRynzz(`⏳ *MEMPROSES GAMBAR...*\n\n🔄 Menganalisis gambar untuk membuat prompt AI\n📤 Mengupload gambar...\n🤖 Generating prompt...`, msg, sock);

            // Download media
            let buffer;
            try {
                buffer = await downloadMediaMessage(
                    messageToProcess,
                    'buffer',
                    {},
                    { 
                        logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
                    }
                );
            } catch (downloadError) {
                await ReplyRynzz('❌ *GAGAL MENGUNDUH GAMBAR!*\n\nTidak dapat mengunduh gambar.\nSilakan coba lagi!', msg, sock);
                return true;
            }

            if (!buffer || buffer.length === 0) {
                await ReplyRynzz('❌ *BUFFER GAMBAR KOSONG!*\n\nGambar tidak dapat diproses.\nSilakan coba dengan gambar lain!', msg, sock);
                return true;
            }

            // Upload ke uguu.se
            const filename = `toprompt_${Date.now()}.jpg`;
            let imageUrl;
            try {
                imageUrl = await uploadToUguu(buffer, filename);
            } catch (uploadError) {
                await ReplyRynzz(`❌ *GAGAL UPLOAD GAMBAR!*\n\n${uploadError.message}\nSilakan coba lagi!`, msg, sock);
                return true;
            }

            // Ambil prompt dari API
            try {
                const apiUrl = `https://zenzxz.dpdns.org/tools/toprompt?url=${encodeURIComponent(imageUrl)}`;
                const response = await axios.get(apiUrl, { timeout: 30000 });

                if (!response.data.status) {
                    await ReplyRynzz('❌ *API ERROR!*\n\nGagal menganalisis gambar.\nSilakan coba lagi!', msg, sock);
                    return true;
                }

                const result = response.data.result;
                const resultText = `
🖼️ *TOPROMPT - HASIL ANALISIS*

📝 *Prompt AI Generated:*
\`\`\`
${result}
\`\`\`

✅ *Gambar berhasil dianalisis dan diubah menjadi prompt AI!*
💡 *Gunakan prompt ini untuk generate gambar dengan AI*
`;

                await ReplyRynzz(resultText, msg, sock);

            } catch (apiError) {
                await ReplyRynzz('❌ *GAGAL MENGANALISIS GAMBAR!*\n\nTerjadi kesalahan saat memproses.\nSilakan coba lagi!', msg, sock);
            }

            return true;
        }

        return false; // Bukan command toprompt

    } catch (error) {
        console.error('Toprompt Error:', error);
        await ReplyRynzz('❌ *TERJADI KESALAHAN!*\n\nGagal memproses toprompt.\nSilakan coba lagi!', msg, sock);
        return true;
    }
}

// Handler untuk caption gambar - dipanggil dari Wilykun.js
async function handleTopromptCaption(sock, msg) {
    try {
        const config = loadConfig();

        // Cek akses permission
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fromMe = msg.key.fromMe;

        if (!checkAccess(senderJid, config, fromMe)) {
            return false; // Mode self, bot diam saja
        }

        // Pastikan ada gambar dengan caption .toprompt
        if (!msg.message?.imageMessage?.caption) {
            return false;
        }

        const prefix = config?.bot?.prefix || '.';
        const caption = msg.message.imageMessage.caption.trim();

        if (caption !== `${prefix}toprompt`) {
            return false;
        }

        // Processing message
        await ReplyRynzz(`⏳ *MEMPROSES GAMBAR...*\n\n🔄 Menganalisis gambar untuk membuat prompt AI\n📤 Mengupload gambar...\n🤖 Generating prompt...`, msg, sock);

        // Download media
        let buffer;
        try {
            buffer = await downloadMediaMessage(
                msg,
                'buffer',
                {},
                { 
                    logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
                }
            );
        } catch (downloadError) {
            await ReplyRynzz('❌ *GAGAL MENGUNDUH GAMBAR!*\n\nTidak dapat mengunduh gambar.\nSilakan coba lagi!', msg, sock);
            return true;
        }

        if (!buffer || buffer.length === 0) {
            await ReplyRynzz('❌ *BUFFER GAMBAR KOSONG!*\n\nGambar tidak dapat diproses.\nSilakan coba dengan gambar lain!', msg, sock);
            return true;
        }

        // Upload ke uguu.se
        const filename = `toprompt_${Date.now()}.jpg`;
        let imageUrl;
        try {
            imageUrl = await uploadToUguu(buffer, filename);
        } catch (uploadError) {
            await ReplyRynzz(`❌ *GAGAL UPLOAD GAMBAR!*\n\n${uploadError.message}\nSilakan coba lagi!`, msg, sock);
            return true;
        }

        // Ambil prompt dari API
        try {
            const apiUrl = `https://zenzxz.dpdns.org/tools/toprompt?url=${encodeURIComponent(imageUrl)}`;
            const response = await axios.get(apiUrl, { timeout: 30000 });

            if (!response.data.status) {
                await ReplyRynzz('❌ *API ERROR!*\n\nGagal menganalisis gambar.\nSilakan coba lagi!', msg, sock);
                return true;
            }

            const result = response.data.result;
            const resultText = `
🖼️ *TOPROMPT - HASIL ANALISIS*

📝 *Prompt AI Generated:*
\`\`\`
${result}
\`\`\`

✅ *Gambar berhasil dianalisis dan diubah menjadi prompt AI!*
💡 *Gunakan prompt ini untuk generate gambar dengan AI*
`;

            await ReplyRynzz(resultText, msg, sock);

        } catch (apiError) {
            await ReplyRynzz('❌ *GAGAL MENGANALISIS GAMBAR!*\n\nTerjadi kesalahan saat memproses.\nSilakan coba lagi!', msg, sock);
        }

        return true;

    } catch (error) {
        console.error('Toprompt Caption Error:', error);
        await ReplyRynzz('❌ *TERJADI KESALAHAN!*\n\nGagal memproses toprompt.\nSilakan coba lagi!', msg, sock);
        return true;
    }
}

module.exports = {
    handleTopromptCommand,
    handleTopromptCaption
};