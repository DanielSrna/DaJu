import { Router } from "express";
import { clienteController } from "../../controllers/cliente.controller";
import { authMiddleware, requireRol } from "../../middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * /cliente/resumen:
 *   get:
 *     summary: Resumen del portal del cliente (sus proyectos, espacios y pagos)
 *     description: |
 *       Solo el cliente autenticado ve lo suyo: proyectos de paquetes,
 *       entornos comprados (plantillas/servicios) y pagos aprobados.
 *     tags: [Cliente]
 *     security: [cookieAuth: []]
 *     responses:
 *       200:
 *         description: Resumen del cliente
 *       401:
 *         description: No autenticado
 */
router.get(
  "/cliente/resumen",
  authMiddleware,
  clienteController.resumen.bind(clienteController),
);

/**
 * @swagger
 * /admin/metricas:
 *   get:
 *     summary: Métricas rápidas del portal de administrador
 *     description: Ingresos del mes, proyectos activos, citas por confirmar y solicitudes abiertas.
 *     tags: [Cliente]
 *     security: [cookieAuth: []]
 *     responses:
 *       200:
 *         description: Métricas
 *       403:
 *         description: Solo admin
 */
router.get(
  "/admin/metricas",
  authMiddleware,
  requireRol("admin"),
  clienteController.metricas.bind(clienteController),
);

export default router;
