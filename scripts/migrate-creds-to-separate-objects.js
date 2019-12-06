const CT = require('..')
const _ = require('lodash')

let run = async() => {
    let ctclient = await CT.getClient('us-demo-infra')
    let creds = await ctclient.customObjects.get({ container: "config", key: "credentials" })

    _.each(creds, async cred => {
        if (!cred.disabled) {
            let obj = {
                value: cred,
                container: 'credentials',
                key: cred.project
            }

            await ctclient.customObjects.post(obj)
            console.log(`Created credential for project [ ${cred.project} ]`)
        }
    })
}

run()