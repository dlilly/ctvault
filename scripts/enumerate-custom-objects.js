const _ = require('lodash')
const CT = require('..')

let run = async () => {
    try {
        let cts = CT.getClients()
        _.each(cts, async ct => {
            let projectKey = ct.getProject()
            let customObjects = await ct.customObjects.get()
            console.log(`${projectKey}\n\n`)

            _.each(customObjects, obj => {
                console.log(`container [ ${obj.container} ], key [ ${obj.key} ]`)
                console.log(JSON.stringify(obj.value, '', 4) + "\n")
            })
        })
    } catch (error) {
        console.error(`Error: ${error}`)
    }
}

run()