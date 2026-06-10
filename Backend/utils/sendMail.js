const nodemailer = require("nodemailer");

const sendMail = async (email, otp) => {
  const emailUser = process.env.EMAIL;
  const emailPass = process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPass) {
    console.log(`\n==========================================`);
    console.log(`⚠️  SMTP Credentials not configured in .env`);
    console.log(`📧  Target Email: ${email}`);
    console.log(`🔑  OTP Code: ${otp}`);
    console.log(`==========================================\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  await transporter.sendMail({
    from: emailUser,
    to: email,
    subject: "OTP Verification",
    html: `
      <h2>Student Registration OTP</h2>
      <h3>${otp}</h3>
      <p>This OTP is valid for 5 minutes.</p>
    `,
  });
};

module.exports = sendMail;