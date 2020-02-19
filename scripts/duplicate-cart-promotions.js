const _ = require('lodash')
const log = require('single-line-log').stdout

const CT = require('..')

const fromProject = require('yargs').argv.project
const toProject = require('yargs').argv.toProject

let sleep = async(ms) => { return new Promise(resolve => setTimeout(resolve, ms)); }
let run = async () => {
    if (!fromProject || !toProject) {
        console.log(`Usage error: requires both source project (--project=<project>) and destination project (--to-project=<destination>)`)
        process.exit(1)
    }

    try {
        const source = await CT.getClient(fromProject)
        const dest = await CT.getClient(toProject)

        await source.cartDiscounts.process(async discount => {
            console.log(`discount: ${discount.name.en}`)
            console.log(`\tpred: ${discount.cartPredicate}`)
        })
    } catch (error) {
        console.error(`Error: ${error}`)
    }
}

run()