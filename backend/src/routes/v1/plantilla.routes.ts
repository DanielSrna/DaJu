import { Router } from "express";
import { body, param } from "express-validator";
import { plantillaController } from "../../controllers/plantilla.controller";
import { authMiddleware, requireRol } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { uploadArchivoMiddleware } from "../../middlewares/upload.middleware";

const router = Router();

/**
 * @swagger
 * /plantillas:
 *   get:
 *     summary: Listar plantillas activas
 *     description: Catálogo público de plantillas listas para desplegar, ordenadas por precio.
 *     tags: [Plantillas]
 *     responses:
 *       200:
 *         description: Lista de plantillas activas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plantillas:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Plantilla' }
 */
router.get(
  "/plantillas",
  plantillaController.listarActivas.bind(plantillaController),
);

/**
 * @swagger
 * /plantillas/admin:
 *   get:
 *     summary: Listar todas las plantillas (incluye inactivas)
 *     description: Solo administradores.
 *     tags: [Plantillas]
 *     security: [cookieAuth: []]
 *     responses:
 *       200:
 *         description: Lista completa de plantillas
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (requiere rol admin)
 */
router.get(
  "/plantillas/admin",
  authMiddleware,
  requireRol("admin"),
  plantillaController.listarTodas.bind(plantillaController),
);

/**
 * @swagger
 * /plantillas/{slug}:
 *   get:
 *     summary: Obtener plantilla por slug
 *     description: Detalle público de una plantilla activa.
 *     tags: [Plantillas]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         example: reservas
 *     responses:
 *       200:
 *         description: Plantilla encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plantilla: { $ref: '#/components/schemas/Plantilla' }
 *       404:
 *         description: Plantilla no encontrada
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ApiError' } } }
 */
router.get(
  "/plantillas/:slug",
  param("slug").isString().notEmpty(),
  validate,
  plantillaController.obtenerPorSlug.bind(plantillaController),
);

/**
 * @swagger
 * /plantillas:
 *   post:
 *     summary: Crear plantilla
 *     description: Solo administradores.
 *     tags: [Plantillas]
 *     security: [cookieAuth: []]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PlantillaInput' }
 *     responses:
 *       201:
 *         description: Plantilla creada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plantilla: { $ref: '#/components/schemas/Plantilla' }
 *       400:
 *         description: Validación fallida
 *       409:
 *         description: Slug duplicado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.post(
  "/plantillas",
  authMiddleware,
  requireRol("admin"),
  body("nombre").isString().isLength({ min: 2, max: 80 }).trim(),
  body("slug")
    .isString()
    .matches(/^[a-z0-9-]+$/)
    .withMessage("Slug inválido (solo minúsculas, números y guiones)")
    .trim(),
  body("plataforma").isString().isLength({ min: 2, max: 60 }).trim(),
  body("descripcion").isString().isLength({ min: 10 }).trim(),
  body("precio").isFloat({ min: 0 }),
  body("moneda")
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .toUpperCase(),
  body("vistasIncluidas").isInt({ min: 1 }),
  body("soporteMeses").isInt({ min: 1 }),
  body("diasEntrega").isInt({ min: 1 }),
  body("features").optional().isArray(),
  body("features.*").optional().isString(),
  body("activo").optional().isBoolean(),
  validate,
  plantillaController.crear.bind(plantillaController),
);

/**
 * @swagger
 * /plantillas/{id}:
 *   put:
 *     summary: Actualizar plantilla
 *     description: Solo administradores. Actualización parcial.
 *     tags: [Plantillas]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PlantillaInput' }
 *     responses:
 *       200:
 *         description: Plantilla actualizada
 *       404:
 *         description: Plantilla no encontrada
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.put(
  "/plantillas/:id",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId().withMessage("ID inválido"),
  body("nombre").optional().isString().isLength({ min: 2, max: 80 }).trim(),
  body("slug")
    .optional()
    .isString()
    .matches(/^[a-z0-9-]+$/),
  body("plataforma").optional().isString().isLength({ min: 2, max: 60 }).trim(),
  body("descripcion").optional().isString().isLength({ min: 10 }).trim(),
  body("precio").optional().isFloat({ min: 0 }),
  body("moneda")
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .toUpperCase(),
  body("vistasIncluidas").optional().isInt({ min: 1 }),
  body("soporteMeses").optional().isInt({ min: 1 }),
  body("diasEntrega").optional().isInt({ min: 1 }),
  body("features").optional().isArray(),
  body("features.*").optional().isString(),
  body("detalles").optional().isArray(),
  body("detalles.*.titulo").optional().isString().isLength({ max: 100 }),
  body("detalles.*.texto").optional().isString().isLength({ max: 2000 }),
  body("activo").optional().isBoolean(),
  validate,
  plantillaController.actualizar.bind(plantillaController),
);

/**
 * @swagger
 * /plantillas/{id}:
 *   delete:
 *     summary: Eliminar plantilla
 *     description: Solo administradores. Borrado físico del documento.
 *     tags: [Plantillas]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Plantilla eliminada
 *       404:
 *         description: Plantilla no encontrada
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.delete(
  "/plantillas/:id",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId().withMessage("ID inválido"),
  validate,
  plantillaController.eliminar.bind(plantillaController),
);

/**
 * @swagger
 * /plantillas/{id}/imagen:
 *   post:
 *     summary: Subir imagen de portada de la plantilla
 *     description: |
 *       Multipart/form-data, campo "imagen" (JPG/PNG/WebP, máx 5 MB).
 *       El tipo real se valida por contenido y se optimiza con Sharp.
 *     tags: [Plantillas]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
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
 *         description: Portada actualizada
 *       400:
 *         description: No es una imagen válida o excede el peso
 *       404:
 *         description: Plantilla no encontrada
 */
router.post(
  "/plantillas/:id/imagen",
  authMiddleware,
  requireRol("admin"),
  uploadArchivoMiddleware.single("imagen"),
  param("id").isMongoId(),
  validate,
  plantillaController.subirImagenPrincipal.bind(plantillaController),
);

/**
 * @swagger
 * /plantillas/{id}/galeria:
 *   post:
 *     summary: Añadir imagen a la galería de la plantilla
 *     description: Multipart/form-data, campo "imagen". Mismas validaciones que la portada.
 *     tags: [Plantillas]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
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
 *       201:
 *         description: Imagen añadida a la galería
 *       400:
 *         description: No es una imagen válida o excede el peso
 *       404:
 *         description: Plantilla no encontrada
 */
router.post(
  "/plantillas/:id/galeria",
  authMiddleware,
  requireRol("admin"),
  uploadArchivoMiddleware.single("imagen"),
  param("id").isMongoId(),
  validate,
  plantillaController.agregarImagenGaleria.bind(plantillaController),
);

/**
 * @swagger
 * /plantillas/{id}/galeria/{imagenPublicId}:
 *   delete:
 *     summary: Eliminar imagen de la galería de la plantilla
 *     tags: [Plantillas]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: imagenPublicId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Imagen eliminada
 *       404:
 *         description: Plantilla o imagen no encontrada
 */
router.delete(
  "/plantillas/:id/galeria/:imagenPublicId(*)",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId(),
  param("imagenPublicId").isString().notEmpty(),
  validate,
  plantillaController.eliminarImagenGaleria.bind(plantillaController),
);

export default router;
