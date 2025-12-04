/*
  Warnings:

  - You are about to drop the column `score` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `stayId` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `x` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `y` on the `Recommendation` table. All the data in the column will be lost.
  - Added the required column `lat` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lng` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Made the column `categoryGroupCode` on table `Recommendation` required. This step will fail if there are existing NULL values in that column.
  - Made the column `categoryName` on table `Recommendation` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Recommendation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "guildId" INTEGER,
    "source" TEXT NOT NULL,
    "kakaoPlaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "categoryGroupCode" TEXT NOT NULL,
    "mappedCategory" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "roadAddress" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitedAt" DATETIME,
    CONSTRAINT "Recommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Recommendation_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Recommendation" ("categoryGroupCode", "categoryName", "createdAt", "id", "kakaoPlaceId", "mappedCategory", "name", "userId") SELECT "categoryGroupCode", "categoryName", "createdAt", "id", "kakaoPlaceId", "mappedCategory", "name", "userId" FROM "Recommendation";
DROP TABLE "Recommendation";
ALTER TABLE "new_Recommendation" RENAME TO "Recommendation";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
