const _ = require('lodash')
const { createRequestBuilder } = require('@commercetools/api-request-builder')
const { createClient } = require('@commercetools/sdk-client');
const { createAuthMiddlewareForClientCredentialsFlow } = require('@commercetools/sdk-middleware-auth');
const { createHttpMiddleware } = require('@commercetools/sdk-middleware-http');
const fetch = require('node-fetch');
const levenshtein = require('js-levenshtein')

const createCTPClient = async ctpenv => {
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
            
            let rb = opts.rb || getRequestBuilder()
            let retryCount = opts.retryCount || 0
            let uri = rb.build()
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

                if (result.body.id && !body.id) {
                    body.id = result.body.id
                    body.version = result.body.version
                }

                let statsBody = {
                    limit: result.body.limit,
                    offset: result.body.offset,
                    total: result.body.total,
                    count: result.body.count,
                    value: body
                }

                return opts.includeStats ? statsBody : body
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
                }
                else {
                    // console.log(`Uncaught exception: ${JSON.stringify(error)}`)
                    throw error
                    // throw error
                    // logger.error(`Couldn't ${method} ${uri}: ${error}`)
                    // logger.error(JSON.stringify(error, '', 4))
                }
            }
            return null
        }

        type.get = async (obj = {}, opts = {}) => {
            _.each(Object.keys(obj), key => {
                if (_.isEmpty(obj[key])) {
                    delete obj[key]
                }
            })
            opts.rb = getRequestBuilder().perPage(opts.limit || 20).parse(obj)
            return await type.do(opts)
        }
        type.count = async (obj) => {
            let result = await type.get(obj, { includeStats: true })
            return result.total
        }
        type.filter = async (filter) => await type.do({ rb: getRequestBuilder().filter(filter) })
        type.post = async (obj, rb) => await type.do({ rb, method: "POST", body: obj })
        type.ensure = async (obj) => await type.get({ key: obj.key, container: obj.container }) || await type.post(obj)

        type.update = async (object, actions) => {
            // console.log(`update objid ${object.id}`)
            return await type.post({
                version: object.version,
                actions
            }, getRequestBuilder().byId(object.id))
        }

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

    ct.findMatchingMethod = key => _.first(_.filter(Object.keys(ct), k => levenshtein(key, k) === 1))

    ct.projectMetadata = await ct.project.get()
    ct.projectKey = ctpenv.project
    ct.actions = require('./actions')(ct)

    return ct
}

module.exports = {
    createCTPClient
}