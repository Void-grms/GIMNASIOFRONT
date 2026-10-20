# Portal y apariencia

El portal ofrece Hoy, Entrenar, Progreso, Credencial y Más. Mis rutinas reúne las plantillas, la orientación del entrenador, el mapa muscular y el plan semanal. Se conservan el QR, la renovación, la tienda, el perfil y los consentimientos del peso corporal.

## Sesión de entrenamiento

`PortalEntrenoProvider` mantiene un borrador versionado y separado por identidad. Los campos se conservan al navegar o recargar. La última carga solo completa campos pendientes que el usuario no haya editado. Los cambios confirmados se guardan en el backend por serie.

Cada envío tiene un UUID y conserva su contenido mientras el resultado sea incierto. Tras una respuesta perdida se reintenta la misma operación antes de editarla o quitarla. Una corrección actualiza la serie existente. Finalizar distingue los borradores sin registrar de las series guardadas y no marca salida del gimnasio.

El descanso usa una hora final persistida. Su reloj se actualiza de forma independiente del formulario y no reemplaza los controles ni roba el foco. Si el almacenamiento del navegador está restringido, el portal lo advierte.

El borrador local no equivale a una sincronización automática sin conexión. Iniciar y confirmar operaciones requieren conexión; los reintentos son explícitos. Una respuesta iniciada por otra identidad no puede sustituir los datos de la cuenta actual.

## Temas

La preferencia `forcesgym.apariencia` admite `claro`, `oscuro` y `sistema`. Sin elección se usa el sistema. Un script constante en la cabecera aplica el tema antes de la hidratación; los cambios del sistema y de otras pestañas se reflejan sin recargar. Si no se puede acceder a almacenamiento, la elección sigue funcionando durante la visita.

Los colores de superficies y textos son tokens semánticos. Las fotos con texto superpuesto y las representaciones de comprobantes conservan sus colores específicos de lectura/impresión. El selector está disponible en accesos públicos, administración y portal.

## Verificación

`npm run typecheck` y `npm run build`. La comprobación de navegador usa exclusivamente datos ficticios y API local: recuperación del borrador y descanso, respuesta de guardado perdida, reintento sin duplicados, corrección y deshacer, finalización, aislamiento al cambiar de cuenta, login y navegación a 320/390/1440 px. Se revisaron accesos públicos, portal y administración en ambos temas, persistencia, cambios del sistema y almacenamiento restringido.
