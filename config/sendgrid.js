const sgMail = require('@sendgrid/mail');

// -- config .env to ./config/config.env
require('dotenv').config({
	path: './config/config.env',
});

// -- configure sgMail
sgMail.setApiKey(process.env.SG_MAIL_KEY);

// -- create default message object
const message = {};
message.from = process.env.MAIL_FROM;

module.exports = message;
