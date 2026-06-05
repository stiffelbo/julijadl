<?php
declare(strict_types=1);

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../models/BabyEventModel.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!is_array($data)) {
        throw new InvalidArgumentException('Niepoprawny JSON.');
    }

    $date = trim((string)($data['date'] ?? ''));
    $time = trim((string)($data['time'] ?? ''));
    $value = trim((string)($data['value'] ?? ''));

    if ($date === '' || $time === '' || $value === '') {
        throw new InvalidArgumentException('Pola date, time i value są wymagane.');
    }

    $model = new BabyEventModel(getDB());

    $id = $model->create($date, $time, $value);

    echo json_encode([
        'success' => true,
        'id' => $id,
    ]);
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}