// node libs
const _ = require('lodash')
const admin = require('firebase-admin')

// local libs
const Vault = require('./vault')

class FirebaseVault extends Vault {
    async setup() {
        admin.initializeApp({
            credential: admin.credential.cert(this.config.credentials)
        });
        this.db = admin.firestore();
        this.query = this.db.collection(this.config.collection)
        this.query.onSnapshot(this.refresh.bind(this))
    }

    async refresh() {
        let snapshot = await this.query.get()
        let credentials = _.map(snapshot.docs, doc => doc.data())
        _.each(credentials, cred => {
            cred.projectKey = cred.project
        })
        await this.setCredentials(credentials)
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