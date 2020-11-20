const mongoose = require('mongoose');

const connectMongo = async () => {
	try {
		const connection = await mongoose.connect(
			`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xmkiy.mongodb.net/${process.env.DB_NAME}`,
			{
				useNewUrlParser: true,
				useCreateIndex: true,
				useFindAndModify: false,
				useUnifiedTopology: true,
				autoIndex: false,
			}
		);

		console.log(`MongoDB Connected: ${connection.connection.host}`);
	} catch (err) {
		console.log(err);
	}
};

module.exports = connectMongo;
