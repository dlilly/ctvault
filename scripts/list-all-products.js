const _ = require('lodash')
const log = require('single-line-log').stdout

const CT = require('..')

let sleep = async(ms) => { return new Promise(resolve => setTimeout(resolve, ms)); }
let run = async () => {
    try {
        const ct = await CT.getClient()
        // await ct.products.process(async product => {
        //     console.log(`Product: [ ${product.id} ]...`)
        // })

        const products = await ct.products.read()
        console.log(`Products: ${products.length}`)
    } catch (error) {
        console.error(`Error: ${error}`)
    }
}

run()