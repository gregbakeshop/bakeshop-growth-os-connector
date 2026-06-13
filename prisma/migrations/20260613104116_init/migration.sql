-- CreateTable
CREATE TABLE "ShopifyInstallation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "installedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalledAt" DATETIME,
    "lastSyncAt" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'idle',
    "errorMessage" TEXT
);

-- CreateTable
CREATE TABLE "RawShopifyOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RawShopifyProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RawShopifyCustomer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RawShopifyDiscount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "syncedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyInstallation_shop_key" ON "ShopifyInstallation"("shop");

-- CreateIndex
CREATE INDEX "RawShopifyOrder_shop_idx" ON "RawShopifyOrder"("shop");

-- CreateIndex
CREATE INDEX "RawShopifyProduct_shop_idx" ON "RawShopifyProduct"("shop");

-- CreateIndex
CREATE INDEX "RawShopifyCustomer_shop_idx" ON "RawShopifyCustomer"("shop");

-- CreateIndex
CREATE INDEX "RawShopifyDiscount_shop_idx" ON "RawShopifyDiscount"("shop");
