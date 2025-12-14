/*
  Warnings:

  - The primary key for the `LiveLocation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `LiveLocation` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LiveLocation" (
    "userId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lat" REAL,
    "lng" REAL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LiveLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LiveLocation" ("lat", "lng", "updatedAt", "userId") SELECT "lat", "lng", "updatedAt", "userId" FROM "LiveLocation";
DROP TABLE "LiveLocation";
ALTER TABLE "new_LiveLocation" RENAME TO "LiveLocation";
CREATE TABLE "new_Recommendation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "guildId" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'PERSONAL',
    "stayId" INTEGER,
    "kakaoPlaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryName" TEXT,
    "categoryGroupCode" TEXT,
    "mappedCategory" TEXT NOT NULL,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "distanceMeters" REAL,
    "score" REAL NOT NULL,
    "roadAddress" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recommendation_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Recommendation_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Recommendation" ("categoryGroupCode", "categoryName", "createdAt", "id", "kakaoPlaceId", "mappedCategory", "name", "score", "stayId", "updatedAt", "userId", "x", "y") SELECT "categoryGroupCode", "categoryName", "createdAt", "id", "kakaoPlaceId", "mappedCategory", "name", "score", "stayId", "updatedAt", "userId", "x", "y" FROM "Recommendation";
DROP TABLE "Recommendation";
ALTER TABLE "new_Recommendation" RENAME TO "Recommendation";
CREATE INDEX "Recommendation_userId_score_idx" ON "Recommendation"("userId", "score");
CREATE UNIQUE INDEX "Recommendation_userId_kakaoPlaceId_stayId_key" ON "Recommendation"("userId", "kakaoPlaceId", "stayId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
