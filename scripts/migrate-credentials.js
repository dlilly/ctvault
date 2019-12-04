const CT = require('..')
const _ = require('lodash')
const admin = require('firebase-admin');

let run = async() => {
    let ctclient = await CT.getClient('us-demo-infra')
    let creds = _.first(await ctclient.customObjects.get({ container: "config", key: "credentials" }))

    let serviceAccount = require('/opt/googlecreds.json');

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    let db = admin.firestore();

    _.each(creds, cred => {
        if (!cred.disabled) {
            cred.scopes = [`manage_project:${cred.project}`]

            let docRef = db.collection('ctpcredentials').doc(cred.project);
            let x = docRef.set(cred);
        }
    })
}

run()