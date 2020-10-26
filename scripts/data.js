module.exports = {
    schemas: {
        taxCategories: [{
            name: "standardTaxCategory",
            description: "",
            rates: [{
                name: "standard",
                amount: 0.0,
                includedInPrice: false,
                country: "US",
                subRates: []
            }],
            key: "standard-tax-category"
        }]
    }
}