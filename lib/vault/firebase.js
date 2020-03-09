// node libs
const _ = require('lodash')
const admin = require('firebase-admin')

// local libs
const Vault = require('./vault')

class FirebaseVault extends Vault {
    async setup() {
        console.log(`firebase setup START`)
        admin.initializeApp({
            credential: admin.credential.cert(this.config.credentials)
        });
        this.db = admin.firestore();
        this.query = this.db.collection(this.config.collection)
        this.query.onSnapshot(this.refresh.bind(this))
        console.log(`firebase setup END`)
    }

    async refresh() {
        console.log(`firebase refresh START`)
        let snapshot = await this.query.get()
        let credentials = _.map(snapshot.docs, doc => doc.data())
        _.each(credentials, cred => {
            cred.projectKey = cred.project
        })
        await this.setCredentials(credentials)
        console.log(`firebase refresh END`)
    }

    async saveCredential(credential) {
        let saved = await this.query.doc(credential.project).set(credential)
        await this.refresh()
        return saved
    }

    async deleteCredential(credential) {
        await this.refresh()
        return credential
    }
}

module.exports = FirebaseVault