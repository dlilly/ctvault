const _ = require('lodash')
const async = require('async')

const factory = require('../ct_factory')

class Vault {
    constructor(config) {
        this.clients = {}
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
        let client = _.first(_.filter(this.clients, client => client.projectKey === projectKey))
        if (client) {
            return client
        }
        else {
            // console.log(`getClient(${projectKey})`)
            // _.each(this.clients, c => {
            //     console.log(`\t${c.projectKey}`)
            // })
            throw new Error(`Client not found for project key [ ${projectKey} ]`)
        }
    }

    hasClient = projectKey => _.first(_.filter(this.clients, client => client.projectKey === projectKey))

    getClients = () => this.clients

    setCredentials = async credentials => {
        _.each(credentials, cred => {
            this.clients[cred.project] = cred
        })

        let self = this
        await Promise.all(credentials.map(async cred => {
            let value = cred.value
            self.clients[value.project] = await factory.createCTPClient(value)
        }))
    }

    saveCredential = async credential => { console.error(`Implement saveCredential()`) }
    deleteCredential = async credential => { console.error(`Implement deleteCredential()`) }
}

module.exports = Vault