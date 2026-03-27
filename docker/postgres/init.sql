-- Se ejecuta solo al crear el volumen de datos por primera vez.
-- La imagen ya incluye el binario de pgvector; aquí se activa en la base idealow.
CREATE EXTENSION IF NOT EXISTS vector;
