-- BentoNutriSync · MySQL/MariaDB (Hostinger). Esquema base: acesso, pacientes, consultas e auditoria.
-- Sem triggers, views ou procedures: a Hostinger pode negar esses privilégios. As regras de acesso e a
-- imutabilidade de registros ficam no código (src/server), dentro de transações.
-- Datas em UTC (DATETIME). IDs: CHAR(36) gerados pelo app.

CREATE TABLE usuarios (
  id CHAR(36) NOT NULL PRIMARY KEY,
  papel ENUM('patient','nutritionist','admin') NOT NULL,
  nome VARCHAR(160) NOT NULL,
  email VARCHAR(190) NULL,
  telefone VARCHAR(20) NULL,           -- E.164, login do paciente
  crn VARCHAR(40) NULL,                -- login do nutricionista
  senha_hash VARCHAR(255) NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuarios_email (email),
  UNIQUE KEY uq_usuarios_telefone (telefone),
  UNIQUE KEY uq_usuarios_crn (crn)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sessoes (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  usuario_id CHAR(36) NOT NULL,
  expira_em DATETIME NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip VARCHAR(64) NULL,
  agente VARCHAR(255) NULL,
  KEY ix_sessoes_usuario (usuario_id),
  CONSTRAINT fk_sessoes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE codigos_acesso (          -- código de uso único do paciente (SMS/WhatsApp)
  id CHAR(36) NOT NULL PRIMARY KEY,
  usuario_id CHAR(36) NOT NULL,
  codigo_hash CHAR(64) NOT NULL,
  expira_em DATETIME NOT NULL,
  usado_em DATETIME NULL,
  tentativas TINYINT NOT NULL DEFAULT 0,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_codigos_usuario (usuario_id, criado_em),
  CONSTRAINT fk_codigos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE log_acessos (             -- tentativas de login e acessos negados (limite de tentativas)
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_id CHAR(36) NULL,
  identificador VARCHAR(190) NULL,
  acao VARCHAR(40) NOT NULL,
  detalhe VARCHAR(255) NULL,
  ip VARCHAR(64) NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_log_criado (criado_em),
  KEY ix_log_falhas (acao, identificador, criado_em),
  KEY ix_log_falhas_ip (acao, ip, criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nutritionists (
  id CHAR(36) NOT NULL PRIMARY KEY,
  crn VARCHAR(40) NOT NULL,
  UNIQUE KEY uq_nutri_crn (crn),
  CONSTRAINT fk_nutri_usuario FOREIGN KEY (id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE patients (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nutritionist_id CHAR(36) NOT NULL,
  birth_date DATE NOT NULL,
  biological_sex ENUM('male','female') NOT NULL,
  preferred_name VARCHAR(80) NULL,
  gender_identity VARCHAR(80) NULL,       -- opcional; nunca usado em fórmulas
  sexual_orientation VARCHAR(80) NULL,    -- opcional; nunca usado em fórmulas
  ethnicity VARCHAR(80) NULL,             -- opcional; nunca usado em fórmulas
  occupation VARCHAR(120) NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(190) NULL,
  whatsapp VARCHAR(20) NULL,
  address JSON NULL,
  practices_sports TINYINT(1) NOT NULL DEFAULT 0,
  modalities JSON NULL,
  primary_modality VARCHAR(40) NULL,
  weekly_frequency TINYINT NULL,
  usual_training_time VARCHAR(40) NULL,
  primary_goal ENUM('weight_loss','hypertrophy','performance','recomposition','maintenance','health','other') NULL,
  secondary_goals JSON NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_patients_nutri (nutritionist_id),
  CONSTRAINT fk_patients_usuario FOREIGN KEY (id) REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT fk_patients_nutri FOREIGN KEY (nutritionist_id) REFERENCES nutritionists (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE patient_health_data (      -- dados de saúde separados do cadastro geral
  patient_id CHAR(36) NOT NULL PRIMARY KEY,
  chief_complaint TEXT NULL, clinical_history TEXT NULL, reported_conditions JSON NULL,
  family_history TEXT NULL, medications TEXT NULL, supplements TEXT NULL,
  allergies JSON NULL, intolerances JSON NULL, relevant_exams TEXT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_health_patient FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE consents (                 -- consentimentos por finalidade, com versão e revogação
  id CHAR(36) NOT NULL PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  purpose ENUM('care_data','clinical_images','public_images','communication','terms_of_use') NOT NULL,
  version VARCHAR(20) NOT NULL,
  accepted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  KEY ix_consents_patient (patient_id, purpose),
  CONSTRAINT fk_consents_patient FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE image_consents (
  id CHAR(36) NOT NULL PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  consultation_id CHAR(36) NULL,
  consent_type ENUM('clinical_use','public_use') NOT NULL,   -- nunca misturados
  consent_version VARCHAR(20) NOT NULL,
  accepted TINYINT(1) NOT NULL,
  accepted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  KEY ix_imgcons_patient (patient_id, consent_type, accepted_at),
  CONSTRAINT fk_imgcons_patient FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE consultations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  patient_id CHAR(36) NOT NULL,
  nutritionist_id CHAR(36) NOT NULL,
  consultation_type ENUM('initial','follow_up','reassessment','online') NOT NULL,
  status ENUM('scheduled','in_progress','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled',
  record_state ENUM('draft','finalized','amended') NOT NULL DEFAULT 'draft',
  scheduled_at DATETIME NULL, started_at DATETIME NULL, completed_at DATETIME NULL,
  clinical_notes TEXT NULL,
  version INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_cons_patient (patient_id, scheduled_at),
  KEY ix_cons_nutri (nutritionist_id),
  CONSTRAINT fk_cons_patient FOREIGN KEY (patient_id) REFERENCES patients (id),
  CONSTRAINT fk_cons_nutri FOREIGN KEY (nutritionist_id) REFERENCES nutritionists (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE consultation_amendments (  -- guarda o valor original de cada emenda
  id CHAR(36) NOT NULL PRIMARY KEY,
  consultation_id CHAR(36) NOT NULL,
  amended_by CHAR(36) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  previous_version INT NOT NULL,
  previous_snapshot JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_amend_cons (consultation_id),
  CONSTRAINT fk_amend_cons FOREIGN KEY (consultation_id) REFERENCES consultations (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NULL,
  patient_id CHAR(36) NULL,
  consultation_id CHAR(36) NULL,
  action VARCHAR(40) NOT NULL,
  entity VARCHAR(60) NOT NULL,
  entity_id VARCHAR(64) NULL,
  old_value JSON NULL,
  new_value JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_audit_patient (patient_id, created_at),
  KEY ix_audit_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE clinical_calculation_versions (
  formula_id VARCHAR(60) NOT NULL,
  version VARCHAR(20) NOT NULL,
  name VARCHAR(160) NOT NULL, author VARCHAR(160) NULL, year INT NULL,
  population VARCHAR(160) NULL, equation TEXT NULL, reference TEXT NOT NULL,
  effective_date DATE NOT NULL,
  review_status ENUM('approved','pending_review') NOT NULL,
  PRIMARY KEY (formula_id, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
