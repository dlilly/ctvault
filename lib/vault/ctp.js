// node libs
const _ = require('lodash')

// local libs
const factory = require('../ct_factory')
const Vault = require('./vault')

class CTPVault extends Vault {
    async setup() {
        this.ct = await factory.createCTPClient(this.config.credentials)
    }

    async refresh() {
        const where = [`container="${this.config.key}"`];
        let credentials = await this.ct.customObjects.get({ where })
        await this.setCredentials(credentials)
    }

    async saveCredential(credential) {
        let credentialDraft = {
            container: this.config.key,
            key: credential.project,
            value: credential
        }
        let cred = await this.ct.customObjects.post(credentialDraft)
        await this.refresh()
        return cred
    }

    async deleteCredential(credential) {
        let cred = await this.ct.customObjects.get({ container: this.config.key, key: credential.key })
        await this.ct.customObjects.delete(cred)
        
        await this.refresh()
        return cred
    }
}

module.exports = CTPVault