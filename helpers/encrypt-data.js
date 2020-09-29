const Cryptr = require('cryptr');

// -- config .env to ./config/config.env
require('dotenv').config({
	path: './config/config.env',
});

// create cryptr
const cryptr = new Cryptr(process.env.CRYPTO_PASSWORD);

exports.encrypt = (text) => {
    return cryptr.encrypt(text);
}

exports.decrypt = (encryptedText) => {
    return cryptr.decrypt(encryptedText);;
}
