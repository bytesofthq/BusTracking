const sendMail = async (email, otp) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL;

  if (!apiKey) {
    console.log(`\n==========================================`);
    console.log(`⚠️  Brevo API Key (BREVO_API_KEY) not configured in .env`);
    console.log(`📧  Target Email: ${email}`);
    console.log(`🔑  OTP Code: ${otp}`);
    console.log(`==========================================\n`);
    return;
  }

  if (!senderEmail) {
    console.log(`\n==========================================`);
    console.log(`⚠️  Sender email (BREVO_SENDER_EMAIL or EMAIL) not configured in .env`);
    console.log(`📧  Target Email: ${email}`);
    console.log(`🔑  OTP Code: ${otp}`);
    console.log(`==========================================\n`);
    return;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: "Bus Tracking App",
        email: senderEmail,
      },
      to: [
        {
          email: email,
        },
      ],
      subject: "OTP Verification",
      htmlContent: `
        <h2>Student Registration OTP</h2>
        <h3>${otp}</h3>
        <p>This OTP is valid for 5 minutes.</p>
      `,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error("Failed to send email via Brevo:", errorData);
    throw new Error(errorData.message || "Failed to send email via Brevo");
  }

  return response.json();
};

module.exports = sendMail;