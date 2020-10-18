// Validations helpers
const { check } = require('express-validator');

exports.signupValidator = [
	check('name', 'Name is required.')
		.trim()
		.notEmpty()
		.withMessage('Name is required.')
		.bail()
		.isLength({
			min: 4,
			max: 32,
		})
		.withMessage('Name must be between 4 to 32 characters.')
		.bail()
		.custom((value) => /^[A-Za-z]+$/.test(value))
		.withMessage('Name has to contain only alphabetical characters.'),
	check('email')
		.normalizeEmail()
		.isEmail()
		.withMessage('Invalid email address.'),
	check('password1')
		.notEmpty()
		.withMessage('Password is required.')
		.bail()
		.isLength({
			min: 6,
			max: 100,
		})
		.withMessage('Password must contain at least 6 characters.'),
	check('password2')
		.notEmpty()
		.withMessage('Password confirmation is required.')
		.bail()
		.custom((value, { req }) => value === req.body.password1)
		.withMessage('Password and password confirmation have to match.'),
];

exports.signinValidator = [
	check('email')
		.normalizeEmail()
		.isEmail()
		.withMessage('Must be a valid email address'),
	check('password', 'password is required').notEmpty(),
	check('password')
		.isLength({
			min: 6,
		})
		.withMessage('Password must contain at least 6 characters')
];

exports.emailValidator = [
	check('email')
		.normalizeEmail()
		.isEmail()
		.withMessage('Must be a valid email address'),
];

exports.resetPasswordValidator = [
	check('password')
		.not()
		.isEmpty()
		.withMessage('Password can not be empty')
		.isLength({ min: 6 })
		.withMessage('Password must be at least  6 characters long'),
];
