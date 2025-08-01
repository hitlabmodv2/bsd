const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Wily } = require('../CODE_REPLAY/reply');
const { loadConfig } = require('../Wilykun.js');

// Check access permission based on bot mode
function checkAccess(senderNumber, config, fromMe = false) {
    if (!config || !config.bot) return false;

    const botMode = config.bot.mode || 'self';
    const ownerNumber = config.bot.owner || '';
    const botNumber = config.bot.botNumber || '';

    // Remove @s.whatsapp.net if present
    const cleanSender = senderNumber.replace('@s.whatsapp.net', '');
    const cleanOwner = ownerNumber.replace('@s.whatsapp.net', '');
    const cleanBot = botNumber.replace('@s.whatsapp.net', '');

    if (botMode === 'self') {
        // Only respond to messages from me, owner, or bot number
        return fromMe || cleanSender === cleanOwner || cleanSender === cleanBot;
    } else if (botMode === 'public') {
        // Everyone can use
        return true;
    }

    return false;
}

async function nsfwimage(prompt, options = {}) {
    try {
        const {
            negative_prompt = 'lowres, bad anatomy, bad hands, text, error, missing finger, extra digits, fewer digits, cropped, worst quality, low quality, low score, bad score, average score, signature, watermark, username, blurry',
            style = 'anime',
            width = 1024,
            height = 1024,
            guidance_scale = 7,
            inference_steps = 28
        } = options;

        const _style = ['anime', 'real', 'photo'];

        if (!prompt) throw new Error('Prompt is required');
        if (!_style.includes(style)) throw new Error(`Available styles: ${_style.join(', ')}`);
        if (width < 256 || width > 1216) throw new Error('Min width: 256, Max width: 1216');
        if (height < 256 || height > 1216) throw new Error('Min height: 256, Max height: 1216');
        if (guidance_scale < 0 || guidance_scale > 20) throw new Error('Min guidance scale: 0, Max guidance scale: 20');
        if (inference_steps < 1 || inference_steps > 28) throw new Error('Max inference steps: 28');

        const session_hash = Math.random().toString(36).substring(2);
        const response = await axios.post(`https://heartsync-nsfw-uncensored${style !== 'anime' ? `-${style}` : ''}.hf.space/gradio_api/queue/join?`, {
            data: [
                prompt,
                negative_prompt,
                0,
                true,
                width,
                height,
                guidance_scale,
                inference_steps
            ],
            event_data: null,
            fn_index: 2,
            trigger_id: 16,
            session_hash: session_hash
        });

        const { data } = await axios.get(`https://heartsync-nsfw-uncensored${style !== 'anime' ? `-${style}` : ''}.hf.space/gradio_api/queue/data?session_hash=${session_hash}`);

        let result;
        const lines = data.split('\n\n');
        for (const line of lines) {
            if (line.startsWith('data:')) {
                const d = JSON.parse(line.substring(6));
                if (d.msg === 'process_completed') result = d.output.data[0].url;
            }
        }

        return result;
    } catch (error) {
        throw new Error(error.message);
    }
}

async function handleNsfwImageCommand(sock, msg) {
    try {
        const config = loadConfig();
        const prefix = config?.bot?.prefix || '.';

        // Get message text
        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || '';

        if (!messageText) return;

        // Check if it's nsfwimage command
        const args = messageText.slice(prefix.length).trim().split(' ');
        const command = args[0].toLowerCase();

        if (command !== 'nsfwimage') return;

        // Check access based on bot mode FIRST before processing
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        const senderNumber = senderJid.split('@')[0];

        if (!checkAccess(senderNumber, config, fromMe)) {
            // In self mode, bot should not respond to unauthorized users
            return; // Silent exit, no response
        }

        // Random prompts arrays
        const randomPromptsSFW = [
            "1girl, anime style, beautiful, detailed eyes, long hair, school uniform",
            "1girl, casual outfit, modern city background, cute smile",
            "1girl, traditional japanese clothing, shrine background, peaceful",
            "1girl, fantasy costume, magical forest setting, elegant pose",
            "1girl, office lady, business suit, workplace, professional",
            "1girl, dancer outfit, stage performance, artistic lighting",
            "1girl, princess dress, castle background, royal theme",
            "1girl, warrior outfit, battle scene, heroic pose",
            "1girl, student uniform, classroom setting, youthful innocent",
            "1girl, chef outfit, kitchen background, cooking theme",
            "1girl, librarian outfit, library setting, intellectual look",
            "1girl, artist outfit, art studio, creative atmosphere",
            "1girl, gardener outfit, flower garden, nature theme",
            "1girl, scientist outfit, laboratory, research theme",
            "1girl, musician outfit, concert hall, performance theme"
        ];

        const randomPromptsNSFW = [
            "1girl, sexy pose, bikini, beach background, sunset lighting, seductive",
            "1girl, lingerie, bedroom scene, soft lighting, intimate mood",
            "1girl, maid outfit, suggestive pose, indoor setting, flirty expression",
            "1girl, nurse outfit, hospital background, provocative look, adult theme",
            "1girl, swimsuit, pool scene, summer vibes, sensual pose",
            "1girl, gothic dress, dark atmosphere, mysterious seductive",
            "1girl, revealing dress, nightclub scene, party atmosphere, adult",
            "1girl, leather outfit, dungeon background, dominant pose, mature",
            "1girl, schoolgirl outfit, after school, naughty expression, 18+",
            "1girl, secretary outfit, office scene, suggestive pose, adult workplace",
            "1girl, fitness outfit, gym background, sweaty, athletic seductive",
            "1girl, cosplay outfit, bedroom scene, roleplay theme, adult",
            "1girl, evening dress, hotel room, elegant seductive, mature",
            "1girl, beach outfit, tropical setting, vacation mood, sensual",
            "1girl, nightwear, bedroom scene, intimate lighting, adult theme"
        ];

        const randomPromptsMixed = [
            ...randomPromptsSFW.slice(0, 8),
            ...randomPromptsNSFW.slice(0, 7)
        ];

        // Get prompt from args
        let prompt = args.slice(1).join(' ');
        let promptType = 'custom';

        // Check if user wants random prompt
        if (prompt.toLowerCase().startsWith('random')) {
            const randomArgs = prompt.toLowerCase().split(' ');

            if (randomArgs.length === 1 || randomArgs[1] === undefined) {
                // .nsfwimage random (mixed SFW/NSFW)
                const randomIndex = Math.floor(Math.random() * randomPromptsMixed.length);
                prompt = randomPromptsMixed[randomIndex];
                promptType = 'random_mixed';
            } else if (randomArgs[1] === 'nsfw') {
                // .nsfwimage random nsfw (18+ only)
                const randomIndex = Math.floor(Math.random() * randomPromptsNSFW.length);
                prompt = randomPromptsNSFW[randomIndex];
                promptType = 'random_nsfw';
            } else if (randomArgs[1] === 'sfw') {
                // .nsfwimage random sfw (safe only)
                const randomIndex = Math.floor(Math.random() * randomPromptsSFW.length);
                prompt = randomPromptsSFW[randomIndex];
                promptType = 'random_sfw';
            } else {
                // Invalid random option
                prompt = '';
            }
        }

        if (!prompt) {
            const exampleText = `❌ *NSFW IMAGE GENERATOR*

🔸 *Format:* ${prefix}nsfwimage [prompt]
🎲 *Random Options:*

📝 *CARA PENGGUNAAN:*
• ${prefix}nsfwimage [custom prompt] ← Custom prompt
• ${prefix}nsfwimage random ← Prompt acak campuran
• ${prefix}nsfwimage random nsfw ← Prompt acak 18+ only
• ${prefix}nsfwimage random sfw ← Prompt acak aman

📋 *CONTOH PENGGUNAAN:*
• ${prefix}nsfwimage 1girl, anime style, beautiful
• ${prefix}nsfwimage random
• ${prefix}nsfwimage random nsfw
• ${prefix}nsfwimage random sfw

⚠️ *KETERANGAN RANDOM:*
🎲 *random* = Campuran SFW & NSFW prompts
🔞 *random nsfw* = Khusus konten dewasa 18+
✅ *random sfw* = Aman, tidak mengandung 18+

🎨 *Style:* Default anime
📏 *Size:* Default 1024x1024 pixel
💡 *Tips:* Gunakan prompt bahasa Inggris untuk hasil terbaik`;

            await sock.sendMessage(msg.key.remoteJid, { 
                text: exampleText 
            }, { 
                quoted: msg 
            });
            return;
        }

        // Determine prompt type display
        let typeDisplay = '';
        switch(promptType) {
            case 'random_mixed':
                typeDisplay = '🎲 Random Campuran (SFW/NSFW)';
                break;
            case 'random_nsfw':
                typeDisplay = '🔞 Random NSFW (18+ Only)';
                break;
            case 'random_sfw':
                typeDisplay = '✅ Random SFW (Aman)';
                break;
            default:
                typeDisplay = '✏️ Custom Prompt';
                break;
        }

        // Send processing message with prompt info
        const processingMsg = await sock.sendMessage(msg.key.remoteJid, { 
            text: `🎨 *GENERATING NSFW IMAGE...*\n\n📝 *Prompt:* ${prompt}\n🎯 *Type:* ${typeDisplay}\n⏳ Sedang memproses gambar, mohon tunggu...\n🎨 *Style:* Anime\n📏 *Size:* 1024x1024\n\n⚠️ *Loading tidak akan dihapus*` 
        }, { 
            quoted: msg 
        });

        try {
            // Generate image
            const imageUrl = await nsfwimage(prompt, {
                style: 'anime',
                width: 1024,
                height: 1024
            });

            if (!imageUrl) {
                await sock.sendMessage(msg.key.remoteJid, { 
                    text: "❌ *GAGAL GENERATE GAMBAR*\n\nTidak bisa membuat gambar, coba lagi dengan prompt yang berbeda." 
                }, { 
                    quoted: msg 
                });
                return;
            }

            // Download and send image
            const imageResponse = await axios.get(imageUrl, {
                responseType: 'arraybuffer'
            });

            const imageBuffer = Buffer.from(imageResponse.data);

            await sock.sendMessage(msg.key.remoteJid, {
                image: imageBuffer,
                caption: `🎨 *NSFW IMAGE GENERATED*\n\n📝 *Prompt:* ${prompt}\n🎯 *Type:* ${typeDisplay}\n🎨 *Style:* Anime\n📏 *Size:* 1024x1024\n\n⚠️ *Disclaimer:* Konten NSFW, gunakan dengan bijak\n\n✅ *Status:* Berhasil dibuat!`
            }, { 
                quoted: msg 
            });

            // Loading message tidak dihapus sesuai permintaan

        } catch (error) {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ *ERROR GENERATE GAMBAR*\n\n⚠️ ${error.message}\n\nCoba lagi dengan prompt yang berbeda.` 
            }, { 
                quoted: msg 
            });
        }

    } catch (error) {
        // Silent error handling - no console logs
        return;
    }
}

module.exports = { handleNsfwImageCommand };