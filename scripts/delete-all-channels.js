const _ = require('lodash')
const { getClient, getService } = require('../lib/ctclient');

let client = getClient()
let channelsService = getService().channels

let channelsRequest = {
    uri: channelsService.build(),
    method: 'GET'
}

let deleteChannel = async channel => {
    console.log(`deleting channel [ ${channel.id} ]...`)

    let deleteChannelRequest = {
        uri: channelsService.byId(channel.id).withVersion(channel.version).build(),
        method: 'DELETE'
    }

    return await client.execute(deleteChannelRequest)
}

let processChannel = async payload => _.each(payload.body.results, deleteChannel)

let run = async () => {
    await client.process(channelsRequest, processChannel)
}

run()