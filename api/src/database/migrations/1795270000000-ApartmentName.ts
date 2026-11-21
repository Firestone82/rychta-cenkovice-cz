import type { MigrationInterface, QueryRunner } from 'typeorm';

/** An apartment keeps its number and can carry a name beside it. */
export class ApartmentName1795270000000 implements MigrationInterface {
  name = 'ApartmentName1795270000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "apartments" ADD "name_cs" text NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "apartments" ADD "name_en" text NOT NULL DEFAULT ''`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "apartments" DROP COLUMN "name_en"`);
    await queryRunner.query(`ALTER TABLE "apartments" DROP COLUMN "name_cs"`);
  }
}
