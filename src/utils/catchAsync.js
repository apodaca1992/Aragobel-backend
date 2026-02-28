// utils/catchAsync.js
module.exports = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next); // Si la promesa falla, next(error) lo captura
    };
};