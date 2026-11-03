ALTER TABLE "cuisines" DROP CONSTRAINT "cuisines_name_nonblank";--> statement-breakpoint
ALTER TABLE "restaurants" DROP CONSTRAINT "restaurants_name_nonblank";--> statement-breakpoint
ALTER TABLE "cuisines" ADD CONSTRAINT "cuisines_name_nonblank" CHECK ("cuisines"."name" ~ '[^[:space:]]');--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_name_nonblank" CHECK ("restaurants"."name" ~ '[^[:space:]]');