-- CreateTable
CREATE TABLE "GuildRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
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
    CONSTRAINT "GuildRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GuildScore" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "guildId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GuildScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GuildScore_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "GuildRecord_guildId_createdAt_idx" ON "GuildRecord"("guildId", "createdAt");

-- CreateIndex
CREATE INDEX "GuildRecord_userId_createdAt_idx" ON "GuildRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GuildScore_guildId_score_idx" ON "GuildScore"("guildId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "GuildScore_userId_guildId_key" ON "GuildScore"("userId", "guildId");
