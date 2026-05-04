-- CreateEnum
CREATE TYPE "OrganizerRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "OrganizerRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "OrganizerRequestStatus" NOT NULL DEFAULT 'PENDING',
    "communityName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "website" TEXT,
    "proofUrl" TEXT,
    "adminNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizerRequest_status_createdAt_idx" ON "OrganizerRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OrganizerRequest_userId_createdAt_idx" ON "OrganizerRequest"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrganizerRequest" ADD CONSTRAINT "OrganizerRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
