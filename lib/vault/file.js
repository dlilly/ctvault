const Vault = require('./vault')

class FileVault extends Vault {
    refresh = async() => {
        this.setCredentials(this.config.credentials)
    }
}

module.exports = FileVault