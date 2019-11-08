const chalk = require('chalk')
const moment = require('moment')

let log = (message, color) => console.log(`${moment().format()} ${chalk[color](message)}`)
module.exports = {
    info: message => log(message, 'green'),
    debug: message => log(message, 'yellow'),
    error: message => log(message, 'red')
}