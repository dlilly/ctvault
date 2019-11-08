#!/usr/bin/env ruby

require 'base64'
require 'http'

class CTClient
    def initialize()
        # @project_key = 'tiffany-data-loader-refactor'
        # @client_id = 'A76U94BWphUjRls7fyAUAwLe'
        # @client_secret = 'cGGjIhJjKwo-fNGnrwcbj3OKK4K3m33K'

        @project_key = 'rue21-demo'
        @client_id = 'mbzOm1F2BmbWuQI72V_Ey8sq'
        @client_secret = 'Hj1AO9ZO2dgOFHkrohnEeOpr3-TaZWj3'

        @access_token = nil
        @expires_in = nil


        # why does Base64.encode64 put a carriage return in the middle of this????
        @encoded = Base64.encode64("#{@client_id}:#{@client_secret}").gsub(/\n/, '')
    end

    def token; "Bearer #{@access_token}"; end

    def auth
        response = HTTP[:Authorization => "Basic #{@encoded}"]
            .post("https://auth.commercetools.co/oauth/token?grant_type=client_credentials&scope=manage_project:#{@project_key}")

        body = JSON.parse(response.body)

        @access_token = body["access_token"]
        @expires_in = body["expires_in"]
        # HTTP.default_options = 
        @http = HTTP.persistent("https://api.commercetools.co").headers({ :Authorization => token() })
        # @http.make_request_headers([:Authorization => token()])
    end

    def parse response
        begin
            parsed = JSON.parse(response.body)
            response.flush()
            parsed
        rescue JSON::ParserError => e  
            puts "parse failed"
        end
    end

    def get path
        response = @http.get("/#{@project_key}/#{path}")
        parse response
    end

    def post (path, body)
        response = @http.post("/#{@project_key}/#{path}", :json => body)
        parse response
    end

    def get_categories; get('categories')['results']; end
    def get_all_categories; get('categories?limit=100')['results']; end

    def get_category key
        categories = get_categories
        keys = Array(key)
        keys = keys.map { |key| key.downcase }

        categories.select do |cat|
            name = cat["name"]["en-US"].downcase
            keys.include?name
        end
    end

    def get_product_types; get('product-types?limit=100')['results']; end

    def get_product_type
        get_product_types.first
    end

    def create_product_type product_type
        post('product-types', product_type)
    end

    def create_channel channel
        post('channels', channel)
    end

    def create_product product
        post('products', product)
    end

    def update_product (product, update_action)
        post("products/#{product['id']}", { 
            :version => product['version'],
            :actions => [update_action] 
        })
    end

    def create_category category
        post('categories', category)
    end

    def get_product_by_key key
        if key && key.length > 0
            response = get("products/key=#{key}")
            response if response && !response["errors"]
        end
    end

    def get_product_by_id id
        response = get("products/#{id}")
        response if response && !response["errors"]
    end

    def get_products_with_offset offset
        get("products?offset=#{offset}")
    end

    def get_products
        products = []
        total = -1

        while total == -1 || products.length < total
            products_response = get_products_with_offset products.length
            products.push(products_response['results'])
            products = products.flatten
            total = products_response['total']

            if products.length % 500 == 0
                puts "total: #{products_response['total']} loaded: #{products.length}"
            end
        end

        products
    end

    def get_tax_categories; get('tax-categories')['results']; end

    def get_tax_category key
        categories = get_tax_categories
        categories.select do |cat|
            key.casecmp(cat["name"]) == 0
        end.first
    end
end
