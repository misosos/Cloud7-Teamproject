-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LiveLocation" (
    "userId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lat" REAL,
    "lng" REAL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LiveLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LiveLocation" ("lat", "lng", "updatedAt", "userId") SELECT "lat", "lng", "updatedAt", "userId" FROM "LiveLocation";
DROP TABLE "LiveLocation";
ALTER TABLE "new_LiveLocation" RENAME TO "LiveLocation";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
