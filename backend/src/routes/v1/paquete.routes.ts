import { Router } from "express";
import { body, param } from "express-validator";
import { paqueteController } from "../../controllers/paquete.controller";
import { authMiddleware, requireRol } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { uploadArchivoMiddleware } from "../../middlewares/upload.middleware";

const router = Router();

/**
 * @swagger
 * /paquetes:
 *   get:
 *     summary: Listar paquetes activos
 *     description: Catálogo público de paquetes disponibles para compra, ordenados por precio.
 *     tags: [Paquetes]
 *     responses:
 *       200:
 *         description: Lista de paquetes activos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paquetes:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Paquete' }
 */
router.get(
  "/paquetes",
  paqueteController.listarActivos.bind(paqueteController),
);

/**
 * @swagger
 * /paquetes/admin:
 *   get:
 *     summary: Listar todos los paquetes (incluye inactivos)
 *     description: Solo administradores.
 *     tags: [Paquetes]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista completa de paquetes
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (requiere rol admin)
 */
router.get(
  "/paquetes/admin",
  authMiddleware,
  requireRol("admin"),
  paqueteController.listarTodos.bind(paqueteController),
);

/**
 * @swagger
 * /paquetes/{slug}:
 *   get:
 *     summary: Obtener paquete por slug
 *     description: Detalle público de un paquete activo.
 *     tags: [Paquetes]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         example: operativo
 *     responses:
 *       200:
 *         description: Paquete encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paquete: { $ref: '#/components/schemas/Paquete' }
 *       404:
 *         description: Paquete no encontrado
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ApiError' } } }
 */
router.get(
  "/paquetes/:slug",
  param("slug").isString().notEmpty(),
  validate,
  paqueteController.obtenerPorSlug.bind(paqueteController),
);

/**
 * @swagger
 * /paquetes:
 *   post:
 *     summary: Crear paquete
 *     description: Solo administradores.
 *     tags: [Paquetes]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PaqueteInput' }
 *     responses:
 *       201:
 *         description: Paquete creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paquete: { $ref: '#/components/schemas/Paquete' }
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
  "/paquetes",
  authMiddleware,
  requireRol("admin"),
  body("nombre").isString().isLength({ min: 2, max: 80 }).trim(),
  body("slug")
    .isString()
    .matches(/^[a-z0-9-]+$/)
    .withMessage("Slug inválido (solo minúsculas, números y guiones)")
    .trim(),
  body("tipo").isIn(["validor", "corporativo", "operativo"]),
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
  paqueteController.crear.bind(paqueteController),
);

/**
 * @swagger
 * /paquetes/{id}:
 *   put:
 *     summary: Actualizar paquete
 *     description: Solo administradores. Actualización parcial (envía solo los campos a cambiar).
 *     tags: [Paquetes]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/PaqueteInput' }
 *     responses:
 *       200:
 *         description: Paquete actualizado
 *       404:
 *         description: Paquete no encontrado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.put(
  "/paquetes/:id",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId().withMessage("ID inválido"),
  body("nombre").optional().isString().isLength({ min: 2, max: 80 }).trim(),
  body("slug")
    .optional()
    .isString()
    .matches(/^[a-z0-9-]+$/),
  body("tipo").optional().isIn(["validor", "corporativo", "operativo"]),
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
  paqueteController.actualizar.bind(paqueteController),
);

/**
 * @swagger
 * /paquetes/{id}:
 *   delete:
 *     summary: Eliminar paquete
 *     description: Solo administradores. Borrado físico del documento.
 *     tags: [Paquetes]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Paquete eliminado
 *       404:
 *         description: Paquete no encontrado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.delete(
  "/paquetes/:id",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId().withMessage("ID inválido"),
  validate,
  paqueteController.eliminar.bind(paqueteController),
);

/**
 * @swagger
 * /paquetes/{id}/imagen:
 *   post:
 *     summary: Subir imagen de portada del paquete
 *     description: |
 *       Multipart/form-data, campo "imagen" (JPG/PNG/WebP, máx 5 MB).
 *       El tipo real se valida por contenido (magic bytes) y se optimiza con Sharp.
 *     tags: [Paquetes]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *         description: Paquete no encontrado
 */
router.post(
  "/paquetes/:id/imagen",
  authMiddleware,
  requireRol("admin"),
  uploadArchivoMiddleware.single("imagen"),
  param("id").isMongoId(),
  validate,
  paqueteController.subirImagenPrincipal.bind(paqueteController),
);

/**
 * @swagger
 * /paquetes/{id}/galeria:
 *   post:
 *     summary: Añadir imagen a la galería del paquete
 *     description: Multipart/form-data, campo "imagen". Mismas validaciones que la portada.
 *     tags: [Paquetes]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *         description: Paquete no encontrado
 */
router.post(
  "/paquetes/:id/galeria",
  authMiddleware,
  requireRol("admin"),
  uploadArchivoMiddleware.single("imagen"),
  param("id").isMongoId(),
  validate,
  paqueteController.agregarImagenGaleria.bind(paqueteController),
);

/**
 * @swagger
 * /paquetes/{id}/galeria/{imagenPublicId}:
 *   delete:
 *     summary: Eliminar imagen de la galería del paquete
 *     tags: [Paquetes]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: imagenPublicId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Imagen eliminada
 *       404:
 *         description: Paquete o imagen no encontrada
 */
router.delete(
  "/paquetes/:id/galeria/:imagenPublicId(*)",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId(),
  param("imagenPublicId").isString().notEmpty(),
  validate,
  paqueteController.eliminarImagenGaleria.bind(paqueteController),
);

export default router;
