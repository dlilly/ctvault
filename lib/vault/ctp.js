// node libs
const _ = require('lodash')

// local libs
const factory = require('../ct_factory')
const Vault = require('./vault')

class CTPVault extends Vault {
    setup = async() => {
        this.ct = await factory.createCTPClient(this.config.credentials)
    }

    refresh = async() => {
        this.setCredentials(_.first(await this.ct.customObjects.get({ container: this.config.namespace, key: this.config.key })).value)
    }
}

module.exports = CTPVault