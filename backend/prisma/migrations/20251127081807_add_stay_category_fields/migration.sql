-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Stay" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "kakaoPlaceId" TEXT,
    "categoryName" TEXT,
    "categoryGroupCode" TEXT,
    "mappedCategory" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Stay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Stay" ("createdAt", "endTime", "id", "lat", "lng", "startTime", "userId") SELECT "createdAt", "endTime", "id", "lat", "lng", "startTime", "userId" FROM "Stay";
DROP TABLE "Stay";
ALTER TABLE "new_Stay" RENAME TO "Stay";
CREATE INDEX "Stay_userId_startTime_idx" ON "Stay"("userId", "startTime");
CREATE INDEX "Stay_userId_mappedCategory_idx" ON "Stay"("userId", "mappedCategory");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
