import { Router } from "express";
import express from "express";
import { body, param } from "express-validator";
import { pagoController } from "../../controllers/pago.controller";
import { authMiddleware, requireRol } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";

const router = Router();

/**
 * @swagger
 * /checkout:
 *   post:
 *     summary: Crear checkout de un producto (paquete, plantilla o servicio)
 *     description: |
 *       Crea el pago pendiente y devuelve la URL de pago de la pasarela.
 *       El webhook confirma el pago y dispara el onboarding automático:
 *       los paquetes crean proyecto con fecha de entrega congelada; las
 *       plantillas y servicios dejan la compra lista para su entorno.
 *       Para paquetes usar paqueteId; para plantillas/servicios `tipoProducto`
 *       + `productoId` (y `cantidad` en sesiones de servicios).
 *     tags: [Pagos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, nombre, password]
 *             properties:
 *               tipoProducto:
 *                 type: string
 *                 enum: [paquete, plantilla, servicio]
 *                 example: plantilla
 *               paqueteId: { type: string, example: "66e0a1b2c3d4e5f6a7b8c9d0" }
 *               productoId: { type: string, example: "66e0a1b2c3d4e5f6a7b8c9d1" }
 *               cantidad:
 *                 type: number
 *                 example: 2
 *                 description: Sesiones de consultoría a pagar (1..10, solo servicios)
 *               nombre: { type: string, example: "Cliente Nuevo" }
 *               email: { type: string, format: email, example: "cliente@correo.com" }
 *               password: { type: string, format: password, example: "Cliente123" }
 *               funcionalidades:
 *                 type: array
 *                 items: { type: string }
 *               negociarDespues:
 *                 type: boolean
 *                 description: Marca funcionalidades no listadas para negociar después
 *     responses:
 *       201:
 *         description: Checkout creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 urlPago: { type: string, nullable: true }
 *                 pago: { $ref: '#/components/schemas/Pago' }
 *       404:
 *         description: Producto no disponible
 *       400:
 *         description: Validación fallida
 */
router.post(
  "/checkout",
  body("tipoProducto")
    .optional()
    .isIn(["paquete", "plantilla", "servicio"])
    .withMessage("tipoProducto inválido"),
  body("paqueteId")
    .optional()
    .custom(
      (v: unknown) =>
        v === undefined || v === "" || /^[a-f0-9]{24}$/.test(String(v)),
    )
    .withMessage("paqueteId inválido"),
  body("productoId")
    .optional()
    .custom(
      (v: unknown) =>
        v === undefined || v === "" || /^[a-f0-9]{24}$/.test(String(v)),
    )
    .withMessage("productoId inválido"),
  body("cantidad")
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage("Cantidad inválida (1..10)"),
  body("email").isEmail().withMessage("Email inválido").trim().toLowerCase(),
  body("nombre").optional().isString().isLength({ min: 2, max: 80 }).trim(),
  body("password")
    .optional()
    .isString()
    .isLength({ min: 8, max: 72 })
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage("La contraseña debe tener letras y números (mínimo 8)"),
  body("funcionalidades")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Máximo 10 funcionalidades"),
  body("funcionalidades.*")
    .optional()
    .isMongoId()
    .withMessage("Id de funcionalidad inválido"),
  body("negociarDespues").optional().isBoolean(),
  validate,
  pagoController.crearCheckout.bind(pagoController),
);

/**
 * @swagger
 * /epayco/webhook:
 *   post:
 *     summary: Webhook de confirmación de ePayco
 *     description: |
 *       Recibe la confirmación de ePayco (form-urlencoded), valida la firma MD5 y,
 *       si el pago fue Aceptada, ejecuta el onboarding automático. Responde "ok".
 *     tags: [Pagos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               x_cust_id_cliente: { type: string }
 *               x_ref_payco: { type: string }
 *               x_transaction_id: { type: string }
 *               x_amount: { type: string }
 *               x_currency_code: { type: string }
 *               x_transaction_state: { type: string, example: "Aceptada" }
 *               x_signature: { type: string }
 *     responses:
 *       200:
 *         description: Webhook procesado ("ok")
 *       401:
 *         description: Firma inválida
 */
router.post(
  "/epayco/webhook",
  pagoController.procesarWebhook.bind(pagoController),
);

/**
 * @swagger
 * /mercadopago/webhook:
 *   post:
 *     summary: Webhook de confirmación de MercadoPago (IPN v1)
 *     description: |
 *       Recibe el evento JSON de MercadoPago (payment.update), valida la firma
 *       x_signature (HMAC-SHA256) y, si el pago fue aprobado, ejecuta el
 *       onboarding (proyecto/espacio/solicitud según tipo). Responde 200 OK.
 *     tags: [Pagos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action: { type: string }
 *               data: { type: object, properties: { id: { type: string } } }
 *     responses:
 *       200:
 *         description: Webhook procesado
 *       401:
 *         description: Firma inválida
 */
router.post(
  "/mercadopago/webhook",
  express.json({ type: "application/json" }),
  pagoController.procesarWebhookMercadoPago.bind(pagoController),
);

/**
 * @swagger
 * /pagos/{id}/reembolsar:
 *   post:
 *     summary: Reembolsar un pago confirmado (solo admin)
 *     description: Reembolso total vía la pasarela activa; el pago pasa a "refunded".
 *     tags: [Pagos]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Pago reembolsado
 *       400:
 *         description: La pasarela no soporta reembolsos o el pago no es reembolsable
 */
router.post(
  "/pagos/:id/reembolsar",
  authMiddleware,
  requireRol("admin"),
  param("id").isMongoId(),
  validate,
  pagoController.refundar.bind(pagoController),
);

/**
 * @swagger
 * /pagos/mis-pagos:
 *   get:
 *     summary: Pagos del cliente autenticado
 *     tags: [Pagos]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de pagos del cliente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pagos: { type: array, items: { $ref: '#/components/schemas/Pago' } }
 *       401:
 *         description: No autenticado
 */
router.get(
  "/pagos/mis-pagos",
  authMiddleware,
  pagoController.listarMisPagos.bind(pagoController),
);

/**
 * @swagger
 * /pagos:
 *   get:
 *     summary: Todos los pagos (admin)
 *     tags: [Pagos]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de todos los pagos
 *       403:
 *         description: Requiere rol admin
 */
router.get(
  "/pagos",
  authMiddleware,
  requireRol("admin"),
  pagoController.listarTodos.bind(pagoController),
);

export default router;
