const CT = require('..')

let run = async() => {
  try {
    const ct = await CT.getClient()
    let products = await ct.products.get()
    console.log(`custom ${JSON.stringify(products)}`)      
  } catch (error) {
    console.error(error)
  } finally {
    process.exit(0)
  }
}
run()