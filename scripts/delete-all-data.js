const _ = require('lodash')
const CT = require('..')

let deleteResourcesForDataType = async dataType => {
    console.log(`Deleting resources for data type [ ${dataType} ]...`)
    await ct[dataType].process(async data => {
        console.log(`\tDeleting ${dataType} [ ${data.id} ]...`)
        return await data.delete()
    })
    console.log(`Deleted all resources for data type [ ${dataType} ].`)
}

let deleteProducts = async () => {
    console.log(`Unpublishing products...`)
    await ct.products.process(async data => {
        try {
            console.log(`\tUnpublishing product [ ${data.key} ]...`)
            return await ct.products.update(data, [ct.actions.product.unpublish])
        } catch (error) {
            console.log(JSON.stringify(error))            
        }
    })
    console.log(`Unpublished all products.`)

    await deleteResourcesForDataType('products')
}

let run = async () => {
    try {
        global.ct = await CT.getClient()

        await deleteResourcesForDataType('carts')
        await deleteResourcesForDataType('orders')
        await deleteResourcesForDataType('customers')

        // products before customer groups
        await deleteProducts()

        await deleteResourcesForDataType('customerGroups')
        await deleteResourcesForDataType('customObjects')
        await deleteResourcesForDataType('stores')
    } catch (error) {
        console.error(`Error: ${error}`)
    }
}

run()