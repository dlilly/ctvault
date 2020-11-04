const _ = require('lodash')

const CT = require('..')

let run = async() => {
    let ct = await CT.getClient('sales-playground')
    let x = `string description`
    let localized_x = ct.functions.localize(x)
    console.log(`localized x: ${JSON.stringify(localized_x)}`)
}
run()