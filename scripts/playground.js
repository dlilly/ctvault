const CT = require('..')

let standa = {
  "name": "standa",
  "description": "foods",
  "rates": [
      {
          "name": "10% incl.",
          "amount": 0.1,
          "includedInPrice": true,
          "country": "US"
      }
  ],
  "key": "standa"
}

let run = async() => {
  try {
    const ct = await CT.getClient()
    let custom = await ct.taxCategories.update(standa)
    console.log(`custom ${JSON.stringify(custom)}`)      
  } catch (error) {
    console.error(error)
  } finally {
    process.exit(0)
  }
}
run()