const _ = require('lodash')
const { getClient, getService } = require('../lib/ctclient');

let client = getClient()
let productTypesService = getService().productTypes

let productTypesRequest = {
    uri: productTypesService.build(),
    method: 'GET'
}

let deleteProductType = async productType => {
    console.log(`deleting productType [ ${productType.id} ]...`)

    let deleteProductTypeRequest = {
        uri: productTypesService.byId(productType.id).withVersion(productType.version).build(),
        method: 'DELETE'
    }

    return await client.execute(deleteProductTypeRequest)
}

let processProductType = async payload => _.each(payload.body.results, deleteProductType)

let run = async () => {
    await client.process(productTypesRequest, processProductType)
}

run()