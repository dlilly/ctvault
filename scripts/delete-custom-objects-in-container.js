const _ = require('lodash')
const log = require('single-line-log').stdout

const CT = require('..')
const yargs = require('yargs')

let sleep = async(ms) => { return new Promise(resolve => setTimeout(resolve, ms)); }
let run = async () => {
    try {
        const ct = await CT.getClient()
        await ct.customObjects.process(async co => {
            if (co.container === yargs.argv.container) {
                log(`Deleting custom object [ ${co.id} ]...`)
                await ct.customObjects.delete(co)
                await sleep(200)
            }
        })
    } catch (error) {
        console.error(`Error: ${error}`)
    }
}

run()