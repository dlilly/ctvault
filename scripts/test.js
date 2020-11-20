const _ = require('lodash')
const CT = require('..')

let run = async () => {
    try {
        const ct = await CT.getClient()
        let obj = await ct.taxCategories.ensure({
            name: "standardTaxCategory",
            description: "",
            rates: [{
                name: "standard",
                amount: 0.0,
                includedInPrice: false,
                country: "US",
                subRates: []
            }],
            key: "standard-tax-category"
        })
        logger.info(`created tax category: ${obj.key}`)

        let updated = await obj.update([{
            action: "changeName",
            name: "standardsAndPractices"
        }])
        logger.info(`updated tax category: ${updated.key}`)

        let deleted = await updated.delete()
        logger.info(`deleted tax category: ${deleted.key}`)
    } catch (error) {
        console.error(`Error: ${error}`)
    }
}

run()