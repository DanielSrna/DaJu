import { Router } from "express";
import healthRoutes from "./health.routes";
import authRoutes from "./auth.routes";
import paqueteRoutes from "./paquete.routes";
import pagoRoutes from "./pago.routes";
import proyectoRoutes from "./proyecto.routes";
import briefingRoutes from "./briefing.routes";
import contactoRoutes from "./contacto.routes";
import cmsRoutes from "./cms.routes";

const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(paqueteRoutes);
router.use(pagoRoutes);
router.use(proyectoRoutes);
router.use(briefingRoutes);
router.use(contactoRoutes);
router.use(cmsRoutes);

export default router;
