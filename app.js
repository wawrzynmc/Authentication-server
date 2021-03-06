// -- libraries imports
const express = require('express');
const cron = require('node-cron');
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// -- my own imports
const accountRoutes = require('./routes/account-routes');
const HttpError = require('./helpers/http-error');
const connectMongoo = require('./config/connect-mongo');
const { SERVER_ERROR } = require('./helpers/codes/error-codes');
const User = require('./models/user-model');

// -- config .env to ./config/config.env
require('dotenv').config({
	path: './config/config.env',
});

// -- create app
const app = express();

// -- swagger configuration
const swaggerOptions = {
	swaggerDefinition: {
		openapi: '3.0.0',
		components: {},
		info: {
			version: '1.0.0',
			title: 'Authentication API',
			contact: {
				name: 'Karol',
				email: 'karol.wawrzenczyk@gmail.com',
			},
			servers: [
				{
					url: 'http://localhost:5000',
					description: 'Development server',
				},
			],
		},
	},
	apis: ['./routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// -- config for development
if (process.env.NODE_ENV === 'development') {
	app.use(morgan('dev')); // return information about each request
} 

// allow for requests only from client
app.use(
	cors({
		origin: process.env.CLIENT_URL,
		methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
		credentials: true, // allow session cookie from browser to pass through
	})
);

// -- BODY PARSER MIDDLEWARE
// ---- convert any json to js and call next()
app.use(bodyParser.json());

// -- ROUTES MIDDLEWARES
app.use('/api/account', accountRoutes);
// ---- swagger route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use((req, res, next) => {
	const error = new HttpError('Could not find this route.', 404);
	throw error;
});

// -- ERROR MIDDLEWARE
app.use((error, req, res, next) => {
	const status = error.code || SERVER_ERROR.statusCode;
	const message = error.message || SERVER_ERROR.value;
	const data = error.data;
	res.status(status).json({
		success: false,
		message: message,
		data: data,
		status: status,
	});
});

// -- connect to Database
connectMongoo();

// -- scheduler run (clear db from inactive users)
cron.schedule('0 0 * * *', async function () {
	try {
		await User.deleteMany({ isActive: false })
	} catch (error) {
		console.log(error)
    }
});

// start app
app.listen(process.env.PORT || 5000, () =>
	console.log(`Server run on port ${process.env.PORT}`)
);
