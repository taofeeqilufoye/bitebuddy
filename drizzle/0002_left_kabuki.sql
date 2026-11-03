CREATE TABLE "cuisines" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "cuisines_name_unique" UNIQUE("name"),
	CONSTRAINT "cuisines_name_nonblank" CHECK (length(btrim("cuisines"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"cuisine_id" integer NOT NULL,
	"name" text NOT NULL,
	"city" text,
	"notes" text,
	"rating" numeric,
	"visited" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurants_user_id_id_unique" UNIQUE("user_id","id"),
	CONSTRAINT "restaurants_name_nonblank" CHECK (length(btrim("restaurants"."name")) > 0),
	CONSTRAINT "restaurants_rating_one_decimal_range" CHECK ("restaurants"."rating" is null or ("restaurants"."rating" >= 1 and "restaurants"."rating" <= 5 and "restaurants"."rating" = trunc("restaurants"."rating", 1)))
);
--> statement-breakpoint
CREATE TABLE "stars" (
	"user_id" integer NOT NULL,
	"restaurant_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stars_pkey" PRIMARY KEY("user_id","restaurant_id")
);
--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_cuisine_id_cuisines_id_fk" FOREIGN KEY ("cuisine_id") REFERENCES "public"."cuisines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stars" ADD CONSTRAINT "stars_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stars" ADD CONSTRAINT "stars_owned_restaurant_fk" FOREIGN KEY ("user_id","restaurant_id") REFERENCES "public"."restaurants"("user_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "restaurants_user_created_at_idx" ON "restaurants" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "restaurants_cuisine_id_idx" ON "restaurants" USING btree ("cuisine_id");--> statement-breakpoint
CREATE INDEX "stars_restaurant_id_idx" ON "stars" USING btree ("restaurant_id");
--> statement-breakpoint
INSERT INTO "cuisines" ("name") VALUES
	('American'),
	('Caribbean'),
	('Chinese'),
	('Colombian'),
	('Dominican'),
	('Ethiopian'),
	('French'),
	('Greek'),
	('Indian'),
	('Italian'),
	('Japanese'),
	('Korean'),
	('Mexican'),
	('Nigerian'),
	('Thai'),
	('Vietnamese')
ON CONFLICT ("name") DO NOTHING;