UPDATE staff SET pages = array_append(pages, 'order-builder')
WHERE 'orders' = ANY(pages) AND NOT ('order-builder' = ANY(pages));