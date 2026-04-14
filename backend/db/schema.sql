CREATE TABLE users (
    id            INT          NOT NULL AUTO_INCREMENT,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE collection_entries (
    id               INT                                          NOT NULL AUTO_INCREMENT,
    user_id          INT                                          NOT NULL,
    musicbrainz_id   VARCHAR(100)                                 NOT NULL,
    entity_type      ENUM('artist', 'release')                    NOT NULL,
    name             VARCHAR(255)                                 NOT NULL,
    artist_name      VARCHAR(255)                                 NULL,
    tag              ENUM('loved', 'want_to_listen', 'overrated') NOT NULL,
    take             TEXT                                         NULL,
    saved_at         DATETIME                                     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME                                     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_collection_user_id (user_id),
    INDEX idx_collection_tag (user_id, tag)
);
