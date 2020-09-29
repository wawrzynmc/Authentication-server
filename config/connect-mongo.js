const mongoose = require('mongoose');

const connectMongo = async () => {
    try {
        const connection = await mongoose.connect(process.env.MONGO_URL, {
            // https://mongoosejs.com/docs/deprecations.html
            useNewUrlParser: true,
            useCreateIndex: true,
            useFindAndModify: false,
            useUnifiedTopology: true,
            autoIndex: false
        })
    
        console.log(`MongoDB Connected: ${connection.connection.host}`)
    } catch (err) {
        console.log(err)
    } 
}

module.exports = connectMongo