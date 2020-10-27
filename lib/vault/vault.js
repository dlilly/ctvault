// third party node libs
const _ = require('lodash')
const async = require('async')

// local node libs
const factory = require('../ct_factory')

const urlMapping = {
    "https://api.sphere.io": "EU",
    "https://api.europe-west1.gcp.commercetools.com": "EU",
    "https://api.commercetools.co": "US",
    "https://api.us-central1.gcp.commercetools.com": "US"
}

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
        return _.first(_.filter(this.clients, client => client.projectKey === projectKey))
    }

    async hasClient(projectKey) { 
        return _.first(_.filter(this.clients, client => client.projectKey === projectKey)) 
    }

    async getClients() {
        return _.map(this.clients, client => ({
            projectKey: client.projectKey,
            region: urlMapping[client.credential.api_url]
        }))
    }

    async setCredentials(credentials) {
        this.clients = await Promise.all((Array.isArray(credentials) ? credentials : Object.values(credentials)).map(async cred => {
            let value = cred.value || cred
            let client = await factory.createCTPClient(value)
            client.credential = value
            return client
        }))
    }

    async saveCredential(credential) { console.error(`Implement saveCredential()`) }
    async deleteCredential(credential) { console.error(`Implement deleteCredential()`) }
}

module.exports = Vault