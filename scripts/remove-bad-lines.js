const fs = require('fs');

const file = fs.readFileSync('supabase/supplier_products_seed.sql', 'utf8');
const lines = file.split('\n');

let removed = 0;
const cleanLines = lines.filter(line => {
  // Remove product lines that don't start with ART
  if (line.match(/^\('[^A]/)) {
    console.log('Removing:', line.substring(0, 60) + '...');
    removed++;
    return false;
  }
  return true;
});

fs.writeFileSync('supabase/supplier_products_seed.sql', cleanLines.join('\n'));
console.log('\nRemoved ' + removed + ' lines');
console.log('Kept ' + cleanLines.filter(l => l.startsWith("('ART")).length + ' products');
