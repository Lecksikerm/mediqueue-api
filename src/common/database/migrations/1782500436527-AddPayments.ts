import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPayments1782500436527 implements MigrationInterface {
    name = 'AddPayments1782500436527'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."payments_currency_enum" AS ENUM('NGN')`);
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum" AS ENUM('pending', 'success', 'failed', 'refunded')`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "patientId" uuid NOT NULL, "appointmentId" uuid NOT NULL, "reference" character varying NOT NULL, "amount" numeric(10,2) NOT NULL, "currency" "public"."payments_currency_enum" NOT NULL DEFAULT 'NGN', "status" "public"."payments_status_enum" NOT NULL DEFAULT 'pending', "paystackReference" character varying, "authorizationUrl" character varying, "channel" character varying, "metadata" jsonb, "paidAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_866ddee0e17d9385b4e3b86851d" UNIQUE ("reference"), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_e1f738d342393a3c19867610f20" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_90213a20c94916e46cd2131364f" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_90213a20c94916e46cd2131364f"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_e1f738d342393a3c19867610f20"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payments_currency_enum"`);
    }

}
