module.exports = { 
    time: async (op, fn) => {
        let start = new Date()
        let obj = await fn()
    
        if (op !== 'GET project') {
            logger.debug(`[ ${op} ] ${new Date() - start} ms`)
        }
    
        return obj
    }, 
    ensureArray: obj => Array.isArray(obj) ? obj : [obj], 
    sleep: milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
}