// 3rd party libs
const _ = require('lodash')

// local libs
const { time, getCTBaseClient, getRB } = require('./util')

const rbKeys = ['expand', 'id', 'key', 'customerId', 'cartId', 'sort', 'page', 'perPage', 'staged', 'priceCurrency',
    'priceCountry', 'priceCustomerGroup', 'priceChannel', 'text', 'fuzzy', 'fuzzyLevel', 'markMatchingVariants', 'facet', 'filter', 'filterByQuery', 'filterByFacets', 'searchKeywords', 'where', 'whereOperator', 'version', 'country', 'currency', 'state', 'dataErasure', 'withTotal', 'applyOrderEditTo', 'container', 'orderNumber'];

const createCTPClient = async ctpenv => {  
    const client = getCTBaseClient(ctpenv)
    const ct = getRB(ctpenv)

    _.each(Object.keys(ct), key => {
        let type = ct[key]

        // for each key on the object (products, categories, etc), assign it the default
        // methods if it has not already overridden them

        let doRequest = (requestOpts = {}) => async (rbOpts = {}) => {
            requestOpts.method = requestOpts.method || 'GET'
            return await time(`${requestOpts.method} ${key}`, async () => {
                let uri = getRB(ctpenv)[key].parse(rbOpts).build()

                // console.log(`uri ${uri}`)

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
    
                    let statsBody = {
                        limit: result.body.limit,
                        offset: result.body.offset,
                        total: result.body.total,
                        count: result.body.count,
                        results: body
                    }
                    return requestOpts.includeStats ? statsBody : body
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
        }

        type.read = doRequest()
        type.readWithStats = doRequest({ includeStats: true })
        type.create = async (obj, rbOpts) => await doRequest({ method: 'POST', body: obj })(rbOpts)

        // ensure checks to see if the specified object exists in the store.  if not, it creates it.  either way, it returns the object
        type.ensure = async (obj) => await type.read({ key: obj.key }) || await type.create(obj)

        type.update = async (obj, actions) => {
            await type.post({
                version: obj.version,
                actions
            }, { 
                id: obj.id 
            })
            return await type.read({ id: obj.id, expand: obj.expand })
        }

        type.delete = doRequest({ method: 'DELETE' })

        // type.get is now deprecated in favor of type.read
        type.get = async (obj, opts) => await type.read(_.merge(obj, opts))

        // type.post is now deprecated in favor of type.create
        type.post = type.create

        type.process = async (fn, opts = {}) => {
            await client.process({
                uri: getRB(ctpenv)[key].parse(opts).build(),
                method: 'GET'
            }, async payload => {
                return await Promise.all(payload.body.results.map(async (result) => {
                    result.delete = () => type.delete({ id: result.id, version: result.version })
                    result.update = actions => doRequest({ method: 'POST', body: {
                        version: result.version,
                        actions
                    }}, {
                        id: result.id
                    })
                    return await fn(result)
                }))
            }, opts)
        }

        type.all = async (opts) => {
            opts = opts || {}

            let results = []
            await type.process(async obj => {
                results.push(obj)
            }, opts)

            let statsBody = {
                limit: results.count,
                offset: 0,
                total: results.count,
                count: results.count,
                results
            }
            return opts.includeStats ? statsBody : results
        }
    })

    ct.functions = {
        // localize: str => _.assign({}, ct.projectMetadata.languages.map(lang => ({ [lang]: str })))
        localize: str => {
            let localized = {}
            _.each(ct.projectMetadata.languages, lang => {
                localized[lang] = str
            })
            return localized
        }
    }

    const pluralize = require('pluralize');
    ct.findMatchingMethod = key => _.first(_.filter(Object.keys(ct), k => {
        let normalizedKey = key.replace(/-/g, '')
        let pluralizedKey = pluralize(normalizedKey)
        return levenshtein(normalizedKey, k) === 1 || levenshtein(pluralizedKey, k) === 1 || k === pluralize(normalizedKey)
    }))

    ct.projectMetadata = await ct.project.read()
    ct.projectKey = ctpenv.project
    ct.actions = require('./actions')(ct)
    ct.getEnvLocal = () => `
        VUE_APP_CT_PROJECT_KEY=${ctpenv.project}
        VUE_APP_CT_CLIENT_ID=${ctpenv.client_id}
        VUE_APP_CT_CLIENT_SECRET=${ctpenv.client_secret}
        VUE_APP_CT_SCOPE=${ctpenv.scopes}
        VUE_APP_CT_AUTH_HOST=${ctpenv.oauth_url}
    `

    return ct
}

module.exports = {
    createCTPClient
}