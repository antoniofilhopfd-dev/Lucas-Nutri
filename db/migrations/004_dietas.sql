-- Dietas versionadas e base de alimentos (fonte, versão e licença obrigatórias).
CREATE TABLE food_database (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(190) NOT NULL, source VARCHAR(120) NOT NULL, source_version VARCHAR(40) NOT NULL, license VARCHAR(190) NOT NULL,
  serving_unit ENUM('g','ml') NOT NULL DEFAULT 'g',
  calories DECIMAL(8,2) NOT NULL, protein DECIMAL(7,2) NOT NULL, carbohydrate DECIMAL(7,2) NOT NULL, fat DECIMAL(7,2) NOT NULL,
  fiber DECIMAL(7,2) NULL, sodium DECIMAL(9,2) NULL, micronutrients JSON NULL,
  UNIQUE KEY uq_food (name, source, source_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE diets (
  id CHAR(36) NOT NULL PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  consultation_id CHAR(36) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  parent_id CHAR(36) NULL,
  status ENUM('draft','reviewed','finalized','published','superseded') NOT NULL DEFAULT 'draft',
  notes TEXT NULL, vet_kcal DECIMAL(10,2) NULL,
  created_by CHAR(36) NOT NULL,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_flag TINYINT AS (IF(status = 'published', 1, NULL)) VIRTUAL,   -- 1 publicada por paciente
  UNIQUE KEY uq_diet_version (patient_id, version),
  UNIQUE KEY uq_one_published (patient_id, published_flag),
  KEY ix_diets_patient (patient_id, status),
  CONSTRAINT fk_diets_patient FOREIGN KEY (patient_id) REFERENCES patients (id),
  CONSTRAINT fk_diets_cons FOREIGN KEY (consultation_id) REFERENCES consultations (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE diet_meals (
  id CHAR(36) NOT NULL PRIMARY KEY,
  diet_id CHAR(36) NOT NULL,
  name VARCHAR(80) NOT NULL, meal_time TIME NULL, position INT NOT NULL DEFAULT 0, notes TEXT NULL,
  KEY ix_meals_diet (diet_id),
  CONSTRAINT fk_meals_diet FOREIGN KEY (diet_id) REFERENCES diets (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE diet_foods (
  id CHAR(36) NOT NULL PRIMARY KEY,
  meal_id CHAR(36) NOT NULL,
  food_id CHAR(36) NOT NULL,
  quantity DECIMAL(8,2) NOT NULL, household_measure VARCHAR(80) NULL, notes TEXT NULL,
  substitution_for CHAR(36) NULL,
  KEY ix_foods_meal (meal_id),
  CONSTRAINT fk_foods_meal FOREIGN KEY (meal_id) REFERENCES diet_meals (id) ON DELETE CASCADE,
  CONSTRAINT fk_foods_food FOREIGN KEY (food_id) REFERENCES food_database (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
