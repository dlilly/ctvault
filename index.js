const _ = require('lodash')
const fs = require('fs-extra')

// local libs
const config = require('./lib/config')
const logger = require('./lib/logger')
global.logger = global.logger || logger

let vault = null

let ensureVault = async () => {
    const vaultConfigPath = config.get('CT_VAULT_CONFIG')
    if (!vaultConfigPath) {
        console.error(`Error: CT_VAULT_CONFIG environment variable not set`)
        process.exit(0)
    }

    if (!vault) {
        const vaultConfig = fs.readJSONSync(vaultConfigPath)

        try {
            const Vault = require(`./lib/vault/${vaultConfig.type}`)
            vault = new Vault(vaultConfig)
            await vault.init()
        } catch (error) {
            logger.error(`Error creating vault with type [ ${vaultConfig.type} ]: ${error}`)
            logger.error(error.stack)
        }
    }

    return vault
}

let getProjectKey = (projectKey) => {
    // if we were passed in a project key on the command line (ie from a script) then use that
    let pk = projectKey || config.get('project')

    if (!pk) {
        throw new Error(`Usage error: please specify project key with --project=<project>`)
    }

    return pk
}

module.exports = {
    hasClient: async projectKey => (await ensureVault()).hasClient(getProjectKey(projectKey)),
    getClient: async projectKey => (await ensureVault()).getClient(getProjectKey(projectKey)),
    getClients: async () => (await ensureVault()).getClients(),

    saveCredential: async credential => (await ensureVault()).saveCredential(credential),
    deleteCredential: async credential => (await ensureVault()).deleteCredential(credential)
}