const CT = require('.')

it('tests', async () => {
    let ct = await CT.getClient()
    console.log(`ct ${ct}`)
})