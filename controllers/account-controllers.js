// -- libraries
const { validationResult } = require('express-validator');
const _ = require('lodash');
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
const {
	INVALID_INPUT_DATA_ERROR,
	USER_ALREADY_EXISTS_ERROR,
	SERVER_ERROR,
	USER_INACTIVE_ERROR,
	EXPIRED_TOKEN_ERROR,
	USER_ALREADY_ACTIVATED_ERROR,
	USER_DOESNT_EXIST_ERROR,
	INVALID_CREDENTIALS_ERROR,
} = require('../helpers/codes/error-codes');
const {
	SIGNUP_SUCCESS,
	SIGNIN_SUCCESS,
	ACTIVATION_SUCCESS,
	SEND_ACTIVATION_EMAIL_SUCCESS,
	SEND_RESET_PWD_EMAIL_SUCCESS,
	PWD_CHANGED_SUCCESS,
} = require('../helpers/codes/success-codes');

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

		return next(
			new HttpError(
				firstErrorMsg || INVALID_INPUT_DATA_ERROR.value,
				INVALID_INPUT_DATA_ERROR.statusCode
			)
		);
	}

	let { name, email, password1: password } = req.body;

	// * ---- check if user already exists
	let user;
	try {
		user = await User.findOne({ email: email });
	} catch (err) {
		return next(new HttpError(SERVER_ERROR.value, SERVER_ERROR.statusCode));
	}

	if (user) {
		let userIsActive = user.isActive;
		if (userIsActive) {
			return next(
				new HttpError(
					USER_ALREADY_EXISTS_ERROR.value,
					USER_ALREADY_EXISTS_ERROR.statusCode
				)
			);
		} else {
			return next(
				new HttpError(
					USER_INACTIVE_ERROR.value,
					USER_INACTIVE_ERROR.statusCode
				)
			);
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
			const error = dbErrorHandler(err, SERVER_ERROR.statusCode);
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
		return next(new HttpError(SERVER_ERROR.value, SERVER_ERROR.statusCode));
	}

	res.status(201).json({
		success: true,
		message: SIGNUP_SUCCESS,
	});
};

const activateController = async (req, res, next) => {
	let decodedToken;
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
				EXPIRED_TOKEN_ERROR.value,
				EXPIRED_TOKEN_ERROR.statusCode
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
		return next(new HttpError(SERVER_ERROR.value, SERVER_ERROR.statusCode));
	}

	// * ---- activate account
	if (user) {
		if (user.isActive) {
			return next(
				new HttpError(
					USER_ALREADY_ACTIVATED_ERROR.value,
					USER_ALREADY_ACTIVATED_ERROR.statusCode
				)
			);
		} else {
			try {
				user.isActive = true;
				await user.save();
			} catch (err) {
				const error = dbErrorHandler(err, SERVER_ERROR.statusCode);
				return next(error);
			}
		}
	} else {
		return next(
			new HttpError(
				USER_DOESNT_EXIST_ERROR.value,
				USER_DOESNT_EXIST_ERROR.statusCode
			)
		);
	}

	res.status(200).json({
		success: true,
		message: ACTIVATION_SUCCESS,
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
				firstErrorMsg || INVALID_INPUT_DATA_ERROR.value,
				INVALID_INPUT_DATA_ERROR.statusCode
			)
		);
	}

	const { email } = req.body;

	// * ---- find user
	// -- check if user is already active
	let user;
	try {
		user = await User.findOne({ email: email });
	} catch (err) {
		return next(new HttpError(SERVER_ERROR.value, SERVER_ERROR.statusCode));
	}

	// * ---- activate account
	if (user) {
		if (user.isActive) {
			return next(
				new HttpError(
					USER_ALREADY_ACTIVATED_ERROR.value,
					USER_ALREADY_ACTIVATED_ERROR.statusCode
				)
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
				return new HttpError(
					SERVER_ERROR.value,
					SERVER_ERROR.statusCode
				);
			}
		}
	} else {
		return next(
			new HttpError(
				USER_DOESNT_EXIST_ERROR.value,
				USER_DOESNT_EXIST_ERROR.statusCode
			)
		);
	}

	res.status(200).json({
		success: true,
		message: SEND_ACTIVATION_EMAIL_SUCCESS,
	});
};

const signinController = async (req, res, next) => {
	// * ---- body validation
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const firstErrorMsg = errors.array().map((error) => error.msg)[0];
		return next(
			new HttpError(
				firstErrorMsg || INVALID_INPUT_DATA_ERROR.value,
				INVALID_INPUT_DATA_ERROR.statusCode
			)
		);
	}

	const { email, password } = req.body;

	// * ---- get user
	let user;
	try {
		user = await User.findOne({ email: email });
	} catch (err) {
		return next(new HttpError(SERVER_ERROR.value, SERVER_ERROR.statusCode));
	}

	// * check if user is active
	if (user) {
		let userIsActive = user.isActive;
		if (!userIsActive) {
			return next(
				new HttpError(
					USER_INACTIVE_ERROR.value,
					USER_INACTIVE_ERROR.statusCode
				)
			);
		}
	} else {
		return next(
			new HttpError(
				INVALID_CREDENTIALS_ERROR.value,
				INVALID_CREDENTIALS_ERROR.statusCode
			)
		);
	}

	// * ---- authenticate user
	let authenticatedUser;
	try {
		authenticatedUser = await user.validPasswords(password);
	} catch (err) {
		const error = dbErrorHandler(err, SERVER_ERROR.statusCode);
		return next(error);
	}

	if (!authenticatedUser) {
		return next(
			new HttpError(
				INVALID_CREDENTIALS_ERROR.value,
				INVALID_CREDENTIALS_ERROR.statusCode
			)
		);
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
		message: SIGNIN_SUCCESS,
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
			return next(
				new HttpError(SERVER_ERROR.value, SERVER_ERROR.statusCode)
			);
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
				return next(
					new HttpError(SERVER_ERROR.value, SERVER_ERROR.statusCode)
				);
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
					const error = dbErrorHandler(err, SERVER_ERROR.statusCode);
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
				message: SIGNIN_SUCCESS,
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
					role: user.role,
				},
				token,
			});
		} else {
			return next(
				new HttpError(SERVER_ERROR.value, SERVER_ERROR.statusCode)
			);
		}
	} else {
		return next(
			new HttpError(
				INVALID_INPUT_DATA_ERROR.value,
				INVALID_INPUT_DATA_ERROR.statusCode
			)
		);
	}
};

const signinFacebookController = async (req, res, next) => {
	const { userID, accessToken } = req.body;
	const url = `https://graph.facebook.com/v2.11/${userID}/?fields=id,name,email&access_token=${accessToken}`;
	let response;

	try {
		response = await fetch(url, { method: 'GET' });
	} catch (err) {
		return next(new HttpError(SERVER_ERROR.value, SERVER_ERROR.statusCode));
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
			return next(
				new HttpError(SERVER_ERROR.value, SERVER_ERROR.statusCode)
			);
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
				const error = dbErrorHandler(err, SERVER_ERROR.statusCode);
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
			message: SIGNIN_SUCCESS,
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
			token,
		});
	} else {
		return next(new HttpError(SERVER_ERROR.value, SERVER_ERROR.statusCode));
	}
};

const forgotPasswordController = async (req, res, next) => {
	// * ---- body validation
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const firstErrorMsg = errors.array().map((error) => error.msg)[0];
		return next(
			new HttpError(
				firstErrorMsg || INVALID_INPUT_DATA_ERROR.value,
				INVALID_INPUT_DATA_ERROR.statusCode
			)
		);
	}

	const { email } = req.body;

	// * ---- get user
	let user;
	try {
		user = await User.findOne({ email: email, isActive: true });
	} catch (err) {
		return next(new HttpError(SERVER_ERROR.value, SERVER_ERROR.statusCode));
	}

	if (!user) {
		return next(
			new HttpError(
				USER_DOESNT_EXIST_ERROR.value,
				USER_DOESNT_EXIST_ERROR.statusCode
			)
		);
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
		const error = dbErrorHandler(err, SERVER_ERROR.statusCode);
		return next(error);
	}

	// * ---- send reset password email
	try {
		await resetPassword({
			to: email,
			name: user.name || 'unknown user',
			resetPasswordHref: `${process.env.CLIENT_URL}/account/reset-password/${token}`,
		});
	} catch (err) {
		return new HttpError(SERVER_ERROR.value, SERVER_ERROR.statusCode);
	}

	res.status(200).json({
		success: true,
		message: SEND_RESET_PWD_EMAIL_SUCCESS,
	});
};
const resetPasswordController = async (req, res, next) => {
	// * ---- body validation
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const firstErrorMsg = errors.array().map((error) => error.msg)[0];
		return next(
			new HttpError(
				firstErrorMsg || INVALID_INPUT_DATA_ERROR.value,
				INVALID_INPUT_DATA_ERROR.statusCode
			)
		);
	}

	const { token, password } = req.body;

	// * ---- check token
	try {
		jwt.verify(token, process.env.JWT_SECRET_RESET_PASSWORD);
	} catch (err) {
		return next(
			new HttpError(
				EXPIRED_TOKEN_ERROR.value,
				EXPIRED_TOKEN_ERROR.statusCode
			)
		);
	}

	// * ---- find user
	let user;
	try {
		user = await User.findOne({ resetPasswordLink: token });
	} catch (err) {
		const error = dbErrorHandler(err, SERVER_ERROR.statusCode);
		return next(error);
	}

	if (!user) {
		return next(
			new HttpError(
				EXPIRED_TOKEN_ERROR.value,
				EXPIRED_TOKEN_ERROR.statusCode
			)
		);
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
		const error = dbErrorHandler(err, SERVER_ERROR.statusCode);
		return next(error);
	}

	res.status(200).json({
		success: true,
		message: PWD_CHANGED_SUCCESS,
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
