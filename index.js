const {
  default: WAConnect,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  Browsers, 
  fetchLatestWaWebVersion
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const readline = require('readline');
const { Boom } = require("@hapi/boom");
const qrcode = require('qrcode-terminal');
const { colors, style } = require('./CODE_WARNA/colors');
const { createBanner, createMenuBox, createSuccessBox, createPairingCodeBox } = require('./CODE_WARNA/banner');
const { ServerInfo } = require('./SYSTEM_INFO/server');
// Security functions moved from security.js
const fs = require('fs');

const SECURITY_URL = 'https://raw.githubusercontent.com/hitlabmodv2/SECURITY/refs/heads/main/VERSION%208.0.0%20AUTO%20REACTION%20STORY%20%2B%20MD%20SELF%20OR%20PUBLIC.json';
const AUTH_FILE = './database/auth.json';

// Pastikan folder database ada
if (!fs.existsSync('./database')) {
    fs.mkdirSync('./database', { recursive: true });
}

const checkPassword = async () => {
    try {
        // Ambil password dari GitHub
        const response = await fetch(SECURITY_URL);
        if (!response.ok) throw new Error('Gagal mengakses GitHub');

        const text = await response.text();

        // Parse password dari format PASSWORD=value atau JSON
        let currentPassword;
        if (text.includes('PASSWORD=')) {
            // Format: PASSWORD=Bangwily
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
            console.log(style.warning(`
🔐 ${colors.cyan}SECURITY CHECK${colors.reset}

🔒 Status: Password diperlukan
${authData.password ? '🔄 Password telah berubah!' : '🆕 Autentikasi pertama kali'}
`));

            return await promptPassword(currentPassword);
        }

        console.log(style.success(`
✅ ${colors.green}SECURITY VALID${colors.reset}

✅ Status: Password masih valid
🔐 Mode: Auto login
`));

        return true;

    } catch (error) {
        console.log(style.error(`
❌ ${colors.red}SECURITY ERROR${colors.reset}

💥 Error: ${error.message}
🚫 Bot tidak dapat berjalan
`));
        process.exit(1);
    }
};

const promptPassword = (correctPassword) => {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(style.info('🔑 Masukkan password: '), (inputPassword) => {
            rl.close();

            if (inputPassword.trim() === correctPassword) {
                // Simpan password yang benar ke database
                const authData = { 
                    password: correctPassword,
                    lastLogin: new Date().toISOString()
                };
                fs.writeFileSync(AUTH_FILE, JSON.stringify(authData, null, 2));

                console.log(style.success(`
✅ ${colors.green}PASSWORD BENAR${colors.reset}

✅ Status: Autentikasi berhasil
💾 Disimpan ke database
`));
                resolve(true);
            } else {
                console.log(style.error(`
❌ ${colors.red}PASSWORD SALAH${colors.reset}

🚫 Status: Password tidak cocok
⛔ Bot akan berhenti
`));
                process.exit(1);
            }
        });
    });
};

const startPasswordMonitor = () => {
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
                    console.log(style.warning(`
⚠️ ${colors.yellow}PASSWORD BERUBAH${colors.reset}

🔄 Status: Password telah diperbarui
🔒 Bot akan berhenti untuk keamanan
`));
                    process.exit(1);
                }
            }
        } catch (error) {
            console.log(style.info('🔍 Pengecekan password gagal:'), error.message);
        }
    }, 60000); // Cek setiap 1 menit
};

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

let isConnected = false;

function clearConsole() {
  console.clear();
}

function displayHeader() {
  console.log(createBanner());
}

function displayMenu() {
  console.log(createMenuBox());
  console.log(ServerInfo.createServerInfoBox());
}

function displayPairingTutorial() {
  console.log(style.tutorial("📋 TUTORIAL LENGKAP PAIRING CODE:"));
  console.log("");
  console.log(style.warning("🔥 METODE PALING MUDAH DAN AMAN! 🔥"));
  console.log("");
  console.log(style.menuTitle("📱 LANGKAH-LANGKAH DETAIL:"));
  console.log("");
  console.log(style.info("1️⃣  PERSIAPAN NOMOR:"));
  console.log(style.highlight("   → Siapkan nomor WhatsApp Anda"));
  console.log(style.highlight("   → Format: 62812345678 (tanpa tanda +)"));
  console.log(style.highlight("   → Contoh: 628123456789"));
  console.log("");
  console.log(style.info("2️⃣  MASUKKAN NOMOR:"));
  console.log(style.highlight("   → Bot akan meminta nomor WhatsApp"));
  console.log(style.highlight("   → Ketik nomor dengan benar"));
  console.log(style.highlight("   → Tekan Enter untuk konfirmasi"));
  console.log("");
  console.log(style.info("3️⃣  KODE PAIRING MUNCUL:"));
  console.log(style.highlight("   → Bot akan generate kode 8 digit"));
  console.log(style.highlight("   → Contoh: 1234-5678"));
  console.log(style.highlight("   → Catat atau ingat kode ini"));
  console.log("");
  console.log(style.info("4️⃣  BUKA WHATSAPP DI HP:"));
  console.log(style.highlight("   → Buka aplikasi WhatsApp"));
  console.log(style.highlight("   → Klik titik 3 (menu) di pojok kanan atas"));
  console.log(style.highlight("   → Pilih 'Perangkat Tertaut'"));
  console.log("");
  console.log(style.info("5️⃣  PROSES PAIRING:"));
  console.log(style.highlight("   → Klik 'Tautkan Perangkat'"));
  console.log(style.highlight("   → Pilih 'Tautkan dengan nomor telepon'"));
  console.log(style.highlight("   → Masukkan kode 8 digit tadi"));
  console.log("");
  console.log(style.success("6️⃣  SELESAI!"));
  console.log(style.highlight("   → Tunggu proses verifikasi"));
  console.log(style.highlight("   → Bot akan otomatis tersambung"));
  console.log(style.highlight("   → Jangan tutup terminal!"));
  console.log("");
  console.log(style.error("⚠️  PENTING: Pastikan nomor yang dimasukkan benar!"));
  console.log("");
}

function displayQRTutorial() {
  console.log(style.tutorial("📋 TUTORIAL LENGKAP QR CODE:"));
  console.log("");
  console.log(style.warning("📱 METODE KLASIK DENGAN SCAN QR! 📱"));
  console.log("");
  console.log(style.menuTitle("📱 LANGKAH-LANGKAH DETAIL:"));
  console.log("");
  console.log(style.info("1️⃣  PERSIAPAN:"));
  console.log(style.highlight("   → Pastikan HP dan komputer siap"));
  console.log(style.highlight("   → Koneksi internet stabil"));
  console.log(style.highlight("   → WhatsApp sudah terinstall"));
  console.log("");
  console.log(style.info("2️⃣  QR CODE MUNCUL:"));
  console.log(style.highlight("   → QR Code akan tampil di layar terminal"));
  console.log(style.highlight("   → Bentuk kotak-kotak hitam putih"));
  console.log(style.highlight("   → Jangan tutup terminal saat QR muncul"));
  console.log("");
  console.log(style.info("3️⃣  BUKA WHATSAPP DI HP:"));
  console.log(style.highlight("   → Buka aplikasi WhatsApp di HP"));
  console.log(style.highlight("   → Klik titik 3 (menu) pojok kanan atas"));
  console.log(style.highlight("   → Pilih 'Perangkat Tertaut'"));
  console.log("");
  console.log(style.info("4️⃣  PROSES SCAN:"));
  console.log(style.highlight("   → Klik 'Tautkan Perangkat'"));
  console.log(style.highlight("   → Kamera akan terbuka otomatis"));
  console.log(style.highlight("   → Arahkan kamera ke QR Code di layar"));
  console.log("");
  console.log(style.info("5️⃣  SCAN QR CODE:"));
  console.log(style.highlight("   → Pastikan QR Code terlihat jelas"));
  console.log(style.highlight("   → Jarak kamera tidak terlalu dekat/jauh"));
  console.log(style.highlight("   → Tunggu hingga terbaca otomatis"));
  console.log("");
  console.log(style.success("6️⃣  BERHASIL TERSAMBUNG!"));
  console.log(style.highlight("   → Akan muncul notifikasi 'Tersambung'"));
  console.log(style.highlight("   → Bot langsung aktif otomatis"));
  console.log(style.highlight("   → Jangan tutup terminal!"));
  console.log("");
  console.log(style.error("⚠️  TIPS: Jika QR tidak terbaca, refresh dengan menekan Ctrl+C lalu jalankan ulang"));
  console.log("");
}

function cleanupSession() {
  try {
    const fs = require('fs');
    const path = require('path');
    const sesiDir = './sesi';

    if (fs.existsSync(sesiDir)) {
      const files = fs.readdirSync(sesiDir);
      files.forEach(file => {
        const filePath = path.join(sesiDir, file);
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          // Ignore individual file errors
        }
      });
      console.log(style.warning("🧹 Session berhasil dibersihkan"));
    }
  } catch (error) {
    console.log(style.error("❌ Error saat membersihkan session:"), error.message);
  }
}

async function checkExistingCredentials() {
  try {
    const fs = require('fs');
    const path = require('path');
    const crypto = require('crypto');
    const credsPath = path.join('./sesi', 'creds.json');

    if (!fs.existsSync(credsPath)) {
      return false;
    }

    // Baca dan parse file credentials
    const credsData = fs.readFileSync(credsPath, 'utf8');
    let creds;

    try {
      creds = JSON.parse(credsData);
    } catch (parseError) {
      console.log(style.error("❌ File creds.json corrupt atau tidak valid"));
      return false;
    }

    // Validasi struktur data yang lebih komprehensif
    const validationChecks = {
      // Cek noise key (required untuk enkripsi)
      noiseKey: creds.noiseKey && 
                creds.noiseKey.private && 
                creds.noiseKey.public &&
                Buffer.isBuffer(Buffer.from(creds.noiseKey.private.data || [])) &&
                Buffer.isBuffer(Buffer.from(creds.noiseKey.public.data || [])),

      // Cek signed identity key
      signedIdentityKey: creds.signedIdentityKey && 
                        creds.signedIdentityKey.private && 
                        creds.signedIdentityKey.public &&
                        Buffer.isBuffer(Buffer.from(creds.signedIdentityKey.private.data || [])) &&
                        Buffer.isBuffer(Buffer.from(creds.signedIdentityKey.public.data || [])),

      // Cek signed pre key
      signedPreKey: creds.signedPreKey && 
                   creds.signedPreKey.keyPair &&
                   creds.signedPreKey.signature &&
                   creds.signedPreKey.keyId &&
                   Buffer.isBuffer(Buffer.from(creds.signedPreKey.keyPair.private.data || [])) &&
                   Buffer.isBuffer(Buffer.from(creds.signedPreKey.keyPair.public.data || [])),

      // Cek akun informasi
      account: creds.account && 
               creds.account.details && 
               creds.account.accountSignatureKey &&
               creds.account.accountSignature &&
               creds.account.deviceSignature,

      // Cek me object (user info)
      me: creds.me && 
          creds.me.id && 
          creds.me.id.includes('@s.whatsapp.net'),

      // Cek signal identities
      signalIdentities: creds.signalIdentities && 
                       Array.isArray(creds.signalIdentities) && 
                       creds.signalIdentities.length > 0 &&
                       creds.signalIdentities.every(identity => 
                         identity.identifier && 
                         identity.identifierKey &&
                         Buffer.isBuffer(Buffer.from(identity.identifierKey.data || []))
                       ),

      // Cek registration status
      registered: creds.registered === true,

      // Cek registration ID
      registrationId: typeof creds.registrationId === 'number' && creds.registrationId > 0,

      // Cek platform
      platform: creds.platform && typeof creds.platform === 'string'
    };

    // Hitung persentase validitas
    const validChecks = Object.values(validationChecks).filter(check => check === true).length;
    const totalChecks = Object.keys(validationChecks).length;
    const validityPercentage = (validChecks / totalChecks) * 100;

    // Log detail validasi untuk debugging
    console.log(style.info(`🔍 Validasi Credentials: ${validChecks}/${totalChecks} (${validityPercentage.toFixed(1)}%)`));

    // Detail check yang gagal
    const failedChecks = Object.entries(validationChecks)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (failedChecks.length > 0) {
      console.log(style.warning(`⚠️  Komponen tidak valid: ${failedChecks.join(', ')}`));
    }

    // Session dianggap valid jika minimal 70% komponen valid
    // dan komponen kritis (noiseKey, signedIdentityKey) harus ada
    // registered bisa false karena bisa di-register ulang otomatis
    const criticalChecks = validationChecks.noiseKey && 
                          validationChecks.signedIdentityKey;

    const isValid = validityPercentage >= 70 && criticalChecks;

    if (isValid) {
      console.log(style.success("✅ Session credentials valid"));

      // Tambahan: Cek file timestamp untuk memastikan session tidak terlalu lama
      const stats = fs.statSync(credsPath);
      const fileAge = Date.now() - stats.mtime.getTime();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 hari

      if (fileAge > maxAge) {
        console.log(style.warning("⚠️  Session berusia lebih dari 30 hari, mungkin perlu refresh"));
        return false;
      }
    } else {
      console.log(style.error("❌ Session credentials tidak valid atau tidak lengkap"));
    }

    return isValid;

  } catch (error) {
    console.log(style.error("❌ Error saat validasi kredensial:"), error.message);
    return false;
  }
}

async function showMenu() {
  if (isConnected) {
    console.log(style.success("✅ Bot sudah tersambung dengan WhatsApp!"));
    console.log(style.info("🔄 Bot sedang berjalan untuk auto read story..."));
    return;
  }

  // Check if credentials exist and are registered
  const hasValidCreds = await checkExistingCredentials();

  if (hasValidCreds) {
    clearConsole();
    displayHeader();
    console.log(style.success("✅ Session valid ditemukan! Auto-connecting..."));
    console.log(style.info("🚀 Langsung menghubungkan ke WhatsApp..."));
    console.log(style.warning("⏳ Mohon tunggu, sedang connecting..."));
    console.log("");

    // Auto-connect langsung tanpa timeout yang terlalu ketat
    try {
      await WAStart(false, true); // Pass parameter untuk auto-connect
      return; // Jangan lanjut ke menu
    } catch (error) {
      console.log(style.error("❌ Gagal auto-connect:"), error.message);
      console.log(style.info("🔄 Mencoba sekali lagi..."));

      // Retry sekali lagi
      try {
        await WAStart(false, true);
        return;
      } catch (retryError) {
        console.log(style.error("❌ Masih gagal, bersihkan session dan pilih manual"));
        cleanupSession();
        setTimeout(() => showMenu(), 2000);
      }
    }
    return;
  }

  clearConsole();
  displayHeader();
  displayMenu();

  const choice = await question("Pilih opsi (1/2/3): ");

  switch(choice.trim()) {
    case '1':
      clearConsole();
      displayHeader();
      displayPairingTutorial();
      await WAStart(true);
      break;
    case '2':
      clearConsole();
      displayHeader();
      displayQRTutorial();
      await WAStart(false);
      break;
    case '3':
      console.log(style.warning("👋 Terima kasih! Bot dihentikan."));
      process.exit(0);
      break;
    default:
      console.log(style.error("❌ Pilihan tidak valid! Silakan pilih 1, 2, atau 3"));
      setTimeout(() => showMenu(), 2000);
      break;
  }
}

async function WAStart(usePairingCode = false, isAutoConnect = false) {
  try {
    const { state, saveCreds } = await useMultiFileAuthState("./sesi");
    const { version, isLatest } = await fetchLatestWaWebVersion().catch(() => fetchLatestBaileysVersion());

    console.log(style.info(`🔗 Menggunakan WA v${version.join(".")}, isLatest: ${isLatest}`));
    console.log("");

    const client = WAConnect({
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      browser: Browsers.ubuntu("Chrome"),
      auth: state,
    });

    client.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !usePairingCode) {
        console.log(style.warning("📱 QR Code muncul di bawah ini:"));
        console.log("");
        qrcode.generate(qr, { small: true });
        console.log("");
        console.log(style.info("⏳ Scan QR Code di atas dengan WhatsApp Anda..."));
      }

      if (connection === 'open') {
        isConnected = true;
        clearConsole();
        displayHeader();
        console.log(createSuccessBox(client.user.id.split(':')[0]));
        console.log("");
        console.log(ServerInfo.createCompactServerInfo());
        console.log("");
        console.log(style.error("⚠️  JANGAN TUTUP TERMINAL INI!"));
        console.log(style.warning("   Bot akan terus berjalan di background"));
        console.log("");

        // Send bot connected notification
        try {
          const { sendBotConnectedNotification } = require('./CONNECTION/KONEKSI.js');
          setTimeout(() => {
            sendBotConnectedNotification(client);
          }, 3000); // Delay 3 detik untuk memastikan bot fully connected
        } catch (error) {
          // Silent error
        }

            // Initialize AntiTagSW system
            setTimeout(() => {
                initializeAntiTagSW();
            }, 3000);
      }

      if (connection === 'close') {
        isConnected = false;
        const reason = new Boom(lastDisconnect?.error)?.output.statusCode;

        console.log(style.error("❌ Koneksi terputus..."));

        if (reason === DisconnectReason.badSession) {
          console.log(style.error("💥 Session rusak! Membersihkan session..."));
          cleanupSession();
          setTimeout(() => showMenu(), 2000);
        } else if (reason === DisconnectReason.connectionClosed) {
          console.log(style.warning("🔄 Koneksi ditutup, mencoba menyambung kembali..."));
          setTimeout(() => WAStart(usePairingCode, isAutoConnect), 3000);
        } else if (reason === DisconnectReason.connectionLost) {
          console.log(style.warning("📡 Koneksi hilang, mencoba menyambung kembali..."));
          setTimeout(() => WAStart(usePairingCode, isAutoConnect), 3000);
        } else if (reason === DisconnectReason.connectionReplaced) {
          console.log(style.error("🔄 Koneksi digantikan device lain!"));
          console.log(style.warning("⚠️  Maaf, Anda keluar dari perangkat tertautan"));
          cleanupSession();
          setTimeout(() => showMenu(), 2000);
        } else if (reason === DisconnectReason.loggedOut) {
          console.log(style.error("🚪 Logout dari device!"));
          console.log(style.warning("⚠️  Maaf, Anda keluar dari perangkat tertautan"));
          cleanupSession();
          setTimeout(() => showMenu(), 2000);
        } else if (reason === DisconnectReason.restartRequired) {
          console.log(style.warning("🔄 Restart diperlukan..."));
          setTimeout(() => WAStart(usePairingCode, isAutoConnect), 3000);
        } else if (reason === DisconnectReason.timedOut) {
          console.log(style.warning("⏰ Koneksi timeout, mencoba menyambung kembali..."));
          setTimeout(() => WAStart(usePairingCode, isAutoConnect), 5000);
        } else {
          console.log(style.error(`❓ Disconnect reason tidak dikenal: ${reason}|${connection}`));
          // Untuk auto-connect, langsung coba reconnect
          if (isAutoConnect) {
            setTimeout(() => WAStart(usePairingCode, isAutoConnect), 3000);
          } else {
            setTimeout(() => showMenu(), 3000);
          }
        }
      }
    });

    if (usePairingCode && !client.authState.creds.registered) {
      console.log(style.warning("📞 Masukkan nomor WhatsApp Anda:"));
      console.log(style.info("   Format: 6281234567890 (gunakan kode negara)"));
      const phoneNumber = await question(style.menuTitle("Nomor: "));

      console.log("");
      console.log(style.info("⏳ Generating pairing code..."));

      let code = await client.requestPairingCode(phoneNumber);
      code = code?.match(/.{1,4}/g)?.join("-") || code;

      console.log(createPairingCodeBox(code));
      console.log(style.info("⏳ Menunggu konfirmasi..."));
    }

    // Import fungsi auto reaction dari EMOJI/CODE_AUTOREACTION.js
    const { handleAutoReactStatus } = require('./EMOJI/CODE_AUTOREACTION.js');

    // Import fungsi command handler dari Wilykun.js
    const { handleCommand } = require('./Wilykun.js');

    // Import dan setup auto features dari WILY_KUN
    const { setupAutoFeatures } = require('./WILY_KUN/index.js');
    setupAutoFeatures(client);

    // Setup command autoantidelete langsung
    const { setupAutoAntiDeleteCommand } = require('./WILY_KUN/OWNER/autoantidelete.js');
    setupAutoAntiDeleteCommand(client);

    // Setup anticall feature
    const { setupAnticall } = require('./WILY_KUN/OWNER/anticall.js');
    setupAnticall(client);

    // Import initializeAntiTagSW function
    const { initializeAntiTagSW } = require('./WILY_KUN/antitagsw.js');

    // Setup global error handler untuk skip error
    const { setupGlobalErrorHandler } = require('./WILY_KUN/OWNER/skiperror.js');
    setupGlobalErrorHandler();



    // Setup command pixiv SFW dan pixiv18
    const { handlePixivCommand: handlePixivSfwCommand } = require('./WILY_KUN/pixiv.js');
    const { handlePixivCommand: handlePixiv18Command } = require('./WILY_KUN/pixiv18.js');

    // Periodic config check untuk auto features yang real-time
    setInterval(() => {
      try {
        // Safe config loading dengan fallback
        let config;
        try {
          // Clear require cache to ensure fresh config
          delete require.cache[require.resolve('./config.json')];
          config = require('./config.json');

          // Ensure autoFeatures exists
          if (!config.autoFeatures) {
            config.autoFeatures = { online: false };
          }
        } catch (configError) {
          config = {
            autoFeatures: { online: false }
          };
        }

        // Force update presence jika auto online dimatikan
        if (!config?.autoFeatures?.online) {
          client.sendPresenceUpdate('unavailable').catch(() => {});
        }
      } catch (error) {
        // Silent error
      }
    }, 10000); // Check every 10 seconds

    // Event handler untuk group participants update (join/leave)
    client.ev.on("group-participants.update", async (notification) => {
      try {
        // Handle welcome message untuk member baru
        if (notification.action === 'add' || notification.action === 'invite') {
            const { welcomeHandler } = require('./WILY_KUN/WELCOME_DAN_GOODBYE/welcome.js');
            await welcomeHandler(client, notification);
        }

        // Handle goodbye message untuk member yang keluar/dikick
        if (notification.action === 'remove') {
            const { goodbyeHandler } = require('./WILY_KUN/WELCOME_DAN_GOODBYE/goodbye.js');
            await goodbyeHandler(client, notification);
        }
      } catch (err) {
        // Silent error untuk welcome handler
      }
    });

    // Event handler untuk pesan dengan sistem auto reaction dan command
    client.ev.on("messages.upsert", async (chatUpdate) => {
      const { executeWithSkipError } = require('./WILY_KUN/OWNER/skiperror.js');
      
      await executeWithSkipError(async () => {
        const m = chatUpdate.messages[0];
        if (!m.message) return;

        // Tangani pesan status untuk auto reaction dan auto download
        if (m.key && !m.key.fromMe && m.key.remoteJid === 'status@broadcast') {
          await handleAutoReactStatus(client, m);

          // Auto download story jika diaktifkan
          const { handleAutoDownloadStory } = require('./WILY_KUN/OWNER/AutoUnduhStory.js');
          await handleAutoDownloadStory(client, m);
        }

        // Handle command dari pesan biasa (bukan status)
        if (m.key && m.key.remoteJid !== 'status@broadcast') {
          // Handle Anti Tag Status WhatsApp detection first
          try {
            const { handleAntiTagSWDetection } = require('./WILY_KUN/antitagsw.js');
            await handleAntiTagSWDetection(client, m, require('./config.json'));
          } catch (error) {
            // Silent error untuk anti tag SW detection
          }
          // Check for clearsesi command first (highest priority)
          const { handleClearSession } = require('./WILY_KUN/OWNER/Clearsesi.js');
          const clearSessionHandled = await handleClearSession(client, m);

          if (clearSessionHandled) {
            return; // Stop processing if clearsesi was handled
          }

          // Check for pixiv commands next
          const messageText = m.message?.conversation || 
                            m.message?.extendedTextMessage?.text || '';

          if (messageText) {
            // Load config with proper error handling
            let config;
            try {
              // Clear require cache for fresh config
              delete require.cache[require.resolve('./config.json')];
              config = require('./config.json');

              // Comprehensive validation
              if (!config) {
                throw new Error('Config is null or undefined');
              }

              if (!config.bot) {
                config.bot = { prefix: '.', mode: 'public', owner: '', botNumber: '' };
              }

              // Ensure all bot properties exist
              config.bot.prefix = config.bot.prefix || '.';
              config.bot.mode = config.bot.mode || 'public';
              config.bot.owner = config.bot.owner || '';
              config.bot.botNumber = config.bot.botNumber || '';

            } catch (error) {
              // Fallback config if loading fails
              config = {
                bot: { prefix: '.', mode: 'public', owner: '', botNumber: '' }
              };
            }
            const prefix = config.bot?.prefix || '.';

            // Handle pixiv18 command first (more specific)
            if (messageText.startsWith(`${prefix}pixiv18`)) {
              await handlePixiv18Command(client, m);
              return; // Stop processing other commands
            }

            // Handle pixiv SFW command (less specific, so check after pixiv18)
            if (messageText.startsWith(`${prefix}pixiv`) && !messageText.startsWith(`${prefix}pixiv18`)) {
              await handlePixivSfwCommand(client, m);
              return; // Stop processing other commands
            }

            // Handle next command for both pixiv types
            if (messageText.toLowerCase().trim() === 'next') {
              const cacheKey = m.key.remoteJid;

              // Check both caches and use the more recent one
              const pixiv18Cache = require('./WILY_KUN/pixiv18.js').pixivSearchCache?.get?.(cacheKey);
              const pixivSfwCache = require('./WILY_KUN/pixiv.js').pixivSfwSearchCache?.get?.(cacheKey);

              if (pixiv18Cache && pixivSfwCache) {
                // Use the more recent cache
                if (pixiv18Cache.timestamp > pixivSfwCache.timestamp) {
                  await handlePixiv18Command(client, m);
                } else {
                  await handlePixivSfwCommand(client, m);
                }
                return;
              } else if (pixiv18Cache) {
                await handlePixiv18Command(client, m);
                return;
              } else if (pixivSfwCache) {
                await handlePixivSfwCommand(client, m);
                return;
              }
            }
          }

          // Handle other commands
          await handleCommand(client, m);
        }
      });
    });

    client.ev.on("creds.update", saveCreds);

    return client;
  } catch (error) {
    console.log(style.error("❌ Error saat inisialisasi:"), error);
    setTimeout(() => showMenu(), 3000);
  }
}

// Mulai aplikasi dengan security check
async function startApp() {
  console.log(style.info("🔐 Memulai security check..."));
  console.log("");

  try {
    // Cek password terlebih dahulu
    const isPasswordValid = await checkPassword();

    if (isPasswordValid) {
      console.log(style.success("🚀 Security check berhasil! Memulai bot..."));
      console.log("");

      // Mulai password monitor
      startPasswordMonitor();

      // Lanjutkan ke menu utama
      showMenu();
    }
  } catch (error) {
    console.log(style.error("❌ Security check gagal:"), error.message);
    process.exit(1);
  }
}

startApp();