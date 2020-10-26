const Vault = require('./vault')

class FileVault extends Vault {
    async refresh() {
        await this.setCredentials(this.config.credentials)
    }
}

module.exports = FileVault