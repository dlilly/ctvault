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

    let productType = await ct.productTypes.ensure({
        key: 'test',
        name: 'test',
        description: 'test'
    })

    console.log(JSON.stringify(productType))

    let deletedProductType = await productType.delete()

    console.log(JSON.stringify(deletedProductType))

    // let product = await ct.products.create({
    //     name: ct.functions.localize('CoolBox')
    // })

    // const serviceProductType = await ct.productTypes.ensure(constants.dataModel.serviceProductType)
}
run()