import { Router } from "express";
import { body, param } from "express-validator";
import { briefingController } from "../../controllers/briefing.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  uploadArchivoMiddleware,
  CAMPO_ARCHIVO,
} from "../../middlewares/upload.middleware";

const router = Router();

/**
 * @swagger
 * /briefing/{proyectoId}:
 *   get:
 *     summary: Obtener el briefing del proyecto
 *     description: El cliente accede solo a sus proyectos; el admin a cualquiera.
 *     tags: [Briefing]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: proyectoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Briefing (se crea vacío si no existe)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 briefing: { $ref: '#/components/schemas/Briefing' }
 *       403:
 *         description: Proyecto ajeno
 *       404:
 *         description: Proyecto no encontrado
 */
router.get(
  "/briefing/:proyectoId",
  authMiddleware,
  param("proyectoId").isMongoId(),
  validate,
  briefingController.obtener.bind(briefingController),
);

/**
 * @swagger
 * /briefing/{proyectoId}:
 *   put:
 *     summary: Guardar contenido del briefing
 *     description: |
 *       El documento maestro: textos, descripción, objetivos y requerimientos.
 *       Opcional: marcarlo como completado (completado: true).
 *     tags: [Briefing]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: proyectoId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contenido:
 *                 type: object
 *                 properties:
 *                   empresa: { type: string }
 *                   descripcionNegocio: { type: string }
 *                   objetivos: { type: string }
 *                   textos: { type: object, description: Bloques de texto key-value para la web }
 *                   requerimientos: { type: string }
 *                   extras: { type: object }
 *               completado: { type: boolean }
 *     responses:
 *       200:
 *         description: Briefing guardado
 *       403:
 *         description: Proyecto ajeno
 */
router.put(
  "/briefing/:proyectoId",
  authMiddleware,
  param("proyectoId").isMongoId(),
  body("contenido").optional().isObject(),
  body("completado").optional().isBoolean(),
  validate,
  briefingController.guardarContenido.bind(briefingController),
);

/**
 * @swagger
 * /briefing/{proyectoId}/archivos:
 *   post:
 *     summary: Subir archivo al briefing (logo, imagen o PDF)
 *     description: |
 *       Multipart/form-data. Campo archivo (máx 5 MB) + campo tipo
 *       (logo | imagen | pdf | otro). El tipo REAL se valida por contenido
 *       (magic bytes); las imágenes se optimizan con Sharp.
 *     tags: [Briefing]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: proyectoId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [archivo, tipo]
 *             properties:
 *               archivo: { type: string, format: binary }
 *               tipo: { type: string, enum: [logo, imagen, pdf, otro] }
 *     responses:
 *       201:
 *         description: Archivo subido y almacenado en la nube
 *       400:
 *         description: Tipo no permitido o peso excedido
 */
router.post(
  "/briefing/:proyectoId/archivos",
  authMiddleware,
  uploadArchivoMiddleware.single(CAMPO_ARCHIVO),
  param("proyectoId").isMongoId(),
  body("tipo").optional().isIn(["logo", "imagen", "pdf", "otro"]),
  validate,
  briefingController.subirArchivo.bind(briefingController),
);

/**
 * @swagger
 * /briefing/{proyectoId}/archivos/{archivoId}:
 *   delete:
 *     summary: Eliminar archivo del briefing
 *     description: Borra el archivo del almacenamiento en la nube y del briefing.
 *     tags: [Briefing]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: proyectoId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: archivoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Archivo eliminado
 *       404:
 *         description: Archivo no encontrado
 */
router.delete(
  "/briefing/:proyectoId/archivos/:archivoId",
  authMiddleware,
  param("proyectoId").isMongoId(),
  param("archivoId").isMongoId(),
  validate,
  briefingController.eliminarArchivo.bind(briefingController),
);

export default router;
