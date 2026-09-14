/*
  Warnings:

  - The values [DEACTIVATING] on the enum `CustomerStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CustomerStatus_new" AS ENUM ('ACTIVE', 'DEACTIVATION_REQUESTED', 'INACTIVE');
ALTER TABLE "public"."Customer" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Customer" ALTER COLUMN "status" TYPE "CustomerStatus_new" USING ("status"::text::"CustomerStatus_new");
ALTER TYPE "CustomerStatus" RENAME TO "CustomerStatus_old";
ALTER TYPE "CustomerStatus_new" RENAME TO "CustomerStatus";
DROP TYPE "public"."CustomerStatus_old";
ALTER TABLE "Customer" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;
