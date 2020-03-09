const chalk = require('chalk')
const moment = require('moment')

let log = (message, tag, color) => console.log(`${moment().format()} ${chalk[color](`[ ${tag} ]`)} ${chalk[color](message)}`)

module.exports = {
    info:   message => log(message, 'inf', 'green'),
    debug:  message => log(message, 'dbg', 'cyan'),
    warn:   message => log(message, 'wrn', 'yellow'),
    error:  message => log(message, 'err', 'red')
}