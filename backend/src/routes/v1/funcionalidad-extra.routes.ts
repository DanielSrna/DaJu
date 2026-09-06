import { Router } from "express";
import { body, param } from "express-validator";
import { funcionalidadExtraController } from "../../controllers/funcionalidad-extra.controller";
import { authMiddleware, requireRol } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";

const router = Router();

/**
 * @swagger
 * /funcionalidades:
 *   get:
 *     summary: Catálogo público de funcionalidades adicionales
 *     description: Solo funcionalidades activas. El usuario las suma a su paquete antes de pagar.
 *     tags: [Funcionalidades]
 *     responses:
 *       200:
 *         description: Lista de funcionalidades activas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 funcionalidades:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/FuncionalidadExtra' }
 */
router.get(
  "/funcionalidades",
  funcionalidadExtraController.listarActivas.bind(funcionalidadExtraController),
);

/**
 * @swagger
 * /funcionalidades/admin:
 *   get:
 *     summary: Todas las funcionalidades (incluye inactivas). Solo admin.
 *     tags: [Funcionalidades]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista completa
 *       403:
 *         description: Requiere rol admin
 */
router.get(
  "/funcionalidades/admin",
  authMiddleware,
  requireRol("admin"),
  funcionalidadExtraController.listarTodas.bind(funcionalidadExtraController),
);

/**
 * @swagger
 * /funcionalidades:
 *   post:
 *     summary: Crear funcionalidad adicional. Solo admin.
 *     tags: [Funcionalidades]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, categoria, complejidad, precio]
 *             properties:
 *               nombre: { type: string, example: Chat en vivo }
 *               descripcion: { type: string }
 *               categoria: { type: string, enum: [integraciones, pagina, usuarios, datos] }
 *               complejidad: { type: string, enum: [facil, media, dificil] }
 *               precio: { type: number, example: 40 }
 *               activo: { type: boolean, default: true }
 *     responses:
 *       201:
 *         description: Creada
 *       409:
 *         description: Nombre duplicado
 */
router.post(
  "/funcionalidades",
  authMiddleware,
  requireRol("admin"),
  body("nombre").isString().isLength({ min: 3, max: 80 }).trim(),
  body("descripcion").optional().isString().isLength({ max: 500 }).trim(),
  body("categoria").isIn(["integraciones", "pagina", "usuarios", "datos"]),
  body("complejidad").isIn(["facil", "media", "dificil"]),
  body("precio").isFloat({ min: 0 }),
  body("activo").optional().isBoolean(),
  validate,
  funcionalidadExtraController.crear.bind(funcionalidadExtraController),
);

/**
 * @swagger
 * /funcionalidades/{id}:
 *   put:
 *     summary: Actualizar funcionalidad (precio, activo, etc.). Solo admin.
 *     tags: [Funcionalidades]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path, name: id, required: true, schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre: { type: string }
 *               descripcion: { type: string }
 *               categoria: { type: string, enum: [integraciones, pagina, usuarios, datos] }
 *               complejidad: { type: string, enum: [facil, media, dificil] }
 *               precio: { type: number }
 *               activo: { type: boolean }
 *     responses:
 *       200:
 *         description: Actualizada
 *       404:
 *         description: No encontrada
 */
router.put(
  "/funcionalidades/:id",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId(),
  body("nombre").optional().isString().isLength({ min: 3, max: 80 }).trim(),
  body("descripcion").optional().isString().isLength({ max: 500 }).trim(),
  body("categoria")
    .optional()
    .isIn(["integraciones", "pagina", "usuarios", "datos"]),
  body("complejidad").optional().isIn(["facil", "media", "dificil"]),
  body("precio").optional().isFloat({ min: 0 }),
  body("activo").optional().isBoolean(),
  validate,
  funcionalidadExtraController.actualizar.bind(funcionalidadExtraController),
);

/**
 * @swagger
 * /funcionalidades/{id}:
 *   delete:
 *     summary: Eliminar funcionalidad. Solo admin.
 *     description: Los pagos ya realizados conservan su snapshot (no se rompe el histórico).
 *     tags: [Funcionalidades]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path, name: id, required: true, schema: { type: string }
 *     responses:
 *       204:
 *         description: Eliminada
 *       404:
 *         description: No encontrada
 */
router.delete(
  "/funcionalidades/:id",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId(),
  validate,
  funcionalidadExtraController.eliminar.bind(funcionalidadExtraController),
);

export default router;
