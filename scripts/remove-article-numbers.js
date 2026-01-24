const fs = require('fs');

let file = fs.readFileSync('supabase/supplier_products_seed.sql', 'utf8');

// Change INSERT statement
file = file.replace(
  'INSERT INTO supplier_products (article_number, name, units_per_package, package_price, category) VALUES',
  'INSERT INTO supplier_products (name, units_per_package, package_price, category) VALUES'
);

// Remove article numbers from each line: ('ART01001', 'NAME' -> ('NAME'
file = file.replace(/\('ART\d+',\s*'/g, "('");

fs.writeFileSync('supabase/supplier_products_seed.sql', file);
console.log('Removed all article numbers');
