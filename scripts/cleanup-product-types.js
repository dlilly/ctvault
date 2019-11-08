const _ = require('lodash')
const { getClient, getService } = require('../lib/ctclient');

let client = getClient()
let productTypesService = getService().productTypes

let ptRequest = {
    uri: productTypesService.where('key != "default"').build(),
    method: 'GET'
}

let deleteProductType = async productType => {
    console.log(`deleting product type [ ${productType.name} ]...`)

    let deletePTRequest = {
        uri: productTypesService.byId(productType.id).withVersion(productType.version).build(),
        method: 'DELETE'
    }

    return await client.execute(deletePTRequest)
}

let processProductType = async payload => _.each(payload.body.results, deleteProductType)

let run = async () => {
    await client.process(ptRequest, processProductType)
}

run()