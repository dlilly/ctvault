const _ = require('lodash')
const fs = require('fs-extra')

// local libs
const config = require('./lib/config')
global.logger = require('./lib/logger')
const { sleep } = require('./lib/util')
const factory = require('./lib/ct_factory')

let vault = null
let ensuringVault = false

let ensureVault = async () => {
    const vaultConfigPath = config.get('CT_VAULT_CONFIG')
    if (!vaultConfigPath) {
        logger.error(`Error: CT_VAULT_CONFIG environment variable not set`)
        return
        // process.exit(0)
    }

    while (ensuringVault) {
        await sleep(100)
    }

    if (!vault) {
        ensuringVault = true
        const vaultConfig = fs.readJSONSync(vaultConfigPath)

        try {
            const Vault = require(`./lib/vault/${vaultConfig.type}`)
            vault = new Vault(vaultConfig)
            await vault.init()    
            let clients = await vault.getClients()
            logger.info(`CT vault created with [ ${clients.length} ] projects`)
        } catch (error) {
            logger.error(`Error creating vault with type [ ${vaultConfig.type} ]: ${error}`)
            logger.error(error.stack)
        }
        ensuringVault = false
    }

    return vault
}

let getProjectKey = projectKey => {
    // if we were passed in a project key on the command line (ie from a script) then use that
    let pk = projectKey || config.get('project')

    if (!pk) {
        throw new Error(`Usage error: please specify project key with --project=<project>`)
    }

    return pk
}

let hasClient = async projectKey => (await ensureVault()).hasClient(getProjectKey(projectKey))
let getClient = async projectKey => (await ensureVault()).getClient(getProjectKey(projectKey))
let getClients = async () => (await ensureVault()).getClients()
let getClientFromConfig = async config => await factory.createCTPClient(config)

ensureVault()

module.exports = {
    hasClient,
    getClient,
    getClients,
    getClientFromConfig,

    saveCredential: async credential => (await ensureVault()).saveCredential(credential),
    deleteCredential: async credential => (await ensureVault()).deleteCredential(credential),

    middleware: {
        headers: async (req, res, next) => {
            let projectKey = req.headers['authorization'] || req.body.projectKey
            req.ct = projectKey && await getClient(projectKey)

            req.data = {
                params: {
                    ...req.query,
                    ...req.params
                },
                object: req.body.resource && req.body.resource.obj || req.body
            }

            next()
        }
    }
}