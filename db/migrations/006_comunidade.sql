-- BentoNutriClub: uma comunidade por nutricionista; moderação pela equipe.
CREATE TABLE community_challenges (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nutritionist_id CHAR(36) NOT NULL,
  title VARCHAR(160) NOT NULL, description TEXT NULL, starts_on DATE NOT NULL, ends_on DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ch_nutri FOREIGN KEY (nutritionist_id) REFERENCES nutritionists (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE community_posts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  community_id CHAR(36) NOT NULL,
  author_id CHAR(36) NOT NULL,
  kind ENUM('meal','achievement','recipe','tip','substitution','challenge','official') NOT NULL,
  body TEXT NOT NULL, image_path VARCHAR(255) NULL, challenge_id CHAR(36) NULL,
  status ENUM('visible','hidden','deleted') NOT NULL DEFAULT 'visible',
  featured TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_posts_comm (community_id, created_at),
  CONSTRAINT fk_post_comm FOREIGN KEY (community_id) REFERENCES nutritionists (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE community_comments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  post_id CHAR(36) NOT NULL, author_id CHAR(36) NOT NULL,
  body TEXT NOT NULL, status ENUM('visible','hidden','deleted') NOT NULL DEFAULT 'visible',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_cm_post (post_id, created_at),
  CONSTRAINT fk_cm_post FOREIGN KEY (post_id) REFERENCES community_posts (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE community_likes (
  post_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id),
  CONSTRAINT fk_lk_post FOREIGN KEY (post_id) REFERENCES community_posts (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
