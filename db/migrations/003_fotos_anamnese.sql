-- Fotometria (arquivos no disco do servidor, fora da pasta pública) e anamnese com revisão humana.
CREATE TABLE photometric_assessments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  consultation_id CHAR(36) NOT NULL,
  captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pa_patient FOREIGN KEY (patient_id) REFERENCES patients (id),
  CONSTRAINT fk_pa_cons FOREIGN KEY (consultation_id) REFERENCES consultations (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE body_photos (
  id CHAR(36) NOT NULL PRIMARY KEY,
  photometric_assessment_id CHAR(36) NOT NULL,
  patient_id CHAR(36) NOT NULL,
  angle ENUM('front','right_side','left_side','back') NOT NULL,
  storage_path VARCHAR(255) NOT NULL,              -- relativo a STORAGE_DIR; nunca público
  mime_type ENUM('image/webp','image/jpeg') NOT NULL,
  file_size INT NOT NULL,
  captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_photo_path (storage_path),
  UNIQUE KEY uq_photo_angle (photometric_assessment_id, angle),
  KEY ix_photo_patient (patient_id),
  CONSTRAINT fk_photo_assess FOREIGN KEY (photometric_assessment_id) REFERENCES photometric_assessments (id),
  CONSTRAINT fk_photo_patient FOREIGN KEY (patient_id) REFERENCES patients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE anamneses (
  id CHAR(36) NOT NULL PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  consultation_id CHAR(36) NOT NULL,
  raw_text MEDIUMTEXT NULL, transcript MEDIUMTEXT NULL, audio_storage_path VARCHAR(255) NULL,
  stt_provider VARCHAR(60) NULL, extractor_provider VARCHAR(60) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_an_patient FOREIGN KEY (patient_id) REFERENCES patients (id),
  CONSTRAINT fk_an_cons FOREIGN KEY (consultation_id) REFERENCES consultations (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE anamnesis_items (            -- dado clínico = somente confirmed/edited
  id CHAR(36) NOT NULL PRIMARY KEY,
  anamnesis_id CHAR(36) NOT NULL,
  patient_id CHAR(36) NOT NULL,
  category ENUM('sleep','nutrition','gastro','health') NOT NULL,
  field VARCHAR(80) NOT NULL, value TEXT NOT NULL,
  source_kind ENUM('text','audio','manual') NOT NULL, source_snippet TEXT NULL,
  confidence DECIMAL(4,3) NULL,
  status ENUM('pending','confirmed','edited','rejected') NOT NULL DEFAULT 'pending',
  decided_by CHAR(36) NULL, decided_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_ai_patient (patient_id, status),
  CONSTRAINT fk_ai_an FOREIGN KEY (anamnesis_id) REFERENCES anamneses (id),
  CONSTRAINT fk_ai_patient FOREIGN KEY (patient_id) REFERENCES patients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
