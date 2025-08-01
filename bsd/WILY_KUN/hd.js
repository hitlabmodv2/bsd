const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
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
    const botMode = config?.bot?.mode || 'public';

    if (botMode === 'public') {
        return true;
    }

    const botNumber = config?.bot?.botNumber;
    const ownerNumber = config?.bot?.owner;

    const cleanSender = senderNumber?.split('@')[0]?.split(':')[0];
    const cleanBot = botNumber?.split('@')[0]?.split(':')[0];
    const cleanOwner = ownerNumber?.split('@')[0]?.split(':')[0];

    const isBotNumber = cleanSender === cleanBot;
    const isOwnerNumber = cleanSender === cleanOwner;
    const isFromMe = fromMe === true;

    return isFromMe || isBotNumber || isOwnerNumber;
}

class IllariaUpscaler {
    constructor() {
        this.api_url = 'https://thestinger-ilaria-upscaler.hf.space/gradio_api';
        this.file_url = 'https://thestinger-ilaria-upscaler.hf.space/gradio_api/file=';
    }

    generateSession() {
        return Math.random().toString(36).substring(2);
    }

    async upload(buffer) {
        const upload_id = this.generateSession();
        const orig_name = `hd_${Date.now()}.jpg`;
        const form = new FormData();
        form.append('files', buffer, orig_name);
        const { data } = await axios.post(`${this.api_url}/upload?upload_id=${upload_id}`, form, {
            headers: form.getHeaders()
        });
        return {
            orig_name,
            path: data[0],
            url: `${this.file_url}${data[0]}`
        };
    }

    async process(buffer, options = {}) {
        const {
            model = 'RealESRGAN_x4plus',
            denoice_strength = 0.5,
            resolution = 4,
            fase_enhancement = true
        } = options;

        const _model = ['RealESRGAN_x4plus', 'RealESRNet_x4plus', 'RealESRGAN_x4plus_anime_6B', 'RealESRGAN_x2plus', 'realesr-general-x4v3'];

        if (!Buffer.isBuffer(buffer)) throw new Error('Image buffer is required');
        if (!_model.includes(model)) throw new Error(`Available models: ${_model.join(', ')}`);
        if (denoice_strength > 1) throw new Error('Max denoice strength: 1');
        if (resolution > 6) throw new Error('Max resolution: 6');
        if (typeof fase_enhancement !== 'boolean') throw new Error('Fase enhancement must be boolean');

        const image_url = await this.upload(buffer);
        const session_hash = this.generateSession();

        await axios.post(`${this.api_url}/queue/join?`, {
            data: [
                {
                    path: image_url.path,
                    url: image_url.url,
                    orig_name: image_url.orig_name,
                    size: buffer.length,
                    mime_type: 'image/jpeg',
                    meta: { _type: 'gradio.FileData' }
                },
                model,
                denoice_strength,
                fase_enhancement,
                resolution
            ],
            event_data: null,
            fn_index: 1,
            trigger_id: 20,
            session_hash: session_hash
        });

        const { data } = await axios.get(`${this.api_url}/queue/data?session_hash=${session_hash}`);
        const lines = data.split('\n\n');
        for (const line of lines) {
            if (line.startsWith('data:')) {
                const d = JSON.parse(line.substring(6));
                if (d.msg === 'process_completed' && d.output && d.output.data && d.output.data[0]) {
                    return d.output.data[0].url;
                }
            }
        }

        throw new Error('Process failed');
    }
}

async function ReplyRynzz(teks, msg, sock) {
    try {
        const packname = "HD Image Enhancer";
        const senderName = msg.pushName || (msg.key.participant || msg.key.remoteJid).split('@')[0];

        let profilePic;
        try {
            const userJid = msg.key.participant || msg.key.remoteJid;
            profilePic = await sock.profilePictureUrl(userJid, 'image');
        } catch (error) {
            profilePic = "https://files.catbox.moe/mxohav.gif";
        }

        const json = {
            body: teks,
            footer: packname,
            avatar: profilePic,
            name: senderName,
            type: "quote"
        };

        // Use only the first API
        try {
            const response = await axios.post("https://widipe.com/quotedly", json, {
                headers: { "Content-Type": "application/json" },
                responseType: 'arraybuffer',
                timeout: 10000
            });

            const buffer = Buffer.from(response.data);
            return await sock.sendMessage(msg.key.remoteJid, {
                sticker: buffer,
            }, { quoted: msg });
        } catch (apiError) {
            // If API fails, send as regular text message
            return await sock.sendMessage(msg.key.remoteJid, {
                text: teks
            }, { quoted: msg });
        }
    } catch (error) {
        // Fallback to regular text message
        return await sock.sendMessage(msg.key.remoteJid, {
            text: teks
        }, { quoted: msg });
    }
}

async function handleHdCommand(sock, msg) {
    try {
        const config = loadConfig();

        // Get sender information
        const senderJid = msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        const senderNumber = msg.key.participant ? 
            msg.key.participant.split('@')[0] : 
            msg.key.remoteJid.split('@')[0];

        // Check access permission
        if (!checkAccess(senderNumber, config, fromMe)) {
            return; // Silent exit for unauthorized users in self mode
        }

        // Check for image in message or quoted message
        let imageMessage = null;
        let messageToProcess = null;

        // Check image with caption
        if (msg.message?.imageMessage) {
            imageMessage = msg.message.imageMessage;
            messageToProcess = msg;
        }
        // Check quoted image
        else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
            imageMessage = msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
            // Create a mock message object for quoted image
            messageToProcess = {
                message: {
                    imageMessage: imageMessage
                }
            };
        }
        // Check if replying to an image
        else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
            if (quotedMsg.imageMessage) {
                imageMessage = quotedMsg.imageMessage;
                messageToProcess = {
                    message: {
                        imageMessage: quotedMsg.imageMessage
                    }
                };
            }
        }

        if (!imageMessage) {
            const helpText = `
❌ *GAMBAR TIDAK DITEMUKAN!*

📝 *Cara penggunaan:*
• Kirim gambar dengan caption .hd
• Reply gambar dengan .hd
• Forward gambar lalu ketik .hd

🎯 *Fitur HD Image Enhancer:*
• Meningkatkan kualitas gambar hingga 4x
• Mengurangi noise pada gambar
• Memperjelas detail gambar
• Mendukung berbagai format gambar

💡 *Contoh:*
[Kirim gambar] + caption: .hd
atau
Reply gambar: .hd`;

            await ReplyRynzz(helpText, msg, sock);
            return;
        }

        // Send processing message
        await ReplyRynzz("⏳ *MEMPROSES GAMBAR...*\n\n🔄 Sedang meningkatkan kualitas gambar\n⚡ Harap tunggu beberapa saat...", msg, sock);

        // Download image
        const imageBuffer = await downloadMediaMessage(
            messageToProcess,
            'buffer',
            {},
            { 
                logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
            }
        );

        if (!imageBuffer || imageBuffer.length === 0) {
            await ReplyRynzz("❌ *GAGAL MENGUNDUH GAMBAR!*\n\nTidak dapat mengunduh gambar dari pesan", msg, sock);
            return;
        }

        // Process image with IllariaUpscaler
        const upscaler = new IllariaUpscaler();
        const resultUrl = await upscaler.process(imageBuffer, {
            model: 'RealESRGAN_x4plus',
            denoice_strength: 0.5,
            resolution: 4,
            fase_enhancement: true
        });

        // Send enhanced image
        await sock.sendMessage(msg.key.remoteJid, {
            image: { url: resultUrl },
            caption: `✅ *HD IMAGE ENHANCEMENT COMPLETED!*

🎯 *Detail Proses:*
├─ Model: RealESRGAN_x4plus
├─ Resolution: 4x Enhanced
├─ Denoice: 0.5 Strength
└─ Face Enhancement: Enabled

📊 *Hasil:*
• Kualitas gambar ditingkatkan 4x lipat
• Noise berkurang secara signifikan
• Detail gambar lebih tajam dan jelas

🤖 *HD Image Enhancer by WilyKun Bot*`
        }, { quoted: msg });

    } catch (error) {
        console.error('HD Command Error:', error);
        let errorMessage = "❌ *GAGAL MEMPROSES GAMBAR!*\n\n";

        if (error.message.includes('Image buffer is required')) {
            errorMessage += "🔍 Format gambar tidak didukung";
        } else if (error.message.includes('Process failed')) {
            errorMessage += "⚠️ Server sedang sibuk, coba lagi nanti";
        } else if (error.message.includes('Max resolution')) {
            errorMessage += "📏 Resolusi terlalu tinggi";
        } else if (error.message.includes('fetch is not defined')) {
            errorMessage += "🔧 Module tidak ditemukan, silakan restart bot";
        } else {
            errorMessage += `🔧 Error: ${error.message}`;
        }

        await ReplyRynzz(errorMessage, msg, sock);
    }
}

module.exports = {
    handleHdCommand,
    checkAccess,
    loadConfig
};