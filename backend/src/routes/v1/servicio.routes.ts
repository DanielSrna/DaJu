import { Router } from "express";
import { body, param } from "express-validator";
import { servicioController } from "../../controllers/servicio.controller";
import { authMiddleware, requireRol } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";

const router = Router();

/**
 * @swagger
 * /servicios:
 *   get:
 *     summary: Listar servicios activos
 *     description: Catálogo público de servicios de consultoría (por sesión), ordenados por precio.
 *     tags: [Servicios]
 *     responses:
 *       200:
 *         description: Lista de servicios activos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 servicios:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Servicio' }
 */
router.get(
  "/servicios",
  servicioController.listarActivos.bind(servicioController),
);

/**
 * @swagger
 * /servicios/admin:
 *   get:
 *     summary: Listar todos los servicios (incluye inactivos)
 *     description: Solo administradores.
 *     tags: [Servicios]
 *     security: [cookieAuth: []]
 *     responses:
 *       200:
 *         description: Lista completa de servicios
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (requiere rol admin)
 */
router.get(
  "/servicios/admin",
  authMiddleware,
  requireRol("admin"),
  servicioController.listarTodos.bind(servicioController),
);

/**
 * @swagger
 * /servicios/{slug}:
 *   get:
 *     summary: Obtener servicio por slug
 *     description: Detalle público de un servicio activo.
 *     tags: [Servicios]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         example: auditoria-codigo
 *     responses:
 *       200:
 *         description: Servicio encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 servicio: { $ref: '#/components/schemas/Servicio' }
 *       404:
 *         description: Servicio no encontrado
 *         content: { application/json: { schema: { $ref: '#/components/schemas/ApiError' } } }
 */
router.get(
  "/servicios/:slug",
  param("slug").isString().notEmpty(),
  validate,
  servicioController.obtenerPorSlug.bind(servicioController),
);

/**
 * @swagger
 * /servicios:
 *   post:
 *     summary: Crear servicio de consultoría
 *     description: Solo administradores.
 *     tags: [Servicios]
 *     security: [cookieAuth: []]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ServicioInput' }
 *     responses:
 *       201:
 *         description: Servicio creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 servicio: { $ref: '#/components/schemas/Servicio' }
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
  "/servicios",
  authMiddleware,
  requireRol("admin"),
  body("nombre").isString().isLength({ min: 2, max: 80 }).trim(),
  body("slug")
    .isString()
    .matches(/^[a-z0-9-]+$/)
    .withMessage("Slug inválido (solo minúsculas, números y guiones)")
    .trim(),
  body("categoria").isIn(["auditoria", "asesoria", "aceleracion"]),
  body("descripcion").isString().isLength({ min: 10 }).trim(),
  body("precio").isFloat({ min: 0 }),
  body("moneda")
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .toUpperCase(),
  body("duracionMin").optional().isInt({ min: 30, max: 240 }),
  body("canal").optional().isIn(["Meet", "Zoom"]),
  body("incluye").optional().isArray(),
  body("incluye.*").optional().isString(),
  body("activo").optional().isBoolean(),
  validate,
  servicioController.crear.bind(servicioController),
);

/**
 * @swagger
 * /servicios/{id}:
 *   put:
 *     summary: Actualizar servicio
 *     description: Solo administradores. Actualización parcial.
 *     tags: [Servicios]
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
 *           schema: { $ref: '#/components/schemas/ServicioInput' }
 *     responses:
 *       200:
 *         description: Servicio actualizado
 *       404:
 *         description: Servicio no encontrado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.put(
  "/servicios/:id",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId().withMessage("ID inválido"),
  body("nombre").optional().isString().isLength({ min: 2, max: 80 }).trim(),
  body("slug")
    .optional()
    .isString()
    .matches(/^[a-z0-9-]+$/),
  body("categoria").optional().isIn(["auditoria", "asesoria", "aceleracion"]),
  body("descripcion").optional().isString().isLength({ min: 10 }).trim(),
  body("precio").optional().isFloat({ min: 0 }),
  body("moneda")
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .toUpperCase(),
  body("duracionMin").optional().isInt({ min: 30, max: 240 }),
  body("canal").optional().isIn(["Meet", "Zoom"]),
  body("incluye").optional().isArray(),
  body("incluye.*").optional().isString(),
  body("detalles").optional().isArray(),
  body("detalles.*.titulo").optional().isString().isLength({ max: 100 }),
  body("detalles.*.texto").optional().isString().isLength({ max: 2000 }),
  body("activo").optional().isBoolean(),
  validate,
  servicioController.actualizar.bind(servicioController),
);

/**
 * @swagger
 * /servicios/{id}:
 *   delete:
 *     summary: Eliminar servicio
 *     description: Solo administradores. Borrado físico del documento.
 *     tags: [Servicios]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Servicio eliminado
 *       404:
 *         description: Servicio no encontrado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.delete(
  "/servicios/:id",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId().withMessage("ID inválido"),
  validate,
  servicioController.eliminar.bind(servicioController),
);

export default router;
