const _ = require('lodash')
const log = require('single-line-log').stdout

const CT = require('..')

let sleep = async(ms) => { return new Promise(resolve => setTimeout(resolve, ms)); }
let run = async () => {
    try {
        const ct = await CT.getClient()
        await ct.orders.process(async order => {
            log(`Deleting order [ ${order.id} ]...`)
            await ct.orders.delete(order)
            await sleep(200)
        })

        await ct.carts.process(async cart => {
            log(`Deleting cart [ ${cart.id} ]...`)
            await ct.carts.delete(cart)
            await sleep(200)
        })
    } catch (error) {
        console.error(`Error: ${error}`)
    }
}

run()