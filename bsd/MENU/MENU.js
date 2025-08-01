const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Fungsi ReplyRynzz untuk tampilan cantik dengan contextInfo
async function ReplyRynzz(sock, msg, teks, profilePic = null, options = {}) {
  const now = new Date();
  
  // Format waktu Jakarta yang akurat
  const jakartaTimeFormatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const jakartaDateFormatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  });

  const jakartaTime = jakartaTimeFormatter.format(now);
  const jakartaDate = jakartaDateFormatter.format(now);
  
  const packname = options.packname || "WilyKun Bot Menu";
  const senderName = msg.pushName || (msg.key.participant || msg.key.remoteJid).split('@')[0];
  const menuTitle = options.menuTitle || "🤖 WILY BOT MENU";

  // Get user profile picture if not provided
  if (!profilePic) {
    try {
      const userJid = msg.key.participant || msg.key.remoteJid;
      profilePic = await sock.profilePictureUrl(userJid, 'image');
    } catch (error) {
      profilePic = "https://files.catbox.moe/mxohav.gif";
    }
  }

  // Struktur pesan dengan contextInfo yang lebih cantik
  const messageContent = {
    text: teks,
    contextInfo: {
      quotedMessage: {
        conversation: `*_Dikembangkan Oleh @WilyKun Bot_* *${jakartaTime} WIB*`
      },
      mentionedJid: [msg.key.participant || msg.key.remoteJid],
      participant: "6289688206739@s.whatsapp.net",
      remoteJid: "120363312297133690@g.us",
      forwardingScore: 999,
      isForwarded: true,
      externalAdReply: {
        title: menuTitle,
        body: `Requested by ${senderName} • ${jakartaDate}`,
        thumbnailUrl: profilePic || 'https://files.catbox.moe/mxohav.gif',
        sourceUrl: "https://wa.me/6289688206739",
        mediaType: 1,
        renderLargerThumbnail: true,
        showAdAttribution: false
      },
      forwardedNewsletterMessageInfo: {
        newsletterJid: "120363312297133690@newsletter",
        newsletterName: "WilyKun Official Bot"
      }
    }
  };

  try {
    return await sock.sendMessage(msg.key.remoteJid, messageContent, {
      quoted: msg,
    });
  } catch (error) {
    console.log('Failed to send with contextInfo, trying simple fallback');

    // Final fallback: Send as regular text
    const fallbackContent = {
      text: teks
    };

    return await sock.sendMessage(msg.key.remoteJid, fallbackContent, {
      quoted: msg,
    });
  }
}

// Fungsi untuk menangani menu command dengan tampilan keren
async function handleMenuCommand(sock, msg, config) {
    try {
        const currentTime = new Date();
        const jakartaTime = currentTime.toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        const getTimeSession = () => {
            const hour = new Date().toLocaleString('en-US', { 
                timeZone: 'Asia/Jakarta',
                hour: 'numeric',
                hour12: false
            });
            const hourNum = parseInt(hour);
            if (hourNum >= 0 && hourNum < 4) return "🌙 Tengah Malam";
            if (hourNum >= 4 && hourNum < 10) return "🌅 Pagi";
            if (hourNum >= 10 && hourNum < 15) return "☀️ Siang";
            if (hourNum >= 15 && hourNum < 18) return "🌤️ Sore";
            return "🌜 Malam";
        };

        const senderName = msg.pushName || (msg.key.participant || msg.key.remoteJid).split('@')[0];

        let totalMessages = 0;
        try {
            const statusData = JSON.parse(fs.readFileSync('./DATA/status_data.json', 'utf8'));
            totalMessages = Object.keys(statusData).length || 0;
        } catch (error) {
            // Error reading stats
        }

        // Get detailed date/time info for Asia/Jakarta
        const jakartaDate = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        const dayName = currentTime.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long' });
        const dayNumber = currentTime.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric' });
        const monthName = currentTime.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', month: 'long' });
        const monthNumber = currentTime.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', month: '2-digit' });
        const year = currentTime.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', year: 'numeric' });

        // Get day emoji
        const getDayEmoji = (day) => {
            const dayEmojis = {
                'Senin': '📅',
                'Selasa': '📋', 
                'Rabu': '📝',
                'Kamis': '📊',
                'Jumat': '🕌',
                'Sabtu': '🎉',
                'Minggu': '🌅'
            };
            return dayEmojis[day] || '📅';
        };

        // Get month emoji
        const getMonthEmoji = (month) => {
            const monthEmojis = {
                'Januari': '❄️', 'Februari': '💝', 'Maret': '🌸',
                'April': '🌷', 'Mei': '🌺', 'Juni': '☀️',
                'Juli': '🏖️', 'Agustus': '🌻', 'September': '🍂',
                'Oktober': '🎃', 'November': '🍁', 'Desember': '🎄'
            };
            return monthEmojis[month] || '📅';
        };

        const menuText = `
《 WILY BOT MENU 》

👋 Halo : ${senderName}!
${getDayEmoji(dayName)} Hari : ${dayName}
📊 Tanggal : ${dayNumber}
${getMonthEmoji(monthName)} Bulan : ${monthNumber}/${monthName}
🗓️ Tahun : ${year}

📊 [ INFORMASI BOT ]
→ ✅ Status Bot      : Online
→ ⚙️ Mode            : ${config.bot.mode.toUpperCase()}
→ 🔧 Prefix          : ${config.bot.prefix}
→ 👨‍💻 Creator         : WilyKun
→ 📱 Version         : v2.3000.1023
→ 📖 Story Read      : ${totalMessages} Stories

📚 [ MENU KATEGORI ]
→ 👑 ${config.bot.prefix}menuowner - Owner & Admin Tools
→ ⚙️ ${config.bot.prefix}menusystem - System Configuration
→ 🎭 ${config.bot.prefix}menuautoreaction - Auto Reaction Settings
→ 🛠️ ${config.bot.prefix}menutools - Utilities & Tools
→ 📥 ${config.bot.prefix}menudownload - Download Features
→ 🎌 ${config.bot.prefix}menuanime - Anime Scraper
→ ℹ️ ${config.bot.prefix}menuinfo - Information & About

⚡ [ AKSES CEPAT ]
→ 👑 ${config.bot.prefix}owner - Owner Menu
→ ⚙️ ${config.bot.prefix}system - System Menu
→ 🎭 ${config.bot.prefix}autoreaction - Auto Reaction
→ 🛠️ ${config.bot.prefix}tools - Tools Menu
→ 📥 ${config.bot.prefix}download - Download Menu
→ 🎌 ${config.bot.prefix}anime - Anime Menu
→ ℹ️ ${config.bot.prefix}info - Info Menu
`;

        await ReplyRynzz(sock, msg, menuText, null, {
            menuTitle: "🤖 WILY BOT MAIN MENU",
            packname: "WilyKun Bot Menu System"
        });

    } catch (error) {
        console.error('Error in menu handler:', error);
        const errorText = `❌ *ERROR*\n\nTerjadi kesalahan saat menampilkan menu.\nSilakan coba lagi atau hubungi admin.`;

        try {
            await ReplyRynzz(sock, msg, errorText, null, {
                packname: "Error Handler",
                author: 'WilyKun Bot'
            });
        } catch (fallbackError) {
            await sock.sendMessage(msg.key.remoteJid, { text: errorText });
        }
    }
}

// Menu Owner & Admin
async function handleOwnerMenu(sock, msg, config) {
    try {
        const senderName = msg.pushName || (msg.key.participant || msg.key.remoteJid).split('@')[0];

        const ownerMenuText = `
《 OWNER & ADMIN 》

👋 Halo, ${senderName}!

⚙️ [ SISTEM KONTROL ]
→ 🔧 ${config.bot.prefix}mode <self/public>
→ 🎯 ${config.bot.prefix}prefix <symbol>
→ ⚙️ ${config.bot.prefix}settings

💾 [ BACKUP & SESSION ]
→ 📦 ${config.bot.prefix}backupsesi
→ 🗂️ ${config.bot.prefix}backupsc
→ 🧹 ${config.bot.prefix}clearsesi

👥 [ GROUP MANAGEMENT ]
→ 🏷️ ${config.bot.prefix}hidetag <text>

📖 [ AUTO STORY ]
→ ⬇️ ${config.bot.prefix}autounduhstory <on/off>

📞 [ CALL MANAGEMENT ]
→ 📞 ${config.bot.prefix}anticall <on/off>
→ 📞 ${config.bot.prefix}anticall setmsg <pesan>
→ 📞 ${config.bot.prefix}anticall add <nomor>
→ 📞 ${config.bot.prefix}anticall del <nomor>
→ 📞 ${config.bot.prefix}anticall list
→ 📞 ${config.bot.prefix}anticall status
→ 📹 ${config.bot.prefix}anticallvid <on/off>
→ 📹 ${config.bot.prefix}anticallvid setmsg <pesan>
→ 📹 ${config.bot.prefix}anticallvid add <nomor>
→ 📹 ${config.bot.prefix}anticallvid del <nomor>
→ 📹 ${config.bot.prefix}anticallvid list
→ 📹 ${config.bot.prefix}anticallvid status

📊 [ MONITORING ]
→ ℹ️ ${config.bot.prefix}info
→ 👑 ${config.bot.prefix}owner
→ ⏱️ ${config.bot.prefix}runtime
`;

        await ReplyRynzz(sock, msg, ownerMenuText, null, {
            menuTitle: "👑 OWNER & ADMIN MENU",
            packname: "WilyKun Owner Control"
        });
    } catch (error) {
        console.error('Error in owner menu:', error);
    }
}

// Menu System & Config
async function handleSystemMenu(sock, msg, config) {
    try {
        const senderName = msg.pushName || (msg.key.participant || msg.key.remoteJid).split('@')[0];

        const systemMenuText = `
《 SYSTEM MENU 》

👋 Halo, ${senderName}!

🤖 [ AUTO PRESENCE ]
→ ⌨️ ${config.bot.prefix}typing <on/off>
→ 🎙️ ${config.bot.prefix}record <on/off>
→ 🟢 ${config.bot.prefix}online <on/off>
→ 🛡️ ${config.bot.prefix}antidel <on/off>

🎭 [ AUTO REACTION ]
→ 🎪 ${config.bot.prefix}autoreaction <on/off/random>
→ ⏰ ${config.bot.prefix}setdelay <detik>

🛡️ [ ANTI DELETE SYSTEM ]
→ 🚫 ${config.bot.prefix}antidel <on/off/all>
→ ❓ ${config.bot.prefix}antidel help
→ 📋 ${config.bot.prefix}antidel add <group_id>
→ 📋 ${config.bot.prefix}antidel del <group_id>
→ 📋 ${config.bot.prefix}antidel list
→ 📋 ${config.bot.prefix}antidel status

🏷️ [ ANTI TAG SW SYSTEM ]
→ 🛡️ ${config.bot.prefix}antitagsw on → Aktifkan
→ ❌ ${config.bot.prefix}antitagsw off → Matikan
→ ➕ ${config.bot.prefix}antitagsw add → Daftarkan grup
→ ➖ ${config.bot.prefix}antitagsw del → Hapus grup
→ 📊 ${config.bot.prefix}antitagsw status → Lihat stats
→ ⚠️ ${config.bot.prefix}antitagsw warns → Lihat pelanggaran
→ ℹ️ ${config.bot.prefix}antitagsw info → Info lengkap
→ ❓ ${config.bot.prefix}antitagsw help → Bantuan
→ 🔧 ${config.bot.prefix}antitagsw set [angka] → Max warns (1-10)
→ 🔄 ${config.bot.prefix}antitagsw reset → Reset warns grup
→ 🌐 ${config.bot.prefix}antitagsw all → Reset semua (owner)

👥 [ GROUP MANAGEMENT ]
→ 👋 ${config.bot.prefix}welcome <on/off>
→ 💔 ${config.bot.prefix}goodbye <on/off>

📊 [ STATUS SISTEM ]
→ ⌨️ Auto Typing   : ${config.autoFeatures?.typing ? 'ON ✅' : 'OFF ❌'}
→ 🎙️ Auto Record   : ${config.autoFeatures?.recording ? 'ON ✅' : 'OFF ❌'}
→ 🟢 Auto Online   : ${config.autoFeatures?.online ? 'ON ✅' : 'OFF ❌'}
→ 🛡️ Anti Delete   : ${config.autoFeatures?.antidelete?.enabled ? 'ON ✅' : 'OFF ❌'}
→ 🎭 Auto Reaction : ${config.autoReactionStory.enabled ? (config.autoReactionStory.mode === 'always' ? 'ALWAYS ON' : config.autoReactionStory.mode.toUpperCase()) : 'OFF'}
→ 👋 Welcome Msg   : ${config.group?.welcomeMessage?.enabled ? 'ON ✅' : 'OFF ❌'}
→ 💔 Goodbye Msg   : ${config.group?.goodbyeMessage?.enabled ? 'ON ✅' : 'OFF ❌'}
`;

        await ReplyRynzz(sock, msg, systemMenuText, null, {
            menuTitle: "⚙️ SYSTEM CONFIGURATION MENU",
            packname: "WilyKun System Control"
        });
    } catch (error) {
        console.error('Error in system menu:', error);
    }
}

// Menu Tools & Utilities
async function handleToolsMenu(sock, msg, config) {
    try {
        const prefix = config.bot.prefix;
        const senderName = msg.pushName || (msg.key.participant || msg.key.remoteJid).split('@')[0];

        const toolsMenuText = `
《 TOOLS MENU 》

👋 Halo, ${senderName}!

[ BASIC UTILITIES ]
→ ${config.bot.prefix}ping
→ ${config.bot.prefix}info
→ ${config.bot.prefix}help
→ ${config.bot.prefix}runtime

[ VIEWONCE TOOLS ]
→ ${config.bot.prefix}rvo
→ ${config.bot.prefix}rvov2

[ MEDIA CONVERTER ]
→ ${config.bot.prefix}sticker
→ ${config.bot.prefix}s
→ ${config.bot.prefix}toimg
→ ${config.bot.prefix}tourl
→ ${config.bot.prefix}hitamkan
→ ${config.bot.prefix}removebg
→ ${config.bot.prefix}qc <text>
→ ${config.bot.prefix}smeme <text>
→ ${config.bot.prefix}ssweb <url> [type]
→ ${config.bot.prefix}aisticker <prompt>
→ ${config.bot.prefix}stickerly <text>
→ ${config.bot.prefix}stickerly2 <text>
→ ${config.bot.prefix}nulis <text>
→ ${config.bot.prefix}swm <packname|author>
→ ${config.bot.prefix}wm <packname|author>

[ TEXT GENERATOR ]
→ ${config.bot.prefix}quotesanim
→ ${config.bot.prefix}togen <text>

[ IMAGE ENHANCER ]
→ ${config.bot.prefix}hd <image>
→ ${config.bot.prefix}toghibli <image>
→ ${config.bot.prefix}brat <text>
→ ${config.bot.prefix}bratanimasi <text>

[ AI IMAGE GENERATOR ]
→ ${config.bot.prefix}realimage <prompt>
→ ${config.bot.prefix}nsfwimage <prompt>

[ AI IMAGE TOOLS ]
→ ${config.bot.prefix}toprompt <image>
→ ${config.bot.prefix}toanimfinder <image>
→ ${config.bot.prefix}toghibli <image>

[ SEARCH TOOLS ]
→ ${config.bot.prefix}pin <query>
→ ${config.bot.prefix}pixiv <query>
→ ${config.bot.prefix}pixiv18 <query>
→ ${config.bot.prefix}cosplay <query>
→ ${config.bot.prefix}cosplay random

[ EMOJI TOOLS ]
→ ${config.bot.prefix}emoji <emoji1> <emoji2>
→ ${config.bot.prefix}emoji random

[ FAKE GENERATOR ]
→ ${config.bot.prefix}fakechat <nama|chat1|chat2|v2>
→ ${config.bot.prefix}fakechwa <nama|desc|followers|verified>

[ PROFILE TOOLS ]
→ ${config.bot.prefix}getppuser
→ ${config.bot.prefix}getppgroup

[ STATISTICS ]
→ ${config.bot.prefix}ranking all
→ ${config.bot.prefix}ranking status
→ ${config.bot.prefix}ranking emoji
`;

        await ReplyRynzz(sock, msg, toolsMenuText, null, {
            menuTitle: "🛠️ TOOLS & UTILITIES MENU",
            packname: "WilyKun Tools Collection"
        });
    } catch (error) {
        console.error('Error in tools menu:', error);
    }
}

// Menu Download & Media
async function handleDownloadMenu(sock, msg, config) {
    try {
        const senderName = msg.pushName || (msg.key.participant || msg.key.remoteJid).split('@')[0];

        const downloadMenuText = `
《 DOWNLOAD MENU 》

👋 Halo, ${senderName}!

[ YOUTUBE DOWNLOADER ]
→ ${config.bot.prefix}play <query>
→ ${config.bot.prefix}play2 <query>
→ ${config.bot.prefix}ytmp3 <url>
→ ${config.bot.prefix}ytmp4 <url>

[ SOCIAL MEDIA ]
→ ${config.bot.prefix}fb <url>
→ ${config.bot.prefix}ig <url>
→ ${config.bot.prefix}tiktok <url>
→ ${config.bot.prefix}ttaudio <url>
→ ${config.bot.prefix}threads <url>

[ FILE DOWNLOADER ]
→ ${config.bot.prefix}mediafire <url>
`;

        await ReplyRynzz(sock, msg, downloadMenuText, null, {
            menuTitle: "📥 DOWNLOAD & MEDIA MENU",
            packname: "WilyKun Downloader Hub"
        });
    } catch (error) {
        console.error('Error in download menu:', error);
    }
}

// Menu Info & About
async function handleInfoMenu(sock, msg, config) {
    try {
        const senderName = msg.pushName || (msg.key.participant || msg.key.remoteJid).split('@')[0];

        let totalMessages = 0;
        try {
            const statusData = JSON.parse(fs.readFileSync('./DATA/status_data.json', 'utf8'));
            totalMessages = Object.keys(statusData).length || 0;
        } catch (error) {
            // Error reading stats
        }

        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const infoMenuText = `
《 INFO MENU 》

👋 Halo, ${senderName}!

[ CHANNEL TOOLS ]
→ ${config.bot.prefix}cekidch <url>

[ GROUP TOOLS ]
→ ${config.bot.prefix}cekidgc

[ BOT INFO ]
→ ${config.bot.prefix}info
→ ${config.bot.prefix}help
→ ${config.bot.prefix}ping
→ ${config.bot.prefix}runtime
→ ${config.bot.prefix}owner
`;

        await ReplyRynzz(sock, msg, infoMenuText, null, {
            menuTitle: "ℹ️ INFORMATION & ABOUT MENU",
            packname: "WilyKun Info Center"
        });
    } catch (error) {
        console.error('Error in info menu:', error);
    }
}

// Menu Auto Reaction - Khusus Fitur Auto Reaction
async function handleAutoReactionMenu(sock, msg, config) {
    try {
        const senderName = msg.pushName || (msg.key.participant || msg.key.remoteJid).split('@')[0];

        const autoReactionMenuText = `
《 AUTO REACTION MENU 》

👋 Halo, ${senderName}!

[ CONTROL AUTO REACTION ]
→ ${config.bot.prefix}autoreaction <on/off/random>
→ ${config.bot.prefix}setdelay <detik>

[ STATISTIK EMOJI ]
→ ${config.bot.prefix}ranking emoji
→ ${config.bot.prefix}ranking all

[ STATUS AUTO REACTION ]
→ 🎭 Mode: ${config.autoReactionStory.enabled ? (config.autoReactionStory.mode === 'always' ? 'ALWAYS ON' : config.autoReactionStory.mode.toUpperCase()) : 'OFF'}
→ ⏰ Delay: ${(config.autoReactionStory?.delay || 5000) / 1000} detik
→ 🔥 Status: ${config.autoReactionStory.enabled ? 'Aktif ✅' : 'Nonaktif ❌'}
`;

        await ReplyRynzz(sock, msg, autoReactionMenuText, null, {
            menuTitle: "🎭 AUTO REACTION CONTROL MENU",
            packname: "WilyKun Reaction System"
        });
    } catch (error) {
        console.error('Error in auto reaction menu:', error);
    }
}

// Menu Anime - Khusus Anime Scraper
async function handleAnimeMenu(sock, msg, config) {
    try {
        const senderName = msg.pushName || (msg.key.participant || msg.key.remoteJid).split('@')[0];

        const animeMenuText = `
《 ANIME MENU 》

👋 Halo, ${senderName}!

[ SFW CATEGORIES (33 Categories) ]

🎭 *CHARACTERS (4):*
→ ${config.bot.prefix}waifu → Random waifu
→ ${config.bot.prefix}neko → Neko girls
→ ${config.bot.prefix}shinobu → Shinobu Kocho
→ ${config.bot.prefix}megumin → Megumin

🥺 *EMOTIONS (7):*
→ ${config.bot.prefix}cry → Crying
→ ${config.bot.prefix}blush → Blushing
→ ${config.bot.prefix}smile → Smiling
→ ${config.bot.prefix}happy → Happy
→ ${config.bot.prefix}awoo → Awoo sound
→ ${config.bot.prefix}smug → Smug face
→ ${config.bot.prefix}cringe → Cringe reaction

👥 *ACTIONS (11):*
→ ${config.bot.prefix}hug → Hugging
→ ${config.bot.prefix}kiss → Kissing
→ ${config.bot.prefix}cuddle → Cuddling
→ ${config.bot.prefix}pat → Head patting
→ ${config.bot.prefix}lick → Licking
→ ${config.bot.prefix}bite → Biting
→ ${config.bot.prefix}glomp → Glomping
→ ${config.bot.prefix}handhold → Hand holding
→ ${config.bot.prefix}nom → Nom nom
→ ${config.bot.prefix}poke → Poking
→ ${config.bot.prefix}dance → Dancing

🎯 *REACTIONS (7):*
→ ${config.bot.prefix}bully → Bullying
→ ${config.bot.prefix}slap → Slapping
→ ${config.bot.prefix}bonk → Bonking
→ ${config.bot.prefix}kick → Kicking
→ ${config.bot.prefix}kill → Killing
→ ${config.bot.prefix}yeet → Yeeting
→ ${config.bot.prefix}highfive → High five

🎪 *EXPRESSIONS (4):*
→ ${config.bot.prefix}wave → Waving
→ ${config.bot.prefix}wink → Winking

[ 🔞 NSFW CATEGORIES (33 Categories) ]
🔥 *MAIN (3):*
→ ${config.bot.prefix}waifu18 → NSFW waifu
→ ${config.bot.prefix}neko18 → NSFW neko
→ ${config.bot.prefix}hentai → Hentai

👤 *CHARACTERS (5):*
→ ${config.bot.prefix}shinobu18 → NSFW Shinobu
→ ${config.bot.prefix}megumin18 → NSFW Megumin
→ ${config.bot.prefix}marin → Marin Kitagawa
→ ${config.bot.prefix}raiden → Raiden Shogun
→ ${config.bot.prefix}succubus → Succubus

🎭 *TYPES (5):*
→ ${config.bot.prefix}milf → MILF
→ ${config.bot.prefix}trap → Trap
→ ${config.bot.prefix}uniform → Uniform
→ ${config.bot.prefix}maid → Maid
→ ${config.bot.prefix}elf → Elf

💎 *STYLE (4):*
→ ${config.bot.prefix}ahegao → Ahegao
→ ${config.bot.prefix}glasses → Glasses
→ ${config.bot.prefix}pantsu → Pantsu
→ ${config.bot.prefix}selfies → Selfies

👄 *BODY (6):*
→ ${config.bot.prefix}oppai → Oppai
→ ${config.bot.prefix}boobs → Boobs
→ ${config.bot.prefix}ass → Ass
→ ${config.bot.prefix}thigh → Thigh
→ ${config.bot.prefix}pussy → Pussy
→ ${config.bot.prefix}kitsune → Kitsune

🎬 *ACTION (7):*
→ ${config.bot.prefix}blowjob → Blowjob
→ ${config.bot.prefix}oral → Oral
→ ${config.bot.prefix}paizuri → Paizuri
→ ${config.bot.prefix}cum → Cum
→ ${config.bot.prefix}orgy → Orgy
→ ${config.bot.prefix}bdsm → BDSM
→ ${config.bot.prefix}yuri → Yuri

🌟 *SPECIAL (3):*
→ ${config.bot.prefix}tentacle → Tentacle
→ ${config.bot.prefix}kemonomimi → Kemonomimi
→ ${config.bot.prefix}public → Public
→ ${config.bot.prefix}ero → Ero
→ ${config.bot.prefix}classic → Classic

[ 🎨 PIXIV SEARCH (NEW!) ]
→ ${config.bot.prefix}pixiv <query> → Search SFW fanart
→ ${config.bot.prefix}pixiv18 <query> → Search NSFW fanart
→ next → Get next image from search

[ 🔍 COSPLAY SEARCH ]
→ ${config.bot.prefix}cosplay <query> → Search cosplay from CosplayTele
→ ${config.bot.prefix}cosplay random → Random cosplay search
→ [Reply with number] → Select specific result
→ [Reply with "random"] → Get random result

[ 📚 DOUJIN SEARCH ]
→ ${config.bot.prefix}nhentai <code> → Download doujin by code

[ 🔍 HELP COMMANDS:
→ ${config.bot.prefix}anime → This menu
→ ${config.bot.prefix}animelist → This menu
→ ${config.bot.prefix}animehelp → This menu

📋 FORMAT SUPPORT:
• JPEG, PNG, WebP, GIF
• BMP, SVG, TIFF, AVIF
• HEIC, HEIF, ICO
• 🎞️ Animated GIF Support

💡 EXAMPLES:
→ ${config.bot.prefix}waifu → Get SFW waifu
→ ${config.bot.prefix}neko → Get SFW neko
→ ${config.bot.prefix}hentai → Get NSFW hentai
→ ${config.bot.prefix}pixiv genshin impact → Search pixiv
→ ${config.bot.prefix}pixiv18 azur lane → Search NSFW pixiv
`;

        await ReplyRynzz(sock, msg, animeMenuText, null, {
            menuTitle: "🎌 ANIME SCRAPER MENU",
            packname: "WilyKun Anime Collection"
        });
    } catch (error) {
        console.error('Error in anime menu:', error);
    }
}

// Menu All - Semua Fitur Lengkap
async function handleMenuAllCommand(sock, msg, config) {
    try {
        const senderName = msg.pushName || (msg.key.participant || msg.key.remoteJid).split('@')[0];

        const menuAllText = `
《 ALL FEATURES 》

👋 Halo, ${senderName}!

[ ADMIN & MANAGEMENT ]
→ ${config.bot.prefix}menuowner
→ ${config.bot.prefix}mode <self/public>
→ ${config.bot.prefix}prefix <symbol>
→ ${config.bot.prefix}settings
→ ${config.bot.prefix}backupsesi
→ ${config.bot.prefix}backupsc
→ ${config.bot.prefix}clearsesi
→ ${config.bot.prefix}hidetag <text>
→ ${config.bot.prefix}autounduhstory <on/off>
→ ${config.bot.prefix}anticall <on/off>
→ ${config.bot.prefix}anticallvid <on/off>
→ ${config.bot.prefix}runtime

[ SYSTEM & CONFIG ]
→ ${config.bot.prefix}menusystem
→ ${config.bot.prefix}typing <on/off>
→ ${config.bot.prefix}record <on/off>
→ ${config.bot.prefix}online <on/off>
→ ${config.bot.prefix}antidelete <on/off/all>
→ ${config.bot.prefix}autoreaction <on/off/random>
→ ${config.bot.prefix}setdelay <detik>
→ ${config.bot.prefix}welcome <on/off>
→ ${config.bot.prefix}goodbye <on/off>
→ ${config.bot.prefix}antitagsw <on/off/add/del/status/warns/info/help>
→ ${config.bot.prefix}antitagsw set [angka]
→ ${config.bot.prefix}antitagsw reset
→ ${config.bot.prefix}antitagsw all

[ AUTO REACTION ]
→ ${config.bot.prefix}menuautoreaction

[ UTILITIES & TOOLS ]
→ ${config.bot.prefix}menutools
→ ${config.bot.prefix}ping
→ ${config.bot.prefix}rvo
→ ${config.bot.prefix}rvov2
→ ${config.bot.prefix}sticker
→ ${config.bot.prefix}s
→ ${config.bot.prefix}toimg
→ ${config.bot.prefix}tourl
→ ${config.bot.prefix}hitamkan
→ ${config.bot.prefix}removebg
→ ${config.bot.prefix}qc <text>
→ ${config.bot.prefix}smeme <text>
→ ${config.bot.prefix}ssweb <url>
→ ${config.bot.prefix}hd <image>
→ ${config.bot.prefix}brat <text>
→ ${config.bot.prefix}bratanimasi <text>
→ ${config.bot.prefix}realimage <prompt>
→ ${config.bot.prefix}nsfwimage <prompt>
→ ${config.bot.prefix}aisticker <prompt>
→ ${config.bot.prefix}stickerly <text>
→ ${config.bot.prefix}stickerly2 <text>
→ ${config.bot.prefix}nulis <text>
→ ${config.bot.prefix}swm <packname|author>
→ ${config.bot.prefix}wm <packname|author>
→ ${config.bot.prefix}quotesanim
→ ${config.bot.prefix}togen <text>
→ ${config.bot.prefix}toprompt <image>
→ ${config.bot.prefix}toanimfinder <image>
→ ${config.bot.prefix}toghibli <image>
→ ${config.bot.prefix}fakechwa <nama|desc|followers|verified>
→ ${config.bot.prefix}fakechat <nama|chat1|chat2|v2>
→ ${config.bot.prefix}getppuser
→ ${config.bot.prefix}getppgroup
→ ${config.bot.prefix}ranking all
→ ${config.bot.prefix}ranking status
→ ${config.bot.prefix}ranking emoji
→ ${config.bot.prefix}pin <query>
→ ${config.bot.prefix}pixiv <query>
→ ${config.bot.prefix}pixiv18 <query>
→ ${config.bot.prefix}cosplay <query>
→ ${config.bot.prefix}cosplay random
→ ${config.bot.prefix}emoji <emoji1> <emoji2>
→ ${config.bot.prefix}emoji random

[ ANIME SCRAPER ]
→ ${config.bot.prefix}menuanime
→ ${config.bot.prefix}anime
→ ${config.bot.prefix}animelist
→ ${config.bot.prefix}animehelp
→ ${config.bot.prefix}nhentai <code>

[ SFW ANIME (33 commands):
→ ${config.bot.prefix}waifu → ${config.bot.prefix}neko → ${config.bot.prefix}shinobu → ${config.bot.prefix}megumin
→ ${config.bot.prefix}bully → ${config.bot.prefix}cuddle → ${config.bot.prefix}cry → ${config.bot.prefix}hug
→ ${config.bot.prefix}awoo → ${config.bot.prefix}kiss → ${config.bot.prefix}lick → ${config.bot.prefix}pat
→ ${config.bot.prefix}smug → ${config.bot.prefix}bonk → ${config.bot.prefix}yeet → ${config.bot.prefix}blush
→ ${config.bot.prefix}smile → ${config.bot.prefix}wave → ${config.bot.prefix}highfive → ${config.bot.prefix}handhold
→ ${config.bot.prefix}nom → ${config.bot.prefix}bite → ${config.bot.prefix}glomp → ${config.bot.prefix}slap
→ ${config.bot.prefix}kill → ${config.bot.prefix}kick → ${config.bot.prefix}happy → ${config.bot.prefix}wink
→ ${config.bot.prefix}poke → ${config.bot.prefix}dance → ${config.bot.prefix}cringe

[ PIXIV SEARCH (NEW!):
→ ${config.bot.prefix}pixiv <query> → Search SFW fanart from Pixiv
→ ${config.bot.prefix}pixiv18 <query> → Search NSFW fanart from Pixiv
→ next → Get next image from recent search

[ NSFW ANIME (33 commands):
→ ${config.bot.prefix}waifu18 → ${config.bot.prefix}neko18 → ${config.bot.prefix}trap → ${config.bot.prefix}blowjob
→ ${config.bot.prefix}cum → ${config.bot.prefix}milf → ${config.bot.prefix}paizuri → ${config.bot.prefix}tentacle
→ ${config.bot.prefix}succubus → ${config.bot.prefix}shinobu18 → ${config.bot.prefix}megumin18 → ${config.bot.prefix}bdsm
→ ${config.bot.prefix}hentai → ${config.bot.prefix}ahegao → ${config.bot.prefix}uniform → ${config.bot.prefix}orgy
→ ${config.bot.prefix}maid → ${config.bot.prefix}marin → ${config.bot.prefix}raiden → ${config.bot.prefix}oppai
→ ${config.bot.prefix}selfies → ${config.bot.prefix}oral → ${config.bot.prefix}ass → ${config.bot.prefix}boobs
→ ${config.bot.prefix}thigh → ${config.bot.prefix}pussy → ${config.bot.prefix}classic → ${config.bot.prefix}kitsune
→ ${config.bot.prefix}kemonomimi → ${config.bot.prefix}public → ${config.bot.prefix}ero → ${config.bot.prefix}elf
→ ${config.bot.prefix}yuri → ${config.bot.prefix}pantsu → ${config.bot.prefix}glasses

[ DOWNLOAD & MEDIA ]
→ ${config.bot.prefix}menudownload
→ ${config.bot.prefix}play <query>
→ ${config.bot.prefix}play2 <query>
→ ${config.bot.prefix}ytmp3 <url>
→ ${config.bot.prefix}ytmp4 <url>
→ ${config.bot.prefix}fb <url>
→ ${config.bot.prefix}ig <url>
→ ${config.bot.prefix}tiktok <url>
→ ${config.bot.prefix}ttaudio <url>
→ ${config.bot.prefix}threads <url>
→ ${config.bot.prefix}mediafire <url>

[ INFO & ABOUT ]
→ ${config.bot.prefix}menuinfo
→ ${config.bot.prefix}cekidch <url>
→ ${config.bot.prefix}cekidgc
→ ${config.bot.prefix}help
→ ${config.bot.prefix}runtime
→ ${config.bot.prefix}owner
→ ${config.bot.prefix}info
→ ${config.bot.prefix}ping

[ MENU UTAMA ]
→ ${config.bot.prefix}menu
→ ${config.bot.prefix}menuall
`;

        await ReplyRynzz(sock, msg, menuAllText, null, {
            menuTitle: "📋 ALL FEATURES COMPLETE MENU",
            packname: "WilyKun Complete Features"
        });
    } catch (error) {
        console.error('Error in menuall handler:', error);
        const errorText = `❌ *ERROR*\n\nTerjadi kesalahan saat menampilkan menu all.\nSilakan coba lagi atau hubungi admin.`;

        try {
            await ReplyRynzz(sock, msg, errorText, null, {
                packname: "Error Handler",
                author: 'WilyKun Bot'
            });
        } catch (fallbackError) {
            await sock.sendMessage(msg.key.remoteJid, { text: errorText });
        }
    }
}

// Inisialisasi variabel di luar scope handler
let pinterestResults = [];
let currentPinterestIndex = 0;

// Fungsi untuk mencari gambar di Pinterest menggunakan API
async function searchPinterest(query) {
    try {
        const apiUrl = `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`;
        const response = await axios.get(apiUrl);

        if (response.data && response.data.result) {
            return response.data.result;
        } else {
            console.error('API Pinterest tidak memberikan hasil yang valid:', response.data);
            return [];
        }
    } catch (error) {
        console.error('Gagal mengambil data dari API Pinterest:', error);
        return [];
    }
}

// Fungsi untuk menampilkan hasil Pinterest
async function displayPinterestResult(sock, msg, config, result, index) {
    if (!result || !result.image) {
        await ReplyRynzz(sock, msg, "❌ Gambar tidak ditemukan.", null);
        return;
    }

    try {
        const senderName = msg.pushName || (msg.key.participant || msg.key.remoteJid).split('@')[0];
        const caption = `
🖼️ *Hasil Pinterest ke-${index + 1}*
• Judul: ${result.title || 'Tidak ada judul'}
• Sumber: Pinterest
`;

        const imageMessage = {
            image: { url: result.image },
            caption: caption,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterName: "Pinterest Images",
                    newsletterJid: "120363312297133690@newsletter",
                },
                externalAdReply: {
                    showAdAttribution: true,
                    title: `Pinterest Search`,
                    body: `Oleh ${senderName}`,
                    previewType: "IMAGE",
                    thumbnailUrl: result.image || "https://files.catbox.moe/mxohav.gif",
                    sourceUrl: "https://wa.me/6289688206739",
                    mediaType: 1,
                    renderLargerThumbnail: false
                },
            },
        };

        await sock.sendMessage(msg.key.remoteJid, imageMessage, { quoted: msg });

    } catch (error) {
        console.error('Gagal mengirim gambar:', error);
        await ReplyRynzz(sock, msg, "❌ Gagal mengirim gambar.", null);
    }
}

// Fungsi untuk menangani command .pin
async function handlePinCommand(sock, msg, config) {
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const prefix = config.bot?.prefix || '.';
    const args = messageText.slice(prefix.length).trim().split(' ');
    const query = args.slice(1).join(' ');

    if (!query) {
        await ReplyRynzz(sock, msg, `❌ *FORMAT SALAH!*\nPenggunaan: ${prefix}pin <query>\nContoh: ${prefix}pin cat`, null);
        return;
    }

    pinterestResults = await searchPinterest(query);
    currentPinterestIndex = 0;

    if (pinterestResults.length === 0) {
        await ReplyRynzz(sock, msg, "❌ Tidak ditemukan gambar dengan query tersebut.", null);
        return;
    }

    await displayPinterestResult(sock, msg, config, pinterestResults[currentPinterestIndex], currentPinterestIndex);
}

// Fungsi untuk menangani command .next
async function handleNextCommand(sock, msg, config) {
    if (pinterestResults.length === 0) {
        await ReplyRynzz(sock, msg, "❌ Tidak ada hasil pencarian sebelumnya. Gunakan .pin <query> terlebih dahulu.", null);
        return;
    }

    currentPinterestIndex++;

    if (currentPinterestIndex >= pinterestResults.length) {
        currentPinterestIndex = 0; // Kembali ke awal jika sudah mencapai akhir
    }

    await displayPinterestResult(sock, msg, config, pinterestResults[currentPinterestIndex], currentPinterestIndex);
}

// Handler untuk semua command, termasuk .pin dan .next
async function handleCommands(sock, msg, config, command) {
    // Import function untuk sending quoted message
    const { sendQuotedMessage, loadConfig, saveConfig } = require('../Wilykun.js');

    // Function untuk mengecek owner/bot (sama seperti di Wilykun.js)
    const isOwnerOrBot = () => {
        const botNumber = sock.user?.id?.split(':')[0];
        let actualSenderNumber;

        if (msg.key.participant) {
            actualSenderNumber = msg.key.participant.split('@')[0];
        } else if (msg.key.fromMe) {
            actualSenderNumber = botNumber;
        } else {
            actualSenderNumber = msg.key.remoteJid?.split('@')[0];
        }

        const isFromMe = msg.key.fromMe === true;
        const isBotNumber = actualSenderNumber === botNumber;
        const isOwnerNumber = actualSenderNumber === config.bot?.owner;
        const isBotNumberFromConfig = actualSenderNumber === config.bot?.botNumber;
        const isHardcodedBot = actualSenderNumber === '6289681008411';

        return isFromMe || isBotNumber || isOwnerNumber || isBotNumberFromConfig || isHardcodedBot;
    };

    // Cek mode bot (self atau public)
    const isSelfMode = config.bot?.mode === 'self';
    const senderNumber = msg.key.participant ? msg.key.participant.split('@')[0] : msg.key.remoteJid.split('@')[0];
    const isOwner = config.bot?.owner === senderNumber;

    // Handle command .pin dan .next
    if (command === 'pin') {
        if (isSelfMode && !isOwnerOrBot()) {
            await ReplyRynzz(sock, msg, "🔒 Bot dalam mode self, hanya owner yang bisa menggunakan command ini.", null);
            return;
        }
        await handlePinCommand(sock, msg, config);
        return true;
    } else if (command === 'next') {
        if (isSelfMode && !isOwnerOrBot()) {
            await ReplyRynzz(sock, msg, "🔒 Bot dalam mode self, hanya owner yang bisa menggunakan command ini.", null);
            return;
        }
        await handleNextCommand(sock, msg, config);
        return true;
    }

    switch (command) {
        case 'menuowner':
            await handleOwnerMenu(sock, msg, config);
            break;
        case 'menusystem':
            await handleSystemMenu(sock, msg, config);
            break;
        case 'menuautoreaction':
            await handleAutoReactionMenu(sock, msg, config);
            break;
        case 'menutools':
            await handleToolsMenu(sock, msg, config);
            break;
        case 'menudownload':
            await handleDownloadMenu(sock, msg, config);
            break;
        case 'menuanime':
            await handleAnimeMenu(sock, msg, config);
            break;
        case 'menuinfo':
            await handleInfoMenu(sock, msg, config);
            break;
        case 'owner':
            await handleOwnerMenu(sock, msg, config);
            break;
        case 'system':
            await handleSystemMenu(sock, msg, config);
            break;
        case 'autoreaction':
            // Handle autoreaction command with parameters
            await handleAutoReactionCommand(sock, msg, config);
            break;
        case 'tools':
            await handleToolsMenu(sock, msg, config);
            break;
        case 'download':
            await handleDownloadMenu(sock, msg, config);
            break;
        case 'anime':
            await handleAnimeMenu(sock, msg, config);
            break;
        case 'info':
            await handleInfoMenu(sock, msg, config);
            break;
        default:
            return false; // Command tidak ditemukan
    }
    return true; // Command berhasil dihandle
}

// Handler untuk autoreaction command yang dipindah dari Wilykun.js
async function handleAutoReactionCommand(sock, msg, config) {
    // Parse args dari pesan
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const prefix = config.bot?.prefix || '.';
    const args = messageText.slice(prefix.length).trim().split(' ');

    // Import function untuk sending quoted message
    const { sendQuotedMessage, loadConfig, saveConfig } = require('../Wilykun.js');

    // Function untuk mengecek owner/bot (sama seperti di Wilykun.js)
    const isOwnerOrBot = () => {
        const botNumber = sock.user?.id?.split(':')[0];
        let actualSenderNumber;

        if (msg.key.participant) {
            actualSenderNumber = msg.key.participant.split('@')[0];
        } else if (msg.key.fromMe) {
            actualSenderNumber = botNumber;
        } else {
            actualSenderNumber = msg.key.remoteJid?.split('@')[0];
        }

        const isFromMe = msg.key.fromMe === true;
        const isBotNumber = actualSenderNumber === botNumber;
        const isOwnerNumber = actualSenderNumber === config.bot?.owner;
        const isBotNumberFromConfig = actualSenderNumber === config.bot?.botNumber;
        const isHardcodedBot = actualSenderNumber === '6289681008411';

        return isFromMe || isBotNumber || isOwnerNumber || isBotNumberFromConfig || isHardcodedBot;
    };

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
• autoreaction - Mengatur mode auto reaction
• setdelay - Mengatur delay reaction (1-30 detik)
• clearsesi - Bersihkan session bot

💡 *Gunakan fitur lain:*
• ${config.bot.prefix}menu - Lihat semua fitur
• ${config.bot.prefix}ping - Cek ping bot
• ${config.bot.prefix}info - Info bot
• ${config.bot.prefix}status - Status bot`;

        await sendQuotedMessage(sock, msg.key.remoteJid, accessDeniedText, msg);
        return;
    }

    if (args.length < 2) {
        // Load config fresh untuk memastikan status akurat
        const currentConfig = loadConfig();

        // Mapping display mode dari config
        let displayMode = 'OFF';
        let displayStatus = 'Nonaktif ❌';
        let displayFitur = 'Mati';

        if (currentConfig.autoReactionStory?.enabled) {
            switch (currentConfig.autoReactionStory.mode) {
                case 'always':
                    displayMode = 'ON';
                    displayStatus = 'Aktif ✅';
                    displayFitur = 'Berjalan';
                    break;
                case 'random':
                    displayMode = 'RANDOM';
                    displayStatus = 'Aktif ✅';
                    displayFitur = 'Berjalan (Mode Acak)';
                    break;
                default:
                    displayMode = 'OFF';
                    displayStatus = 'Nonaktif ❌';
                    displayFitur = 'Mati';
                    break;
            }
        }

        const helpText = `
❌ *FORMAT COMMAND SALAH!*

📝 *CARA PENGGUNAAN:*
${currentConfig.bot.prefix}autoreaction on
${currentConfig.bot.prefix}autoreaction off  
${currentConfig.bot.prefix}autoreaction random

📋 *PENJELASAN MODE LENGKAP:*

🔥 *MODE ON (AKTIF):*
• Bot akan SELALU memberikan reaction emoji
• Setiap story pasti dapat emoji 
• 100% auto reaction ke semua story
• Cocok untuk akun yang ingin selalu reaction

❌ *MODE OFF (MATI):*
• Bot HANYA membaca story tanpa reaction
• Tidak ada emoji sama sekali
• Read only mode (baca saja)
• Cocok untuk akun yang ingin silent reading

🎲 *MODE RANDOM (ACAK):*
• 50% kemungkinan dapat reaction emoji
• 50% kemungkinan hanya dibaca tanpa emoji
• Hasil acak setiap story (kadang ada, kadang tidak)
• Lebih natural seperti perilaku manusia

📊 *STATUS SAAT INI:* 
├─ Mode: ${displayMode}
├─ Status: ${displayStatus}
├─ Delay: ${(currentConfig.autoReactionStory?.delay || 5000) / 1000} detik
└─ Fitur: ${displayFitur}

⏱️ *PENGATURAN DELAY:*
• ${currentConfig.bot.prefix}setdelay 1 → Delay 1 detik
• ${currentConfig.bot.prefix}setdelay 3 → Delay 3 detik (default)
• ${currentConfig.bot.prefix}setdelay 5 → Delay 5 detik
• Range: 1-30 detik

💡 *CONTOH LENGKAP:*
• ${currentConfig.bot.prefix}autoreaction on → Aktifkan auto reaction
• ${currentConfig.bot.prefix}autoreaction off → Matikan auto reaction  
• ${currentConfig.bot.prefix}autoreaction random → Mode acak
• ${currentConfig.bot.prefix}setdelay 2 → Atur delay 2 detik`;

        await sendQuotedMessage(sock, msg.key.remoteJid, helpText, msg);
        return;
    }

    const newMode = args[1].toLowerCase();

    if (newMode !== 'on' && newMode !== 'off' && newMode !== 'random') {
        await sendQuotedMessage(sock, msg.key.remoteJid, `❌ Mode tidak valid! Gunakan 'on', 'off', atau 'random'`, msg);
        return;
    }

    // Mapping mode input ke config format
    let configMode, enabled;
    switch (newMode) {
        case 'on':
            configMode = 'always';
            enabled = true;
            break;
        case 'off':
            configMode = 'off';
            enabled = false;
            break;
        case 'random':
            configMode = 'random';
            enabled = true;
            break;
    }

    // Periksa apakah mode sudah sama
    if (config.autoReactionStory.mode === configMode && config.autoReactionStory.enabled === enabled) {
        await sendQuotedMessage(sock, msg.key.remoteJid, `⚠️ Auto reaction sudah dalam mode *${newMode.toUpperCase()}*`, msg);
        return;
    }

    // Update config
    config.autoReactionStory.mode = configMode;
    config.autoReactionStory.enabled = enabled;

    if (saveConfig(config)) {
        let statusText;
        switch (newMode) {
            case 'on':
                statusText = `✅ *FITUR AUTO REACTION DIAKTIFKAN*

🔥 *STATUS:* AKTIF ✅
🎯 *MODE:* ALWAYS (Selalu)
🎉 *FUNGSI:* Bot akan memberikan reaction emoji ke SEMUA story yang dibaca

⚙️ *PENGATURAN:*
├─ Status: Aktif ✅
├─ Mode: Always (100% reaction)
├─ Delay: ${config.autoReactionStory.delay / 1000} detik
└─ Emoji: Random otomatis

🚀 *EFEK:* 
• Bot akan SELALU kasih reaction emoji
• Setiap story pasti dapat emoji
• Delay ${config.autoReactionStory.delay / 1000} detik sebelum reaction

⏱️ *PENGATURAN DELAY:*
• ${config.bot.prefix}setdelay 1 → Delay 1 detik
• ${config.bot.prefix}setdelay 3 → Delay 3 detik
• ${config.bot.prefix}setdelay 5 → Delay 5 detik
• Range: 1-30 detik untuk mengatur waktu tunggu reaction

🔥 Auto reaction AKTIF untuk semua story!`;
                break;
            case 'off':
                statusText = `❌ *FITUR AUTO REACTION DIMATIKAN*

🚫 *STATUS:* NONAKTIF ❌
🎯 *MODE:* OFF (Mati)
👁️ *FUNGSI:* Bot hanya BACA story tanpa memberikan reaction emoji

⚙️ *PENGATURAN:*
├─ Status: Nonaktif ❌
├─ Mode: Off (0% reaction)
├─ Fungsi: Read only
└─ Emoji: Tidak ada

📖 *EFEK:*
• Bot HANYA membaca story
• TIDAK ada reaction emoji sama sekali
• Story tetap terbaca tapi no emoji

⏱️ *PENGATURAN DELAY:*

• ${config.bot.prefix}setdelay 1→ Delay 1 detik
• ${config.bot.prefix}setdelay 3 → Delay 3 detik
• ${config.bot.prefix}setdelay 5 → Delay 5 detik
• Gunakan untuk mengatur delay jika ingin mengaktifkan reaction

👁️ Bot sekarang mode READ ONLY (baca tanpa reaction)!`;
                break;
            case 'random':
                statusText = `🎲 *FITUR AUTO REACTION MODE RANDOM*

🎰 *STATUS:* AKTIF ✅
🎯 *MODE:* RANDOM (Acak)
🎪 *FUNGSI:* Bot akan memberikan reaction emoji secara ACAK (50% kemungkinan)

⚙️ *PENGATURAN:*
├─ Status: Aktif ✅
├─ Mode: Random (50% chance)
├─ Delay: ${config.autoReactionStory.delay / 1000} detik
└─ Sistem: Acak otomatis

🎯 *EFEK:*
• 50% kemungkinan dapat reaction emoji
• 50% kemungkinan hanya dibaca tanpa emoji
• Setiap story hasilnya bisa beda (random)
• Lebih natural seperti perilaku manusia

⏱️ *PENGATURAN DELAY:*
• ${config.bot.prefix}setdelay 1 → Delay 1 detik
• ${config.bot.prefix}setdelay 3 → Delay 3 detik
• ${config.bot.prefix}setdelay 5 → Delay 5 detik
• Range: 1-30 detik untuk mengatur waktu tunggu reaction

🎲 Auto reaction mode RANDOM aktif!`;
                break;
        }
        await sendQuotedMessage(sock, msg.key.remoteJid, statusText, msg);
    } else {
        await sendQuotedMessage(sock, msg.key.remoteJid, `❌ *GAGAL MENYIMPAN PENGATURAN*\n\nTerjadi error saat menyimpan pengaturan auto reaction ke config.json\n\nSilakan coba lagi!`, msg);
    }
}

// Handler untuk semua menu commands
async function handleAllMenuCommands(sock, msg, config, command) {
    // Import function untuk sending quoted message
    const { sendQuotedMessage, loadConfig, saveConfig } = require('../Wilykun.js');

    // Function untuk mengecek owner/bot (sama seperti di Wilykun.js)
    const isOwnerOrBot = () => {
        const botNumber = sock.user?.id?.split(':')[0];
        let actualSenderNumber;

        if (msg.key.participant) {
            actualSenderNumber = msg.key.participant.split('@')[0];
        } else if (msg.key.fromMe) {
            actualSenderNumber = botNumber;
        } else {
            actualSenderNumber = msg.key.remoteJid?.split('@')[0];
        }

        const isFromMe = msg.key.fromMe === true;
        const isBotNumber = actualSenderNumber === botNumber;
        const isOwnerNumber = actualSenderNumber === config.bot?.owner;
        const isBotNumberFromConfig = actualSenderNumber === config.bot?.botNumber;
        const isHardcodedBot = actualSenderNumber === '6289681008411';

        return isFromMe || isBotNumber || isOwnerNumber || isBotNumberFromConfig || isHardcodedBot;
    };
    switch (command) {
        case 'menuowner':
            await handleOwnerMenu(sock, msg, config);
            return true;
        case 'menusystem':
            await handleSystemMenu(sock, msg, config);
            return true;
        case 'menuautoreaction':
            await handleAutoReactionMenu(sock, msg, config);
            return true;
        case 'menutools':
            await handleToolsMenu(sock, msg, config);
            return true;
        case 'menudownload':
            await handleDownloadMenu(sock, msg, config);
            return true;
        case 'menuanime':
            await handleAnimeMenu(sock, msg, config);
            return true;
        case 'menuinfo':
            await handleInfoMenu(sock, msg, config);
            return true;
        case 'owner':
            await handleOwnerMenu(sock, msg, config);
            return true;
        case 'system':
            await handleSystemMenu(sock, msg, config);
            break;
        case 'autoreaction':
            // Handle autoreaction command with parameters
            await handleAutoReactionCommand(sock, msg, config);
            return true;
        case 'tools':
            await handleToolsMenu(sock, msg, config);
            return true;
        case 'download':
            await handleDownloadMenu(sock, msg, config);
            return true;
        case 'anime':
            await handleAnimeMenu(sock, msg, config);
            return true;
        case 'info':
            await handleInfoMenu(sock, msg, config);
            return true;
        default:
            return false; // Command tidak ditemukan
    }
}

module.exports = {
    handleMenuCommand,
    handleOwnerMenu,
    handleSystemMenu,
    handleToolsMenu,
    handleDownloadMenu,
    handleInfoMenu,
    handleMenuAllCommand,
    handleAutoReactionMenu,
    handleAnimeMenu,
    handleAllMenuCommands,
    ReplyRynzz,
    handleCommands // Tambahkan handleCommands ke exports
};