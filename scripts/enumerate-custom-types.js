const _ = require('lodash')
const CT = require('..')

let run = async () => {
    try {
        let cts = CT.getClients()
        _.each(cts, async ct => {
            let projectKey = ct.getProject()
            let customTypes = await ct.types.get()
            console.log(`${projectKey}\n\n`)

            _.each(customTypes, ct => {
                // console.log(`container [ ${obj.container} ], key [ ${obj.key} ]`)
                console.log(JSON.stringify(ct, '', 4))
            })
        })
    } catch (error) {
        console.error(`Error: ${error}`)
    }
}

run()