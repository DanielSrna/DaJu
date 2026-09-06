import { Router } from "express";
import { body, param } from "express-validator";
import { ofertaController } from "../../controllers/oferta.controller";
import { authMiddleware, requireRol } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";

const router = Router();
const TIPOS = ["plantilla", "consultoria"];

/**
 * @swagger
 * /ofertas:
 *   get:
 *     summary: Listar ofertas activas (plantillas y servicios)
 *     description: Lo consume la vitrina. Solo devuelve las ACTIVAS.
 *     tags: [Ofertas]
 *     responses:
 *       200:
 *         description: Lista de ofertas activas
 */
router.get("/ofertas", ofertaController.listarActivas.bind(ofertaController));

/**
 * @swagger
 * /ofertas/admin:
 *   get:
 *     summary: Listar todas las ofertas (admin, incluye inactivas)
 *     tags: [Ofertas]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de ofertas
 */
router.get(
  "/ofertas/admin",
  authMiddleware,
  requireRol("admin"),
  ofertaController.listarTodas.bind(ofertaController),
);

/**
 * @swagger
 * /ofertas:
 *   post:
 *     summary: Crear una oferta (plantilla o consultoría)
 *     tags: [Ofertas]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tipo, nombre, descripcion]
 *             properties:
 *               tipo:
 *                 type: string
 *                 enum: [plantilla, consultoria]
 *               nombre: { type: string, maxLength: 80 }
 *               descripcion: { type: string, minLength: 10 }
 *               features:
 *                 type: array
 *                 items: { type: string }
 *               desde: { type: number, minimum: 0 }
 *               para: { type: string }
 *               activo: { type: boolean }
 *               orden: { type: integer }
 *     responses:
 *       201:
 *         description: Oferta creada
 */
router.post(
  "/ofertas",
  authMiddleware,
  requireRol("admin"),
  body("tipo").isIn(TIPOS),
  body("nombre").isString().isLength({ min: 2, max: 80 }).trim(),
  body("descripcion").isString().isLength({ min: 10 }).trim(),
  body("features").optional().isArray(),
  body("features.*").optional().isString(),
  body("desde").optional({ values: "null" }).isFloat({ min: 0 }),
  body("para").optional().isString().isLength({ max: 300 }).trim(),
  body("activo").optional().isBoolean(),
  body("orden").optional().isInt({ min: 0 }),
  validate,
  ofertaController.crear.bind(ofertaController),
);

/**
 * @swagger
 * /ofertas/{id}:
 *   put:
 *     summary: Actualizar una oferta
 *     tags: [Ofertas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Oferta actualizada
 */
router.put(
  "/ofertas/:id",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId(),
  body("tipo").optional().isIn(TIPOS),
  body("nombre").optional().isString().isLength({ min: 2, max: 80 }).trim(),
  body("descripcion").optional().isString().isLength({ min: 10 }).trim(),
  body("features").optional().isArray(),
  body("features.*").optional().isString(),
  body("desde").optional({ values: "null" }).isFloat({ min: 0 }),
  body("para").optional().isString().isLength({ max: 300 }).trim(),
  body("activo").optional().isBoolean(),
  body("orden").optional().isInt({ min: 0 }),
  validate,
  ofertaController.actualizar.bind(ofertaController),
);

/**
 * @swagger
 * /ofertas/{id}:
 *   delete:
 *     summary: Eliminar una oferta
 *     tags: [Ofertas]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Oferta eliminada
 */
router.delete(
  "/ofertas/:id",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId(),
  validate,
  ofertaController.eliminar.bind(ofertaController),
);

export default router;
