const mongoose = require('mongoose');
const crypto = require('crypto');
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;
const userSchema = new Schema(
	{
		name: {
			type: String,
			trim: true,
			required: [true, 'is required'],
		},
		email: {
			type: String,
			trim: true,
			required: [true, 'is required'],
			match: [/\S+@\S+\.\S+/, 'is invalid'],
			unique: true,
			lowercase: true,
			index: true,
		},
		hashed_password: {
			type: String,
			required: [true, 'is required'],
			minlength: 6,
		},
		salt: String,
		role: {
			type: String,
			default: 'user',
		},
		resetPasswordLink: {
			type: String,
			default: '',
		},
	},
	{ timestamps: true }
);

// -- virtual fields
userSchema
	.virtual('password')
	.set(function (password) {
		this._password = password;
		this.salt = this.makeSalt();
		this.hashed_password = this.encryptPassword(password);
	})
	.get(function () {
		return this._password;
	});

// -- methods
userSchema.methods = {
	// generate salt
	makeSalt: function () {
		return crypto.randomBytes(16).toString('hex');
	},

	// encrypt password
	encryptPassword: function (password) {
		if (!password) return '';
		try {
			return crypto
				.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512')
				.toString('hex');
		} catch (err) {
			return '';
		}
	},

	// compare passwords
	validPassword: function (password) {
		return this.encryptPassword(password) === this.hashed_password;
	},
};

userSchema.plugin(uniqueValidator, { message: 'is already taken.' });

module.exports = mongoose.model('User', userSchema);
