const _ = require('lodash')
const lineReader = require('line-reader');

const yargs = require('yargs')
const projectKey = yargs.argv.project

let run = async() => {
    const ctclient = await require('../lib/ctclient')(projectKey)
    lineReader.eachLine('sku_cat_map.psv', async line => {
        var [itemMaster, cat] = line.split('|')
        try {
            var product = await ctclient.products.getByKey(itemMaster)
            var addToCategoryAction = {
                action: "addToCategory",
                category: { id: cat }
            }
            var publishAction = {
                action: "publish",
                scope: "All"
            }
            await ctclient.products.update(product, [addToCategoryAction, publishAction])
            console.log(`Added product [ ${product.key} ] to category [ ${cat} ]`)
        } catch (error) {
        }
    });
}
run()