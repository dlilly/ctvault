const _ = require('lodash')
const factory = require('../ct_factory')

class Vault {
    constructor(config) {
        this.clients = []
        this.config = config
    }

    init = async() => {
        await this.setup()
        await this.refresh()
    }

    setup = async() => {
    }

    refresh = async() => {
    }

    getClient = (projectKey) => {
        let client = _.first(_.filter(this.clients, client => client.project === projectKey))
        if (client) {
            return client
        }
        else {
            throw new Error(`Client not found for project key [ ${projectKey} ]`)
        }
    }

    getClients = () => this.clients

    setCredentials = credentials => {
        this.clients = _.map(credentials, factory.createCTPClient)
    }
}

module.exports = Vault