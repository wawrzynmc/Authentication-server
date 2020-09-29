class HtppError extends Error {
    constructor(message, errorCode) {
        super(message); // add a 'message' property
        this.code = errorCode
    }
}

module.exports = HtppError