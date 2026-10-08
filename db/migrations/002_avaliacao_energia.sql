-- Avaliação física, composição corporal e gasto energético. Cada linha guarda patient_id e consultation_id.
CREATE TABLE anthropometric_assessments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  consultation_id CHAR(36) NOT NULL,
  assessment_date DATE NOT NULL,
  age_at_assessment DECIMAL(5,2) NOT NULL,       -- idade na data da avaliação, preservada
  weight_kg DECIMAL(5,2) NOT NULL,
  height_cm DECIMAL(5,1) NOT NULL,
  bmi DECIMAL(6,3) NULL, waist_hip_ratio DECIMAL(6,4) NULL, waist_height_ratio DECIMAL(6,4) NULL,
  classification_source VARCHAR(80) NULL, classification_version VARCHAR(20) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_assess_patient (patient_id, assessment_date),
  CONSTRAINT fk_assess_patient FOREIGN KEY (patient_id) REFERENCES patients (id),
  CONSTRAINT fk_assess_cons FOREIGN KEY (consultation_id) REFERENCES consultations (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE circumference_measurements (
  id CHAR(36) NOT NULL PRIMARY KEY,
  assessment_id CHAR(36) NOT NULL,
  patient_id CHAR(36) NOT NULL,
  site VARCHAR(40) NOT NULL,
  side ENUM('right','left','center') NOT NULL,
  value_cm DECIMAL(5,1) NOT NULL,
  UNIQUE KEY uq_circ (assessment_id, site, side),
  CONSTRAINT fk_circ_assess FOREIGN KEY (assessment_id) REFERENCES anthropometric_assessments (id),
  CONSTRAINT fk_circ_patient FOREIGN KEY (patient_id) REFERENCES patients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE skinfold_assessments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  consultation_id CHAR(36) NOT NULL,
  protocol VARCHAR(40) NOT NULL, protocol_version VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_skin_patient FOREIGN KEY (patient_id) REFERENCES patients (id),
  CONSTRAINT fk_skin_cons FOREIGN KEY (consultation_id) REFERENCES consultations (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE skinfold_measurements (
  id CHAR(36) NOT NULL PRIMARY KEY,
  skinfold_assessment_id CHAR(36) NOT NULL,
  patient_id CHAR(36) NOT NULL,
  site VARCHAR(40) NOT NULL,
  value_mm DECIMAL(4,1) NOT NULL,
  UNIQUE KEY uq_skm (skinfold_assessment_id, site),
  CONSTRAINT fk_skm_assess FOREIGN KEY (skinfold_assessment_id) REFERENCES skinfold_assessments (id),
  CONSTRAINT fk_skm_patient FOREIGN KEY (patient_id) REFERENCES patients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE body_composition_results (   -- inputs/outputs completos: reconstrói o cálculo
  id CHAR(36) NOT NULL PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  consultation_id CHAR(36) NOT NULL,
  skinfold_assessment_id CHAR(36) NULL,
  protocol VARCHAR(40) NULL, formula_version VARCHAR(20) NULL,
  fat_equation VARCHAR(20) NULL, fat_equation_version VARCHAR(20) NULL,
  inputs JSON NOT NULL, outputs JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_bcr_patient (patient_id, created_at),
  CONSTRAINT fk_bcr_patient FOREIGN KEY (patient_id) REFERENCES patients (id),
  CONSTRAINT fk_bcr_cons FOREIGN KEY (consultation_id) REFERENCES consultations (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE energy_calculations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  consultation_id CHAR(36) NOT NULL,
  equation VARCHAR(40) NOT NULL, equation_version VARCHAR(20) NOT NULL,
  method ENUM('factorial','detailed') NOT NULL,
  tef DECIMAL(4,3) NULL,
  inputs JSON NOT NULL, outputs JSON NOT NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_energy_patient (patient_id, created_at),
  CONSTRAINT fk_energy_patient FOREIGN KEY (patient_id) REFERENCES patients (id),
  CONSTRAINT fk_energy_cons FOREIGN KEY (consultation_id) REFERENCES consultations (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE caloric_strategies (
  id CHAR(36) NOT NULL PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  consultation_id CHAR(36) NOT NULL,
  energy_calculation_id CHAR(36) NOT NULL,
  strategy_type ENUM('maintenance','percent','absolute') NOT NULL,
  strategy_value DECIMAL(10,2) NULL,
  get_kcal DECIMAL(10,2) NOT NULL, vet_kcal DECIMAL(10,2) NOT NULL,
  macro_mode ENUM('percent','g_per_kg') NULL,
  macro_inputs JSON NULL, macro_outputs JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_strat_patient (patient_id, created_at),
  CONSTRAINT fk_strat_patient FOREIGN KEY (patient_id) REFERENCES patients (id),
  CONSTRAINT fk_strat_cons FOREIGN KEY (consultation_id) REFERENCES consultations (id),
  CONSTRAINT fk_strat_energy FOREIGN KEY (energy_calculation_id) REFERENCES energy_calculations (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
