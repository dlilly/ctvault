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

        type.do = async (rb = getRequestBuilder(), method = 'GET', body) => {
            let uri = rb.build()
            try {
                let requestObject = {
                    uri,
                    method
                }

                if (body) {
                    requestObject.body = body
                }

                let result = await client.execute(requestObject)
                return (result.body && result.body.results) || result.body
            } catch (error) {
                if (error.code === 404) {
                }
                else if (error.body && error.body.message && error.body.message.indexOf('has expired') > -1) {
                }
                else {
                    throw error
                    // logger.error(`Couldn't ${method} ${uri}: ${error}`)
                    // logger.error(JSON.stringify(error, '', 4))
                }
            }
            return null
        }

        type.get = async (obj = {}, opts = {}) => await type.do(getRequestBuilder().perPage(opts.limit || 20).parse(obj))
        type.filter = async (filter) => await type.do(getRequestBuilder().filter(filter))
        type.post = async (rb, obj) => await type.do(rb, "POST", obj)
        type.ensure = async (obj) => await type.get({ key: obj.key }) || await type.post(getRequestBuilder(), obj)

        type.update = async (object, actions) => await type.post(getRequestBuilder().byId(object.id), {
            version: object.version,
            actions
        })

        type.delete = async object => await type.do(getRequestBuilder().byId(object.id).withVersion(object.version), 'DELETE')

        type.process = async (fn, opts) => {
            await client.process({
                uri: getRequestBuilder().build(),
                method: 'GET'
            }, async payload => {
                return await Promise.all(payload.body.results.map(await fn))
            }, opts)
        }
    })

    ct.functions = {
        localize: str => {
            var localized = {}
            _.each(ct.projectMetadata.languages, lang => localized[lang] = str)
            return localized
        }
    }

    ct.findMatchingMethod = key => _.first(_.filter(Object.keys(ct), k => levenshtein(key, k) === 1))

    ct.projectMetadata = await ct.project.get()
    ct.projectKey = ctpenv.project

    return ct
}

module.exports = {
    createCTPClient
}