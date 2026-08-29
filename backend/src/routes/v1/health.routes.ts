import { Router } from "express";
import { healthController } from "../../controllers/health.controller";

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Estado del servicio
 *     description: Devuelve el estado operativo de la API. Útil para healthchecks de Render.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servicio operativo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 *       500:
 *         description: Error interno
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get("/health", healthController.getStatus.bind(healthController));

export default router;
