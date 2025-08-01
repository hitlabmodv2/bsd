
const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

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
        
        // Pastikan folder DATA ada
        const dataDir = path.join(process.cwd(), 'DATA');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Backup config lama jika ada
        if (fs.existsSync(configPath)) {
            const backupPath = path.join(process.cwd(), 'DATA', 'config.backup.json');
            const currentConfig = fs.readFileSync(configPath, 'utf8');
            fs.writeFileSync(backupPath, currentConfig, 'utf8');
        }

        // Simpan config baru
        const configString = JSON.stringify(config, null, 2);
        fs.writeFileSync(configPath, configString, 'utf8');

        // Verifikasi file tersimpan dengan benar
        if (fs.existsSync(configPath)) {
            const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return true;
        }

        return false;
    } catch (error) {
        return false;
    }
}

// Default config
function getDefaultConfig() {
    return {
        group: {
            welcomeMessage: {
                enabled: false
            }
        }
    };
}

// Fungsi untuk mendapatkan video/gif random dari folder VID_GIF_ANIME
function getRandomAnimeMedia() {
  try {
    const animeDir = path.join(__dirname, '../../VID_GIF_ANIME');
    if (!fs.existsSync(animeDir)) {
      return null;
    }

    const files = fs.readdirSync(animeDir).filter(file => 
      file.endsWith('.mp4') || file.endsWith('.gif') || file.endsWith('.mov')
    );

    if (files.length === 0) {
      return null;
    }

    const randomFile = files[Math.floor(Math.random() * files.length)];
    return path.join(animeDir, randomFile);
  } catch (error) {
    return null;
  }
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

// Helper function untuk cek akses
function checkAccess(senderJid, config, fromMe) {
    if (fromMe) return true;
    
    const senderNumber = senderJid.split('@')[0];
    const ownerNumber = config.bot?.owner?.replace(/[^0-9]/g, '');
    const botNumber = config.bot?.botNumber?.replace(/[^0-9]/g, '');
    
    if (config.bot?.mode === 'self') {
        return senderNumber === ownerNumber || senderNumber === botNumber;
    }
    
    return true;
}

// Handler untuk command welcome
async function handleWelcomeCommand(sock, msg, config, args) {
    // Cek akses berdasarkan mode bot
    const fromMe = msg.key.fromMe;
    const senderJid = msg.key.participant || msg.key.remoteJid;
    
    if (!checkAccess(senderJid, config, fromMe)) {
        return; // Silent exit di mode self
    }

    if (args.length < 2) {
        const helpText = `
❌ *Format salah!*

📝 *Cara penggunaan:*
${config.bot?.prefix || '.'}welcome on
${config.bot?.prefix || '.'}welcome off

📋 *Penjelasan:*
• *on* - Aktifkan pesan welcome di grup
• *off* - Matikan pesan welcome di grup

📊 *Status saat ini:* ${config.group?.welcomeMessage?.enabled ? 'ON ✅' : 'OFF ❌'}

🎯 *Fitur Welcome Message:*
• Pesan otomatis saat ada member baru join grup
• Mencakup info grup, aturan, dan animasi
• Tampilan cantik dengan media dan mention
• Auto detect waktu dan salam yang tepat`;

        await sendQuotedMessage(sock, msg.key.remoteJid, helpText, msg);
        return;
    }

    const newMode = args[1].toLowerCase();

    if (newMode !== 'on' && newMode !== 'off') {
        await sendQuotedMessage(sock, msg.key.remoteJid, `❌ Mode tidak valid! Gunakan 'on' atau 'off'`, msg);
        return;
    }

    const enabled = newMode === 'on';

    // Inisialisasi group settings jika belum ada
    if (!config.group) {
        config.group = {
            welcomeMessage: {
                enabled: false
            }
        };
    }

    if (!config.group.welcomeMessage) {
        config.group.welcomeMessage = {
            enabled: false
        };
    }

    // Periksa apakah mode sudah sama
    if (config.group.welcomeMessage.enabled === enabled) {
        await sendQuotedMessage(sock, msg.key.remoteJid, `⚠️ Welcome message sudah dalam keadaan *${newMode.toUpperCase()}*`, msg);
        return;
    }

    // Update config
    config.group.welcomeMessage.enabled = enabled;

    // Simpan config
    const saveResult = saveConfig(config);

    if (saveResult) {
        const statusText = enabled ? 
            `✅ *WELCOME MESSAGE: ON*

🎉 *Fitur Aktif:*
├─ Pesan welcome otomatis untuk member baru
├─ Tampilan cantik dengan animasi dan info grup
├─ Auto mention member baru
├─ Info lengkap grup dan aturan
└─ Waktu real-time Asia/Jakarta

🎯 *Yang Terjadi:*
• Bot akan kirim pesan welcome saat ada yang join grup
• Pesan include profile picture member baru

• Info grup seperti jumlah member, admin, dll
• Aturan grup dan tips untuk member baru

📁 *Status:* Tersimpan ke config.json ✅
💾 *Backup:* Tersimpan ke DATA/config.backup.json ✅

🤖 *Catatan:* Welcome message hanya akan muncul di grup, bukan di private chat` :
            `❌ *WELCOME MESSAGE: OFF*

🔇 *Fitur Nonaktif:*
├─ Bot tidak akan kirim pesan welcome
├─ Member baru join tanpa sambutan otomatis
└─ Grup kembali ke mode normal

📁 *Status:* Tersimpan ke config.json ✅
💾 *Backup:* Tersimpan ke DATA/config.backup.json ✅

💡 *Untuk mengaktifkan kembali:*
Gunakan ${config.bot?.prefix || '.'}welcome on`;

        await sendQuotedMessage(sock, msg.key.remoteJid, statusText, msg);
    } else {
        await sendQuotedMessage(sock, msg.key.remoteJid, `❌ Gagal menyimpan pengaturan welcome message ke config.json`, msg);
    }
}

// Fungsi untuk membuat pesan welcome yang cantik
async function createWelcomeMessage(sock, participant, groupMetadata, isJoin = true) {
  try {
    // Waktu akurat Asia/Jakarta menggunakan Intl.DateTimeFormat
    const now = new Date();
    
    // Format tanggal yang lebih akurat
    const jakartaDateFormatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
    
    const jakartaTimeFormatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const jakartaDate = jakartaDateFormatter.format(now);
    const jakartaTime = jakartaTimeFormatter.format(now);

    // Dapatkan jam yang akurat untuk Asia/Jakarta
    const jakartaHourFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      hour: 'numeric',
      hour12: false
    });
    
    const currentHour = parseInt(jakartaHourFormatter.format(now));

    let greeting, greetingEmoji;
    if (currentHour >= 0 && currentHour < 4) {
      greeting = "Tengah Malam";
      greetingEmoji = "🌙";
    } else if (currentHour >= 4 && currentHour < 10) {
      greeting = "Pagi";
      greetingEmoji = "🌅";
    } else if (currentHour >= 10 && currentHour < 15) {
      greeting = "Siang";
      greetingEmoji = "☀️";
    } else if (currentHour >= 15 && currentHour < 18) {
      greeting = "Sore";
      greetingEmoji = "🌤️";
    } else {
      greeting = "Malam";
      greetingEmoji = "🌜";
    }

    // Dapatkan profile picture user
    let ppUser = null;
    try {
      ppUser = await sock.profilePictureUrl(participant, 'image');
    } catch (error) {
      ppUser = 'https://files.catbox.moe/9cq0yk.jpg'; // Default avatar
    }

    // Dapatkan media anime random
    const animeMediaPath = getRandomAnimeMedia();
    let animeMedia = null;

    if (animeMediaPath && fs.existsSync(animeMediaPath)) {
      animeMedia = fs.readFileSync(animeMediaPath);
    }

    const userName = participant.split('@')[0];
    const groupName = groupMetadata.subject || 'Grup';
    const memberCount = groupMetadata.participants.length;

    // Hitung jumlah admin
    const adminCount = groupMetadata.participants.filter(p => p.admin !== null).length;

    // Cari pemilik grup (creator) - cek semua kemungkinan admin level
    const groupOwner = groupMetadata.participants.find(p => 
      p.admin === 'superadmin' || 
      (p.admin === 'admin' && groupMetadata.owner === p.id)
    );
    
    let ownerTag = '';
    if (groupOwner) {
      const ownerName = groupOwner.id.split('@')[0];
      ownerTag = `@${ownerName}`;
    } else if (groupMetadata.owner) {
      // Fallback: gunakan owner dari metadata grup langsung
      const ownerName = groupMetadata.owner.split('@')[0];
      ownerTag = `@${ownerName}`;
    }

    // Waktu grup dibuat (jika tersedia) - format yang lebih akurat
    let groupCreationDate = '';
    if (groupMetadata.creation) {
      const creationDate = new Date(groupMetadata.creation * 1000);
      const creationFormatter = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      groupCreationDate = creationFormatter.format(creationDate);
    }

    const welcomeText = `> ⭐ SELAMAT DATANG
  
👋 𝐇𝐚𝐥𝐥𝐨 : @${userName}!
${greetingEmoji} 𝐒𝐞𝐥𝐚𝐦𝐚𝐭: *${greeting}*
🏡 𝐍𝐚𝐦𝐚 𝐆𝐫𝐮𝐩 : *${groupName}*
👥 𝐉𝐮𝐦𝐥𝐚𝐡 𝐌𝐞𝐦𝐛𝐞𝐫 : *${memberCount}* 𝐨𝐫𝐚𝐧𝐠
👑 𝐉𝐮𝐦𝐥𝐚𝐡 𝐀𝐝𝐦𝐢𝐧 : *${adminCount}* 𝐨𝐫𝐚𝐧𝐠${ownerTag ? `\n🔰 𝐆𝐫𝐮𝐩 𝐏𝐞𝐦𝐢𝐥𝐢𝐤 : *${ownerTag}*` : ''}${groupCreationDate ? `\n📆 𝐆𝐫𝐮𝐩 𝐃𝐢𝐛𝐮𝐚𝐭 𝐏𝐚𝐝𝐚 : *${groupCreationDate}*` : ''}
📅 𝐒𝐚𝐚𝐭 𝐈𝐧𝐢 𝐓𝐚𝐧𝐠𝐠𝐚𝐥 : *${jakartaDate}*
⏰ 𝐒𝐚𝐚𝐭 𝐈𝐧𝐢 𝐖𝐚𝐤𝐭𝐮 : *${jakartaTime}* 𝐖𝐈𝐁

> 📋 PERATURAN GRUP:
• *Saling menghormati sesama member*
• *Dilarang spam* atau flood*
• *Gunakan nama yang sopan*
• *No toxic, no drama*
• *Nikmati diskusi yang sehat*

> 💡 TIPS:
• *Perkenalkan diri terlebih dahulu*
• *Baca pesan sebelumnya*
• *Ikuti diskusi dengan baik*

> ✨ Semoga betah dan bisa berkontribusi positif!`;

    // Struktur pesan dengan contextInfo yang lebih cantik
    const messageContent = {
      text: welcomeText,
      contextInfo: {
        quotedMessage: {
          conversation: `*_Dikembangkan Oleh @WilyKun Bot_* *${jakartaTime} WIB*`
        },
        mentionedJid: [participant],
        participant: "6289688206739@s.whatsapp.net",
        remoteJid: "120363312297133690@g.us",
        forwardingScore: 999,
        isForwarded: true,
        externalAdReply: {
          title: `🎉 WELCOME TO ${groupName.toUpperCase()}`,
          body: `Member baru bergabung • ${jakartaDate}`,
          thumbnailUrl: ppUser || 'https://files.catbox.moe/mxohav.gif',
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

    return messageContent;
  } catch (error) {
    return {
      text: `🎉 Selamat datang @${participant.split('@')[0]} di grup ${groupMetadata.subject || 'ini'}!\n\n📅 ${new Date().toLocaleDateString('id-ID')}\n⏰ ${new Date().toLocaleTimeString('id-ID')}\n\n✨ Semoga betah dan enjoy!`,
      contextInfo: {
        mentionedJid: [participant]
      }
    };
  }
}

// Handler utama untuk welcome message
async function welcomeHandler(sock, notification) {
  try {
    // Load config untuk cek apakah fitur aktif
    const config = loadConfig();
    
    // Cek apakah fitur welcome aktif
    if (!config.group?.welcomeMessage?.enabled) {
      return;
    }

    // Cek apakah ini notifikasi grup
    if (!notification.id.endsWith('@g.us')) {
      return;
    }

    const groupId = notification.id;

    // Dapatkan metadata grup
    let groupMetadata;
    try {
      groupMetadata = await sock.groupMetadata(groupId);
    } catch (error) {
      return;
    }

    // Handle participants update (join/leave/invite)
    if (notification.action === 'add' || notification.action === 'invite') {
      const participants = notification.participants || [];

      for (const participant of participants) {
        // Skip jika yang join adalah bot sendiri
        const botNumber = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
        if (participant === botNumber) {
          continue;
        }

        try {
          // Tunggu sebentar untuk memastikan data sudah terupdate
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Update group metadata setelah member baru join
          groupMetadata = await sock.groupMetadata(groupId);

          // Buat pesan welcome
          const welcomeMessage = await createWelcomeMessage(
            sock, 
            participant, 
            groupMetadata, 
            notification.action === 'add'
          );

          // Kirim pesan welcome
          await sock.sendMessage(groupId, welcomeMessage);

          // Delay antar member untuk menghindari spam
          if (participants.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }

        } catch (error) {
          // Silent error - tapi bisa di-log untuk debugging
          // console.log('Welcome message error:', error.message);
        }
      }
    }

  } catch (error) {
    // Silent error
  }
}

module.exports = { 
  handleWelcomeCommand,
  welcomeHandler,
  createWelcomeMessage,
  getRandomAnimeMedia,
  loadConfig,
  saveConfig
};
