process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'secreto-de-prueba-16-caracteres-min';
process.env.MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/mainplataform-test';
