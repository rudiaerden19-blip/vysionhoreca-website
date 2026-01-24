const fs = require('fs');

const file = fs.readFileSync('supabase/supplier_products_seed.sql', 'utf8');
const lines = file.split('\n');

let articleNum = 1001;

const fixedLines = lines.map(line => {
  // Match lines with 5 fields (already has article_number)
  const match5 = line.match(/^\('(ART\d+)',\s*'([^']*(?:''[^']*)*)',\s*(\d+),\s*([\d.]+),\s*'([^']+)'\)([,;]?)$/);
  if (match5) {
    articleNum++;
    return line; // Already correct
  }
  
  // Match lines with 4 fields (missing article_number)  
  const match4 = line.match(/^\('([^']*(?:''[^']*)*)',\s*(\d+),\s*([\d.]+),\s*'([^']+)'\)([,;]?)$/);
  if (match4) {
    let name = match4[1];
    const units = match4[2];
    const price = match4[3];
    const category = match4[4];
    const ending = match4[5];
    
    // Escape single quotes in name
    name = name.replace(/'/g, "''");
    
    const artNum = `ART${String(articleNum++).padStart(5, '0')}`;
    return `('${artNum}', '${name}', ${units}, ${price}, '${category}')${ending}`;
  }
  
  return line;
});

fs.writeFileSync('supabase/supplier_products_seed.sql', fixedLines.join('\n'));
console.log(`Fixed all rows, last article: ART${String(articleNum-1).padStart(5, '0')}`);
