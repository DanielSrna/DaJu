import { Router } from "express";
import { body, param } from "express-validator";
import { metodoPagoController } from "../../controllers/metodo-pago.controller";
import { authMiddleware, requireRol } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";

const router = Router();
const TIPOS = ["manual", "paypal"];
const MONEDAS = ["COP", "USD"];

/**
 * @swagger
 * /metodos-pago:
 *   get:
 *     summary: Métodos de pago activos (vitrina y portal)
 *     description: |
 *       Catálogo configurable por el admin. Los métodos `manual` (Bre-B, Nequi,
 *       DaviPlata, Nu, banco, USDT…) se pagan por transferencia con comprobante;
 *       `paypal` se paga en línea.
 *     tags: [Pagos]
 *     responses:
 *       200:
 *         description: Métodos activos ordenados
 */
router.get(
  "/metodos-pago",
  metodoPagoController.listarActivos.bind(metodoPagoController),
);

/**
 * @swagger
 * /metodos-pago/admin:
 *   get:
 *     summary: Todos los métodos de pago (admin, incluye inactivos)
 *     tags: [Pagos]
 *     security: [cookieAuth: []]
 *     responses:
 *       200:
 *         description: Lista completa
 *       403:
 *         description: Requiere rol admin
 */
router.get(
  "/metodos-pago/admin",
  authMiddleware,
  requireRol("admin"),
  metodoPagoController.listarTodos.bind(metodoPagoController),
);

/**
 * @swagger
 * /metodos-pago:
 *   post:
 *     summary: Crear un método de pago (admin)
 *     tags: [Pagos]
 *     security: [cookieAuth: []]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre: { type: string, example: Nequi }
 *               tipo: { type: string, enum: [manual, paypal] }
 *               moneda: { type: string, enum: [COP, USD] }
 *               titular: { type: string }
 *               datos: { type: string, description: "Llave, número o cuenta" }
 *               instrucciones: { type: string }
 *               qrUrl: { type: string }
 *               activo: { type: boolean }
 *               orden: { type: integer }
 *     responses:
 *       201:
 *         description: Método creado
 *       409:
 *         description: Ya existe un método con ese nombre
 */
router.post(
  "/metodos-pago",
  authMiddleware,
  requireRol("admin"),
  body("nombre").isString().isLength({ min: 2, max: 60 }).trim(),
  body("tipo").optional().isIn(TIPOS),
  body("moneda").optional().isIn(MONEDAS),
  body("titular").optional().isString().trim(),
  body("datos").optional().isString().trim(),
  body("instrucciones").optional().isString().trim(),
  body("qrUrl").optional().isString().trim(),
  body("activo").optional().isBoolean(),
  body("orden").optional().isInt({ min: 0 }),
  validate,
  metodoPagoController.crear.bind(metodoPagoController),
);

/**
 * @swagger
 * /metodos-pago/{id}:
 *   put:
 *     summary: Actualizar un método de pago (admin)
 *     tags: [Pagos]
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
 *           schema:
 *             type: object
 *             properties:
 *               nombre: { type: string }
 *               tipo: { type: string, enum: [manual, paypal] }
 *               moneda: { type: string, enum: [COP, USD] }
 *               titular: { type: string }
 *               datos: { type: string }
 *               instrucciones: { type: string }
 *               qrUrl: { type: string }
 *               activo: { type: boolean }
 *               orden: { type: integer, minimum: 0 }
 *     responses:
 *       200:
 *         description: Método actualizado
 *       404:
 *         description: No encontrado
 */
router.put(
  "/metodos-pago/:id",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId(),
  body("nombre").optional().isString().isLength({ min: 2, max: 60 }).trim(),
  body("tipo").optional().isIn(TIPOS),
  body("moneda").optional().isIn(MONEDAS),
  body("titular").optional().isString().trim(),
  body("datos").optional().isString().trim(),
  body("instrucciones").optional().isString().trim(),
  body("qrUrl").optional().isString().trim(),
  body("activo").optional().isBoolean(),
  body("orden").optional().isInt({ min: 0 }),
  validate,
  metodoPagoController.actualizar.bind(metodoPagoController),
);

/**
 * @swagger
 * /metodos-pago/{id}:
 *   delete:
 *     summary: Eliminar un método de pago (admin)
 *     tags: [Pagos]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Eliminado
 *       404:
 *         description: No encontrado
 */
router.delete(
  "/metodos-pago/:id",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId(),
  validate,
  metodoPagoController.eliminar.bind(metodoPagoController),
);

export default router;
