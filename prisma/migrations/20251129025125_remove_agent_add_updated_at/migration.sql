/*
  Warnings:

  - You are about to drop the `Agent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Agent" DROP CONSTRAINT "Agent_locationId_fkey";

-- DropTable
DROP TABLE "Agent";

-- DropEnum
DROP TYPE "AgentScope";

-- DropEnum
DROP TYPE "AgentStatus";
