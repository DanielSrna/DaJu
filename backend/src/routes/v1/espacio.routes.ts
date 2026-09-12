import { Router } from "express";
import { body, param } from "express-validator";
import { espacioController } from "../../controllers/espacio.controller";
import {
  authMiddleware,
  requireEmailVerificado,
  requireRol,
} from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { uploadArchivoMiddleware } from "../../middlewares/upload.middleware";
import { montarRutasEtapas } from "./etapa.routes";
import { montarRutasInforme } from "./informe.routes";
import { montarRutasDocumentos } from "./documento.routes";

const router = Router();

/**
 * @swagger
 * /espacios/{id}:
 *   get:
 *     summary: Detalle de un espacio comprado (plantilla o servicio)
 *     description: Solo el cliente propietario. Los entornos ajenos devuelven 404 (no existen para el cliente).
 *     tags: [Portal]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Espacio encontrado
 *       404:
 *         description: No existe o no es tuyo
 */
router.get(
  "/espacios/:id",
  authMiddleware,
  requireEmailVerificado,
  param("id").isMongoId(),
  validate,
  espacioController.obtener.bind(espacioController),
);

/**
 * @swagger
 * /espacios/{id}/citas:
 *   get:
 *     summary: Citas del entorno (consultoría)
 *     security: [cookieAuth: []]
 *     tags: [Portal]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de citas
 */
router.get(
  "/espacios/:id/citas",
  authMiddleware,
  param("id").isMongoId(),
  validate,
  espacioController.listarCitas.bind(espacioController),
);

/**
 * @swagger
 * /espacios/{id}/citas:
 *   post:
 *     summary: El cliente propone una cita (1-2 franjas)
 *     tags: [Portal]
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
 *             required: [propuestas]
 *             properties:
 *               propuestas: { type: array, items: { type: string, format: date-time } }
 *               duracionMin: { type: number }
 *               canal: { type: string, enum: [Meet, Zoom] }
 *     responses:
 *       201:
 *         description: Cita en estado propuesta
 *       400:
 *         description: Sin sesiones disponibles o franjas inválidas
 */
router.post(
  "/espacios/:id/citas",
  authMiddleware,
  param("id").isMongoId(),
  body("propuestas").isArray({ min: 1, max: 2 }),
  body("duracionMin").optional().isInt({ min: 30, max: 240 }),
  body("canal").optional().isIn(["Meet", "Zoom"]),
  validate,
  espacioController.proponerCita.bind(espacioController),
);

/**
 * @swagger
 * /espacios/{id}/vistas:
 *   get:
 *     summary: Vistas del entorno de plantilla (con obra gris y estado)
 *     tags: [Portal]
 *     security: [cookieAuth: []]
 *     responses:
 *       200:
 *         description: Lista de vistas
 */
router.get(
  "/espacios/:id/vistas",
  authMiddleware,
  param("id").isMongoId(),
  validate,
  espacioController.listarVistas.bind(espacioController),
);

/**
 * @swagger
 * /espacios/{id}/vistas:
 *   post:
 *     summary: Alta de una vista en el entorno de plantilla
 *     tags: [Portal]
 *     security: [cookieAuth: []]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre: { type: string }
 *     responses:
 *       201:
 *         description: Vista creada (estado pendiente)
 */
router.post(
  "/espacios/:id/vistas",
  authMiddleware,
  param("id").isMongoId(),
  body("nombre").isString().isLength({ min: 2, max: 100 }).trim(),
  body("costoSugerido").optional().isFloat({ min: 0 }),
  body("descripcion").optional().isString().isLength({ max: 500 }).trim(),
  validate,
  espacioController.crearVista.bind(espacioController),
);

/**
 * @swagger
 * /vistas/{vistaId}:
 *   put:
 *     summary: Cambiar estado o nombre de una vista (admin)
 *     tags: [Portal]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: vistaId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estado: { type: string, enum: [pendiente, negociacion, aprobada] }
 *               nombre: { type: string }
 *               orden: { type: number }
 *     responses:
 *       200:
 *         description: Vista actualizada
 */
router.put(
  "/vistas/:vistaId",
  authMiddleware,
  requireRol("admin"),
  param("vistaId").isMongoId(),
  body("estado")
    .optional()
    .isIn(["pendiente", "negociacion", "cotizacion", "aprobada"]),
  body("nombre").optional().isString().isLength({ min: 2, max: 100 }).trim(),
  body("orden").optional().isInt().toInt(),
  validate,
  espacioController.actualizarVista.bind(espacioController),
);

/**
 * @swagger
 * /vistas/{vistaId}/obra-gris:
 *   post:
 *     summary: Subir wireframe (obra gris) del admin
 *     description: Multipart/form-data, campo "imagen" (JPG/PNG/WebP).
 *     tags: [Portal]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: vistaId
 *         required: true
 *         schema: { type: string }
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
 *         description: Obra gris actualizada
 */
router.post(
  "/vistas/:vistaId/obra-gris",
  authMiddleware,
  requireRol("admin"),
  uploadArchivoMiddleware.single("imagen"),
  param("vistaId").isMongoId(),
  validate,
  espacioController.subirObraGris.bind(espacioController),
);

/**
 * @swagger
 * /vistas/{vistaId}/muestra:
 *   post:
 *     summary: El cliente sube una muestra/mockup de referencia
 *     description: Multipart/form-data, campo "imagen" (JPG/PNG/WebP).
 *     tags: [Portal]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: vistaId
 *         required: true
 *         schema: { type: string }
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
 *         description: Muestra actualizada
 */
router.post(
  "/vistas/:vistaId/muestra",
  authMiddleware,
  uploadArchivoMiddleware.single("imagen"),
  param("vistaId").isMongoId(),
  validate,
  espacioController.subirMuestraCliente.bind(espacioController),
);

/**
 * @swagger
 * /vistas/{vistaId}/archivos:
 *   post:
 *     summary: Subir documento de la vista (imagen o PDF)
 *     description: |
 *       Multipart/form-data, campo "archivo" (JPG/PNG/WebP o PDF, máx 5 MB).
 *       Tienen acceso el admin o el cliente propietario del espacio.
 *     tags: [Portal]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: vistaId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [archivo]
 *             properties:
 *               archivo: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Archivo añadido
 *       400:
 *         description: Tipo no permitido
 *       403:
 *         description: No tienes acceso a esta vista
 */
router.post(
  "/vistas/:vistaId/archivos",
  authMiddleware,
  uploadArchivoMiddleware.single("archivo"),
  param("vistaId").isMongoId(),
  validate,
  espacioController.agregarArchivoVista.bind(espacioController),
);

/**
 * @swagger
 * /vistas/{vistaId}/archivos/{archivoId}:
 *   delete:
 *     summary: Eliminar documento de la vista
 *     tags: [Portal]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: vistaId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: archivoId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Archivo eliminado
 */
router.delete(
  "/vistas/:vistaId/archivos/:archivoId",
  authMiddleware,
  param("vistaId").isMongoId(),
  param("archivoId").isString().notEmpty(),
  validate,
  espacioController.eliminarArchivoVista.bind(espacioController),
);

/**
 * @swagger
 * /proyectos/{id}/solicitudes:
 *   get:
 *     summary: Solicitudes de funciones/vistas de un proyecto (paquete)
 *     description: |
 *       Cada vista creada abre una solicitud: admin responde con costo,
 *       el cliente paga y la vista queda lista para desarrollar.
 *     tags: [Portal]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de solicitudes del proyecto
 */
router.get(
  "/proyectos/:id/solicitudes",
  authMiddleware,
  param("id").isMongoId(),
  validate,
  espacioController.listarSolicitudesProyecto.bind(espacioController),
);

/**
 * @swagger
 * /espacios/{id}/solicitudes:
 *   get:
 *     summary: Solicitudes de funciones adicionales del entorno
 *     tags: [Portal]
 *     security: [cookieAuth: []]
 *     responses:
 *       200:
 *         description: Lista de solicitudes
 */
router.get(
  "/espacios/:id/solicitudes",
  authMiddleware,
  param("id").isMongoId(),
  validate,
  espacioController.listarSolicitudes.bind(espacioController),
);

/**
 * @swagger
 * /espacios/{id}/solicitudes:
 *   post:
 *     summary: El cliente pide una función adicional
 *     tags: [Portal]
 *     security: [cookieAuth: []]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [titulo, descripcion]
 *             properties:
 *               titulo: { type: string }
 *               descripcion: { type: string }
 *     responses:
 *       201:
 *         description: Solicitud abierta
 */
router.post(
  "/espacios/:id/solicitudes",
  authMiddleware,
  param("id").isMongoId(),
  body("titulo").isString().isLength({ min: 2, max: 100 }).trim(),
  body("descripcion").isString().isLength({ min: 5, max: 4000 }).trim(),
  body("costoSugerido").optional().isFloat({ min: 0 }),
  body("origen").optional().isIn(["personalizada", "catalogo"]),
  body("catalogoClave").optional().isString().trim().isLength({ max: 120 }),
  validate,
  espacioController.crearSolicitud.bind(espacioController),
);

/**
 * @swagger
 * /solicitudes/{solicitudId}:
 *   put:
 *     summary: Admin responde la solicitud con costo propuesto
 *     tags: [Portal]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: solicitudId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [costo, respuestaAdmin]
 *             properties:
 *               costo: { type: number }
 *               respuestaAdmin: { type: string }
 *     responses:
 *       200:
 *         description: Solicitud respondida
 */
router.put(
  "/solicitudes/:solicitudId",
  authMiddleware,
  requireRol("admin"),
  param("solicitudId").isMongoId(),
  body("costo").isFloat({ min: 0 }),
  body("respuestaAdmin").isString().isLength({ min: 2, max: 4000 }).trim(),
  validate,
  espacioController.responderSolicitud.bind(espacioController),
);

/**
 * @swagger
 * /solicitudes/{solicitudId}/aceptar:
 *   post:
 *     summary: El cliente acepta el costo y genera el checkout de la función
 *     description: |
 *       Crea el pago pendiente (tipoProducto "funcionalidad") con la URL de
 *       la pasarela; el webhook marca la solicitud como "pagada".
 *     tags: [Portal]
 *     security: [cookieAuth: []]
 *     parameters:
 *       - in: path
 *         name: solicitudId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Checkout de la función creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 urlPago: { type: string, nullable: true }
 *                 pago: { type: object }
 *       400:
 *         description: Solicitud sin costo o pago ya en curso
 *       409:
 *         description: La solicitud ya tiene un pago en curso
 */
router.post(
  "/solicitudes/:solicitudId/aceptar",
  authMiddleware,
  param("solicitudId").isMongoId(),
  validate,
  espacioController.aceptarSolicitud.bind(espacioController),
);

// Plan de etapas del espacio (plantilla o consultoría).
montarRutasEtapas(router, "espacios", "espacio");

// Informe técnico del espacio (resumen + detalle admin + PDF).
montarRutasInforme(router, "espacios", "espacio");

// Documentación: manuales PDF subidos por el admin.
montarRutasDocumentos(router, "espacios", "espacio");

export default router;
