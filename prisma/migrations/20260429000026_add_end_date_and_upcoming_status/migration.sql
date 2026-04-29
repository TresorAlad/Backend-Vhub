-- AlterEnum
ALTER TYPE "EventStatus" ADD VALUE 'Upcoming';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "endDate" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'Upcoming';
