<?php
declare(strict_types=1);

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../models/BabyEventModel.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $model = new BabyEventModel(getDB());

    echo json_encode([
        'success' => true,
        'data' => $model->all(),
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}