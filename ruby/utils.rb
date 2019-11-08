#!/usr/bin/env ruby

require 'nokogiri'

class Nokogiri::XML::Element
    def get_field name
        f = css("fields > field[name='#{name}'] values value")

        if f.children.length > 1
            f.children.map { |x| x.content }
        else
            f.inner_html
        end
    end
end
