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

        let getRequestBuilder = () => createRequestBuilder({ projectKey: ctpenv.project })[key]

        type.do = async (opts) => {
            // rb = getRequestBuilder(), method = 'GET', body, retryCount = 0)
            // if (method === 'POST') {
            //     console.log(JSON.stringify(body))
            // }

            return await time(`${opts.method || 'GET'} ${key}`, async () => {
                let rb = opts.rb || getRequestBuilder()
                let retryCount = opts.retryCount || 0
                let uri = rb.build()

                if (opts.cache && cache[uri]) {
                    return cache[uri]
                }
    
                try {
                    let requestObject = {
                        uri,
                        method: opts.method || 'GET'
                    }
    
                    if (opts.body) {
                        requestObject.body = opts.body
                    }
    
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
    
                    let statsBody = {
                        limit: result.body.limit,
                        offset: result.body.offset,
                        total: result.body.total,
                        count: result.body.count,
                        results: body
                    }
    
                    let val = opts.includeStats ? statsBody : body
    
                    if (opts.cache) {
                        cache[uri] = val
                    }
    
                    return val
                } catch (error) {
                    if (error.code === 404) {
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

        type.get = async (obj, opts) => {
            if (typeof obj === 'string') {
                obj = { id: obj }
            }

            obj = obj || {}
            opts = opts || {}

            let keys = ['container', 'key']
            _.each(keys, key => {
                if (_.isEmpty(obj[key])) {
                    delete obj[key]
                }
            })

            let rb = getRequestBuilder()
            if (opts.limit) {
                rb = rb.perPage(opts.limit)
            }

            if (opts.cartId) {
                rb = rb.byCartId(opts.cartId)
            }

            if (obj.sort) {
                rb = rb.sort(obj.sort)
            }

            if (opts.expand) {
                // dal support multiple 'expand' parameters.  there appears to be a small bug in the CT JS sdk
                _.each(opts.expand, exp => {
                    rb = rb.expand([exp])
                })
            }

            opts.rb = rb.parse(obj)
            return await type.do(opts)
        }
        type.count = async (obj) => {
            let result = await type.get(obj, { includeStats: true })
            return result.total
        }
        type.filter = async (filter) => await type.do({ rb: getRequestBuilder().filter(filter) })
        type.post = async (obj, rb) => await type.do({ rb, method: "POST", body: obj })
        type.ensure = async (obj, opts) => await type.get({ key: obj.key, container: obj.container }, opts) || await type.post(obj)

        type.update = async (object, actions) => await type.post({
            version: object.version,
            actions
        }, getRequestBuilder().byId(object.id))

        type.delete = async object => await type.do({ rb: getRequestBuilder().byId(object.id).withVersion(object.version), method: 'DELETE' })

        type.process = async (fn, opts = {}) => {
            await client.process({
                uri: getRequestBuilder().perPage(opts.limit || 20).build(),
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
                uri: getRequestBuilder().parse(opts).build(),
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