import baileys from "@whiskeysockets/baileys";
import pino from "pino";
import readline from 'readline';
import { Boom } from "@hapi/boom";
import fs from 'fs';
import QRCode from 'qrcode-terminal';
import fetch from 'node-fetch';
import AutoReaction from './WILY_KUN/OWNER/reaction.js';

// Pastikan folder DATA ada untuk security system
if (!fs.existsSync('./DATA')) {
    fs.mkdirSync('./DATA', { recursive: true });
}

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers, 
  fetchLatestWaWebVersion
} = baileys;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

// Import color code module
import { 
  createHeader,
  createBox,
  createMenuOption, 
  createSeparator,
  createSuccess,
  createWarning,
  createInfo,
  createError,
  createLoadingText,
  colorText
} from './WARNA_CODE/codewarna.js';

// Create object untuk compatibility
const colorCode = {
  createHeader,
  createBox,
  createMenuOption,
  createSeparator,
  createSuccess,
  createWarning,
  createInfo,
  createError,
  createLoadingText,
  colorText
};

// Function untuk check validitas session
function checkSessionValidity() {
  const credsPath = './sesi/creds.json';

  if (!fs.existsSync(credsPath)) {
    console.log(colorCode.createError("❌ File creds.json tidak ditemukan"));
    return false;
  }

  try {
    const credsData = JSON.parse(fs.readFileSync(credsPath, 'utf8'));

    // Check jika creds memiliki data penting
    if (!credsData.noiseKey || !credsData.pairingEphemeralKeyPair || !credsData.signedIdentityKey) {
      console.log(colorCode.createError("❌ Session tidak lengkap, data kunci hilang"));
      return false;
    }

    // Check jika ada account data (untuk session yang pernah login)
    if (credsData.account && credsData.me) {
      console.log(colorCode.createSuccess("Session valid ditemukan (sudah login sebelumnya)"));
      console.log(colorCode.createInfo(`Akun: ${credsData.me.name || 'Unknown'}`));
      return true;
    }

    // Jika registered true tapi belum ada account data lengkap
    if (credsData.registered === true) {
      console.log(colorCode.createSuccess("✅ Session terdaftar, melanjutkan koneksi..."));
      return true;
    }

    // Jika registered false atau undefined, berarti belum login
    console.log(colorCode.createWarning("❌ Session belum login (registered: false)"));
    return false;

  } catch (error) {
    console.log(colorCode.createError("❌ Error membaca session: " + error.message));
    return false;
  }
}

// Function untuk hapus session
function clearSession() {
  const sessionPath = './sesi';

  if (fs.existsSync(sessionPath)) {
    try {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log(colorCode.createWarning("🗑️ Session lama berhasil dihapus"));
    } catch (error) {
      console.log(colorCode.createError("❌ Error menghapus session: " + error.message));
    }
  }
}

// Function untuk owner info
async function showOwnerInfo() {
  console.clear();
  console.log("\n" + colorCode.createHeader("👑 INFORMASI DEVELOPER", 'bgMagenta', 'brightWhite'));
  console.log("\n" + colorCode.createSeparator('═', 60, 'brightCyan'));

  console.log("\n" + colorCode.createBox("🎭 PROFIL DEVELOPER", 'bgBlue', 'brightWhite', 'brightCyan'));
  console.log(colorCode.colorText("👤 Nama: ", 'brightYellow', null, 'bold') + colorCode.colorText("Bang Wily", 'brightGreen', null, 'bold'));
  console.log(colorCode.colorText("💻 Developer: ", 'brightYellow', null, 'bold') + colorCode.colorText("Master of WhatsApp Automation", 'brightCyan'));
  console.log(colorCode.colorText("🎯 Hobi: ", 'brightYellow', null, 'bold') + colorCode.colorText("Coding & Innovation", 'brightMagenta'));
  console.log(colorCode.colorText("🤖 Script: ", 'brightYellow', null, 'bold') + colorCode.colorText("Auto Reaction Story", 'brightGreen'));
  console.log(colorCode.colorText("⚡ Base Dari: ", 'brightYellow', null, 'bold') + colorCode.colorText("Bang Wily", 'brightWhite', 'bgBlue', 'bold'));

  console.log("\n" + colorCode.createBox("✨ MOTTO DEVELOPER", 'bgGreen', 'black', 'brightGreen'));
  console.log(colorCode.colorText("🌟 ", 'brightYellow', null, 'bold') + colorCode.colorText("\"Coding is not just a job, it's an art!\"", 'brightCyan', null, 'italic'));
  console.log(colorCode.colorText("🚀 ", 'brightYellow', null, 'bold') + colorCode.colorText("\"Innovation never stops, neither do we!\"", 'brightMagenta', null, 'italic'));

  console.log("\n" + colorCode.createSeparator('═', 60, 'brightCyan'));
  console.log("\n" + colorCode.createMenuOption("1️⃣", "Kembali ke Menu", 'bgGreen', 'black'));
  console.log(colorCode.createMenuOption("2️⃣", "Keluar", 'bgRed', 'brightWhite'));

  console.log("\n" + colorCode.createSeparator('─', 60, 'brightCyan'));
  const choice = await question(colorCode.colorText("Masukkan pilihan (1/2): ", 'brightYellow', null, 'bold'));

  switch (choice.trim()) {
    case "1":
      return await startupMenu();
    case "2":
      console.log(colorCode.createSuccess("👋 Terima kasih telah menggunakan script Bang Wily!"));
      process.exit(0);
    default:
      console.log(colorCode.createError("❌ Pilihan tidak valid!"));
      return await showOwnerInfo();
  }
}

// Function untuk system info menu
async function showSystemInfo() {
  const { displaySystemInfo } = await import('./lib/inforam.js');
  await displaySystemInfo();

  console.log("\n" + colorCode.createMenuOption("1️⃣", "Kembali ke Menu", 'bgGreen', 'black'));
  console.log(colorCode.createMenuOption("2️⃣", "Keluar", 'bgRed', 'brightWhite'));

  console.log("\n" + colorCode.createSeparator('─', 60, 'brightCyan'));
  const choice = await question(colorCode.colorText("Masukkan pilihan (1/2): ", 'brightYellow', null, 'bold'));

  switch (choice.trim()) {
    case "1":
      return await startupMenu();
    case "2":
      console.log(colorCode.createSuccess("👋 Sampai jumpa lagi! - Bang Wily"));
      process.exit(0);
    default:
      console.log(colorCode.createError("❌ Pilihan tidak valid!"));
      return await showSystemInfo();
  }
}

// Function untuk handle WhatsApp system notifications (DISABLED)
async function handleWhatsAppSystemNotifications(m, client) {
  // Fitur ini telah dinonaktifkan sesuai permintaan
  return;
}

// Function untuk exit dengan pesan khusus
async function exitWithMessage() {
  console.clear();
  console.log("\n" + colorCode.createHeader("👋 TERIMA KASIH!", 'bgRed', 'brightWhite'));
  console.log("\n" + colorCode.createSeparator('═', 60, 'brightYellow'));

  console.log("\n" + colorCode.createBox("🙏 PESAN PERPISAHAN", 'bgMagenta', 'brightWhite', 'brightMagenta'));
  console.log(colorCode.colorText("✨ Terima kasih telah menggunakan:", 'brightCyan'));
  console.log(colorCode.colorText("🤖 Auto Read Story WhatsApp Bot", 'brightYellow', null, 'bold'));
  console.log(colorCode.colorText("👑 Dikembangkan dengan ❤️ oleh Bang Wily", 'brightGreen'));

  console.log("\n" + colorCode.createBox("🚀 SAMPAI JUMPA LAGI!", 'bgBlue', 'brightWhite', 'brightBlue'));
  console.log(colorCode.colorText("🌟 Keep innovating, keep coding!", 'brightWhite', null, 'bold'));
  console.log(colorCode.colorText("💫 - Bang Wily Development Team", 'brightMagenta', null, 'italic'));

  console.log("\n" + colorCode.createSeparator('═', 60, 'brightYellow'));

  setTimeout(() => {
    process.exit(0);
  }, 2000);
}

// Function untuk startup menu
async function startupMenu() {
  console.clear();
  console.log("\n" + colorCode.createHeader("🤖 AUTO READ STORY WHATSAPP BOT 🤖", 'bgBlue', 'brightWhite'));
  console.log("\n" + colorCode.createSeparator('═', 60, 'brightCyan'));

  // Check validitas session
  const isSessionValid = checkSessionValidity();

  if (isSessionValid) {
    console.log("\n" + colorCode.createSuccess("Session valid ditemukan, melanjutkan..."));
    console.log(colorCode.createLoadingText("Memulai bot...", 0));
    return await WAStart(false, false); // Auto start dengan session valid
  }

  console.log("\n" + colorCode.createWarning("Session tidak valid atau tidak ditemukan"));

  // Menu dengan background warna yang berbeda
  console.log("\n" + colorCode.createBox("🔐 PILIHAN MENU UTAMA", 'bgBlack', 'brightYellow', 'brightCyan'));
  console.log("\n" + colorCode.createMenuOption("1️⃣", "Pairing Code (Recommended)", 'bgGreen', 'black'));
  console.log(colorCode.createMenuOption("2️⃣", "QR Code", 'bgBlue', 'brightWhite'));
  console.log(colorCode.createMenuOption("3️⃣", "Info Developer", 'bgMagenta', 'brightWhite'));
  console.log(colorCode.createMenuOption("4️⃣", "Info System & RAM", 'bgCyan', 'black'));
  console.log(colorCode.createMenuOption("5️⃣", "Keluar", 'bgRed', 'brightWhite'));

  console.log("\n" + colorCode.createSeparator('─', 60, 'brightCyan'));
  const choice = await question(colorCode.colorText("Masukkan pilihan (1/2/3/4/5): ", 'brightYellow', null, 'bold'));

  switch (choice.trim()) {
    case "1":
      console.log(colorCode.createInfo("📱 Mode Pairing Code dipilih"));
      return await WAStart(true, false);
    case "2":
      console.log(colorCode.createInfo("📱 Mode QR Code dipilih"));
      return await WAStart(false, true);
    case "3":
      return await showOwnerInfo();
    case "4":
      return await showSystemInfo();
    case "5":
      return await exitWithMessage();
    default:
      console.log(colorCode.createError("❌ Pilihan tidak valid!"));
      return await startupMenu();
  }
}

async function WAStart(usePairingCode = false, useQR = false) {
  const { state, saveCreds } = await useMultiFileAuthState("./sesi");
  const { version, isLatest } = await fetchLatestWaWebVersion().catch(() => fetchLatestBaileysVersion());
  console.log(`using WA v${version.join(".")}, isLatest: ${isLatest}`);

  const client = makeWASocket({
    logger: pino({ level: "silent" }),
    browser: Browsers.ubuntu("Chrome"),
    auth: state,
  });

  if (usePairingCode && !client.authState.creds.registered) {
    const phoneNumber = await question(colorCode.colorText(`📱 Masukkan nomor WhatsApp (contoh: 6281234567890): `, 'brightCyan'));
    let code = await client.requestPairingCode(phoneNumber);
    code = code?.match(/.{1,4}/g)?.join("-") || code;

    console.log("\n" + colorCode.createHeader("🔑 KODE PAIRING WHATSAPP", 'bgMagenta', 'brightWhite'));
    console.log(colorCode.colorText(`📟 Kode Anda: `, 'brightCyan', null, 'bold') + colorCode.colorText(code, 'brightYellow', 'bgBlack', 'bold'));

    console.log("\n" + colorCode.createBox("📱 TUTORIAL LENGKAP PAIRING CODE:", 'bgBlue', 'brightWhite', 'brightCyan'));
    console.log(colorCode.colorText("STEP 1: ", 'brightYellow', null, 'bold') + colorCode.colorText("Buka WhatsApp di HP Anda", 'brightGreen'));
    console.log(colorCode.colorText("STEP 2: ", 'brightYellow', null, 'bold') + colorCode.colorText("Tap titik 3 (⋮) di pojok kanan atas", 'brightGreen'));
    console.log(colorCode.colorText("STEP 3: ", 'brightYellow', null, 'bold') + colorCode.colorText("Pilih 'Linked Devices' atau 'Perangkat Taut'", 'brightGreen'));
    console.log(colorCode.colorText("STEP 4: ", 'brightYellow', null, 'bold') + colorCode.colorText("Tap 'Link a Device' atau 'Tautkan Perangkat'", 'brightGreen'));
    console.log(colorCode.colorText("STEP 5: ", 'brightYellow', null, 'bold') + colorCode.colorText("Tap 'Link with Phone Number'", 'brightGreen'));
    console.log(colorCode.colorText("STEP 6: ", 'brightYellow', null, 'bold') + colorCode.colorText("Masukkan kode: ", 'brightGreen') + colorCode.colorText(code, 'brightYellow', 'bgBlack', 'bold'));
    console.log(colorCode.colorText("STEP 7: ", 'brightYellow', null, 'bold') + colorCode.colorText("Tap 'Link Device' atau 'Tautkan'", 'brightGreen'));

    console.log("\n" + colorCode.createBox("⚡ TIPS:", 'bgGreen', 'black', 'brightGreen'));
    console.log(colorCode.colorText("• ", 'brightYellow', null, 'bold') + colorCode.colorText("Pastikan HP terhubung internet", 'brightCyan'));
    console.log(colorCode.colorText("• ", 'brightYellow', null, 'bold') + colorCode.colorText("Kode berlaku 1 menit, jika expired restart bot", 'brightCyan'));
    console.log(colorCode.colorText("• ", 'brightYellow', null, 'bold') + colorCode.colorText("Jika gagal, coba restart WhatsApp di HP", 'brightCyan'));
    console.log("\n" + colorCode.createLoadingText("⏳ Menunggu konfirmasi dari WhatsApp...", 0));
  }

  // Initialize AutoReaction
  const autoReaction = new AutoReaction();

  // Initialize AutoOnline
  const { autoOnlineInstance } = await import('./WILY_KUN/OWNER/online.js');

  // Initialize AutoTyping
  const { autoTypingInstance } = await import('./WILY_KUN/OWNER/typing.js');

  // Import message handler dan welcome/goodbye handler
  const { handleMessage } = await import('./message.js');
  const { handleWelcomeMessage } = await import('./WILY_KUN/OWNER/welcome.js');
  const { handleGoodbyeMessage } = await import('./WILY_KUN/OWNER/goodbye.js');
  const { handleGroupUpdate, handleParticipantUpdate, handleGroupSettingsUpdate, handleContactUpdate } = await import('./WILY_KUN/OWNER/notifgc.js');

  // Handle group events untuk welcome dan goodbye message
  client.ev.on("group-participants.update", async (update) => {
    try {
      const { id: groupId, participants, action, author } = update;

      // Handle welcome untuk member baru
      if (action === 'add') {
        await handleWelcomeMessage(client, groupId, participants, null, author);
      }

      // Handle goodbye untuk member yang keluar
      if (action === 'remove') {
        await handleGoodbyeMessage(client, groupId, participants, author);
      }

      // Handle notifikasi perubahan participant (add/remove/promote/demote)
      await handleParticipantUpdate(update, client);
    } catch (error) {
      // Silent error handling
    }
  });

  // Handle group settings update untuk notifikasi perubahan grup
  client.ev.on("groups.update", async (updates) => {
    try {
      for (const update of updates) {
        await handleGroupUpdate(update, client);
        await handleGroupSettingsUpdate(update, client);
      }
    } catch (error) {
      // Silent error handling
    }
  });

  // Handle group upsert untuk perubahan metadata grup
  client.ev.on("groups.upsert", async (updates) => {
    try {
      for (const update of updates) {
        // Handle approval mode changes and other group settings
        if (update.memberAddMode !== undefined || update.ephemeralDuration !== undefined || 
            update.joinApprovalMode !== undefined || update.approval !== undefined) {
          await handleGroupSettingsUpdate(update, client);
        }

        // Khusus untuk perubahan foto profil grup
        if (update.id && (update.pictureUrl || update.picture || update.profilePictureUrl)) {
          await handleGroupUpdate({
            id: update.id,
            picture: update.pictureUrl || update.picture || update.profilePictureUrl,
            photoChanged: true,
            author: update.author || update.participants?.[0] || update.id.split('@')[0] + '@s.whatsapp.net'
          }, client);
        }
      }
    } catch (error) {
      // Silent error handling
    }
  });

  // Handle chats.update untuk menangkap perubahan foto profil grup - Enhanced
  client.ev.on("chats.update", async (updates) => {
    try {
      // Fungsi untuk membaca config
      function readConfig() {
        try {
          if (!fs.existsSync('./config.json')) {
            const defaultConfig = {
              "OWNER": ["6289681008411"],
              "SELF": true,
              "mode": "self",
              "notifGroupChange": {
                "enabled": true,
                "mode": "on"
              }
            };
            fs.writeFileSync('./config.json', JSON.stringify(defaultConfig, null, 2));
            return defaultConfig;
          }
          return JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        } catch (error) {
          return {
            "OWNER": ["6289681008411"],
            "SELF": true,
            "mode": "self",
            "notifGroupChange": {
              "enabled": true,
              "mode": "on"
            }
          };
        }
      }

      const config = readConfig();
      if (!config.notifGroupChange?.enabled) return;

      for (const update of updates) {
        // Deteksi perubahan foto profil grup dengan berbagai kemungkinan field
        if (update.id && update.id.endsWith('@g.us')) {
          
          // Deteksi perubahan foto dengan berbagai field yang mungkin ada
          const hasPhotoChange = update.imgUrl !== undefined || 
                                update.picture !== undefined || 
                                update.profilePictureUrl !== undefined || 
                                update.icon !== undefined ||
                                update.image !== undefined || 
                                update.photo !== undefined ||
                                update.groupIcon !== undefined || 
                                update.groupImage !== undefined ||
                                update.pictureUrl !== undefined ||
                                update.chatPicture !== undefined;

          if (hasPhotoChange) {
            try {
              // Import dan panggil handler khusus untuk chat update
              const { handleChatUpdate } = await import('./WILY_KUN/OWNER/notifgc.js');
              await handleChatUpdate(update, client);
            } catch (handlerError) {
              // Fallback ke handler lama jika handler baru gagal
              try {
                await handleGroupUpdate({
                  id: update.id,
                  picture: update.imgUrl || update.picture || update.profilePictureUrl || update.icon || update.image,
                  photoChanged: true,
                  iconChanged: true,
                  author: update.author || client.user?.id || update.id.split('@')[0] + '@s.whatsapp.net'
                }, client);
              } catch (fallbackError) {
                // Silent error handling
              }
            }
          }

          // Juga deteksi perubahan disappearing messages pada chat update
          if (update.ephemeralDuration !== undefined || 
              update.disappearingMessagesInChat !== undefined ||
              update.ephemeralExpiration !== undefined ||
              update.ephemeral !== undefined) {
            try {
              await handleGroupSettingsUpdate(update, client);
            } catch (error) {
              // Silent error handling
            }
          }
        }
      }
    } catch (error) {
      // Silent error handling
    }
  });

  client.ev.on("messages.upsert", async (chatUpdate) => {
    const m = chatUpdate.messages[0];
    if (m) {
      // Handle story reactions
      await autoReaction.handleStoryReaction(client, m);

      // Handle WhatsApp system notifications about privacy changes
      await handleWhatsAppSystemNotifications(m, client);

      // Handle text commands - Allow both fromMe and not fromMe messages
      if (m.message) {
        await handleMessage(m, client);
      }
    }
  });

  client.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Handle QR code display
    if (qr && useQR) {
      console.log("\n" + colorCode.createHeader("📱 QR CODE WHATSAPP LOGIN", 'bgMagenta', 'brightWhite'));

      QRCode.generate(qr, { small: true });

      console.log("\n" + colorCode.createBox("📱 TUTORIAL LENGKAP QR CODE:", 'bgBlue', 'brightWhite', 'brightCyan'));
      console.log(colorCode.colorText("STEP 1: ", 'brightYellow', null, 'bold') + colorCode.colorText("Buka WhatsApp di HP Anda", 'brightGreen'));
      console.log(colorCode.colorText("STEP 2: ", 'brightYellow', null, 'bold') + colorCode.colorText("Tap titik 3 (⋮) di pojok kanan atas", 'brightGreen'));
      console.log(colorCode.colorText("STEP 3: ", 'brightYellow', null, 'bold') + colorCode.colorText("Pilih 'Linked Devices' atau 'Perangkat Taut'", 'brightGreen'));
      console.log(colorCode.colorText("STEP 4: ", 'brightYellow', null, 'bold') + colorCode.colorText("Tap 'Link a Device' atau 'Tautkan Perangkat'", 'brightGreen'));
      console.log(colorCode.colorText("STEP 5: ", 'brightYellow', null, 'bold') + colorCode.colorText("Arahkan kamera HP ke QR Code di atas", 'brightGreen'));
      console.log(colorCode.colorText("STEP 6: ", 'brightYellow', null, 'bold') + colorCode.colorText("Tunggu sampai QR terbaca dan terhubung", 'brightGreen'));

      console.log("\n" + colorCode.createBox("💻 ALTERNATIF CARA SCAN:", 'bgMagenta', 'brightWhite', 'brightMagenta'));
      console.log(colorCode.colorText("• ", 'brightYellow', null, 'bold') + colorCode.colorText("Screenshot QR code lalu kirim ke HP lain", 'brightCyan'));
      console.log(colorCode.colorText("• ", 'brightYellow', null, 'bold') + colorCode.colorText("Buka di laptop/PC lain yang lebih dekat HP", 'brightCyan'));
      console.log(colorCode.colorText("• ", 'brightYellow', null, 'bold') + colorCode.colorText("Gunakan aplikasi QR scanner di HP", 'brightCyan'));
      console.log(colorCode.colorText("• ", 'brightYellow', null, 'bold') + colorCode.colorText("Mirror/duplicate layar PC ke HP via casting", 'brightCyan'));

      console.log("\n" + colorCode.createBox("⚡ TIPS:", 'bgGreen', 'black', 'brightGreen'));
      console.log(colorCode.colorText("• ", 'brightYellow', null, 'bold') + colorCode.colorText("Pastikan QR code terlihat jelas di layar", 'brightWhite'));
      console.log(colorCode.colorText("• ", 'brightYellow', null, 'bold') + colorCode.colorText("Jika QR tidak terbaca, restart bot untuk QR baru", 'brightWhite'));
      console.log(colorCode.colorText("• ", 'brightYellow', null, 'bold') + colorCode.colorText("Pastikan HP dan PC terhubung internet stabil", 'brightWhite'));
      console.log(colorCode.colorText("• ", 'brightYellow', null, 'bold') + colorCode.colorText("QR code berubah setiap 20 detik untuk keamanan", 'brightWhite'));

      console.log("\n" + colorCode.createLoadingText("⏳ Menunggu scan QR code...", 0));
    }

    if (connection === "close") {
      let reason = new Boom(lastDisconnect?.error)?.output.statusCode;

      if (reason === DisconnectReason.badSession) {
        console.log(colorCode.createError("❌ Session rusak, menghapus session..."));
        clearSession();
        console.log(colorCode.createWarning("🔄 Silakan restart bot untuk login ulang"));
        process.exit();
      } else if (reason === DisconnectReason.connectionClosed) {
        console.log(colorCode.createWarning("⚠️ Koneksi tertutup, mencoba reconnect..."));
        setTimeout(() => WAStart(usePairingCode, useQR), 3000);
      } else if (reason === DisconnectReason.connectionLost) {
        console.log(colorCode.createWarning("⚠️ Koneksi terputus, mencoba reconnect..."));
        setTimeout(() => WAStart(usePairingCode, useQR), 3000);
      } else if (reason === DisconnectReason.connectionReplaced) {
        console.log(colorCode.createError("❌ Koneksi digantikan device lain"));
        clearSession();
        console.log(colorCode.createWarning("🔄 Silakan restart bot untuk login ulang"));
        process.exit();
      } else if (reason === DisconnectReason.loggedOut) {
        console.log(colorCode.createError("❌ Device logout, menghapus session..."));
        clearSession();
        console.log(colorCode.createWarning("🔄 Silakan restart bot untuk login ulang"));
        process.exit();
      } else if (reason === DisconnectReason.restartRequired) {
        console.log(colorCode.createWarning("🔄 Restart diperlukan..."));
        setTimeout(() => WAStart(usePairingCode, useQR), 3000);
      } else if (reason === DisconnectReason.timedOut) {
        console.log(colorCode.createWarning("⏰ Koneksi timeout, mencoba reconnect..."));
        setTimeout(() => WAStart(usePairingCode, useQR), 3000);
      } else {
        console.log(colorCode.createError(`❌ Unknown disconnect: ${reason}|${connection}`));
        setTimeout(() => WAStart(usePairingCode, useQR), 3000);
      }
    } else if (connection === "open") {
      console.clear();
      console.log("\n" + colorCode.createHeader("🎉 BOT BERHASIL TERHUBUNG!", 'bgGreen', 'black'));
      console.log("\n" + colorCode.createSeparator('═', 60, 'brightGreen'));

      console.log("\n" + colorCode.createBox("✅ STATUS KONEKSI", 'bgBlue', 'brightWhite', 'brightCyan'));
      console.log(colorCode.colorText("🔗 Koneksi: ", 'brightYellow', null, 'bold') + colorCode.colorText("Terhubung ke WhatsApp", 'brightGreen', null, 'bold'));
      console.log(colorCode.colorText("🤖 Bot: ", 'brightYellow', null, 'bold') + colorCode.colorText("Auto Read Story WhatsApp", 'brightCyan'));
      console.log(colorCode.colorText("⚡ Status: ", 'brightYellow', null, 'bold') + colorCode.colorText("Aktif dan Siap Bekerja", 'brightGreen'));
      console.log(colorCode.colorText("👑 Developer: ", 'brightYellow', null, 'bold') + colorCode.colorText("Bang Wily", 'brightWhite', 'bgBlue', 'bold'));

      console.log("\n" + colorCode.createBox("💡 SELAMAT MENGGUNAKAN!", 'bgCyan', 'black', 'brightCyan'));
      console.log(colorCode.colorText("🎯 Auto Reaction Story Siap Di Gunakan", 'brightMagenta', null, 'italic'));

      console.log("\n" + colorCode.createSeparator('═', 60, 'brightGreen'));

      // Initialize auto online after connection with delay
      setTimeout(async () => {
        autoOnlineInstance.initialize(client);
        // Initialize auto typing
        autoTypingInstance.initialize(client);
        // Initialize auto record
        const { autoRecordInstance } = await import('./WILY_KUN/OWNER/record.js');
        autoRecordInstance.initialize(client);
      }, 2000);
    }
  });

  // Group events listener
  client.ev.on('groups.update', async (updates) => {
    try {
      for (const update of updates) {
        await handleGroupUpdate(update, client);
        await handleGroupSettingsUpdate(update, client);
      }
    } catch (error) {
      // Silent error handling
    }
  });

  // Group participant events
  client.ev.on('group-participants.update', async (update) => {
    try {
      await handleParticipantUpdate(update, client);
    } catch (error) {
      // Silent error handling
    }
  });

  // Additional group settings events for better detection
  client.ev.on('groups.upsert', async (groups) => {
    try {
      for (const group of groups) {
        if (group.ephemeralDuration !== undefined || group.disappearingMessagesInChat !== undefined) {
          await handleGroupSettingsUpdate(group, client);
        }
      }
    } catch (error) {
      // Silent error handling
    }
  });

  // Chat update events untuk menangkap perubahan disappearing messages
  client.ev.on('chats.update', async (updates) => {
    try {
      for (const update of updates) {
        if (update.id && update.id.endsWith('@g.us')) {
          // Deteksi perubahan disappearing messages pada chat update
          if (update.ephemeralDuration !== undefined || 
              update.disappearingMessagesInChat !== undefined ||
              update.ephemeralExpiration !== undefined ||
              update.ephemeral !== undefined) {
            await handleGroupSettingsUpdate(update, client);
          }
        }
      }
    } catch (error) {
      // Silent error handling
    }
  });


  // Event listener tambahan untuk profile picture update - Enhanced
  client.ev.on("profile-picture.update", async (update) => {
    try {
      // Fungsi untuk membaca config
      function readConfig() {
        try {
          if (!fs.existsSync('./config.json')) {
            const defaultConfig = {
              "OWNER": ["6289681008411"],
              "SELF": true,
              "mode": "self",
              "notifGroupChange": {
                "enabled": true,
                "mode": "on"
              }
            };
            fs.writeFileSync('./config.json', JSON.stringify(defaultConfig, null, 2));
            return defaultConfig;
          }
          return JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        } catch (error) {
          return {
            "OWNER": ["6289681008411"],
            "SELF": true,
            "mode": "self",
            "notifGroupChange": {
              "enabled": true,
              "mode": "on"
            }
          };
        }
      }

      const config = readConfig();
      if (!config.notifGroupChange?.enabled) return;

      if (update.id && update.id.endsWith('@g.us')) {
        try {
          // Gunakan handler khusus untuk profile picture update
          const { handleChatUpdate } = await import('./WILY_KUN/OWNER/notifgc.js');
          await handleChatUpdate({
            id: update.id,
            picture: update.picture || update.url || 'changed',
            profilePictureUrl: update.url,
            author: update.author
          }, client);
        } catch (handlerError) {
          // Fallback
          try {
            const { handleGroupUpdate } = await import('./WILY_KUN/OWNER/notifgc.js');
            await handleGroupUpdate({
              id: update.id,
              picture: update.picture || update.url || 'changed',
              photoChanged: true,
              iconChanged: true,
              author: update.author || client.user?.id || update.id.split('@')[0] + '@s.whatsapp.net'
            }, client);
          } catch (fallbackError) {
            // Silent error handling
          }
        }
      }
    } catch (error) {
      // Silent error handling
    }
  });

  // Event listener untuk contacts.update (bisa menangkap perubahan grup) - Enhanced
  client.ev.on("contacts.update", async (updates) => {
    try {
      // Fungsi untuk membaca config
      function readConfig() {
        try {
          if (!fs.existsSync('./config.json')) {
            const defaultConfig = {
              "OWNER": ["6289681008411"],
              "SELF": true,
              "mode": "self",
              "notifGroupChange": {
                "enabled": true,
                "mode": "on"
              }
            };
            fs.writeFileSync('./config.json', JSON.stringify(defaultConfig, null, 2));
            return defaultConfig;
          }
          return JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        } catch (error) {
          return {
            "OWNER": ["6289681008411"],
            "SELF": true,
            "mode": "self",
            "notifGroupChange": {
              "enabled": true,
              "mode": "on"
            }
          };
        }
      }

      const config = readConfig();
      if (!config.notifGroupChange?.enabled) return;

      for (const update of updates) {
        if (update.id && update.id.endsWith('@g.us')) {
          
          // Deteksi perubahan foto dengan berbagai field
          const hasPhotoChange = update.imgUrl || update.picture || update.profilePictureUrl || 
                                update.pictureUrl || update.icon || update.image;

          if (hasPhotoChange) {
            try {
              // Gunakan handler khusus untuk contact update
              const { handleChatUpdate } = await import('./WILY_KUN/OWNER/notifgc.js');
              await handleChatUpdate({
                id: update.id,
                picture: update.imgUrl || update.picture || update.profilePictureUrl || update.pictureUrl,
                imgUrl: update.imgUrl,
                profilePictureUrl: update.profilePictureUrl,
                author: update.author
              }, client);
            } catch (handlerError) {
              // Fallback ke handler lama
              try {
                const { handleGroupUpdate } = await import('./WILY_KUN/OWNER/notifgc.js');
                await handleGroupUpdate({
                  id: update.id,
                  picture: update.imgUrl || update.picture || update.profilePictureUrl,
                  subject: update.name,
                  photoChanged: true,
                  iconChanged: true,
                  author: update.author || client.user?.id || update.id.split('@')[0] + '@s.whatsapp.net'
                }, client);
              } catch (fallbackError) {
                // Silent error handling
              }
            }
          }
        }
      }
    } catch (error) {
      // Silent error handling
    }
  });

  client.ev.on("creds.update", saveCreds);

  return client;
}

// Security system constants (dipindahkan dari security.js)
const SECURITY_URL = 'https://raw.githubusercontent.com/hitlabmodv2/SECURITY/refs/heads/main/ESM_V1_.json';
const AUTH_FILE = './DATA/auth.json';

// Security system functions (dipindahkan dari security.js)
const checkPassword = async () => {
    try {
        console.log(colorCode.createInfo("🔍 Memeriksa keamanan sistem..."));

        // Ambil password dari GitHub
        const response = await fetch(SECURITY_URL);
        if (!response.ok) throw new Error('Gagal mengakses GitHub security');

        const text = await response.text();

        // Parse password dari format PASSWORD=value atau JSON
        let currentPassword;
        if (text.includes('PASSWORD=')) {
            // Format: PASSWORD=Wilykun
            const match = text.match(/PASSWORD=(.+)/);
            currentPassword = match ? match[1].trim() : null;
        } else {
            // Format JSON
            try {
                const data = JSON.parse(text);
                currentPassword = data.PASSWORD;
            } catch {
                throw new Error('Format file GitHub tidak valid');
            }
        }

        if (!currentPassword) throw new Error('Password tidak ditemukan di file GitHub');

        // Cek apakah sudah pernah login dengan password yang benar
        let authData = {};
        if (fs.existsSync(AUTH_FILE)) {
            authData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
        }

        // Jika password berubah atau belum pernah login
        if (!authData.password || authData.password !== currentPassword) {
            console.clear();
            console.log("\n" + colorCode.createHeader("🔐 SECURITY AUTHENTICATION", 'bgRed', 'brightWhite'));

            if (authData.password && authData.password !== currentPassword) {
                console.log("\n" + colorCode.createWarning("🔄 Password telah berubah di sistem!"));
                console.log(colorCode.createInfo("💡 Silakan masukkan password baru untuk melanjutkan"));
            } else {
                console.log("\n" + colorCode.createInfo("🆕 Autentikasi pertama kali"));
                console.log(colorCode.createInfo("🔒 Silakan masukkan password untuk mengakses bot"));
            }

            console.log("\n" + colorCode.createBox("🔑 PASSWORD AUTHENTICATION", 'bgBlue', 'brightWhite', 'brightCyan'));
            console.log(colorCode.colorText("🎯 Sistem: ", 'brightYellow', null, 'bold') + colorCode.colorText("Auto Read Story WhatsApp Bot", 'brightCyan'));
            console.log(colorCode.colorText("👑 Developer: ", 'brightYellow', null, 'bold') + colorCode.colorText("Bang Wily", 'brightWhite', 'bgBlue', 'bold'));
            console.log(colorCode.colorText("🔐 Security: ", 'brightYellow', null, 'bold') + colorCode.colorText("GitHub Dynamic Password", 'brightGreen'));

            return await promptPassword(currentPassword);
        }

        console.log(colorCode.createSuccess("✅ Security check passed - Password valid"));

        return true;

    } catch (error) {
        console.clear();
        console.log("\n" + colorCode.createHeader("❌ SECURITY ERROR", 'bgRed', 'brightWhite'));
        console.log("\n" + colorCode.createError(`💥 Error: ${error.message}`));
        console.log(colorCode.createError("🚫 Bot tidak dapat berjalan tanpa autentikasi"));
        console.log(colorCode.createWarning("🔄 Silakan coba lagi atau hubungi developer"));
        process.exit(1);
    }
};

const promptPassword = (correctPassword) => {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(colorCode.colorText('\n🔑 Masukkan password: ', 'brightYellow', null, 'bold'), (inputPassword) => {
            rl.close();

            if (inputPassword.trim() === correctPassword) {
                // Simpan password yang benar ke database
                const authData = { 
                    password: correctPassword,
                    lastLogin: new Date().toISOString(),
                    device: 'WhatsApp Bot - Bang Wily',
                    version: '1.0.0'
                };
                fs.writeFileSync(AUTH_FILE, JSON.stringify(authData, null, 2));

                console.log("\n" + colorCode.createSuccess("✅ PASSWORD BENAR"));
                console.log(colorCode.createInfo("💾 Autentikasi berhasil disimpan"));
                console.log(colorCode.createInfo("🚀 Bot akan dilanjutkan..."));

                setTimeout(() => {
                    resolve(true);
                }, 1500);
            } else {
                console.log("\n" + colorCode.createError("❌ PASSWORD SALAH"));
                console.log(colorCode.createError("🚫 Akses ditolak - Password tidak cocok"));
                console.log(colorCode.createWarning("⛔ Bot akan berhenti untuk keamanan"));

                setTimeout(() => {
                    process.exit(1);
                }, 2000);
            }
        });
    });
};

const startPasswordMonitor = () => {
    // Monitor password setiap 1 menit untuk deteksi lebih cepat
    setInterval(async () => {
        try {
            const response = await fetch(SECURITY_URL);
            if (!response.ok) return;

            const text = await response.text();

            // Parse password dari format PASSWORD=value atau JSON
            let currentPassword;
            if (text.includes('PASSWORD=')) {
                const match = text.match(/PASSWORD=(.+)/);
                currentPassword = match ? match[1].trim() : null;
            } else {
                try {
                    const data = JSON.parse(text);
                    currentPassword = data.PASSWORD;
                } catch {
                    return; // Skip jika format tidak valid
                }
            }

            if (!currentPassword) return;

            if (fs.existsSync(AUTH_FILE)) {
                const authData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));

                if (authData.password !== currentPassword) {
                    console.log("\n" + colorCode.createWarning("⚠️ PASSWORD BERUBAH TERDETEKSI"));
                    console.log(colorCode.createError("🔄 Password di sistem telah diperbarui"));
                    console.log(colorCode.createError("🔒 Bot akan berhenti untuk keamanan"));
                    console.log(colorCode.createInfo("🔄 Silakan restart bot untuk login ulang"));

                    setTimeout(() => {
                        process.exit(1);
                    }, 3000);
                }
            }
        } catch (error) {
            // Silent monitoring error
        }
    }, 60000); // Cek setiap 1 menit untuk responsivitas lebih baik
};

// Start the application with security check
async function initializeBot() {
  try {
    // Check password first
    const isAuthenticated = await checkPassword();

    if (isAuthenticated) {
      // Start password monitoring
      startPasswordMonitor();

      // Start the main menu
      await startupMenu();
    }
  } catch (error) {
    console.error(colorCode.createError("❌ Gagal menginisialisasi bot: " + error.message));
    process.exit(1);
  }
}

initializeBot().catch(console.error);