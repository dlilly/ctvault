// 3rd party libs
const _ = require('lodash')

// local libs
const { time, getCTBaseClient, getRB } = require('./util')

const rbKeys = ['expand', 'id', 'key', 'customerId', 'cartId', 'sort', 'page', 'perPage', 'staged', 'priceCurrency',
    'priceCountry', 'priceCustomerGroup', 'priceChannel', 'text', 'fuzzy', 'fuzzyLevel', 'markMatchingVariants', 'facet', 'filter', 'filterByQuery', 'filterByFacets', 'searchKeywords', 'where', 'whereOperator', 'version', 'country', 'currency', 'state', 'dataErasure', 'withTotal', 'applyOrderEditTo', 'container', 'orderNumber'];

const createCTPClient = async ctpenv => {
    const client = getCTBaseClient(ctpenv)
    const ct = getRB({ projectKey: ctpenv.project })

    _.each(Object.keys(ct), key => {
        let type = ct[key]

        // for each key on the object (products, categories, etc), assign it the default
        // methods if it has not already overridden them

        let getRequestBuilder = getRB
        let doRequest = (requestOpts = {}) => async (rbOpts = {}) => await time(`${method} ${key}`, async () => {
            let uri = getRequestBuilder({ projectKey: ctpenv.project }).parse(rbOpts).build()
            try {
                let requestObject = {
                    uri,
                    method: requestOpts.method,
                    body: requestOpts.body
                }

                let result = await client.execute(requestObject)
                let body = (result.body && result.body.results) || (result.body && result.body.value) || result.body

                if (uri.indexOf('/custom-objects') > -1 && typeof body === 'object') {
                    body.customObjectId = result.body.id
                    body.customObjectKey = result.body.key
                    body.customObjectContainer = result.body.container
                }

                if (result.body.id && !body.id && typeof body === 'object') {
                    body.id = result.body.id
                    body.version = result.body.version
                }

                body.delete = () => type.delete({ id: body.id, version: body.version })
                body.update = actions => type.update(body, actions)

                return body
            } catch (error) {
                if (error.code === 404) {
                    return null
                }
                else if (error.message && error.message.indexOf('has expired') > -1) {
                    ct.expired = true
                }
                else {
                    // console.log(`Uncaught exception: ${uri}`)
                    throw error
                    // throw error
                    // logger.error(`Couldn't ${method} ${uri}: ${error}`)
                    // logger.error(JSON.stringify(error, '', 4))
                }
            }
            return null
        })

        type.read = doRequest({ method: 'GET' })
        type.create = async obj => await doRequest({ method: 'POST', body: obj })()

        // ensure checks to see if the specified object exists in the store.  if not, it creates it.  either way, it returns the object
        type.ensure = async (obj) => await type.read(obj) || await type.create(obj)

        type.update = async (obj, actions) => await type.post(_.merge(obj, {
            version: obj.version,
            actions
        }))

        type.delete = doRequest({ method: 'DELETE' })

        // type.get is now deprecated in favor of type.read
        type.get = async (obj, opts) => await type.read(_.merge(obj, opts))

        // type.post is now deprecated in favor of type.create
        type.post = type.create

        type.process = async (fn, opts = {}) => {
            await client.process({
                uri: getRequestBuilder(opts).build(),
                method: 'GET'
            }, async payload => await Promise.all(payload.body.results.map(await fn)), opts)
        }

        type.all = async (opts) => {
            opts = opts || {}
            opts.perPage = opts.perPage || 200

            let objs = []
            let index = 0
            await client.process({
                uri: getRequestBuilder(opts).build(),
                method: 'GET'
            }, async payload => {
                return await Promise.all(payload.body.results.map(o => {
                    index++
                    if (index % 100 === 0) {
                        if (!opts.silent) {
                            process.stdout.write('.')
                        }
                    }
                    objs.push(o)
                }))
            }, opts)
            return objs
        }
    })

    return ct
}

module.exports = {
    createCTPClient
}