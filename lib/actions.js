const _ = require('lodash')

let changeLineItemQuantity = (lineItem, quantity) => ({
    action: 'changeLineItemQuantity',
    lineItemId: lineItem.id,
    quantity
})

module.exports = ct => {
    return {
        product: {
            unpublish: { 
                action: 'unpublish'
            },
            publish: {
                action: 'publish',
                scope: 'All'
            },
            addToCategory: category => {
                return {
                    action: "addToCategory",
                    category
                }
            },
            setAttributeInAllVariants: (name, value = '', staged = false) => {
                return {
                    action: 'setAttributeInAllVariants',
                    name,
                    value,
                    staged
                }
            },
            setTaxCategory: category => {
                return {
                    action: 'setTaxCategory',
                    taxCategory: { id: category.id }
                }
            }
        },
    
        cart: {
            addLineItem: sku => {
                return {
                    action: "addLineItem",
                    sku,
                }
            },

            addDiscountCode: code => {
                return {
                    action: 'addDiscountCode',
                    code
                }
            },
    
            setTaxModeExternal: {
                action: 'changeTaxMode',
                taxMode: 'External'
            },
    
            addShippingRate: (zone, shippingRate) => {
                return {
                    action: 'addShippingRate',
                    zone: zone.zone,
                    shippingRate
                }
            },
    
            removeShippingRate: (zone, shippingRate) => {
                return {
                    action: 'removeShippingRate',
                    zone: zone.zone,
                    shippingRate
                }
            },

            setLineItemCustomType: (lineItem, type) => ({
                action: 'setLineItemCustomType',
                lineItemId: lineItem.id,
                type: { key: type.key }
            }),

            setLineItemCustomField: (lineItem, name, value) => ({
                action: 'setLineItemCustomField',
                lineItemId: lineItem.id,
                name,
                value
            }),

            changeLineItemQuantity,
            removeLineItem: lineItem => changeLineItemQuantity(lineItem, 0)
        },
    
        common: {
            setCustomType: (type, fields) => {
                let { id, ...typeIdErasedType } = type
                return {
                    action: "setCustomType",
                    type: typeIdErasedType,
                    fields
                }
            },
            setCustomField: (name, value) => {
                return {
                    action: "setCustomField",
                    name,
                    value
                }
            },
            changeName: (name) => {
                return {
                    action: "changeName",
                    name: ct.functions.localize(name),
                    staged: false
                }
            },
            changeSlug: (slug) => {
                return {
                    action: "changeSlug",
                    slug: ct.functions.localize(slug),
                    staged: false
                }
            }
        },
    
        customer: {
            changeAddress: (oldAddress, newAddress) => {
                return {
                    action: "changeAddress",
                    addressId: oldAddress.id,
                    address: newAddress
                }
            }
        },
    
        order: {
            setOrderNumber: orderNumber => {
                return {
                    action: 'setOrderNumber',
                    orderNumber
                }
            }
        },
    
        lineItem: {
            setTaxRate: (li, address, taxRate) => {
                return {
                    action: 'setLineItemTaxRate',
                    lineItemId: li.id,
                    externalTaxRate: _.assign(taxRate, { state: address.state, country: address.country })
                }
            }
        },
    
        shippingMethod: {
            setTaxRate: (address, taxRate) => {
                return {
                    action: 'setShippingMethodTaxRate',
                    externalTaxRate: _.assign(taxRate, { state: address.state, country: address.country })
                }
            }
        }
    }
}