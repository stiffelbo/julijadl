<?php
declare(strict_types=1);

return [
    "
    CREATE TABLE IF NOT EXISTS baby_events (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        event_date DATE NOT NULL,
        event_time TIME NOT NULL,
        value VARCHAR(32) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        INDEX IDX_baby_events_date_time (event_date, event_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    "
];