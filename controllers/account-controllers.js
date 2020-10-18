// -- libraries
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const fetch = require('node-fetch');
const validator = require('validator');

// -- my own imports
const { dbErrorHandler } = require('../helpers/mongo-db-error');
const HttpError = require('../helpers/http-error');
const { decrypt, encrypt } = require('../helpers/encrypt-data');
const {
	accountActivation,
	resetPassword,
} = require('../helpers/mailers/appMailer');

// -- models
const User = require('../models/user-model');

// -- config .env to ./config/config.env
require('dotenv').config({
	path: './config/config.env',
});

// * -- CONTROLLERS
const signupController = async (req, res, next) => {
	// * ---- body validation
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const firstErrorMsg = errors.array({ onlyFirstError: true })[0].msg;
		const optionalMsg = 'Invalid inputs passed. Please, check your data.';
		return next(new HttpError(firstErrorMsg || optionalMsg, 422));
	}

	const serverErrorMsg = `Signing up failed - something went wrong during processing the request.`;
	let { name, email, password1: password } = req.body;

	// * ---- check if user already exists
	let user;
	try {
		user = await User.findOne({ email: email });
	} catch (err) {
		return next(new HttpError(serverErrorMsg, 500));
	}

	if (user) {
		let userIsActive = user.isActive;
		if (userIsActive) {
			return next(
				new HttpError(`User with that email already exists.`, 409)
			);
		} else {
			return next(new HttpError(`Your account is inactive.`, 401));
		}
	} else {
		// * ---- create user
		user = new User({
			name,
			email,
			password,
		});
		try {
			await user.save();
		} catch (err) {
			const error = dbErrorHandler(err, 500);
			return next(error);
		}
	}

	try {
		// * ---- generate token to activate account
		let token = jwt.sign(
			{
				userId: user.id,
				name,
				email,
			},
			process.env.JWT_SECRET_ACCOUNT_ACTIVATION,
			{ expiresIn: '15m' }
		);
		// * ---- send activation email
		await accountActivation({
			to: email,
			name: name,
			activationHref: `${process.env.CLIENT_URL}/account/activate/${token}`,
			resetPasswordHref: `${process.env.CLIENT_URL}/account/forgot-password`,
		});
	} catch (err) {
		return next(new HttpError(serverErrorMsg, 500));
	}

	res.status(201).json({
		success: true,
		message: `Signup succeeded. Activation email has been sent to ${email}.`,
	});
};

const activateController = async (req, res, next) => {
	let decodedToken;
	const serverErrorMsg = `Activation failed - something went wrong during processing the request.`;

	// * ---- check token
	try {
		const { token } = req.body;
		decodedToken = jwt.verify(
			token,
			process.env.JWT_SECRET_ACCOUNT_ACTIVATION
		);
	} catch (err) {
		return next(
			new HttpError(
				'Authentication failed. Link probably expired. Please, try to activate your account once more.',
				401
			)
		);
	}

	// * ---- get data from token
	const { userId, name, email } = decodedToken;

	// * ---- find user
	// -- check if user is already active
	let user;
	try {
		user = await User.findOne({ email: email });
	} catch (err) {
		return next(new HttpError(serverErrorMsg, 500));
	}

	// * ---- activate account
	if (user) {
		if (user.isActive) {
			return next(
				new HttpError('Your account has been already activated', 403)
			);
		} else {
			try {
				user.isActive = true;
				await user.save();
			} catch (err) {
				const error = dbErrorHandler(err, 500);
				return next(error);
			}
		}
	} else {
		return next(new HttpError(`User with that email doesn't exists`, 404));
	}

	res.status(200).json({
		success: true,
		message: `Account user with email: ${email} has been activated`,
		user: {
			name,
			email,
		},
	});
};

const sendActivationEmailController = async (req, res, next) => {
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

	const serverErrorMsg = `Can not send email - something went wrong during processing the request.`;
	const { email } = req.body;

	// * ---- find user
	// -- check if user is already active
	let user;
	try {
		user = await User.findOne({ email: email });
	} catch (err) {
		return next(new HttpError(serverErrorMsg, 500));
	}

	// * ---- activate account
	if (user) {
		if (user.isActive) {
			return next(
				new HttpError('Your account has been already activated', 403)
			);
		} else {
			// * ---- generate token to activate account
			let token = jwt.sign(
				{
					userId: user.id,
					name: user.name,
					email,
				},
				process.env.JWT_SECRET_ACCOUNT_ACTIVATION,
				{ expiresIn: '15m' }
			);
			try {
				// * ---- send activation email
				await accountActivation({
					to: email,
					name: user.name || 'unknown user',
					activationHref: `${process.env.CLIENT_URL}/account/activate/${token}`,
					resetPasswordHref: `${process.env.CLIENT_URL}/account/forgot-password`,
				});
			} catch (err) {
				return new HttpError(serverErrorMsg, 500);
			}
		}
	} else {
		return next(new HttpError(`User with that email doesn't exists`, 404));
	}

	res.status(200).json({
		success: true,
		message: `Activation email has been sent to ${email}.`,
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

	const serverErrorMsg = `Signin failed - something went wrong during processing the request.`;
	const invalidCredentialsErrorMsg =
		'Invalid credentials - could not log in.';
	const { email, password } = req.body;

	// * ---- get user
	let user;
	try {
		user = await User.findOne({ email: email });
	} catch (err) {
		return next(new HttpError(serverErrorMsg, 500));
	}

	// * check if user is active
	if (user) {
		let userIsActive = user.isActive;
		if (!userIsActive) {
			return next(new HttpError(`Your account is inactive.`, 401));
		}
	} else {
		return next(new HttpError(invalidCredentialsErrorMsg, 403));
	}

	// * ---- authenticate user
	let authenticatedUser;
	try {
		authenticatedUser = await user.validPasswords(password);
	} catch (err) {
		const error = dbErrorHandler(err, 500);
		return next(error);
	}

	if (!authenticatedUser) {
		return next(new HttpError(invalidCredentialsErrorMsg, 403));
	}

	// * ---- generate token
	const token = jwt.sign(
		{
			userId: user.id,
			email: user.email,
		},
		process.env.JWT_SECRET,
		{ expiresIn: '1h' }
	);

	res.json({
		success: true,
		message: 'Signin succeeded',
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
		},
		token,
	});
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT);
const signinGoogleController = async (req, res, next) => {
	const { idToken } = req.body;
	const serverErrorMsg = `Authentication using Google failed. Please try again.`;

	// check if idToken exists in body
	if (idToken) {
		let response;

		// get response data
		try {
			response = await client.verifyIdToken({
				idToken,
				audience: process.env.GOOGLE_CLIENT,
			});
		} catch (err) {
			return next(new HttpError(serverErrorMsg, 500));
		}

		let { email_verified, name, email } = response.payload;

		// normalize email
		email = validator.normalizeEmail(email);

		// if users email is verified
		if (email_verified) {
			let user;

			try {
				user = await User.findOne({ email: email });
			} catch (err) {
				return next(new HttpError(serverErrorMsg, 500));
			}

			// if user doesn't exists create one
			if (!user) {
				let password = email + process.env.JWT_SECRET;
				user = new User({
					name,
					email,
					password,
					isActive: true,
				});

				try {
					await user.save();
				} catch (err) {
					const error = dbErrorHandler(err, 500);
					return next(error);
				}
			}

			// * ---- generate token to signin
			const token = jwt.sign(
				{
					userId: user.id,
					email: user.email,
				},
				process.env.JWT_SECRET,
				{ expiresIn: '1h' }
			);

			res.json({
				success: true,
				message: 'Signin succeeded',
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
					role: user.role,
				},
				token,
			});
		} else {
			return next(new HttpError(serverErrorMsg, 400));
		}
	} else {
		return next(new HttpError(serverErrorMsg, 404));
	}
};

const signinFacebookController = async (req, res, next) => {
	const { userID, accessToken } = req.body;
	const url = `https://graph.facebook.com/v2.11/${userID}/?fields=id,name,email&access_token=${accessToken}`;
	const serverErrorMsg = `Authentication using Facebook failed. Please try again.`;
	let response;

	try {
		response = await fetch(url, { method: 'GET' });
	} catch (err) {
		return next(new HttpError(serverErrorMsg, 500));
	}

	response = await response.json();
	let { email, name } = response;

	// normalize email
	email = validator.normalizeEmail(email);

	if (response) {
		let user;

		try {
			user = await User.findOne({ email: email });
		} catch (err) {
			console.log('second error');
			console.log(err);
			return next(new HttpError(serverErrorMsg, 500));
		}

		if (!user) {
			let password = email + process.env.JWT_SECRET;
			user = new User({
				name,
				email,
				password,
				isActive: true,
			});

			try {
				await user.save();
			} catch (err) {
				const error = dbErrorHandler(err, 500);
				return next(error);
			}
		}

		// * ---- generate token to signin
		const token = jwt.sign(
			{
				userId: user.id,
				email: user.email,
			},
			process.env.JWT_SECRET,
			{ expiresIn: '1h' }
		);

		res.json({
			success: true,
			message: 'Signin succeeded',
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
			token,
		});
	} else {
		console.log('else');

		return next(new HttpError(serverErrorMsg, 500));
	}
};

const forgotPasswordController = async (req, res, next) => {
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

	const serverErrorMsg = `Password reset failed - something went wrong during processing the request.`;
	const { email } = req.body;

	// * ---- get user
	let user;
	try {
		user = await User.findOne({ email: email, isActive: true });
	} catch (err) {
		return next(new HttpError(serverErrorMsg, 500));
	}

	if (!user) {
		return next(new HttpError(`User with that email doesn't exists.`, 403));
	}

	// * ---- generate token
	const token = jwt.sign(
		{
			userId: user.id,
			email: user.email,
		},
		process.env.JWT_SECRET_RESET_PASSWORD,
		{ expiresIn: '1h' }
	);

	// * ---- update resetPasswordLink of user
	try {
		await user.updateOne({
			resetPasswordLink: token,
		});
	} catch (err) {
		const error = dbErrorHandler(err, 500);
		return next(error);
	}

	// * ---- send reset password email
	console.log(email)
	try {
		await resetPassword({
			to: email,
			name: user.name || 'unknown user',
			resetPasswordHref: `${process.env.CLIENT_URL}/account/reset-password/${token}`,
		});
	} catch (err) {
		return new HttpError(serverErrorMsg, 500);
	}

	res.status(200).json({
		success: true,
		message: `Reset password email has been sent to ${email}.`,
	});
};
const resetPasswordController = async (req, res, next) => {
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

	const { resetPasswordLink, password } = req.body;
	const serverErrorMsg = `Password reset failed - something went wrong during processing the request.`;

	// * ---- check token
	let decodedToken;

	try {
		decodedToken = jwt.verify(
			resetPasswordLink,
			process.env.JWT_RESET_PASSWORD
		);
	} catch (err) {
		return next(
			new HttpError(
				'Reset password failed. Link probably expired. Please, try to activate your account once more.',
				401
			)
		);
	}

	// * ---- find user
	let user;
	try {
		user = await User.findOne({ resetPasswordLink: resetPasswordLink });
	} catch (err) {
		const error = dbErrorHandler(err, 500);
		return next(error);
	}

	// * ---- update user
	const updatedFields = {
		password,
		resetPasswordLink: '',
	};
	user = _.extend(user, updatedFields);

	try {
		await user.save();
	} catch (err) {
		const error = dbErrorHandler(err, 500);
		return next(error);
	}

	res.status(200).json({
		success: true,
		message: `Password has been changed successfully`,
	});
};

exports.signupController = signupController;
exports.signinController = signinController;
exports.signinGoogleController = signinGoogleController;
exports.signinFacebookController = signinFacebookController;
exports.activateController = activateController;
exports.sendActivationEmailController = sendActivationEmailController;
exports.forgotPasswordController = forgotPasswordController;
exports.resetPasswordController = resetPasswordController;
