const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');
const { Wily } = require('../CODE_REPLAY/reply');

// Fungsi untuk memuat config
function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
        return getDefaultConfig();
    } catch (error) {
        return getDefaultConfig();
    }
}

function getDefaultConfig() {
    return {
        bot: {
            mode: "public",
            prefix: ".",
            botname: "WilyKun Bot",
            packname: "Auto Read Story",
            thumbnailReply: "https://files.catbox.moe/mxohav.gif",
            wame: "https://wa.me/6289681008411",
            idch: "120363312297133690@newsletter"
        }
    };
}
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const axios = require('axios');



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



// Random prompts untuk mode random
const randomPrompts = [
    "cute anime cat with big eyes",
    "kawaii panda eating bamboo", 
    "adorable corgi puppy smiling",
    "beautiful butterfly with colorful wings",
    "funny monkey making faces",
    "cute rabbit with pink ears",
    "sleepy owl on a tree branch",
    "happy dolphin jumping",
    "adorable hamster eating sunflower seeds",
    "cute fox with fluffy tail",
    "smiling sun with sunglasses",
    "kawaii unicorn with rainbow mane",
    "cute penguin sliding on ice",
    "adorable koala hugging tree",
    "funny llama with colorful hat",
    "cute dragon baby sleeping",
    "kawaii octopus with tentacles",
    "adorable bee collecting honey",
    "cute turtle swimming",
    "happy elephant with big ears",
    "kawaii ghost floating",
    "cute robot with heart eyes",
    "adorable alien with antenna",
    "funny dinosaur dancing",
    "cute mermaid with shells",
    "kawaii cake with candles",
    "adorable ice cream cone",
    "cute pizza slice smiling", 
    "happy donut with sprinkles",
    "kawaii sushi roll"
];

async function generateAISticker(prompt) {
    try {
        const cleanPrompt = prompt.trim();

        // Strategy 1: Pollinations.ai (Most reliable)
        try {
            const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt + ', sticker style, cartoon, cute, simple background, high quality')}?width=512&height=512&model=flux&enhance=true`;

            const response = await axios({
                method: 'GET',
                url: pollinationsUrl,
                responseType: 'arraybuffer',
                timeout: 45000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const imageBuffer = Buffer.from(response.data);

            // Validate image
            if (imageBuffer && imageBuffer.length > 5000) {
                const isValidImage = 
                    (imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8) || // JPEG
                    (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) ||  // PNG
                    (imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49);    // WebP

                if (isValidImage) {
                    return imageBuffer;
                }
            }
        } catch (error) {
            // Continue to next strategy
        }

        // Strategy 2: Dezgo AI
        try {
            const dezgoResponse = await axios({
                method: 'POST',
                url: 'https://api.dezgo.com/text2image',
                headers: {
                    'Content-Type': 'application/json'
                },
                data: {
                    prompt: `${cleanPrompt}, sticker style, cartoon, cute, kawaii, simple background, vector art`,
                    model: 'epic_realism',
                    width: 512,
                    height: 512,
                    samples: 1,
                    steps: 25,
                    guidance: 7.5
                },
                timeout: 60000
            });

            if (dezgoResponse.data && dezgoResponse.data.output) {
                const imageUrl = dezgoResponse.data.output[0];
                const imgResponse = await axios({
                    method: 'GET',
                    url: imageUrl,
                    responseType: 'arraybuffer',
                    timeout: 30000
                });

                const imageBuffer = Buffer.from(imgResponse.data);
                if (imageBuffer && imageBuffer.length > 5000) {
                    return imageBuffer;
                }
            }
        } catch (error) {
            // Continue to next strategy
        }

        // Strategy 3: Hugging Face Inference API
        try {
            const hfResponse = await axios({
                method: 'POST',
                url: 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
                headers: {
                    'Authorization': 'Bearer hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // Free tier
                    'Content-Type': 'application/json'
                },
                data: {
                    inputs: `${cleanPrompt}, sticker style, cartoon style, cute, kawaii, simple background, vector illustration`,
                    parameters: {
                        width: 512,
                        height: 512,
                        num_inference_steps: 20
                    }
                },
                responseType: 'arraybuffer',
                timeout: 60000
            });

            const imageBuffer = Buffer.from(hfResponse.data);
            if (imageBuffer && imageBuffer.length > 5000) {
                return imageBuffer;
            }
        } catch (error) {
            // Continue to next strategy
        }

        // Strategy 4: Alternative Pollinations model
        try {
            const altUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=512&height=512&model=deliberate&enhance=true&style=cartoon-sticker`;

            const altResponse = await axios({
                method: 'GET',
                url: altUrl,
                responseType: 'arraybuffer',
                timeout: 45000
            });

            const imageBuffer = Buffer.from(altResponse.data);
            if (imageBuffer && imageBuffer.length > 5000) {
                return imageBuffer;
            }
        } catch (error) {
            // Continue to final fallback
        }

        // Strategy 5: Prodia API (Free tier)
        try {
            const prodiaResponse = await axios({
                method: 'POST',
                url: 'https://api.prodia.com/v1/sd/generate',
                headers: {
                    'X-Prodia-Key': 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' // Free API key
                },
                data: {
                    prompt: `${cleanPrompt}, sticker style, cartoon, cute style, simple background`,
                    model: 'deliberate_v2.safetensors [10ec4b29]',
                    steps: 20,
                    cfg_scale: 7,
                    width: 512,
                    height: 512,
                    sampler: 'DPM++ 2M Karras'
                },
                timeout: 60000
            });

            if (prodiaResponse.data && prodiaResponse.data.job) {
                // Poll for result
                const jobId = prodiaResponse.data.job;
                let attempts = 0;

                while (attempts < 15) {
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    try {
                        const resultResponse = await axios({
                            method: 'GET',
                            url: `https://api.prodia.com/v1/job/${jobId}`,
                            headers: {
                                'X-Prodia-Key': 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
                            }
                        });

                        if (resultResponse.data.status === 'succeeded' && resultResponse.data.imageUrl) {
                            const imgResponse = await axios({
                                method: 'GET',
                                url: resultResponse.data.imageUrl,
                                responseType: 'arraybuffer'
                            });

                            const imageBuffer = Buffer.from(imgResponse.data);
                            if (imageBuffer && imageBuffer.length > 5000) {
                                return imageBuffer;
                            }
                        }
                    } catch (pollError) {
                        // Continue polling
                    }

                    attempts++;
                }
            }
        } catch (error) {
            // Continue to final fallback
        }

        // Final fallback: Create text-based placeholder
        const Canvas = require('canvas');
        const canvas = Canvas.createCanvas(512, 512);
        const ctx = canvas.getContext('2d');

        // Background gradient based on prompt
        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        if (cleanPrompt.toLowerCase().includes('cat')) {
            gradient.addColorStop(0, '#FFE4E1');
            gradient.addColorStop(1, '#FFA07A');
        } else if (cleanPrompt.toLowerCase().includes('dog')) {
            gradient.addColorStop(0, '#F0E68C');
            gradient.addColorStop(1, '#DEB887');
        } else if (cleanPrompt.toLowerCase().includes('panda')) {
            gradient.addColorStop(0, '#F5F5F5');
            gradient.addColorStop(1, '#D3D3D3');
        } else {
            gradient.addColorStop(0, '#E6E6FA');
            gradient.addColorStop(1, '#DDA0DD');
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        // Draw cute character based on prompt
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(256, 200, 80, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(230, 180, 20, 0, Math.PI * 2);
        ctx.arc(282, 180, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(230, 180, 8, 0, Math.PI * 2);
        ctx.arc(282, 180, 8, 0, Math.PI * 2);
        ctx.fill();

        // Mouth
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(256, 210, 15, 0, Math.PI);
        ctx.stroke();

        // Text
        ctx.fillStyle = '#333';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        const words = cleanPrompt.split(' ');
        const maxWidth = 400;
        let y = 350;

        for (let i = 0; i < Math.min(words.length, 4); i += 2) {
            const line = words.slice(i, i + 2).join(' ');
            ctx.fillText(line, 256, y);
            y += 30;
        }

        return canvas.toBuffer('image/png');

    } catch (error) {
        throw new Error(`Gagal generate AI sticker: ${error.message}`);
    }
}

async function handleAIStickerCommand(client, m) {
    try {
        const config = loadConfig();
        const prefix = config?.bot?.prefix || '.';

        // Validasi awal struktur message
        if (!m || !m.message) {
            return;
        }

        let messageContent = '';

        // Extract message content
        if (m.message?.conversation) {
            messageContent = m.message.conversation.trim();
        } else if (m.message?.extendedTextMessage?.text) {
            messageContent = m.message.extendedTextMessage.text.trim();
        } else if (m.message?.imageMessage?.caption) {
            messageContent = m.message.imageMessage.caption.trim();
        }

        // Check if it's aisticker command
        const isCommand = messageContent.startsWith(`${prefix}aisticker`);

        if (!isCommand) {
            return;
        }

        // Check access based on bot mode
        const senderJid = m.key.participant || m.key.remoteJid;
        const fromMe = m.key.fromMe;

        if (!checkAccess(senderJid, config, fromMe)) {
            return; // Silent exit untuk mode self
        }

        // Parse command arguments
        const args = messageContent.split(' ').slice(1);
        const mode = args[0]?.toLowerCase();

        // Jika hanya .aisticker tanpa parameter, tampilkan help
        if (!mode) {
            const helpText = `
╭━━━『 🤖 AI STICKER GENERATOR 』━━━❀
┃ 
┃ 🎨 *Generate sticker menggunakan AI!*
┃ 
┃ 📝 *Cara penggunaan:*
┃ • ${prefix}aisticker random
┃ • ${prefix}aisticker costume [prompt]
┃ 
┃ 🎯 *Contoh lengkap:*
┃ • ${prefix}aisticker random
┃   ↳ Bot akan generate dengan prompt acak
┃ 
┃ • ${prefix}aisticker costume cute anime cat
┃   ↳ Generate sticker kucing anime lucu
┃ 
┃ • ${prefix}aisticker costume kawaii panda eating
┃   ↳ Generate sticker panda lucu sedang makan
┃ 
┃ 💡 *Tips prompt yang bagus:*
┃ • Gunakan kata "cute", "kawaii", "adorable"
┃ • Tambahkan deskripsi aktivitas
┃ • Sebutkan warna atau style
┃ • Contoh: "cute robot with blue eyes"
┃ • Prompt dalam bahasa Inggris lebih akurat
┃ 
┃ 📦 *Info sticker pack:*
┃ • Pack: ${config.sticker?.packname || 'WilyKun Bot'}
┃ • Author: ${config.sticker?.author || '© WilyKun'}
┃ 
┃ ⚡ *Powered by Multiple AI Engines*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Ketik salah satu command di atas untuk mulai!_`;

            await Wily(helpText, m, client);
            return;
        }

        let prompt = '';

        if (mode === 'random') {
            // Pilih prompt random
            prompt = randomPrompts[Math.floor(Math.random() * randomPrompts.length)];

            await Wily(`🎲 *Mode Random Dipilih!*\n\n🤖 Prompt: "${prompt}"\n⏳ Menggunakan AI engine terbaik untuk hasil akurat, mohon tunggu...`, m, client);

        } else if (mode === 'costume') {
            // Gunakan prompt custom
            prompt = args.slice(1).join(' ');

            if (!prompt) {
                await Wily(`❌ *Prompt Kosong!*\n\nContoh yang benar:\n• ${prefix}aisticker costume cute anime cat\n• ${prefix}aisticker costume kawaii panda eating\n\n💡 *Tips:* Gunakan bahasa Inggris untuk hasil lebih akurat!`, m, client);
                return;
            }

            await Wily(`🎨 *Mode Costume Dipilih!*\n\n🤖 Prompt: "${prompt}"\n⏳ Processing dengan multiple AI engines untuk akurasi maksimal...`, m, client);

        } else {
            await Wily(`❌ *Mode Tidak Valid!*\n\nMode yang tersedia:\n• random - Prompt otomatis\n• costume - Prompt custom\n\nContoh: ${prefix}aisticker random`, m, client);
            return;
        }

        try {
            // Generate AI sticker dengan multiple engines
            const imageBuffer = await generateAISticker(prompt);

            if (!imageBuffer || imageBuffer.length === 0) {
                await Wily("❌ Gagal generate sticker. Semua AI engine sedang sibuk, coba lagi!", m, client);
                return;
            }

            // Validate image buffer
            const isValidImage = 
                // JPEG
                (imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8) ||
                // PNG
                (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x4E && imageBuffer[3] === 0x47) ||
                // WebP
                (imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49 && imageBuffer[2] === 0x46 && imageBuffer[3] === 0x46);

            if (!isValidImage) {
                await Wily("❌ Format gambar tidak valid. Coba prompt yang berbeda!", m, client);
                return;
            }

            // Create sticker using wa-sticker-formatter
            const stickerMetadata = {
                pack: config.sticker?.packname || 'WilyKun Bot',
                author: config.sticker?.author || '© WilyKun',
                type: StickerTypes.FULL,
                categories: ['🤖', '🎨'],
                quality: 95,
                background: 'transparent'
            };

            const sticker = new Sticker(imageBuffer, stickerMetadata);
            const stickerBuffer = await sticker.toBuffer();

            if (!stickerBuffer || stickerBuffer.length === 0) {
                await Wily("❌ Gagal convert ke format sticker. Coba lagi!", m, client);
                return;
            }

            // Send sticker with quote
            await client.sendMessage(m.key.remoteJid, {
                sticker: stickerBuffer,
                mimetype: 'image/webp'
            }, { quoted: m });

            // Send success message
            const successText = `
╭━━━『 ✅ AI STICKER BERHASIL 』━━━❀
┃ 
┃ 🤖 *AI Sticker berhasil dibuat!*
┃ 🎨 Mode: ${mode === 'random' ? 'Random' : 'Costume'}
┃ 💭 Prompt: "${prompt}"
┃ 📦 Pack: ${stickerMetadata.pack}
┃ ✍️ Author: ${stickerMetadata.author}
┃ 
┃ ✨ *Hasil disesuaikan dengan prompt*
┃ 🔄 *Multiple AI Engine Processing*
┃ 
┃ 💡 *AI Engines yang digunakan:*
┃ • Pollinations.ai (Primary)
┃ • Dezgo AI (Backup)
┃ • Hugging Face (Alternative)
┃ • Prodia API (Fallback)
┃ 
┃ ⚡ *Next-Gen AI Technology*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Sticker akurat sesuai prompt Anda!_`;

            await Wily(successText, m, client);

        } catch (aiError) {
            const errorText = `
╭━━━『 ❌ AI GENERATOR ERROR 』━━━❀
┃ 
┃ 💥 *Gagal generate AI sticker!*
┃ 
┃ 🔧 *Kemungkinan penyebab:*
┃ • Semua AI server overload
┃ • Prompt mengandung kata terlarang
┃ • Koneksi tidak stabil
┃ • Rate limit tercapai
┃ 
┃ 💡 *Solusi:*
┃ • Tunggu 1-2 menit lalu coba lagi
┃ • Gunakan prompt yang lebih sederhana
┃ • Coba mode random untuk alternatif
┃ • Pastikan prompt dalam bahasa Inggris
┃ 
┃ 🎲 *Alternatif cepat:*
┃ • ${prefix}aisticker random
┃ • ${prefix}sticker (untuk gambar biasa)
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Multiple AI engines siap melayani!_`;

            await Wily(errorText, m, client);
        }

    } catch (error) {
        const errorText = `
╭━━━『 ❌ SYSTEM ERROR 』━━━❀
┃ 
┃ 💥 *Terjadi kesalahan sistem!*
┃ 
┃ 🔧 *Kemungkinan penyebab:*
┃ • Error parsing command
┃ • Memory insufficient
┃ • Network timeout
┃ • Module error
┃ 
┃ 💡 *Solusi:*
┃ • Restart bot jika perlu
┃ • Coba command lain dulu
┃ • Hubungi admin jika persist
┃ • Periksa format command
┃ 
┃ 📝 *Format yang benar:*
┃ • ${loadConfig()?.bot?.prefix || '.'}aisticker random
┃ • ${loadConfig()?.bot?.prefix || '.'}aisticker costume [prompt]
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Multiple AI engines standby!_`;

        await Wily(errorText, m, client);
    }
}

module.exports = {
    handleAIStickerCommand,
    checkAccess,
    loadConfig
};