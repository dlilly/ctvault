const _ = require('lodash')
const log = require('single-line-log').stdout
const async = require('async')
const chalk = require('chalk')
const fs = require('fs')

const CT = require('..')

let sleep = async(ms) => { return new Promise(resolve => setTimeout(resolve, ms)); }
let run = async () => {
    try {
        const ct = await CT.getClient()

        let products = await ct.products.all()
        let errCount = 0
        let processedCount = 0
        await async.eachOfLimit(products, 50, async (prod, index, callback) => {
            try {
                log(`Unpublishing/deleting [ ${chalk.yellow(products.length)} ] products \t[ ${chalk.green(processedCount)} / ${chalk.red(errCount)} ]`)

                let updated = await ct.products.update(prod, [ct.actions.product.unpublish])
                await ct.products.delete(updated)

                processedCount++
                await sleep(200)
                callback()
            } catch (error) {
                errCount++
                fs.writeFileSync(`./errors/${prod.key}.json`, JSON.stringify(error))
                callback()
            }
        }, err => { })
    } catch (error) {
        console.error(`Error: ${JSON.stringify(error && error.body && error.body.errors || error)}`)
    }
}

run()