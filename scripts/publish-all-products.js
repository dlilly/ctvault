const CT = require('..')

let run = async () => {
    try {
        const ct = await CT.getClient()
        let product = await ct.products.get({ key: 'coolbox' })
        // await ct.products.process(async prod => await ct.products.update(prod, [CT.actions.product.publish]))

        await ct.products.applyActions(product, [CT.actions.product.publish])
        // await ct.products.run(async prod => console.log(`prod ${JSON.stringify(prod)}`))
    } catch (error) {
        console.error(`Error: ${error}`)
    }
}

run()