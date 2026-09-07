import { Router } from "express";
import { param } from "express-validator";
import { notificacionController } from "../../controllers/notificacion.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";

const router = Router();

/**
 * @swagger
 * /notificaciones:
 *   get:
 *     summary: Notificaciones del usuario (nivel plataforma y proyecto)
 *     description: |
 *       - Nivel plataforma: hitos del negocio (compras, pagos) → admins.
 *       - Nivel proyecto: novedades (chat, citas, funciones, vistas) →
 *         admins o el cliente dueño según corresponda.
 *       El admin ve las suyas + las de plataforma; el cliente solo las propias.
 *     tags: [Notificaciones]
 *     security: [cookieAuth: []]
 *     responses:
 *       200:
 *         description: Lista (50 más recientes)
 *       401:
 *         description: No autenticado
 */
router.get(
  "/notificaciones",
  authMiddleware,
  notificacionController.listar.bind(notificacionController),
);

/**
 * @swagger
 * /notificaciones/sin-leer:
 *   get:
 *     summary: Cantidad de notificaciones sin leer (badge del portal)
 *     tags: [Notificaciones]
 *     security: [cookieAuth: []]
 *     responses:
 *       200:
 *         description: { total }
 */
router.get(
  "/notificaciones/sin-leer",
  authMiddleware,
  notificacionController.sinLeer.bind(notificacionController),
);

/**
 * @swagger
 * /notificaciones/{id}/leida:
 *   put:
 *     summary: Marcar una notificación como leída
 *     tags: [Notificaciones]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Marcada
 */
router.put(
  "/notificaciones/:id/leida",
  authMiddleware,
  param("id").isMongoId(),
  validate,
  notificacionController.marcarLeida.bind(notificacionController),
);

export default router;
