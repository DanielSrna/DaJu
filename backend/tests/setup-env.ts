process.env.NODE_ENV = "test";
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? "secreto-de-prueba-16-caracteres-min";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? "refresh-secreto-de-prueba-16-caracteres";
process.env.MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://localhost:27017/mainplataform-test";
process.env.CONTACT_EMAIL = process.env.CONTACT_EMAIL ?? "admin-contacto@test.com";
