import multer from "multer";
import { TAMANO_MAX_ARCHIVO } from "../utils/archivos";

/** Campo del formulario donde llega el archivo del briefing. */
export const CAMPO_ARCHIVO = "archivo";

export const uploadArchivoMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: TAMANO_MAX_ARCHIVO,
    files: 1,
  },
});
