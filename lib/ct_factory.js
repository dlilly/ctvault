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
        scopes: [`manage_project:${ctpenv.project}`],
        fetch,
    })
        
    const httpMiddleware = createHttpMiddleware({ host: ctpenv.api_url, fetch })
    const client = createClient({ middlewares: [authMiddleware, httpMiddleware] })

    client.get = async (request) => {
        let uri = request.build()
        // logger.debug(`GET ${uri}`)
        try {
            let result = await client.execute({ uri, method: 'GET' })
            return (result.body && result.body.results) || result.body
        } catch (error) {
            if (error.code === 404) {

            }
            else {
                logger.error(`Couldn't GET ${uri}: ${error}`)
                logger.error(JSON.stringify(error, '', 4))
                throw error
            }
        }
    }

    client.post = async (uri, body) => {
        let result = await client.execute({ uri: uri.build(), method: 'POST', body })
        return (result.body && result.body.results) || result.body
    }

    // helper methods
    let getRequestBuilder = resourceType => {
        let requestBuilder = createRequestBuilder({ projectKey: ctpenv.project })
        if (requestBuilder[resourceType]) {
            return requestBuilder[resourceType]
        } else {
            throw(`Error constructing request builder for project [ ${ctpenv.project} ]: requestBuilder has no member named [ ${resourceType} ]`)
        }
    }

    let get = resourceType => async (opts) => await client.get(getRequestBuilder(resourceType).parse(opts || {}))
    
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

    let update = resourceType => async (object, actions) => {
        let request = getRequestBuilder(resourceType)
        logger.debug(`Updating [ ${resourceType} / ${object.id} ]...`)

        return await client.execute({
            uri: request.byId(object.id).build(),
            method: 'POST',
            body: {
                version: object.version,
                actions: actions
            }
        })
    }

    let remove = resourceType => async object => {
        let request = getRequestBuilder(resourceType)
        return await client.execute({
            uri: request.byId(object.id).withVersion(object.version).build(),
            method: 'DELETE'
        })
    }

    let ensure = resourceType => async body => {
        var rti = await get(resourceType)({ key: body.key })
        if (!rti) {
            rti = (await create(resourceType)(body)).body
        }
        return rti
    }

    let createCustomObject = async (container, key, value) => {
        let customObj = (await create('customObjects')({
            container,
            key,
            value
        })).body.value
        return customObj
    }
    // end helper methods

    const ct = {
        carts: {
            addLineItemBySKU: async (cart, sku) => await update('carts')(cart, [actions.cart.addLineItem(sku)]),
            getByCustomer: async customer => await get('carts')({ where: [`customerId=${customer.id}`] }),
            convertToOrder: async cart => await client.execute({
                uri: createRequestBuilder({ projectKey: ctpenv.project }).orders.build(),
                method: 'POST',
                body: {
                    id: cart.id,
                    version: cart.version,
                }
            })
        },
        customers: {
            changeAddress: async (customer, oldAddress, newAddress) => {
                await update('customers')(customer, [
                    {
                        action: "changeAddress",
                        addressId: oldAddress.id,
                        address: newAddress
                    }
                ])
            }
        },
        customObjects: {
            // get: async (container, key) => await get('customObjects')({ path: `/${container}/${key}` }),
            get: async (container, key) => {
                let where = []
                if (!_.isEmpty(container)) {
                    where.push(`container = "${container}"`)
                }

                if (!_.isEmpty(key)) {
                    where.push(`key = "${key}"`)
                }

                return await get('customObjects')({ where })
            },

            ensure: async (container, key, value) => {
                let response = await get('customObjects')({ where: [`container = "${container}"`, `key = "${key}"`] })
                let customObj = _.first(response) && _.first(response).value
                
                if (!customObj) {
                    customObj = await createCustomObject(container, key, value)
                }
                return customObj
            },

            update: async (container, key, value) => await createCustomObject(container, key, value)
        },
        products: {
            unpublish: async product => await update('products')(product, [actions.product.unpublish]),
            publish: async product => await update('products')(product, [actions.product.publish]),
            addToCategory: async (product, categoryId) => await update('products')(product, [actions.product.addToCategory({ id: categoryId }), actions.product.publish]),
        },
        productProjections: {
            search: async (opts) => {
                var q = createRequestBuilder({ projectKey: ctpenv.project }).productProjectionsSearch
                if (opts.text && opts.text.length > 0) {
                    q = q.text(opts.text, 'en-US')
                }

                if (opts.filter && opts.filter.length > 0) {
                    q = q.filter(opts.filter)
                }

                return (await client.execute({
                    uri: q.build(),
                    method: 'GET'
                })).body
            }
        },
        functions: {
            localize: async str => { 
                if (!ct.project) {
                    ct.project = await get('project')()
                }

                var localized = {}
                _.each(ct.project.languages, lang => localized[lang] = str)
                return localized
            }
        }
    }

    let rb = createRequestBuilder({ projectKey: ctpenv.project })
    _.each(Object.keys(rb), key => {
        ct[key] = ct[key] || {}
    })

    _.each(Object.keys(ct), key => {
        if (key !== 'functions') {
            let type = ct[key]

            // for each key on the object (products, categories, etc), assign it the default
            // methods if it has not already overridden them
            type.get = type.get || get(key)
            type.create = type.create || create(key)
            type.update = type.update || update(key)
            type.ensure = type.ensure || ensure(key)
            type.delete = type.delete || remove(key)
            type.process = type.process || processRequest(key)
        }
    })

    ct.findMatchingMethod = key => {
        return _.first(_.filter(Object.keys(ct), k => levenshtein(key, k) === 1))
    }

    ct.project = ctpenv.project
    return ct
}

module.exports = {
    createCTPClient
}