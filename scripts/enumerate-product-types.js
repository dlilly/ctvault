const _ = require('lodash')
const CT = require('..')

let run = async () => {
    try {
        let cts = await CT.getClients()
        _.each(cts, async ct => {
            let customTypes = await ct.productTypes.get()
            console.log(`${ct.project}\n\n`)

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