// commercetools sdk libs
const { createRequestBuilder } = require('@commercetools/api-request-builder')

const { createAuthMiddlewareForClientCredentialsFlow } = require('@commercetools/sdk-middleware-auth');
const { createHttpMiddleware } = require('@commercetools/sdk-middleware-http');
const { createClient } = require('@commercetools/sdk-client');
const fetch = require('node-fetch');
const levenshtein = require('js-levenshtein')

let getCTBaseClient = ctpenv => {
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
    return createClient({ middlewares: [authMiddleware, httpMiddleware] })
}

let getRB = ctpenv => {
    // if (true || !ctpenv.projectKey) {
    //     console.log(`ctpenv ${JSON.stringify(ctpenv)}`)
    // }

    try {
        const ct = createRequestBuilder({ projectKey: ctpenv.projectKey })
        return ct

        // console.log(Object.keys(ct))

        // ct.functions = {
        //     localize: str => ct.projectMetadata.languages.map(lang => ({ [lang]: str }))
        // }
    
        // const pluralize = require('pluralize');
        // ct.findMatchingMethod = key => _.first(_.filter(Object.keys(ct), k => {
        //     let normalizedKey = key.replace(/-/g, '')
        //     let pluralizedKey = pluralize(normalizedKey)
        //     return levenshtein(normalizedKey, k) === 1 || levenshtein(pluralizedKey, k) === 1 || k === pluralize(normalizedKey)
        // }))
    
        // ct.projectMetadata = await ct.project.get()
        // ct.projectKey = ctpenv.project
        // ct.actions = require('./actions')(ct)
        // ct.getEnvLocal = () => `
        //     VUE_APP_CT_PROJECT_KEY=${ctpenv.project}
        //     VUE_APP_CT_CLIENT_ID=${ctpenv.client_id}
        //     VUE_APP_CT_CLIENT_SECRET=${ctpenv.client_secret}
        //     VUE_APP_CT_SCOPE=${ctpenv.scopes}
        //     VUE_APP_CT_AUTH_HOST=${ctpenv.oauth_url}
        // `
        // return ct
    } catch (error) {
        console.log(`ctpenv ${JSON.stringify(ctpenv)}`)
        console.error(`Error creating request builder: ${JSON.stringify(error)}`)
        console.error(error.stack)
    }
}

let time = async (op, fn) => {
    let start = new Date()
    let obj = await fn()

    if (op !== 'GET project') {
        logger.debug(`[ ${op} ] ${new Date() - start} ms`)
    }

    return obj
}

module.exports = { time, getCTBaseClient, getRB }