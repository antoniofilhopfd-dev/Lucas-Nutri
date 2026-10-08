-- Check-ins, refeições, mensagens e micro-feedback.
CREATE TABLE patient_checkins (
  id CHAR(36) NOT NULL PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  checkin_date DATE NOT NULL,
  water_ml INT NOT NULL DEFAULT 0, water_goal_ml INT NOT NULL DEFAULT 3000,
  trained TINYINT(1) NULL, training_modality VARCHAR(40) NULL, training_minutes INT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_checkin_day (patient_id, checkin_date),
  CONSTRAINT fk_ck_patient FOREIGN KEY (patient_id) REFERENCES patients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE patient_meal_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  log_date DATE NOT NULL,
  meal_type ENUM('breakfast','lunch','afternoon_snack','dinner','supper') NOT NULL,
  photo_path VARCHAR(255) NULL,
  feeling_before ENUM('anxious','very_hungry','calm','stressed','not_hungry','other') NULL,
  feeling_after ENUM('satisfied','bloated','guilty','energized','still_hungry','other') NULL,
  logged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_meallog_patient (patient_id, log_date),
  CONSTRAINT fk_ml_patient FOREIGN KEY (patient_id) REFERENCES patients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE messages (
  id CHAR(36) NOT NULL PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  sender_id CHAR(36) NOT NULL, receiver_id CHAR(36) NOT NULL,
  kind ENUM('text','audio') NOT NULL,
  body TEXT NULL, audio_path VARCHAR(255) NULL, duration_s DECIMAL(6,1) NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, read_at DATETIME NULL,
  KEY ix_msg_patient (patient_id, sent_at),
  CONSTRAINT fk_msg_patient FOREIGN KEY (patient_id) REFERENCES patients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE micro_feedback (
  id CHAR(36) NOT NULL PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  nutritionist_id CHAR(36) NOT NULL,
  target_type ENUM('photo','checkin','meal') NOT NULL, target_id CHAR(36) NOT NULL,
  kind ENUM('text','audio','badge') NOT NULL,
  body TEXT NULL, audio_path VARCHAR(255) NULL,
  badge ENUM('good_consistency','excellent_hydration','workout_done','good_choice','consistent_week') NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mf_patient FOREIGN KEY (patient_id) REFERENCES patients (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
