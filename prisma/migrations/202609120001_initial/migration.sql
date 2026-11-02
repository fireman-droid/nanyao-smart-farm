-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(40) NOT NULL,
    `passwordHash` VARCHAR(100) NOT NULL,
    `name` VARCHAR(40) NOT NULL,
    `role` ENUM('ADMIN', 'FARMER') NOT NULL DEFAULT 'FARMER',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Herb` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(60) NOT NULL,
    `scientificName` VARCHAR(120) NOT NULL,
    `family` VARCHAR(40) NOT NULL,
    `part` VARCHAR(60) NOT NULL,
    `region` VARCHAR(120) NOT NULL,
    `description` TEXT NOT NULL,
    `growthDays` INTEGER NOT NULL,
    `tempMin` DOUBLE NOT NULL,
    `tempMax` DOUBLE NOT NULL,
    `moistureMin` DOUBLE NOT NULL,
    `moistureMax` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Herb_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Plot` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(60) NOT NULL,
    `location` VARCHAR(160) NOT NULL,
    `area` DOUBLE NOT NULL,
    `soil` VARCHAR(60) NOT NULL,
    `manager` VARCHAR(40) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Plot_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Batch` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(40) NOT NULL,
    `herbId` INTEGER NOT NULL,
    `plotId` INTEGER NOT NULL,
    `plantedAt` DATETIME(3) NOT NULL,
    `expectedAt` DATETIME(3) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `status` ENUM('GROWING', 'HARVESTED') NOT NULL DEFAULT 'GROWING',
    `notes` VARCHAR(500) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Batch_code_key`(`code`),
    INDEX `Batch_plotId_status_idx`(`plotId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FarmTask` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(100) NOT NULL,
    `kind` ENUM('WATER', 'FERTILIZE', 'WEED', 'INSPECT', 'OTHER') NOT NULL,
    `batchId` INTEGER NOT NULL,
    `assigneeId` INTEGER NOT NULL,
    `dueAt` DATETIME(3) NOT NULL,
    `status` ENUM('TODO', 'DONE') NOT NULL DEFAULT 'TODO',
    `notes` VARCHAR(500) NOT NULL DEFAULT '',
    `result` VARCHAR(500) NOT NULL DEFAULT '',
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FarmTask_status_dueAt_idx`(`status`, `dueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reading` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plotId` INTEGER NOT NULL,
    `temperature` DOUBLE NOT NULL,
    `humidity` DOUBLE NOT NULL,
    `moisture` DOUBLE NOT NULL,
    `light` DOUBLE NOT NULL,
    `simulated` BOOLEAN NOT NULL DEFAULT true,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Reading_plotId_recordedAt_idx`(`plotId`, `recordedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Alert` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `batchId` INTEGER NOT NULL,
    `readingId` INTEGER NOT NULL,
    `metric` VARCHAR(30) NOT NULL,
    `message` VARCHAR(200) NOT NULL,
    `status` ENUM('OPEN', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
    `resolution` VARCHAR(500) NOT NULL DEFAULT '',
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Alert_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Harvest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `batchId` INTEGER NOT NULL,
    `operatorId` INTEGER NOT NULL,
    `traceCode` VARCHAR(50) NOT NULL,
    `harvestedAt` DATETIME(3) NOT NULL,
    `weight` DOUBLE NOT NULL,
    `grade` VARCHAR(30) NOT NULL,
    `destination` VARCHAR(120) NOT NULL,
    `notes` VARCHAR(500) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Harvest_batchId_key`(`batchId`),
    UNIQUE INDEX `Harvest_traceCode_key`(`traceCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Batch` ADD CONSTRAINT `Batch_herbId_fkey` FOREIGN KEY (`herbId`) REFERENCES `Herb`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Batch` ADD CONSTRAINT `Batch_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FarmTask` ADD CONSTRAINT `FarmTask_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `Batch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FarmTask` ADD CONSTRAINT `FarmTask_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reading` ADD CONSTRAINT `Reading_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Alert` ADD CONSTRAINT `Alert_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `Batch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Alert` ADD CONSTRAINT `Alert_readingId_fkey` FOREIGN KEY (`readingId`) REFERENCES `Reading`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Harvest` ADD CONSTRAINT `Harvest_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `Batch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Harvest` ADD CONSTRAINT `Harvest_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
