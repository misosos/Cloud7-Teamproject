/*
  Warnings:

  - You are about to drop the column `currentMembers` on the `Guild` table. All the data in the column will be lost.
  - You are about to drop the column `maxMembers` on the `Guild` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Guild` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `GuildMembership` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Guild" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "tagsJson" TEXT,
    "emblemUrl" TEXT,
    "ownerId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Guild_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Guild" ("category", "createdAt", "description", "emblemUrl", "id", "name", "ownerId", "tagsJson", "updatedAt") SELECT "category", "createdAt", "description", "emblemUrl", "id", "name", "ownerId", "tagsJson", "updatedAt" FROM "Guild";
DROP TABLE "Guild";
ALTER TABLE "new_Guild" RENAME TO "Guild";
CREATE INDEX "Guild_createdAt_idx" ON "Guild"("createdAt");
CREATE TABLE "new_GuildMembership" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "guildId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuildMembership_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GuildMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_GuildMembership" ("createdAt", "guildId", "id", "status", "userId") SELECT "createdAt", "guildId", "id", "status", "userId" FROM "GuildMembership";
DROP TABLE "GuildMembership";
ALTER TABLE "new_GuildMembership" RENAME TO "GuildMembership";
CREATE UNIQUE INDEX "GuildMembership_userId_guildId_key" ON "GuildMembership"("userId", "guildId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
