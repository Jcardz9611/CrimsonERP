-- AlterTable
ALTER TABLE "CotizacionItem" ADD COLUMN     "claveUnidad" TEXT DEFAULT 'H87',
ADD COLUMN     "unidad" TEXT DEFAULT 'Pieza';

-- AlterTable
ALTER TABLE "FacturaItem" ADD COLUMN     "unidad" TEXT DEFAULT 'Pieza',
ALTER COLUMN "claveUnidad" SET DEFAULT 'H87';
