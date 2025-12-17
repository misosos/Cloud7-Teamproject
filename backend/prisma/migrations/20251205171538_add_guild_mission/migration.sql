-- CreateTable
CREATE TABLE "GuildMission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "limitCount" INTEGER NOT NULL,
    "difficulty" TEXT,
    "mainImage" TEXT,
    "extraImagesJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GuildMission_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GuildRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "missionId" TEXT,
    "title" TEXT NOT NULL,
    "desc" TEXT,
    "content" TEXT,
    "category" TEXT,
    "recordedAt" DATETIME,
    "rating" INTEGER,
    "mainImage" TEXT,
    "extraImagesJson" TEXT,
    "hashtagsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GuildRecord_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GuildRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GuildRecord_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "GuildMission" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GuildRecord" ("category", "content", "createdAt", "desc", "extraImagesJson", "guildId", "hashtagsJson", "id", "mainImage", "rating", "recordedAt", "title", "updatedAt", "userId") SELECT "category", "content", "createdAt", "desc", "extraImagesJson", "guildId", "hashtagsJson", "id", "mainImage", "rating", "recordedAt", "title", "updatedAt", "userId" FROM "GuildRecord";
DROP TABLE "GuildRecord";
ALTER TABLE "new_GuildRecord" RENAME TO "GuildRecord";
CREATE INDEX "GuildRecord_guildId_createdAt_idx" ON "GuildRecord"("guildId", "createdAt");
CREATE INDEX "GuildRecord_userId_createdAt_idx" ON "GuildRecord"("userId", "createdAt");
CREATE INDEX "GuildRecord_missionId_createdAt_idx" ON "GuildRecord"("missionId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "GuildMission_guildId_createdAt_idx" ON "GuildMission"("guildId", "createdAt");
