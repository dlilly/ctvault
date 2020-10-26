const CT = require('..')

let run = async() => {
    const ct = await CT.getClient()

    const customObject = await ct.customObjects.ensure({
        container: 'container',
        key: 'key',
        value: {
            foo: 'bar'
        }
    })

    console.log(`customObject ${JSON.stringify(customObject)}`)

    // const serviceProductType = await ct.productTypes.ensure(constants.dataModel.serviceProductType)
}
run()