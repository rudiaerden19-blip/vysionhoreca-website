const fs = require('fs');

const file = fs.readFileSync('supabase/supplier_products_seed.sql', 'utf8');
const lines = file.split('\n');

let articleNum = 1001;

const fixedLines = lines.map(line => {
  // Match: ('NAME', units, price, 'CATEGORY'),
  const match = line.match(/^\('([^']+)',\s*(\d+),\s*([\d.]+),\s*'([^']+)'\)([,;]?)$/);
  if (match) {
    const name = match[1];
    const units = match[2];
    const price = match[3];
    const category = match[4];
    const ending = match[5];
    
    const artNum = `ART${String(articleNum++).padStart(5, '0')}`;
    
    // New format: (article_number, name, units_per_package, package_price, category)
    return `('${artNum}', '${name}', ${units}, ${price}, '${category}')${ending}`;
  }
  return line;
});

// Update the INSERT statement
const result = fixedLines.join('\n')
  .replace(
    'INSERT INTO supplier_products (name, units_per_package, package_price, category) VALUES',
    'INSERT INTO supplier_products (article_number, name, units_per_package, package_price, category) VALUES'
  );

fs.writeFileSync('supabase/supplier_products_seed.sql', result);
console.log(`Added article numbers ART01001 to ART${String(articleNum-1).padStart(5, '0')}`);
