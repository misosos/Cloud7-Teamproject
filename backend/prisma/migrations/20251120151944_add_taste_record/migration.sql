-- CreateTable
CREATE TABLE "TasteRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "desc" TEXT,
    "content" TEXT,
    "category" TEXT NOT NULL,
    "tagsJson" TEXT,
    "thumb" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TasteRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TasteRecord_userId_createdAt_idx" ON "TasteRecord"("userId", "createdAt");
