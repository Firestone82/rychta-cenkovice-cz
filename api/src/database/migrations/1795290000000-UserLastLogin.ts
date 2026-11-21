import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Accounts remember when they last signed in. */
export class UserLastLogin1795290000000 implements MigrationInterface {
  name = 'UserLastLogin1795290000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "last_login_at" TIMESTAMP WITH TIME ZONE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_login_at"`);
  }
}
