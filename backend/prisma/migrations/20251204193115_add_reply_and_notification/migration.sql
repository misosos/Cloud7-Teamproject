-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "recordId" TEXT,
    "commentId" TEXT,
    "fromUserId" INTEGER NOT NULL,
    "content" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GuildRecordComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "parentCommentId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GuildRecordComment_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "GuildRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GuildRecordComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GuildRecordComment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "GuildRecordComment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GuildRecordComment" ("content", "createdAt", "id", "recordId", "updatedAt", "userId") SELECT "content", "createdAt", "id", "recordId", "updatedAt", "userId" FROM "GuildRecordComment";
DROP TABLE "GuildRecordComment";
ALTER TABLE "new_GuildRecordComment" RENAME TO "GuildRecordComment";
CREATE INDEX "GuildRecordComment_recordId_createdAt_idx" ON "GuildRecordComment"("recordId", "createdAt");
CREATE INDEX "GuildRecordComment_userId_createdAt_idx" ON "GuildRecordComment"("userId", "createdAt");
CREATE INDEX "GuildRecordComment_parentCommentId_idx" ON "GuildRecordComment"("parentCommentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
