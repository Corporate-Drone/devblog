const today = new Date();

module.exports.date = (today.getMonth() + 1) + '-' + today.getDate() + '-' + today.getFullYear();

module.exports.currentYear = today.getFullYear();