import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVideoSessions1781599284455 implements MigrationInterface {
    name = 'AddVideoSessions1781599284455'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."video_sessions_status_enum" AS ENUM('waiting', 'active', 'ended')`);
        await queryRunner.query(`CREATE TABLE "video_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "appointmentId" uuid NOT NULL, "doctorId" uuid NOT NULL, "patientId" uuid NOT NULL, "roomId" character varying NOT NULL, "status" "public"."video_sessions_status_enum" NOT NULL DEFAULT 'waiting', "startedAt" TIMESTAMP, "endedAt" TIMESTAMP, "durationSeconds" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_5da8cfd9a6ba22bb7a10d4871f5" UNIQUE ("roomId"), CONSTRAINT "PK_e60a547367f17bc59dcc2a56a6a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "video_sessions" ADD CONSTRAINT "FK_8112cea54feebd3c2edb8b6aa22" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "video_sessions" ADD CONSTRAINT "FK_4af0008281e6ed21d47e9490ced" FOREIGN KEY ("doctorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "video_sessions" ADD CONSTRAINT "FK_619c60b3421c2a9b40e44d720c3" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "video_sessions" DROP CONSTRAINT "FK_619c60b3421c2a9b40e44d720c3"`);
        await queryRunner.query(`ALTER TABLE "video_sessions" DROP CONSTRAINT "FK_4af0008281e6ed21d47e9490ced"`);
        await queryRunner.query(`ALTER TABLE "video_sessions" DROP CONSTRAINT "FK_8112cea54feebd3c2edb8b6aa22"`);
        await queryRunner.query(`DROP TABLE "video_sessions"`);
        await queryRunner.query(`DROP TYPE "public"."video_sessions_status_enum"`);
    }

}
