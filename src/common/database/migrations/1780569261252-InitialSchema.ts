import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1780569261252 implements MigrationInterface {
  name = 'InitialSchema1780569261252';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =========================
    // USERS
    // =========================
    await queryRunner.query(`
            CREATE TYPE "public"."users_role_enum" AS ENUM('patient', 'doctor', 'admin')
        `);

    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(100) NOT NULL,
                "email" character varying NOT NULL,
                "password" character varying NOT NULL,
                "role" "public"."users_role_enum" NOT NULL DEFAULT 'patient',
                "refreshToken" character varying,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);

    // =========================
    // DOCTORS
    // =========================
    await queryRunner.query(`
            CREATE TYPE "public"."doctors_status_enum" AS ENUM('active', 'inactive', 'on_leave')
        `);

    await queryRunner.query(`
            CREATE TABLE "doctors" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "specialization" character varying(100) NOT NULL,
                "yearsOfExperience" integer NOT NULL DEFAULT '0',
                "consultationFee" numeric(10,2) NOT NULL DEFAULT '0',
                "languagesSpoken" text,
                "bio" character varying,
                "status" "public"."doctors_status_enum" NOT NULL DEFAULT 'active',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "REL_55651e05e46413d510215535ed" UNIQUE ("userId"),
                CONSTRAINT "PK_8207e7889b50ee3695c2b8154ff" PRIMARY KEY ("id")
            )
        `);

    // =========================
    // AVAILABILITY SLOTS
    // =========================
    await queryRunner.query(`
            CREATE TYPE "public"."availability_slots_status_enum" AS ENUM('available', 'booked', 'blocked')
        `);

    await queryRunner.query(`
            CREATE TABLE "availability_slots" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "doctorId" uuid NOT NULL,
                "date" date NOT NULL,
                "startTime" TIME NOT NULL,
                "endTime" TIME NOT NULL,
                "status" "public"."availability_slots_status_enum" NOT NULL DEFAULT 'available',
                "isRecurring" boolean NOT NULL DEFAULT false,
                "recurrenceDays" character varying,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_70765e8e17c8f6374060d70589a" PRIMARY KEY ("id")
            )
        `);

    // =========================
    // APPOINTMENTS
    // =========================
    await queryRunner.query(`
            CREATE TYPE "public"."appointments_status_enum" AS ENUM(
                'booked',
                'waiting',
                'in_progress',
                'completed',
                'no_show',
                'cancelled'
            )
        `);

    await queryRunner.query(`
            CREATE TABLE "appointments" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "patientId" uuid NOT NULL,
                "doctorId" uuid NOT NULL,
                "slotId" uuid NOT NULL,
                "status" "public"."appointments_status_enum" NOT NULL DEFAULT 'booked',
                "notes" text,
                "startedAt" TIMESTAMP,
                "completedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "REL_074c4e87da10ac958c44c9562f" UNIQUE ("slotId"),
                CONSTRAINT "PK_4a437a9a27e948726b8bb3e36ad" PRIMARY KEY ("id")
            )
        `);

    // =========================
    // CONSULTATION QUEUE
    // =========================
    await queryRunner.query(`
            CREATE TYPE "public"."consultation_queue_status_enum" AS ENUM('waiting', 'in_progress', 'completed', 'skipped')
        `);

    await queryRunner.query(`
            CREATE TABLE "consultation_queue" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "doctorId" uuid NOT NULL,
                "patientId" uuid NOT NULL,
                "appointmentId" uuid NOT NULL,
                "position" integer NOT NULL,
                "status" "public"."consultation_queue_status_enum" NOT NULL DEFAULT 'waiting',
                "estimatedWaitMinutes" integer,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_c59d76fef677af520bd098b7f38" PRIMARY KEY ("id")
            )
        `);

    // =========================
    // FOREIGN KEYS
    // =========================
    await queryRunner.query(`
            ALTER TABLE "appointments"
            ADD CONSTRAINT "FK_13c2e57cb81b44f062ba24df57d"
            FOREIGN KEY ("patientId") REFERENCES "users"("id")
        `);

    await queryRunner.query(`
            ALTER TABLE "appointments"
            ADD CONSTRAINT "FK_0c1af27b469cb8dca420c160d65"
            FOREIGN KEY ("doctorId") REFERENCES "doctors"("id")
        `);

    await queryRunner.query(`
            ALTER TABLE "appointments"
            ADD CONSTRAINT "FK_074c4e87da10ac958c44c9562f3"
            FOREIGN KEY ("slotId") REFERENCES "availability_slots"("id")
        `);

    await queryRunner.query(`
            ALTER TABLE "availability_slots"
            ADD CONSTRAINT "FK_8000d7470e6c862af2ff3f0ceae"
            FOREIGN KEY ("doctorId") REFERENCES "doctors"("id")
        `);

    await queryRunner.query(`
            ALTER TABLE "consultation_queue"
            ADD CONSTRAINT "FK_f5f29d7e0713e5293c30c9b7e08"
            FOREIGN KEY ("patientId") REFERENCES "users"("id")
        `);

    await queryRunner.query(`
            ALTER TABLE "consultation_queue"
            ADD CONSTRAINT "FK_bb14b7398d8f1e29206d5d90a03"
            FOREIGN KEY ("doctorId") REFERENCES "doctors"("id")
        `);

    await queryRunner.query(`
            ALTER TABLE "doctors"
            ADD CONSTRAINT "FK_55651e05e46413d510215535edf"
            FOREIGN KEY ("userId") REFERENCES "users"("id")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FK constraints first
    await queryRunner.query(
      `ALTER TABLE "doctors" DROP CONSTRAINT "FK_55651e05e46413d510215535edf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "consultation_queue" DROP CONSTRAINT "FK_bb14b7398d8f1e29206d5d90a03"`,
    );
    await queryRunner.query(
      `ALTER TABLE "consultation_queue" DROP CONSTRAINT "FK_f5f29d7e0713e5293c30c9b7e08"`,
    );
    await queryRunner.query(
      `ALTER TABLE "availability_slots" DROP CONSTRAINT "FK_8000d7470e6c862af2ff3f0ceae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "FK_074c4e87da10ac958c44c9562f3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "FK_0c1af27b469cb8dca420c160d65"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "FK_13c2e57cb81b44f062ba24df57d"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE "consultation_queue"`);
    await queryRunner.query(
      `DROP TYPE "public"."consultation_queue_status_enum"`,
    );

    await queryRunner.query(`DROP TABLE "availability_slots"`);
    await queryRunner.query(
      `DROP TYPE "public"."availability_slots_status_enum"`,
    );

    await queryRunner.query(`DROP TABLE "appointments"`);
    await queryRunner.query(`DROP TYPE "public"."appointments_status_enum"`);

    await queryRunner.query(`DROP TABLE "doctors"`);
    await queryRunner.query(`DROP TYPE "public"."doctors_status_enum"`);

    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
