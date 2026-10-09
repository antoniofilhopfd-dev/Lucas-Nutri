-- Convite por link: o administrador cadastra nome/CRN/e-mail e o próprio profissional escolhe a senha.
-- Só o SHA-256 do token fica no banco; o link aparece uma única vez para quem convidou.
CREATE TABLE convites (
  id CHAR(36) NOT NULL PRIMARY KEY,
  token_hash CHAR(64) NOT NULL,
  papel ENUM('nutritionist','admin') NOT NULL,
  nome VARCHAR(160) NOT NULL,
  crn VARCHAR(40) NULL,
  email VARCHAR(190) NOT NULL,
  criado_por CHAR(36) NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_em DATETIME NOT NULL,
  usado_em DATETIME NULL,
  revogado_em DATETIME NULL,
  UNIQUE KEY uq_convites_token (token_hash),
  KEY ix_convites_estado (usado_em, revogado_em, expira_em),
  CONSTRAINT fk_convites_criador FOREIGN KEY (criado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
