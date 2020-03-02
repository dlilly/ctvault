// third party node libs
const _ = require('lodash')

// local node libs
const factory = require('../ct_factory')

class Vault {
    constructor(config) {
        this.clients = {}
        this.config = config
    }

    async init() {
        await this.setup()
        await this.refresh()
    }

    async setup() {
    }

    async refresh() {
    }

    async getClient(projectKey) {
        let client = _.first(_.filter(this.clients, client => client.projectKey === projectKey))
        if (client) {
            return client
        }
        else {
            throw new Error(`Client not found for project key [ ${projectKey} ]`)
        }
    }

    async hasClient(projectKey) { 
        return _.first(_.filter(this.clients, client => client.projectKey === projectKey)) 
    }

    async getClients() { 
        return this.clients
    }

    async setCredentials(credentials) {
        await Promise.all(credentials.map(async cred => {
            let value = cred.value || cred
            this.clients[value.project] = await factory.createCTPClient(value)
        }))
    }

    async saveCredential(credential) { console.error(`Implement saveCredential()`) }
    async deleteCredential(credential) { console.error(`Implement deleteCredential()`) }
}

module.exports = Vault