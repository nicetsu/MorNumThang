-- Prevent duplicate care tasks (same title in the same category for a patient).
CREATE UNIQUE INDEX "CareTask_patientId_category_title_key" ON "CareTask"("patientId", "category", "title");
