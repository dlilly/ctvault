const _ = require('lodash')
const log = require('single-line-log').stdout

const CT = require('..')

let sleep = async(ms) => { return new Promise(resolve => setTimeout(resolve, ms)); }
let run = async () => {
    await sleep(1000)
    try {
        const ct = await CT.getClient()
        await ct.customers.process(async cust => {
            log(`Deleting customer [ ${cust.firstName} ${cust.lastName} ]...`)
            return await cust.delete()
        })
    } catch (error) {
        console.error(`Error: ${error}`)
    }
}

run()