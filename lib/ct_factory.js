const _ = require('lodash')
const { createRequestBuilder } = require('@commercetools/api-request-builder')
const { createClient } = require('@commercetools/sdk-client');
const { createAuthMiddlewareForClientCredentialsFlow } = require('@commercetools/sdk-middleware-auth');
const { createHttpMiddleware } = require('@commercetools/sdk-middleware-http');
const fetch = require('node-fetch');
const actions = require('./actions')
const levenshtein = require('js-levenshtein')

const createCTPClient = ctpenv => {
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

    client.do = method => async (uri, body) => {
        let result = await client.execute({ uri: uri.build(), method, body })
        return (result.body && result.body.results) || result.body
    }

    client.get = client.do('GET')
    client.post = client.do('POST')

    // helper methods
    let getRequestBuilder = resourceType => {
        let requestBuilder = createRequestBuilder({ projectKey: ctpenv.project })
        if (requestBuilder[resourceType]) {
            return requestBuilder[resourceType]
        } else {
            throw(`Error constructing request builder for project [ ${ctpenv.project} ]: requestBuilder has no member named [ ${resourceType} ]`)
        }
    }

    let get = async (opts) => await client.get(rb.parse(opts || {}))
    
    // async payload => await Promise.all(payload.body.results.map(await ct.products.unpublish))
    let processRequest = resourceType => async (fn, opts) => {
        let request = getRequestBuilder(resourceType)
        await client.process({
            uri: request.build(),
            method: 'GET'
        }, async payload => {
            return await Promise.all(payload.body.results.map(await fn))
        }, opts)
    }

    let create = resourceType => async body => {
        let request = getRequestBuilder(resourceType)
        return await client.execute({
            uri: request.build(),
            method: 'POST',
            body
        })
    }
    // end helper methods

    let ct = createRequestBuilder({ projectKey: ctpenv.project })

    _.each(Object.keys(ct), key => {
        if (key !== 'functions') {
            let type = ct[key]

            // for each key on the object (products, categories, etc), assign it the default
            // methods if it has not already overridden them

            let getRB = () => createRequestBuilder({ projectKey: ctpenv.project })[key]

            type.do = async (rb = getRB(), method = 'GET', body) => {
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
                    else {
                        logger.error(`Couldn't ${method} ${uri}: ${error}`)
                        logger.error(JSON.stringify(error, '', 4))
                        throw error
                    }
                }
            }

            type.get = async (obj = {}) => await type.do(getRB().parse(obj))
            type.post = async (rb, obj) => await type.do(rb, "POST", obj)
            type.ensure = async (obj) => await type.get({ key: obj.key }) || await type.post(getRB(), obj)

            type.applyActions = async (object, actions) => await type.post(getRB().byId(object.id), {
                version: object.version,
                actions
            })

            type.delete = async object => await type.do(getRB().byId(object.id).withVersion(object.version), 'DELETE')

            type.process = async (fn, opts) => {
                await client.process({
                    uri: getRB().build(),
                    method: 'GET'
                }, async payload => {
                    return await Promise.all(payload.body.results.map(await fn))
                }, opts)
            }
        }
    })

    ct.functions = {
        localize: async str => { 
            if (!ct.languages) {
                let project = await ct.projects.get()
                ct.languages = project.languages
            }

            var localized = {}
            _.each(ct.languages, lang => localized[lang] = str)
            return localized
        }
    }

    ct.findMatchingMethod = key => {
        return _.first(_.filter(Object.keys(ct), k => levenshtein(key, k) === 1))
    }

    ct.project = ctpenv.project
    return ct
}

module.exports = {
    createCTPClient
}