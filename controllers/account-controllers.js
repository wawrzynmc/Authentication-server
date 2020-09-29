// libraries
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');

// my own imports
const HttpError = require('../helpers/http-error');
const { decrypt, encrypt } = require('../helpers/encrypt-data');

// models
const User = require('../models/user-model');

// -- config .env to ./config/config.env
require('dotenv').config({
	path: './config/config.env',
});

// -- configure sgMail
sgMail.setApiKey(process.env.SG_MAIL_KEY);

const signupController = async (req, res, next) => {
	// ---- body validation
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		console.log(errors);
		const firstErrorMsg = errors.array({ onlyFirstError: true })[0].msg;
		const optionalMsg = 'Invalid inputs passed. Please, check your data.';
		return next(new HttpError(firstErrorMsg || optionalMsg, 422));
	}

	const signupServerErrorMsg = `Signing up failed - something went wrong during processing the request.`;
	const { name, email, password } = req.body;

	// ---- check if user already exists
	User.findOne({ email: email }).exec((err, user) => {
		if (user) {
			return next(
				new HttpError(`User with that email already exists.`, 409)
			);
		}
		if (err) {
			return next(new HttpError(signupServerErrorMsg, 500));
		}
	});

	// -- encrypt password
	let encryptedPassword = encrypt(password);

	// ---- generate token to activate account
	let token;
	try {
		token = jwt.sign(
			{
				name,
				email,
				password: encryptedPassword,
			},
			process.env.JWT_SECRET_ACCOUNT_ACTIVATION,
			{ expiresIn: '15m' }
		);
	} catch (err) {
		return new HttpError(signupServerErrorMsg, 500);
	}

	// ---- create and send activation email
	const emailData = {
		to: email,
		from: process.env.MAIL_FROM,
		subject: 'Account activation link',
		html: `
            <h1>Click to link to activate your account</h1>
            <p><a href="${process.env.CLIENT_URL}/account/activate/${token}">CLICK</a> to activate</p>
            <hr/>
            <p>This email contain sensitive information</p>
            <p>${process.env.CLIENT_URL}</p>
        `,
	};

	try {
		await sgMail.send(emailData);
	} catch (err) {
		return next(new HttpError(signupServerErrorMsg, 500));
	}

	res.status(201).json({
		success: true,
		message: `Email has been sent to ${email}.`,
	});
};

const activateController = async (req, res, next) => {
	const token = req.headers.authorization.split(' ')[1];

	if (token) {
		const decodedToken = jwt.verify(
			token,
			process.env.JWT_SECRET_ACCOUNT_ACTIVATION
		);
		const { name, email, password: encryptedPassword } = decodedToken;
		let password = decrypt(encryptedPassword)
		console.log(password, name)
		const user = new User({
			name,
			email,
			password,
		});
		try {
			await user.save();
		} catch (err) {
			return next(
				new HttpError(
					`Signup failed - something went wrong during processing the request.`,
					500
				)
			);
		}
		res.status(201).json({
			success: true,
			message: 'Signup success',
		});
	} else {
		return new HttpError('Authentication failed', 403);
	}
};

const signinController = async (req, res, next) => {};
const signinGoogleController = async (req, res, next) => {};
const signinFacebookController = async (req, res, next) => {};

const forgotPasswordController = async (req, res, next) => {};
const resetPasswordController = async (req, res, next) => {};

exports.signupController = signupController;
exports.signinController = signinController;
exports.signinGoogleController = signinGoogleController;
exports.signinFacebookController = signinFacebookController;
exports.activateController = activateController;
exports.forgotPasswordController = forgotPasswordController;
exports.resetPasswordController = resetPasswordController;
