const mailer = require('./mailer');

exports.accountActivation = (options) => {
	const defaultOptions = {
		subject: 'Activate your account',
        html: `
            <center><h1>Hello ${options.name}!</h1></center>
            <p>Click on the <strong><a href="${options.activationHref}">link</a></strong> to activate your account</p>
            <hr/>
            <h2>Warning!</h2>
            <p>If you received this email and you did not take any actions associated with your account, you should <a href="${options.resetPasswordHref}">change your password</a>.</p>
        `,
	};
	return mailer.send(Object.assign(defaultOptions, options));
};

exports.resetPassword = (options) => {
	const defaultOptions = {
		subject: 'Reset your password',
        html: `
            <center><h1>Hello ${options.name}!</h1></center>
            <p>Click on the <strong><a href="${options.resetPasswordHref}">link</a></strong> to set your new password.</p>
            <hr/>
            <h2>Warning!</h2>
            <p>If you received this email and you did not take any actions associated with your account, you should change your credentials.</p>
        `,
	};
	return mailer.send(Object.assign(defaultOptions, options));
};
