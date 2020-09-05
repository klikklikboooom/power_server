import { Migration } from '@mikro-orm/migrations';

export class Migration20200905063607 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "room" ("id" serial primary key, "created_at" timestamptz(0) not null default \'now\', "updated_at" timestamptz(0) not null, "name" text not null, "code" text not null, "status" text not null);');

    this.addSql('create table "cards" ("id" serial primary key, "created_at" timestamptz(0) not null default \'now\', "updated_at" timestamptz(0) not null default \'now\', "value" text not null, "suit" text not null, "rank" int4 not null);');

    this.addSql('create table "user" ("id" serial primary key, "created_at" timestamptz(0) not null default \'now\', "updated_at" timestamptz(0) not null, "name" text not null, "password_hash" text not null);');
    this.addSql('alter table "user" add constraint "user_name_unique" unique ("name");');
  }

}
