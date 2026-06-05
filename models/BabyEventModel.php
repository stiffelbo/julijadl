<?php
declare(strict_types=1);

final class BabyEventModel
{
    public function __construct(
        private PDO $db,
    ) {}

    public function all(): array
    {
        $stmt = $this->db->query("
            SELECT id, event_date AS date, event_time AS time, value
            FROM baby_events
            ORDER BY event_date DESC, event_time DESC, id DESC
        ");

        return $stmt->fetchAll();
    }

    public function create(string $date, string $time, string $value): int
    {
        $stmt = $this->db->prepare("
            INSERT INTO baby_events (event_date, event_time, value)
            VALUES (:date, :time, :value)
        ");

        $stmt->execute([
            'date' => $date,
            'time' => $time,
            'value' => $value,
        ]);

        return (int)$this->db->lastInsertId();
    }

    public function update(int $id, string $date, string $time, string $value): bool
    {
        $stmt = $this->db->prepare("
            UPDATE baby_events
            SET event_date = :date,
                event_time = :time,
                value = :value
            WHERE id = :id
            LIMIT 1
        ");

        return $stmt->execute([
            'id' => $id,
            'date' => $date,
            'time' => $time,
            'value' => $value,
        ]);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare("
            DELETE FROM baby_events
            WHERE id = :id
            LIMIT 1
        ");

        return $stmt->execute(['id' => $id]);
    }
}