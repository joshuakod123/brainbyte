const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // For development, use a test account
  // In production, use real credentials
  let transporter;
  
  if (process.env.NODE_ENV === 'production') {
    // Create transporter with real credentials
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  } else {
    // Create test account for development
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  // Send email
  const message = {
    from: `${process.env.FROM_NAME || 'BrainByte'} <${process.env.FROM_EMAIL || 'noreply@brainbyte.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || undefined,
  };

  const info = await transporter.sendMail(message);

  // Log URL in development for testing
  if (process.env.NODE_ENV !== 'production') {
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  }
};

module.exports = sendEmail;