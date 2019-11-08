const _ = require('lodash')
const CT = require('..')

let sleep = async(ms) => { return new Promise(resolve => setTimeout(resolve, ms)); }
let run = async () => {
    const ct = await CT.getClient();
    try {
        let deleteCategory = async category => {
            console.log(`delete category [ ${category.id} ]...`)
            await sleep(200)
            return await ct.categories.delete(category)
        }
        let processCategory = async payload => _.each(payload.body.results, deleteCategory)
        
        await ct.categories.process(processCategory)
    } catch (error) {
        console.error(`Error: ${error}`)
    } finally {
        process.exit(0)
    }  
}

run()