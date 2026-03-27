-- Script para crear billeteras de 'snack' faltantes para alumnos existentes
-- Esto resuelve el problema de "Billetera no existe" encontrado en la auditoría

INSERT INTO wallets (consumer_id, type, balance)
SELECT c.id, 'snack', 0.00
FROM consumers c
LEFT JOIN wallets w ON c.id = w.consumer_id AND w.type = 'snack'
WHERE c.type = 'student' AND w.id IS NULL;

-- Log para verificación
-- SELECT count(*) from wallets where type = 'snack';
