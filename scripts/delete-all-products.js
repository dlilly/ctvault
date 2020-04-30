const _ = require('lodash')
const log = require('single-line-log').stdout

const CT = require('..')

let sleep = async(ms) => { return new Promise(resolve => setTimeout(resolve, ms)); }
let run = async () => {
    await sleep(1000)
    try {
        const ct = await CT.getClient()
        await ct.products.process(async prod => {
            log(`Deleting product [ ${prod.key} ]...`)
            let updated = await ct.products.update(prod, [ct.actions.product.unpublish])
            await ct.products.delete(updated)
            await sleep(200)
        })
    } catch (error) {
        console.error(`Error: ${error}`)
    }
}

run()