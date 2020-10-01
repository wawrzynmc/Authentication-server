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

// -- CONTROLLERS
const signupController = async (req, res, next) => {
	// * ---- body validation
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const firstErrorMsg = errors.array({ onlyFirstError: true })[0].msg;
		const optionalMsg = 'Invalid inputs passed. Please, check your data.';
		return next(new HttpError(firstErrorMsg || optionalMsg, 422));
	}

	const signupServerErrorMsg = `Signing up failed - something went wrong during processing the request.`;
	const { name, email, password } = req.body;

	// * ---- check if user already exists
	try {
		existingUser = await User.findOne({ email: email });
	} catch (err) {
		return next(new HttpError(signupServerErrorMsg, 500));
	}

	if (existingUser) {
		return next(new HttpError(`User with that email already exists.`, 409));
	}

	// * ---- create user
	const createdUser = new User({
		name,
		email,
		password,
	});
	try {
		await createdUser.save();
	} catch (err) {
		return next(
			new HttpError(
				`Signup failed - something went wrong during processing the request.`,
				500
			)
		);
	}

	// * ---- generate token to activate account
	let token;
	try {
		token = jwt.sign(
			{
				userId: createdUser.id,
				email,
			},
			process.env.JWT_SECRET_ACCOUNT_ACTIVATION,
			{ expiresIn: '15m' }
		);
	} catch (err) {
		return new HttpError(signupServerErrorMsg, 500);
	}

	// * ---- create and send activation email
	const emailData = {
		to: email,
		from: process.env.MAIL_FROM,
		subject: 'Activate your account',
		html: `
            <h1>Click on the link to activate your account</h1>
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
		message: `Signup succeeded. Activation email has been sent to ${email}.`,
	});
};

const activateController = async (req, res, next) => {
	let decodedToken;
	const activationServerErrorMsg = `Activation failed - something went wrong during processing the request.`;

	try {
		const token = req.headers.authorization.split(' ')[1];
		decodedToken = jwt.verify(
			token,
			process.env.JWT_SECRET_ACCOUNT_ACTIVATION
		);
	} catch (err) {
		return next(new HttpError('Authentication failed', 403));
	}

	const { userId, email } = decodedToken;

	// * ---- find user
	try {
		user = await User.findOne({ email: email });
	} catch (err) {
		return next(new HttpError(activationServerErrorMsg, 500));
	}

	// * ---- activate account
	if (user) {
		try {
			user.isActive = false;
			await user.save();
		} catch (err) {
			return next(new HttpError(activationServerErrorMsg, 500));
		}
	} else {
		return next(new HttpError(`User with that email doesn't exists`, 404));
	}

	res.status(204).json({
		success: true,
		message: `Account user with email: ${email} has been activated`,
	});
};

const signinController = async (req, res, next) => {
	// * ---- body validation
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const firstErrorMsg = errors.array().map((error) => error.msg)[0];
		return next(
			new HttpError(
				firstErrorMsg ||
					`Invalid inputs passed, please check your data.`,
				422
			)
		);
	}

	const signinServerErrorMsg = `Signin failed - something went wrong during processing the request.`;
	const invalidCredentialsErrorMsg =
		'Invalid credentials - could not log in.';
	const { email, password } = req.body;
	let user;

	// * ---- get user
	try {
		user = await User.findOne({ email: email });
	} catch (err) {
		return next(new HttpError(signinServerErrorMsg, 500));
	}

	// * ---- check if user exists
	if (!user) {
		return next(new HttpError(invalidCredentialsErrorMsg, 403));
	}

	// * ---- authenticate user
	let authenticatedUser;
	try {
		authenticatedUser = await user.authenticate(password);
	} catch (err) {
		return next(new HttpError(signinServerErrorMsg, 500));
	}

	if (!authenticatedUser) {
		return next(new HttpError(invalidCredentialsErrorMsg, 403));
	}

	// * ---- generate token
	const token = jwt.sign(
		{
			_id: user._id,
		},
		process.env.JWT_SECRET,
		{ expiresIn: '1d' }
	);

	res.json({
		success: true,
		message: 'Signin succeeded',
		user: {
			_id,
			name,
			email,
			role,
		},
		token,
	});
};
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
