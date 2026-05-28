const QRCode = require("qrcode");

function buildCertificateCode(studentId) {
  const suffix = studentId.slice(-6).toUpperCase();
  return `CERT-${new Date().getFullYear()}-${suffix}-${Date.now()
    .toString()
    .slice(-5)}`;
}

async function buildCertificatePayload(student, school, template) {
  const code = buildCertificateCode(student.id);
  const appUrl = process.env.APP_URL || "http://localhost:5173";
  const verificationUrl = `${appUrl}/verify/${code}`;
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
    color: {
      dark: template.accentColor,
      light: "#ffffff",
    },
    margin: 1,
    width: 260,
  });

  return {
    code,
    verificationUrl,
    qrCodeDataUrl,
    studentName: `${student.firstName} ${student.lastName}`,
    schoolName: school.name,
    formationName: student.formation?.name || "Formation non renseignee",
    title: template.title,
    signerName: template.signerName,
    signerRole: template.signerRole,
    footerText: template.footerText,
    accentColor: template.accentColor,
    issuedAt: new Date().toISOString(),
  };
}

module.exports = {
  buildCertificatePayload,
};
