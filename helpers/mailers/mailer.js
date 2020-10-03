const sgMail = require('@sendgrid/mail');
const defaultMsgData = require('../../config/sendgrid');

exports.send = async (options) => {
    Object.assign(defaultMsgData, {
        to: options.to,
        subject: options.subject,
        html: options.html
    })

    return await sgMail.send(defaultMsgData)
}