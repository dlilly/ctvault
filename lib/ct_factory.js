const _ = require('lodash')
const { createRequestBuilder } = require('@commercetools/api-request-builder')
const { createClient } = require('@commercetools/sdk-client');
const { createAuthMiddlewareForClientCredentialsFlow } = require('@commercetools/sdk-middleware-auth');
const { createHttpMiddleware } = require('@commercetools/sdk-middleware-http');
const fetch = require('node-fetch');
const levenshtein = require('js-levenshtein')

let time = async (op, fn) => {
    let start = new Date()
    let obj = await fn()

    if (op !== 'GET project') {
        logger.debug(`[ ${op} ] ${new Date() - start} ms`)
    }

    return obj
}

const rbKeys = ['expand', 'id', 'key', 'customerId', 'cartId', 'sort', 'page', 'perPage', 'staged', 'priceCurrency',
    'priceCountry', 'priceCustomerGroup', 'priceChannel', 'text', 'fuzzy', 'fuzzyLevel', 'markMatchingVariants', 'facet', 'filter', 'filterByQuery', 'filterByFacets', 'searchKeywords', 'where', 'whereOperator', 'version', 'country', 'currency', 'state', 'dataErasure', 'withTotal', 'applyOrderEditTo', 'container', 'orderNumber'];

const createCTPClient = async ctpenv => {
    const cache = {}

    const authMiddleware = createAuthMiddlewareForClientCredentialsFlow({
        host: ctpenv.oauth_url,
        projectKey: ctpenv.project,
        credentials: {
            clientId: ctpenv.client_id,
            clientSecret: ctpenv.client_secret,
        },
        scopes: ctpenv.scopes,
        fetch,
    })

    const httpMiddleware = createHttpMiddleware({ host: ctpenv.api_url, fetch })
    const client = createClient({ middlewares: [authMiddleware, httpMiddleware] })

    let ct = createRequestBuilder({ projectKey: ctpenv.project })
    _.each(Object.keys(ct), key => {
        let type = ct[key]

        // for each key on the object (products, categories, etc), assign it the default
        // methods if it has not already overridden them

        let getRequestBuilder = opts => {
            // console.log(`opts ${JSON.stringify(opts)}`)

            let rb = createRequestBuilder({ projectKey: ctpenv.project })[key]
            let {
                method,
                value,
                body,
                name,
                description,
                rates,
                ...parseableOpts
            } = opts

            rb = rb.parse(parseableOpts)

            // if (opts.version) {
            //     rb = rb.withVersion(opts.version)
            // }

            // if (opts.id) {
            //     rb = rb.byId(opts.id)
            // }

            // if (opts.limit) {
            //     rb = rb.perPage(opts.limit)
            // }

            // if (opts.cartId) {
            //     rb = rb.byCartId(opts.cartId)
            // }

            // if (opts.where) {
            //     rb = rb.where(opts.where)
            // }

            // if (opts.sort) {
            //     rb = rb.sort(opts.sort)
            // }

            // if (opts.expand) {
            //     // dal support multiple 'expand' parameters.  there appears to be a small bug in the CT JS sdk
            //     _.each(opts.expand, exp => {
            //         rb = rb.expand([exp])
            //     })
            // }

            return rb
        }

        let doRequest = (requestOpts = {}) => async (rbOpts = {}) => {
            // if (method === 'POST') {
            //     console.log(JSON.stringify(body))
            // }

            let method = requestOpts.method || 'GET'
            return await time(`${method} ${key}`, async () => {
                console.log(method)
                // console.log(`requestOpts ${JSON.stringify(requestOpts)}`)
                // console.log(`rbOpts ${JSON.stringify(rbOpts)}`)

                let rb = getRequestBuilder(rbOpts)
                let retryCount = rbOpts.retryCount || 0
                let uri = rb.build()

                if (requestOpts.cache && cache[uri]) {
                    return cache[uri]
                }

                try {
                    let requestObject = {
                        uri,
                        method,
                        body: requestOpts.body
                    }

                    console.log(JSON.stringify(requestObject))

                    // let start = Date.now()
                    let result = await client.execute(requestObject)
                    // let end = Date.now()
                    // console.log(`${uri} netreq ${end - start}`)

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

                    // type.update = async (obj, actions) => await type.post(_.merge(obj, {
                    //     version: obj.version,
                    //     actions
                    // }))

                    // type.delete = async obj => await type.do(_.merge(obj, { method: 'DELETE' }))

                    if (requestOpts.cache) {
                        cache[uri] = body
                    }

                    return body
                } catch (error) {
                    if (error.code === 404) {
                        return null
                    }
                    else if ((error.cause && error.cause.code === 'ECONNRESET') || (error.message && error.message.indexOf('ETIMEDOUT') > -1 || error.message.indexOf('ECONNRESET') > -1)) {
                        if (retryCount < 10) {
                            opts.retryCount = retryCount + 1
                            return await type.do(opts)
                        }
                        else {
                            error.retryCount = retryCount
                            throw error
                        }
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

        type.read = doRequest({ method: 'GET' })
        type.create = async obj => await doRequest({ method: 'POST', body: obj })()

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
            }, async payload => {
                return await Promise.all(payload.body.results.map(await fn))
            }, opts)
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

    ct.functions = {
        localize: (str, append_locale = false) => {
            var localized = {}
            _.each(ct.projectMetadata.languages, lang => {
                let s = append_locale ? `${str}-${lang}` : str
                localized[lang] = s
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

    ct.projectMetadata = await ct.project.get()
    ct.projectKey = ctpenv.project
    ct.actions = require('./actions')(ct)
    ct.getEnvLocal = () => `
        VUE_APP_CT_PROJECT_KEY=${ctpenv.project}
        VUE_APP_CT_CLIENT_ID=${ctpenv.client_id}
        VUE_APP_CT_CLIENT_SECRET=${ctpenv.client_secret}
        VUE_APP_CT_SCOPE=${ctpenv.scopes}
        VUE_APP_CT_AUTH_HOST=${ctpenv.oauth_url}
    `

    // host: ctpenv.oauth_url,
    // projectKey: ctpenv.project,
    // credentials: {
    //     clientId: ctpenv.client_id,
    //     clientSecret: ctpenv.client_secret,
    // },
    // scopes: ctpenv.scopes,

    return ct
}

module.exports = {
    createCTPClient
}