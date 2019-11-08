const _ = require('lodash')

const yargs = require('yargs')
const fromProject = yargs.argv.from
const toProject = yargs.argv.to

let run = async() => {
    const fromClient = await require('../lib/ctclient')(fromProject)
    const toClient = await require('../lib/ctclient')(toProject)

    var categories = []
    await fromClient.categories.process(cat => {
        categories.push(cat.body.results)
    })
    categories = _.flatten(categories)

    var topLevelCategories = _.filter(categories, cat => cat.ancestors.length == 0)
    var nonTopLevelCategories = _.filter(categories, cat => cat.ancestors.length > 0)

    _.each(categories, c => {
        // c.children = _.filter(categories, cat => cat.parent && cat.parent.id === c.id)
        // console.log(`category ${c.id} has ${c.children.length} children and ${c.ancestors.length} parents`)
        if (c.ancestors.length > 0) {
            var parent = _.first(_.filter(categories, cat => cat.id === c.parent.id))
            parent.children = parent.children || []
            parent.children.push(c)
            c.parent = { type: 'category', key: parent.key }
        }
    })

    _.each(topLevelCategories, async top => {
        console.log(`Creating category [ ${top.key} ]...`)
        await toClient.categories.create(top)
    })

    _.each(nonTopLevelCategories, async cat => {
        console.log(`Creating category [ ${cat.key} ]...`)
        await toClient.categories.create(cat)
    })
}
run()