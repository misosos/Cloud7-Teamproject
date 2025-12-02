-- CreateTable
CREATE TABLE "LiveLocation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LiveLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "LiveLocation_userId_key" ON "LiveLocation"("userId");

-- CreateIndex
CREATE INDEX "LiveLocation_lat_lng_idx" ON "LiveLocation"("lat", "lng");
