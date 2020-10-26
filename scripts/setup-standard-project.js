const _ = require('lodash')

const CT = require('..')
const data = require('./data')

let run = async() => {
    const ct = await CT.getClient()

    let x = await Promise.all(Object.keys(data.schemas).map(async schemaKey => {
        let schemas = data.schemas[schemaKey]
        let api = ct[schemaKey]
        return await Promise.all(schemas.map(api.ensure))
    }))
    console.log(x)

    // const serviceProductType = await ct.productTypes.ensure(constants.dataModel.serviceProductType)
}
run()