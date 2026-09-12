import { Router } from "express";
import { body, param } from "express-validator";
import { briefingController } from "../../controllers/briefing.controller";
import { authMiddleware, requireRol } from "../../middlewares/auth.middleware";
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
/**
 * @swagger
 * /proyectos/{proyectoId}/briefing/exportar:
 *   get:
 *     summary: Exportar el briefing + vistas a texto plano (.txt)
 *     description: Informe del proyecto para compartir/imprimir.
 *     tags: [Briefing]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: proyectoId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Archivo de texto
 *       404:
 *         description: Proyecto no encontrado
 */
router.get(
  "/proyectos/:proyectoId/briefing/exportar",
  authMiddleware,
  param("proyectoId").isMongoId(),
  validate,
  briefingController.exportar.bind(briefingController),
);

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
 * /briefing/{proyectoId}/vistas/{vistaId}:
 *   put:
 *     summary: Actualizar requisitos o semáforo de una vista del briefing
 *     description: |
 *       El cliente puede cambiar los requisitos; el admin puede cambiar el
 *       semáforo (pendiente/negociacion/aprobada) y el nombre. La negociación
 *       detallada va en el chat (contexto "vista").
 *     tags: [Briefing]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: proyectoId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: vistaId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requisitos: { type: string }
 *               semaforo: { type: string, enum: [pendiente, negociacion, aprobada] }
 *               nombre: { type: string }
 *     responses:
 *       200:
 *         description: Vista actualizada
 *       404:
 *         description: La vista no existe en este briefing
 */
router.put(
  "/briefing/:proyectoId/vistas/:vistaId",
  authMiddleware,
  param("proyectoId").isMongoId(),
  param("vistaId").isMongoId(),
  body("requisitos").optional().isString().isLength({ max: 4000 }).trim(),
  body("semaforo")
    .optional()
    .isIn(["pendiente", "negociacion", "cotizacion", "aprobada"]),
  body("nombre").optional().isString().isLength({ max: 100 }).trim(),
  validate,
  briefingController.actualizarVista.bind(briefingController),
);

/**
 * @swagger
 * /briefing/{proyectoId}/vistas:
 *   post:
 *     summary: Agregar una vista/función al proyecto (cliente o admin)
 *     description: |
 *       Cada vista del briefing equivale a una función del paquete: el cliente
 *       puede sumar más vistas y luego negociarlas con el equipo.
 *     tags: [Briefing]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: proyectoId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre: { type: string }
 *     responses:
 *       201:
 *         description: Vista creada (semáforo pendiente)
 *       409:
 *         description: Ya existe una vista con ese nombre
 */
router.post(
  "/briefing/:proyectoId/vistas",
  authMiddleware,
  param("proyectoId").isMongoId(),
  body("nombre").isString().isLength({ min: 2, max: 100 }).trim(),
  body("costoSugerido").optional().isFloat({ min: 0 }),
  body("requisitos").optional().isString().isLength({ max: 500 }).trim(),
  validate,
  briefingController.agregarVista.bind(briefingController),
);

/**
 * @swagger
 * /briefing/{proyectoId}/vistas/{vistaId}/obra-gris:
 *   post:
 *     summary: Publicar la obra gris (wireframe) del admin en una vista
 *     description: Multipart/form-data, campo "imagen" (JPG/PNG/WebP). Solo admin.
 *     tags: [Briefing]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: proyectoId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: vistaId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [imagen]
 *             properties:
 *               imagen: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Obra gris actualizada
 *       403:
 *         description: Solo el equipo puede publicar obra gris
 */
router.post(
  "/briefing/:proyectoId/vistas/:vistaId/obra-gris",
  authMiddleware,
  requireRol("admin"),
  uploadArchivoMiddleware.single("imagen"),
  param("proyectoId").isMongoId(),
  param("vistaId").isMongoId(),
  validate,
  briefingController.subirObraGrisVista.bind(briefingController),
);

/**
 * @swagger
 * /briefing/{proyectoId}/vistas/{vistaId}/archivos:
 *   post:
 *     summary: Subir documento de una vista del briefing (imagen o PDF)
 *     tags: [Briefing]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: proyectoId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: vistaId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [archivo]
 *             properties:
 *               archivo: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Archivo añadido
 */
router.post(
  "/briefing/:proyectoId/vistas/:vistaId/archivos",
  authMiddleware,
  uploadArchivoMiddleware.single("archivo"),
  param("proyectoId").isMongoId(),
  param("vistaId").isMongoId(),
  validate,
  briefingController.agregarArchivoVista.bind(briefingController),
);

/**
 * @swagger
 * /briefing/{proyectoId}/vistas/{vistaId}/archivos/{archivoId}:
 *   delete:
 *     summary: Eliminar documento de una vista del briefing
 *     tags: [Briefing]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: proyectoId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: vistaId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: archivoId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Archivo eliminado
 */
router.delete(
  "/briefing/:proyectoId/vistas/:vistaId/archivos/:archivoId",
  authMiddleware,
  param("proyectoId").isMongoId(),
  param("vistaId").isMongoId(),
  param("archivoId").isString().notEmpty(),
  validate,
  briefingController.eliminarArchivoVista.bind(briefingController),
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
