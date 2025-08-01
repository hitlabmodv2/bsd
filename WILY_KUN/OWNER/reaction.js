
import fs from 'fs';
import { Wily } from '../../CODE_REPLY/reply.js';
import { 
    getAsiaJakartaTime, 
    getJakartaTimeString, 
    getSelamat, 
    getHari, 
    getTanggal, 
    getBulan, 
    getTahun, 
    getWaktu 
} from '../../lib/CodeAsiaJakarta.js';

class AutoReaction {
  constructor() {
    this.maxTime = 5 * 60 * 1000; // 5 minutes
    this.allowedSenders = [
      "6281447345627@s.whatsapp.net",
      "628145563553@s.whatsapp.net",
    ];
    this.botStartTime = Date.now(); // Waktu bot start
  }

  // Fungsi untuk membaca emoji dari file JSON
  getEmojiList() {
    try {
      const config = this.readConfig();

      // Cek apakah ada kategori aktif yang dipilih
      if (config.reaction.emojiSettings && config.reaction.emojiSettings.activeCategory) {
        const activeCategoryPath = `./WILY_KUN/LIST_EMOJI/${config.reaction.emojiSettings.activeCategory}`;
        if (fs.existsSync(activeCategoryPath)) {
          const emojiData = JSON.parse(fs.readFileSync(activeCategoryPath, 'utf8'));
          if (emojiData.reactionEmojis && emojiData.reactionEmojis.length > 0) {
            return emojiData.reactionEmojis;
          }
        }
      }

      // Fallback ke KUMPULAN_EMOT.json
      const emojiPath = './WILY_KUN/LIST_EMOJI/KUMPULAN_EMOT.json';
      if (fs.existsSync(emojiPath)) {
        const emojiData = JSON.parse(fs.readFileSync(emojiPath, 'utf8'));
        return emojiData.reactionEmojis || ["❤️", "😍", "🔥", "👍", "😊", "🎉"];
      }
      // Fallback emoji jika file tidak ada
      return ["❤️", "😍", "🔥", "👍", "😊", "🎉"];
    } catch (error) {
      // Fallback emoji jika error
      return ["❤️", "😍", "🔥", "👍", "😊", "🎉"];
    }
  }

  // Fungsi untuk mendapatkan daftar semua kategori emoji
  getEmojiCategories() {
    const emojiDir = './WILY_KUN/LIST_EMOJI/';
    const categories = [];

    try {
      if (!fs.existsSync(emojiDir)) {
        return [{
          fileName: 'KUMPULAN_EMOT.json',
          categoryName: 'Default Emoji Collection',
          emojiCount: 6
        }];
      }

      const files = fs.readdirSync(emojiDir);

      files.forEach(file => {
        if (file.endsWith('.json')) {
          try {
            const filePath = `${emojiDir}${file}`;
            const emojiData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            let categoryName = file.replace('.json', '').replace(/_/g, ' ');
            let emojiCount = 0;

            // Cek struktur file untuk mendapatkan nama kategori dan jumlah emoji
            if (emojiData.categoryName) {
              categoryName = emojiData.categoryName;
            }

            if (emojiData.reactionEmojis && Array.isArray(emojiData.reactionEmojis)) {
              emojiCount = emojiData.reactionEmojis.length;
            } else if (emojiData.categories) {
              // Untuk file ALL_CATEGORIES.json
              emojiCount = Object.values(emojiData.categories).reduce((total, cat) => {
                return total + (Array.isArray(cat) ? cat.length : 0);
              }, 0);
            }

            categories.push({
              fileName: file,
              categoryName: categoryName,
              emojiCount: emojiCount
            });
          } catch (error) {
            // Skip file yang error
          }
        }
      });

      // Sort berdasarkan nama file
      categories.sort((a, b) => a.fileName.localeCompare(b.fileName));

      return categories.length > 0 ? categories : [{
        fileName: 'KUMPULAN_EMOT.json',
        categoryName: 'Default Emoji Collection',
        emojiCount: 6
      }];

    } catch (error) {
      return [{
        fileName: 'KUMPULAN_EMOT.json',
        categoryName: 'Default Emoji Collection',
        emojiCount: 6
      }];
    }
  }

  // Fungsi untuk membaca config
  readConfig() {
    try {
      if (!fs.existsSync('./config.json')) {
        const defaultConfig = {
          "OWNER": ["6289681008411"],
          "SELF": true,
          "mode": "self",
          "packName": "Sticker Dibuat Oleh : Wily",
          "packPublish": "Dika Ardnt.",
          "SESSION_NAME": "sesi",
          "reaction": {
            "enabled": true,
            "mode": "on",
            "delay": 10
          }
        };
        fs.writeFileSync('./config.json', JSON.stringify(defaultConfig, null, 2));
        return defaultConfig;
      }
      const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

      // Tambahkan default reaction config jika belum ada
      if (!config.reaction) {
        config.reaction = {
          "enabled": true,
          "mode": "on",
          "delay": 1
        };
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
      }

      return config;
    } catch (error) {
      return {
        "OWNER": ["6289681008411"],
        "SELF": true,
        "mode": "self",
        "packName": "Sticker Dibuat Oleh : Wily",
        "packPublish": "Dika Ardnt.",
        "SESSION_NAME": "sesi",
        "reaction": {
          "enabled": true,
          "mode": "on",
          "delay": 10
        }
      };
    }
  }

  // Fungsi untuk menyimpan config
  saveConfig(config) {
    try {
      fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
      return true;
    } catch (error) {
      return false;
    }
  }

  // Fungsi untuk cek apakah user adalah owner
  isOwner(senderNumber, config) {
    return config.OWNER.includes(senderNumber);
  }

  // Fungsi untuk handle reply message untuk kategori emoji
  async handleReplyEmojiSelection(m, { hisoka }) {
    try {
      const config = this.readConfig();

      // Cek apakah user adalah owner
      let senderNumber = '';
      if (m.sender) {
        senderNumber = m.sender.split('@')[0];
      } else if (m.key?.participant) {
        senderNumber = m.key.participant.split('@')[0];
      } else if (m.key?.remoteJid && !m.key.remoteJid.includes('@g.us')) {
        senderNumber = m.key.remoteJid.split('@')[0];
      }

      if (!this.isOwner(senderNumber, config)) {
        return false;
      }

      // Cek apakah ini reply ke pesan bot tentang emoji categories
      const quotedMessage = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || 
                           m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text || '';

      if (quotedMessage.includes('DAFTAR KATEGORI EMOJI TERSEDIA') || quotedMessage.includes('📂')) {
        const userInput = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
        const categoryIndex = parseInt(userInput.trim());

        if (!isNaN(categoryIndex) && categoryIndex > 0) {
          const emojiCategories = this.getEmojiCategories();

          if (categoryIndex >= 1 && categoryIndex <= emojiCategories.length) {
            const selectedCategory = emojiCategories[categoryIndex - 1];

            // Simpan kategori yang dipilih ke config
            if (!config.reaction.emojiSettings) {
              config.reaction.emojiSettings = {};
            }
            config.reaction.emojiSettings.activeCategory = selectedCategory.fileName;
            config.reaction.emojiSettings.categoryName = selectedCategory.categoryName;
            config.reaction.emojiSettings.emojiCount = selectedCategory.emojiCount;
            config.reaction.emojiSettings.lastUpdated = new Date().toLocaleString('id-ID');

            if (this.saveConfig(config)) {
              await Wily(`✅ *KATEGORI EMOJI BERHASIL DISET VIA REPLY*

🎯 *KATEGORI TERPILIH:*
━━━━━━━━━━━━━━━━━━━
📁 Folder: *${selectedCategory.fileName}*
🏷️ Nama: *${selectedCategory.categoryName}*
🎭 Jumlah Emoji: *${selectedCategory.emojiCount} emoji*
📅 Diupdate: *${config.reaction.emojiSettings.lastUpdated}*

📋 *BERHASIL:*
━━━━━━━━━━━━━━━━━━━
• Kategori emoji berhasil diset via reply
• Bot akan menggunakan emoji dari kategori ini
• Pengaturan tersimpan otomatis ke config.json

💾 *Data tersimpan ke config.json dengan aman*
🎉 *Bot siap menggunakan emoji kategori baru!*`, m, hisoka);
              return true; // Berhasil handle reply
            } else {
              await Wily('❌ *ERROR:* Gagal menyimpan pengaturan emoji ke config.json', m, hisoka);
              return true; // Sudah handle reply meski error
            }
          } else {
            await Wily(`❌ *NOMOR KATEGORI TIDAK VALID*

📏 *Range tersedia:* 1-${emojiCategories.length}
💡 *Coba lagi dengan nomor yang valid*`, m, hisoka);
            return true; // Sudah handle reply
          }
        }
      }

      return false; // Bukan reply untuk emoji selection
    } catch (error) {
      return false;
    }
  }

  // Fungsi untuk handle command .reaction
  async handleReactionCommand(m, { hisoka, text, command }) {
    try {
      // Cek dulu apakah ini reply untuk emoji selection
      const isReplyHandled = await this.handleReplyEmojiSelection(m, { hisoka });
      if (isReplyHandled) {
        return; // Sudah di-handle sebagai reply
      }

      const config = this.readConfig();

      // Ekstraksi sender number yang lebih baik
      let senderNumber = '';
      const isFromMe = m.key?.fromMe === true;

      if (isFromMe) {
        // Pesan dari bot sendiri, ambil nomor bot dari creds
        try {
          if (fs.existsSync('./sesi/creds.json')) {
            const creds = JSON.parse(fs.readFileSync('./sesi/creds.json', 'utf8'));
            if (creds.me?.id) {
              senderNumber = creds.me.id.split(':')[0];
            }
          }
          if (!senderNumber) {
            senderNumber = config.OWNER[0] || "6289681008411";
          }
        } catch (error) {
          senderNumber = config.OWNER[0] || "6289681008411";
        }
      } else if (m.sender) {
        senderNumber = m.sender.split('@')[0];
      } else if (m.key?.participant) {
        senderNumber = m.key.participant.split('@')[0];
      } else if (m.key?.remoteJid && !m.key.remoteJid.includes('@g.us')) {
        senderNumber = m.key.remoteJid.split('@')[0];
      }

      // Pastikan senderNumber valid
      if (!senderNumber || senderNumber === 'undefined' || senderNumber === '') {
        return;
      }

      // Cek owner dengan akurasi tinggi
      if (!this.isOwner(senderNumber, config)) {
        // Mode self: tidak respon sama sekali untuk non-owner
        if (config.SELF || config.mode === 'self') {
          return; // Silent ignore untuk mode self
        }
        
        // Mode public: beri respon akses ditolak untuk non-owner
        if (!config.SELF || config.mode === 'public') {
          await Wily('🚫 *Akses Ditolak!*\n\n🔒 Fitur ini khusus untuk Owner Bot\n💡 Hanya Owner yang dapat menggunakan reaction control\n⚙️ Hubungi Owner untuk bantuan', m, hisoka);
        }
        return;
      }

      const args = text ? text.trim().split(' ') : [];
      const subCommand = args[0]?.toLowerCase();

      // Jika tidak ada argument, tampilkan status
      if (!subCommand) {
        const reactionConfig = config.reaction;
        const statusEmoji = reactionConfig.enabled ? '✅' : '❌';
        const modeText = reactionConfig.mode === 'on' ? 'SELALU REAKSI' : 
                        reactionConfig.mode === 'off' ? 'TANPA REAKSI' : 'RANDOM REAKSI';

        const delayText = reactionConfig.delay === 'random' ? 'RANDOM (1-10 detik)' : `${reactionConfig.delay} detik`;
        const emojiCount = this.getEmojiList().length;
        
        await Wily(`⚡ *AUTO REACTION CONTROL PANEL*

🎯 *STATUS SAAT INI:*
━━━━━━━━━━━━━━━━━━━
${statusEmoji} Sistem: *${reactionConfig.enabled ? 'AKTIF' : 'NONAKTIF'}*
🎭 Mode: *${modeText}*
⏱️ Kecepatan: *${delayText}*
🎯 Emoji Pool: *${emojiCount} emoji tersedia*

📋 *PANDUAN COMMAND:*
━━━━━━━━━━━━━━━━━━━
• \`.reaction delay [1-10]\` - Atur kecepatan auto read
• \`.reaction delay random\` - Atur delay random 1-10 detik
• \`.reaction on\` - Mode selalu kasih reaksi
• \`.reaction off\` - Mode silent reader (tanpa reaksi)
• \`.reaction random\` - Mode unpredictable (50% chance)
• \`.reaction set\` - Lihat & pilih kategori emoji
• \`.reaction matikan\` - Matikan sistem reaction sepenuhnya

💡 *TIPS PENGGUNAAN:*
━━━━━━━━━━━━━━━━━━━
• Delay 1-3 detik: Cepat tapi terlihat bot
• Delay 5-7 detik: Seimbang dan natural
• Delay 8-10 detik: Lambat tapi sangat human-like
• Delay random: Unpredictable dan sangat natural

💾 *Semua pengaturan tersimpan otomatis ke config.json*`, m, hisoka);
        return;
      }

      // Handle sub commands
      switch (subCommand) {
        case 'delay':
          const delayArg = args[1];

          // Cek apakah ada argument
          if (!delayArg) {
            await Wily(`❌ *ARGUMENT DELAY TIDAK DITEMUKAN*

📋 *FORMAT COMMAND YANG BENAR:*
━━━━━━━━━━━━━━━━━━━
• \`.reaction delay [1-10]\` - Set delay angka
• \`.reaction delay random\` - Set delay random

📝 *CONTOH PENGGUNAAN:*
━━━━━━━━━━━━━━━━━━━
• \`.reaction delay 3\` - Set delay 3 detik
• \`.reaction delay 7\` - Set delay 7 detik
• \`.reaction delay random\` - Set delay random 1-10 detik

⚠️ *KESALAHAN YANG SERING TERJADI:*
━━━━━━━━━━━━━━━━━━━
❌ \`.reaction delay\` - Tanpa argument
❌ \`.reaction delay abc\` - Menggunakan huruf
❌ \`.reaction delay 15\` - Melebihi range
❌ \`.reaction delay random abc\` - Menambah text setelah random

💡 Gunakan \`.reaction\` untuk melihat status saat ini`, m, hisoka);
            return;
          }

          // Handle delay random
          if (delayArg.toLowerCase() === 'random') {
            // Cek apakah ada argument tambahan setelah 'random'
            if (args[2]) {
              await Wily(`❌ *COMMAND DELAY RANDOM TIDAK VALID*

🚫 *KESALAHAN TERDETEKSI:*
━━━━━━━━━━━━━━━━━━━
Input: \`.reaction delay random ${args.slice(2).join(' ')}\`
Error: *Tidak boleh ada text setelah 'random'*

✅ *FORMAT YANG BENAR:*
━━━━━━━━━━━━━━━━━━━
• \`.reaction delay random\` - Tanpa tambahan apapun

📝 *CONTOH BENAR vs SALAH:*
━━━━━━━━━━━━━━━━━━━
✅ \`.reaction delay random\`
❌ \`.reaction delay random 5\`
❌ \`.reaction delay random on\`
❌ \`.reaction delay random jawjda\`

💡 Command 'random' tidak memerlukan parameter tambahan`, m, hisoka);
              return;
            }

            config.reaction.delay = 'random';
            if (this.saveConfig(config)) {
              await Wily(`🎲 *DELAY RANDOM BERHASIL DIAKTIFKAN*

🎯 *PENGATURAN BARU:*
━━━━━━━━━━━━━━━━━━━
🎲 Kecepatan: *RANDOM (1-10 detik)*
📊 Kategori: *UNPREDICTABLE*
🎭 Mode: *${config.reaction.mode.toUpperCase()}*

📋 *CARA KERJA DELAY RANDOM:*
━━━━━━━━━━━━━━━━━━━
• Setiap story akan menggunakan delay acak 1-10 detik
• Delay berubah otomatis untuk setiap story baru
• Behavior sangat natural seperti manusia
• Tidak ada pola yang bisa diprediksi

🎯 *KEUNTUNGAN DELAY RANDOM:*
━━━━━━━━━━━━━━━━━━━
✅ Sangat natural dan human-like
✅ Tidak ada pola yang terdeteksi
✅ Variasi waktu membaca story
✅ Behavior unpredictable
✅ Keamanan maksimal dari deteksi

💾 *Pengaturan tersimpan ke config.json*
🚀 *Bot siap dengan delay random yang natural!*`, m, hisoka);
            } else {
              await Wily('❌ *ERROR:* Gagal menyimpan pengaturan delay random ke config.json', m, hisoka);
            }
            return;
          }

          // Cek apakah argument adalah angka
          const delayValue = parseInt(delayArg);
          if (isNaN(delayValue)) {
            await Wily(`❌ *ARGUMENT DELAY HARUS BERUPA ANGKA*

🚫 *KESALAHAN TERDETEKSI:*
━━━━━━━━━━━━━━━━━━━
Input: \`.reaction delay ${delayArg}\`
Error: *'${delayArg}' bukan angka yang valid*

✅ *FORMAT YANG BENAR:*
━━━━━━━━━━━━━━━━━━━
• \`.reaction delay [1-10]\` - Gunakan angka 1 sampai 10
• \`.reaction delay random\` - Atau gunakan kata 'random'

📝 *CONTOH BENAR vs SALAH:*
━━━━━━━━━━━━━━━━━━━
✅ \`.reaction delay 5\`
✅ \`.reaction delay random\`
❌ \`.reaction delay abc\`
❌ \`.reaction delay lima\`
❌ \`.reaction delay ${delayArg}\`

💡 Hanya angka 1-10 atau kata 'random' yang diizinkan`, m, hisoka);
            return;
          }

          // Cek apakah ada argument tambahan setelah angka
          if (args[2]) {
            await Wily(`❌ *TERLALU BANYAK ARGUMENT UNTUK DELAY*

🚫 *KESALAHAN TERDETEKSI:*
━━━━━━━━━━━━━━━━━━━
Input: \`.reaction delay ${args.slice(1).join(' ')}\`
Error: *Tidak boleh ada text setelah angka delay*

✅ *FORMAT YANG BENAR:*
━━━━━━━━━━━━━━━━━━━
• \`.reaction delay ${delayValue}\` - Tanpa tambahan apapun

📝 *CONTOH BENAR vs SALAH:*
━━━━━━━━━━━━━━━━━━━
✅ \`.reaction delay ${delayValue}\`
❌ \`.reaction delay ${delayValue} ${args.slice(2).join(' ')}\`
❌ \`.reaction delay ${delayValue} detik\`
❌ \`.reaction delay ${delayValue} on\`

💡 Cukup tulis angka saja, tanpa tambahan kata`, m, hisoka);
            return;
          }

          if (delayValue < 1 || delayValue > 10) {
            await Wily(`❌ *DELAY DILUAR RANGE YANG DIIZINKAN*

🚫 *KESALAHAN TERDETEKSI:*
━━━━━━━━━━━━━━━━━━━
Input: \`.reaction delay ${delayValue}\`
Error: *Angka ${delayValue} diluar range 1-10*

📏 *RANGE YANG DIIZINKAN:* 1-10 detik

📋 *CONTOH PENGGUNAAN YANG BENAR:*
━━━━━━━━━━━━━━━━━━━
• \`.reaction delay 1\` - Delay 1 detik (sangat cepat)
• \`.reaction delay 5\` - Delay 5 detik (recommended)
• \`.reaction delay 10\` - Delay 10 detik (lambat & natural)
• \`.reaction delay random\` - Delay random 1-10 detik

💡 *REKOMENDASI DELAY:*
━━━━━━━━━━━━━━━━━━━
• 1-3 detik: Sangat cepat (terlihat bot)
• 4-6 detik: Kecepatan normal (recommended)
• 7-10 detik: Lambat tapi natural (human-like)
• random: Unpredictable dan sangat natural`, m, hisoka);
            return;
          }

          config.reaction.delay = delayValue;
          if (this.saveConfig(config)) {
            let speedCategory = '';
            let speedEmoji = '';

            if (delayValue <= 3) {
              speedCategory = 'SANGAT CEPAT';
              speedEmoji = '🚀';
            } else if (delayValue <= 6) {
              speedCategory = 'KECEPATAN NORMAL';
              speedEmoji = '⚡';
            } else {
              speedCategory = 'LAMBAT & NATURAL';
              speedEmoji = '🐌';
            }

            await Wily(`⏱️ *DELAY BERHASIL DIUPDATE*

🎯 *PENGATURAN BARU:*
━━━━━━━━━━━━━━━━━━━
${speedEmoji} Kecepatan: *${delayValue} detik*
📊 Kategori: *${speedCategory}*
🎭 Mode: *${config.reaction.mode.toUpperCase()}*

📋 *DAMPAK PERUBAHAN:*
━━━━━━━━━━━━━━━━━━━
• Bot akan delay ${delayValue} detik sebelum baca story
• Semakin kecil delay = semakin cepat respon
• Semakin besar delay = semakin natural behavior

💾 *Pengaturan tersimpan ke config.json*
✅ *Siap digunakan dengan kecepatan baru!*`, m, hisoka);
          } else {
            await Wily('❌ *ERROR:* Gagal menyimpan pengaturan delay ke config.json', m, hisoka);
          }
          break;

        case 'on':
          // Cek apakah ada argument tambahan
          if (args[1]) {
            await Wily(`❌ *COMMAND ON TIDAK MEMERLUKAN ARGUMENT*

🚫 *KESALAHAN TERDETEKSI:*
━━━━━━━━━━━━━━━━━━━
Input: \`.reaction on ${args.slice(1).join(' ')}\`
Error: *Command 'on' tidak memerlukan parameter tambahan*

✅ *FORMAT YANG BENAR:*
━━━━━━━━━━━━━━━━━━━
• \`.reaction on\` - Tanpa tambahan apapun

📝 *CONTOH BENAR vs SALAH:*
━━━━━━━━━━━━━━━━━━━
✅ \`.reaction on\`
❌ \`.reaction on mode\`
❌ \`.reaction on ${args.slice(1).join(' ')}\`

💡 Cukup ketik \`.reaction on\` saja`, m, hisoka);
            return;
          }

          // Cek apakah mode sudah 'on'
          if (config.reaction.enabled && config.reaction.mode === 'on') {
            await Wily(`ℹ️ *FITUR SUDAH DALAM KEADAAN ON*

🎯 *STATUS SAAT INI:*
━━━━━━━━━━━━━━━━━━━
🔥 Mode: *SELALU REAKSI* (sudah aktif)
⚡ Status: *AKTIF*
⏱️ Kecepatan: *${config.reaction.delay} detik*
🎭 Emoji: *Random dari 18 emoji*

📋 *INFORMASI:*
━━━━━━━━━━━━━━━━━━━
• Fitur reaction sudah dalam mode ON
• Bot sudah memberikan reaksi pada semua story
• Tidak perlu mengaktifkan lagi

💡 *SARAN:*
• Gunakan \`.reaction off\` untuk mode silent
• Gunakan \`.reaction random\` untuk mode acak
• Gunakan \`.reaction delay [1-10]\` untuk ubah kecepatan`, m, hisoka);
            return;
          }

          config.reaction.enabled = true;
          config.reaction.mode = 'on';
          if (this.saveConfig(config)) {
            await Wily(`✅ *REACTION MODE BERHASIL DIAKTIFKAN*

🎯 *STATUS FITUR:*
━━━━━━━━━━━━━━━━━━━
🔥 Mode: *SELALU REAKSI* 
⚡ Status: *AKTIF*
⏱️ Kecepatan: *${config.reaction.delay} detik*
🎭 Emoji: *Random dari 18 emoji*

📋 *CARA KERJA:*
━━━━━━━━━━━━━━━━━━━
• Bot akan otomatis melihat semua story WhatsApp
• Setiap story akan diberi reaksi emoji random
• Proses berjalan otomatis tanpa interaksi manual
• Delay ${config.reaction.delay} detik untuk natural behavior

💾 *Pengaturan tersimpan ke config.json*
🚀 *Bot siap memberikan reaksi pada semua story!*`, m, hisoka);
          } else {
            await Wily('❌ *ERROR:* Gagal menyimpan pengaturan ke config.json', m, hisoka);
          }
          break;

        case 'off':
          // Cek apakah ada argument tambahan
          if (args[1]) {
            await Wily(`❌ *COMMAND OFF TIDAK MEMERLUKAN ARGUMENT*

🚫 *KESALAHAN TERDETEKSI:*
━━━━━━━━━━━━━━━━━━━
Input: \`.reaction off ${args.slice(1).join(' ')}\`
Error: *Command 'off' tidak memerlukan parameter tambahan*

✅ *FORMAT YANG BENAR:*
━━━━━━━━━━━━━━━━━━━
• \`.reaction off\` - Tanpa tambahan apapun

📝 *CONTOH BENAR vs SALAH:*
━━━━━━━━━━━━━━━━━━━
✅ \`.reaction off\`
❌ \`.reaction off mode\`
❌ \`.reaction off ${args.slice(1).join(' ')}\`

💡 Cukup ketik \`.reaction off\` saja`, m, hisoka);
            return;
          }

          // Cek apakah mode sudah 'off'
          if (config.reaction.enabled && config.reaction.mode === 'off') {
            await Wily(`ℹ️ *FITUR SUDAH DALAM KEADAAN OFF*

🎯 *STATUS SAAT INI:*
━━━━━━━━━━━━━━━━━━━
📖 Mode: *TANPA REAKSI* (sudah aktif)
⚡ Status: *AKTIF (Silent Reader)*
⏱️ Kecepatan: *${config.reaction.delay} detik*
🥷 Emoji: *Tidak ada reaksi*

📋 *INFORMASI:*
━━━━━━━━━━━━━━━━━━━
• Fitur reaction sudah dalam mode OFF
• Bot sudah dalam mode silent reader
• Hanya membaca story tanpa reaksi

💡 *SARAN:*
• Gunakan \`.reaction on\` untuk mode selalu reaksi
• Gunakan \`.reaction random\` untuk mode acak
• Gunakan \`.reaction delay [1-10]\` untuk ubah kecepatan`, m, hisoka);
            return;
          }

          config.reaction.enabled = true;
          config.reaction.mode = 'off';
          if (this.saveConfig(config)) {
            await Wily(`👀 *REACTION MODE DIMATIKAN*

🎯 *STATUS FITUR:*
━━━━━━━━━━━━━━━━━━━
📖 Mode: *TANPA REAKSI*
⚡ Status: *AKTIF (Silent Reader)*
⏱️ Kecepatan: *${config.reaction.delay} detik*
🥷 Emoji: *Tidak ada reaksi*

📋 *CARA KERJA:*
━━━━━━━━━━━━━━━━━━━
• Bot akan otomatis melihat semua story WhatsApp
• Story hanya dibaca tanpa memberikan reaksi
• Mode invisible/ghost reader
• Delay ${config.reaction.delay} detik untuk natural behavior

💾 *Pengaturan tersimpan ke config.json*
🤫 *Mode silent reader aktif - tidak ketahuan melihat story!*`, m, hisoka);
          } else {
            await Wily('❌ *ERROR:* Gagal menyimpan pengaturan ke config.json', m, hisoka);
          }
          break;

        case 'random':
          // Cek apakah ada argument tambahan
          if (args[1]) {
            await Wily(`❌ *COMMAND RANDOM TIDAK MEMERLUKAN ARGUMENT*

🚫 *KESALAHAN TERDETEKSI:*
━━━━━━━━━━━━━━━━━━━
Input: \`.reaction random ${args.slice(1).join(' ')}\`
Error: *Command 'random' tidak memerlukan parameter tambahan*

✅ *FORMAT YANG BENAR:*
━━━━━━━━━━━━━━━━━━━
• \`.reaction random\` - Tanpa tambahan apapun

📝 *CONTOH BENAR vs SALAH:*
━━━━━━━━━━━━━━━━━━━
✅ \`.reaction random\`
❌ \`.reaction random mode\`
❌ \`.reaction random ${args.slice(1).join(' ')}\`

💡 Cukup ketik \`.reaction random\` saja`, m, hisoka);
            return;
          }

          // Cek apakah mode sudah 'random'
          if (config.reaction.enabled && config.reaction.mode === 'random') {
            await Wily(`ℹ️ *FITUR SUDAH DALAM KEADAAN RANDOM*

🎯 *STATUS SAAT INI:*
━━━━━━━━━━━━━━━━━━━
🎭 Mode: *RANDOM REAKSI* (sudah aktif)
⚡ Status: *AKTIF*
⏱️ Kecepatan: *${config.reaction.delay} detik*
🎯 Probabilitas: *50% chance reaksi*

📋 *INFORMASI:*
━━━━━━━━━━━━━━━━━━━
• Fitur reaction sudah dalam mode RANDOM
• Bot sudah menggunakan sistem acak 50/50
• Behavior unpredictable seperti manusia

💡 *SARAN:*
• Gunakan \`.reaction on\` untuk mode selalu reaksi
• Gunakan \`.reaction off\` untuk mode silent
• Gunakan \`.reaction delay [1-10]\` untuk ubah kecepatan`, m, hisoka);
            return;
          }

          config.reaction.enabled = true;
          config.reaction.mode = 'random';
          if (this.saveConfig(config)) {
            await Wily(`🎲 *REACTION MODE RANDOM AKTIF*

🎯 *STATUS FITUR:*
━━━━━━━━━━━━━━━━━━━
🎭 Mode: *RANDOM REAKSI*
⚡ Status: *AKTIF*
⏱️ Kecepatan: *${config.reaction.delay} detik*
🎯 Probabilitas: *50% chance reaksi*

📋 *CARA KERJA:*
━━━━━━━━━━━━━━━━━━━
• Bot akan otomatis melihat semua story WhatsApp
• 50% kemungkinan memberikan reaksi emoji random
• 50% kemungkinan hanya melihat tanpa reaksi
• Behavior tidak predictable seperti manusia asli
• Delay ${config.reaction.delay} detik untuk natural behavior

💾 *Pengaturan tersimpan ke config.json*
🤖 *Mode unpredictable aktif - seperti behavior manusia!*`, m, hisoka);
          } else {
            await Wily('❌ *ERROR:* Gagal menyimpan pengaturan ke config.json', m, hisoka);
          }
          break;

        case 'set':
          const setArg = args[1];

          // Jika ada argument angka, set kategori emoji aktif
          if (setArg && !isNaN(parseInt(setArg))) {
            const categoryIndex = parseInt(setArg);
            const emojiCategories = this.getEmojiCategories();

            if (categoryIndex < 1 || categoryIndex > emojiCategories.length) {
              await Wily(`❌ *NOMOR KATEGORI TIDAK VALID*

📏 *RANGE YANG TERSEDIA:* 1-${emojiCategories.length}

📋 *CONTOH PENGGUNAAN:*
• \`.reaction set 1\` - Set ke kategori pertama
• \`.reaction set 3\` - Set ke kategori ketiga

💡 Gunakan \`.reaction set\` untuk melihat daftar kategori`, m, hisoka);
              return;
            }

            const selectedCategory = emojiCategories[categoryIndex - 1];

            // Simpan kategori yang dipilih ke config
            if (!config.reaction.emojiSettings) {
              config.reaction.emojiSettings = {};
            }
            config.reaction.emojiSettings.activeCategory = selectedCategory.fileName;
            config.reaction.emojiSettings.categoryName = selectedCategory.categoryName;
            config.reaction.emojiSettings.emojiCount = selectedCategory.emojiCount;
            config.reaction.emojiSettings.lastUpdated = new Date().toLocaleString('id-ID');

            if (this.saveConfig(config)) {
              await Wily(`✅ *KATEGORI EMOJI BERHASIL DISET*

🎯 *KATEGORI AKTIF:*
━━━━━━━━━━━━━━━━━━━
📁 Folder: *${selectedCategory.fileName}*
🏷️ Nama: *${selectedCategory.categoryName}*
🎭 Jumlah Emoji: *${selectedCategory.emojiCount} emoji*
📅 Diupdate: *${config.reaction.emojiSettings.lastUpdated}*

📋 *INFORMASI:*
━━━━━━━━━━━━━━━━━━━
• Bot sekarang akan menggunakan emoji dari kategori ini
• Emoji pool telah diperbarui untuk reaction
• Pengaturan tersimpan otomatis ke config.json

💾 *Data tersimpan ke config.json dengan aman*
🎉 *Bot siap menggunakan emoji kategori baru!*`, m, hisoka);
            } else {
              await Wily('❌ *ERROR:* Gagal menyimpan pengaturan emoji ke config.json', m, hisoka);
            }
            return;
          }

          // Tampilkan daftar kategori emoji
          const emojiCategories = this.getEmojiCategories();
          let categoryList = `📂 *DAFTAR KATEGORI EMOJI TERSEDIA*

🎯 *TOTAL KATEGORI:* ${emojiCategories.length} folder emoji
🎭 *TOTAL EMOJI:* ${emojiCategories.reduce((total, cat) => total + cat.emojiCount, 0)} emoji

📋 *DAFTAR KATEGORI:*
━━━━━━━━━━━━━━━━━━━\n`;

          emojiCategories.forEach((category, index) => {
            const number = (index + 1).toString().padStart(2, '0');
            categoryList += `${number}. **${category.categoryName}**\n`;
            categoryList += `    📁 File: \`${category.fileName}\`\n`;
            categoryList += `    🎭 Emoji: \`${category.emojiCount} tersedia\`\n\n`;
          });

          categoryList += `💡 *CARA PENGGUNAAN:*
━━━━━━━━━━━━━━━━━━━
• \`.reaction set [1-${emojiCategories.length}]\` - Pilih kategori emoji
• \`.reaction set 1\` - Set ke Smileys & People
• \`.reaction set 3\` - Set ke Food & Drink

📱 *ATAU REPLY PESAN INI:*
━━━━━━━━━━━━━━━━━━━
• Reply pesan ini dengan nomor kategori (1-${emojiCategories.length})
• Contoh: ketik angka \`3\` untuk Food & Drink

`;

          // Tampilkan kategori aktif jika ada
          if (config.reaction.emojiSettings && config.reaction.emojiSettings.activeCategory) {
            categoryList += `🎯 *KATEGORI SAAT INI:*
━━━━━━━━━━━━━━━━━━━
📁 Aktif: **${config.reaction.emojiSettings.categoryName}**
🎭 Emoji: **${config.reaction.emojiSettings.emojiCount} emoji**
📅 Update: **${config.reaction.emojiSettings.lastUpdated}**

`;
          }

          categoryList += `💾 *Semua pengaturan tersimpan otomatis ke config.json*`;

          await Wily(categoryList, m, hisoka);
          break;

        case 'matikan':
          // Cek apakah ada argument tambahan
          if (args[1]) {
            await Wily(`❌ *COMMAND MATIKAN TIDAK MEMERLUKAN ARGUMENT*

🚫 *KESALAHAN TERDETEKSI:*
━━━━━━━━━━━━━━━━━━━
Input: \`.reaction matikan ${args.slice(1).join(' ')}\`
Error: *Command 'matikan' tidak memerlukan parameter tambahan*

✅ *FORMAT YANG BENAR:*
━━━━━━━━━━━━━━━━━━━
• \`.reaction matikan\` - Tanpa tambahan apapun

📝 *CONTOH BENAR vs SALAH:*
━━━━━━━━━━━━━━━━━━━
✅ \`.reaction matikan\`
❌ \`.reaction matikan sistem\`
❌ \`.reaction matikan ${args.slice(1).join(' ')}\`

💡 Cukup ketik \`.reaction matikan\` saja`, m, hisoka);
            return;
          }

          // Cek apakah sistem sudah dimatikan
          if (!config.reaction.enabled) {
            await Wily(`ℹ️ *SISTEM SUDAH DALAM KEADAAN MATI*

🎯 *STATUS SAAT INI:*
━━━━━━━━━━━━━━━━━━━
❌ Sistem: *NONAKTIF* (sudah dimatikan)
🚫 Mode: *TIDAK AKTIF*
⏸️ Status: *BOT TIDAK MELIHAT STORY*
🔇 Reaksi: *TIDAK ADA AKTIVITAS*

📋 *INFORMASI:*
━━━━━━━━━━━━━━━━━━━
• Sistem reaction sudah dimatikan sepenuhnya
• Bot tidak akan melihat atau bereaksi pada story
• Tidak ada aktivitas auto read story

💡 *UNTUK MENGAKTIFKAN KEMBALI:*
• Gunakan \`.reaction on\` untuk mode selalu reaksi
• Gunakan \`.reaction off\` untuk mode silent reader
• Gunakan \`.reaction random\` untuk mode acak`, m, hisoka);
            return;
          }

          config.reaction.enabled = false;
          if (this.saveConfig(config)) {
            await Wily(`🔴 *SISTEM REACTION BERHASIL DIMATIKAN*

🎯 *STATUS SISTEM:*
━━━━━━━━━━━━━━━━━━━
❌ Sistem: *NONAKTIF*
🚫 Mode: *TIDAK AKTIF*
⏸️ Status: *BOT TIDAK MELIHAT STORY*
🔇 Reaksi: *TIDAK ADA AKTIVITAS*

📋 *DAMPAK PERUBAHAN:*
━━━━━━━━━━━━━━━━━━━
• Bot berhenti melihat semua story WhatsApp
• Tidak ada aktivitas auto read story sama sekali
• Sistem reaction mati total
• Menghemat resource dan bandwidth
• Bot benar-benar tidak terlibat dengan story

💾 *Pengaturan tersimpan ke config.json*

💡 *UNTUK MENGAKTIFKAN KEMBALI:*
━━━━━━━━━━━━━━━━━━━
• \`.reaction on\` - Aktifkan mode selalu reaksi
• \`.reaction off\` - Aktifkan mode silent reader
• \`.reaction random\` - Aktifkan mode random

🔕 *Sistem reaction sekarang benar-benar mati!*`, m, hisoka);
          } else {
            await Wily('❌ *ERROR:* Gagal menyimpan pengaturan ke config.json', m, hisoka);
          }
          break;

        default:
          await Wily(`❌ *COMMAND TIDAK DITEMUKAN*

🚫 *KESALAHAN TERDETEKSI:*
━━━━━━━━━━━━━━━━━━━
Input: \`.reaction ${subCommand}\`
Error: *Command '${subCommand}' tidak tersedia*

📋 *DAFTAR COMMAND YANG TERSEDIA:*
━━━━━━━━━━━━━━━━━━━
• \`.reaction\` - Lihat status dan panduan lengkap
• \`.reaction delay [1-10]\` - Atur kecepatan delay (1-10 detik)
• \`.reaction delay random\` - Atur delay random (1-10 detik)
• \`.reaction on\` - Mode selalu memberikan reaksi
• \`.reaction off\` - Mode silent reader (tanpa reaksi)
• \`.reaction random\` - Mode random 50% chance reaksi
• \`.reaction set\` - Lihat & pilih kategori emoji
• \`.reaction matikan\` - Matikan sistem reaction sepenuhnya

📝 *CONTOH PENGGUNAAN YANG BENAR:*
━━━━━━━━━━━━━━━━━━━
✅ \`.reaction delay 5\`
✅ \`.reaction on\`
✅ \`.reaction set\`
❌ \`.reaction ${subCommand}\`
❌ \`.reaction aktif\`
❌ \`.reaction hidup\`

💡 *TIPS:*
━━━━━━━━━━━━━━━━━━━
• Gunakan \`.reaction\` tanpa parameter untuk bantuan
• Semua command sensitif terhadap huruf kecil
• Tidak ada spasi tambahan di akhir command

🔍 Ketik \`.reaction\` untuk melihat status dan panduan lengkap`, m, hisoka);
          break;
      }

    } catch (error) {
      await Wily(`❌ Terjadi kesalahan: ${error.message}`, m, hisoka);
    }
  }

  // Function untuk pilih emoji random
  getRandomEmoji() {
    const emojiList = this.getEmojiList();
    const randomIndex = Math.floor(Math.random() * emojiList.length);
    return emojiList[randomIndex];
  }

  // Check if sender is excluded from reactions
  isSenderExcluded(participant) {
    return this.allowedSenders.includes(participant);
  }

  // Check if message is within time limit
  isMessageRecent(messageTimestamp) {
    const currentTime = Date.now();
    const messageTime = messageTimestamp * 1000;
    const timeDiff = currentTime - messageTime;
    return timeDiff <= this.maxTime;
  }

  // Check if story was posted after bot started
  isStoryAfterBotStart(messageTimestamp) {
    const messageTime = messageTimestamp * 1000;
    return messageTime >= this.botStartTime;
  }

  // Get time difference in seconds
  getTimeDifference(messageTimestamp) {
    const currentTime = Date.now();
    const messageTime = messageTimestamp * 1000;
    return currentTime - messageTime;
  }

  // Determine message type
  getMessageType(message) {
    if (message.imageMessage) return 'Foto';
    if (message.videoMessage) return 'Video';
    if (message.extendedTextMessage) return 'Text';
    return 'Status';
  }

  // Helper function to format phone number with stars
  formatPhoneNumber(participant) {
    if (!participant) return "628xxx***xxx";
    const number = participant.split('@')[0];
    if (number.length < 8) return number;

    const start = number.substring(0, 5);
    const end = number.substring(number.length - 3);
    const middle = '*'.repeat(3);
    return `${start}${middle}${end}`;
  }

  // Get sender name with null safety
  getSenderName(pushName, participant) {
    // Handle null pushName
    if (pushName && typeof pushName === 'string' && pushName.trim() !== '') {
      return pushName;
    }

    // Handle null participant
    if (!participant || typeof participant !== 'string') {
      return 'Unknown User';
    }

    // Safe split with fallback
    try {
      return participant.split('@')[0] || 'Unknown User';
    } catch (error) {
      return 'Unknown User';
    }
  }

  // Log story dengan reaksi
  logStoryWithReaction(senderName, messageType, delayUsed, emoji, participant) {
    const selamat = getSelamat();
    const hari = getHari().replace(/\s*🟤|🟢|🟡|🔴|🟠|🟣|🔵/g, '').trim();
    const tanggal = getTanggal().replace(/\s*📅/g, '').trim();
    const bulan = getBulan().replace(/\s*❄️|💕|🌸|🌦️|🌺|☀️|🌻|🌾|🍂|🎃|🦃|🎄/g, '').trim();
    const tahun = getTahun().replace(/\s*🗓️/g, '').trim();
    const waktu = getWaktu();
    const nomorFormat = this.formatPhoneNumber(participant);

    process.stdout.write(`╭══════════════════════════════════╮
║ 💌 STATUS UPDATE MASUK           ║
├══════════════════════════════════┤
│ » Status      : Aktif ✓
│ » Tanggal     : ${hari}|${tanggal}|${bulan}|${tahun}
│ » Selamat     : ${selamat}
│ » Waktu       : ${waktu}
│ » Nama        : ${senderName}
│ » Nomor       : ${nomorFormat}
│ » Tipe Status : ${messageType}
│ » Speed Views : ${delayUsed} Detik
│ » Reaction    : ON
│ » Mode        : always
│ » Reaksi      : ${emoji}
│ » Status      : Dilihat & Disukai
└───···\n`);
  }

  // Log story tanpa reaksi
  logStoryWithoutReaction(senderName, messageType, delayUsed, mode, participant) {
    const selamat = getSelamat();
    const hari = getHari().replace(/\s*🟤|🟢|🟡|🔴|🟠|🟣|🔵/g, '').trim();
    const tanggal = getTanggal().replace(/\s*📅/g, '').trim();
    const bulan = getBulan().replace(/\s*❄️|💕|🌸|🌦️|🌺|☀️|🌻|🌾|🍂|🎃|🦃|🎄/g, '').trim();
    const tahun = getTahun().replace(/\s*🗓️/g, '').trim();
    const waktu = getWaktu();
    const nomorFormat = this.formatPhoneNumber(participant);

    const modeText = mode === 'off' ? 'silent' : 
                    mode === 'random' ? 'random' : 'always';
    const reactionStatus = mode === 'off' ? 'OFF' : 'ON';
    const statusText = mode === 'off' ? 'Dilihat Saja' : 
                      mode === 'random' ? 'Dilihat (Skip Random)' : 'Dilihat & Disukai';

    process.stdout.write(`╭══════════════════════════════════╮
║ 💌 STATUS UPDATE MASUK           ║
├══════════════════════════════════┤
│ » Status      : Aktif ✓
│ » Tanggal     : ${hari}|${tanggal}|${bulan}|${tahun}
│ » Selamat     : ${selamat}
│ » Waktu       : ${waktu}
│ » Nama        : ${senderName}
│ » Nomor       : ${nomorFormat}
│ » Tipe Status : ${messageType}
│ » Speed Views : ${delayUsed} Detik
│ » Reaction    : ${reactionStatus}
│ » Mode        : ${modeText}
│ » Reaksi      : -
│ » Status      : ${statusText}
└───···\n`);
  }

  // Log failed reaction
  logFailedReaction(senderName, error) {
    process.stdout.write(`❌ REACTION GAGAL: ${senderName} - ${error.message}\n`);
  }

  // Log excluded sender (minimal)
  logExcludedSender(senderName) {
    // process.stdout.write(`🚫 DIKECUALIKAN: ${senderName}\n`);
  }

  // Log old story (minimal)
  logOldStory(senderName, timeDiff) {
    // process.stdout.write(`⏰ STORY LAMA: ${senderName}\n`);
  }

  // Main function to handle story reactions
  async handleStoryReaction(sock, m) {
    try {
      // Check if message exists and is not from self
      if (!m.message || m.key.fromMe) return;

      // Skip deleted/removed stories silently (no logs)
      if (m.message.protocolMessage && m.message.protocolMessage.type === 0) {
        return; // Story dihapus, skip tanpa log
      }

      // Skip empty or invalid messages silently
      if (!m.message.imageMessage && !m.message.videoMessage && !m.message.extendedTextMessage && !m.message.conversation) {
        return; // Story kosong/dihapus, skip tanpa log
      }

      // Check if it's a status broadcast and not a reaction message
      if (m.key.remoteJid === 'status@broadcast' && !m.message.reactionMessage) {
        const config = this.readConfig();
        const reactionConfig = config.reaction;

        // Cek apakah reaction sistem aktif
        if (!reactionConfig.enabled) {
          return; // Sistem mati total, tidak melihat story sama sekali
        }



        // Comprehensive null checks untuk key structure
        if (!m.key || !m.key.participant) {
          return; // Key atau participant null, skip
        }

        // Safe check untuk messageTimestamp
        if (!m.messageTimestamp || typeof m.messageTimestamp !== 'number') {
          return; // Timestamp tidak valid, skip
        }

        const senderName = this.getSenderName(m.pushName, m.key.participant);

        // Check if sender is excluded (with null safety)
        if (m.key.participant && this.isSenderExcluded(m.key.participant)) {
          return;
        }

        const timeDiff = this.getTimeDifference(m.messageTimestamp);

        // Check if message is recent enough
        if (!this.isMessageRecent(m.messageTimestamp)) {
          return;
        }

        // Skip story yang dibuat sebelum bot start (hindari reaksi story lama saat startup)
        if (!this.isStoryAfterBotStart(m.messageTimestamp)) {
          return; // Story lama sebelum bot start, skip tanpa log
        }

        // Delay sesuai config (dalam detik) - support random delay
        let actualDelay;
        let delayMs;
        
        if (reactionConfig.delay === 'random') {
          // Random delay antara 1-10 detik
          actualDelay = Math.floor(Math.random() * 10) + 1;
          delayMs = actualDelay * 1000;
        } else {
          actualDelay = reactionConfig.delay;
          delayMs = actualDelay * 1000;
        }
        
        await new Promise(resolve => setTimeout(resolve, delayMs));

        try {
          // Mark as read selalu dilakukan
          await sock.readMessages([m.key]);

          // Tentukan apakah akan memberikan reaksi berdasarkan mode
          let shouldReact = false;

          switch (reactionConfig.mode) {
            case 'on':
              shouldReact = true;
              break;
            case 'off':
              shouldReact = false;
              break;
            case 'random':
              shouldReact = Math.random() > 0.5; // 50% chance
              break;
            default:
              shouldReact = true;
          }

          const messageType = this.getMessageType(m.message);

          if (shouldReact) {
            // Get random emoji untuk reaksi
            const randomEmoji = this.getRandomEmoji();

            // Send reaction dengan emoji random
            await sock.sendMessage(
              'status@broadcast',
              { react: { key: m.key, text: randomEmoji } },
              { statusJidList: [sock.user.id, m.key.participant] }
            );

            // Log story dengan reaksi - gunakan delay aktual yang digunakan
            this.logStoryWithReaction(senderName, messageType, actualDelay, randomEmoji, m.key.participant);
          } else {
            // Log story tanpa reaksi dengan info mode - gunakan delay aktual yang digunakan
            this.logStoryWithoutReaction(senderName, messageType, actualDelay, reactionConfig.mode, m.key.participant);
          }

        } catch (error) {
          this.logFailedReaction(senderName, error);
        }
      }
    } catch (err) {
      process.stdout.write(`❌ ERROR SISTEM: ${err.message}\n`);
    }
  }
}

export default AutoReaction;

// Export untuk command handler
export const reactionCommand = {
  command: ['reaction'],
  description: 'Mengatur mode dan delay reaction untuk auto read story'
};
