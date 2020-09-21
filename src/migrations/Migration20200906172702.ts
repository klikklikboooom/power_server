import { Migration } from '@mikro-orm/migrations';

export class Migration20200906172702 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "room" drop constraint if exists "room_created_at_check";');
    this.addSql('alter table "room" alter column "created_at" type timestamptz(0) using ("created_at"::timestamptz(0));');
    this.addSql('alter table "room" alter column "created_at" set default \'now\';');

    this.addSql('alter table "cards" drop constraint if exists "cards_created_at_check";');
    this.addSql('alter table "cards" alter column "created_at" type timestamptz(0) using ("created_at"::timestamptz(0));');
    this.addSql('alter table "cards" alter column "created_at" set default \'now\';');
    this.addSql('alter table "cards" drop constraint if exists "cards_updated_at_check";');
    this.addSql('alter table "cards" alter column "updated_at" type timestamptz(0) using ("updated_at"::timestamptz(0));');
    this.addSql('alter table "cards" alter column "updated_at" set default \'now\';');

    this.addSql('alter table "user" add column "email" text not null;');
    this.addSql('alter table "user" drop constraint if exists "user_created_at_check";');
    this.addSql('alter table "user" alter column "created_at" type timestamptz(0) using ("created_at"::timestamptz(0));');
    this.addSql('alter table "user" alter column "created_at" set default \'now\';');
    this.addSql('alter table "user" add constraint "user_email_unique" unique ("email");');
  }

}
