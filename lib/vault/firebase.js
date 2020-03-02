// node libs
const _ = require('lodash')
const admin = require('firebase-admin')

// local libs
const Vault = require('./vault')

class FirebaseVault extends Vault {
    async setup() {
        let serviceAccount = require(this.config.credentials);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
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
}

module.exports = FirebaseVault