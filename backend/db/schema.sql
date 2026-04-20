CREATE TABLE users (
    id            INT          NOT NULL AUTO_INCREMENT,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS follows (
    id           INT      NOT NULL AUTO_INCREMENT,
    follower_id  INT      NOT NULL,
    following_id INT      NOT NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_follow (follower_id, following_id),
    FOREIGN KEY (follower_id)  REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_follows_follower  (follower_id),
    INDEX idx_follows_following (following_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id           INT          NOT NULL AUTO_INCREMENT,
    user_id      INT          NOT NULL,
    from_user_id INT          NOT NULL,
    type         VARCHAR(50)  NOT NULL DEFAULT 'follow',
    read_flag    TINYINT(1)   NOT NULL DEFAULT 0,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id)      REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id)
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
