-- CreateTable
CREATE TABLE "GuildRecordComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GuildRecordComment_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "GuildRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GuildRecordComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "GuildRecordComment_recordId_createdAt_idx" ON "GuildRecordComment"("recordId", "createdAt");

-- CreateIndex
CREATE INDEX "GuildRecordComment_userId_createdAt_idx" ON "GuildRecordComment"("userId", "createdAt");
