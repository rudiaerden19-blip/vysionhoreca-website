const fs = require('fs');

const file = fs.readFileSync('supabase/supplier_products_seed.sql', 'utf8');
const lines = file.split('\n');

const fixedLines = lines.map(line => {
  // Match: ('NAME', units, price, 'CATEGORY')
  const match = line.match(/^\('([^']+)',\s*(\d+),\s*([\d.]+),\s*'([^']+)'\)/);
  if (match) {
    const name = match[1];
    const units = parseInt(match[2]);
    const price = parseFloat(match[3]);
    const category = match[4];
    
    // Calculate package_price = unit_price * units
    const packagePrice = (price * units).toFixed(2);
    
    // Check if line ends with comma or semicolon
    const ending = line.trim().endsWith(',') ? ',' : line.trim().endsWith(';') ? ';' : '';
    
    return `('${name}', ${units}, ${packagePrice}, '${category}')${ending}`;
  }
  return line;
});

fs.writeFileSync('supabase/supplier_products_seed.sql', fixedLines.join('\n'));
console.log('Fixed prices - converted unit_price to package_price');
