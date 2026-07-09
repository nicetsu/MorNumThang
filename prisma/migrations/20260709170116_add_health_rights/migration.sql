-- CreateTable
CREATE TABLE "HealthRight" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eligibleUsers" TEXT NOT NULL,
    "facility" TEXT NOT NULL,
    "monthlyCost" TEXT NOT NULL,
    "coverageLevel" TEXT NOT NULL,

    CONSTRAINT "HealthRight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "responsibility" TEXT NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationRule" (
    "id" SERIAL NOT NULL,
    "serviceName" TEXT NOT NULL,
    "right" TEXT NOT NULL,
    "facility" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "RecommendationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequiredDoc" (
    "id" SERIAL NOT NULL,
    "service" TEXT NOT NULL,
    "docs" TEXT NOT NULL,

    CONSTRAINT "RequiredDoc_pkey" PRIMARY KEY ("id")
);
