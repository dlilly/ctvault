// 3rd party libs
const fetch = require('node-fetch');

// commercetools sdk libs
const { createRequestBuilder } = require('@commercetools/api-request-builder')
const { createAuthMiddlewareForClientCredentialsFlow } = require('@commercetools/sdk-middleware-auth');
const { createHttpMiddleware } = require('@commercetools/sdk-middleware-http');
const { createClient } = require('@commercetools/sdk-client');

module.exports = {
    getRequestBuilder: ctpenv => createRequestBuilder({ projectKey: ctpenv.project }),
    getCTClient: ctpenv => {
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
        client.projectKey = ctpenv.project
        return client
    }
}