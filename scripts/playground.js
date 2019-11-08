const CT = require('..')

let run = async() => {
  try {
    const ct = await CT.getClient()
    let project = await ct.taxCategories.get({ key: 'standard' })
    console.log(`prods ${JSON.stringify(project)}`)      
  } catch (error) {
    console.error(error)
  } finally {
    process.exit(0)
  }
}
run()