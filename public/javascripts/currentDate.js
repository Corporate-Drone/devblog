const today = new Date();

const date = (today.getMonth() + 1) + '-' + today.getDate() + '-' + today.getFullYear();

module.exports = date;