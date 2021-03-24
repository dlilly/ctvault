// 3rd party libs
const _ = require('lodash')
const pluralize = require('pluralize');
const levenshtein = require('js-levenshtein');

// local libs
const { time, ensureArray } = require('./util')
const factory = require('./factory');
const { default: Logger } = require('js-logger');

let doTypedRequest = (key, type, rb, client) => (requestOpts = {}) => async (rbOpts = {}) => {
    if (typeof rbOpts === 'string') {
        rbOpts = { id: rbOpts }
    }

    requestOpts.method = requestOpts.method || 'GET'
    return await time(`${requestOpts.method} ${key}`, async () => {
        let uri = rb[key].parse(rbOpts).build()

        console.log(`ct: ${uri}`)

        logger.debug(`${requestOpts.method} ${uri}`)

        try {
            let requestObject = {
                uri,
                ...requestOpts
            }

            let result = await client.execute(requestObject)
            let body = (result.body && result.body.results) || (result.body && result.body.value) || result.body

            // apply actions to each member of the response
            _.each(ensureArray(body), type.applyActions)

            return requestOpts.includeStats ? {
                limit: result.body.limit,
                offset: result.body.offset,
                total: result.body.total,
                count: result.body.count,
                results: body
            } : body
        } catch (error) {
            if (error.code === 404) {
                return null
            }
            else if (error.message && error.message.indexOf('has expired') > -1) {
                logger.error(`Project expired: ${client.projectKey}`)
            }
            else {
                logger.error(`Couldn't ${requestOpts.method} ${uri}`)
                logger.error(JSON.stringify(error))
            }
        }
        return null
    })
}

const wrapType = (key, type, ctpenv) => {
    let rb = factory.getRequestBuilder(ctpenv)
    let client = factory.getCTClient(ctpenv)

    // curried doRequest method
    let doRequest = doTypedRequest(key, type, rb, client)

    // map functions on individual objects for delete/update operations
    type.applyActions = obj => {
        obj.delete = () => type.delete({ id: obj.id, version: obj.version })
        obj.update = actions => type.update(obj, actions)
    }

    // CRUD support - make the CT SDK types support this syntactic sugar
    type.create = async (obj, rbOpts) => await doRequest({ method: 'POST', body: obj })(rbOpts)
    type.read = doRequest()
    type.update = async (obj, actions) => {
        await type.create({
            version: obj.version,
            actions
        }, { 
            id: obj.id 
        })
        return await type.read({ id: obj.id, expand: obj.expand })
    }
    type.delete = doRequest({ method: 'DELETE' })

    // ensure checks to see if the specified object exists in the store.  if not, it creates it.  either way, it returns the object
    type.ensure = async (obj) => await type.read({ key: obj.key }) || await type.create(obj)

    type.readWithStats = doRequest({ includeStats: true })

    type.process = async (fn, opts = {}) => await client.process({
        uri: rb[key].parse(opts).build(),
        method: 'GET'
    }, async payload => await Promise.all(payload.body.results.map(async (result) => {
        type.applyActions(result)
        return await fn(result)
    })), opts)

    type.all = async (opts = {}) => {
        let results = []
        await type.process(async obj => results.push(obj), opts)
        return opts.includeStats ? {
            limit: results.count,
            offset: 0,
            total: results.count,
            count: results.count,
            results
        } : results
    }

    // type.get is now deprecated in favor of type.read
    type.get = async (obj, opts) => await type.read(_.merge(obj, opts))

    // type.post is now deprecated in favor of type.create
    type.post = type.create
    
    return type
}

module.exports = {
    createCTPClient: ctpenv => {  
        let ctclient = _.reduce(factory.getRequestBuilder(ctpenv), (obj, type, key) => { obj[key] = wrapType(key, type, ctpenv); return obj }, {})
        
        ctclient.functions = {
            localize: str => _.reduce(ctclient.projectMetadata.languages, (map, lang) => { map[lang] = str; return map }, {})
        }
    
        ctclient.findMatchingMethod = key => _.first(_.filter(Object.keys(ctclient), k => {
            let normalizedKey = key.replace(/-/g, '')
            let pluralizedKey = pluralize(normalizedKey)
            return levenshtein(normalizedKey, k) === 1 || levenshtein(pluralizedKey, k) === 1 || k === pluralize(normalizedKey)
        }))
    
        // ctclient.projectMetadata = await ctclient.project.read()
        ctclient.projectKey = ctpenv.project
        ctclient.actions = require('./actions')(ctclient)
        ctclient.getEnvLocal = () => `
            VUE_APP_CT_PROJECT_KEY=${ctpenv.project}
            VUE_APP_CT_CLIENT_ID=${ctpenv.client_id}
            VUE_APP_CT_CLIENT_SECRET=${ctpenv.client_secret}
            VUE_APP_CT_SCOPE=${ctpenv.scopes}
            VUE_APP_CT_AUTH_HOST=${ctpenv.oauth_url}
        `
    
        return ctclient
    }
}