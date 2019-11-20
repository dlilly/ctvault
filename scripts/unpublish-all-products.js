const log = require('single-line-log').stdout

const CT = require('..')

let sleep = async(ms) => { return new Promise(resolve => setTimeout(resolve, ms)); }
let run = async () => {
    try {
        const ct = await CT.getClient()
        await ct.products.process(async prod => {
            log(`Unpublishing product [ ${prod.key} ]...`)
            await ct.products.update(prod, [CT.actions.product.unpublish])
            await sleep(200)
        })
    } catch (error) {
        console.error(`Error: ${error}`)
    }
}

run()