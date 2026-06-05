<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

$db = getDB();

$files = [
    __DIR__ . '/schema/baby_events.php',
];

try {
    foreach ($files as $file) {
        $statements = require $file;

        foreach ($statements as $sql) {
            $db->exec($sql);
        }
    }

    echo "Migracje wykonane OK";
} catch (Throwable $e) {
    http_response_code(500);
    echo "Błąd migracji: " . $e->getMessage();
}