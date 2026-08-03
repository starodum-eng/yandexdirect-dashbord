-- CreateTable
CREATE TABLE "SearchQuerySnapshot" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "dateFrom" TEXT NOT NULL,
    "dateTo" TEXT NOT NULL,
    "rows" JSONB NOT NULL,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchQuerySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchQuerySnapshot_accountId_idx" ON "SearchQuerySnapshot"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "SearchQuerySnapshot_accountId_dateFrom_dateTo_key" ON "SearchQuerySnapshot"("accountId", "dateFrom", "dateTo");
