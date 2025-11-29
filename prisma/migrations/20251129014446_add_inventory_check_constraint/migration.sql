-- Add CHECK constraint to ensure inventory stock levels cannot be negative
ALTER TABLE "LocationInventory"
ADD CONSTRAINT "LocationInventory_stockLevel_check"
CHECK ("stockLevel" >= 0);