const fs = require('fs');
const path = require('path');

// Fungsi untuk membaca config
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

// Fungsi untuk menyimpan config
function saveConfig(config) {
    try {
        const configPath = path.join(process.cwd(), 'config.json');

        // Backup config lama jika ada
        if (fs.existsSync(configPath)) {
            const backupPath = path.join(process.cwd(), 'DATA', 'config.backup.json');
            const currentConfig = fs.readFileSync(configPath, 'utf8');
            fs.writeFileSync(backupPath, currentConfig);
        }

        // Simpan config baru
        const configString = JSON.stringify(config, null, 2);
        fs.writeFileSync(configPath, configString, 'utf8');

        // Verifikasi file tersimpan dengan benar
        if (fs.existsSync(configPath)) {
            const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            console.log('✅ Config berhasil disimpan ke config.json');
            console.log('📊 AutoFeatures status:', savedConfig.autoFeatures);
            return true;
        }

        return false;
    } catch (error) {
        console.error('❌ Error saving config:', error.message);
        return false;
    }
}

// Default config
function getDefaultConfig() {
    return {
        autoReactionStory: {
            enabled: true,
            mode: "always",
            delay: 3000
        },
        settings: {
            censorNumber: true,
            censorCount: 3,
            speedViews: 3,
            reactionDelay: 3000
        },
        display: {
            showStats: true,
            coloredOutput: true
        },
        bot: {
            mode: "public", // self atau public
            prefix: ".",
            owner: "",
            botNumber: "",
            backupTarget: "" // Tambahkan target backup
        },
        autoFeatures: {
            typing: false,
            recording: false,
            online: false,
            ceklis2abuabu: false
        }
    };
}

// Fungsi untuk mengirim pesan dengan quote
async function sendQuotedMessage(sock, chatId, text, quotedMessage) {
    try {
        await sock.sendMessage(chatId, {
            text: text
        }, {
            quoted: quotedMessage
        });
    } catch (error) {
        // Fallback tanpa quote jika error
        await sock.sendMessage(chatId, { text: text });
    }
}

// Import menu handler
const { handleMenuCommand } = require('./MENU/MENU.js');

// Import modules - consolidated at top
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { handleHdCommand } = require('./WILY_KUN/hd.js');

// Fungsi untuk menangani pesan command
async function handleCommand(sock, msg) {
    try {
        // PRIORITY CHECK: Handle media with caption first (before text processing)
        // Handle image with caption
        if (msg.message?.imageMessage?.caption) {
            const config = loadConfig();
            const prefix = config.bot?.prefix || '.';
            const imageCaption = msg.message.imageMessage.caption.trim();

            // Check for sticker command
            if (imageCaption === `${prefix}s` || imageCaption === `${prefix}sticker`) {
                const { handleStickerCommand } = require('./WILY_KUN/sticker.js');
                await handleStickerCommand(sock, msg);
                return; // Stop processing here
            }

            // Check for hitamkan command
            if (imageCaption === `${prefix}hitamkan`) {
                const { handleHitamkanCommand } = require('./WILY_KUN/hitamkan.js');
                await handleHitamkanCommand(sock, msg);
                return; // Stop processing here
            }

            // Check for getppuser command
            if (imageCaption.startsWith(`${prefix}getppuser`)) {
                const { handleGetPPUserCommand } = require('./WILY_KUN/getppuser.js');
                await handleGetPPUserCommand(sock, msg);
                return; // Stop processing here
            }

            // Check for getppgroup command
            if (imageCaption.startsWith(`${prefix}getppgroup`)) {
                const { handleGetPPGroupCommand } = require('./WILY_KUN/getppgroup.js');
                await handleGetPPGroupCommand(sock, msg);
                return; // Stop processing here
            }

            // Check for removebg command
            if (imageCaption === `${prefix}removebg`) {
                const { handleRemoveBgCommand } = require('./WILY_KUN/removebg.js');
                await handleRemoveBgCommand(sock, msg);
                return; // Stop processing here
            }

            // Check for smeme command with caption
            if (imageCaption.startsWith(`${prefix}smeme`)) {
                const { handleSmemeCommand } = require('./WILY_KUN/smeme.js');
                await handleSmemeCommand(sock, msg);
                return; // Stop processing here
            }

            // Check for ssweb command with caption
            if (imageCaption.startsWith(`${prefix}ssweb`)) {
                const { handleSswebCommand } = require('./WILY_KUN/ssweb.js');
                await handleSswebCommand(sock, msg);
                return; // Stop processing here
            }

            // Check for hd command with caption
            if (imageCaption === `${prefix}hd`) {
                const { handleHdCommand } = require('./WILY_KUN/hd.js');
                await handleHdCommand(sock, msg);
                return; // Stop processing here
            }

            // Check for tourl command with caption
            if (imageCaption === `${prefix}tourl`) {
                const { handleTourlCommand } = require('./WILY_KUN/tourl.js');
                await handleTourlCommand(sock, msg);
                return; // Stop processing here
            }

            // Check for fakechwa command with caption
            if (imageCaption.startsWith(`${prefix}fakechwa`)) {
                const { handleFakeChwaCommand } = require('./WILY_KUN/fakechwa.js');
                await handleFakeChwaCommand(sock, msg);
                return; // Stop processing here
            }

            // Check for fakechat command with caption
            if (imageCaption.startsWith(`${prefix}fakechat`)) {
                const { handleFakeChatCommand } = require('./WILY_KUN/fakechat.js');
                await handleFakeChatCommand(sock, msg);
                return; // Stop processing here
            }

            // Check for hidetag command with caption
            if (imageCaption.startsWith(`${prefix}hidetag`)) {
                const { handleHidetagCommand } = require('./WILY_KUN/OWNER/hidetag.js');
                await handleHidetagCommand(sock, msg);
                return; // Stop processing here
            }

            // Check for toprompt command with caption
            if (imageCaption === `${prefix}toprompt`) {
                const { handleTopromptCaption } = require('./WILY_KUN/toprompt.js');
                const handled = await handleTopromptCaption(sock, msg);
                if (handled) return; // Stop processing here
            }

            // Check for toanimfinder command with caption
            if (imageCaption === `${prefix}toanimfinder`) {
                const { handleToAnimFinderCommand } = require('./WILY_KUN/toanimfinder.js');
                await handleToAnimFinderCommand(sock, msg);
                return; // Stop processing here
            }

            // Check for toghibli command with caption
            if (imageCaption === `${prefix}toghibli`) {
                const { handleToghibliCaption } = require('./WILY_KUN/toghibli.js');
                const handled = await handleToghibliCaption(sock, msg);
                if (handled) return; // Stop processing here
            }

            // Check for togen command with caption (reply to image with text|author format)
            if (imageCaption.startsWith(`${prefix}togen`)) {
                const { handleTogenCommand } = require('./WILY_KUN/togen.js');
                await handleTogenCommand(sock, msg);
                return; // Stop processing here
            }

            // Check for waiufdt command with caption

        }

        // Handle video with caption
        if (msg.message?.videoMessage?.caption) {
            const config = loadConfig();
            const prefix = config.bot?.prefix || '.';
            const videoCaption = msg.message.videoMessage.caption.trim();

            if (videoCaption === `${prefix}tourl`) {
                const { handleTourlCommand } = require('./WILY_KUN/tourl.js');
                await handleTourlCommand(sock, msg);
                return;
            }

            if (videoCaption.startsWith(`${prefix}hidetag`)) {
                const { handleHidetagCommand } = require('./WILY_KUN/OWNER/hidetag.js');
                await handleHidetagCommand(sock, msg);
                return;
            }
        }

        // Handle audio with caption
        if (msg.message?.audioMessage?.caption) {
            const config = loadConfig();
            const prefix = config.bot?.prefix || '.';
            const audioCaption = msg.message.audioMessage.caption.trim();

            if (audioCaption === `${prefix}tourl`) {
                const { handleTourlCommand } = require('./WILY_KUN/tourl.js');
                await handleTourlCommand(sock, msg);
                return;
            }

            if (audioCaption.startsWith(`${prefix}hidetag`)) {
                const { handleHidetagCommand } = require('./WILY_KUN/OWNER/hidetag.js');
                await handleHidetagCommand(sock, msg);
                return;
            }
        }

        // Handle document with caption
        if (msg.message?.documentMessage?.caption) {
            const config = loadConfig();
            const prefix = config.bot?.prefix || '.';
            const documentCaption = msg.message.documentMessage.caption.trim();

            if (documentCaption === `${prefix}tourl`) {
                const { handleTourlCommand } = require('./WILY_KUN/tourl.js');
                await handleTourlCommand(sock, msg);
                return;
            }

            if (documentCaption.startsWith(`${prefix}hidetag`)) {
                const { handleHidetagCommand } = require('./WILY_KUN/OWNER/hidetag.js');
                await handleHidetagCommand(sock, msg);
                return;
            }
        }

        // Periksa apakah ini pesan teks
        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || '';

        if (!messageText) return;

        // Load config
        let config = loadConfig();
        const prefix = config.bot?.prefix || '.';

        // Check for cosplay number selection or random (before next command check)
        const { handleCosplaySelectionGlobal } = require('./WILY_KUN/cosplay.js');
        const cosplayHandled = await handleCosplaySelectionGlobal(sock, msg);

        if (cosplayHandled) {
            return; // Exit early if cosplay selection was handled
        }

        // Special check untuk next command (pixiv18 dan pin) - untuk backward compatibility
        if (messageText.toLowerCase().trim() === 'next') {
            // Cek apakah ada cache pencarian pixiv
            const { pixivSearchCache, handleNextPixiv } = require('./WILY_KUN/pixiv.js');
            const pixivCacheKey = msg.key.remoteJid;
            const pixivCachedData = pixivSearchCache.get(pixivCacheKey);

            if (pixivCachedData) {
                await handleNextPixiv(sock, msg);
                return;
            }

            // Cek apakah ada cache pencarian pixiv18
            const { pixiv18SearchCache, handleNextPixiv18 } = require('./WILY_KUN/pixiv18.js');
            const pixiv18CacheKey = msg.key.remoteJid;
            const pixiv18CachedData = pixiv18SearchCache.get(pixiv18CacheKey);

            if (pixiv18CachedData) {
                await handleNextPixiv18(sock, msg);
                return;
            }

            // Jika tidak ada cache, beri pesan error
            await Wily(`❌ Tidak ada data pencarian sebelumnya\n\n💡 Gunakan command cosplay, pixiv atau pixiv18 terlebih dahulu`, msg, sock);
            return;
        }

        // Special check untuk ViewOnce sebelum prefix check
        if (messageText.toLowerCase().includes('.rvo') || messageText.toLowerCase().includes(`${prefix}rvo`)) {
            const { viewOnceHandler } = require('./WILY_KUN/viewonce');
            const handled = await viewOnceHandler(sock, msg);
            if (handled) {
                return;
            }
        }

        // Special check untuk Clear Session commands (lebih spesifik)
        const clearCommands = ['.clearsesi', '.clearsession', '.clear', '.cs'];
        const isClearCommand = clearCommands.some(cmd => {
            const lowerText = messageText.toLowerCase();
            // Pastikan command exact match atau diikuti spasi/akhir string
            return lowerText === cmd || lowerText.startsWith(cmd + ' ');
        });

        // Special case untuk '.c' - harus exact match
        const isExactCCommand = messageText.toLowerCase() === '.c' || messageText.toLowerCase().startsWith('.c ');

        if (isClearCommand || isExactCCommand) {
            const { handleClearSession } = require('./WILY_KUN/OWNER/Clearsesi');
            const handled = await handleClearSession(sock, msg);
            if (handled) {
                return;
            }
        }

        // Duplicate image caption handling removed - already handled above

        // Special handling for sticker with caption toimg command
        if (msg.message?.stickerMessage?.caption) {
            const stickerCaption = msg.message.stickerMessage.caption.trim();
            if (stickerCaption === `${prefix}toimg` || stickerCaption === `${prefix}toimage`) {
                const { handleToImageCommand } = require('./WILY_KUN/toimg.js');
                await handleToImageCommand(sock, msg);
                return;
            }
        }

        // Special handler untuk konfirmasi reset data sebelum command processing
        const userResponse = messageText.trim().toUpperCase();
        const acceptedResponses = ['YA RESET DATA', 'YA', 'YES', 'Y'];

        if (acceptedResponses.includes(userResponse)) {
            // Check if this is a reply to any message
            if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                const quotedText = msg.message.extendedTextMessage.contextInfo.quotedMessage.conversation || 
                                 msg.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text || '';

                if (quotedText.includes('KONFIRMASI RESET DATA')) {
                    const { handleResetConfirmation } = require('./WILY_KUN/ranking.js');
                    await handleResetConfirmation(sock, msg, config);
                    return; // Exit early setelah handle konfirmasi
                }
            }

            // Check if this is a direct response to resetdata command within short time
            // This handles cases where quoted message might not be properly detected
            const recentResetCommands = global.recentResetCommands || new Map();
            const senderJid = msg.key.remoteJid;
            const now = Date.now();

            if (recentResetCommands.has(senderJid)) {
                const resetTime = recentResetCommands.get(senderJid);
                // If reset command was sent within last 5 minutes
                if (now - resetTime < 5 * 60 * 1000) {
                    const { handleResetConfirmation } = require('./WILY_KUN/ranking.js');
                    await handleResetConfirmation(sock, msg, config);
                    recentResetCommands.delete(senderJid); // Remove after handling
                    return;
                }
            }
        }

        // Periksa apakah pesan dimulai dengan prefix
        if (!messageText.startsWith(prefix)) return;

        // Dapatkan nomor pengirim dan nomor bot
        const senderJid = msg.key.remoteJid;
        const botNumber = sock.user?.id?.split(':')[0];

        // PERBAIKAN: Ekstrak nomor pengirim yang tepat
        let actualSenderNumber;

        if (msg.key.participant) {
            // Jika ada participant (pesan grup), gunakan itu
            actualSenderNumber = msg.key.participant.split('@')[0];
        } else if (msg.key.fromMe) {
            // Jika pesan dari bot sendiri, gunakan bot number
            actualSenderNumber = botNumber;
        } else {
            // Untuk private chat biasa
            actualSenderNumber = senderJid?.split('@')[0];
        }

        // Set owner number dan bot number jika belum ada di config
        if (!config.bot?.owner && botNumber) {
            config.bot = config.bot || {};
            config.bot.owner = botNumber;
            saveConfig(config);
        }

        if (!config.bot?.botNumber && botNumber) {
            config.bot = config.bot || {};
            config.bot.botNumber = botNumber;
            saveConfig(config);
        }

        // Reload config untuk memastikan perubahan tersimpan
        config = loadConfig();

        // Periksa mode bot
        if (config.bot?.mode === 'self') {
            // PERBAIKAN: Periksa dengan nomor yang tepat dan tambah fromMe check
            const isBotNumber = actualSenderNumber === botNumber;
            const isOwnerNumber = actualSenderNumber === config.bot?.owner;
            const isBotNumberFromConfig = actualSenderNumber === config.bot?.botNumber;
            const isHardcodedBot = actualSenderNumber === '6289681008411';
            const isFromMe = msg.key.fromMe === true; // Pesan dari bot sendiri

            // Gabungan semua pengecekan - prioritas ke fromMe
            const isAuthorizedUser = isFromMe || isBotNumber || isOwnerNumber || isBotNumberFromConfig || isHardcodedBot;

            // Jika tidak authorized, bot diam saja
            if (!isAuthorizedUser) {
                return; // Bot akan diam saja tanpa mengirim balasan
            }
        }

        // Parse command
        const args = messageText.slice(prefix.length).trim().split(' ');
        const command = args[0].toLowerCase();

        // Fungsi untuk mengecek apakah user adalah owner/bot
        const isOwnerOrBot = () => {
            const isFromMe = msg.key.fromMe === true;
            const isBotNumber = actualSenderNumber === botNumber;
            const isOwnerNumber = actualSenderNumber === config.bot?.owner;
            const isBotNumberFromConfig = actualSenderNumber === config.bot?.botNumber;
            const isHardcodedBot = actualSenderNumber === '6289681008411';

            return isFromMe || isBotNumber || isOwnerNumber || isBotNumberFromConfig || isHardcodedBot;
        };

        // PRIORITY: Cek toprompt command dulu sebelum switch case
        const { handleTopromptCommand } = require('./WILY_KUN/toprompt.js');
        const topromptHandled = await handleTopromptCommand(sock, msg);
        if (topromptHandled) return; // Exit jika sudah dihandle

        // Handle commands dengan struktur yang rapi dan terorganisir
        switch (command) {
            case 'menu':
                {
                    await handleMenuCommand(sock, msg, config);
                }
                break;

            // ======== ANIME SCRAPER CASES ========
            case 'anime':
            case 'animelist':
            case 'animehelp':
            // SFW Categories
            case 'waifu':
            case 'neko':
            case 'shinobu':
            case 'megumin':
            case 'bully':
            case 'cuddle':
            case 'cry':
            case 'hug':
            case 'awoo':
            case 'kiss':
            case 'lick':
            case 'pat':
            case 'smug':
            case 'bonk':
            case 'yeet':
            case 'blush':
            case 'smile':
            case 'wave':
            case 'highfive':
            case 'handhold':
            case 'nom':
            case 'bite':
            case 'glomp':
            case 'slap':
            case 'kill':
            case 'kick':
            case 'happy':
            case 'wink':
            case 'poke':
            case 'dance':
            case 'cringe':
            // NSFW Categories
            case 'waifu18':
            case 'neko18':
            case 'trap':
            case 'blowjob':
            case 'cum':
            case 'milf':
            case 'paizuri':
            case 'tentacle':
            case 'succubus':
            case 'shinobu18':
            case 'megumin18':
            case 'bdsm':
            case 'hentai':
            case 'ahegao':
            case 'uniform':
            case 'orgy':
            case 'maid':
            case 'marin':
            case 'raiden':
            case 'oppai':
            case 'selfies':
            case 'oral':
            case 'ass':
            case 'boobs':
            case 'thigh':
            case 'pussy':
            case 'classic':
            case 'kitsune':
            case 'kemonomimi':
            case 'public':
            case 'ero':
            case 'elf':
            case 'yuri':
            case 'pantsu':
            case 'glasses':
                {
                    const { animeScraperHandler } = require('./WILY_KUN/scraperanime.js');
                    await animeScraperHandler(msg, sock);
                }
                break;

            case 'brat':
                {
                    const { handleBratCommand } = require('./WILY_KUN/brat.js');
                    await handleBratCommand(sock, msg, 'brat');
                }
                break;

            case 'bratanimasi':
                {
                    const { handleBratCommand } = require('./WILY_KUN/brat.js');
                    await handleBratCommand(sock, msg, 'bratanimasi');
                }
                break;

            // Delegate menu commands to MENU handler
            case 'menuowner':
            case 'menusystem':
            case 'menuautoreaction':
            case 'menutools':
            case 'menudownload':
            case 'menuanime':
            case 'menuinfo':
            case 'owner':
            case 'system':
            case 'autoreaction':
            case 'tools':
            case 'download':
            case 'anime':
            case 'info':
            case 'menuall':
                {
                    const { handleAllMenuCommands, handleMenuAllCommand } = require('./MENU/MENU.js');

                    if (command === 'menuall') {
                        await handleMenuAllCommand(sock, msg, config);
                    } else {
                        const handled = await handleAllMenuCommands(sock, msg, config, command);
                        if (!handled) {
                            // Fallback jika command tidak ditemukan
                            await handleMenuCommand(sock, msg, config);
                        }
                    }
                }
                break;

            case 'skiperror':
                {
                    // Import dan handle skiperror command
                    const { handleSkipErrorCommand } = require('./WILY_KUN/OWNER/skiperror.js');
                    await handleSkipErrorCommand(sock, msg);
                }
                break;

            case 'mode':
                {
                    // 🔐 FITUR KHUSUS OWNER/BOT - Validasi akses
                    if (!isOwnerOrBot()) {
                        // Jika mode self, bot tidak merespon sama sekali
                        if (config.bot?.mode === 'self') {
                            break; // Silent exit
                        }

                        const accessDeniedText = `
🚫 *AKSES DITOLAK*

❌ Maaf, fitur ini hanya berlaku untuk owner dan nomor bot saja

🔐 *Fitur Khusus Owner/Bot:*
• mode - Mengatur mode bot
• prefix - Mengatur prefix
• restart - Restart bot  
• skiperror - Skip error manager
• settings - Pengaturan bot

💡 *Gunakan fitur lain:*
• ${config.bot.prefix}menu - Lihat semua fitur
• ${config.bot.prefix}ping - Cek ping bot
• ${config.bot.prefix}info - Info bot
• ${config.bot.prefix}status - Status bot`;

                        await sendQuotedMessage(sock, msg.key.remoteJid, accessDeniedText, msg);
                        break;
                    }

                    if (args.length < 2) {
                        const helpText = `
❌ *Format salah!*

📝 *Cara penggunaan:*
${config.bot.prefix}mode self
${config.bot.prefix}mode public

📋 *Penjelasan:*
• *self* - Bot hanya bisa digunakan oleh nomor bot sendiri
• *public* - Bot bisa digunakan oleh semua orang

📊 *Mode saat ini:* ${config.bot.mode.toUpperCase()}`;

                        await sendQuotedMessage(sock, msg.key.remoteJid, helpText, msg);
                        break;
                    }

                    const newMode = args[1].toLowerCase();

                    if (newMode !== 'self' && newMode !== 'public') {
                        await sendQuotedMessage(sock, msg.key.remoteJid, `❌ Mode tidak valid! Gunakan 'self' atau 'public'`, msg);
                        break;
                    }

                    // Periksa apakah mode sudah sama
                    if (config.bot.mode === newMode) {
                        await sendQuotedMessage(sock, msg.key.remoteJid, `⚠️ Maaf, fitur tersebut sudah dalam keadaan mode *${newMode.toUpperCase()}*`, msg);
                        break;
                    }

                    // Update config dan owner
                    config.bot.mode = newMode;

                    // Pastikan owner number ter-set
                    const botNumber = sock.user?.id?.split(':')[0];
                    if (botNumber && !config.bot.owner) {
                        config.bot.owner = botNumber;
                    }

                    if (saveConfig(config)) {
                        const modeText = newMode === 'self' ? 
                            '🔒 *MODE SELF AKTIF*\n\n✅ Bot sekarang hanya bisa digunakan oleh nomor bot sendiri' :
                            '🌐 *MODE PUBLIC AKTIF*\n\n✅ Bot sekarang bisa digunakan oleh semua orang';

                        await sendQuotedMessage(sock, msg.key.remoteJid, modeText, msg);
                    } else {
                        await sendQuotedMessage(sock, msg.key.remoteJid, `❌ Gagal menyimpan pengaturan mode`, msg);
                    }
                }
                break;

            case 'prefix':
                {
                    // 🔐 FITUR KHUSUS OWNER/BOT - Validasi akses
                    if (!isOwnerOrBot()) {
                        const accessDeniedText = `
🚫 *AKSES DITOLAK*

❌ Maaf, fitur ini hanya berlaku untuk owner dan nomor bot saja

🔐 *Fitur Khusus Owner/Bot:*
• mode - Mengatur mode bot
• prefix - Mengatur prefix
• restart - Restart bot  
• settings - Pengaturan bot

💡 *Gunakan fitur lain:*
• ${config.bot.prefix}menu - Lihat semua fitur
• ${config.bot.prefix}ping - Cek ping bot
• ${config.bot.prefix}info - Info bot
• ${config.bot.prefix}status - Status bot`;

                        await sendQuotedMessage(sock, msg.key.remoteJid, accessDeniedText, msg);
                        break;
                    }

                    if (args.length < 2) {
                        const helpText = `
❌ *Format salah!*

📝 *Cara penggunaan:*
${config.bot.prefix}prefix !
${config.bot.prefix}prefix #
${config.bot.prefix}prefix /

📊 *Prefix saat ini:* ${config.bot.prefix}`;

                        await sendQuotedMessage(sock, msg.key.remoteJid, helpText, msg);
                        break;
                    }

                    const newPrefix = args[1];

                    // Validasi prefix (hanya 1 karakter)
                    if (newPrefix.length !== 1) {
                        await sendQuotedMessage(sock, msg.key.remoteJid, `❌ Prefix harus 1 karakter saja!`, msg);
                        break;
                    }

                    // Periksa apakah prefix sudah sama
                    if (config.bot.prefix === newPrefix) {
                        await sendQuotedMessage(sock, msg.key.remoteJid, `⚠️ Prefix sudah menggunakan *${newPrefix}*`, msg);
                        break;
                    }

                    // Update config
                    config.bot.prefix = newPrefix;

                    if (saveConfig(config)) {
                        await sendQuotedMessage(sock, msg.key.remoteJid, `✅ *PREFIX BERHASIL DIUBAH*\n\nPrefix baru: *${newPrefix}*\n\nContoh penggunaan:\n${newPrefix}menu\n${newPrefix}mode self\n${newPrefix}mode public`, msg);
                    } else {
                        await sendQuotedMessage(sock, sock.key.remoteJid, `❌ Gagal menyimpan pengaturan prefix`, msg);
                    }
                }
                break;

            case 'help':
                {
                    // Redirect ke menu command
                    const menuText = `
┌─────────────────────────┐
│    🤖 *HELP BOT*    │
└─────────────────────────┘

📋 *COMMAND LIST:*

▸ ${config.bot.prefix}menu → Menampilkan menu
▸ ${config.bot.prefix}mode <self/public> → Mengatur mode bot
▸ ${config.bot.prefix}prefix <symbol> → Mengatur prefix
▸ ${config.bot.prefix}autoreaction <mode> → Atur auto reaction
▸ ${config.bot.prefix}autotyping <on/off> → Atur auto typing
▸ ${config.bot.prefix}autorecord <on/off> → Atur auto recording
▸ ${config.bot.prefix}online <on/off> → Atur auto online
▸ ${config.bot.prefix}autoceklis2abuabu <on/off> → Atur auto ceklis 2 abu-abu
▸ ${config.bot.prefix}ping → Cek ping bot
▸ ${config.bot.prefix}info → Info bot
▸ ${config.bot.prefix}status → Status bot
▸ ${config.bot.prefix}ranking all → Ranking lengkap
▸ ${config.bot.prefix}ranking status → Top status readers
▸ ${config.bot.prefix}ranking emoji → Top emojis used

┌─────────────────────────┐
│ 📊 *STATUS BOT:*        │
└─────────────────────────┘

▸ Mode: ${config.bot.mode.toUpperCase()}
▸ Prefix: ${config.bot.prefix}
▸ Reaction: ${config.autoReactionStory.enabled ? (config.autoReactionStory.mode === 'always' ? 'ON' : config.autoReactionStory.mode.toUpperCase()) : 'OFF'}
▸ Auto Typing: ${config.autoFeatures?.typing ? 'ON' : 'OFF'}
▸ Auto Record: ${config.autoFeatures?.recording ? 'ON' : 'OFF'}
▸ Auto Online: ${config.autoFeatures?.online ? 'ON' : 'OFF'}
▸ Auto Ceklis 2 Abu-abu: ${config.autoFeatures?.ceklis2abuabu ? 'ON' : 'OFF'}

🤖 *WhatsApp Bot Auto Read Story*
✨ By: Wily - Premium Edition ✨`;

                    await sendQuotedMessage(sock, msg.key.remoteJid, menuText, msg);
                }
                break;

            case 'status':
                {
                    const botNumber = sock.user?.id?.split(':')[0] || 'Unknown';
                    const uptime = process.uptime();
                    const hours = Math.floor(uptime / 3600);
                    const minutes = Math.floor((uptime % 3600) / 60);
                    const seconds = Math.floor(uptime % 60);

                    const statusText = `
📊 *BOT STATUS*

🟢 *Status:* Online & Running
⏰ *Uptime:* ${hours}h ${minutes}m ${seconds}s
📱 *Bot Number:* ${botNumber}
🔧 *Mode:* ${config.bot.mode.toUpperCase()}
⚙️ *Prefix:* ${config.bot.prefix}
💾 *Memory Usage:* ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB

🤖 *Auto Read Story:* Aktif ✅
📱 *WhatsApp Web:* Connected ✅`;

                    await sendQuotedMessage(sock, msg.key.remoteJid, statusText, msg);
                }
                break;





            case 's':
            case 'sticker':
                {
                    const { handleStickerCommand } = require('./WILY_KUN/sticker.js');
                    await handleStickerCommand(sock, msg);
                }
                break;

            case 'toimg':
                {
                    const { handleToImageCommand } = require('./WILY_KUN/toimg.js');
                    await handleToImageCommand(sock, msg);
                }
                break;



            case 'play':
                {
                    // Import dan panggil handler play command
                    const { handlePlayCommand } = require('./WILY_KUN/DOWNLOAD/play.js');
                    await handlePlayCommand(sock, msg);
                }
                break;

            case 'play2':
                {
                    // Import dan panggil handler play2 command
                    const { handlePlay2Command } = require('./WILY_KUN/DOWNLOAD/play2.js');
                    await handlePlay2Command(sock, msg);
                }
                break;

            case 'fb':
                {
                    // Import dan panggil handler Facebook downloader
                    const { handleFbCommand } = require('./WILY_KUN/DOWNLOAD/fb.js');
                    await handleFbCommand(sock, msg);
                }
                break;



            case 'tt':
            case 'tiktok':
                {
                    const { handleTikTokCommand } = require('./WILY_KUN/DOWNLOAD/tiktok.js');
                    await handleTikTokCommand(sock, msg);
                }
                break;

            case 'ttaudio':
                {
                    const
 { handleTikTokAudioCommand } = require('./WILY_KUN/DOWNLOAD/tiktok.js');
                    await handleTikTokAudioCommand(sock, msg);
                }
                break;

            case 'ig':
                {
                    const { handleIgCommand } = require('./WILY_KUN/DOWNLOAD/ig.js');
                    await handleIgCommand(sock, msg);
                }
                break;

            case 'threads':
                {
                    const { handleThreadsCommand } = require('./WILY_KUN/DOWNLOAD/threads.js');
                    await handleThreadsCommand(sock, msg);
                }
                break;

            case 'typing':
            case 'record':  
            case 'online':
                {
                    // 🔐 FITUR KHUSUS OWNER/BOT - Validasi akses
                    if (!isOwnerOrBot()) {
                        const accessDeniedText = `
🚫 *AKSES DITOLAK*

❌ Maaf, fitur ini hanya berlaku untuk owner dan nomor bot saja

🔐 *Fitur Khusus Owner/Bot:*
• autotyping - Mengatur auto typing
• autorecord - Mengatur auto recording  
• autoonline - Mengatur auto online
• autoceklis2abuabu - Mengatur auto ceklis 2 abu-abu
• mode - Mengatur mode bot
• prefix - Mengatur prefix

💡 *Gunakan fitur lain:*
• ${config.bot.prefix}menu - Lihat semua fitur
• ${config.bot.prefix}ping - Cek ping bot
• ${config.bot.prefix}info - Info bot
• ${config.bot.prefix}status - Status bot`;

                        await sendQuotedMessage(sock, msg.key.remoteJid, accessDeniedText, msg);
                        break;
                    }

                    // Import dan handle dari WILY_KUN
                    const { handleAutoFeaturesCommand } = require('./WILY_KUN/index.js');
                    await handleAutoFeaturesCommand(sock, msg, command, args, config);
                }
                break;

            case 'settings':
                {
                    // 🔐 FITUR KHUSUS OWNER/BOT - Validasi akses
                    if (!isOwnerOrBot()) {
                        const accessDeniedText = `🚫 *AKSES DITOLAK*

❌ Maaf, fitur ini hanya berlaku untuk owner dan bot saja

🔐 *Fitur Khusus Owner/Bot:*• mode - Mengatur mode bot
• prefix - Mengatur prefix
• restart - Restart bot  
• settings - Pengaturan bot
• autoreaction - Mengatur mode auto reaction
• autotyping - Mengatur auto typing
• autorecord - Mengatur auto recording
• autoonline - Mengatur auto online
• autoceklis2abuabu - Mengatur autoabu-abu

💡 *Gunakan fitur lain:*
• ${config.bot.prefix}menu - Lihat semua fitur
• ${config.bot.prefix}ping - Cek ping bot
• ${config.bot.prefix}info - Info bot
• ${config.bot.prefix}status - Status bot`;

                        await sendQuotedMessage(sock, msg.key.remoteJid, accessDeniedText, msg);
                        break;
                    }

                    const settingsText = `
⚙️ *PENGATURAN BOT*

🔧 *Konfigurasi Saat Ini:*
├─ Mode: ${config.bot.mode.mode.toUpperCase()}
├─ Prefix: ${config.bot.prefix}
├─ Owner: ${config.bot.owner}
├─ Bot Number: ${config.bot.botNumber}

📊 *Auto Read Story:*
├─ Status: ${config.autoReactionStory.enabled ? 'Aktif ✅' : 'Nonaktif ❌'}
├─ Mode: ${config.autoReactionStory.mode}
├─ Delay: ${config.autoReactionStory.delay}ms

🤖 *Auto Features:*
├─ Auto Typing: ${config.autoFeatures?.typing ? 'ON ✅' : 'OFF ❌'}
├─ Auto Recording: ${config.autoFeatures?.recording ? 'ON ✅' : 'OFF ❌'}
├─ Auto Online: ${config.autoFeatures?.online ? 'ON ✅' : 'OFF ❌'}
├─ Auto Ceklis 2 Abu-abu: ${config.autoFeatures?.ceklis2abuabu ? 'ON ✅' : 'OFF ❌'}

🎯 *Fitur Tersedia:*
├─ ${config.bot.prefix}mode <self/public>
├─ ${config.bot.prefix}prefix <symbol>
├─ ${config.bot.prefix}reaction <on/off/random>
├─ ${config.bot.prefix}typing <on/off>
├─ ${config.bot.prefix}record <on/off>
├─ ${config.bot.prefix}online <on/off>
├─ ${config.bot.prefix}restart
└─ ${config.bot.prefix}settings

🔐 *Akses:* Owner & Bot Only`;

                    await sendQuotedMessage(sock, msg.key.remoteJid, settingsText, msg);
                }
                break;

            case 'rvo':
                {
                    // Import dan jalankan ViewOnce handler
                    const { viewOnceHandler } = require('./WILY_KUN/viewonce');
                    await viewOnceHandler(sock, msg);
                }
                break;



            case 'rvov2':
                {
                    // Import dan jalankan ViewOnce V2 handler
                    const { viewOnceV2Handler } = require('./WILY_KUN/viewoncev2');
                    const result = await viewOnceV2Handler(sock, msg);
                    return; // Exit early after handling
                }
                break;

            case 'backupsesi':{
                const { handleBackupCommand } = require('./WILY_KUN/OWNER/Backupsesi');
                await handleBackupCommand(sock, msg, config);
                break;
            }

            case 'setdelay':
                {
                    // 🔐 FITUR KHUSUS OWNER/BOT - Validasi akses
                    if (!isOwnerOrBot()) {
                        const accessDeniedText = `
🚫 *AKSES DITOLAK*

❌ Maaf, fitur ini hanya berlaku untuk owner dan nomor bot saja

🔐 *Fitur Khusus Owner/Bot:*
• setdelay - Mengatur delay reaction
• mode - Mengatur mode bot
• prefix - Mengatur prefix
• restart - Restart bot  
• settings - Pengaturan bot

💡 *Gunakan fitur lain:*
• ${config.bot.prefix}menu - Lihat semua fitur
• ${config.bot.prefix}ping - Cek ping bot
• ${config.bot.prefix}info - Info bot
• ${config.bot.prefix}status - Status bot`;

                        await sendQuotedMessage(sock, msg.key.remoteJid, accessDeniedText, msg);
                        break;
                    }

                    if (args.length < 2) {
                        const helpText = `
❌ *FORMAT SALAH!*

📝 *Cara penggunaan:*
${config.bot.prefix}setdelay 1
${config.bot.prefix}setdelay 3
${config.bot.prefix}setdelay 5

📋 *Penjelasan:*
• Angka dalam detik untuk delay reaction
• Minimal: 1 detik
• Maksimal: 30 detik
• Default: 3 detik

⚙️ *Pengaturan Saat Ini:*
├─ Delay Reaction: ${config.autoReactionStory?.delay ? config.autoReactionStory.delay / 1000 : 3} detik
├─ Speed Views: ${config.settings?.speedViews || 3} detik
└─ Reaction Delay: ${config.settings?.reactionDelay ? config.settings.reactionDelay / 1000 : 3} detik

💡 *Contoh:*
${config.bot.prefix}setdelay 2 → Reaction delay 2 detik`;

                        await sendQuotedMessage(sock, msg.key.remoteJid, helpText, msg);
                        break;
                    }

                    const delaySeconds = parseInt(args[1]);

                    // Validasi input angka
                    if (isNaN(delaySeconds)) {
                        await sendQuotedMessage(sock, msg.key.remoteJid, `❌ *FORMAT SALAH!*\n\nMasukkan angka yang valid!\n\nContoh: ${config.bot.prefix}setdelay 3`, msg);
                        break;
                    }

                    // Validasi range delay (1-30 detik)
                    if (delaySeconds < 1 || delaySeconds > 30) {
                        await sendQuotedMessage(sock, msg.key.remoteJid, `❌ *DELAY TIDAK VALID!*\n\n⚠️ Delay harus antara 1-30 detik!\n\nContoh yang benar:\n• ${config.bot.prefix}setdelay 1\n• ${config.bot.prefix}setdelay 5\n• ${config.bot.prefix}setdelay 10`, msg);
                        break;
                    }

                    const delayMs = delaySeconds * 1000; // Convert ke milliseconds

                    // Periksa apakah delay sudah sama
                    if (config.autoReactionStory?.delay === delayMs && 
                        config.settings?.speedViews === delaySeconds && 
                        config.settings?.reactionDelay === delayMs) {
                        await sendQuotedMessage(sock, msg.key.remoteJid, `⚠️ *DELAY SUDAH SAMA!*\n\nDelay reaction sudah diatur ke *${delaySeconds} detik*`, msg);
                        break;
                    }

                    // Update config dengan semua delay settings
                    if (!config.autoReactionStory) config.autoReactionStory = {};
                    if (!config.settings) config.settings = {};

                    config.autoReactionStory.delay = delayMs;
                    config.settings.speedViews = delaySeconds;
                    config.settings.reactionDelay = delayMs;

                    if (saveConfig(config)) {
                        // Load config fresh untuk status autoreaction yang akurat
                        const freshConfig = loadConfig();

                        // Mapping display mode dari config untuk setdelay response
                        let displayMode = 'OFF';
                        let displayStatus = 'Nonaktif ❌';

                        if (freshConfig.autoReactionStory?.enabled) {
                            switch (freshConfig.autoReactionStory.mode) {
                                case 'always':
                                    displayMode = 'ON';
                                    displayStatus = 'Aktif ✅';
                                    break;
                                case 'random':
                                    displayMode = 'RANDOM';
                                    displayStatus = 'Aktif ✅ (Mode Acak)';
                                    break;
                                default:
                                    displayMode = 'OFF';
                                    displayStatus = 'Nonaktif ❌';
                                    break;
                            }
                        }

                        const successText = `
✅ *DELAY BERHASIL DIATUR!*

⚙️ *Pengaturan Baru:*
├─ ⏱️ Delay Reaction: ${delaySeconds} detik
├─ 🏃 Speed Views: ${delaySeconds} detik  
└─ 🎯 Reaction Delay: ${delaySeconds} detik

📊 *Detail Konfigurasi:*
├─ Delay dalam ms: ${delayMs}ms
├─ Status: Tersimpan ke config.json ✅
└─ Efek: Berlaku langsung untuk reaction selanjutnya

🎯 *Fungsi:*
• Bot akan menunggu ${delaySeconds} detik sebelum memberikan reaction
• Speed views story juga diatur ke ${delaySeconds} detik
• Delay berlaku untuk semua auto reaction

🤖 *STATUS AUTO REACTION SAAT INI:*
├─ Mode: ${displayMode}
├─ Status: ${displayStatus}
└─ Delay: ${delaySeconds} detik (baru diperbarui)

💡 *PENGATURAN AUTO REACTION:*
• ${config.bot.prefix}autoreaction on → Aktifkan auto reaction
• ${config.bot.prefix}autoreaction off → Matikan auto reaction
• ${config.bot.prefix}autoreaction random → Mode acak

🔄 Pengaturan delay telah aktif dan tersimpan!`;

                        await sendQuotedMessage(sock, msg.key.remoteJid, successText, msg);
                    } else {
                        await sendQuotedMessage(sock, msg.key.remoteJid, `❌ *GAGAL MENYIMPAN!*\n\nTerjadi error saat menyimpan pengaturan delay ke config.json\n\nSilakan coba lagi!`, msg);
                    }
                }
                break;

            case 'cekidgc':
                {
                    const { cekidgcHandler } = require('./WILY_KUN/Cekidgc.js');
                    await cekidgcHandler(msg, sock);
                }
                break;

            case 'cekidch':
                {
                    const { cekidchHandler } = require('./WILY_KUN/Cekidch.js');
                    await cekidchHandler(sock, msg);
                }
                break;

            case 'ranking':
                {
                    const { handleRankingCommand } = require('./WILY_KUN/ranking.js');
                    await handleRankingCommand(sock, msg, config, args);
                }
                break;

            case 'resetdata':
                {
                    // 🔐 FITUR KHUSUS OWNER/BOT - Validasi akses
                    if (!isOwnerOrBot()) {
                        // Untuk mode public, berikan respons penolakan akses
                        if (config.bot?.mode === 'public') {
                            const accessDeniedText = `
🚫 *AKSES DITOLAK*

❌ Maaf, fitur ini khusus untuk:
• Owner Bot
• Bot Owner
• Form Me

🔐 *Fitur Reset Data hanya untuk:*
├─ Owner: ${config.bot?.owner || 'Tidak diset'}
├─ Bot Number: ${config.bot?.botNumber || 'Tidak diset'}
└─ Form Me: Pemilik bot

💡 *Gunakan fitur lain yang tersedia:*
• ${config.bot?.prefix || '.'}ranking all - Lihat ranking
• ${config.bot?.prefix || '.'}ranking status - Top pembaca status
• ${config.bot?.prefix || '.'}ranking emoji - Top emoji
• ${config.bot?.prefix || '.'}menu - Menu lengkap

⚠️ *Reset data hanya bisa dilakukan oleh pemilik bot untuk keamanan data*`;

                            await sendQuotedMessage(sock, msg.key.remoteJid, accessDeniedText, msg);
                        }
                        // Untuk mode self, bot diam saja (tidak ada respons)
                        return;
                    }

                    const { handleResetData } = require('./WILY_KUN/ranking.js');
                    await handleResetData(sock, msg, config);
                }
                break;

            case 'ping':
            case 'info': 
            case 'runtime':
                {
                    const { handleRuntimeCommand } = require('./WILY_KUN/runtime.js');
                    await handleRuntimeCommand(sock, msg);
                }
                break;

            case 'hitamkan':
                {
                    const { handleHitamkanCommand } = require('./WILY_KUN/hitamkan.js');
                    await handleHitamkanCommand(sock, msg);
                }
                break;





            case 'removebg':
                {
                    const { handleRemoveBgCommand } = require('./WILY_KUN/removebg.js');
                    await handleRemoveBgCommand(sock, msg);
                }
                break;

            case 'getppuser':
                {
                    const { handleGetPPUserCommand } = require('./WILY_KUN/getppuser.js');
                    await handleGetPPUserCommand(sock, msg);
                }
                break;

            case 'getppgroup':
                {
                    const { handleGetPPGroupCommand } = require('./WILY_KUN/getppgroup.js');
                    await handleGetPPGroupCommand(sock, msg);
                }
                break;

            case 'smeme':
                {
                    const { handleSmemeCommand } = require('./WILY_KUN/smeme.js');
                    await handleSmemeCommand(sock, msg);
                }
                break;

            case 'aisticker':
                {
                    const { handleAIStickerCommand } = require('./WILY_KUN/aisticker.js');
                    await handleAIStickerCommand(sock, msg);
                }
                break;

            case 'stickerly':
                {
                    const { handleStickerlyCommand } = require('./WILY_KUN/stickerly.js');
                    await handleStickerlyCommand(sock, msg);
                }
                break;

            case 'qc':
                {
                    // First check if user only typed .qc for examples
                    const { handleQcOnlyCommand } = require('./WILY_KUN/stickerly2.js');
                    const qcOnlyHandled = await handleQcOnlyCommand(sock, msg);

                    if (!qcOnlyHandled) {
                        // If not .qc only, handle normal qc command
                        const { handleQcCommand } = require('./WILY_KUN/qc.js');
                        await handleQcCommand(sock, msg);
                    }
                }
                break;

            case 'hd':
                {
                    const { handleHdCommand } = require('./WILY_KUN/hd.js');
                    await handleHdCommand(sock, msg);
                }
                break;

            case 'owner':
                {
                    const ownerText = `
👤 *BOT OWNER INFO*

📱 *Owner Number:* ${config.bot.owner || 'Not Set'}
🤖 *Bot Number:* ${sock.user?.id?.split(':')[0] || 'Unknown'}

💻 *Developer:* Wily
🌟 *Version:* Premium Edition
🔥 *Contact:* wa.me/${config.bot.owner}`;

                    await sendQuotedMessage(sock, msg.key.remoteJid, ownerText, msg);
                }
                break;

            case 'nsfwimage':
                {
                    // Import NSFW Image command handler
                    const { handleNsfwImageCommand } = require('./WILY_KUN/nsfwimage.js');
                    await handleNsfwImageCommand(sock, msg);
                }
                break;

            case 'realimage':
                {
                    // Import Real Image command handler
                    const { handleRealImageCommand } = require('./WILY_KUN/realimage.js');
                    await handleRealImageCommand(sock, msg);
                }
                break;

            case 'mediafire':
                {
                    const { handleMediaFireCommand } = require('./WILY_KUN/mediafire.js');
                    await handleMediaFireCommand(sock, msg);
                }
                break;

            case 'backupsc':
                {
                    const { sendSourceCodeBackup } = require('./WILY_KUN/OWNER/backupsc.js');
                    await sendSourceCodeBackup(sock, msg);
                }
                break;

            case 'unduhsw':
                {
                    // 🔐 FITUR KHUSUS OWNER/BOT - Validasi akses
                    if (!isOwnerOrBot()) {
                        // Untuk mode public, berikan respons penolakan akses
                        if (config.bot?.mode === 'public') {
                            const accessDeniedText = `
🚫 *AKSES DITOLAK*

❌ Maaf, fitur ini khusus untuk:
• Owner Bot
• Bot Owner  
• Form Me

🔐 *Fitur Auto Download Story hanya untuk:*
├─ Owner: ${config.bot?.owner || 'Tidak diset'}
├─ Bot Number: ${config.bot?.botNumber || 'Tidak diset'}
└─ Form Me: Pemilik bot

💡 *Gunakan fitur lain yang tersedia:*
• ${config.bot?.prefix || '.'}menu - Menu lengkap
• ${config.bot?.prefix || '.'}status - Status bot
• ${config.bot?.prefix || '.'}info - Info bot
• ${config.bot?.prefix || '.'}ping - Cek ping bot

⚠️ *Auto download story hanya bisa digunakan oleh pemilik bot untuk privasi dan keamanan*`;

                            await sendQuotedMessage(sock, msg.key.remoteJid, accessDeniedText, msg);
                        }
                        // Untuk mode self, bot diam saja (tidak ada respons)
                        return;
                    }

                    const { handleAutoUnduhStoryCommand } = require('./WILY_KUN/OWNER/AutoUnduhStory.js');
                    await handleAutoUnduhStoryCommand(sock, msg, config);
                }
                break;

            case 'welcome':
                {
                    // 🔐 FITUR KHUSUS OWNER/BOT - Validasi akses
                    if (!isOwnerOrBot()) {
                        // Untuk mode public, berikan respons penolakan akses
                        if (config.bot?.mode === 'public') {
                            const accessDeniedText = `
🚫 *AKSES DITOLAK*

❌ Maaf, fitur ini khusus untuk:
• Owner Bot
• Bot Owner  
• Form Me

🔐 *Fitur Welcome Message hanya untuk:*
├─ Owner: ${config.bot?.owner || 'Tidak diset'}
├─ Bot Number: ${config.bot?.botNumber || 'Tidak diset'}
└─ Form Me: Pemilik bot

💡 *Gunakan fitur lain yang tersedia:*
• ${config.bot?.prefix || '.'}menu - Menu lengkap
• ${config.bot?.prefix || '.'}status - Status bot
• ${config.bot?.prefix || '.'}info - Info bot
• ${config.bot?.prefix || '.'}ping - Cek ping bot

⚠️ *Welcome message hanya bisa diatur oleh pemilik bot*`;

                            await sendQuotedMessage(sock, msg.key.remoteJid, accessDeniedText, msg);
                        }
                        // Untuk mode self, bot diam saja (tidak ada respons)
                        return;
                    }

                    const { handleWelcomeCommand } = require('./WILY_KUN/WELCOME_DAN_GOODBYE/welcome.js');
                    await handleWelcomeCommand(sock, msg, config, args);
                }
                break;

            case 'goodbye':
                {
                    // 🔐 FITUR KHUSUS OWNER/BOT - Validasi akses
                    if (!isOwnerOrBot()) {
                        // Untuk mode public, berikan respons penolakan akses
                        if (config.bot?.mode === 'public') {
                            const accessDeniedText = `
🚫 *AKSES DITOLAK*

❌ Maaf, fitur ini khusus untuk:
• Owner Bot
• Bot Owner  
• Form Me

🔐 *Fitur Goodbye Message hanya untuk:*
├─ Owner: ${config.bot?.owner || 'Tidak diset'}
├─ Bot Number: ${config.bot?.botNumber || 'Tidak diset'}
└─ Form Me: Pemilik bot

💡 *Gunakan fitur lain yang tersedia:*
• ${config.bot?.prefix || '.'}menu - Menu lengkap
• ${config.bot?.prefix || '.'}status - Status bot
• ${config.bot?.prefix || '.'}info - Info bot
• ${config.bot?.prefix || '.'}ping - Cek ping bot

⚠️ *Goodbye message hanya bisa diatur oleh pemilik bot*`;

                            await sendQuotedMessage(sock, msg.key.remoteJid, accessDeniedText, msg);
                        }
                        // Untuk mode self, bot diam saja (tidak ada respons)
                        return;
                    }

                    const { handleGoodbyeCommand } = require('./WILY_KUN/WELCOME_DAN_GOODBYE/goodbye.js');
                    await handleGoodbyeCommand(sock, msg, config, args);
                }
                break;

            case 'anticall':
                {
                    const { handleAnticallCommand } = require('./WILY_KUN/OWNER/anticall.js');
                    await handleAnticallCommand(sock, msg, config, args);
                }
                break;

            case 'anticallvid':
                {
                    const { handleAutoFeaturesCommand } = require('./WILY_KUN/index.js');
                    const safeConfig = loadConfig();
                    await handleAutoFeaturesCommand(sock, msg, 'anticallvid', args, safeConfig);
                }
                break;

            case 'stickerly2':
                {
                    const { handleStickerly2Command } = require('./WILY_KUN/stickerly2.js');
                    await handleStickerly2Command(sock, msg);
                }
                break;

            case 'tourl':
                {
                    const { handleTourlCommand } = require('./WILY_KUN/tourl.js');
                    await handleTourlCommand(sock, msg);
                }
                break;

            case 'fakechwa':
                {
                    const { handleFakeChwaCommand } = require('./WILY_KUN/fakechwa.js');
                    await handleFakeChwaCommand(sock, msg);
                }
                break;

            case 'fakechat':
                {
                    const { handleFakeChatCommand } = require('./WILY_KUN/fakechat.js');
                    await handleFakeChatCommand(sock, msg);
                }
                break;

            case 'ytmp3':
                {
                    const { handleYtmp3Command } = require('./WILY_KUN/DOWNLOAD/ytmp3danytmp4.js');
                    await handleYtmp3Command(sock, msg);
                }
                break;

            case 'ytmp4':
                {
                    const { handleYtmp4Command } = require('./WILY_KUN/DOWNLOAD/ytmp3danytmp4.js');
                    await handleYtmp4Command(sock, msg);
                }
                break;

            case 'pixiv18':
                {
                    const { handlePixivCommand } = require('./WILY_KUN/pixiv18.js');
                    await handlePixivCommand(sock, msg);
                }
                break;

            case 'toprompt':
                 {
                    // Handler internal sudah ada di toprompt.js, tidak perlu case di sini lagi
                    // Command handling sekarang dilakukan internal di file toprompt.js
                 }
                 break;

            case 'toanimfinder':
                {
                    const { handleToAnimFinderCommand } = require('./WILY_KUN/toanimfinder.js');
                    await handleToAnimFinderCommand(sock, msg);
                }
                break;

            case 'toghibli':
                {
                    const { handleToghibliCommand } = require('./WILY_KUN/toghibli.js');
                    await handleToghibliCommand(sock, msg);
                }
                break;

            case 'cosplay':
                {
                    const { handleCosplayCommand } = require('./WILY_KUN/cosplay.js');
                    await handleCosplayCommand(sock, msg);
                }
                break;

            case 'pin':
                {
                    const { handlePinCommand } = require('./WILY_KUN/pin.js');
                    await handlePinCommand(sock, msg);
                }
                break;

            case 'emoji':
                {
                    const { handleEmojiCommand } = require('./WILY_KUN/emoji.js');
                    await handleEmojiCommand(sock, msg);
                }
                break;

            case 'nulis':
                {
                    const { handleNulisCommand } = require('./WILY_KUN/nulis.js');
                    await handleNulisCommand(sock, msg);
                }
                break;

            case 'antitagsw':
                {
                    const { handleAntitagswCommand } = require('./WILY_KUN/antitagsw.js');
                    await handleAntitagswCommand(sock, msg, config, args.slice(1));
                }
                break;

            case 'infobot':
                {
                    const { handleInfoBotCommand } = require('./WILY_KUN/OWNER/infobot.js');
                    await handleInfoBotCommand(sock, msg, config);
                }
                break;

            case 'ffstalk':
                {
                    const { handleFFStalkCommand } = require('./WILY_KUN/ffstalk.js');
                    await handleFFStalkCommand(sock, msg);
                }
                break;

            case 'getsticwa':
                {
                     const { handleGetSticwaCommand } = require('./WILY_KUN/getsticwa.js');
                     await handleGetSticwaCommand(sock, msg);
                }
                break;

            case 'hidetag':
                {
                    const { handleHidetagCommand } = require('./WILY_KUN/OWNER/hidetag.js');
                    await handleHidetagCommand(sock, msg);
                }
                break;

            case 'quotesanim':
                {
                    const { handleQuotesAnimCommand } = require('./WILY_KUN/quotesanim.js');
                    await handleQuotesAnimCommand(sock, msg);
                }
                break;

            case 'togen':
                {
                    const { handleTogenCommand } = require('./WILY_KUN/togen.js');
                    const { handleNsfwImageCommand } = require('./WILY_KUN/nsfwimage.js');

                    // Handle togen command
                    await handleTogenCommand(sock, msg);

                    // Handle nsfwimage command
                    await handleNsfwImageCommand(sock, msg);
                }
                break;

            case 'swm':
            case 'wm':
                {
                    const { handleSwmCommand } = require('./WILY_KUN/swm.js');
                    await handleSwmCommand(sock, msg);
                }
                break;

            case 'nhentai':
                {
                    const { handleNhentaiCommand } = require('./WILY_KUN/nhentai.js');
                    await handleNhentaiCommand(sock, msg);
                }
                break;

            case 'clearsesi':
        case 'clearsession':
        case 'clear':
        case 'cs':
        case 'c':
            // Already handled by Clearsesi.js
            return true;
            default:
                // Command tidak dikenal, tidak perlu respons
                break;
        }


    } catch (error) {
        // Error handling tanpa log detail
    }
}

// The code has been modified to remove HD enhancement feature and its dependencies.
// Export fungsi utama
module.exports = { 
    handleCommand,
    loadConfig,
    saveConfig,
    sendQuotedMessage
};