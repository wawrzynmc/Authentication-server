"use strict"
/*
    Custom error handler to get useful error from database (error handler)
*/
/*
    Get unique field name
*/

const HttpError = require('./http-error')
const {SERVER_ERROR} = require('./error-codes')

const uniqueMessage = error => {
    let output;
    try {
        let fieldName = error.message.split(".$")[1]
        field = field.split(" dub key")[0]
        field = field.substring(0, field.lastIndexOf("_"))
        req.flash("errors", [{
            message: `An account with this ${field} already exists`
        }])

        output = fieldName.charAt(0).toUpperCase() + fieldName.slice(1) + " already exists"
    } catch (err) {
        output = "already exists"
    }

    return output
}

/*
    Get the error message from error object
*/

exports.dbErrorHandler = (error, statusCode = 500) => {
    let message = ""
    if (error.code) {
        switch (error.code) {
            case 11000:
            case 11001:
                message = uniqueMessage(error)
                break;
            default:
                message: SERVER_ERROR
        }
    } else {
        for (let errorName in error.errors) {
            if (error.errors[errorName].message) {
                message = error.errors[errorName].message
            }
        }
    }

    return new HttpError(message, statusCode)
}
    
    