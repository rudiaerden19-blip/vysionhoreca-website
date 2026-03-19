-- Kassa orders fix: maak customer_name nullable zodat kassa-bestellingen
-- (zonder klantgegevens) correct opgeslagen kunnen worden in de orders tabel.

ALTER TABLE orders
  ALTER COLUMN customer_name DROP NOT NULL;

-- Zorg dat customer_name een lege string terugvalt op 'Kassa' als het null is
ALTER TABLE orders
  ALTER COLUMN customer_name SET DEFAULT 'Kassa';
