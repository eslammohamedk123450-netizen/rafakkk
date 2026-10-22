CREATE TABLE `content_items` (
	`id` varchar(64) NOT NULL,
	`category` varchar(48) NOT NULL,
	`title` varchar(256) NOT NULL,
	`body` text NOT NULL,
	`repetition` varchar(128),
	`sourceName` varchar(256) NOT NULL DEFAULT '',
	`sourceReference` varchar(512) NOT NULL DEFAULT '',
	`sourceUrl` varchar(2048) NOT NULL DEFAULT '',
	`authenticity` varchar(256) NOT NULL DEFAULT '',
	`reviewStatus` enum('pending','reviewed') NOT NULL DEFAULT 'pending',
	`isArchived` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_releases` (
	`version` int NOT NULL,
	`message` varchar(256) NOT NULL DEFAULT '',
	`entryCount` int NOT NULL DEFAULT 0,
	`publishedBy` varchar(64) NOT NULL,
	`publishedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `content_releases_version` PRIMARY KEY(`version`)
);
--> statement-breakpoint
CREATE TABLE `published_content` (
	`id` varchar(64) NOT NULL,
	`versionId` int NOT NULL,
	`category` varchar(48) NOT NULL,
	`title` varchar(256) NOT NULL,
	`body` text NOT NULL,
	`repetition` varchar(128),
	`sourceName` varchar(256) NOT NULL DEFAULT '',
	`sourceReference` varchar(512) NOT NULL DEFAULT '',
	`sourceUrl` varchar(2048) NOT NULL DEFAULT '',
	`authenticity` varchar(256) NOT NULL DEFAULT '',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `published_content_id` PRIMARY KEY(`id`)
);
