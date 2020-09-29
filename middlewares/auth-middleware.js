// libraries
const jwt = require('jsonwebtoken')

// my own imports
const HttpError = require('../helpers/http-error')

// -- config .env to ./config/config.env
require('dotenv').config({
	path: './config/config.env',
});

// -- middleware
module.exports = (req, res, next) => {
    if (req.method === 'OPTIONS') {
        // OPTIONS exists before each other request with other methods and check if specified endpoint exists
        return next()
    }
    try {
        const token = req.headers.authorization.split(' ')[1] // Authorization: 'Bearer TOKEN'
        if (!token) {
            throw new Error('Authentication failed')
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET)
        req.userData = {userId: decodedToken.userId}
        next()
    } catch(err) {
        const error = new HtppError('Authentication failed', 401)
        return next(error)
    }
}