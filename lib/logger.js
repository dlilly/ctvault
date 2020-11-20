const chalk = require('chalk')
const moment = require('moment')
const Logger = require('js-logger')

const colorMap = {
    INFO: 'green',
    DEBUG: 'cyan',
    WARN: 'yellow',
    ERROR: 'red',
}

Logger.useDefaults({
    defaultLevel: Logger.DEBUG,
    formatter: function (messages, context) {
        let message = messages.shift()
        let color = colorMap[context.level.name]
        messages.unshift(chalk[color](message))
        messages.unshift(chalk.gray(moment().format()))
    }
})

module.exports = Logger