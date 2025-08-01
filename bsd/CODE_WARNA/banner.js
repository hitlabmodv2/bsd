
const { colors, style } = require('./colors');

function createBanner() {
  const banner = `
${style.menuTitle('🤖 WhatsApp Bot')}
${style.info('✨ Auto Read Story ✨')}
`;
  return banner;
}

function createMenuBox() {
  return `
${style.menuTitle('📱 Pilih Koneksi:')}

${style.menuOption('1️⃣  Pairing Code')}
${style.menuOption('2️⃣  QR Code')}
${style.menuOption('3️⃣  Exit')}

`;
}

function createSuccessBox(phoneNumber) {
  return `
${style.success('✅ TERSAMBUNG!')}

${style.info('🤖 Status:')} ${style.highlight('Aktif')}
${style.info('📱 Nomor:')} ${style.highlight(phoneNumber)}
${style.info('🔄 Mode:')} ${style.highlight('Auto Read Story')}
`;
}

function createPairingCodeBox(code) {
  return `
${style.warning('🔑 KODE PAIRING:')}

        ${style.pairingCode(code)}

${style.info('📱 Masukkan ke WhatsApp')}
`;
}

module.exports = {
  createBanner,
  createMenuBox,
  createSuccessBox,
  createPairingCodeBox
};
