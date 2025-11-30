ALTER TABLE "user" ALTER COLUMN "refresh_token" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "refresh_token" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "refresh_token" SET NOT NULL;