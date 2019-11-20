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
        const vaultConfig = require(vaultConfigPath)

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
        console.error(`Usage error: please specify project key with --project=<project>`)
        process.exit(0)
    }

    return pk
}

module.exports = {
    getClient: async projectKey => (await ensureVault()).getClient(getProjectKey(projectKey)),
    getClients: async () => (await ensureVault()).getClients(),

    saveCredential: credential => {},
    deleteCredential: credential => {},

    actions: require('./lib/actions')
}