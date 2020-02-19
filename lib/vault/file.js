const Vault = require('./vault')

class FileVault extends Vault {
    async refresh() {
        this.setCredentials(this.config.credentials)
    }
}

module.exports = FileVault