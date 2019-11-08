// node libs
const _ = require('lodash')
const admin = require('firebase-admin')

// local libs
const Vault = require('./vault')

class FirebaseVault extends Vault {
    setup = async() => {
        let serviceAccount = require(this.config.credentials);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        this.db = admin.firestore();
        this.query = this.db.collection(this.config.collection)
        this.query.onSnapshot(this.refresh)
    }

    refresh = async() => {
        let snapshot = await this.query.get()
        let credentials = _.map(snapshot.docs, doc => doc.data())
        this.setCredentials(credentials)
    }
}

module.exports = FirebaseVault