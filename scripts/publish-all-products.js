const CT = require('..')

let run = async () => {
    try {
        const ct = await CT.getClient()
        await ct.products.process(async prod => await ct.products.update(prod, [CT.actions.product.publish]))
    } catch (error) {
        console.error(`Error: ${error}`)
    }
}

run()