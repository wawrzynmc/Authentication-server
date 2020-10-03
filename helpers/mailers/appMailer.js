const mailer = require('./mailer');

exports.accountActivation = (options) => {
	const defaultOptions = {
		subject: 'Activate your account',
		html: `
            <h1>Click on the link to activate your account</h1>
            <p><a href="${options.href}">CLICK</a> to activate</p>
            <hr/>
        `,
    };
	return mailer.send(Object.assign(defaultOptions, options));
};
