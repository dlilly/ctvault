const _ = require('lodash')
const CT = require('..')

let sleep = async(ms) => { return new Promise(resolve => setTimeout(resolve, ms)); }
let run = async () => {
    try {
        const argv = require('yargs').argv
        const ctclient = CT.getClient(argv.project);

        let deleteProduct = async product => {
            console.log(`delete product [ ${product.id} ]...`)
            await sleep(200)
            return await ctclient.products.delete(product)
        }
        let processProduct = async payload => _.each(payload.body.results, deleteProduct)
        
        await ctclient.products.process(processProduct)
    } catch (error) {
        console.error(`Error: ${error}`)
    }
}

run()